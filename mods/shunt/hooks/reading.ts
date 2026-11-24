import type { Endpoint } from './endpoint'
import { NOT_ENABLED_TEXT, NO_POOL_TEXT, REFUSED_TEXT } from './names'
import type { UsageReport } from './report'
import { WINDOW_KEYS, parseReport } from './report'

/**
 * What one `GET /usage` round trip came to: the report, or the reason there
 * is none.
 *
 * `problem` is the full sentence `/shunt:usage` prints. `brief` is the few
 * words the band above the prompt flags instead, or `null` where the session
 * is not on a shunt gateway that serves `GET /usage`: no gateway is set, it
 * answers 404 or with a body that is not a pool report (another proxy), or it
 * pools no provider. Those are set-ups, not faults, and the band shows the
 * session's own rate limits for them rather than nagging.
 */
export type Reading =
  | { report: UsageReport; base: string }
  | { problem: string; brief: string | null }

/** The band's brief for a 401 or 403: the gateway refused the credential. */
export const CREDENTIAL_REFUSED = '憑據被拒絕'

/** The band's brief when shunt's own `apiKeyHelper` could not give a token. */
export const HELPER_FAILED = '閘道器登入不可用'

/** The subset of the engine's `HttpResponse` a reading needs. */
export type Response = { status: number; ok: boolean; text: string }

/**
 * An error's message, less the `shunt: ` the engine stamps on its own — the
 * transcript line already carries the plugin's name, so keeping it would read
 * `shunt: ... — shunt: ...`.
 */
const messageOf = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).replace(
    /^shunt: /,
    '',
  )

/**
 * The first line of a body, clipped, for an error the mod has no words of its
 * own for — enough to recognize the gateway's own message without pasting a
 * page of HTML into the transcript.
 */
const firstLineOf = (text: string): string => {
  const line = text.split('\n', 1)[0]?.trim() ?? ''

  return line.length > 200 ? `${line.slice(0, 200)}…` : line
}

/**
 * The reading for shunt's own `apiKeyHelper` (`shunt gateway token`) failing:
 * it exited non-zero, printed nothing, or could not be started. The session
 * logs in through that helper, so this is a fault on shunt — flagged rather
 * than hidden behind the session's own limits.
 *
 * @param cause the finished run, or what `$.process.run` rejected with
 */
export function helperFailedOf(
  cause:
    | { exitCode: number; stdout: string; stderr: string }
    | { error: unknown },
): Reading {
  const stderr = 'error' in cause ? '' : firstLineOf(cause.stderr)

  const detail =
    'error' in cause
      ? messageOf(cause.error)
      : stderr !== ''
        ? stderr
        : cause.exitCode === 0
          ? '它沒有輸出任何內容'
          : `它以退出碼 ${cause.exitCode} 退出`

  return {
    problem:
      'apiKeyHelper 是 shunt gateway token，但執行失敗 ' +
      `${'—'} ${detail}。請執行 shunt gateway login 重新登入。`,
    brief: HELPER_FAILED,
  }
}

/**
 * The reading for a request that never got an answer.
 *
 * @param endpoint where it was sent
 * @param error what `$.http.fetch` rejected with
 */
export function unreachableOf(endpoint: Endpoint, error: unknown): Reading {
  return {
    problem:
      `無法訪問閘道器 ${endpoint.base} ` +
      `${'—'} ${messageOf(error)}`,
    brief: '閘道器不可達',
  }
}

/**
 * Reads the gateway's answer to `GET /usage`.
 *
 * @param endpoint where it was sent
 * @param response the status and body the gateway answered with
 */
export function readingOf(endpoint: Endpoint, response: Response): Reading {
  if (response.status === 404) {
    return { problem: NOT_ENABLED_TEXT, brief: null }
  }

  if (response.status === 401 || response.status === 403) {
    return { problem: REFUSED_TEXT, brief: CREDENTIAL_REFUSED }
  }

  if (!response.ok) {
    const detail = firstLineOf(response.text)

    return {
      problem:
        `閘道器對 GET /usage 返回了 ${response.status}` +
        `${detail === '' ? '' : ` ${'—'} ${detail}`}`,
      brief: `GET /usage 返回 ${response.status}`,
    }
  }

  const parsed = parseReport(response.text)

  if ('problem' in parsed) {
    return { problem: parsed.problem, brief: null }
  }

  const { report } = parsed

  const isSilent =
    report.providers.length === 0 &&
    WINDOW_KEYS.every(key => report.pool.windows[key].remaining === null)

  if (isSilent) {
    return { problem: NO_POOL_TEXT, brief: null }
  }

  return { report, base: endpoint.base }
}
