// Pure formatting for the band: clocks, token counts, relative and local times,
// grades. No I/O and nothing from 'claude-code'.

/** Injectable zone and locale so tests do not depend on the machine's clock settings; hourCycle forces a 12- or 24-hour clock. */
export type FormatOptions = { timeZone?: string; locale?: string; hourCycle?: 'h12' | 'h23' }

const MINUTE = 60_000
const DAY_MIN = 24 * 60

/** The note after refreshes failed: "Last updated 3 days ago. Will try again later." Retries back off up to ten minutes, so it promises no exact time. */
export function savingsRetryNote(failed: boolean, computedAt: number | null, nowMs: number): string | null {
  if (!failed || computedAt === null) return null
  return `上次更新於${ago(computedAt * 1000, nowMs)}。稍後將重試。`
}

/** Seconds as m:ss, clamped to 0:00..60:00 (the longest cache lifetime is an hour). */
export function clock(sec: number): string {
  const s = Math.min(3600, Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0)))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Minutes left as 52m; a countdown that only needs to move once a minute. */
export function minutes(sec: number): string {
  const s = Math.min(3600, Math.max(0, Number.isFinite(sec) ? sec : 0))
  return `${Math.ceil(s / 60)}m`
}

/** Token counts as 940, 340k, 1.2M, 50M. */
export function tokens(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '--'
  if (n < 1000) return String(Math.round(n))
  if (n < 999_500) return `${Math.round(n / 1000)}k`
  const scale = n < 999_500_000 ? { d: 1e6, u: 'M' } : { d: 1e9, u: 'B' }
  const v = n / scale.d
  const text = v < 9.95 ? v.toFixed(1).replace(/\.0$/, '') : String(Math.round(v))
  return text + scale.u
}

/** Time until `targetMs` from `nowMs`: "in 48 minutes", "in 2h 14m", "in 6 days". Past targets read as `ago`. */
export function relative(targetMs: number, nowMs: number): string {
  const diff = targetMs - nowMs
  if (diff < 0) return ago(targetMs, nowMs)
  const mins = Math.round(diff / MINUTE)
  if (mins < 1) return '不到 1 分鐘後'
  if (mins < 60) return mins === 1 ? '1 分鐘後' : `${mins} 分鐘後`
  if (mins < DAY_MIN) {
    const m = mins % 60
    return m === 0 ? `${Math.floor(mins / 60)} 小時後` : `${Math.floor(mins / 60)} 小時 ${String(m).padStart(2, '0')} 分鐘後`
  }
  const days = Math.floor(mins / DAY_MIN)
  if (days < 2) {
    const h = Math.floor((mins % DAY_MIN) / 60)
    return h === 0 ? '1 天后' : `1 天 ${h} 小時後`
  }
  return `${days} 天后`
}

/** Time since `thenMs`: "just now", "3 min ago", "2h 5m ago", "3 days ago". */
export function ago(thenMs: number, nowMs: number): string {
  const mins = Math.floor(Math.max(0, nowMs - thenMs) / MINUTE)
  if (mins < 1) return '剛剛'
  if (mins < 60) return `${mins} 分鐘前`
  if (mins < DAY_MIN) {
    const m = mins % 60
    return m === 0 ? `${Math.floor(mins / 60)} 小時前` : `${Math.floor(mins / 60)} 小時 ${m} 分鐘前`
  }
  const days = Math.floor(mins / DAY_MIN)
  return days === 1 ? '1 天前' : `${days} 天前`
}

/** A span in seconds: "48m", "1h 5m", "under 1m". */
export function duration(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  if (s < 60) return '不到 1 分鐘'
  const mins = Math.floor(s / 60)
  if (mins < 60) return `${mins} 分鐘`
  return `${Math.floor(mins / 60)} 小時 ${mins % 60} 分鐘`
}

function clean(text: string): string {
  // Newer ICU puts a narrow no-break space before AM/PM.
  return text.replace(/[  ]/g, ' ')
}

function dayNumber(ms: number, timeZone: string | undefined): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(ms)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day')) / 86_400_000
}

/** Local renewal time from an ISO reset: "today at 3:20 PM", "tomorrow at 9:00 AM", "Thursday, Oct 8 at 9:00 AM". Null when unparseable. */
export function renewal(iso: string | null, nowMs: number, opts: FormatOptions = {}): string | null {
  if (!iso) return null
  const at = Date.parse(iso)
  if (!Number.isFinite(at)) return null
  const { timeZone, locale, hourCycle } = opts
  const time = clean(new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit', ...(hourCycle ? { hourCycle } : {}) }).format(at))
  const diff = dayNumber(at, timeZone) - dayNumber(nowMs, timeZone)
  if (diff === 0) return `今天 ${time}`
  if (diff === 1) return `明天 ${time}`
  const weekday = new Intl.DateTimeFormat(locale, { timeZone, weekday: 'long' }).format(at)
  const month = new Intl.DateTimeFormat(locale, { timeZone, month: 'short' }).format(at)
  const day = new Intl.DateTimeFormat(locale, { timeZone, day: 'numeric' }).format(at)
  return `${weekday}，${month} ${day}日 ${time}`
}

/** Renewal for use after "Renews": "at 3:20 PM" today, otherwise as `renewal`. */
export function renewalPhrase(iso: string | null, nowMs: number, opts: FormatOptions = {}): string | null {
  const r = renewal(iso, nowMs, opts)
  return r && r.startsWith('今天 ') ? r.slice('今天 '.length) : r
}

/** Letter grade with the same boundaries as score_to_grade in measure.py. */
export function gradeOf(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}
