// compact-adviser for Claude Code: the hooks module of the `compact-adviser` mod.
//
// A Claude Code "mod" is a plugin whose behavior lives in one hooks module. Claude Code
// may load it through its rollout flag or CLAUDE_CODE_ENABLE_FUNCTION_HOOKS, but every
// handler requires that variable to equal `1`, so rollout-only loading is a no-op.
//
// This is the only file that touches the engine interface `$`. The decisions live in
// ../lib (settings, cooldowns, the bounded judge input, and the Jev client), which the
// suites under ../tests exercise through `claude plugin test`. ../README.md owns the
// user-facing contract and ../../../docs/product-contract.md the shared semantics.
//
// Two engine facts shape this file:
// - Saving a `userConfig` row through `$.config.set` hot-reloads this module and raises
//   `session.start` again, so module variables are per-reload scratch and every fact a
//   cooldown depends on lives in `$.store`.
// - `$.session.compact` runs through every hook but the caller's, so this module's own
//   `session.compact` hook never sees its own automatic compaction; that path resets the
//   session's counters itself. It rejects while a turn is running; call it from
//   `turn.complete` or later.
// - `$.prompt.submit` rejects text that starts with `/` and does not expand slash commands
//   or `@file` mentions (verified on Claude Code 2.1.294). A before-compact value that
//   starts with `/` is run with `$.command.run` instead. Example value: `/stow`.
import type { EngineInterface, PluginOptions, Register, RenderChildren } from "claude-code";
import {
  API_KEY_KEY,
  BUDGET_KEY,
  CONSENT_STORE_KEY,
  type Config,
  type Consent,
  DEFAULT_MINIMUM,
  formatTokens,
  LOG_KEY,
  MINIMUM_KEY,
  MODE_KEY,
  type Mode,
  PLUGIN,
  parseBudget,
  parseConsent,
  parseMinimum,
  parseSavedApiKey,
  readConfig,
  readSavedApiKey,
} from "../lib/config.ts";
import { disabledByEnv } from "../lib/disable.ts";
import {
  formatKeyStatus,
  parseDotenvKey,
  resolveTypesafeApiKey,
  type TypesafeKeySource,
} from "../lib/env.ts";
import {
  contextPressure,
  effectiveBudget,
  floorFor,
  JUDGE_DISABLED_NETWORK_MESSAGE,
  JUDGE_UNAVAILABLE_MESSAGE,
  JudgeError,
  judge,
  qualifies,
  requestBody,
  typesafeEndpoint,
} from "../lib/judge.ts";
import {
  errorLogLine,
  loggedJudgeErrorKind,
  requestLogLine,
  requestLogPath,
  responseLogLine,
} from "../lib/log.ts";
import { parseProfile } from "../lib/profile.ts";
import { snapshot } from "../lib/snapshot.ts";
import {
  backoff,
  completeExchange,
  cooldownReason,
  initialState,
  restoreState,
  type SessionState,
  sessionKey,
  staleSessionKeys,
} from "../lib/state.ts";

const COMMAND = "compact-adviser";
const PANE_ID = "compact-adviser";
const HINT = "工作看起來已完成或已記錄。執行 /compact 以節省 token。";
const COMPACT_INSTRUCTIONS =
  "The session reached a natural boundary; keep the current work, pending tasks, referenced files, and the next step exact.";
const BEFORE_COMPACT_STATUS = "正在執行壓縮前提示詞…";
/** A before-compact turn that outlives this does not compact. */
export const BEFORE_COMPACT_TIMEOUT_MS = 300_000;
const BEFORE_COMPACT_RETRY_MS = 60_000;
const SLASH_COMMAND = /^\/([A-Za-z0-9_:-]{1,64})(?:\s+([\s\S]*))?$/;
const PENDING_NOTICE_KEY = "pendingNotice";
const LOOPBACK_ENDPOINT = /^http:\/\/127\.0\.0\.1:\d{1,5}\/[\x21-\x7e]*$/;
const USAGE =
  "可用引數：/compact-adviser、auto、hint、off、status、threshold <tokens|default>、budget <tokens|off>、snooze 或 dismiss。";

// Per module environment (a hot reload starts fresh; see the header).
let activation: Promise<boolean> | undefined;
// The host-validated options this environment loaded with (a save reloads it with new ones).
let loadedOptions: PluginOptions = {};
let interactive = false;
let generation = 0;
let judging = false;
let compacting = false;
let hintVisible = false;
// A confirmed auto checkpoint that submitted a prompt and is waiting to compact after it.
let beforeCompact:
  | {
      seq: number;
      key: string;
      turnId?: string;
      /** True once this handoff has asked the host to start its turn. */
      dispatched?: boolean;
    }
  | undefined;
let beforeCompactSeq = 0;
// The running turn of a handoff abandoned after it started; its end is not a checkpoint.
let abandonedTurn: { turnId: string; key: string } | undefined;
// Dispatched, then abandoned before its turn started. turn.start carries no origin, so
// the next turn is that submission unless a later prompt or command claimed it.
let abandonedDispatch: { key: string } | undefined;
// A prompt or command from anyone but this plugin was submitted and its turn has not
// started yet.
let foreignSubmitted = false;
let diagnostic = "";
// The settings pane: one list of rows, as the Pi extension's menu, each opening a view
// of its own; Enter on an option or a saved value returns to the list. A save hot-reloads
// the module, so this scratch resets to the list on its own.
type PaneView = "menu" | "mode" | "minimum" | "logging" | "key";
let view: PaneView = "menu";
// The list row the person last opened; the ring returns there.
let menuRow = "menu:mode";
// Where the ring should land once the next drawing is up: the engine keeps a moved ring
// at its position, so a view change places it itself.
let pendingFocus: string | undefined;
let minimumDraft: { text: string; error?: string } | undefined;
let keyDraft: { text: string; error?: string } | undefined;
let statusDetails: string | undefined;

