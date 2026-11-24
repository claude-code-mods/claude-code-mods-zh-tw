// `/tokendoctor`: read and change the tunable settings by name, with no model call. Pure functions over
// the merged settings and the audit findings, so the hooks module and node's tests both use them.
import { aboutOf, TUNABLES, tunableOp } from './tunables.mjs'

const ON_OFF = ['on', 'off']
// Short names for the settings people change most, with the values worth suggesting and their range.
export const NAMES = {
  window: { key: 'autoCompactWindow', values: ['200k', '400k', '600k', '1m'], range: '100k 到 1m' },
  compact: { key: 'autoCompactEnabled', values: ON_OFF },
  'idle-compact': { key: 'idleCompaction', values: ON_OFF },
  'idle-compact-at': { key: 'env.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS', values: ['150k', '200k'], range: '100k 到 1m 个 token' },
  'compact-at': { key: 'env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE', values: ['75', '90'], range: '1 到 100（窗口的百分比，只能降低）' },
  'max-effort': { key: 'maxEffortLevel', values: ['medium', 'high', 'xhigh', 'max'] },
  slide: { key: 'tokendoctor.slide', values: ON_OFF, fallback: false },
  'slide-to': { key: 'tokendoctor.slideTo', values: ['25', '40', '60'], range: '20 到 90（百分比）', fallback: 25 },
  cache: { key: 'promptCacheTtl', values: ['5m', '1h'] },
  'subagent-cache': { key: 'subagentPromptCacheTtl', values: ['5m', '1h'] },
  model: { key: 'model', values: ['opus', 'sonnet', 'haiku'], range: '模型别名或 claude-… ID' },
  subagents: { key: 'env.CLAUDE_CODE_SUBAGENT_MODEL', values: ['sonnet', 'haiku', 'opus'], range: '模型别名或 claude-… ID' },
  advisor: { key: 'advisorModel', values: ['opus', 'sonnet'], range: '模型别名或 claude-… ID' },
  effort: { key: 'effortLevel', values: ['low', 'medium', 'high', 'xhigh'] },
  thinking: { key: 'alwaysThinkingEnabled', values: ON_OFF },
  fast: { key: 'fastMode', values: ON_OFF },
  'git-instructions': { key: 'includeGitInstructions', values: ON_OFF },
  suggestions: { key: 'promptSuggestionEnabled', values: ON_OFF },
  'bash-output': { key: 'bashOutputMaxChars', values: ['30k', '60k'], range: '1k 到 150k 个字符' },
  'tool-search': { key: 'env.ENABLE_TOOL_SEARCH', values: ['true', 'auto', 'false'] },
  'mcp-output': { key: 'env.MAX_MCP_OUTPUT_TOKENS', values: ['25k', '50k'], range: '1k 到 200k 个 token' },
  'read-output': { key: 'env.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS', values: ['25k', '50k'], range: '1k 到 200k 个 token' },
  'max-output': { key: 'env.CLAUDE_CODE_MAX_OUTPUT_TOKENS', values: ['32k', '64k'], range: '1k 到 200k 个 token' },
  'keep-transcripts': { key: 'cleanupPeriodDays', values: ['30', '90'], range: '1 到 3650 天' },
  'fast-opt-in': { key: 'fastModePerSessionOptIn', values: ON_OFF },
  'skill-budget': { key: 'skillListingBudgetFraction', values: ['0.01', '0.02'], range: '大于 0，最多 0.1' },
  'skill-desc': { key: 'skillListingMaxDescChars', values: ['250', '500'], range: '100 到 5000 个字符' },
  'output-style': { key: 'outputStyle', values: ['default', 'Explanatory', 'Learning'] },
  'no-connectors': { key: 'disableClaudeAiConnectors', values: ON_OFF },
  'effort-env': { key: 'env.CLAUDE_CODE_EFFORT_LEVEL', values: ['low', 'medium', 'high', 'xhigh', 'max'] },
  'window-env': { key: 'env.CLAUDE_CODE_AUTO_COMPACT_WINDOW', values: ['200k', '400k'], range: 'token 数，优先于窗口设置' },
  'bash-output-env': { key: 'env.BASH_MAX_OUTPUT_LENGTH', values: ['30k'], range: '1k 到 150k 个字符' },
  'no-git-instructions': { key: 'env.CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS', values: ['1', '0'] },
}
/** What `/tokendoctor` alone shows; the rest is under `/tokendoctor all`. */
export const MAIN = ['window', 'slide', 'cache', 'effort', 'model', 'subagents']
const COMMAND = '/tokendoctor'

/** A name typed by the person (short name or full key) as its entry, or null. */
export function resolve(name) {
  if (NAMES[name]) return { name, ...NAMES[name] }
  const short = Object.keys(NAMES).find(n => NAMES[n].key === name)
  if (short) return { name: short, ...NAMES[short] }
  return TUNABLES[name] ? { name, key: name, values: [] } : null
}

