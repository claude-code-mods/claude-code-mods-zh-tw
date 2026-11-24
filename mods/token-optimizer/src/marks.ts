// The five marks, their hover cards and the detail row as plain
// data the drawing layer maps to elements. Pure.
import type { CacheView, Limit, Snapshot } from './contracts.ts'
import type { IconName } from './icons.ts'
import { ago, clock, duration, minutes, gradeOf, relative, renewal, tokens, type FormatOptions } from './format.ts'
import { KEEP_WARM_MARGIN_MS } from './clock.ts'
import { LIMIT_WARN, QUALITY_FLOOR, loseRun, type Action, type Run, type Sentence, type Tone } from './ladder.ts'
import type { BandSize } from './size.ts'

const KEEP_WARM_MARGIN_S = KEEP_WARM_MARGIN_MS / 1000

export type MarkId = 'quality' | 'context' | 'cache' | 'fiveHour' | 'week'
/** 'none' means no data: the drawing layer shows the mark uncoloured. */
export type MarkTone = Tone | 'none'

export type Mark = {
  id: MarkId
  icon: IconName
  /** The figure on the bar, "--" when unavailable. */
  value: string
  label: string
  tone: MarkTone
  /** 0..100 for ring marks (context, cache, limits). */
  ringPercent?: number
  /** The grade letter on the quality mark. */
  badge?: string
  /** Alt text naming the state. */
  alt: string
}

/** A hover card: title, then "What it means:" (`means`) and "What to do:" (`todo`), then action buttons. */
export type Card = { id: MarkId; title: string; means: Run[]; todo: Run[]; actions: Action[] }

export type Fact = { icon: IconName; runs: Run[] }

export type SavingsBlock = {
  state: 'ready' | 'loading' | 'unavailable'
  sessionTokens: number | null
  last30Tokens: number | null
  sessionText: string
  last30Text: string
  /** Raw daily figures, oldest first, today last; empty when unavailable. */
  daily: number[]
  /** Bar heights in percent of the tallest day, at least 8 so a quiet day still shows. */
  bars: number[]
  /** One short reason when unavailable. */
  reason: string | null
}

export type Row = { facts: Fact[]; savings: SavingsBlock }

const clamp = (p: number) => Math.max(0, Math.min(100, Math.round(p)))
const plain = (text: string): Run => ({ text })
const strong = (text: string): Run => ({ text, strong: true })

export function qualityTone(score: number): Tone {
  return score >= 80 ? 'good' : score >= QUALITY_FLOOR ? 'caution' : 'bad'
}
export function fillTone(p: number): Tone {
  return p >= 80 ? 'bad' : p >= 60 ? 'caution' : 'good'
}
export function limitTone(p: number): Tone {
  return p >= LIMIT_WARN ? 'bad' : p >= 75 ? 'caution' : 'good'
}

function estimateNote(c: CacheView): string {
  return c.measured ? '估算值' : '估算值，壽命尚未測量'
}

function cacheMark(c: CacheView): Mark {
  const base = { id: 'cache' as const, label: '快取' }
  const est = estimateNote(c)
  switch (c.state) {
    case 'warm':
    case 'warning': {
      const left = c.secondsLeft ?? 0
      const tone: Tone = c.state === 'warm' ? 'good' : 'caution'
      const word = c.state === 'warm' ? '溫熱' : '即將失效'
      return { ...base, icon: 'hourglass', value: minutes(left), tone, ringPercent: clamp((left / c.lifetime) * 100), alt: `快取${word}，剩餘 ${minutes(left)}，${est}` }
    }
    case 'cold':
      return { ...base, icon: 'cold', value: '冷', tone: 'cold', ringPercent: 0, alt: `快取已冷，${est}` }
    case 'refreshing':
      return { ...base, icon: 'hourglass', value: minutes(c.lifetime), tone: 'good', ringPercent: 100, alt: '當前回合正在重新整理快取' }
    case 'warming':
      return {
        ...base,
        icon: 'hourglass',
        value: c.secondsLeft != null ? minutes(c.secondsLeft) : '--',
        tone: 'good',
        ringPercent: c.secondsLeft != null ? clamp((c.secondsLeft / c.lifetime) * 100) : 0,
        alt: '快取預熱中',
      }
    default:
      return { ...base, icon: 'hourglass', value: '--', tone: 'none', ringPercent: 0, alt: '快取在首次回覆後開始計時' }
  }
}

