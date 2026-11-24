// `/agent-guard` and its arguments. The command runs without a model turn and
// the model cannot run it, and the adapter refuses an override another plugin
// runs, so an override is always the user's. The model does read the
// command's reply with its next request.

import { SIMULATED, type SimulatedRule } from './simulate.ts'
import { MAIN, type Scope, type SessionState, loopOf } from './state.ts'
import { duration, sentence, shortClock } from './text.ts'
import { USAGE, scopeName } from './status.ts'

export type Command =
  | { action: 'status' }
  | { action: 'allow'; scope: Scope; minutes: number }
  | { action: 'resume' }
  | { action: 'report'; days: number }
  | { action: 'simulate'; rule: SimulatedRule }
  | { action: 'help'; error?: string }

export const DEFAULT_ALLOW_MINUTES = 10
const MAX_ALLOW_MINUTES = 8 * 60
const DEFAULT_REPORT_DAYS = 7
const MAX_REPORT_DAYS = 3650

export function parseCommand(args: string): Command {
  const words = args.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const [verb, ...rest] = words
  if (verb === undefined || verb === 'status') return { action: 'status' }
  if (verb === 'help') return { action: 'help' }
  if (verb === 'resume') return { action: 'resume' }
  if (verb === 'report') {
    const days = rest[0] === undefined ? DEFAULT_REPORT_DAYS : Number(rest[0])
    if (!Number.isInteger(days) || days < 1 || days > MAX_REPORT_DAYS) return { action: 'help', error: `“${rest[0]}”不是天數` }
    return { action: 'report', days }
  }
  if (verb === 'simulate') {
    const rule = SIMULATED.find((r) => r === rest[0])
    if (rule) return { action: 'simulate', rule }
    const rules = SIMULATED.join(', ')
    return { action: 'help', error: rest[0] === undefined ? `請指定要模擬的規則：${rules}` : `“${rest[0]}”不是規則；可用規則有：${rules}` }
  }
  if (verb === 'allow' || verb === 'pause') {
    let scope: Scope = 'all'
    let minutes = DEFAULT_ALLOW_MINUTES
    for (const word of rest) {
      if (verb === 'allow' && (word === 'agents' || word === 'context' || word === 'all')) {
        scope = word
        continue
      }
      const n = Number(word.replace(/m(in(utes?)?)?$/, ''))
      if (!Number.isInteger(n) || n < 1 || n > MAX_ALLOW_MINUTES) {
        return { action: 'help', error: `“${word}”不是${verb === 'allow' ? 'agents、context，也不是' : ''}1 到 ${MAX_ALLOW_MINUTES} 之間的分鐘數` }
      }
      minutes = n
    }
    return { action: 'allow', scope, minutes }
  }
  return { action: 'help', error: `未知子命令“${verb}”` }
}

/** Lifts limits for this session, and forgets the declines and the fuse they cover. */
export function applyOverride(state: SessionState, now: number, scope: Scope, minutes: number): string {
  const until = now + minutes * 60_000
  state.override = { until, scope }
  if (scope !== 'context') {
    delete state.fuseUntil
    delete state.refusals.agents
    state.denials = state.denials.filter((d) => !d.agent)
  }
  if (scope !== 'agents') {
    for (const loop of Object.values(state.loops)) loop.stopped = false
    state.failures = {}
  }
  return `${sentence(scopeName(scope))}已解除 ${duration(minutes * 60_000)}，直至 ${shortClock(until)}。執行 /agent-guard resume 可提前結束。`
}

/** Ends an override and clears declined questions, so the guard asks again. */
export function resumeGuard(state: SessionState): string {
  const had = state.override !== undefined
  delete state.override
  state.refusals = {}
  delete state.fuseUntil
  state.denials = state.denials.filter((d) => !d.agent)
  loopOf(state, MAIN).stopped = false
  return had
    ? '限制重新生效。'
    : '當前沒有生效的解除操作。已清除被拒絕的問題，守衛會再次詢問。'
}

export function helpText(error?: string): string {
  return error ? `${sentence(error)}.\n\n${USAGE}` : USAGE
}