/** Every setting, short names first, then the keys that have none. */
export function every() {
  const named = Object.keys(NAMES).map(resolve)
  const rest = Object.keys(TUNABLES).filter(k => !named.some(e => e.key === k)).map(resolve)
  return [...named, ...rest]
}

/**
 * The person's words as an action: overview, all, explain, set (value undefined to unset), fix (id
 * undefined to list), or unknown. `--project`, `--local` or `--user` anywhere picks the file.
 */
export function parse(args) {
  const words = String(args ?? '').trim().split(/\s+/).filter(Boolean)
  const flag = words.find(w => ['--user', '--project', '--local'].includes(w))
  const scope = flag ? flag.slice(2) : 'user'
  const [first, raw] = words.filter(w => !w.startsWith('--'))
  if (!first || ['help', 'settings', 'list'].includes(first)) return { action: 'overview', scope }
  if (first === 'all') return { action: 'all', scope }
  if (first === 'undo') return { action: 'undo', n: raw }
  // A fix has a scope of its own unless the person names one.
  if (first === 'fix') return { action: 'fix', id: raw, scope: flag ? scope : undefined }
  const entry = resolve(first)
  if (!entry) return { action: 'unknown', name: first, scope }
  if (raw === undefined) return { action: 'explain', entry, scope }
  if (raw === 'reset') return { action: 'set', entry, value: undefined, scope }
  return { action: 'set', entry, value: value(entry.key, raw), scope }
}

/** A typed value as the setting takes it: on/off as booleans, 400k as 400000. */
export function value(key, raw) {
  const t = TUNABLES[key]
  if (t?.check(true)) {
    if (['on', 'true', 'yes'].includes(raw)) return true
    if (['off', 'false', 'no'].includes(raw)) return false
  }
  // 400k is a number only where the setting takes one: 5m stays five minutes for the cache.
  const m = /^(\d+(?:\.\d+)?)([km])?$/i.exec(raw)
  if (!m || !t) return raw
  const n = Math.round(Number(m[1]) * (m[2] ? (m[2].toLowerCase() === 'k' ? 1_000 : 1_000_000) : 1) * 1e6) / 1e6
  return t.check(key.startsWith('env.') ? String(n) : n) ? n : raw
}

/** The change as the settings op, or the reason it is refused. */
export function op(entry, v) {
  try {
    return { op: tunableOp(entry.key, v) }
  } catch (e) {
    const values = entry.values.length ? `可尝试：${entry.values.join(', ')}${entry.range ? `（${entry.range}）` : ''}。` : ''
    return { error: `${display(v)} 不是 ${entry.name} 的有效值。${values}` }
  }
}

/** Whether a change to the key reaches the running session. */
export function live(key) {
  return Boolean(TUNABLES[key]?.live)
}

/** A setting's current value in the merged settings, undefined when unset. */
export function current(merged, key) {
  const path = TUNABLES[key]?.path ?? key
  return path.split('.').reduce((node, p) => (node && typeof node === 'object' ? node[p] : undefined), merged)
}

/** A value as people read it: on/off, 400K, 1M. */
export function display(v) {
  if (v === undefined || v === null) return '默认'
  if (typeof v === 'boolean') return v ? '开' : '关'
  if (typeof v === 'number' && v >= 1000 && v % 1000 === 0) return v >= 1_000_000 && v % 100_000 === 0 ? `${v / 1_000_000}M` : `${v / 1000}K`
  return String(v)
}

/** The audit findings whose fix changes this key. */
function fixesFor(key, findings) {
  const path = TUNABLES[key]?.path ?? key
  return (findings ?? []).filter(f => (f.fixes ?? []).some(fix => (fix.ops ?? []).some(o => o.key === path)))
}

/** The value now, the default spelled out where it is known (tokendoctor's own, the window's point). */
function now(entry, merged, compactsAt) {
  const v = current(merged, entry.key)
  if (v !== undefined) return display(v)
  if (entry.fallback !== undefined) return `${display(entry.fallback)}（默认）`
  if (entry.key === 'autoCompactWindow' && compactsAt) return `默认，在 ${display(Math.round(compactsAt / 1000) * 1000)} 处压缩`
  return '默认'
}

const WIDTH = Math.max(...Object.keys(NAMES).map(n => n.length)) + 2

function row(entry, merged, compactsAt) {
  const later = TUNABLES[entry.key].live ? '' : '（下次会话）'
  return `  ${entry.name.padEnd(WIDTH)}${now(entry, merged, compactsAt).padEnd(26)} ${aboutOf(entry.key)}${later}`
}

const HOW = [
  `修改某一项：${COMMAND} <名称> <值>，例如`,
  `  ${COMMAND} window 600k     ${COMMAND} slide off     ${COMMAND} cache reset（恢复默认）`,
  `${COMMAND} <名称> 解释某一项。输入名称首字母会弹出名称列表；输入`,
  `名称和一个空格后，输入值的首字母会显示可选值。--project 或 --local 写入对应范围，而不是`,
  `用户设置。${COMMAND} undo 列出这里做过的修改，并可恢复其中一项。`,
]

