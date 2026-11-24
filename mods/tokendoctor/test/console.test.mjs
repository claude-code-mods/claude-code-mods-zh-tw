import assert from 'node:assert/strict'
import { test } from 'node:test'
import { all, complete, every, explain, NAMES, op, overview, parse, resolve, undoList, unknown, value } from '../lib/console.mjs'
import { TUNABLES } from '../lib/tunables.mjs'

const findings = [
  { id: 'subagents-on-top-model', severity: 'warn', title: 'Subagents run on Opus', fixes: [{ scope: 'user', ops: [{ op: 'set', key: 'env.CLAUDE_CODE_SUBAGENT_MODEL', value: 'sonnet' }] }] },
  { id: 'main-model-expensive', severity: 'info', title: 'The default model is opus' },
]

test('every tunable setting is reachable by one name, short where it has one', () => {
  const keys = every().map(e => e.key)
  assert.deepEqual([...keys].sort(), Object.keys(TUNABLES).sort())
  assert.equal(resolve('window').key, 'autoCompactWindow')
  assert.equal(resolve('autoCompactWindow').name, 'window')
  assert.equal(resolve('outputStyle').name, 'output-style')
  assert.ok(every().every(e => NAMES[e.name]), 'every setting has a short name')
  assert.equal(resolve('nope'), null)
})

test('what the person types becomes an action', () => {
  assert.equal(parse('').action, 'overview')
  assert.equal(parse('help').action, 'overview')
  assert.equal(parse('settings').action, 'overview')
  assert.deepEqual(parse('undo 2'), { action: 'undo', n: '2' })
  assert.equal(parse('all').action, 'all')
  assert.deepEqual(parse('fix'), { action: 'fix', id: undefined, scope: undefined })
  assert.deepEqual(parse('fix subagents-on-top-model --project'), { action: 'fix', id: 'subagents-on-top-model', scope: 'project' })
  assert.equal(parse('window').action, 'explain')
  const set = parse('window 400k --local')
  assert.equal(set.action, 'set')
  assert.equal(set.value, 400000)
  assert.equal(set.scope, 'local')
  assert.equal(parse('slide reset').value, undefined)
  assert.equal(parse('windw 1').action, 'unknown')
})

test('values are read as the setting takes them', () => {
  assert.equal(value('tokendoctor.slide', 'on'), true)
  assert.equal(value('alwaysThinkingEnabled', 'off'), false)
  assert.equal(value('autoCompactWindow', '1m'), 1000000)
  assert.equal(value('autoCompactWindow', '400000'), 400000)
  assert.equal(value('promptCacheTtl', '1h'), '1h')
  assert.equal(value('promptCacheTtl', '5m'), '5m')
  assert.equal(value('env.CLAUDE_CODE_AUTO_COMPACT_WINDOW', '400k'), 400000)
  assert.equal(value('model', 'sonnet'), 'sonnet')
  assert.equal(value('skillListingBudgetFraction', '0.05'), 0.05)
  // An env value is kept as text by the op.
  assert.deepEqual(op(resolve('mcp-output'), value('env.MAX_MCP_OUTPUT_TOKENS', '25k')).op, { op: 'set', key: 'env.MAX_MCP_OUTPUT_TOKENS', value: '25000' })
})

test('a bad value says what would do, and a plugin option is written under pluginConfigs', () => {
  assert.match(op(resolve('window'), 5).error, /不是 window 的有效值。可尝试：200k, 400k, 600k, 1m（100k 到 1m）/)
  assert.match(op(resolve('cache'), '2h').error, /可尝试：5m, 1h/)
  assert.deepEqual(op(resolve('slide'), true).op, { op: 'set', key: 'pluginConfigs.tokendoctor@tokendoctor.options.slide', value: true })
  assert.deepEqual(op(resolve('slide'), undefined).op, { op: 'unset', key: 'pluginConfigs.tokendoctor@tokendoctor.options.slide' })
})