function limitMark(id: 'fiveHour' | 'week', limit: Limit, now: number, opts: FormatOptions): Mark {
  const p = Math.round(limit.percentUsed)
  const name = id === 'fiveHour' ? '5 小時' : '每週'
  const when = renewal(limit.resetsAt, now, opts)
  return {
    id,
    icon: 'clock',
    value: `${p}%`,
    label: id === 'fiveHour' ? '5 小時' : '每週',
    tone: limitTone(limit.percentUsed),
    ringPercent: clamp(limit.percentUsed),
    alt: `${name}用量已使用 ${p}%` + (when ? `，${when}續期` : ''),
  }
}

/** The marks under the sentence, in order. Limit marks are omitted when the limit is null. */
export function marks(s: Snapshot, opts: FormatOptions = {}): Mark[] {
  const q = s.quality
  const quality: Mark = q
    ? {
        id: 'quality',
        icon: q.score < QUALITY_FLOOR ? 'slip' : 'check',
        value: String(Math.round(q.score)),
        badge: gradeOf(q.score),
        label: '質量',
        tone: qualityTone(q.score),
        alt: `質量等級 ${gradeOf(q.score)}，得分 ${Math.round(q.score)}/100`,
      }
    : { id: 'quality', icon: 'check', value: '--', badge: '--', label: '質量', tone: 'none', alt: '質量尚未測量' }

  const p = s.contextPercent
  const context: Mark =
    p != null
      ? { id: 'context', icon: 'gauge', value: `${Math.round(p)}%`, label: '上下文', tone: fillTone(p), ringPercent: clamp(p), alt: `上下文已佔用 ${Math.round(p)}%` }
      : { id: 'context', icon: 'gauge', value: '--', label: '上下文', tone: 'none', ringPercent: 0, alt: '尚未報告上下文佔用量' }

  const out = [quality, context, cacheMark(s.cache)]
  if (s.fiveHour) out.push(limitMark('fiveHour', s.fiveHour, s.now, opts))
  if (s.week) out.push(limitMark('week', s.week, s.now, opts))
  return out
}

function cacheCard(c: CacheView): Card {
  const est = `計時為${estimateNote(c)}。`
  // Offered only while a press can still run: not in the last seconds before the cache drops.
  const warm: Action[] = c.measured && (c.secondsLeft ?? 0) > KEEP_WARM_MARGIN_S ? [{ id: 'warm', label: '保持溫熱' }] : []
  const stake = c.tokensAtStake
  const left = minutes(c.secondsLeft ?? 0)
  switch (c.state) {
    case 'warm':
      return {
        id: 'cache',
        title: `溫熱還可維持 ${left}`,
        means: [plain(`訊息將以十分之一的價格重新讀取${stake != null ? `${tokens(stake)} 個 token` : '上下文'}。${est}`)],
        todo: [plain(warm.length ? `請在 ${left} 內回覆，或點選“保持溫熱”後再休息。` : `請在 ${left} 內回覆以保持溫熱。`)],
        actions: warm,
      }
    case 'warning':
      return {
        id: 'cache',
        title: c.secondsLeft != null ? `${left}後失效` : '即將失效',
        means: [
          ...(stake != null ? [plain('屆時下一條訊息將按全價重新讀取 '), loseRun(stake), plain(`。${est}`)] : [plain(`屆時下一條訊息將按全價重新讀取整個上下文。${est}`)]),
        ],
        todo: [plain(warm.length ? '立即點選“保持溫熱”。' : '立即回覆；失效後先用“先清理”讓下一次讀取更便宜。')],
        actions: warm,
      }
    case 'cold':
      return {
        id: 'cache',
        title: '已冷',
        means: [
          ...(stake != null ? [plain('下一條訊息將按全價重新讀取 '), loseRun(stake), plain('。')] : [plain('下一條訊息將按全價重新讀取整個上下文。')]),
        ],
        todo: [plain('“先清理”會重新讀取一次，讓後續訊息更便宜。')],
        actions: [{ id: 'clean-first', label: '先清理' }],
      }
    case 'refreshing':
      return { id: 'cache', title: '重新整理中', means: [plain('本回合的每次請求都會保持快取溫熱。')], todo: [plain('無需操作。')], actions: [] }
    case 'warming':
      return { id: 'cache', title: '保持溫熱中', means: [plain('正在執行一行式預熱。')], todo: [plain('無需操作。')], actions: [] }
    default:
      return { id: 'cache', title: '尚未開始', means: [plain('快取在首次回覆後開始計時。')], todo: [plain('無需操作。')], actions: [] }
  }
}

