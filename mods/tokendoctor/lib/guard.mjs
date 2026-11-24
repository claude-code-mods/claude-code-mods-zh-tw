// Whether the slide can run here, and what makes it run where it cannot.
//
// Claude Code seats a built-in mod, sec-default@builtin (`cc-plugin-sec-default`), ahead of every mod
// a person installs when the machine has managed settings or the session signs in with a Team or
// Enterprise /login (plugins/mods/admin.md#know-what-happens-by-default). Its `session.compact` hook
// is `next.to(e, 'append')`: compaction skips the mods a person installed, so the slide never runs and
// Claude Code summarizes as it would without tokendoctor. No other event lets a mod rewrite rows
// already in the conversation (`session.append` reaches only new rows, `turn.step` pins the messages).
//
// A mod that counts as the organization's runs where the guard sends the event on: listed in
// `appendPlugins`, enabled in managed settings, loaded in place from a marketplace directory that
// managed settings name by absolute path (plugins/mods/admin.md#install-your-organizations-mods).
// `tokendoctor-org-install` sets that up with a drop-in file in managed-settings.d, so an existing
// managed-settings.json is never touched.
//
// Pure: the callers read the files (bin/ with node:fs, the hooks module with $.fs).

export const ORG_MARKETPLACE = 'tokendoctor-org'
export const ORG_ID = `tokendoctor@${ORG_MARKETPLACE}`
export const USER_ID = 'tokendoctor@tokendoctor'
export const DROP_IN = '50-tokendoctor.json'

/** The system folder Claude Code reads managed settings files from (managed-settings.md). */
export function systemDir(platform = process.platform) {
  if (platform === 'darwin') return '/Library/Application Support/ClaudeCode'
  if (platform === 'win32') return 'C:\\Program Files\\ClaudeCode'
  return '/etc/claude-code'
}

const join = (platform, ...parts) => parts.join(platform === 'win32' ? '\\' : '/')

/** Where the installer puts the marketplace, the plugin copy and the drop-in. */
export function orgPaths(platform = process.platform) {
  const dir = systemDir(platform)
  const marketplace = join(platform, dir, ORG_MARKETPLACE)
  return {
    dir,
    marketplace,
    plugin: join(platform, marketplace, 'tokendoctor'),
    dropInDir: join(platform, dir, 'managed-settings.d'),
    dropIn: join(platform, dir, 'managed-settings.d', DROP_IN),
  }
}

/** The drop-in that makes the copy the organization's, run after the guard. */
export function dropInSettings(platform = process.platform) {
  return {
    extraKnownMarketplaces: {
      [ORG_MARKETPLACE]: { source: { source: 'directory', path: orgPaths(platform).marketplace } },
    },
    enabledPlugins: { [ORG_ID]: true },
    appendPlugins: [ORG_ID],
  }
}

export function marketplaceManifest() {
  return {
    name: ORG_MARKETPLACE,
    owner: { name: 'tokendoctor' },
    description: 'tokendoctor 作为本机自己的模组安装，因此它的 slide 在内置守卫之后运行。',
    plugins: [{ name: 'tokendoctor', source: './tokendoctor', description: '原地加载的 tokendoctor' }],
  }
}

const has = (o) => o && typeof o === 'object' && Object.keys(o).length > 0
const isTeamOrg = (type) => typeof type === 'string' && /team|enterprise/i.test(type)

/**
 * @param {object} i
 * @param {object} [i.account]   `oauthAccount` from ~/.claude.json (organizationType)
 * @param {object} [i.env]       the environment the session starts with
 * @param {object} [i.managed]   the managed settings files merged (managed-settings.json + .d/*.json); {} when none
 * @param {boolean} [i.mdm]      a macOS profile or HKLM policy is present
 * @param {object} [i.remote]    the cached server-managed settings (~/.claude/remote-settings.json)
 * @param {string} [i.root]      the running copy's plugin root, when known
 * @param {string} [i.platform]
 */
export function guardState({ account, env = {}, managed = {}, mdm = false, remote = {}, root, platform = process.platform } = {}) {
  // A session on an API key, a long-lived token or a cloud provider is not a /login (admin.md).
  const otherCredential = ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY'].find(
    (k) => env[k] !== undefined && env[k] !== '' && env[k] !== '0',
  )
  const teamLogin = !otherCredential && isTeamOrg(account?.organizationType)
  const managedPresent = has(managed) || mdm || has(remote)
  const reasons = [
    teamLogin && `你登录的是 ${/enterprise/i.test(account.organizationType) ? 'Enterprise' : 'Team'} 套餐`,
    managedPresent && '这台机器有托管设置',
  ].filter(Boolean)
  const seated = reasons.length > 0

  // The first managed source with a policy key wins (managed-settings.md, "first-wins"): a server
  // policy or an MDM profile hides the files, the drop-in among them, unless one asks to merge.
  const merging = (remote.managedSourcesBehavior ?? managed.managedSourcesBehavior) === 'merge'
  const filesHidden = !merging && (has(remote) || mdm)
  const paths = orgPaths(platform)
  const listed = Array.isArray(managed.appendPlugins) && managed.appendPlugins.includes(ORG_ID)
  const enabled = managed.enabledPlugins?.[ORG_ID] === true
  const source = managed.extraKnownMarketplaces?.[ORG_MARKETPLACE]?.source
  const inPlace = source?.source === 'directory' && source.path === paths.marketplace
  const orgInstalled = listed && enabled && inPlace && !filesHidden
  // Started from --plugin-dir or the marketplace copy, the running mod is the person's; from the
  // system folder it is the organization's.
  const runningOrgCopy = typeof root === 'string' && root.startsWith(paths.marketplace)

  return {
    seated,
    reasons,
    orgInstalled,
    runningOrgCopy,
    filesHidden,
    /** The slide runs: no guard, or this copy is the one the organization runs after it. */
    slideRuns: !seated || runningOrgCopy || (root === undefined && orgInstalled),
  }
}

/** One paragraph for /tokendoctor, the audit and the toast: why the slide is off and the way out. */
export function blockedNote(state) {
  if (state.slideRuns) return null
  const why = state.reasons.join(' and ')
  const fix = state.filesHidden
    ? '你的组织下发自己的托管设置，它会隐藏本机上的任何文件：请让管理员把 tokendoctor 加为组织模组（plugins/mods/admin.md）。'
    : state.orgInstalled
      ? 'tokendoctor 已作为本机模组安装：请重启 Claude Code，让它加载那份副本，而不是当前这份。'
      : '运行 `tokendoctor-org-install`（先试运行，再执行它打印出的那条 sudo 命令），把 tokendoctor 安装为本机自己的模组，它就会在守卫之后运行。`tokendoctor-org-install --uninstall` 可以撤销。'
  return (
    `slide 在这里无法运行：${why}，所以 Claude Code 会把内置守卫（cc-plugin-sec-default）安排在你安装的模组之前，` +
    '并把压缩事件绕过它们发送。Claude Code 会照常进行总结。' +
    fix
  )
}
