// Model-free hand-over (requirements FR-15, UC-6; tech spec § 3.4). Pure: built only from records.
// It answers the eight questions and keeps three sources apart: what the user confirmed (the task),
// what tools observed (operations, evidence), and what Claude only claimed (never stored as a fact,
// so the hand-over says plainly that nothing claimed is shown as verified).

import { CAPS, sanitize } from './sanitize.js'
import { HARD_FORBIDDEN } from './policy.js'
import { evidenceCurrent } from './view.js'

const s = (x, n = 200) => sanitize(x, n)

// Each section is { heading, items, fixed }: headings and `fixed` lines always appear; `items` fill the
// remaining budget in order and the rest is counted, so the size cap never drops a heading or the
// limits disclosure (INV-005) the way truncating the finished text would.
function assemble(head, sections, cap) {
  const fixedText = [...head, ...sections.flatMap((x) => ['', x.heading, ...x.fixed])].join('\n')
  const omitLine = (n) => `- … 另有 ${n} 條因交接長度限制省略`
  let budget = cap - fixedText.length - sections.length * omitLine(99999).length
  const out = [...head]
  for (const x of sections) {
    out.push('', x.heading)
    let shown = 0
    for (const it of x.items) {
      if (it.length + 1 > budget) break
      out.push(it); budget -= it.length + 1; shown++
    }
    if (shown < x.items.length) out.push(omitLine(x.items.length - shown))
    out.push(...x.fixed)
  }
  return out.join('\n')
}

