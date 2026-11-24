// Pure audit rules. Each rule reads a snapshot (see collect.mjs) and returns a finding or null.
// Nothing here touches the disk, so every rule is unit-testable on a fixture snapshot.
//
// A finding: { id, severity: 'error'|'warn'|'info', title, detail, doc, fixes?: Fix[] }
// A Fix is one of:
//   { scope, ops: [{ op: 'set'|'unset'|'add', key, value|values }] }   settings edit
//   { scope, template }                                                 copy templates/agents/<template>.md

import { blockedNote, ORG_ID, USER_ID } from './guard.mjs'

const DOCS = {
  model: 'https://code.claude.com/docs/en/model-config.md',
  costs: 'https://code.claude.com/docs/en/costs.md',
  subagents: 'https://code.claude.com/docs/en/sub-agents.md',
  advisor: 'https://code.claude.com/docs/en/advisor.md',
  settings: 'https://code.claude.com/docs/en/settings.md',
  skills: 'https://code.claude.com/docs/en/skills.md',
}

const SCOPES = ['user', 'project', 'local']
const COMPACT_WINDOW = 400000

export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number)
  const pb = String(b).split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d !== 0) return d
  }
  return 0
}

export function modelFamily(name) {
  const m = String(name ?? '').toLowerCase()
  for (const family of ['fable', 'opus', 'sonnet', 'haiku']) if (m.includes(family)) return family
  return null
}

const RANK = { haiku: 0, sonnet: 1, opus: 2, fable: 3 }

export function mainModel(snapshot) {
  const { settings, env } = snapshot
  // ANTHROPIC_DEFAULT_MODEL counts only when nothing else picks one (model-config.md#set-a-default-model-for-new-sessions).
  return env.ANTHROPIC_MODEL ?? settings.local.model ?? settings.project.model ?? settings.user.model ?? env.ANTHROPIC_DEFAULT_MODEL ?? null
}

const truthy = (v) => v !== undefined && v !== '' && v !== '0' && v !== 'false'

// Variables that stop Claude Code fetching feature flags (env-vars.md#features-that-need-feature-flag-fetching).
// DISABLE_TELEMETRY and CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC count even when set to 0 or false.
function flagFetchBlockers(env) {
  const set = (k) => env[k] !== undefined && env[k] !== ''
  return [
    set('DISABLE_TELEMETRY') && 'DISABLE_TELEMETRY',
    set('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC') && 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
    truthy(env.DO_NOT_TRACK) && 'DO_NOT_TRACK',
    truthy(env.DISABLE_GROWTHBOOK) && 'DISABLE_GROWTHBOOK',
  ].filter(Boolean)
}

function scopesWith(snapshot, key) {
  return SCOPES.filter((s) => snapshot.settings[s][key] !== undefined)
}

