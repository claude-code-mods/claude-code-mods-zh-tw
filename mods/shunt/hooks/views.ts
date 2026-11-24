import type { PoolStatus, UsageReport, WindowKey } from './report'
import { WINDOW_KEYS } from './report'

const BAR_WIDTH = 10
const BAR_FULL = '▓'
const BAR_EMPTY = '░'
const DASH = '—'

const DAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'] as const

const pad2 = (value: number) => String(value).padStart(2, '0')

/**
 * The bar for one window's headroom; an unreported window has no bar to draw.
 */
export const barOf = (remaining: number | null): string => {
  if (remaining === null) {
    return ' '.repeat(BAR_WIDTH)
  }

  const filled = Math.round(remaining * BAR_WIDTH)

  return BAR_FULL.repeat(filled) + BAR_EMPTY.repeat(BAR_WIDTH - filled)
}

/**
 * A window's headroom as whole percent, right-aligned; `—` when unreported.
 *
 * Rounds away from the ends so a pool with a sliver left does not read `0%`
 * and one a hair short of full does not read `100%`.
 */
export const percentOf = (remaining: number | null): string => {
  if (remaining === null) {
    return DASH.padStart(4)
  }

  const raw = remaining * 100

  const whole =
    raw > 0 && raw < 1 ? 1 : raw < 100 && raw > 99 ? 99 : Math.round(raw)

  return `${whole}%`.padStart(4)
}

/**
 * When the window's earliest reset lands, in local time: the clock alone when
 * it lands today, the weekday too on any later date, and `due` once it has
 * passed.
 *
 * The cut is the calendar date rather than a 24-hour delta, because a bare
 * clock is only unambiguous on today's date: at 04:13 on Thursday a reset 22
 * hours out is Friday 02:13, and rendering it as `02:13` reads as a time that
 * has already gone by.
 */
export const resetTextOf = (
  resetsAt: number | null,
  nowMs: number,
): string => {
  if (resetsAt === null) {
    return ''
  }

  const atMs = resetsAt * 1000

  if (atMs <= nowMs) {
    return '重置已到期'
  }

  const at = new Date(atMs)
  const clock = `${pad2(at.getHours())}:${pad2(at.getMinutes())}`

  const now = new Date(nowMs)
  const today =
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate()

  return today ? `${clock} 重置` : `${DAYS[at.getDay()]} ${clock} 重置`
}

const windowLabel = (key: WindowKey) => key.padEnd(5)

const poolLines = (pool: PoolStatus, nowMs: number): string[] =>
  WINDOW_KEYS.map(key => {
    const window = pool.windows[key]

    const row =
      `  ${windowLabel(key)} ${barOf(window.remaining)} ` +
      `剩餘 ${percentOf(window.remaining)}`

    const reset = resetTextOf(window.resetsAt, nowMs)

    return reset === '' ? row : `${row}   ${reset}`
  })

const providerLines = (
  providers: UsageReport['providers'],
): string[] => {
  if (providers.length === 0) {
    return []
  }

  const nameWidth = Math.max(...providers.map(([name]) => name.length))

  const statusWidth = Math.max(
    ...providers.map(([, status]) => status.status.length),
  )

  return providers.map(([name, status]) => {
    const cells = WINDOW_KEYS.map(
      key => `${key} ${percentOf(status.windows[key].remaining)}`,
    ).join('  ')

    return `  ${name.padEnd(nameWidth)}  ${status.status.padEnd(statusWidth)}  ${cells}`
  })
}

/**
 * The whole `/shunt:usage` answer: the pool's three windows as bars, then the
 * same headroom per pooled provider, then what the numbers mean.
 *
 * The legend is not decoration — `remaining` is the mean fraction still
 * *usable* across the pool's accounts (up to each account's `max_utilization`
 * hard cap), so a bare `62%` invites exactly the wrong
 * reading ("62% burned"), and it is an aggregate rather than a prediction that
 * the next request is admitted.
 *
 * @param report the parsed `GET /usage` body
 * @param base the gateway the report came from
 * @param nowMs the engine's clock, for the reset times
 */
export function reportText(
  report: UsageReport,
  base: string,
  nowMs: number,
): string {
  const head = `pool ${DASH} ${report.pool.status}   ${base}`

  const providers = providerLines(report.providers)

  const legend =
    `  剩餘餘量，按池中各賬戶取平均；這是共享數值，` +
    `並不保證你的下一次請求一定被受理`

  return [
    head,
    '',
    ...poolLines(report.pool, nowMs),
    ...(providers.length === 0 ? [] : ['', ...providers]),
    '',
    legend,
  ].join('\n')
}