/**
 * Both environment gates, resolved once per module environment and cached: function
 * hooks must be on, and `COMPACT_ADVISER_DISABLE` must not be set to a truthy value.
 * Every hook goes through here, so a disabled session registers no command, shows no
 * status, and never reaches TypeSafe.
 */
function isActivated($: EngineInterface): Promise<boolean> {
  if (activation === undefined) {
    activation = Promise.all([
      $.env.get("CLAUDE_CODE_ENABLE_FUNCTION_HOOKS").then(
        (value) => value === "1",
        () => false,
      ),
      // `$.env.get` takes a literal name, so `DISABLE_ENV` cannot be spelled here.
      $.env.get("COMPACT_ADVISER_DISABLE").then(disabledByEnv, () => false),
    ]).then(([hooks, disabled]) => hooks && !disabled);
  }
  return activation;
}

async function resolvedKey($: EngineInterface) {
  const fromEnv = await $.env.get("TYPESAFE_API_KEY");
  if (fromEnv !== undefined && fromEnv.trim() !== "") {
    return resolveTypesafeApiKey(fromEnv);
  }
  const saved = readSavedApiKey(await $.config.list(), loadedOptions);
  if (saved) return resolveTypesafeApiKey(undefined, saved);
  let dotenv: string | undefined;
  try {
    dotenv = parseDotenvKey(await $.fs.read(".env"), "TYPESAFE_API_KEY");
  } catch {
    dotenv = undefined;
  }
  return resolveTypesafeApiKey(undefined, undefined, dotenv);
}

async function apiKey($: EngineInterface): Promise<string> {
  return (await resolvedKey($)).value?.trim() ?? "";
}

/** A loopback-only endpoint override for the live regression's local TypeSafe fixture. */
async function testEndpoint($: EngineInterface): Promise<string | undefined> {
  const value = await $.env.get("COMPACT_ADVISER_TEST_ENDPOINT");
  return value !== undefined && LOOPBACK_ENDPOINT.test(value) ? value : undefined;
}

/** The live regression's fixture, else TypeSafe under `TYPESAFE_BASE` from the launch environment. */
async function judgeEndpoint($: EngineInterface): Promise<string> {
  const endpoint = (await testEndpoint($)) ?? typesafeEndpoint(await $.env.get("TYPESAFE_BASE"));
  if (endpoint === undefined) throw new JudgeError("configuration");
  return endpoint;
}

async function loadConfig($: EngineInterface): Promise<Config> {
  return readConfig(await $.config.list(), await $.store.get(CONSENT_STORE_KEY), loadedOptions);
}

async function loadConsent($: EngineInterface): Promise<Consent> {
  return parseConsent(await $.store.get(CONSENT_STORE_KEY));
}

async function loadState($: EngineInterface): Promise<{ key: string; state: SessionState }> {
  const key = sessionKey(await $.session.id());
  return { key, state: restoreState(await $.store.get(key), await $.clock.now()) };
}

