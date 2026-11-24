/**
 * T-531: the words the dashboard uses for an autonomous session's stage.
 *
 * `.story/status.json` names the guide's state ("IMPLEMENT"); the In progress
 * card, or its heading, says what that means in one short word ("Code",
 * T-532). The Mod cannot import `src/`, which does not ship with the plugin,
 * so the table lives here and test/plugin/stage-label.test.ts holds it to the
 * guide's own state list: a state added there fails that test until it has a
 * label here.
 */

export const STAGE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  INIT: "開始",
  LOAD_CONTEXT: "載入",
  PICK_TICKET: "挑選",
  PLAN: "規劃",
  PLAN_REVIEW: "評審",
  WRITE_TESTS: "測試",
  IMPLEMENT: "編碼",
  TEST: "測試",
  CODE_REVIEW: "評審",
  BUILD: "構建",
  VERIFY: "驗證",
  FINALIZE: "提交",
  KNOWLEDGE_REVIEW: "臺賬",
  COMPACT: "已壓縮",
  LESSON_CAPTURE: "經驗",
  ISSUE_FIX: "修復",
  ISSUE_SWEEP: "清理",
  HANDOVER: "交接",
  COMPLETE: "完成",
  SESSION_END: "已結束",
});

/**
 * How old a status may be before the stage is drawn as uncertain: the
 * presence TTL (`PRESENCE_TTL_MS`, src/presence/types.ts), the window the
 * presence handler sweeps with. A copy, because `src/` does not ship with the
 * plugin; the stage-label test fails if the two drift apart.
 *
 * It is this long and not minutes on purpose. The status writer skips a write
 * that would change only `observedAt` (ISS-1012), so the stamp is the time of
 * the last change, not a heartbeat, and a quiet stage keeps an old stamp while
 * the session is healthy.
 */
export const STAGE_STALE_MS = 12 * 60 * 60 * 1000;

/**
 * Code points a terminal would act on rather than draw: C0 (ESC, BEL, tab,
 * CR, LF and the rest), DEL, C1, the Unicode line and paragraph separators,
 * and the bidirectional embeddings, overrides and isolates.
 */
const UNSAFE_RUN = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]+/g;
const UNSAFE_ONE = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/;

/**
 * ISS-1306: invisible code points that hide text or flip its direction: the
 * zero-width space, word joiner and byte-order mark, and the LRM, RLM and
 * ALM marks. They take no cell, so they are removed, not spaced. U+200C
 * (ZWNJ, part of Persian and Indic words) and U+200D (ZWJ, which joins an
 * emoji sequence into one cluster) are real text and stay.
 */
const INVISIBLE = /[\u200b\u200e\u200f\u2060\ufeff\u061c]/g;
const INVISIBLE_ONE = /[\u200b\u200e\u200f\u2060\ufeff\u061c]/;

/**
 * A string made fit to draw on one line: the invisible code points go, each
 * run of unsafe code points becomes one space, then the ends are trimmed.
 * status.json and ledger titles are read, never trusted, so nothing in them
 * reaches the pane as a control sequence, a line break or hidden text, and
 * the width arithmetic measures what is actually drawn.
 */
export function displaySafe(text: string): string {
  return text.replace(INVISIBLE, "").replace(UNSAFE_RUN, " ").trim();
}

/**
 * A status.json field worth keeping: a string with something in it besides
 * whitespace, underscores, unsafe and invisible code points. Anything else
 * is unset.
 */
export function statusField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  for (const char of value) {
    if (char !== "_" && char.trim() !== "" && !UNSAFE_ONE.test(char) && !INVISIBLE_ONE.test(char)) return value;
  }
  return null;
}

/**
 * The label for a state: the table's own entry, otherwise the state itself,
 * lowercased with its underscores as spaces. Never blank.
 */
export function stageLabel(state: string): string {
  if (Object.hasOwn(STAGE_LABELS, state)) return STAGE_LABELS[state]!;
  const fallback = displaySafe(state.toLowerCase().replace(/_/g, " ")).replace(/\s+/g, " ");
  return fallback === "" ? "未知" : fallback;
}

/** True only when the stamp reads as a time more than STAGE_STALE_MS before `now`. */
export function stageStale(observedAt: string | null, now: number): boolean {
  if (observedAt === null) return false;
  const at = Date.parse(observedAt);
  return Number.isFinite(at) && now - at > STAGE_STALE_MS;
}
