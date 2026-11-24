// What an answer's CO2 line says and when it raises its voice. Pure: no Claude Code API, so
// Node runs it directly (tests/run-mod-tests.mjs).

export type Lang = "fr" | "en" | "zh";

export type AnswerCo2View = {
  // "16 gCO₂", or "230 gCO₂ · 14× votre médiane" for an unusual answer
  main: string;
  // "dont 3 sous-agents : 22 gCO₂", only on an unusual answer the subagents weighed on
  sub: string | null;
  isUnusual: boolean;
};

export type TurnTotals = {
  grams: number;
  subagentGrams: number;
  subagents: number;
};

export const HISTORY_SIZE = 200;
export const MIN_HISTORY = 50;
// About 1 answer in 27 stands out: above the 97th percentile of the history. The 3x
// median and the 10 g floor stay as guards: over a flat history the percentile is
// the median itself.
export const UNUSUAL_PERCENTILE = 0.97;
export const UNUSUAL_RATIO = 3;
export const UNUSUAL_FLOOR_GRAMS = 10;
export const SUBAGENT_SHARE = 0.1;

const NBSP = " ";
const UNIT = "CO₂";

// Unset, empty, C and POSIX say nothing about the language.
function isLocaleValue(value: string | undefined): value is string {
  return (
    value !== undefined &&
    value !== "" &&
    value !== "C" &&
    !value.startsWith("C.") &&
    value !== "POSIX" &&
    !value.startsWith("POSIX.")
  );
}

// Same order and sentinels as detect_equiv_set (scripts/equiv-lib.sh). With no
// variable set, the language setting decides; with none, French, as in the bash.
export function detectLang(
  envValues: Array<string | undefined>,
  setting?: string,
): Lang {
  const value = envValues.find(isLocaleValue);
  if (value !== undefined) {
    return value.toLowerCase().startsWith("fr") ? "fr" : value.toLowerCase().startsWith("zh") ? "zh" : "en";
  }
  if (setting !== undefined && setting !== "") {
    return setting.toLowerCase().startsWith("fr") ? "fr" : setting.toLowerCase().startsWith("zh") ? "zh" : "en";
  }
  return "fr";
}

// Whether one of the variables decides alone, so nothing else needs to be asked.
export function hasLangVariable(envValues: Array<string | undefined>): boolean {
  return envValues.some(isLocaleValue);
}

// The `language` setting is free text ("Français", "English", "japanese"). It goes
// to detectLang as a locale would: French when it starts with "fr", English otherwise.
export function languageSetting(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text === "" ? undefined : text;
}

function decimal(value: number, digits: number, lang: Lang): string {
  const text = value.toFixed(digits);
  return lang === "fr" ? text.replace(".", ",") : lang === "zh" ? text : text;
}

// < 0.1 g, one decimal under 10 g, whole grams under 1 kg, then kg with one decimal.
// Rounding keeps the figure readable; the estimate itself is far less precise than one
// decimal.
export function formatGrams(grams: number, lang: Lang): string {
  if (grams < 0.1) return `<${NBSP}${decimal(0.1, 1, lang)}${NBSP}g${UNIT}`;
  const tenths = Math.round(grams * 10) / 10;
  if (tenths < 10) return `${decimal(tenths, 1, lang)}${NBSP}g${UNIT}`;
  const whole = Math.round(grams);
  if (whole < 1000) return `${whole}${NBSP}g${UNIT}`;
  const kilos = Math.round(grams / 100) / 10;
  return `${decimal(kilos, 1, lang)}${NBSP}kg${UNIT}`;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid] ?? 0;
  return sorted.length % 2 === 1 ? upper : ((sorted[mid - 1] ?? 0) + upper) / 2;
}

// Linear interpolation between the two closest ranks, q from 0 to 1.
export function percentile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * Math.min(Math.max(q, 0), 1);
  const lower = Math.floor(rank);
  const low = sorted[lower] ?? 0;
  const high = sorted[Math.min(lower + 1, sorted.length - 1)] ?? low;
  return low + (high - low) * (rank - lower);
}

// The current answer is compared before it joins the history.
export function isUnusual(grams: number, history: number[]): boolean {
  if (history.length < MIN_HISTORY || grams < UNUSUAL_FLOOR_GRAMS) return false;
  const m = median(history);
  return (
    m > 0 &&
    grams > UNUSUAL_RATIO * m &&
    grams > percentile(history, UNUSUAL_PERCENTILE)
  );
}

export function buildAnswerCo2(
  turn: TurnTotals,
  history: number[],
  lang: Lang,
): AnswerCo2View {
  const amount = formatGrams(turn.grams, lang);
  if (!isUnusual(turn.grams, history))
    return { main: amount, sub: null, isUnusual: false };
  const ratio = Math.round(turn.grams / median(history));
  const main = `${amount} · ${ratio}× ${lang === "zh" ? "你的中位數" : lang === "fr" ? "votre médiane" : "your median"}`;
  const share = turn.grams > 0 ? turn.subagentGrams / turn.grams : 0;
  if (turn.subagents === 0 || share < SUBAGENT_SHARE)
    return { main, sub: null, isUnusual: true };
  const n = turn.subagents;
  const grams = formatGrams(turn.subagentGrams, lang);
  const sub =
    lang === "zh"
      ? `其中 ${n} 個子代理${NBSP}：${grams}`
      : lang === "fr"
        ? `dont ${n} sous-agent${n > 1 ? "s" : ""}${NBSP}: ${grams}`
        : `incl. ${n} subagent${n > 1 ? "s" : ""}: ${grams}`;
  return { main, sub, isUnusual: true };
}