function limitCard(id: 'fiveHour' | 'week', limit: Limit, now: number, opts: FormatOptions): Card {
  const p = Math.round(limit.percentUsed)
  const name = id === 'fiveHour' ? '5 小時' : '每週'
  const when = renewal(limit.resetsAt, now, opts)
  const at = limit.resetsAt ? Date.parse(limit.resetsAt) : NaN
  if (!when || !Number.isFinite(at)) {
    return { id, title: `${name}用量已使用 ${p}%`, means: [plain('未報告續期時間。')], todo: [plain('無需操作。')], actions: [] }
  }
  return {
    id,
    title: `${when}續期`,
    means: [plain(`${name}用量已使用 ${p}%；${when}重置，${relative(at, now)}。`)],
    todo: [plain(p >= LIMIT_WARN ? '“清理”可更早釋放上下文。' : '無需操作。')],
    actions: [],
  }
}

/** Hover card bodies, one per mark, same order and omissions as `marks`. */
export function cards(s: Snapshot, opts: FormatOptions = {}): Card[] {
  const q = s.quality
  const qualityActions: Action[] = [
    { id: 'clean', label: '清理' },
    { id: 'fresh', label: s.freshArmed ? '再次點選以清空' : '重新開始' },
  ]
  const quality: Card = q
    ? {
        id: 'quality',
        title: `質量 ${gradeOf(q.score)} ${Math.round(q.score)}`,
        means: [plain(`Claude 工作上下文的整潔程度，範圍 0 到 100。${q.drag ? ` 最大拖累：${q.drag}。` : ' 沒有拖累因素。'}`)],
        todo: [plain(q.score < QUALITY_FLOOR ? '“清理”會壓縮並保留你的方向；“重新開始”會先儲存檢查點。' : '無需操作。')],
        actions: qualityActions,
      }
    : { id: 'quality', title: '質量 --', means: [plain('首次工具呼叫後顯示得分。')], todo: [plain('無需操作。')], actions: qualityActions }

  // With a smaller auto-compact ceiling the ring measures distance to compaction, while
  // quality follows the model window, so the card names both and makes no quality claim.
  const model = s.contextModelWindow
  const context: Card =
    s.contextTokens != null && s.contextWindow != null
      ? model != null && model > s.contextWindow
        ? {
            id: 'context',
            title: `自動壓縮前 ${tokens(s.contextTokens)} / ${tokens(s.contextWindow)}`,
            means: [plain(`佔 ${tokens(model)} 模型視窗的 ${Math.round((s.contextTokens / model) * 100)}%。`)],
            todo: [plain('接近滿載時自動壓縮可能丟失細節；“清理”會更早壓縮並保留你的方向。')],
            actions: [],
          }
        : {
            id: 'context',
            title: `${tokens(s.contextTokens)} / ${tokens(s.contextWindow)} token`,
            means: [plain('佔用不到一半時質量最佳。')],
            todo: [plain('超過 80% 時，“清理”會壓縮並保留你的方向。')],
            actions: [],
          }
      : { id: 'context', title: '上下文 --', means: [plain('首次回覆後顯示佔用量。')], todo: [plain('無需操作。')], actions: [] }

  const out = [quality, context, cacheCard(s.cache)]
  if (s.fiveHour) out.push(limitCard('fiveHour', s.fiveHour, s.now, opts))
  if (s.week) out.push(limitCard('week', s.week, s.now, opts))
  return out
}