function fixList(findings) {
  const fixable = (findings ?? []).filter(f => f.fixes)
  if (!fixable.length) return []
  return ['', '审计结果可修复以下问题：', ...fixable.map(f => `  ${COMMAND} fix ${f.id.padEnd(28)} ${f.title}`)]
}

/** `/tokendoctor`: the main settings, how to change them, and the audit's fixes. */
export function overview(merged, findings, compactsAt) {
  return [
    '设置',
    ...MAIN.map(n => row(resolve(n), merged, compactsAt)),
    `  另有 ${every().length - MAIN.length} 项：${COMMAND} all`,
    ...((findings ?? []).some(f => f.id === 'slide-blocked-by-guard') ? ['  slide 已开启，但在当前登录下无法运行：' + `${COMMAND} slide 查看原因`] : []),
    '',
    ...HOW,
    ...fixList(findings),
  ].join('\n')
}

/** `/tokendoctor all`: every setting tokendoctor changes. */
export function all(merged, compactsAt) {
  return ['它会修改的所有设置', ...every().map(e => row(e, merged, compactsAt)), '', ...HOW].join('\n')
}

/** `/tokendoctor <name>`: one setting, its values, when it applies and what the audit says. */
export function explain(entry, merged, findings, compactsAt) {
  const t = TUNABLES[entry.key]
  const lines = [`${entry.name}${entry.name === entry.key ? '' : ` (${entry.key})`}：${aboutOf(entry.key)}`, `  当前：${now(entry, merged, compactsAt)}`]
  if (entry.values.length) lines.push(`  可选值：${entry.values.join(', ')}${entry.range ? `；${entry.range}` : ''}；reset 恢复默认`)
  lines.push(`  生效时间：${t.live ? '立即' : '下次会话起'}`)
  for (const f of fixesFor(entry.key, findings)) lines.push(`  审计：${f.title} → ${COMMAND} fix ${f.id}`)
  // A finding with no fix the console can apply, but that decides whether this setting does anything.
  const blocked = entry.key.startsWith('tokendoctor.slide') && findings?.find(f => f.id === 'slide-blocked-by-guard')
  if (blocked) lines.push(`  受阻：${blocked.detail}`)
  const is = display(current(merged, entry.key))
  lines.push(`  修改：${COMMAND} ${entry.name} ${entry.values.find(v => v !== is) ?? '<value>'}`)
  return lines.join('\n')
}

/** Typeahead rows for the word at the cursor of a `/tokendoctor` draft. */
export function complete(text, start, token, findings) {
  const words = text.slice(0, start).trim().split(/\s+/)
  if (words[0] !== COMMAND) return []
  const before = words.filter(w => !w.startsWith('--'))
  const t = token.toLowerCase()
  const rows = (list) => list.filter(r => r.text.toLowerCase().startsWith(t) && r.text.toLowerCase() !== t)
  if (token.startsWith('-')) {
    return rows([
      { text: '--project', description: '写入本项目的共享设置' },
      { text: '--local', description: '写入本项目的个人设置' },
    ])
  }
  if (before.length > 2) return []
  if (before.length === 1) {
    return rows([
      ...every().map(e => ({ text: e.name, description: aboutOf(e.key) })),
      { text: 'all', description: 'tokendoctor 会修改的所有设置' },
      { text: 'fix', description: '应用某项审计结果的修复' },
      { text: 'undo', description: '列出这里做过的修改，并恢复其中一项' },
    ])
  }
  if (before[1] === 'fix') return rows((findings ?? []).filter(f => f.fixes).map(f => ({ text: f.id, description: f.title })))
  const entry = resolve(before[1])
  if (!entry) return []
  return rows([...entry.values.map(v => ({ text: v })), { text: 'reset', description: '恢复默认' }])
}

/** What an unknown name gets: the names it may have meant. */
export function unknown(name) {
  const n = name.toLowerCase()
  const near = every().filter(e => e.name.toLowerCase().includes(n) || n.includes(e.name.toLowerCase())).map(e => e.name)
  return `没有名为 "${name}" 的设置。${near.length ? ` 你是不是想输入 ${near.slice(0, 4).join(', ')}？` : ''} ${COMMAND} all 会列出全部设置。`
}

/** The name a settings path goes by here. */
export function nameOf(path) {
  const key = Object.keys(TUNABLES).find(k => (TUNABLES[k].path ?? k) === path) ?? path
  return resolve(key)?.name ?? path
}

/** `/tokendoctor undo`: the changes tokendoctor wrote, newest first, numbered. */
export function undoList(journal) {
  if (!journal.length) return 'tokendoctor 还没有做过任何修改。'
  const lines = journal.map((e, i) => {
    const time = new Date(e.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    const what = e.changes.map(c => `${nameOf(c.key)}: ${display(c.before)} → ${display(c.after)}`).join(', ')
    return `  ${String(i + 1).padStart(2)}  ${time.padEnd(16)} ${e.scope.padEnd(8)} ${what}`
  })
  return ['tokendoctor 做过的修改，最新的在前', ...lines, '', `${COMMAND} undo <编号> 可恢复对应的一项。`].join('\n')
}
