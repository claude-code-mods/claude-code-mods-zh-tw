// The settings tokendoctor-set may change: keys that move token use or cost, each checked against
// settings-reference.md or env-vars.md. `live`: Claude Code reloads settings files on change, except
// model and effortLevel (settings.md#when-edits-take-effect); env values are read at session start.
// Hooks, permissions and anything that widens what Claude
// may do are deliberately absent, so a model driving this tool cannot grant itself more.
const n = (min, max) => (v) => Number.isInteger(v) && v >= min && v <= max
const oneOf = (...xs) => (v) => xs.includes(v)
const bool = (v) => typeof v === 'boolean'
const str = (v) => typeof v === 'string' && v.length > 0 && v.length < 200
// A model alias or a full model id: anything else would be sent to the API as a model name.
const model = (v) => typeof v === 'string' && /^(default|best|opusplan|(opus|sonnet|haiku|fable)(\[1m\])?|claude-[a-z0-9.-]+(\[1m\])?)$/.test(v)
const envNum = (min, max) => (v) => /^\d+$/.test(String(v)) && Number(v) >= min && Number(v) <= max

export const TUNABLES = {
  autoCompactWindow: { check: n(100000, 1000000), live: true, about: 'tokens in context before auto-compaction' },
  autoCompactEnabled: { check: bool, live: true, about: 'automatic compaction on or off' },
  idleCompaction: { check: bool, live: true, about: 'compact a long idle conversation before its one-hour cache expires' },
  model: { check: model, live: false, about: 'default model for new sessions' },
  advisorModel: { check: model, live: true, about: 'advisor model' },
  effortLevel: { check: oneOf('low', 'medium', 'high', 'xhigh'), live: false, about: 'reasoning effort' },
  alwaysThinkingEnabled: { check: bool, live: true, about: 'extended thinking by default' },
  fastMode: { check: bool, live: true, about: 'fast mode (higher price per token)' },
  fastModePerSessionOptIn: { check: bool, live: true, about: 'fast mode only after /fast in a session' },
  includeGitInstructions: { check: bool, live: true, about: 'built-in git instructions and status in the system prompt' },
  bashOutputMaxChars: { check: n(1000, 150000), live: true, about: 'Bash output kept inline' },
  promptSuggestionEnabled: { check: bool, live: true, about: 'prompt suggestions (a small request after each reply)' },
  skillListingBudgetFraction: { check: (v) => typeof v === 'number' && v > 0 && v <= 0.1, live: true, about: 'share of context for the skill listing' },
  skillListingMaxDescChars: { check: n(100, 5000), live: true, about: 'characters per skill description in the listing' },
  outputStyle: { check: str, live: true, about: 'output style' },
  cleanupPeriodDays: { check: n(1, 3650), live: true, about: 'days transcripts are kept' },
  disableClaudeAiConnectors: { check: bool, live: true, about: 'claude.ai connectors off' },
  promptCacheTtl: { check: oneOf('5m', '1h'), live: true, about: 'main-conversation prompt cache TTL' },
  subagentPromptCacheTtl: { check: oneOf('5m', '1h'), live: true, about: 'subagent prompt cache TTL' },
  // tokendoctor's own options, kept where Claude Code keeps a plugin's: pluginConfigs.
  'tokendoctor.slide': { path: 'pluginConfigs.tokendoctor@tokendoctor.options.slide', check: bool, live: false, about: 'where Claude Code compacts, elide old tool outputs instead of summarizing the conversation' },
  'tokendoctor.slideTo': { path: 'pluginConfigs.tokendoctor@tokendoctor.options.slideTo', check: n(20, 90), live: false, about: 'how far a slide frees the context, in percent of where Claude Code compacts' },
  'env.CLAUDE_CODE_SUBAGENT_MODEL': { check: model, live: false, about: 'model for subagents without their own' },
  'env.CLAUDE_CODE_EFFORT_LEVEL': { check: oneOf('low', 'medium', 'high', 'xhigh', 'max'), live: false, about: 'effort, over /effort and effortLevel' },
  'env.CLAUDE_CODE_AUTO_COMPACT_WINDOW': { check: (v) => /^(\d+[kK]?|1[mM])$/.test(String(v)), live: false, about: 'auto-compact window, over the setting' },
  'env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE': { check: envNum(1, 100), live: false, about: 'percent of the window where auto-compaction triggers (can only lower it)' },
  'env.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS': { check: envNum(100000, 1000000), live: false, about: 'context size from which idle compaction applies (default 200,000)' },
  maxEffortLevel: { check: oneOf('low', 'medium', 'high', 'xhigh', 'max'), live: true, about: 'highest effort any session, skill or subagent may use' },
  'env.MAX_MCP_OUTPUT_TOKENS': { check: envNum(1000, 200000), live: false, about: 'MCP tool output limit' },
  'env.BASH_MAX_OUTPUT_LENGTH': { check: envNum(1000, 150000), live: false, about: 'Bash output limit (bashOutputMaxChars wins)' },
  'env.ENABLE_TOOL_SEARCH': { check: (v) => /^(true|false|auto(:\d+)?)$/.test(String(v)), live: false, about: 'defer MCP tool definitions' },
  'env.CLAUDE_CODE_MAX_OUTPUT_TOKENS': { check: envNum(1000, 200000), live: false, about: 'max output tokens per response' },
  'env.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS': { check: envNum(1000, 200000), live: false, about: 'Read tool output limit' },
  'env.CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS': { check: oneOf('1', '0'), live: false, about: 'drop built-in git instructions' },
}

