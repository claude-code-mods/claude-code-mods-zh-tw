// What a Claude Code debug log (`claude --debug`, `--debug-file`) says about this setup: which mods
// loaded in which tier and on which events, whether the built-in guard was seated, hooks that were
// skipped, the window Claude Code compacts at, and warnings that cost tokens. Pure: text in, facts
// and findings out. bin/tokendoctor-selfcheck produces a log with one small request; the audit reads
// one the person already has (~/.claude/debug) when it is recent. A long session's log can pass the
// longest string Node makes, so a caller reading a file passes its lines (lib/transcript.mjs).

const TIERS = ['prepend', 'user', 'append', 'builtin']

/** `text`: the log, or its lines (any iterable of strings). */
export function parseDebugLog(text) {
  const out = {
    version: null,
    guard: null,
    modules: [],
    skipped: [],
    notOrg: [],
    listSkipped: [],
    skillBudget: null,
    effectiveWindow: null,
    pluginSkills: {},
    errors: 0,
  }
  const seen = new Set()
  for (const line of typeof text === 'string' ? text.split('\n') : text) {
    const body = line.replace(/^\S+ \[(DEBUG|INFO|WARN|ERROR)\] /, '')
    if (/ \[ERROR\] /.test(line) && !/NON-FATAL/.test(line)) out.errors++
    let m
    if ((m = /claude-code\/(\d+\.\d+\.\d+)/.exec(body)) && !out.version) out.version = m[1]
    if ((m = /^cc-plugin-sec-default@builtin (seated outermost|not seated): (.+)$/.exec(body))) {
      out.guard = { seated: m[1] !== 'not seated', reason: m[2].trim() }
    } else if ((m = /^hooks module (.+?) loaded \((\w+), environment \d+, tier (\w+)\); events: (.+)$/.exec(body))) {
      if (seen.has(m[1])) continue
      seen.add(m[1])
      out.modules.push({ id: m[1], kind: m[2], tier: m[3], events: m[4].split(',').map((e) => e.trim()) })
    } else if ((m = /^(\S+): (\S+) hook skipped: (.+)$/.exec(body))) {
      out.skipped.push({ mod: m[1], event: m[2], reason: m[3].trim() })
    } else if ((m = /^(\S+@\S+) is enabled by managed settings, but (.+)$/.exec(body))) {
      out.notOrg.push({ id: m[1], reason: m[2].trim() })
    } else if ((m = /^(prependPlugins|appendPlugins) names (\S+), which (.+); skipped$/.exec(body))) {
      out.listSkipped.push({ list: m[1], id: m[2].replace(/,$/, ''), reason: m[3] })
    } else if ((m = /Skill listing over budget: (\d+) skills, (\d+) chars > (\d+) budget/.exec(body))) {
      out.skillBudget = { skills: Number(m[1]), chars: Number(m[2]), budget: Number(m[3]) }
    } else if ((m = /^autocompact: .*effectiveWindow=(\d+)/.exec(body))) {
      out.effectiveWindow = Number(m[1])
    } else if ((m = /^Loaded (\d+) skills from plugin (\S+) /.exec(body))) {
      out.pluginSkills[m[2]] = Math.max(out.pluginSkills[m[2]] ?? 0, Number(m[1]))
    }
  }
  return out
}

const isOurs = (id) => /^tokendoctor@/.test(id)