export function handoff({ task, state, evidence, fingerprint, decisions, now, sessionId }) {
  // When the last tree reading was taken: the hand-over starts no process, so it never re-reads.
  const seenAt = typeof fingerprint?.at === 'number' ? `，截至 ${new Date(fingerprint.at).toISOString()}` : ''
  const head = [
    `# 交接 — ${task ? s(task.goal, 120) : '未繫結任務'}`,
    '',
    `由結構化記錄生成於 ${new Date(now).toISOString()}（會話 ${s(sessionId, 60)}）；未呼叫模型。`,
  ]
  const sec = []
  sec.push({ heading: '## 1. 目標', items: [], fixed: [task ? s(task.goal, 500) : '本會話未宣告任務。'] })
  const scope = []
  if (task) {
    scope.push(`- 工作樹：${s(task.worktree)}`)
    scope.push(`- 編輯：${(task.allow ?? []).includes('edit') ? `允許於 ${(task.editRoots ?? ['.']).map((r) => s(r)).join(', ')}` : '不允許'}`)
    scope.push(`- 授權執行器：${(task.executors ?? []).map((e) => s(e.argv.join(' '))).join('; ') || '無'}`)
    scope.push(`- Forbidden: ${(task.forbid ?? []).map((f) => s(Array.isArray(f) ? f.join(' ') : f)).join('; ') || 'none'}, plus ${[...new Set(HARD_FORBIDDEN.map((h) => h.rule))].join(', ')}`)
    if (task.acceptance?.length) scope.push(`- 驗收條件：${task.acceptance.map((a) => s(a)).join('; ')}`)
  }
  sec.push({ heading: '## 2. 允許與禁止的範圍', items: scope, fixed: task ? [] : ['- 未聲明範圍。'] })
  const ops = Object.entries(state.ops ?? {})
  const edits = ops.filter(([, o]) => ['Write', 'Edit', 'NotebookEdit', 'MultiEdit'].includes(o.tool) && o.outcome === 'ok')
  sec.push({ heading: '## 3. 變更內容', items: [], fixed: [
    fingerprint ? `- 程式碼樹：HEAD ${s(fingerprint.head, 60)}，${fingerprint.changedCount ?? '?'} 個已修改或未跟蹤路徑（${fingerprint.coverage}）${seenAt ? `，讀取於${seenAt}` : ''}` : '- 程式碼樹：本次交接未讀取',
    // Only the edit tools are counted here; a file changed through Bash shows in the tree line above
    // (found in an uncoached run: "Edits observed: 0" beside a changed README read as "nothing changed").
    `- 本會話編輯工具呼叫：${edits.length}（透過 Bash 做的修改不計入此處；以程式碼樹行記錄為準）`,
  ] })
  const ev = Object.values(evidence ?? {})
  const matches = (e) => fingerprint && e.after && e.before && e.before.value === e.after.value && e.after.value === fingerprint.value && e.outcome === 'ok'
  // Partial coverage is never "verified": what a reading did not cover may have changed — the
  // before, the after and the last reading must each be complete. The same rule `/agentctl` uses.
  const current = (e) => evidenceCurrent(e, fingerprint)
  const verified = ev.filter(current).map((e) => `- ${s(e.requested)} — 未報告錯誤，與最後一次程式碼樹讀取一致${seenAt}（${e.coverage}）`)
  sec.push({ heading: '## 4. 已驗證（最後一次程式碼樹讀取上的執行證據）', items: verified, fixed: verified.length ? [] : ['- 無。'] })
  const notVerified = ev.filter((e) => !current(e)).map((e) => {
    const why = e.outcome === 'backgrounded' ? '已啟動，未觀察到完成' : e.outcome !== 'ok' ? `outcome ${e.outcome}` : !e.after || !e.before ? '證據不可用' : e.before.value !== e.after.value ? '執行期間程式碼樹已變化' : matches(e) ? '部分覆蓋 — 程式碼樹有一部分未讀取' : '已過期 — 此後程式碼樹有變化'
    return `- ${s(e.requested)} — ${why}`
  })
  sec.push({ heading: '## 5. 未驗證', items: notVerified, fixed: ['- Claude 聲稱已完成、已透過或已修復但沒有上述證據記錄的內容，僅為它自己的判斷。'] })
  const open = ops.filter(([, o]) => o.endedAt === undefined && o.outcome !== 'refused')
  const bg = Object.entries(state.background ?? {}).filter(([, b]) => b.status === 'started' || b.status === 'in-flight')
  const running = [
    ...open.map(([id, o]) => `- ${s(o.requested)} (${o.tool}, ${o.outcome}) — ${id}`),
    ...bg.map(([id, b]) => `- 後臺 ${s(id, 60)} — ${b.status}${b.asOf ? `，截至 ${new Date(b.asOf).toISOString()}` : ''}`),
  ]
  sec.push({ heading: '## 6. 仍在執行或未知', items: running, fixed: running.length ? [] : ['- 未觀察到仍在執行的內容。未跟蹤的程序無法確認狀態。'] })
  const iv = Object.keys(state.interventions ?? {})
  sec.push({ heading: '## 7. 下一步', items: [], fixed: [iv.length ? `- 需解決：${iv.map((x) => s(x, 60)).join(', ')}` : '- 未記錄。請根據第 4–6 節決定。'] })
  const refused = (decisions ?? []).filter((d) => d.outcome === 'deny' || d.outcome === 'unknown' || d.outcome === 'needs-user-refused')
  sec.push({ heading: '## 8. 仍不允許', items: [], fixed: [
    ...(refused.length ? refused.slice(-10).map((d) => `- ${s(d.requested)} — ${s(d.rule)}`) : ['- 本會話沒有呼叫被拒絕；第 2 節的禁止範圍仍然有效。']),
    '- 之前的批准不會延續：恢復時每個呼叫都會重新分類，宿主也會再次詢問。',
    // INV-005: what this mod cannot refuse is disclosed here as in /agentctl policy, never silent.
    '- 限制：如果宿主跳過本模組的 hook（程序崩潰、模組停用），這裡不會拒絕任何操作；其他模組可以在 tool.check 時改變結果。硬性規則應放在 permissions.deny 中。',
  ] })
  return assemble(head, sec, CAPS.handoff)
}