// The single line drawn under the answer where the turn duration line is not
// (the Desktop app): only ever for an unusual answer.
export function answerLine(view: AnswerCo2View): string {
  return view.sub === null
    ? view.main
    : `${view.main} · ${view.sub}`;
}

// Two decimals, as the status line rounds it; "< 0,01 $" under a cent. French puts the
// sign after the number, English before it.
export function formatUsd(usd: number, lang: Lang): string {
  const isTiny = usd < 0.01;
  const amount = decimal(isTiny ? 0.01 : usd, 2, lang);
  const money = lang === "fr" ? `${amount}${NBSP}$` : `$${amount}`;
  return isTiny ? `<${NBSP}${money}` : money;
}

// The entry pinned under the prompt. The surface already heads it with the plugin's name.
// The cost is left out when there is none to show (no price list read), never shown as 0.
// What the status line ends with follows, in its order: the quota, then the hints.
export function sessionLine(
  sessionGrams: number,
  lang: Lang,
  sessionUsd: number | null = null,
  ...after: (string | null)[]
): string {
  const fr = lang === "fr";
  const head = lang === "zh" ? "本次會話：" : fr ? `Cette session${NBSP}:` : "This session:";
  const total = `${head} ${formatGrams(sessionGrams, lang)}`;
  const cost = sessionUsd !== null && sessionUsd > 0 ? formatUsd(sessionUsd, lang) : null;
  return [total, cost, ...after].filter((part) => part !== null).join(" · ");
}

// The status line's two hints, for the entry: a newer release, and from the 1st to the
// 10th the month just closed with its total
export function updateHint(version: string): string {
  return `⬆ ${version} ${UPDATE_COMMAND}`;
}

const MONTH_NAMES_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const MONTH_NAMES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_NAMES_ZH = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

export function cardHint(month: number, grams: number, lang: Lang): string {
  const fr = lang === "fr";
  const name = (lang === "zh" ? MONTH_NAMES_ZH : fr ? MONTH_NAMES_FR : MONTH_NAMES_EN)[month] ?? "";
  return `📊 ${name}${fr ? `${NBSP}:` : ":"} ${formatGrams(grams, lang)} · /carbon-card`;
}

// December's: the year so far
export function yearCardHint(year: number, grams: number, lang: Lang): string {
  return `📊 ${year}${lang === "fr" ? `${NBSP}:` : ":"} ${formatGrams(grams, lang)} · /carbon-card`;
}

export type RateLimit = { kind: string; percentUsed: number; resetsAt?: string };

const WEEKDAYS_FR = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 86_400_000;

// A subscription's quota as the terminal status line shows it: the 5-hour window, "Usage
// 23 % ↻14:00", or without one (a verified Ultra account has none) the weekly window,
// "Usage 41 % 7j ↻jeu.", its reset as a weekday while more than a day away. Rounded half
// to even like the status line's awk printf "%.0f" (22.5 reads 22 on both), capped at 100,
// the reset in local time; a window whose reset has passed is over. Null off a
// subscription or before the first response has reported a window.
export function quotaText(
  limits: readonly RateLimit[] | undefined,
  lang: Lang,
  now: number = Date.now(),
): string | null {
  const resetOf = (limit: RateLimit) =>
    limit.resetsAt === undefined ? NaN : Date.parse(limit.resetsAt);
  // A reset that does not parse leaves the window open: NaN <= now is false
  const open = (kind: string) =>
    limits?.find(
      (limit) =>
        limit.kind === kind && Number.isFinite(limit.percentUsed) && !(resetOf(limit) <= now),
    );
  const fiveHour = open("five_hour");
  const window = fiveHour ?? open("seven_day");
  if (window === undefined) return null;
  const weekly = fiveHour === undefined;
  const fr = lang === "fr";
  const used = Math.max(0, window.percentUsed);
  const floor = Math.floor(used);
  const rounded =
    used - floor === 0.5 ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(used);
  const percent = Math.min(100, rounded);
  const head =
    (lang === "zh" ? `用量 ${percent}%` : fr ? `Usage ${percent}${NBSP}%` : `Use ${percent}%`) + (weekly ? (fr ? " 7j" : " 7d") : "");
  const reset = resetOf(window);
  if (Number.isNaN(reset)) return head;
  const d = new Date(reset);
  if (weekly && reset - now >= DAY_MS) {
    return `${head} ↻${(fr ? WEEKDAYS_FR : WEEKDAYS_EN)[d.getDay()]}`;
  }
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${head} ↻${time}`;
}

// Shown once per machine, the same on every surface.
export function welcomeText(lang: Lang): string {
  return lang === "zh"
    ? "現在每次回覆都會顯示 CO₂ 排放量。"
    : lang === "fr"
      ? "Le CO₂ s'affiche maintenant pour chaque réponse."
      : "CO₂ now shows for each answer.";
}

export function pushHistory(history: number[], grams: number): number[] {
  if (!(grams > 0)) return history;
  return [...history, grams].slice(-HISTORY_SIZE);
}

// The claude-carbon status line already shows the session total: no second one.
export function isCarbonStatusLine(command: unknown): boolean {
  return (
    typeof command === "string" &&
    command.includes("claude-carbon") &&
    command.includes("statusline.sh")
  );
}

// ── The /carbon-panel pane ──────────────────────────────────────────────────

// The pane's tab: the plugin's name, as the person asked for it
export function paneTitle(_lang: Lang): string {
  return "claude-carbon";
}

export function commandDescription(lang: Lang): string {
  return lang === "zh"
    ? "檢視你的 CO₂ 分子和會話歷史"
    : lang === "fr"
      ? "Votre molécule de CO₂ et l'historique de vos sessions"
      : "Your CO₂ molecule and the history of your sessions";
}

// Shown once per machine to someone already welcomed before the pane existed.
export function paneHint(lang: Lang): string {
  return lang === "zh"
    ? "輸入 /carbon-panel 檢視你的 CO₂ 分子和會話歷史。"
    : lang === "fr"
      ? "Tapez /carbon-panel pour voir votre molécule et l'historique de vos sessions."
      : "Type /carbon-panel to see your molecule and the history of your sessions.";
}

export function paneUnplaced(lang: Lang): string {
  return lang === "zh"
    ? "此處無法開啟碳面板：請加寬視窗或更新 Claude Code。"
    : lang === "fr"
      ? `Le panneau carbone ne peut pas s'ouvrir ici${NBSP}: élargissez la fenêtre ou mettez Claude Code à jour.`
      : "The carbon pane cannot open here: widen the window or update Claude Code.";
}