async function checkpointKey(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function judgeFailureMessage(error: unknown): string {
  // Claude Code refuses plugin network access outright under
  // CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC; say so instead of a generic network error.
  if (String((error as { cause?: unknown })?.cause).includes("nonessential network traffic")) {
    return JUDGE_DISABLED_NETWORK_MESSAGE;
  }
  return error instanceof JudgeError ? error.message : JUDGE_UNAVAILABLE_MESSAGE;
}

async function logHome($: EngineInterface): Promise<string> {
  return ((await $.env.get("HOME")) ?? (await $.session.cwd())).replace(/[\\/]+$/, "");
}

async function sessionLogPath($: EngineInterface): Promise<string> {
  return requestLogPath(await logHome($), await $.session.id());
}

async function appendTypeSafeLog($: EngineInterface, line: string): Promise<void> {
  const path = await sessionLogPath($);
  let existing = "";
  try {
    existing = await $.fs.read(path);
  } catch {
    existing = "";
  }
  await $.fs.write(path, `${existing}${line}`);
}

function notice($: EngineInterface, message: string): void {
  if (diagnostic === message) return;
  diagnostic = message;
  $.ui.toast(message, { timeoutMs: 8000 });
}

function clearStatus($: EngineInterface): void {
  if (interactive) $.ui.status(undefined);
}

async function invalidate($: EngineInterface): Promise<void> {
  generation++;
  if (hintVisible) {
    hintVisible = false;
    clearStatus($);
  }
}

interface ContextUsage {
  tokens?: number;
  window: number;
  breakdown?: { isAutoCompactEnabled: boolean; autoCompactThreshold?: number };
}

/** Claude Code's auto-compact threshold when it reports one as enabled, otherwise the window. */
function contextLimit(context: ContextUsage): number {
  const threshold = context.breakdown?.autoCompactThreshold;
  return context.breakdown?.isAutoCompactEnabled &&
    typeof threshold === "number" &&
    Number.isFinite(threshold) &&
    threshold > 0
    ? threshold
    : context.window;
}

/** Context tokens over the budget or the active limit; NaN when unknown (strictest floor). */
function usageFraction(context: ContextUsage, budget: number): number {
  if (typeof context.tokens !== "number") return Number.NaN;
  return contextPressure(context.tokens, contextLimit(context), budget);
}

async function eligible(
  $: EngineInterface,
  config: Config,
  state: SessionState,
  tokens: number | undefined,
  now: number,
): Promise<boolean> {
  return (
    interactive &&
    !compacting &&
    config.mode !== "off" &&
    (await apiKey($)) !== "" &&
    typeof tokens === "number" &&
    Number.isFinite(tokens) &&
    tokens >= config.minContextTokens &&
    cooldownReason(state, tokens, now) === undefined
  );
}

function ownSubmission(origin: { kind: string; name?: string } | undefined): boolean {
  return origin?.kind === "plugin" && origin.name === PLUGIN;
}

/** A leading slash is a command name, not model text. Anything else is not a command. */
function slashInvocation(text: string): { command: string; args?: string } | undefined {
  const match = SLASH_COMMAND.exec(text.trim());
  const command = match?.[1];
  if (!command) return undefined;
  const args = match?.[2]?.trim();
  return args ? { command, args } : { command };
}

/** Applies the same one-minute retry the compaction-failure path uses. */
async function deferRetry($: EngineInterface, key: string): Promise<void> {
  try {
    const { state } = await loadState($);
    const now = await $.clock.now();
    await $.store.set(key, {
      ...state,
      retryAfter: now + BEFORE_COMPACT_RETRY_MS,
      updatedAt: now,
    });
  } catch {
    // The cooldown record stays as it was; the next judgment re-reads it.
  }
}

/**
 * Drops the pending before-compact handoff and defers the next judgment, so neither the
 * checkpoint nor the abandoned prompt's own turn, if it already started, is judged.
 */
async function abandonBeforeCompact($: EngineInterface, message?: string): Promise<void> {
  const handoff = beforeCompact;
  if (!handoff) return;
  beforeCompact = undefined;
  if (handoff.turnId !== undefined) {
    abandonedTurn = { turnId: handoff.turnId, key: handoff.key };
  } else if (handoff.dispatched) {
    abandonedDispatch = { key: handoff.key };
  }
  clearStatus($);
  if (message) notice($, message);
  await deferRetry($, handoff.key);
}

async function submitBeforeCompact($: EngineInterface, text: string): Promise<void> {
  const trimmed = text.trim();
  if (trimmed.startsWith("/")) {
    const slash = slashInvocation(trimmed);
    if (!slash) {
      throw new Error("before-compact prompt starts with / but is not a slash command");
    }
    await $.command.run(slash);
    return;
  }
  await $.prompt.submit({ text: trimmed });
}

/** Submits the configured text and waits for its turn to end before compacting. */
async function armBeforeCompact(
  $: EngineInterface,
  key: string,
  text: string,
  epoch: number,
): Promise<void> {
  if (epoch !== generation || compacting || beforeCompact || foreignSubmitted) return;
  const seq = ++beforeCompactSeq;
  beforeCompact = { seq, key, dispatched: false };
  $.ui.status(BEFORE_COMPACT_STATUS);
  $.clock.after(BEFORE_COMPACT_TIMEOUT_MS, () => {
    if (beforeCompact?.seq !== seq) return;
    void abandonBeforeCompact($, "壓縮前提示詞超時。上下文未更改。");
  });
  try {
    if (beforeCompact?.seq === seq) beforeCompact.dispatched = true;
    await submitBeforeCompact($, text);
  } catch {
    if (beforeCompact?.seq !== seq) return;
    beforeCompact.dispatched = false;
    await abandonBeforeCompact($, "壓縮前提示詞未執行。上下文未更改。");
  }
}

/** Runs the host compaction path. Call only between turns. */
async function compactNow($: EngineInterface, key: string): Promise<void> {
  if (compacting) return;
  compacting = true;
  // A status line, not a toast: the host drops a toast within two seconds of the last,
  // which would swallow the completion notice of a quick compaction.
  $.ui.status("在檢查點壓縮中（實驗性自動模式）…");
  let failure: string | undefined;
  let tokens: { before?: number; after?: number } = {};
  try {
    const compacted = await $.session.compact({ instructions: COMPACT_INSTRUCTIONS });
    if (compacted.skip !== undefined) failure = compacted.skip;
    else tokens = { before: compacted.tokensBefore, after: compacted.tokensAfter };
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  } finally {
    compacting = false;
  }
  const after = await $.clock.now();
  if (failure !== undefined) {
    const { state: latestState } = await loadState($);
    await $.store.set(key, {
      ...latestState,
      retryAfter: after + BEFORE_COMPACT_RETRY_MS,
      updatedAt: after,
    });
    notice(
      $,
      "壓縮失敗或已取消。不會立即重試；仍由 Claude Code 掌控。",
    );
    clearStatus($);
    return;
  }
  generation++;
  await $.store.set(key, initialState(true, after));
  const completed =
    tokens.before !== undefined && tokens.after !== undefined
      ? `壓縮完成：從 ${formatTokens(tokens.before)} 到 ${formatTokens(tokens.after)} 個 token。`
      : "壓縮完成。";
  // The dim transcript line (never sent to the model) records the automatic action even
  // when the host throttles the toast. Claude Code prefixes $.ui.log with the plugin name.
  $.ui.log(`自動 ${completed}`);
  $.ui.toast(completed);
  clearStatus($);
}

/** The scheduled half of a turn end: judge, then hint or (opt-in) compact. */
async function judgeCheckpoint($: EngineInterface, epoch: number): Promise<void> {
  if (epoch !== generation || judging || compacting) return;
  judging = true;
  try {
    const initial = await loadConfig($);
    const profile = parseProfile(initial.profile);
    const [messages, activeKey, rows] = await Promise.all([
      $.session.messages(),
      apiKey($),
      $.config.list(),
    ]);
    const view = snapshot(messages, [activeKey, readSavedApiKey(rows, loadedOptions)]);
    if (view.conversationTokens <= 20000) return;
    const fingerprint = await checkpointKey(view.checkpointText);
    if ((await loadState($)).state.lastHintKey === fingerprint) return;
    let loggedBody: string | undefined;
    if (initial.logRequests) {
      try {
        loggedBody = requestBody(view.state, profile);
        await appendTypeSafeLog($, requestLogLine(loggedBody));
      } catch {
        // Request logging must not replace or delay the judgment.
      }
    }
    let result: Awaited<ReturnType<typeof judge>>;
    try {
      const endpoint = await judgeEndpoint($);
      result = await judge(
        view.state,
        await apiKey($),
        {
          fetch: (url, init) => $.http.fetch(url, init),
          sleep: (ms) => $.clock.sleep(ms),
          endpoint,
        },
        profile,
      );
    } catch (error) {
      if (epoch !== generation) return;
      if (initial.logRequests) {
        try {
          await appendTypeSafeLog($, errorLogLine(loggedJudgeErrorKind(error), loggedBody));
        } catch {
          // Error logging must not replace backoff.
        }
      }
      const { key, state } = await loadState($);
      await $.store.set(key, backoff(state, await $.clock.now()));
      notice($, judgeFailureMessage(error));
      return;
    }
    if (epoch !== generation) return;
    const latest = await loadConfig($);
    const { key, state: current } = await loadState($);
    const now = await $.clock.now();
    const { context } = await $.session.usage({ breakdown: "summary" });
    if (initial.logRequests) {
      try {
        await appendTypeSafeLog(
          $,
          responseLogLine(
            loggedBody ?? requestBody(view.state, profile),
            result,
            usageFraction(context, latest.contextBudgetTokens),
            undefined,
            profile,
            effectiveBudget(contextLimit(context), latest.contextBudgetTokens),
          ),
        );
      } catch {
        // Response logging must not replace the gate decision.
      }
    }
    if (
      JSON.stringify(latest) !== JSON.stringify(initial) ||
      !(await eligible($, latest, current, context.tokens, now))
    )
      return;
    let state: SessionState = { ...current, failures: 0, retryAfter: 0, updatedAt: now };
    const auto = latest.mode === "auto";
    if (
      !qualifies(result, usageFraction(context, latest.contextBudgetTokens), profile) ||
      (auto && !latest.autoAcknowledged)
    ) {
      await $.store.set(key, state);
      return;
    }
    diagnostic = "";
    if (!auto) {
      state = { ...state, lastHintAt: state.completed, lastHintKey: fingerprint };
      await $.store.set(key, state);
      if (epoch !== generation) return;
      hintVisible = true;
      // Claude Code prefixes $.ui.status with the plugin name; do not repeat it.
      $.ui.status(HINT);
      return;
    }
    await $.store.set(key, state);
    // No await between this last identity check and the compaction request, unless a
    // before-compact prompt has to run first. That path compacts from the submitted
    // turn's end, not from here.
    if (epoch !== generation || compacting || beforeCompact) return;
    if (latest.beforeCompactPrompt.trim()) {
      await armBeforeCompact($, key, latest.beforeCompactPrompt, epoch);
      return;
    }
    await compactNow($, key);
  } finally {
    judging = false;
  }
}

/** The synchronous half of a turn end: count the exchange and run the cheap gates. */
async function settle($: EngineInterface): Promise<void> {
  const { context } = await $.session.usage();
  const now = await $.clock.now();
  const { key, state: stored } = await loadState($);
  const state = completeExchange(stored, context.tokens, now);
  await $.store.set(key, state);
  let config: Config;
  try {
    config = await loadConfig($);
  } catch (error) {
    notice($, error instanceof Error ? error.message : "無法讀取 compact-adviser 設定。");
    return;
  }
  if (judging || !(await eligible($, config, state, context.tokens, now))) return;
  const epoch = generation;
  $.clock.after(0, () => {
    void judgeCheckpoint($, epoch).catch(() =>
      notice($, "compact adviser 無法檢查此檢查點；上下文未更改。"),
    );
  });
}

async function saveRow(
  $: EngineInterface,
  key: string,
  value: string | number | boolean,
  message: string,
): Promise<boolean> {
  await invalidate($);
  // A saved row hot-reloads this module, which drops this environment's later toasts, so
  // the confirmation is left for the reloaded environment to show at its session.start.
  await $.store.set(PENDING_NOTICE_KEY, { message, at: await $.clock.now(), row: menuRow });
  const result = await $.config.set({ key, value });
  if (result.deny !== undefined) {
    await $.store.delete(PENDING_NOTICE_KEY);
    $.ui.toast(`未儲存：${result.deny}`, { timeoutMs: 8000 });
    return false;
  }
  if (key === API_KEY_KEY && typeof value === "string") {
    loadedOptions = { ...loadedOptions, typesafeApiKey: value };
  }
  diagnostic = "";
  await showPendingNotice($);
  return true;
}

/**
 * Shows and clears a save confirmation, whichever environment gets to it first, and puts
 * the pane's ring back on the row that saved: the reloaded environment starts with the
 * list and an unplaced ring.
 */
async function showPendingNotice($: EngineInterface): Promise<void> {
  const pending = (await $.store.get(PENDING_NOTICE_KEY)) as {
    message?: unknown;
    at?: unknown;
    row?: unknown;
  };
  if (pending === undefined) return;
  await $.store.delete(PENDING_NOTICE_KEY);
  const fresh = typeof pending.at === "number" && (await $.clock.now()) - pending.at < 30000;
  if (fresh && typeof pending.message === "string") {
    $.ui.toast(pending.message, { timeoutMs: 6000 });
  }
  if (fresh && typeof pending.row === "string" && (await paneOpen($))) {
    showMenu(pending.row);
    // A confirmation dialog on the way may have handed the keys to the prompt; ask again.
    await openPane($).catch(() => undefined);
    await placeRing($, 40);
  }
}

async function paneOpen($: EngineInterface): Promise<boolean> {
  try {
    return (await $.ui.panes()).some((pane) => pane.id === PANE_ID);
  } catch {
    return false;
  }
}

async function saveConsent($: EngineInterface, patch: Partial<Omit<Consent, "version">>) {
  await invalidate($);
  await $.store.set(CONSENT_STORE_KEY, { ...(await loadConsent($)), ...patch });
  diagnostic = "";
}

function openPane($: EngineInterface): Promise<void> {
  return $.ui.open({
    id: PANE_ID,
    title: "Compact adviser（已為所有會話儲存）",
    focus: true,
    closeOnEscape: true,
    rows: 12,
  });
}

function showMenu(row?: string): void {
  view = "menu";
  if (row !== undefined) menuRow = row;
  pendingFocus = menuRow;
  minimumDraft = undefined;
  keyDraft = undefined;
}

function openView(target: Exclude<PaneView, "menu">, row: string, focus: string): void {
  view = target;
  menuRow = row;
  pendingFocus = focus;
  minimumDraft = undefined;
  keyDraft = undefined;
}

/** Lands the ring where the last view change asked, once that drawing is up. */
async function placeRing($: EngineInterface, attempts = 10): Promise<void> {
  const key = pendingFocus;
  if (key === undefined) return;
  pendingFocus = undefined;
  // Every view keys its elements apart, so the call is refused until the new drawing is up.
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const result = await $.ui.focus({ requestId: PANE_ID, key });
      if (result.deny === undefined) return;
    } catch {
      return;
    }
    await $.clock.sleep(50);
  }
}

