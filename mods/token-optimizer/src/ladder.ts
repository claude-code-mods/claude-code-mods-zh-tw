// The sentence ladder: the single most urgent thing to say, and
// at most one button. Pure.
import type { Limit, Mood, Snapshot } from './contracts.ts'
import type { IconName } from './icons.ts'
import { DASHBOARD_OPENING } from './actions.ts'
import { clock, gradeOf, renewalPhrase, tokens, type FormatOptions } from './format.ts'

export type Tone = 'good' | 'caution' | 'bad' | 'cold'

/** A run of text. Text is full ink; only `lose` (bold red) carries colour. `strong` is bold ink. */
export type Run = { text: string; lose?: true; strong?: true }

export type ActionId = 'clean' | 'clean-first' | 'fresh' | 'warm'
export type Action = { id: ActionId; label: string }

export type Sentence = { icon: IconName; tone: Tone; runs: Run[]; action: Action | null }

/** Quality below grade B (score under 70) is worth a sentence. */
export const QUALITY_FLOOR = 70
export const LIMIT_WARN = 90

const say = (icon: IconName, tone: Tone, runs: Run[], action: Action | null = null): Sentence => ({ icon, tone, runs, action })
const plain = (text: string): Run => ({ text })

/** The tokens the next message would re-read, as the one bold red run. */
export function loseRun(n: number): Run {
  return { text: `${tokens(n)} 個 token`, lose: true }
}

function renews(limit: Limit, now: number, opts: FormatOptions): string {
  const when = renewalPhrase(limit.resetsAt, now, opts)
  return when ? ` ${when}續期。` : ''
}

function limitSentence(name: string, limit: Limit, now: number, opts: FormatOptions): Sentence {
  const head = limit.percentUsed >= 100 ? `${name}用量已達上限。` : `${name}用量已使用 ${Math.round(limit.percentUsed)}%。`
  return say('gauge', 'bad', [plain(head + renews(limit, now, opts))])
}

export function sentence(s: Snapshot, opts: FormatOptions = {}): Sentence {
  // What the band is doing right now leads, with no button.
  if (s.busy === 'clean') return say('compact', 'good', [plain('正在清理。')])
  if (s.busy === 'fresh-capture') return say('bookmark', 'good', [plain('正在儲存檢查點。')])
  if (s.busy === 'fresh-clear') return say('bookmark', 'good', [plain('正在清空。')])
  if (s.busy === 'dashboard') return say('gauge', 'good', [plain(DASHBOARD_OPENING)])
  if (s.busy === 'warming') return say('hourglass', 'good', [plain('正在保持快取溫熱。')])
  if (s.freshArmed) {
    return say('bookmark', 'caution', [plain('“重新開始”會先儲存檢查點，再清空當前對話。')], {
      id: 'fresh',
      label: '再次點選以清空',
    })
  }
  if (s.handoffPending) return say('bookmark', 'good', [plain('檢查點已就緒，它將加入你的第一條訊息。')])

  // The ladder, first match wins. Null limits (API users) skip their rules.
  const five = s.fiveHour
  const week = s.week
  if (five && five.percentUsed >= 100) return limitSentence('5 小時', five, s.now, opts)
  if (week && week.percentUsed >= 100) return limitSentence('每週', week, s.now, opts)
  if (five && five.percentUsed >= LIMIT_WARN) return limitSentence('5 小時', five, s.now, opts)
  if (week && week.percentUsed >= LIMIT_WARN) return limitSentence('每週', week, s.now, opts)

  const q = s.quality
  // Recovery thresholds remain shadow-only, including older cached flags.
  if (q && q.score < QUALITY_FLOOR) {
    return say('slip', 'bad', [plain(`質量下滑至 ${gradeOf(q.score)} 級。`)], { id: 'clean', label: '清理' })
  }

  // Cache rules hold still while a turn runs: every request refreshes the cache.
  if (!s.working) {
    const c = s.cache
    if (c.state === 'cold') {
      const runs: Run[] =
        c.tokensAtStake != null
          ? [plain('快取已冷。下一條訊息將重新讀取 '), loseRun(c.tokensAtStake), plain('，按全價計費。')]
          : [plain('快取已冷。下一條訊息將按全價重新讀取整個上下文。')]
      runs.push(plain(' 先清理可讓後續訊息更便宜。'))
      return say('cold', 'cold', runs, { id: 'clean-first', label: '先清理' })
    }
    if (c.state === 'warning') {
      const head = c.secondsLeft != null ? `快取將在 ${clock(c.secondsLeft)} 後失效。` : '快取即將失效。'
      const runs: Run[] =
        c.tokensAtStake != null
          ? [plain(`${head}下一條訊息將重新讀取 `), loseRun(c.tokensAtStake), plain('。')]
          : [plain(`${head}下一條訊息將重新讀取整個上下文。`)]
      // Keep warm only on a measured lifetime.
      return say('hourglass', 'caution', runs, c.measured ? { id: 'warm', label: '保持溫熱' } : null)
    }
  }

  const observing = q && q.compactions > 0 ? `壓縮次數：${q.compactions}（持續觀察）。` : '一切正常。'
  return say('check', 'good', [plain(s.note ?? observing)])
}

/** How healthy the session looks, for Clawd's face. */
export function moodOf(s: Snapshot): Mood {
  const limits = [s.fiveHour, s.week].filter((l): l is Limit => l !== null)
  const q = s.quality
  if (limits.some((l) => l.percentUsed >= LIMIT_WARN)) return 'panic'
  if (q && q.score < QUALITY_FLOOR) return 'worried'
  if (!s.working && (s.cache.state === 'cold' || s.cache.state === 'warning')) return 'worried'
  return 'calm'
}
