// ABOUTME: Words for a council run outside the pane: the finish notice, the wake prompt, the reopen reply
// ABOUTME: Pure functions over the run's provider states

import { bar, BAND_CELLS } from './bar'
import { ANSWERED_STATES, count, ENDED_STATES, type ProviderStatus } from './status'

type RunProgress = { providers: ProviderStatus[]; isDone: boolean }

export function finishNotice({ providers }: RunProgress, jobId = ''): string {
  const errors = count(providers, 'error')
  const cancelled = count(providers, 'cancelled')
  // The band draws the COUNCIL label ahead of this, so the text does not repeat the name.
  const subject = jobId ? `任務 ${jobId} 已完成` : '已完成'
  const answered = `${providers.length} 個席位中 ${count(providers, ...ANSWERED_STATES)} 個已回答`
  return `${subject}: ${answered}${errors > 0 ? `，${errors} 個錯誤` : ''}${cancelled > 0 ? `，${cancelled} 個已取消` : ''}`
}


// An m:ss clock, h:mm:ss past an hour. Args: when the run started, now.
function runClock(startedMs: number, nowMs: number): string {
  const secs = Math.max(0, Math.floor((nowMs - startedMs) / 1000))
  const hours = Math.floor(secs / 3600)
  const mins = Math.floor((secs % 3600) / 60)
  const ss = String(secs % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(mins).padStart(2, '0')}:${ss}` : `${mins}:${ss}`
}

// The band above the prompt while a run is live: a bar sweeping on the frame,
// an m:ss clock, and how many providers finished (an error or a cancel
// included) with the latest event after it. `startedAtMs` is when the pane
// picked the run up; before that there is no clock.
export function progressBand(
  { providers, isDone, latest }: RunProgress & { latest?: string },
  startedAtMs: number | undefined,
  nowMs: number,
  frame: number,
): { bar: string; clock?: string; event: string } | undefined {
  if (isDone || providers.length === 0) return undefined
  const finished = count(providers, ...ENDED_STATES)
  return {
    bar: bar({ kind: 'sweep', frame }, BAND_CELLS),
    ...(startedAtMs === undefined ? {} : { clock: runClock(startedAtMs, nowMs) }),
    event: `${providers.length} 個席位中 ${finished} 個完成${latest ? ` \u00b7 ${latest}` : ''}`,
  }
}

// A run whose process died without writing .done: what the band says instead.
export function abandonedNotice({ providers }: RunProgress, jobId = ''): string {
  const subject = jobId ? `任務 ${jobId} 已停止` : '已停止'
  return `${subject}（在完成之前）：${providers.length} 個席位中 ${count(providers, ...ANSWERED_STATES)} 個已回答`
}

// The pid a run left in its watch dir, fit to hand to kill -0: digits, not zero.
export function runPid(text: string): string | undefined {
  const pid = text.trim()
  return /^[1-9]\d*$/.test(pid) ? pid : undefined
}

export function wakePrompt(jobId: string): string | undefined {
  if (!jobId) return undefined
  return `後臺議事廳任務 ${jobId} 已完成。請用 /claude-council:result ${jobId} 獲取結果並總結。`
}

export function reopenReply(hasRun: boolean): string {
  return hasRun
    ? '議事廳面板已重新開啟，顯示上一次執行。'
    : '本會話尚無議事廳執行。請透過 /claude-council:ask 啟動一次。'
}

export type FinishNotice = { text: string; untilMs: number; isFailure?: boolean }

export const FINISH_NOTICE_MS = 20_000

export function noticeIsLive(notice: FinishNotice | undefined, nowMs: number): boolean {
  return notice !== undefined && nowMs < notice.untilMs
}

export type JobOutcome = 'completed' | 'failed' | 'running'

// Reads a job record as run-council.sh --result does: completed can be
// fetched, queued and running cannot yet, anything else never will. A record
// cut off mid-write is read again on the next poll; one that is gone or is
// not a record is over.
export function jobOutcome(record: string): JobOutcome {
  if (!record.trim()) return 'failed'
  let status: unknown
  try {
    status = (JSON.parse(record) as { status?: unknown }).status
  } catch {
    return 'running'
  }
  if (status === 'completed') return 'completed'
  return status === 'queued' || status === 'running' ? 'running' : 'failed'
}