const RULES = [
  {
    id: 'compact-window-unset',
    since: '2.1.288',
    run(s) {
      const { settings, env } = s
      const perModel = SCOPES.some((sc) =>
        Object.values(settings[sc].modelSettings ?? {}).some((m) => m?.autoCompactWindow),
      )
      if (SCOPES.some((sc) => settings[sc].autoCompactWindow) || perModel) return null
      if (env.CLAUDE_CODE_AUTO_COMPACT_WINDOW) return null
      // Holds every native-1M model to a 200K window, which is smaller than the one suggested here.
      if (truthy(env.CLAUDE_CODE_DISABLE_1M_CONTEXT)) return null
      return {
        severity: 'warn',
        title: '未设置自动压缩窗口',
        detail:
          '原生 1M 窗口的模型（Fable、Sonnet 5+、Haiku 5.5、Opus 4.7+）默认要到 ' +
          '约 967K token 才压缩，因此每个请求都带着很长的历史。更小的' +
          `窗口（这里用 ${COMPACT_WINDOW.toLocaleString('en')}，有效范围 100K 到 1M）会更早压缩。` +
          '窗口太小则会频繁压缩，反复重读历史，破坏提示缓存。',
        doc: `${DOCS.model}#set-the-auto-compact-window`,
        fixes: [{ scope: 'user', ops: [{ op: 'set', key: 'autoCompactWindow', value: COMPACT_WINDOW }] }],
      }
    },
  },
  {
    id: 'compact-threshold-undocumented',
    run(s) {
      const scopes = scopesWith(s, 'autoCompactThreshold')
      if (!scopes.length) return null
      return {
        severity: 'error',
        title: '`autoCompactThreshold` 不是有文档的设置项',
        detail:
          `出现在 ${scopes.join(', ')} 设置中。有文档的键是 \`autoCompactWindow\` ` +
          '（一个 token 数）和 `CLAUDE_CODE_AUTO_COMPACT_WINDOW` 变量，所以这个键很可能被忽略，' +
          '压缩并没有按看起来的方式配置。',
        doc: `${DOCS.model}#set-the-auto-compact-window`,
        fixes: scopes.map((scope) => ({ scope, ops: [{ op: 'unset', key: 'autoCompactThreshold' }] })),
      }
    },
  },
  {
    id: 'compact-env-bare-number',
    run(s) {
      const raw = s.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW
      if (raw === undefined || !/^\d+$/.test(String(raw))) return null
      if (Number(raw) >= 100000) return null
      return {
        severity: 'error',
        title: '`CLAUDE_CODE_AUTO_COMPACT_WINDOW` 低于 100,000 的下限',
        detail:
          `当前为 ${raw}。这个变量里的纯数字按 token 数理解（不是千），` +
          '超出 100,000 到 1,000,000 的值会被截断并给出警告。请改用 200000，或在 ' +
          'Claude Code 2.1.304 及以后版本使用 200k。',
        doc: `${DOCS.model}#set-the-auto-compact-window`,
      }
    },
  },
  {
    id: 'explore-default-model',
    since: '2.1.251',
    run(s) {
      if ([...s.agents.user, ...s.agents.project].some((a) => a.name === 'Explore')) return null
      return {
        severity: 'info',
        title: '内置 Explore 代理没有覆盖配置',
        detail:
          '使用 Claude 订阅、Console 账户或经 ANTHROPIC_BASE_URL 的网关时，' +
          '内置 Explore 代理会用最贵的 Opus 模型做只读搜索。' +
          '名为 Explore 的用户级或项目级代理可以覆盖它；随附的模板把模型固定为 Haiku，' +
          '并只开放只读工具。如果搜索质量需要更强的模型，可以忽略这一条。',
        doc: `${DOCS.subagents}#built-in-subagent-models`,
        fixes: [{ scope: 'user', template: 'Explore' }],
      }
    },
  },
  {
    id: 'subagent-model-force',
    since: '2.1.257',
    run(s) {
      if (!truthy(s.env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE)) return null
      return {
        severity: 'warn',
        title: '所有子代理被强制使用同一个模型',
        detail:
          `CLAUDE_CODE_SUBAGENT_MODEL_FORCE 会忽略每个代理自己的模型，包括需要推理的代理` +
          `（Plan、评审者）。强制使用的模型：${s.env.CLAUDE_CODE_SUBAGENT_MODEL ?? '主模型'}。` +
          '更好的做法是在搜索类和测试类代理的 frontmatter 里固定便宜的模型。',
        doc: `${DOCS.subagents}#forcing-one-model-on-every-subagent`,
      }
    },
  },
  {
    id: 'subagent-model-unset',
    since: '2.1.251',
    run(s) {
      if (s.env.CLAUDE_CODE_SUBAGENT_MODEL) return null
      if (modelFamily(mainModel(s)) === 'sonnet' || modelFamily(mainModel(s)) === 'haiku') return null
      return {
        severity: 'info',
        title: '子代理沿用主模型',
        detail:
          `主模型是 ${mainModel(s) ?? '默认模型'}，所以通用子代理也会用它。` +
          '在 settings.json 的 `env` 块里设置 CLAUDE_CODE_SUBAGENT_MODEL（例如设为 sonnet），' +
          '可以让它们降级，而不影响自己指定了模型的代理。',
        doc: `${DOCS.subagents}#subagent-model-selection`,
        fixes: [{ scope: 'user', ops: [{ op: 'set', key: 'env.CLAUDE_CODE_SUBAGENT_MODEL', value: 'sonnet' }] }],
      }
    },
  },
  {
    id: 'thinking-tokens-env',
    run(s) {
      const raw = s.env.MAX_THINKING_TOKENS
      if (!truthy(raw)) return null
      return {
        severity: 'info',
        title: '`MAX_THINKING_TOKENS` 只对固定预算的模型有效',
        detail:
          `当前为 ${raw}。自适应推理的模型会忽略非零预算，而 Opus 5.5、Sonnet 5.5、` +
          'Haiku 5.5 和 Fable 系列模型无法关闭思考。在这些模型上，请改用 /effort 或 ' +
          'modelSettings 降低推理强度。',
        doc: `${DOCS.costs}#adjust-extended-thinking`,
      }
    },
  },
  {
    id: 'effort-max-in-settings',
    run(s) {
      const scopes = SCOPES.filter((sc) => s.settings[sc].effortLevel === 'max')
      if (!scopes.length) return null
      return {
        severity: 'warn',
        title: '设置文件不接受 `effortLevel: "max"`',
        detail:
          `出现在 ${scopes.join(', ')} 设置中。\`effortLevel\` 键只接受 low、medium、high ` +
          '和 xhigh；max 只能在单个会话中使用（/effort max 或 --effort max）。',
        doc: `${DOCS.model}#effort-levels`,
        fixes: scopes.map((scope) => ({ scope, ops: [{ op: 'set', key: 'effortLevel', value: 'xhigh' }] })),
      }
    },
  },
  {
    id: 'advisor-inactive',
    since: '2.1.260',
    run(s) {
      const advisor = SCOPES.map((sc) => s.settings[sc].advisorModel).find(Boolean)
      if (!advisor) return null
      const reasons = []
      const flagOff = flagFetchBlockers(s.env)
      if (flagOff.length) {
        reasons.push(`${flagOff.join(', ')} 关闭了顾问所需的功能开关拉取`)
      }
      if (truthy(s.env.CLAUDE_CODE_DISABLE_ADVISOR_TOOL)) {
        reasons.push('CLAUDE_CODE_DISABLE_ADVISOR_TOOL 直接禁用了该工具')
      }
      const main = modelFamily(mainModel(s))
      const adv = modelFamily(advisor)
      if (main && adv && RANK[adv] < RANK[main]) {
        reasons.push(`顾问（${advisor}）的级别低于主模型（${mainModel(s)}）`)
      }
      if (!reasons.length) return null
      return {
        severity: 'warn',
        title: '配置的顾问不会运行',
        detail: `${reasons.join('；')}。在这些情况下，Claude Code 会悄悄发送不带顾问的请求。`,
        doc: DOCS.advisor,
      }
    },
  },
  {
    id: 'instructions-long',
    run(s) {
      const long = s.instructionFiles.filter((f) => f.lines > 200)
      if (!long.length) return null
      return {
        severity: 'info',
        title: '指令文件过长',
        detail:
          long.map((f) => `${f.path}：${f.lines} 行`).join('；') +
          '。这些内容会加载进每个会话，也会加载进除 Explore、Plan 以及设置了 omitClaudeMd ' +
          '的代理之外的每个子代理。' +
          '文档建议控制在约 200 行以内。降低开销的办法是把与具体工作流相关的文字移进技能' +
          '（只在用到时加载），或移进带 `paths:` frontmatter 的 `.claude/rules/*.md` 文件' +
          '（只在 Claude 处理匹配文件时加载）。' +
          '@import 不会减少开销，因为被导入的文件会随导入它的文件一起加载。' +
          '块级 HTML 注释在注入前会被去掉，所以维护者的注释不占开销。',
        doc: `${DOCS.costs}#move-instructions-from-claudemd-to-skills`,
      }
    },
  },
  {
    id: 'context-surface',
    run(s) {
      const { skills, enabledPlugins, mcpServers } = s
      const parts = []
      if (skills.autoLoaded > 15) parts.push(`${skills.autoLoaded} 个技能的描述会在每个会话加载`)
      if (enabledPlugins > 6) parts.push(`${enabledPlugins} 个已启用的插件`)
      if (mcpServers > 5) parts.push(`${mcpServers} 个 MCP 服务`)
      if (!parts.length) return null
      return {
        severity: 'info',
        title: '常驻上下文占用很大',
        detail:
          `${parts.join('，')}。技能描述是每个请求的一部分；` +
          '`disable-model-invocation: true` 会让技能在运行前不进入上下文，插件可以在 ' +
          '.claude/settings.local.json 里按项目停用；`skillOverrides` 能在不修改技能的情况下' +
          '隐藏自己的技能（对插件技能不适用，那些请通过 /plugin 管理）。' +
          'MCP 工具定义默认是延迟加载的（在用到某个工具之前只加载名称和服务说明），' +
          '所以长长的 MCP 列表没有以前那么贵；/mcp 可以停用用不到的服务。运行 /context ' +
          '可以看到实际最花的是什么。',
        doc: `${DOCS.skills}`,
      }
    },
  },
  {
    id: 'heavy-dirs-not-denied',
    run(s) {
      const deny = SCOPES.flatMap((sc) => s.settings[sc].permissions?.deny ?? []).filter((d) =>
        String(d).startsWith('Read('),
      )
      const open = s.heavyDirs.filter((d) => !deny.some((rule) => rule.includes(`${d.name}/`)))
      if (!open.length) return null
      const names = [...new Set(open.map((d) => d.name))]
      return {
        severity: 'info',
        title: '大型生成目录没有从读取中排除',
        detail:
          open.map((d) => `${d.path}（${Math.round(d.bytes / 1e6)} MB）`).join('；') +
          '。没有忽略文件：支持的机制是用 permissions.deny 里的 Read 规则，' +
          '对 Grep 和 Glob 只是尽力而为。它们无法阻止通过 Bash 读取文件。',
        doc: 'https://code.claude.com/docs/en/permissions.md',
        fixes: [
          {
            scope: 'project',
            ops: [{ op: 'add', key: 'permissions.deny', values: names.map((n) => `Read(./**/${n}/**)`) }],
          },
        ],
      }
    },
  },
  {
    id: 'every-tool-hooks',
    run(s) {
      const events = ['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest']
      const perScope = SCOPES.map((scope) => {
        const hooks = s.settings[scope].hooks ?? {}
        return { scope, n: events.reduce((m, e) => m + (hooks[e] ?? []).filter((h) => h.matcher === '*').length, 0) }
      }).filter((x) => x.n)
      if (!perScope.length) return null
      const count = perScope.reduce((n, x) => n + x.n, 0)
      return {
        severity: 'info',
        title: '每次工具调用都会运行钩子',
        detail:
          `${count} 个工具事件钩子匹配 "*"，每次工具调用都会启动一个进程。这` +
          '花的是延迟而不是 token。如果钩子只关心部分工具，可以收窄匹配器。' +
          '只有当没有任何东西依赖这些事件时，才可以安全地删除：依赖这些钩子显示代理状态的工具' +
          '（终端管理器、仪表盘）会停止更新。' +
          '修复会在试运行之后，删除该范围内工具事件里的所有 "*" 条目。',
        doc: 'https://code.claude.com/docs/en/hooks.md',
        fixes: perScope.map(({ scope }) => ({ scope, ops: [{ op: 'dropHooks', matcher: '*' }] })),
      }
    },
  },
  {
    id: 'fast-mode-enabled',
    run(s) {
      const scopes = SCOPES.filter((sc) => s.settings[sc].fastMode === true)
      const optIn = SCOPES.some((sc) => s.settings[sc].fastModePerSessionOptIn === true)
      if (!scopes.length || optIn) return null
      return {
        severity: 'warn',
        title: '快速模式在每个会话都默认开启',
        detail:
          `\`fastMode: true\` 保存在 ${scopes.join(', ')} 设置中。快速模式的每个 token 更贵，` +
          '而且只在 Opus 上运行，因此每个会话都要按这个价格付费，不管是否真的需要速度。' +
          '`fastModePerSessionOptIn: true` 会保留这个设置，但要求你在需要时手动在会话中运行 /fast。',
        doc: 'https://code.claude.com/docs/en/settings-reference.md#fastmodepersessionoptin',
        fixes: [{ scope: scopes[0], ops: [{ op: 'set', key: 'fastModePerSessionOptIn', value: true }] }],
      }
    },
  },
  {
    id: 'code-intelligence-missing',
    run(s) {
      const have = (s.enabledPluginNames ?? []).map((n) => n.split('@')[0])
      const missing = (s.languageMarkers ?? []).filter((p) => !have.includes(p))
      if (!missing.length) return null
      return {
        severity: 'info',
        title: '这个项目没有语言服务器插件',
        detail:
          '项目里有某种语言的文件，而该语言有官方的代码智能插件：' +
          missing.map((p) => `/plugin install ${p}@claude-plugins-official`).join('；') +
          '。语言服务器让 Claude 在每次编辑后能跳转定义并看到类型错误，' +
          '从而少读候选文件，不运行编译器也能发现错误。' +
          '该插件需要 PATH 上有对应的语言服务器二进制文件。它在云会话中不可用。',
        doc: 'https://code.claude.com/docs/en/plugins/code-intelligence.md',
      }
    },
  },
  {
    id: 'settings-unreadable',
    run(s) {
      if (!s.unreadable.length) return null
      return {
        severity: 'error',
        title: '某个设置文件不是有效的 JSON',
        detail:
          `${s.unreadable.join(', ')} 存在但无法解析，所以其中的设置没有被审计` +
          '（Claude Code 启动时也会为它报 Settings Error）。设置文件是严格的 ' +
          'JSON：不能有注释，不能有多余的逗号。`claude doctor` 会列出 Claude Code 拒绝了什么。',
        doc: `${DOCS.settings}#fix-a-broken-settings-file`,
      }
    },
  },
  {
    id: 'compact-window-small',
    since: '2.1.288',
    run(s) {
      const values = [
        ...SCOPES.map((sc) => s.settings[sc].autoCompactWindow),
        ...SCOPES.flatMap((sc) => Object.values(s.settings[sc].modelSettings ?? {}).map((m) => m?.autoCompactWindow)),
      ].filter((v) => typeof v === 'number')
      const small = values.filter((v) => v < 150000)
      if (!small.length) return null
      return {
        severity: 'warn',
        title: '自动压缩窗口太小',
        detail:
          `窗口为 ${Math.min(...small).toLocaleString('en')} 个 token。压缩会读取整段对话，` +
          '每次都破坏提示缓存，所以频繁压缩可能得不偿失。' +
          '250K 到 400K 左右是合理范围；可接受的最小值是 100K。',
        doc: `${DOCS.model}#set-the-auto-compact-window`,
      }
    },
  },
  {
    id: 'prompt-caching-disabled',
    run(s) {
      const set = Object.keys(s.env).filter((k) => k.startsWith('DISABLE_PROMPT_CACHING') && truthy(s.env[k]))
      if (!set.length) return null
      return {
        severity: 'warn',
        title: '提示缓存被关闭',
        detail:
          `已设置 ${set.join(', ')}。没有缓存时，每个请求都要按完整的输入价格重新处理` +
          '整段对话。文档把这些变量描述为调试用途；日常使用请保持缓存开启。',
        doc: 'https://code.claude.com/docs/en/prompt-caching.md#disable-prompt-caching',
      }
    },
  },
  {
    id: 'prompt-cache-ttl-forced-short',
    since: '2.1.242',
    run(s) {
      if (!truthy(s.env.FORCE_PROMPT_CACHING_5M)) return null
      return {
        severity: 'info',
        title: '缓存有效期被强制为五分钟',
        detail:
          'FORCE_PROMPT_CACHING_5M 会覆盖其他所有 TTL 控制。暂停超过五分钟后，' +
          '下一条消息会以无缓存的方式重读完整上下文。文档推荐它用于' +
          '调试或比较 TTL；在提供一小时缓存的套餐上，这样会失去该优势。',
        doc: 'https://code.claude.com/docs/en/prompt-caching.md#choose-the-ttl-yourself',
      }
    },
  },
  {
    id: 'agent-teams-enabled',
    run(s) {
      if (!truthy(s.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS)) return null
      return {
        severity: 'info',
        title: '已启用代理团队',
        detail:
          '每个队友都有自己的上下文窗口，文档估计队友在计划模式下运行时，' +
          '团队大约消耗标准会话 7 倍的 token。团队规模要小，队友用 Sonnet，' +
          '工作完成后及时关闭。',
        doc: `${DOCS.costs}#agent-team-token-costs`,
      }
    },
  },
  {
    id: 'main-model-expensive',
    run(s) {
      const family = modelFamily(mainModel(s))
      if (family !== 'opus' && family !== 'fable') return null
      return {
        severity: 'info',
        title: `默认模型是 ${mainModel(s)}`,
        detail:
          '文档把默认留在 Opus 列为费用意外偏高的常见原因。对大多数' +
          '编码工作来说 Sonnet 就够了（`/model sonnet`，或在设置里写 `model`）。' +
          '如果整项工作都需要更强的模型，就保留它。',
        doc: `${DOCS.costs}#choose-the-right-model`,
      }
    },
  },
  {
    id: 'agents-inherit-model',
    run(s) {
      const inheriting = [...s.agents.user, ...s.agents.project].filter((a) => !a.model || a.model === 'inherit')
      if (!inheriting.length) return null
      const names = inheriting.map((a) => a.name)
      return {
        severity: 'info',
        title: '自定义代理使用主模型',
        detail:
          `${names.slice(0, 8).join('、')}${names.length > 8 ? `，以及另外 ${names.length - 8} 个` : ''} ` +
          '没有设置 `model`，因此使用主对话的模型。对只做搜索、运行命令或总结的代理，' +
          '请固定 `model: haiku` 或 `sonnet`；需要大量推理的代理则保持继承。',
        doc: `${DOCS.subagents}#choose-a-model`,
      }
    },
  },
  {
    id: 'compact-instructions-missing',
    run(s) {
      if (!s.instructionFiles.length || s.instructionFiles.some((f) => f.compactInstructions)) return null
      return {
        severity: 'info',
        title: '缺少“Compact instructions”小节',
        detail:
          '在 CLAUDE.md 里加一个 `# Compact instructions` 小节，可以告诉压缩要保留什么' +
          '（失败的测试输出、改过的文件、做出的决定）以及丢弃什么，这样总结不会丢失主线。' +
          '这一节要按你的项目来写，所以没有自动修复。',
        doc: `${DOCS.costs}#manage-context-proactively`,
      }
    },
  },
  {
    id: 'large-lockfile-readable',
    run(s) {
      const deny = SCOPES.flatMap((sc) => s.settings[sc].permissions?.deny ?? [])
      const open = s.lockfiles.filter((l) => !deny.some((rule) => String(rule).includes(l.name)))
      if (!open.length) return null
      return {
        severity: 'info',
        title: '大型 lockfile 可以被完整读取',
        detail:
          open.map((l) => `${l.name}（${Math.round(l.bytes / 1000)} KB）`).join('；') +
          '。模型一旦打开其中一个，就会把几万 token 花在本可以 grep 的内容上。' +
          '拒绝规则对搜索工具只是尽力而为，也不覆盖通过 Bash 的读取。',
        doc: 'https://code.claude.com/docs/en/permissions.md',
        fixes: [{ scope: 'project', ops: [{ op: 'add', key: 'permissions.deny', values: open.map((l) => `Read(./${l.name})`) }] }],
      }
    },
  },
  {
    id: 'duplicate-skills',
    run(s) {
      const dup = s.userSkillNames.filter((n) => s.projectSkillNames.includes(n))
      if (!dup.length) return null
      return {
        severity: 'info',
        title: '同名技能同时存在于用户级和项目级',
        detail: `${dup.join('、')}。每份副本都会往上下文里加一段描述；保留你想要的那份。`,
        doc: DOCS.skills,
      }
    },
  },
  {
    id: 'mcp-output-limit-raised',
    run(s) {
      const n = Number(s.env.MAX_MCP_OUTPUT_TOKENS)
      if (!Number.isFinite(n) || n <= 50000) return null
      return {
        severity: 'info',
        title: 'MCP 工具输出上限被调高',
        detail:
          `MAX_MCP_OUTPUT_TOKENS 为 ${n.toLocaleString('en')}。单个工具结果就可能给上下文` +
          '增加这么多内容，而且之后每个请求都会重读。只在某个服务确实需要时调高。',
        doc: 'https://code.claude.com/docs/en/env-vars.md',
      }
    },
  },
  {
    id: 'auto-compact-off',
    run(s) {
      // DISABLE_COMPACT turns /compact off too (env-vars.md), and with it the slide, which runs only
      // where Claude Code compacts.
      const vars = ['DISABLE_AUTO_COMPACT', 'DISABLE_COMPACT'].filter((k) => truthy(s.env[k]))
      const scopes = SCOPES.filter((sc) => s.settings[sc].autoCompactEnabled === false)
      if (!vars.length && !scopes.length) return null
      const where = [...vars, ...scopes.map((sc) => `autoCompactEnabled: false（${sc} 设置）`)]
      return {
        severity: 'warn',
        title: '自动压缩已关闭',
        detail:
          `${where.join('；')}。没有自动压缩，每个请求都会带上完整历史，直到模型窗口` +
          '填满，闲置压缩也一并关闭。仍可手动执行 /compact。',
        doc: `${DOCS.model}#set-the-auto-compact-window`,
        fixes: scopes.map((scope) => ({ scope, ops: [{ op: 'unset', key: 'autoCompactEnabled' }] })),
      }
    },
  },
  {
    id: 'idle-compaction-off',
    since: '2.1.290',
    run(s) {
      const scopes = SCOPES.filter((sc) => s.settings[sc].idleCompaction === false)
      if (!scopes.length) return null
      return {
        severity: 'info',
        title: '闲置压缩已关闭',
        detail:
          `\`idleCompaction: false\`（${scopes.join(', ')} 设置）。闲置压缩会在一小时提示缓存到期` +
          '前不久压缩较长的对话（默认 200K+ token），' +
          '这样休息后回来不会无缓存地重读整段历史。',
        doc: `${DOCS.settings.replace('settings.md', 'settings-reference.md')}#idlecompaction`,
        fixes: scopes.map((scope) => ({ scope, ops: [{ op: 'unset', key: 'idleCompaction' }] })),
      }
    },
  },
  {
    id: 'tool-search-off',
    run(s) {
      if (String(s.env.ENABLE_TOOL_SEARCH ?? '').toLowerCase() !== 'false') return null
      return {
        severity: s.mcpServers ? 'warn' : 'info',
        title: 'MCP 工具搜索已关闭',
        detail:
          'ENABLE_TOOL_SEARCH=false 会把每个 MCP 工具定义都加载进每个请求，而不是' +
          `等到使用时才加载${s.mcpServers ? `（已配置 ${s.mcpServers} 个 MCP 服务）` : ''}。` +
          '请取消设置，或改用 `auto`，让定义超过窗口 10% 时再延迟加载。',
        doc: 'https://code.claude.com/docs/en/mcp.md#configure-tool-search',
      }
    },
  },
  {
    id: 'bash-output-raised',
    run(s) {
      const setting = SCOPES.map((sc) => s.settings[sc].bashOutputMaxChars).find((v) => v !== undefined)
      const value = Number(setting ?? s.env.BASH_MAX_OUTPUT_LENGTH)
      if (!(value > 30000)) return null
      return {
        severity: 'info',
        title: 'Bash 输出上限被调高',
        detail:
          `${setting !== undefined ? 'bashOutputMaxChars' : 'BASH_MAX_OUTPUT_LENGTH'} 为 ${value} ` +
          '（默认 30,000 个字符）。长命令输出会在对话剩下的部分里一直留在上下文中，' +
          '并随每个请求重新发送。',
        doc: 'https://code.claude.com/docs/en/tools-reference.md#output-limits',
      }
    },
  },
  // The three below read the current docs (lib/docs.mjs); without them they say nothing.
  {
    id: 'settings-key-undocumented',
    run(s) {
      if (!s.docs) return null
      // Keys with a rule of their own, and the schema pointer editors use.
      const known = new Set(['$schema', 'autoCompactThreshold'])
      const found = SCOPES.flatMap((sc) => Object.keys(s.settings[sc]).filter((k) => !known.has(k) && !s.docs.settings.has(k)).map((k) => `${k} (${sc})`))
      if (!found.length) return null
      return {
        severity: 'warn',
        title: `${found.length} 个设置键不在 Claude Code 的文档里`,
        detail:
          `${found.join('、')}。Claude Code 会忽略不认识的键，所以拼错或已移除的键` +
          '会悄无声息地不起作用。请对照今天读取的设置参考检查拼写。',
        doc: 'https://code.claude.com/docs/en/settings-reference.md',
      }
    },
  },
  {
    id: 'env-undocumented',
    run(s) {
      if (!s.docs) return null
      // Variables of Claude Code's own families: anything else may well be for a tool or an MCP server.
      const ours = /^(CLAUDE_|ANTHROPIC_|DISABLE_|ENABLE_|MAX_|BASH_|MCP_|FORCE_)/
      const found = SCOPES.flatMap((sc) => Object.keys(s.settings[sc].env ?? {}).filter((k) => ours.test(k) && !s.docs.env.has(k)).map((k) => `${k} (${sc})`))
      if (!found.length) return null
      return {
        severity: 'info',
        title: `${found.length} 个环境变量看起来像 Claude Code 的，但没有文档`,
        detail:
          `${found.join('、')}，在 \`env\` 下设置。Claude Code 只读取它认识的变量：拼错或` +
          '已停用的变量不起作用。若这个变量是给其他程序用的，可以忽略此条。',
        doc: 'https://code.claude.com/docs/en/env-vars.md',
      }
    },
  },
  {
    id: 'setting-needs-newer-version',
    run(s) {
      if (!s.docs || !s.version) return null
      const newer = (v) => v && compareVersions(v, s.version) > 0
      const found = [
        ...SCOPES.flatMap((sc) => Object.keys(s.settings[sc]).filter((k) => newer(s.docs.settings.get(k))).map((k) => `${k} (needs ${s.docs.settings.get(k)})`)),
        ...SCOPES.flatMap((sc) => Object.keys(s.settings[sc].env ?? {}).filter((k) => newer(s.docs.env.get(k))).map((k) => `${k} (needs ${s.docs.env.get(k)})`)),
      ]
      if (!found.length) return null
      return {
        severity: 'warn',
        title: `${found.length} 项设置需要比 ${s.version} 更新的 Claude Code`,
        detail: `${[...new Set(found)].join('、')}。旧版本会忽略它们。请更新 Claude Code（\`claude update\`）。`,
        doc: 'https://code.claude.com/docs/en/setup.md#update-claude-code',
      }
    },
  },
  {
    id: 'compact-pct-override',
    run(s) {
      const raw = s.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE
      if (raw === undefined || raw === '') return null
      const pct = Number(raw)
      if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
        return {
          severity: 'error',
          title: 'CLAUDE_AUTOCOMPACT_PCT_OVERRIDE 不是百分比',
          detail: `当前为 "${raw}"；Claude Code 期望 1 到 100 的整数，其他值一律忽略。`,
          doc: 'https://code.claude.com/docs/en/env-vars.md',
        }
      }
      const window = Number(String(SCOPES.map((sc) => s.settings[sc].autoCompactWindow).find(Boolean) ?? '').replace(/k$/i, '000')) || null
      return {
        severity: pct < 50 ? 'warn' : 'info',
        title: `自动压缩在窗口的 ${pct}% 处触发`,
        detail:
          `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=${pct}${window ? `：约 ${Math.round((window * pct) / 100000)}K，窗口为 ${Math.round(window / 1000)}K` : ''}。` +
          '它只能把触发点调低（高于默认值的设置会被忽略），而且同样作用于子代理。' +
          '把 `autoCompactWindow` 设为该大小，可以在一处表达同样的意思，并在状态行显示正确的触发点。' +
          (pct < 50 ? '低于一半时压缩会很频繁，每次都会无缓存地重发整段对话。' : ''),
        doc: `${DOCS.model}#context-window-and-auto-compaction`,
      }
    },
  },
  {
    id: 'skill-model-switch',
    run(s) {
      // With no model set the default depends on the plan, so only a known main model is compared.
      const main = modelFamily(mainModel(s))
      if (!main) return null
      const switching = (s.skills?.models ?? []).filter((k) => !k.fork && modelFamily(k.model) !== main)
      if (!switching.length) return null
      return {
        severity: 'info',
        title: `${switching.length} 个技能在使用时会切换模型`,
        detail:
          `${switching.map((k) => `${k.name}（模型：${k.model}）`).join('、')}。frontmatter 里指定了其他模型的技能 ` +
          '相当于那一轮切换模型：每个模型有自己的提示缓存，所以请求会无缓存地读取整段' +
          '对话。用 `context: fork` 可以让技能以子代理身份在该模型上运行，主对话保留自己的缓存；' +
          '或者去掉 `model`，继续用会话的模型。',
        doc: 'https://code.claude.com/docs/en/prompt-caching.md#switching-models',
      }
    },
  },
  {
    id: 'opusplan-cache',
    run(s) {
      if (mainModel(s) !== 'opusplan') return null
      return {
        severity: 'info',
        title: 'opusplan 每次切换计划模式都会换模型',
        detail:
          '`opusplan` 在计划模式下用 Opus，其余时候用 Sonnet。每个模型有自己的提示缓存，所以每次' +
          '切换都会在切过去的模型上无缓存地读取整段对话。会话早期代价小，' +
          '长会话里代价大：可以开新会话做计划，或只选一个模型。',
        doc: 'https://code.claude.com/docs/en/prompt-caching.md#switching-models',
      }
    },
  },
  {
    id: 'slide-blocked-by-guard',
    run(s) {
      const on = SCOPES.some((sc) =>
        [USER_ID, ORG_ID].some((id) => s.settings[sc].pluginConfigs?.[id]?.options?.slide === true),
      )
      if (!on || !s.guard) return null
      const note = blockedNote(s.guard)
      if (!note) return null
      return {
        severity: 'warn',
        title: 'slide 已开启，但在这里无法运行',
        detail: note,
        doc: 'https://code.claude.com/docs/en/plugins/mods/admin.md#know-which-hooks-of-a-users-mod-dont-run',
      }
    },
  },
  {
    id: 'no-statusline',
    run(s) {
      if (SCOPES.some((sc) => s.settings[sc].statusLine)) return null
      return {
        severity: 'info',
        title: '没有状态行',
        detail:
          '状态行可以显示上下文占用和提示缓存状态（`context_window` 和 ' +
          '`prompt_cache` 字段），这是判断何时该 /clear 或压缩的最简单办法。' +
          '修复会安装一个小脚本，用一行不显眼的文字显示：模型、目录和分支，' +
          '上下文中的 token 与 Claude Code 压缩点的对比，提示缓存还能保持多久，' +
          '5 小时和每周限额（按近期速度会在重置前用完时显示“→ 100% in”），以及会话费用。' +
          '它需要 jq，是一个可以直接编辑的普通文件。' +
          '看同样信息的另一个办法：anthropics/claude-code-playground 里的 token-weather 模组' +
          '（claude-code/mods/token-weather）会在输入框上方的横条里画出上下文预测。' +
          '它需要 Claude Code 2.1.287 或更高版本，按原样分享，不是官方产品；' +
          '可以在 mods 目录下 clone 后用 `claude plugin marketplace add ./` 安装。',
        doc: 'https://code.claude.com/docs/en/statusline.md',
        fixes: [
          { scope: 'user', script: 'statusline.sh' },
          {
            scope: 'user',
            ops: [
              {
                op: 'set',
                key: 'statusLine',
                value: { type: 'command', command: `${s.configDir ?? '~/.claude'}/tokendoctor-statusline.sh`, refreshInterval: 30 },
              },
            ],
          },
        ],
      }
    },
  },
]

export function runRules(snapshot) {
  const findings = []
  for (const rule of RULES) {
    if (rule.since && snapshot.version && compareVersions(snapshot.version, rule.since) < 0) continue
    const f = rule.run(snapshot)
    if (f) findings.push({ id: rule.id, ...f })
  }
  const order = { error: 0, warn: 1, info: 2 }
  return findings.sort((a, b) => order[a.severity] - order[b.severity])
}

export const ruleIds = RULES.map((r) => r.id)