const MODE_LABELS: Record<Mode, string> = {
  hint: "僅提示（預設）",
  auto: "自動（實驗性）",
  off: "Off",
};

/** What the list row says about the key in effect: its source, never its value. */
const KEY_SOURCE_LABELS: Record<TypesafeKeySource, string> = {
  env: "來自環境變數",
  saved: "已儲存",
  ".env": "來自 .env",
  missing: "缺失",
};

/** The key view's explanation: which key is in effect, and what the actions here change. */
function keyDetail(source: TypesafeKeySource, saved: boolean): string {
  switch (source) {
    case "env":
      return saved
        ? "當前生效：啟動環境中的 TYPESAFE_API_KEY，優先於此處儲存的金鑰。"
        : "當前生效：啟動環境中的 TYPESAFE_API_KEY。";
    case "saved":
      return "當前生效：此處儲存的金鑰，適用於所有會話。";
    case ".env":
      return "當前生效：工作目錄中 .env 檔案裡的 TYPESAFE_API_KEY。";
    default:
      return "當前沒有生效的金鑰。請在此儲存，或在環境變數或 .env 檔案中設定 TYPESAFE_API_KEY。";
  }
}

/**
 * Asks in the engine's dialog. The dialog takes the keyboard from an open settings pane
 * and hands it to the prompt when it closes, so a pane that asked requests it back.
 */