// The molecule's line: the session so far, and its ratio to the median of past sessions.
export function currentLine(
  grams: number,
  sessionMedian: number | null,
  lang: Lang,
): string {
  const fr = lang === "fr";
  const head = lang === "zh" ? "本次會話：" : fr ? `Cette session${NBSP}:` : "This session:";
  const total = `${head} ${formatGrams(grams, lang)}`;
  if (sessionMedian === null || !(sessionMedian > 0) || !(grams > 0)) return total;
  const r = grams / sessionMedian;
  const ratio =
    r >= 10 ? `${Math.round(r)}` : decimal(r, r >= 1 ? 1 : 2, lang);
  return `${total} · ${ratio}×${NBSP}${lang === "zh" ? "你的中位數" : fr ? "votre médiane" : "your median"}`;
}

// Before 10 past sessions the colour compares with a starting reference (0.5 kgCO₂),
// said simply to someone who just arrived
export function colorNote(pastSessions: number, lang: Lang): string {
  if (lang === "zh") return `顏色為臨時參考值：10 次會話後會按你的習慣調整（目前 ${pastSessions} 次）。`;
  return lang === "fr"
    ? `Couleur provisoire${NBSP}: elle s'ajustera à vos habitudes après 10 sessions (${pastSessions} pour l'instant).`
    : `Provisional colour: it adjusts to your habits after 10 sessions (${pastSessions} so far).`;
}

// No history file. `missing` names the tools the SessionStart hook found absent (jq,
// sqlite3): without them no database is created.
export function noHistoryText(lang: Lang, missing: string[] | null = null): string {
  if (missing !== null && missing.length > 0) {
    const tools = missing.join(lang === "fr" ? " et " : " and ");
    if (lang === "zh") return `要記錄會話，請安裝 ${tools} 並重啟 Claude Code（見 README）。`;
    return lang === "fr"
      ? `Pour enregistrer vos sessions, installez ${tools} puis relancez Claude Code (voir le README).`
      : `To record your sessions, install ${tools} and restart Claude Code (see the README).`;
  }
  return lang === "zh"
    ? "暫無歷史記錄（見 README）。"
    : lang === "fr"
      ? "Aucun historique pour l'instant (voir le README)."
      : "No history yet (see the README).";
}

// Shown once, to someone whose database the SessionStart hook created by itself
export function autoSetupText(lang: Lang): string {
  if (lang === "zh") return "這臺機器上的會話現已開始記錄，包括磁碟上已有的會話。不會發送任何資料。";
  return lang === "fr"
    ? "Vos sessions sont maintenant enregistrées sur cette machine, y compris celles déjà sur le disque. Rien n'est envoyé."
    : "Your sessions are now recorded on this machine, including those already on disk. Nothing is sent anywhere.";
}

export function emptyRangeText(lang: Lang): string {
  if (lang === "zh") return "此時間段內沒有會話。";
  return lang === "fr"
    ? "Aucune session sur cette période."
    : "No session in this period.";
}


const RANGE_LABELS: Record<string, [string, string, string]> = {
  "7d": ["7 j", "7 d", "近 7 天"],
  "30d": ["30 j", "30 d", "近 30 天"],
  "1y": ["12 mois", "12 months", "近 12 個月"],
  all: ["Tout", "All", "全部"],
  custom: ["Personnalisée", "Custom", "自定義"],
};
function pick(pair: [string, string, string] | undefined, lang: Lang): string {
  return pair === undefined ? "" : lang === "zh" ? pair[2] : lang === "fr" ? pair[0] : pair[1];
}

