// What the band, `/agentctl` and `/agentctl policy|events` say (requirements FR-2, FR-3, FR-17,
// FR-23; tech spec § 3.3). Pure: every input arrives as data, every line names its source and age,
// and a field whose source did not answer says so instead of showing a value.

import { checkLine } from './firstrun.js'
import { digest } from './fingerprint.js'
import { sanitize } from './sanitize.js'

// The opaque key evidence for a declared check is stored under: arguments never become a stored
// identifier in plaintext.
export function checkKey(argv) {
  return 'check-' + digest(argv.join('\u0000'))
}

// Evidence counts as current only when the check reported no error, the tree did not change during
// the run, the run's reading matches the last one, and no reading was partial.
export function evidenceCurrent(ev, fingerprint) {
  if (!fingerprint || !ev || ev.outcome !== 'ok' || !ev.before || !ev.after) return false
  if (ev.before.value !== ev.after.value || ev.after.value !== fingerprint.value) return false
  return ![ev.coverage, ev.before.coverage, ev.after.coverage, fingerprint.coverage].includes('partial')
}

// Where the task's declared checks stand on the current tree: how many there are, how many have run
// at all, and which are not current (never run, failed, or stale).
export function checkProgress(task, evidence, fingerprint) {
  const rows = (task?.executors ?? []).filter((e) => e.check).map((e) => {
    const ev = evidence?.[checkKey(e.argv)]
    // Never shortened: the line is one Claude runs, and a cut command would not match the check.
    return { argv: sanitize(checkLine(e.argv), Infinity), ran: Boolean(ev), current: evidenceCurrent(ev, fingerprint) }
  })
  return { declared: rows.length, ran: rows.filter((r) => r.ran).length, pending: rows.filter((r) => !r.current).map((r) => r.argv) }
}

// The four states a field can be in (FR-3).
export function field(label, reading, now) {
  if (!reading) return `${label}：缺失`
  if (reading.failed) return `${label}：不可用（${reading.failed}）`
  const age = Math.max(0, Math.round((now - reading.at) / 1000))
  const stale = reading.staleAfterMs !== undefined && now - reading.at > reading.staleAfterMs
  return `${label}：${reading.value} — ${reading.source}，${age} 秒前${stale ? '（已過期）' : ''}`
}

// review-state.js check --format=json → a gate reading. A gate pass is a gate pass, never a test pass.
export function gateReading(run, at) {
  if (typeof run === 'string') return { failed: run, at }
  if (!run || run.exitCode !== 0) return { failed: `check exited ${run ? run.exitCode : 'without a result'}`, at }
  let s
  try { s = JSON.parse(run.stdout) } catch { return { failed: 'not JSON', at } }
  const word = (p) => (!p ? '?' : p.passed ? '✅' : p.verdict === 'fail' && p.digest_match ? '⛔' : p.noted && !p.digest_match ? '⏳ stale' : p.owed ? '⏳ owed' : '·')
  return { value: `code ${word(s.code_review)} · doc ${word(s.doc_review)} · precommit ${word(s.precommit)}`, source: 'review-state.js check', at }
}

// Usage windows are read by kind; a missing window is missing, never 0%. One account's windows are
// shown for this session only and never summed with other sessions.
export function usageReading(usage, kind, at) {
  if (!usage) return null
  const w = (usage.rateLimits ?? []).find((r) => r.kind === kind)
  if (!w) return null
  return { value: `${Math.round(w.percentUsed)}%${w.resetsAt ? ` (resets ${w.resetsAt})` : ''}`, source: `session usage (${w.source ?? 'host'})`, at }
}

export function contextReading(usage, at) {
  const p = usage?.context?.percent
  return typeof p === 'number' ? { value: `${Math.round(p)}%`, source: 'session usage', at } : null
}

function evidenceLines(evidence, currentFingerprint, now) {
  const out = []
  for (const ev of Object.values(evidence ?? {})) {
    const fresh = currentFingerprint && ev.after && ev.after.value === currentFingerprint.value && ev.before && ev.before.value === ev.after.value
    const state = ev.outcome === 'backgrounded' ? '已啟動，未觀察到完成'
      : ev.outcome === 'refused' ? 'refused'
      : !ev.after || !ev.before ? '證據不可用'
      : ev.before.value !== ev.after.value ? '執行期間程式碼樹已變化 — 未繫結'
      : fresh && [ev.coverage, ev.before.coverage, ev.after.coverage, currentFingerprint.coverage].includes('partial') ? '匹配，但讀取不完整'
      : fresh ? '最新'
      : '已過期（此後程式碼樹有變化）'
    const age = Math.max(0, Math.round((now - ev.at) / 1000))
    out.push(`  ${sanitize(ev.requested, 120)}: ${ev.outcome === 'ok' ? '未報告錯誤' : ev.outcome} · ${state} · ${ev.coverage ?? 'coverage unknown'} · ${age}s ago`)
  }
  return out
}

const REASON_LABEL = {
  input: '等待你的輸入',
  permission: '等待許可權決定',
  'policy-denied': '被任務策略拒絕',
  'rate-limit': '已達速率限制',
  'suspected-stall': '無活動（未確認卡住）',
}

function interventionLines(state, now) {
  return Object.entries(state.interventions ?? {}).map(([reason, v]) => {
    const age = Math.max(0, Math.round((now - v.since) / 1000))
    const detail = typeof v.detail === 'string' ? sanitize(v.detail, 120) : v.detail?.resetsAt ? `resets ${v.detail.resetsAt}` : ''
    return `  ${REASON_LABEL[reason] ?? reason}${detail ? ` — ${detail}` : ''} · since ${age}s ago`
  })
}