export type SavingsPill = { text: string; url: string | null }

/**
 * Sentence plus savings text that must fit beside "Token Optimizer" on the
 * title row; past this the pill drops to `display.short`.
 */
const PILL_FIT_CELLS = 100

/**
 * The green savings chip on the title row. It only joins a calm line: a good
 * tone with no action button always wins, and without `savings_headline`
 * (older installs, nothing worth a number) there is no pill at all.
 */
export function savingsPill(s: Snapshot, say: Sentence, size: BandSize): SavingsPill | null {
  if (say.tone !== 'good' || say.action !== null) return null
  const display = s.savingsHeadline?.display
  if (!display) return null
  const sentenceCells = say.runs.reduce((n, r) => n + r.text.length, 0)
  const long = display.long !== '' && sentenceCells + display.long.length <= PILL_FIT_CELLS ? display.long : ''
  const text = size === 'full' ? long || display.short || display.long : display.short || display.long
  return text === '' ? null : { text, url: display.url }
}

function savingsBlock(s: Snapshot): SavingsBlock {
  const sv = s.savings
  if (!sv) {
    return {
      state: s.savingsLoading ? 'loading' : 'unavailable',
      sessionTokens: null,
      last30Tokens: null,
      sessionText: '--',
      last30Text: '--',
      daily: [],
      bars: [],
      reason: s.savingsLoading ? null : 'Token Optimizer 測量後即顯示節省量。',
    }
  }
  const top = Math.max(1, ...sv.daily)
  return {
    state: s.savingsLoading ? 'loading' : 'ready',
    sessionTokens: sv.sessionTokens,
    last30Tokens: sv.last30Tokens,
    sessionText: sv.sessionTokens != null ? tokens(sv.sessionTokens) : '--',
    last30Text: sv.last30Tokens != null ? tokens(sv.last30Tokens) : '--',
    daily: sv.daily,
    bars: sv.daily.map((v) => Math.max(8, Math.round((Math.max(0, v) / top) * 100))),
    reason: null,
  }
}

/**
 * The detail row under Clawd: only what the bar does not show.
 * `s.now` is epoch milliseconds; the quality cache's epochs are seconds.
 */
/** Longer branch names are cut so the unfolded row stays on one line. */
const BRANCH_MAX = 20

export function row(s: Snapshot, _opts: FormatOptions = {}): Row {
  const q = s.quality
  const facts: Fact[] = []
  // One line in the band: every fact in its shortest plain form.
  if (s.branch) facts.push({ icon: 'branch', runs: [strong(s.branch.length > BRANCH_MAX ? `${s.branch.slice(0, BRANCH_MAX - 1)}…` : s.branch)] })
  // The band's own sightings fill in until Token Optimizer's quality file exists (a new session).
  const startS = q?.sessionStartEpoch ?? (s.startedAtMs != null ? s.startedAtMs / 1000 : null)
  if (startS != null) facts.push({ icon: 'clock', runs: [strong(duration(s.now / 1000 - startS))] })
  const tools = Math.max(q?.toolCalls ?? 0, s.toolCallsSeen ?? 0)
  if (q?.toolCalls != null || (s.toolCallsSeen ?? 0) > 0) facts.push({ icon: 'tool', runs: [strong(String(tools)), plain(tools === 1 ? ' 次工具呼叫' : ' 次工具呼叫')] })
  const compacted = Math.max(q?.compactions ?? 0, s.compactionsSeen ?? 0)
  if (compacted > 0) facts.push({ icon: 'compact', runs: [strong(`${compacted}×`), plain(' 已壓縮')] })
  facts.push({
    icon: 'bookmark',
    runs: (s.checkpointEpoch ?? q?.checkpointEpoch) != null
      ? [plain('檢查點 '), strong(ago((s.checkpointEpoch ?? q!.checkpointEpoch!) * 1000, s.now))]
      : s.earlierCheckpoint
        ? [plain('更早的檢查點 '), strong(ago(s.earlierCheckpoint.epoch * 1000, s.now))]
        : [plain('尚無檢查點')],
  })
  return { facts, savings: savingsBlock(s) }
}