export function rangeLabel(range: string, lang: Lang): string {
  return pick(RANGE_LABELS[range], lang);
}


function countOf(n: number, step: string, lang: Lang): string {
  if (lang === "zh") return `${n} ${step === "week" ? "周" : step === "month" ? "個月" : "次會話"}`;
  const fr = lang === "fr";
  if (step === "week") return fr ? `${n} semaine${n > 1 ? "s" : ""}` : `${n} week${n > 1 ? "s" : ""}`;
  if (step === "month") return fr ? `${n} mois` : `${n} month${n > 1 ? "s" : ""}`;
  return `${n} session${n > 1 ? "s" : ""}`;
}

// Under the stripes: what one stripe is, and the median their colours measure against
const PER: Record<string, [string, string, string]> = {
  day: ["jour", "day", "天"],
  week: ["semaine", "week", "周"],
  month: ["mois", "month", "個月"],
};
// Before three periods with sessions in them there is nothing to colour: the stripes
// wait, and say what they will show
export function stripesWaitText(step: string, filled: number, lang: Lang): string {
  const fr = lang === "fr";
  const units: Record<string, [string, string, string]> = {
    day: ["jours", "days", "天"],
    week: ["semaines", "weeks", "周"],
    month: ["mois", "months", "個月"],
  };
  const unit = pick(units[step], lang);
  if (lang === "zh") return `使用 3 ${unit}後會出現彩色條帶（目前 ${filled}）：每個時間段一條，按 CO₂ 從藍到紅。`;
  return fr
    ? `Vos bandes de couleur apparaissent après 3 ${unit} d'usage (${filled} pour l'instant)${NBSP}: une par période, du bleu au rouge selon son CO₂.`
    : `Your colour stripes show after 3 ${unit} of use (${filled} so far): one per period, blue to red by its CO₂.`;
}

export function stripesCaption(step: string, stripeMedian: number | null, lang: Lang): string {
  const fr = lang === "fr";
  const unit = pick(PER[step], lang);
  const one = lang === "zh" ? `每${unit}一條` : fr ? `une bande par ${unit}` : `one stripe per ${unit}`;
  if (stripeMedian === null) return one;
  const per = lang === "zh" ? "" : fr ? ` par ${unit}` : ` a ${unit}`;
  return `${one} · ${lang === "zh" ? "中位數" : fr ? "médiane" : "median"} ${formatGrams(stripeMedian, lang)}${per}`;
}

// The period's figure, the pane's main one
export function periodHeadline(grams: number, lang: Lang): string {
  if (lang === "zh") return `${formatGrams(grams, lang)}（本時間段）`;
  return lang === "fr"
    ? `${formatGrams(grams, lang)} sur la période`
    : `${formatGrams(grams, lang)} over the period`;
}

export function sessionsCount(n: number, lang: Lang): string {
  return countOf(n, "session", lang);
}

// The custom range's fields: a date typed day first, or as 2026-05-01
export function datePlaceholder(lang: Lang): string {
  return lang === "zh" ? "年/月/日" : lang === "fr" ? "JJ/MM/AAAA" : "DD/MM/YYYY";
}

export function dateInvalid(lang: Lang): string {
  if (lang === "zh") return "無法識別日期：請按 2026/05/01 的格式輸入。";
  return lang === "fr"
    ? `Date non reconnue${NBSP}: tapez-la comme 01/05/2026.`
    : "Date not recognised: type it as 01/05/2026.";
}