// Compact by default — it reaches Claude — and the diagnostic lines on `/agentctl status --details`.
// Labels say what they measure (found in a first-run test: "Observation: ok" read as "work passed").
export function statusText(m, { details = false } = {}) {
  const { now, task, state } = m
  const lines = []
  lines.push(task ? `任務：${sanitize(task.goal, 120)}（${task.id}）` : '任務：未繫結')
  const iv = interventionLines(state, now)
  lines.push(iv.length ? '需要關注：' : '需要關注：未觀察到')
  lines.push(...iv)
  lines.push(field('審查關卡', m.gate, now))
  const ev = evidenceLines(m.evidence, m.fingerprint, now)
  lines.push(ev.length ? '執行證據（不是審查結論）：' : '執行證據：尚無宣告的檢查執行過')
  lines.push(...ev)
  const bg = Object.entries(state.background ?? {}).filter(([, b]) => b.status === 'started' || b.status === 'in-flight')
  if (bg.length) lines.push(`後臺執行中：${bg.length}（${bg.map(([id]) => id).join('、')}）`)
  if (!details) {
    lines.push('更多：/agentctl status --details · /agentctl help')
    return lines.join('\n')
  }
  lines.push(`狀態儲存：${m.health === 'ok' ? '正常' : m.health}`)
  lines.push(`執行：${state.runtime.value}${state.runtime.tool ? `（${state.runtime.tool}）` : ''}，已持續 ${Math.max(0, Math.round((now - state.runtime.since) / 1000))} 秒 · 階段 ${state.phase.value} · 結果 ${state.result.value}`)
  // A usage reading arrives with Claude's first reply in the session; before that it is absent.
  const usage = (label, r) => (r ? field(label, r, now) : `${label}：缺失（Claude 首次回覆後讀取）`)
  lines.push(usage('上下文', m.context))
  lines.push(usage('5 小時視窗', m.fiveHour))
  return lines.join('\n')
}

export function bandText(m) {
  const { task, state, now } = m
  const iv = Object.keys(state.interventions ?? {})
  const attention = iv.length ? `⚠ ${iv.map((r) => REASON_LABEL[r] ?? r).join(', ')}` : '無需關注'
  const head = task ? `agentctl · ${sanitize(task.goal, 40)}` : 'agentctl · 無任務'
  const rt = `${state.runtime.value}${state.runtime.tool ? `:${state.runtime.tool}` : ''} ${Math.max(0, Math.round((now - state.runtime.since) / 1000))}s`
  let gate = '關卡缺失'
  if (m.gate?.failed) gate = '關卡不可用'
  else if (m.gate) {
    const age = Math.max(0, Math.round((now - m.gate.at) / 1000))
    const stale = m.gate.staleAfterMs !== undefined && now - m.gate.at > m.gate.staleAfterMs
    gate = `${m.gate.value} (${age}s${stale ? '，已過期' : ''})`
  }
  const resume = m.checkpoint ? ` · 上次交接 ${new Date(m.checkpoint.savedAt).toISOString()}` : ''
  const proposal = m.pending ? ` · 草稿 ${m.pending.digest.slice(0, 8)} 待確認 — /agentctl accept` : ''
  return `${head} · ${rt} · ${attention} · ${gate}${proposal}${resume}${m.health === 'ok' ? '' : ` · ${m.health}`}`
}

export const LIMITS = [
  '本模組只是控制和顯示，不是隔離邊界；生產環境只讀由憑據和目標自身的許可權保證。',
  '如果宿主跳過本模組的 hook（程序崩潰、模組停用），這裡不會拒絕任何操作；請在 permissions.deny 規則中列出危險命令。',
  '原生許可權規則匹配命令文字，而不是程式；其他模組可以在 tool.check 時改變結果。',
  '已授權的執行器執行，但不會對其效果進行分類。',
]

export function policyText(task) {
  if (!task) return ['未繫結任務：內建的生產寫入和遠端 git 寫入仍然被拒絕；其他一切走宿主自身的許可權流程。', ...LIMITS].join('\n')
  const one = (x) => (Array.isArray(x) ? x.join(' ') : Array.isArray(x?.argv) ? x.argv.join(' ') + (x.check ? ' (check)' : '') : String(x))
  const fmt = (xs) => (xs?.length ? xs.map((x) => sanitize(one(x), 200)).join('; ') : 'none')
  return [
    `任務 ${task.id} · 策略版本 ${task.policyVersion ?? 1}`,
    ...(task.recordMissing ? ['繫結的任務記錄缺失：工作樹內的讀取以外一切操作都會被拒絕。請重新設定任務。'] : []),
    `Worktree: ${sanitize(task.worktree, 200)}`,
    `Edits: ${(task.allow ?? []).includes('edit') ? `allowed in ${fmt(task.editRoots ?? ['.'])}` : 'not allowed'}`,
    `Forbidden (task): ${fmt(task.forbid)} · plus the built-in production-write and remote-git-write classes`,
    `Authorized executors: ${fmt(task.executors)}`,
    `Needs a person: ${fmt(task.needsUser)}`,
    `Other tools allowed: ${fmt(task.tools)}`,
    '其餘一切走宿主自身的許可權流程（或 auto 模式）：本模組不對其分類。',
    '盡力而為：本模組只讀取每次工具呼叫，不讀取指令碼內容或它啟動的命令。',
    ...LIMITS,
  ].join('\n')
}

export function eventsText(decisions, n, now) {
  const list = (decisions ?? []).slice(-n)
  if (!list.length) return '本會話未記錄任何決定。'
  return list.map((d) => `${Math.max(0, Math.round((now - d.at) / 1000))} 秒前 · ${d.outcome} · ${d.tool} · ${sanitize(d.requested, 160)} · ${sanitize(d.rule, 160)}`).join('\n')
}