/** Findings from a parsed log. `slideOn`: the person turned the slide on. */
export function debugFindings(log, { slideOn = false, source = 'the debug log' } = {}) {
  const findings = []
  const doc = (anchor) => `https://code.claude.com/docs/en/plugins/mods/${anchor}`
  const ours = log.modules.find((m) => m.id.split(',').map((s) => s.trim()).some(isOurs))

  if (!ours) {
    findings.push({
      id: 'tokendoctor-not-loaded', severity: 'error',
      title: 'tokendoctor 的 hooks 模块没有加载',
      detail: `${source} 里没有 \`hooks module tokendoctor@… loaded\` 这一行：/tokendoctor、slide 和优化工具都不存在。` +
        '请在 /plugin 里检查是否报错、是否只启用了一份副本，并对它运行 `claude plugin validate`。',
      doc: doc('troubleshoot.md#find-out-why-a-mod-does-nothing'),
    })
  } else if (slideOn && log.guard?.seated && ours.tier === 'user') {
    findings.push({
      id: 'slide-behind-guard', severity: 'warn',
      title: '日志中可见：slide 在守卫之后',
      detail: `${source} 里守卫已就位（${log.guard.reason}），而 tokendoctor 在 user 层，压缩会跳过它。` +
        '请运行 `tokendoctor-org-install`。',
      doc: doc('admin.md#know-which-hooks-of-a-users-mod-dont-run'),
    })
  }

  // Another mod that hooks compaction ahead of tokendoctor can answer it first.
  if (ours && slideOn && ours.events.includes('session.compact')) {
    const rank = (t) => TIERS.indexOf(t)
    const ahead = log.modules.filter((m) => m !== ours && !m.id.includes('sec-default') && m.events.includes('session.compact') && rank(m.tier) <= rank(ours.tier))
    if (ahead.length) {
      findings.push({
        id: 'compact-hooks-ahead', severity: 'info',
        title: `${ahead.length} 个其他模组在 tokendoctor 之前就挂钩了压缩`,
        detail: `${ahead.map((m) => `${m.id}（层 ${m.tier}）`).join('、')}。更靠前的模组可以在 slide 看到之前` +
          '总结、修改或跳过压缩。',
        doc: 'https://code.claude.com/docs/en/plugins/mods/events.md#the-order-mods-run-in',
      })
    }
  }

  for (const n of log.notOrg.filter((x) => isOurs(x.id))) {
    findings.push({
      id: 'org-copy-not-org', severity: 'error',
      title: '本机上的 tokendoctor 副本不算组织的副本',
      detail: `Claude Code：“${n.id} is enabled by managed settings, but ${n.reason}”。请重新运行 \`sudo tokendoctor-org-install --system --write\`。`,
      doc: doc('admin.md#install-your-organizations-mods'),
    })
  }
  for (const n of log.listSkipped.filter((x) => isOurs(x.id))) {
    findings.push({
      id: 'org-copy-not-org', severity: 'error',
      title: `${n.list} 跳过了 tokendoctor`,
      detail: `Claude Code：“${n.list} names ${n.id}, which ${n.reason}; skipped”。`,
      doc: doc('admin.md#install-your-organizations-mods'),
    })
  }

  if (log.skipped.length) {
    const by = {}
    for (const s of log.skipped) by[`${s.mod} ${s.event}`] = s.reason
    findings.push({
      id: 'mod-hooks-skipped', severity: log.skipped.some((s) => isOurs(s.mod) || s.mod === 'tokendoctor') ? 'warn' : 'info',
      title: `${log.skipped.length} 次模组钩子调用被跳过`,
      detail: Object.entries(by).slice(0, 6).map(([k, r]) => `${k}：${r}`).join('；') +
        '。被跳过的钩子在那个事件上什么都没做（它抛错、超时或返回了错误的结构）。',
      doc: doc('events.md#handle-a-hook-that-fails'),
    })
  }

  if (log.skillBudget) {
    const top = Object.entries(log.pluginSkills).sort((a, b) => b[1] - a[1]).slice(0, 3)
    findings.push({
      id: 'skill-listing-over-budget', severity: 'warn',
      title: `技能列表超出预算：${log.skillBudget.skills} 个技能`,
      detail: `字符数 ${log.skillBudget.chars.toLocaleString('en')}，预算为 ${log.skillBudget.budget.toLocaleString('en')}，所以 Claude Code 会截断描述，` +
        'Claude 只能依据更少的信息来选择技能。每个会话都要为这份列表付出代价' +
        (top.length ? `；技能最多的是 ${top.map(([p, n]) => `${p}（${n}）`).join('、')}` : '') +
        '。与其调高预算，不如停用用不到的插件（/plugin）。',
      doc: 'https://code.claude.com/docs/en/skills.md',
    })
  }
  return findings
}