// A day key shown back in its field: "01/05/2026"
export function dayInputValue(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d ?? ""}/${m ?? ""}/${y ?? ""}`;
}

export function fromLabel(lang: Lang): string {
  return lang === "zh" ? "從" : lang === "fr" ? "Du" : "From";
}

export function toLabel(lang: Lang): string {
  return lang === "zh" ? "到" : lang === "fr" ? "au" : "to";
}

export function waitingText(lang: Lang): string {
  if (lang === "zh") return "本次會話：等待第一次回覆";
  return lang === "fr"
    ? `Cette session${NBSP}: en attente de la première réponse`
    : "This session: waiting for the first answer";
}



const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_ZH = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

// A day ("22 août", "Aug 22", with the year when asked), or a month for monthly
// stripes ("août 2026", "Aug 2026").
export function dateLabel(
  ms: number,
  step: string,
  lang: Lang,
  withYear = false,
): string {
  const d = new Date(ms);
  const month = (lang === "zh" ? MONTHS_ZH : lang === "fr" ? MONTHS_FR : MONTHS_EN)[d.getMonth()] ?? "";
  if (step === "month") return lang === "zh" ? `${month}${d.getFullYear()}年` : `${month}${NBSP}${d.getFullYear()}`;
  const year = withYear ? `${NBSP}${d.getFullYear()}` : "";
  if (lang === "zh") return `${d.getMonth() + 1}月${d.getDate()}日${withYear ? `${d.getFullYear()}年` : ""}`;
  return lang === "fr"
    ? `${d.getDate()}${NBSP}${month}${year}`
    : `${month}${NBSP}${d.getDate()}${withYear ? `,${NBSP}${d.getFullYear()}` : ""}`;
}

// A stripe's tooltip in the desktop app.
export function stripeTitle(
  start: number,
  step: string,
  grams: number,
  sessions: number,
  lang: Lang,
): string {
  const fr = lang === "fr";
  const when =
    step === "week"
      ? `${lang === "zh" ? "周起始 " : fr ? "semaine du" : "week of"} ${dateLabel(start, "session", lang)}`
      : dateLabel(start, step, lang);
  const amount = grams > 0 ? formatGrams(grams, lang) : lang === "zh" ? "無會話" : fr ? "aucune session" : "no session";
  return sessions === 0
    ? `${when} · ${amount}`
    : `${when} · ${amount} · ${countOf(sessions, "session", lang)}`;
}

// Against the same length of time just before: "+12 % par rapport aux 30 jours
// d'avant". Nothing when there is nothing before to compare with.
const BEFORE: Record<string, [string, string, string]> = {
  "7d": ["aux 7 jours d'avant", "the 7 days before", "較前 7 天"],
  "30d": ["aux 30 jours d'avant", "the 30 days before", "較前 30 天"],
  "1y": ["aux 12 mois d'avant", "the 12 months before", "較前 12 個月"],
  custom: ["à la période d'avant", "the period before", "較前一時間段"],
};

// The change against the period before, in whole percent; null when there is none
export function changePercent(grams: number, previous: number): number | null {
  return previous > 0 ? Math.round(((grams - previous) / previous) * 100) : null;
}
export function compareText(
  grams: number,
  previous: number,
  range: string,
  lang: Lang,
): string | null {
  const before = BEFORE[range];
  const change = changePercent(grams, previous);
  if (before === undefined || change === null) return null;
  const sign = change > 0 ? "+" : change < 0 ? "-" : "";
  const amount = `${sign}${Math.abs(change)}${NBSP}%`;
  return lang === "zh"
    ? `${amount} ${before[2]}`
    : lang === "fr"
      ? `${amount} par rapport ${before[0]}`
      : `${amount} vs ${before[1]}`;
}

// ── Model families, as the session block names them ─────

const FAMILY_NAMES: Record<string, string> = {
  fable: "Fable",
  opus: "Opus",
  sonnet: "Sonnet",
  haiku: "Haiku",
};
export function familyName(f: string): string {
  return FAMILY_NAMES[f] ?? f;
}


// The car factor as the pane prints it, the unit spelled out: "142 gCO₂/km, ADEME 2025"
export function carTag(tag: string): string {
  return tag.replace(/(\d)\s*g\//, `$1${NBSP}gCO₂/`);
}

// A subagent's molecule, on hover: "Sous-agent 2 · 12 gCO₂"
export function subagentTitle(n: number, grams: number, lang: Lang): string {
  return `${lang === "zh" ? "子代理" : lang === "fr" ? "Sous-agent" : "Subagent"} ${n} · ${formatGrams(grams, lang)}`;
}

export function subagentsAlt(n: number, lang: Lang): string {
  return lang === "zh"
    ? `本次會話的 ${n} 個子代理，每個各有一個小 CO₂ 分子，按排放顏色區分`
    : lang === "fr"
      ? `${n} sous-agent${n > 1 ? "s" : ""} de cette session, une petite molécule chacun, colorée selon son CO₂`
      : `${n} subagent${n > 1 ? "s" : ""} of this session, a small molecule each, coloured by its CO₂`;
}

// More subagents than the row shows: "+4"
export function moreAgentsText(n: number): string {
  return `+${n}`;
}

// The context window's fill: "Contexte 42 %"
export function contextText(percentUsed: number, lang: Lang): string {
  const p = `${Math.round(percentUsed)}${NBSP}%`;
  return lang === "zh" ? `上下文 ${p}` : lang === "fr" ? `Contexte ${p}` : `Context ${p}`;
}

// The running session, under its line: "12 réponses · 3 sous-agents · Opus"
export function sessionStatsText(
  answers: number,
  subagents: number,
  f: string | null,
  lang: Lang,
): string {
  const fr = lang === "fr";
  const parts = [
    lang === "zh" ? `${answers} 次回覆` : fr ? `${answers} réponse${answers > 1 ? "s" : ""}` : `${answers} answer${answers > 1 ? "s" : ""}`,
    lang === "zh" ? `${subagents} 個子代理` : fr ? `${subagents} sous-agent${subagents > 1 ? "s" : ""}` : `${subagents} subagent${subagents > 1 ? "s" : ""}`,
  ];
  if (f !== null) parts.push(familyName(f));
  return parts.join(" · ");
}

// The pane's last line: who made it, and the version for a team
export const AUTHOR_URL = "https://www.linkedin.com/in/gwittebolle/";
// The French site is at the root; only the English one has a prefix
export function teamUrl(lang: Lang): string {
  return lang === "fr"
    ? "https://tokenclimate.com/?ref=carbon-panel"
    : "https://tokenclimate.com/en?ref=carbon-panel";
}

// The project's home: its README says what the tool does and leads to the methodology
export const REPO_URL = "https://github.com/gwittebolle/claude-carbon";
export function repoLabel(lang: Lang): string {
  return lang === "zh" ? "瞭解 claude-carbon" : lang === "fr" ? "En savoir plus sur claude-carbon" : "Learn more about claude-carbon";
}

// A newer release, at the top of the foot: what to ask Claude, the plugin command
// The one command for every install: the skill updates the plugin, the clone, or both
export const UPDATE_COMMAND = "/carbon-update";
export function updateText(version: string, lang: Lang): string {
  return lang === "zh"
    ? `已有新版本 ${version}：請執行 ${UPDATE_COMMAND} 後重啟。`
    : lang === "fr"
      ? `Version ${version} disponible${NBSP}: tapez ${UPDATE_COMMAND}, puis redémarrez.`
      : `Version ${version} is out: type ${UPDATE_COMMAND}, then restart.`;
}

// The foot's two credit lines, a label and a colon each, the link after it
export function builtByLabel(lang: Lang): string {
  return lang === "zh" ? "開發者：" : lang === "fr" ? `Développé par${NBSP}:` : "Built by:";
}
export function forTeamLabel(lang: Lang): string {
  return lang === "zh" ? "瞭解企業版：" : lang === "fr" ? `Découvrez la version entreprise${NBSP}:` : "Discover the business version:";
}

export function blockTitle(kind: "session" | "usage", lang: Lang): string {
  if (kind === "session") return lang === "zh" ? "本次會話" : lang === "fr" ? "Cette session" : "This session";
  return lang === "zh" ? "我的用量" : lang === "fr" ? "Mon usage" : "My usage";
}

// The tiles at the top of the desktop pane: a label over a figure
const TILE_LABELS: Record<string, [string, string, string]> = {
  period: ["Sur la période", "Over the period", "本時間段"],
  change: ["Par rapport à avant", "Against before", "與之前相比"],
  sessions: ["Sessions", "Sessions", "會話數"],
  cost: ["Valeur au prix API", "API-price value", "API 價格價值"],
  car: ["En voiture", "By car", "駕車裡程"],
};
export function tileLabel(kind: string, lang: Lang): string {
  return pick(TILE_LABELS[kind], lang);
}

// "+29 %", "-18 %"
export function changeValue(change: number): string {
  const sign = change > 0 ? "+" : change < 0 ? "-" : "";
  return `${sign}${Math.abs(change)}${NBSP}%`;
}

// "27 616 $", "$27,616", "12,30 $"
export function moneyValue(usd: number, lang: Lang): string {
  return costText(usd, lang).replace(lang === "zh" ? "（按 API 價格）" : lang === "fr" ? " au prix API" : " at API prices", "");
}

// Under the value tile, so it holds whoever pays: a subscription, an API key, extra
// usage, or sessions of several kinds. Which session was billed how is not recorded.
export function apiValueNote(lang: Lang): string {
  return lang === "zh"
    ? `透過 API 計費時，這些用量的費用${NBSP}；Pro、Max 或 Ultra 訂閱可覆蓋全部或部分。`
    : lang === "fr"
      ? `Le prix de cet usage facturé à l'API${NBSP}; un abonnement Pro, Max ou Ultra en couvre tout ou partie.`
      : "What this usage costs billed through the API; a Pro, Max or Ultra subscription covers some or all of it.";
}