test('the overview shows six settings, how to change them and the fixes the audit has', () => {
  const merged = { promptCacheTtl: '1h', pluginConfigs: { 'tokendoctor@tokendoctor': { options: { slide: true } } } }
  const text = overview(merged, findings, 367000)
  assert.match(text, /默认，在 367K 处压缩/)
  assert.match(text, /slide.*开/)
  assert.match(text, /cache\s+1h/)
  assert.match(text, /effort.*默认.*（下次会话）/)
  assert.match(text, new RegExp(`${every().length - 6} 项：/tokendoctor all`))
  assert.match(text, /\/tokendoctor fix subagents-on-top-model\s+Subagents run on Opus/)
  assert.doesNotMatch(text, /main-model-expensive/)
  assert.ok(all({}).startsWith('它会修改的所有设置'))
  assert.match(all({}), /no-git-instructions.*默认/)
})

test('explaining one setting names its values, when it applies and the audit’s fix for it', () => {
  const text = explain(resolve('subagents'), { env: { CLAUDE_CODE_SUBAGENT_MODEL: 'opus' } }, findings)
  assert.match(text, /^subagents \(env\.CLAUDE_CODE_SUBAGENT_MODEL\)：/)
  assert.match(text, /当前：opus/)
  assert.match(text, /可选值：sonnet, haiku, opus；模型别名或 claude-… ID；reset 恢复默认/)
  assert.match(text, /生效时间：下次会话起/)
  assert.match(text, /审计：Subagents run on Opus → \/tokendoctor fix subagents-on-top-model/)
  assert.match(text, /修改：\/tokendoctor subagents sonnet/)
})

test('typeahead: names, then values, then fix ids and scope flags', () => {
  const at = (text) => {
    const start = text.lastIndexOf(' ') + 1
    return complete(text, start, text.slice(start), findings).map(r => r.text)
  }
  assert.deepEqual(at('/tokendoctor sl'), ['slide', 'slide-to'])
  assert.ok(at('/tokendoctor w').includes('window'))
  assert.deepEqual(at('/tokendoctor window 4'), ['400k'])
  assert.deepEqual(at('/tokendoctor slide o'), ['on', 'off'])
  assert.deepEqual(at('/tokendoctor cache r'), ['reset'])
  assert.deepEqual(at('/tokendoctor fix s'), ['subagents-on-top-model'])
  assert.deepEqual(at('/tokendoctor window 400k --p'), ['--project'])
  assert.deepEqual(at('/tokendoctor window 400k x'), [])
  assert.deepEqual(at('/other sl'), [])
})

test('an unknown name points at the near ones', () => {
  assert.match(unknown('slid'), /你是不是想输入 slide, slide-to？/)
  assert.match(unknown('zzz'), /没有名为 "zzz" 的设置.*\/tokendoctor all 会列出全部设置/)
})

test('a model is an alias or a model id, never any word', () => {
  assert.ok(op(resolve('advisor'), 'opus').op)
  assert.ok(op(resolve('model'), 'claude-sonnet-5-5').op)
  assert.ok(op(resolve('model'), 'opus[1m]').op)
  assert.match(op(resolve('advisor'), 'model').error, /不是 advisor 的有效值。可尝试：opus, sonnet/)
  assert.match(op(resolve('advisor'), 'off').error, /不是 advisor 的有效值/)
})

test('the undo list names each change by its short name, newest first', () => {
  const text = undoList([
    { at: '2026-11-01T02:32:04Z', path: '/h/settings.json', scope: 'user', changes: [{ key: 'advisorModel', before: 'off' }], backup: null },
    { at: '2026-11-01T02:27:15Z', path: '/h/settings.json', scope: 'user', changes: [{ key: 'pluginConfigs.tokendoctor@tokendoctor.options.slide', after: true }], backup: null },
  ])
  assert.match(text, /advisor: off → 默认/)
  assert.match(text, /slide: 默认 → 开/)
  assert.match(text, /\/tokendoctor undo <编号> 可恢复/)
  assert.equal(undoList([]), 'tokendoctor 还没有做过任何修改。')
})