/** The same descriptions in the interface's language (lib/console.mjs, bin/tokendoctor-set). */
export const ABOUT = {
  autoCompactWindow: '自动压缩前上下文中的 token 数',
  autoCompactEnabled: '自动压缩的开或关',
  idleCompaction: '在一小时缓存到期前压缩长时间闲置的对话',
  model: '新会话的默认模型',
  advisorModel: '顾问模型',
  effortLevel: '推理强度',
  alwaysThinkingEnabled: '默认启用扩展思考',
  fastMode: '快速模式（每个 token 价格更高）',
  fastModePerSessionOptIn: '仅在会话中输入 /fast 后启用快速模式',
  includeGitInstructions: '系统提示中的内置 git 指令和状态',
  bashOutputMaxChars: '保留在上下文中的 Bash 输出',
  promptSuggestionEnabled: '提示建议（每次回复后发一个小请求）',
  skillListingBudgetFraction: '技能列表占用的上下文比例',
  skillListingMaxDescChars: '列表中每个技能描述的字符数',
  outputStyle: '输出风格',
  cleanupPeriodDays: '对话记录保留的天数',
  disableClaudeAiConnectors: '关闭 claude.ai 连接器',
  promptCacheTtl: '主对话的提示缓存 TTL',
  subagentPromptCacheTtl: '子代理的提示缓存 TTL',
  'tokendoctor.slide': '在 Claude Code 会压缩的地方省略旧工具输出，而不是总结对话',
  'tokendoctor.slideTo': '滑动释放上下文的程度，按 Claude Code 压缩点的百分比计算',
  'env.CLAUDE_CODE_SUBAGENT_MODEL': '未单独指定模型的子代理所用模型',
  'env.CLAUDE_CODE_EFFORT_LEVEL': '推理强度，优先于 /effort 和 effortLevel',
  'env.CLAUDE_CODE_AUTO_COMPACT_WINDOW': '自动压缩窗口，优先于同名设置',
  'env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE': '触发自动压缩的窗口百分比（只能降低）',
  'env.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS': '闲置压缩开始的上下文大小（默认 200,000）',
  maxEffortLevel: '任何会话、技能或子代理可用的最高推理强度',
  'env.MAX_MCP_OUTPUT_TOKENS': 'MCP 工具输出上限',
  'env.BASH_MAX_OUTPUT_LENGTH': 'Bash 输出上限（bashOutputMaxChars 优先）',
  'env.ENABLE_TOOL_SEARCH': '延迟加载 MCP 工具定义',
  'env.CLAUDE_CODE_MAX_OUTPUT_TOKENS': '每次回复的最大输出 token 数',
  'env.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS': 'Read 工具输出上限',
  'env.CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS': '移除内置的 git 指令',
}

export function aboutOf(key) {
  return ABOUT[key] ?? TUNABLES[key]?.about ?? key
}

// Parses a command-line value as JSON when it is one (true, 400000, "1h"), else keeps the text.
export function parseValue(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

// Returns the settings op for a change, or throws with the reason it is refused.
export function tunableOp(key, value) {
  const t = TUNABLES[key]
  if (!t) throw new Error(`"${key}" is not a setting tokendoctor changes. Allowed: ${Object.keys(TUNABLES).join(', ')}`)
  const path = t.path ?? key
  if (value === undefined) return { op: 'unset', key: path }
  const v = key.startsWith('env.') ? String(value) : value
  if (!t.check(v)) throw new Error(`${JSON.stringify(value)} is not a valid value for ${key} (${t.about})`)
  return { op: 'set', key: path, value: v }
}