// "12,34 $ au prix API", "$12.34 at API prices"
export function costText(usd: number, lang: Lang): string {
  // Whole dollars from a thousand up, grouped: "27 608 $", "$27,608"
  const money =
    usd >= 1000
      ? lang === "fr"
        ? `${thousands(usd, lang)}${NBSP}$`
        : `$${thousands(usd, lang)}`
      : formatUsd(usd, lang);
  return lang === "zh" ? `${money}（按 API 價格）` : lang === "fr" ? `${money} au prix API` : `${money} at API prices`;
}

function thousands(n: number, lang: Lang): string {
  const whole = String(Math.round(n));
  const sep = lang === "fr" ? NBSP : ",";
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

// "≈ 1 680 km en voiture (142 g/km, ADEME 2025)", the reports' and cards' car line
export function equivalenceText(
  grams: number,
  car: { divisor: number; label: string; tag: string },
  lang: Lang,
): string {
  return `≈${NBSP}${thousands(grams / car.divisor, lang)} ${car.label} (${carTag(car.tag)})`;
}

// The car tile's figure, the period's CO2 in the locale's unit: "≈ 1 684 km"
export function carValue(
  grams: number,
  car: { divisor: number; unit: string },
  lang: Lang,
): string {
  const distance = grams / car.divisor;
  // Under a unit, "≈ 0 km" reads as nothing at all
  if (distance < 1) return `<${NBSP}1 ${car.unit}`;
  return `≈${NBSP}${thousands(distance, lang)} ${car.unit}`;
}

// The blocks a person can show or hide in the pane, under the gear

const BLOCK_LABELS: Record<string, [string, string, string]> = {
  compare: ["Comparaison", "Comparison", "對比"],
  cost: ["Coût API", "API cost", "API 費用"],
  equivalence: ["Équivalence", "Equivalence", "等效量"],
  projects: ["Projets", "Projects", "專案"],
  detail: ["Détail", "Detail", "明細"],
};
export function blockLabel(block: string, lang: Lang): string {
  return pick(BLOCK_LABELS[block], lang);
}

// ── The "Détail" block: a period's tokens, energy and CO2 by kind of token ──
const KIND_LABELS: Record<string, [string, string, string]> = {
  input: ["Entrée", "Input", "輸入"],
  cacheWrite: ["Cache écrit", "Cache write", "快取寫入"],
  cacheRead: ["Cache relu", "Cache read", "快取讀取"],
  output: ["Sortie", "Output", "輸出"],
};
export function kindLabel(kind: string, lang: Lang): string {
  return pick(KIND_LABELS[kind], lang);
}

// Above each bar: what it splits
export function detailBarLabel(bar: "tokens" | "co2", lang: Lang): string {
  if (bar === "tokens") return "Tokens";
  return lang === "zh" ? `${UNIT} 與能耗` : lang === "fr" ? `${UNIT} et énergie` : `${UNIT} and energy`;
}

// 820, 12k, 371M, then billions with one decimal: 25,3 Md / 25.3B
export function formatTokens(n: number, lang: Lang): string {
  if (n >= 999.5e6)
    return lang === "fr" ? `${decimal(n / 1e9, 1, lang)}${NBSP}Md` : `${decimal(n / 1e9, 1, lang)}B`;
  const space = lang === "fr" ? NBSP : "";
  if (n >= 999.5e3) return `${Math.round(n / 1e6)}${space}M`;
  if (n >= 1000) return `${Math.round(n / 1e3)}${space}k`;
  return String(Math.round(n));
}

// Wh under a kWh, then kWh (one decimal under 100), then MWh
export function formatWh(wh: number, lang: Lang): string {
  if (wh < 999.5) return `${Math.round(wh)}${NBSP}Wh`;
  const kwh = wh / 1000;
  if (kwh < 99.95) return `${decimal(kwh, 1, lang)}${NBSP}kWh`;
  if (kwh < 999.5) return `${Math.round(kwh)}${NBSP}kWh`;
  return `${decimal(kwh / 1000, 1, lang)}${NBSP}MWh`;
}

// One decimal, "98,4 %", "< 0,1 %" for a share that is there but rounds to nothing,
// "0 %" for none; a space before % in both languages, as the rest of the pane writes it
export function formatShare(share: number, lang: Lang): string {
  if (share <= 0) return `0${NBSP}%`;
  if (share < 0.0005) return `<${NBSP}${decimal(0.1, 1, lang)}${NBSP}%`;
  return `${decimal(share * 100, 1, lang)}${NBSP}%`;
}

// Under a kind's name: "23,8 Md tokens (98,4 %) · 21,6 kWh · 6,2 kgCO₂ (60,9 %)"
export function detailLine(
  part: { tokens: number; tokenShare: number; wh: number; grams: number; gramShare: number },
  lang: Lang,
): string {
  return (
    `${formatTokens(part.tokens, lang)}${lang === "zh" ? " 個 token" : " tokens"} (${formatShare(part.tokenShare, lang)}) · ` +
    `${formatWh(part.wh, lang)} · ${formatGrams(part.grams, lang)} (${formatShare(part.gramShare, lang)})`
  );
}

export function detailTotalLine(
  total: { tokens: number; wh: number; grams: number },
  lang: Lang,
): string {
  return (
    `${lang === "zh" ? "總計" : `Total${lang === "fr" ? NBSP : ""}`}: ${formatTokens(total.tokens, lang)}${lang === "zh" ? " 個 token" : " tokens"} · ` +
    `${formatWh(total.wh, lang)} · ${formatGrams(total.grams, lang)}`
  );
}

// What a hovered part of a bar says: its kind, its figures on that bar, its share
// "Cache relu · 23,9 Md tokens · 98,4 %", "Cache relu · 535 kWh · 153,5 kgCO₂ · 60,9 %"
export function detailHover(
  part: { kind: string; tokens: number; tokenShare: number; wh: number; grams: number; gramShare: number },
  bar: "tokens" | "co2",
  lang: Lang,
): string {
  const name = kindLabel(part.kind, lang);
  return bar === "tokens"
    ? `${name} · ${formatTokens(part.tokens, lang)}${lang === "zh" ? " 個 token" : " tokens"} · ${formatShare(part.tokenShare, lang)}`
    : `${name} · ${formatWh(part.wh, lang)} · ${formatGrams(part.grams, lang)} · ${formatShare(part.gramShare, lang)}`;
}

// The methodology, straight from the detail
export const METHODOLOGY_URL =
  "https://github.com/gwittebolle/claude-carbon/blob/main/METHODOLOGY.md#the-panes-detail-by-kind-of-token";
export function methodologyLabel(lang: Lang): string {
  return lang === "zh" ? "閱讀計算方法" : lang === "fr" ? "Lire la méthodologie" : "Read the methodology";
}

// When some sessions of the period are left out: stored with older factors, or the
// running one before its first answer
export function detailCoverage(n: number, total: number, lang: Lang): string {
  return lang === "zh"
    ? `本時間段的 ${total} 次會話中有 ${n} 次：其餘使用較舊係數記錄。`
    : lang === "fr"
      ? `Sur ${n} des ${total} sessions de la période${NBSP}: les autres ont été enregistrées avec des facteurs plus anciens.`
      : `Over ${n} of the period's ${total} sessions: the others were recorded with older factors.`;
}

// Before the hook has written the tokens by kind: after the next answer
export function detailWaitText(lang: Lang): string {
  return lang === "zh"
    ? "下一次回覆後會顯示明細。"
    : lang === "fr"
      ? "Le détail s'affichera après la prochaine réponse."
      : "The detail shows after the next answer.";
}

export function detailAlt(bar: "tokens" | "co2", lang: Lang): string {
  return lang === "zh"
    ? `${bar === "tokens" ? "Token" : UNIT} 按輸入、快取寫入、快取讀取和輸出的分佈`
    : lang === "fr"
      ? `Répartition ${bar === "tokens" ? "des tokens" : `du ${UNIT}`} entre entrée, cache écrit, cache relu et sortie`
      : `Share of the ${bar === "tokens" ? "tokens" : UNIT} between input, cache write, cache read and output`;
}

export function showLabel(lang: Lang): string {
  return lang === "zh" ? "顯示" : lang === "fr" ? "Afficher" : "Show";
}


// The button that puts /carbon-card in the prompt, for the person to send. The card
// covers the calendar year so far (the one just ended, over the first days of January),
// whatever range the pane shows: the label says which.
export function cardButtonLabel(year: number, lang: Lang): string {
  return lang === "zh" ? `獲取我的 ${year} 年度卡片` : lang === "fr" ? `Obtenir ma carte ${year}` : `Get my ${year} card`;
}

// After the button filled the prompt: what is there and what to do
export function cardReadyText(lang: Lang): string {
  return lang === "zh"
    ? "/carbon-card 已填入輸入框：按 Enter 生成卡片。"
    : lang === "fr"
      ? `/carbon-card est dans le prompt${NBSP}: appuyez sur Entrée pour créer la carte.`
      : "/carbon-card is in the prompt: press Enter to make the card.";
}

// The prompt could not take it (a dialog is open, or no prompt box here)
export function cardFillFailed(lang: Lang): string {
  return lang === "zh"
    ? "輸入框無法接收 /carbon-card：請自行輸入。"
    : lang === "fr"
      ? `Le prompt n'a pas pu recevoir /carbon-card${NBSP}: tapez-le vous-même.`
      : "The prompt could not take /carbon-card: type it yourself.";
}

// When the prompt already holds a draft, the button leaves it alone and says why
export function cardDraftBusy(lang: Lang): string {
  return lang === "zh"
    ? "輸入框裡已有草稿：請清空後再生成卡片。"
    : lang === "fr"
      ? `Le prompt contient déjà un brouillon${NBSP}: videz-le pour obtenir la carte.`
      : "The prompt already holds a draft: clear it to get the card.";
}


function percent(share: number): string {
  const p = Math.round(share * 100);
  return p < 1 ? `<${NBSP}1${NBSP}%` : `${p}${NBSP}%`;
}


// A project as a bar, left-aligned so bars compare whatever the font:
// "███████ 41 % carbonara · 103,5 kgCO₂"
export function projectBarLine(
  project: string,
  grams: number,
  share: number,
  lang: Lang,
): string {
  const name = project === "" ? (lang === "zh" ? "無專案" : lang === "fr" ? "sans projet" : "no project") : project;
  const bar = "█".repeat(Math.max(1, Math.round(share * 16)));
  return `${bar} ${percent(share)} ${name} · ${formatGrams(grams, lang)}`;
}

// The rest after the projects listed
export function otherProjectsLine(count: number, grams: number, share: number, lang: Lang): string {
  const fr = lang === "fr";
  const label = lang === "zh" ? `其餘 ${count} 個專案` : fr
    ? `${count} autre${count > 1 ? "s" : ""} projet${count > 1 ? "s" : ""}`
    : `${count} other project${count > 1 ? "s" : ""}`;
  return `${label} · ${formatGrams(grams, lang)} · ${percent(share)}`;
}

export function mascotAlt(lang: Lang): string {
  return lang === "zh"
    ? "畫素 CO₂ 分子，按本次會話相對你的中位數著色，藍色（低於）至紅色（高於）"
    : lang === "fr"
      ? "Molécule de CO₂ en pixels, colorée selon cette session par rapport à votre médiane, du bleu (en dessous) au rouge (au-dessus)"
      : "Pixel CO₂ molecule, coloured by this session against your median, from blue (below) to red (above)";
}

// The scale under the molecule, read aloud: where this session sits on it
export function scaleAlt(cls: number | null, lang: Lang): string {
  const fr = lang === "fr";
  if (cls === null)
    return fr
      ? "Échelle des couleurs, du bleu (sous votre médiane) au rouge (au-dessus)"
      : "Colour scale, from blue (under your median) to red (over it)";
  return fr
    ? `Échelle des couleurs, du bleu au rouge : cette session est en ${cls + 1}e position sur 8`
    : `Colour scale, from blue to red: this session is ${cls + 1} of 8`;
}

export function stripesAlt(lang: Lang): string {
  return lang === "zh"
    ? "每個時間段一條，最舊的在左側，從藍（低於中位數）到紅（高於）"
    : lang === "fr"
      ? "Une bande par période, la plus ancienne à gauche, du bleu (sous la médiane) au rouge (au-dessus)"
      : "One stripe per period, oldest on the left, from blue (below the median) to red (above)";
}