async function confirm(
  $: EngineInterface,
  question: string,
  yes: string,
  header: string,
  fromPane: boolean,
) {
  try {
    return (await $.ui.ask(question, { options: [yes, "取消"], header })) === yes;
  } catch {
    return false;
  } finally {
    if (fromPane) await openPane($).catch(() => undefined);
  }
}

async function changeMode($: EngineInterface, mode: Mode, fromPane = false): Promise<void> {
  if (mode === "auto") {
    if (!(await loadConsent($)).autoAcknowledged) {
      const confirmed = await confirm(
        $,
        "自動模式會應用於所有 Claude Code 會話和專案。壓縮會有資訊損失，時機準確性也未得到驗證。它只在符合條件的檢查點觸發，不會立即壓縮。是否啟用實驗性自動壓縮？",
        "啟用自動模式",
        "自動模式",
        fromPane,
      );
      if (!confirmed) return;
      await saveConsent($, { autoAcknowledged: true });
    }
    await saveRow(
      $,
      MODE_KEY,
      "auto",
      "自動模式已儲存（所有會話）。仍需要 TypeSafe 金鑰。",
    );
    return;
  }
  await saveRow(
    $,
    MODE_KEY,
    mode,
    `${mode === "hint" ? "僅提示" : "關閉"}已儲存（所有會話）。Claude Code 自帶的壓縮不受影響。`,
  );
}

/** Validates and saves a context budget; throws the validation message for the caller to show. */
async function changeBudget($: EngineInterface, text: string): Promise<boolean> {
  const count = parseBudget(text);
  return saveRow(
    $,
    BUDGET_KEY,
    count,
    count > 0
      ? `上下文預算已儲存：${formatTokens(count)} 個 token（所有會話）。`
      : "上下文預算已關閉（所有會話）：提示閾值將跟隨 Claude Code 自身的上限。",
  );
}

/** Validates and saves a minimum; throws the validation message for the caller to show. */
async function changeMinimum($: EngineInterface, text: string): Promise<boolean> {
  const count = text === "default" ? DEFAULT_MINIMUM : parseMinimum(text);
  const { context } = await $.session.usage();
  const warning =
    count >= context.window
      ? `警告：該值已達到或超過當前模型的 ${formatTokens(context.window)} token 視窗，因此在 Claude Code 自身壓縮之前不會觸發建議。`
      : "";
  return saveRow(
    $,
    MINIMUM_KEY,
    count,
    `最小上下文已儲存：${formatTokens(count)} 個 token（所有會話）。${warning}`,
  );
}

async function changeLogRequests($: EngineInterface, enabled: boolean): Promise<void> {
  await saveRow(
    $,
    LOG_KEY,
    enabled,
    enabled
      ? TypeSafe `請求記錄已開啟（所有會話）。${await sessionLogPath($)}`
      : "TypeSafe 請求記錄已關閉（所有會話）。",
  );
}

async function changeSavedApiKey($: EngineInterface, text: string): Promise<boolean> {
  return saveRow(
    $,
    API_KEY_KEY,
    parseSavedApiKey(text),
    "TypeSafe API 金鑰已儲存（所有會話）。狀態只顯示來源，不顯示金鑰本身。",
  );
}

async function clearSavedApiKey($: EngineInterface): Promise<boolean> {
  return saveRow(
    $,
    API_KEY_KEY,
    "",
    "已清除儲存的 TypeSafe API 金鑰（所有會話）。啟動環境變數和 .env 仍然有效。",
  );
}

async function statusText($: EngineInterface): Promise<string> {
  const config = await loadConfig($);
  const { state } = await loadState($);
  const usage = await $.session.usage({ breakdown: "summary" });
  const tokens = usage.context.tokens;
  const breakdown = usage.context.breakdown;
  const engine =
    breakdown === undefined
      ? ""
      : breakdown.isAutoCompactEnabled && breakdown.autoCompactThreshold !== undefined
        ? ` Claude Code 會在 ${formatTokens(breakdown.autoCompactThreshold)} 個 token 時自動壓縮。`
        : " Claude Code 的自動壓縮已關閉。";
  const cooldown =
    typeof tokens === "number"
      ? (cooldownReason(state, tokens, await $.clock.now()) ??
        "無冷卻期；語義檢查仍然適用。")
      : "等待新的模型用量資料。";
  const budget = config.contextBudgetTokens;
  const fraction = usageFraction(usage.context, budget);
  return `模式：${config.mode}${config.mode === "auto" && !config.autoAcknowledged ? "（未確認）" : ""}。最小上下文：${formatTokens(config.minContextTokens)} 個 token。預算：${budget > 0 ? `${formatTokens(budget)} 個 token` : "關閉"}。上下文：${typeof tokens === "number" ? formatTokens(tokens) : "未知"}${Number.isFinite(fraction) ? `（${Math.round(fraction * 100)}% 的${effectiveBudget(contextLimit(usage.context), budget) > 0 ? "預算" : "上下文上限"}；提示閾值 ${floorFor(fraction, parseProfile(config.profile)).toFixed(2)}）` : ""}。${formatKeyStatus((await resolvedKey($)).source)}。${cooldown}${engine} 請求記錄：${config.logRequests ? await sessionLogPath($) : "關閉"}。設定：/config（compact-adviser 項）和 /compact-adviser。`;
}

async function snoozeOrDismiss($: EngineInterface, command: "snooze" | "dismiss") {
  const { key, state } = await loadState($);
  await invalidate($);
  if (command === "snooze") {
    await $.store.set(key, {
      ...state,
      snoozeUntil: state.completed + 4,
      updatedAt: await $.clock.now(),
    });
  }
  $.ui.toast(
    command === "snooze" ? "Advice snoozed for three completed exchanges." : "Hint dismissed.",
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Could not save settings.";
}

export const register: Register = (on, options) => {
  loadedOptions = options;
  on("session.start", async ($, e, next) => {
    if (!(await isActivated($))) return next(e);
    interactive = e.isInteractive;
    if (!interactive) return next(e);
    generation++;
    judging = false;
    compacting = false;
    hintVisible = false;
    beforeCompact = undefined;
    abandonedTurn = undefined;
    abandonedDispatch = undefined;
    foreignSubmitted = false;
    await $.command.register({
      name: COMMAND,
      description: "配置持久化的壓縮建議、實驗性自動模式和最小 token 數",
      argumentHint: "[auto|hint|off|status|threshold <tokens|default>|snooze|dismiss]",
    });
    try {
      const now = await $.clock.now();
      const keys = (await $.store.keys()).filter((key) => key.startsWith("session:"));
      const entries = await Promise.all(
        keys.map(async (key) => ({ key, value: await $.store.get(key) })),
      );
      for (const key of staleSessionKeys(entries, now)) await $.store.delete(key);
    } catch {
      // Pruning is housekeeping; a failure leaves old cooldown records in place.
    }
    await showPendingNotice($).catch(() => undefined);
    clearStatus($);
    return next(e);
  });

  // Anyone's prompt or command but this module's own abandons a pending handoff, and the
  // turn it starts is never taken for the handoff's.
  on("prompt.submit", async ($, e, next) => {
    if ((await isActivated($)) && !ownSubmission(e.origin)) {
      foreignSubmitted = true;
      if (beforeCompact) await abandonBeforeCompact($);
      else abandonedDispatch = undefined;
    }
    return next(e);
  }).catch((_$, e, next) => next(e));

  on("command.run", async ($, e, next) => {
    if ((await isActivated($)) && !ownSubmission(e.origin)) {
      foreignSubmitted = true;
      if (beforeCompact) await abandonBeforeCompact($);
      else abandonedDispatch = undefined;
    }
    return next(e);
  });

  on("turn.start", async ($, e, next) => {
    if (await isActivated($)) {
      if (abandonedDispatch) {
        abandonedTurn = { turnId: e.turnId, key: abandonedDispatch.key };
        abandonedDispatch = undefined;
        foreignSubmitted = false;
        await invalidate($);
        return next(e);
      }
      const foreign = foreignSubmitted;
      foreignSubmitted = false;
      const handoff = beforeCompact;
      if (handoff && handoff.turnId === undefined && !foreign) {
        handoff.turnId = e.turnId;
        return next(e);
      }
      await invalidate($);
      await abandonBeforeCompact($);
    }
    return next(e);
  });

  on("turn.complete", async ($, e, next) => {
    const result = await next(e);
    if (!(await isActivated($)) || !interactive) return result;
    const abandoned = abandonedTurn;
    if (abandoned && e.agentId === undefined && abandoned.turnId === e.turnId) {
      abandonedTurn = undefined;
      await deferRetry($, abandoned.key);
      return result;
    }
    const handoff = beforeCompact;
    if (handoff && e.agentId === undefined && handoff.turnId === e.turnId) {
      beforeCompact = undefined;
      if (e.reason === "answer" && !e.isAborted && e.answer.trim()) {
        const key = handoff.key;
        const epoch = generation;
        $.clock.after(0, () => {
          if (epoch !== generation || foreignSubmitted) {
            clearStatus($);
            return;
          }
          void compactNow($, key).catch(() =>
            notice(
              $,
              "Compact adviser could not compact after the before-compact prompt; context left unchanged.",
            ),
          );
        });
        return result;
      }
      clearStatus($);
      await deferRetry($, handoff.key);
      notice($, "The before-compact turn did not finish cleanly. Context left unchanged.");
      return result;
    }
    if (e.agentId !== undefined || e.reason !== "answer" || e.isAborted || !e.answer.trim()) {
      return result;
    }
    try {
      await settle($);
    } catch {
      notice($, "compact adviser 無法檢查此檢查點；上下文未更改。");
    }
    return result;
  });

  // Any compaction but this module's own (which never reaches its own hook) resets the
  // session's cooldown; a precompute installs nothing and a subagent's is its own.
  on("session.compact", async ($, e, next) => {
    const result = await next(e);
    if (!(await isActivated($)) || !interactive) return result;
    if (e.trigger === "precompute" || e.agentId !== undefined || result.skip !== undefined) {
      return result;
    }
    try {
      await abandonBeforeCompact($);
      await invalidate($);
      const key = sessionKey(await $.session.id());
      await $.store.set(key, initialState(true, await $.clock.now()));
    } catch {
      // The cooldown record stays as it was; the next judgment re-reads fresh usage.
    }
    return result;
  });

  on("command.run", { command: COMMAND }, async ($, e, next) => {
    if (!(await isActivated($))) return next(e);
    if (!interactive) return { text: "compact-adviser acts only in interactive sessions." };
    const [command = "", ...rest] = e.args.trim().split(/\s+/);
    const value = rest.join(" ");
    try {
      if (!command) {
        showMenu("menu:mode");
        statusDetails = undefined;
        await openPane($);
        await placeRing($, 40);
      } else if (["auto", "hint", "off"].includes(command) && !value) {
        await changeMode($, command as Mode);
      } else if (command === "budget" && value) {
        await changeBudget($, value);
      } else if (command === "threshold" && value) {
        await changeMinimum($, value);
      } else if (command === "status" && !value) {
        // Claude Code prefixes $.ui.log with the plugin name; do not repeat it.
        $.ui.log(await statusText($));
      } else if ((command === "snooze" || command === "dismiss") && !value) {
        await snoozeOrDismiss($, command);
      } else {
        throw new Error(USAGE);
      }
    } catch (error) {
      $.ui.toast(errorMessage(error), { timeoutMs: 8000 });
    }
    return {};
  });

  // Keep the saved key out of `/config` so the host menu never draws the secret.
  // Hidden rows still persist through $.config.set in the same settings path as mode.
  on("config.describe", { key: "compact-adviser.typesafeApiKey" }, async (_$, e, next) => {
    const described = await next(e);
    return { ...described, isHidden: true };
  });

  // Escape in a view returns to the list, as Pi's select cancels back to its menu; at
  // the list it closes the pane as the person asked.
  on("ui.close", { id: PANE_ID }, async ($, e, next) => {
    if (!(await isActivated($)) || e.origin.kind !== "person" || view === "menu") return next(e);
    showMenu();
    await $.ui.invalidate("ui.render");
    // Escape hands the keys to the prompt as it asks to close; ask for them back.
    await openPane($).catch(() => undefined);
    await placeRing($);
    return { value: undefined };
  });

  // The settings pane: the Pi extension's menu as engine elements. One list of rows the
  // arrows move through (a plain Button each, so no picker swallows the keys); Enter
  // opens a row's own view, where an option, a field, or Back returns to the list.
  on("ui.render", { component: "Pane" }, async ($, e, next) => {
    if (!(await isActivated($)) || e.requestId !== PANE_ID) return next(e);
    if (e.surface !== "terminal") {
      const { Text } = $.ui.resolve(e);
      return Text({ children: USAGE });
    }
    const { Box, Text, Input, Button } = $.ui.resolve(e);
    const column = (children: RenderChildren[]) => Box({ flexDirection: "column", children });
    const heading = (crumb?: string) =>
      Box({
        flexDirection: "row",
        marginBottom: 1,
        children: [
          Text({ bold: true, children: "Compact adviser" }),
          Text({ dimColor: true, children: crumb ? ` › ${crumb}` : "  已為所有會話儲存" }),
        ],
      });
    const hint = (leave: string) =>
      Text({ dimColor: true, children: `↑↓ 移動 · Enter 選擇 · Esc ${leave}` });
    const closePane = () => void $.ui.close({ id: PANE_ID });
    const redraw = async () => {
      await $.ui.invalidate("ui.render");
      await placeRing($);
    };
    const run = (action: () => Promise<unknown>) => {
      void action()
        .catch((error) => $.ui.toast(errorMessage(error), { timeoutMs: 8000 }))
        .finally(redraw);
    };
    const back = () => {
      showMenu();
      void redraw();
    };
    let config: Config;
    try {
      config = await loadConfig($);
    } catch (error) {
      return column([
        heading(),
        Text({ color: "error", children: errorMessage(error) }),
        Button({
          key: "menu:close",
          label: "關閉",
          plain: true,
          autoFocus: true,
          onPress: closePane,
        }),
      ]);
    }
    const [rows, key] = await Promise.all([$.config.list(), resolvedKey($)]);
    const savedKey = readSavedApiKey(rows, loadedOptions) !== undefined;

    /** A list of rows the ring moves through; the one at `focus` takes it first. */
    const list = (
      entries: { key: string; label: string; onPress: () => void; dim?: boolean }[],
      focus: string,
    ) => {
      const width = Math.max(...entries.map((entry) => entry.label.length));
      return column(
        entries.map((entry) =>
          Button({
            key: entry.key,
            label: entry.label.padEnd(width),
            plain: true,
            ...(entry.dim ? { dimColor: true } : {}),
            ...(entry.key === focus ? { autoFocus: true } : {}),
            onPress: entry.onPress,
          }),
        ),
      );
    };
    /** A view of options: the current one marked; picking it, or Back, only returns. */
    const options = <T extends string>(
      crumb: string,
      current: T,
      choices: { value: T; label: string }[],
      pick: (value: T) => void,
    ) =>
      column([
        heading(crumb),
        list(
          [
            ...choices.map((choice) => ({
              key: `${view}:${choice.value}`,
              label: `${choice.value === current ? "●" : " "} ${choice.label}`,
              onPress: () => {
                showMenu();
                if (choice.value === current) void redraw();
                else pick(choice.value);
              },
            })),
            { key: "back", label: "  返回", dim: true, onPress: back },
          ],
          `${view}:${current}`,
        ),
        hint("back"),
      ]);

    if (view === "mode") {
      return options(
        "模式",
        config.mode,
        (["hint", "auto", "off"] as const).map((value) => ({ value, label: MODE_LABELS[value] })),
        (mode) => run(() => changeMode($, mode, true)),
      );
    }
    if (view === "logging") {
      return options(
        "記錄 TypeSafe 請求",
        config.logRequests ? "on" : "off",
        [
          { value: "off", label: "關閉（預設）" },
          { value: "on", label: "開啟" },
        ],
        (value) => run(() => changeLogRequests($, value === "on")),
      );
    }
    if (view === "minimum") {
      return column([
        heading("最小上下文"),
        Input({
          key: "minimum",
          label: "Token 數",
          value: minimumDraft?.text ?? String(config.minContextTokens),
          placeholder: String(DEFAULT_MINIMUM),
          submitLabel: "儲存",
          autoFocus: true,
          onSubmit: (text: string) => {
            run(async () => {
              try {
                if (await changeMinimum($, text)) showMenu();
                else minimumDraft = { text };
              } catch (error) {
                minimumDraft = { text, error: errorMessage(error) };
              }
            });
          },
        }),
        minimumDraft?.error
          ? Text({ color: "error", children: minimumDraft.error })
          : Text({
              dimColor: true,
              children: "token 數，不是百分比；低於該值不做判斷。",
            }),
        list([{ key: "back", label: "返回", dim: true, onPress: back }], ""),
        hint("back"),
      ]);
    }
    if (view === "key") {
      return column([
        heading("TypeSafe API 金鑰"),
        Text({ dimColor: true, wrap: "wrap", children: keyDetail(key.source, savedKey) }),
        Input({
          key: "typesafeApiKey",
          label: "金鑰",
          value: keyDraft?.text ?? "",
          placeholder: savedKey ? "貼上金鑰以替換已儲存的金鑰" : "貼上金鑰以儲存",
          submitLabel: "儲存",
          autoFocus: true,
          onSubmit: (text: string) => {
            run(async () => {
              try {
                if (await changeSavedApiKey($, text)) showMenu();
                else keyDraft = { text };
              } catch (error) {
                keyDraft = { text, error: errorMessage(error) };
              }
            });
          },
        }),
        ...(keyDraft?.error ? [Text({ color: "error", children: keyDraft.error })] : []),
        list(
          [
            ...(savedKey
              ? [
                  {
                    key: "clearKey",
                    label: "清除已儲存的金鑰",
                    onPress: () => {
                      run(async () => {
                        if (await clearSavedApiKey($)) showMenu();
                      });
                    },
                  },
                ]
              : []),
            { key: "back", label: "返回", dim: true, onPress: back },
          ],
          "",
        ),
        hint("back"),
      ]);
    }

    const modeValue = `${MODE_LABELS[config.mode]}${
      config.mode === "auto" && !config.autoAcknowledged ? ", not confirmed" : ""
    }`;
    const setting = (label: string, value: string) => `${label.padEnd(24)}${value}`;
    const open = (target: Exclude<PaneView, "menu">, row: string, focus: string) => () => {
      openView(target, row, focus);
      void redraw();
    };
    return column([
      heading(),
      list(
        [
          {
            key: "menu:mode",
            label: setting("模式", modeValue),
            onPress: open("mode", "menu:mode", `mode:${config.mode}`),
          },
          {
            key: "menu:minimum",
            label: setting("最小上下文", `${formatTokens(config.minContextTokens)} tokens`),
            onPress: open("minimum", "menu:minimum", "minimum"),
          },
          {
            key: "menu:logRequests",
            label: setting("記錄 TypeSafe 請求", config.logRequests ? "開啟" : "關閉"),
            onPress: open(
              "logging",
              "menu:logRequests",
              `logging:${config.logRequests ? "on" : "off"}`,
            ),
          },
          {
            key: "menu:typesafeApiKey",
            label: setting("TypeSafe API 金鑰", KEY_SOURCE_LABELS[key.source]),
            onPress: open("key", "menu:typesafeApiKey", "typesafeApiKey"),
          },
          {
            key: "menu:reset",
            label: `將最小值重置為 ${formatTokens(DEFAULT_MINIMUM)}`,
            onPress: () => {
              menuRow = "menu:reset";
              run(() => changeMinimum($, "default"));
            },
          },
          {
            key: "menu:status",
            label: "狀態",
            onPress: () => {
              menuRow = "menu:status";
              run(async () => {
                statusDetails = await statusText($);
              });
            },
          },
          { key: "menu:close", label: "關閉", onPress: closePane },
        ],
        menuRow,
      ),
      ...(statusDetails ? [Text({ dimColor: true, wrap: "wrap", children: statusDetails })] : []),
      hint("close"),
    ]);
  });
};
