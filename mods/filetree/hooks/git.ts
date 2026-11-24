import { drivesOn, isAbsolute, posix } from './tree'

export type GitAction = {
  kind: string
  verb: string
  running: string
  done: string
  tone: string
  icon: { nerd: string; plain: string }
  init?: boolean
}

const ICON = {
  commit: { nerd: '\u{f417}', plain: '●' },
  push: { nerd: '\u{f0552}', plain: '↑' },
  pull: { nerd: '\u{f0553}', plain: '↓' },
  branch: { nerd: '\u{f418}', plain: '⑂' },
  merge: { nerd: '\u{f419}', plain: '⑃' },
  pr: { nerd: '\u{f407}', plain: '⇄' },
  github: { nerd: '\u{f408}', plain: '◎' },
  stash: { nerd: '\u{f01bc}', plain: '≡' },
  undo: { nerd: '\u{f054c}', plain: '↶' },
  tag: { nerd: '\u{f412}', plain: '⌖' },
  git: { nerd: '\u{e702}', plain: '±' },
}

export const TONES: Record<string, { bright: string[]; dim: string[]; solid: string }> = {
  orange: { bright: ['#f97316', '#fb923c', '#fdba74', '#ffedd5'], dim: ['#8e491d', '#a3562a', '#bd7444', '#d29267'], solid: '#f97316' },
  green: { bright: ['#22c55e', '#4ade80', '#86efac', '#dcfce7'], dim: ['#2e6644', '#1b6838', '#2f7a47', '#4f9a66'], solid: '#4ade80' },
  teal: { bright: ['#14b8a6', '#2dd4bf', '#5eead4', '#ccfbf1'], dim: ['#1b665f', '#16786f', '#2a9488', '#4fb3a8'], solid: '#2dd4bf' },
  blue: { bright: ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'], dim: ['#40589c', '#1d4ed8', '#3b6fd1', '#6b93dc'], solid: '#60a5fa' },
  purple: { bright: ['#a855f7', '#c084fc', '#d8b4fe', '#f3e8ff'], dim: ['#76459d', '#7d3cb2', '#8b47c4', '#a874d6'], solid: '#c084fc' },
  cyan: { bright: ['#06b6d4', '#22d3ee', '#67e8f9', '#cffafe'], dim: ['#1c6379', '#0e7490', '#2b8ea3', '#5aa9b8'], solid: '#22d3ee' },
  red: { bright: ['#ef4444', '#f87171', '#fca5a5', '#fee2e2'], dim: ['#954343', '#a43434', '#b54040', '#c96a6a'], solid: '#f87171' },
}

export const LIGHT_TONES: Record<string, { bright: string[]; dim: string[]; solid: string }> = {
  orange: { bright: ['#7c2d12', '#69250e', '#561c0b', '#431407'], dim: ['#5d362e', '#52322c', '#482d2a', '#3e2828'], solid: '#7c2d12' },
  green: { bright: ['#14532d', '#0f4725', '#0a3a1e', '#052e16'], dim: ['#244b3d', '#214439', '#1e3d35', '#1b3731'], solid: '#14532d' },
  teal: { bright: ['#134e4a', '#0e4441', '#093937', '#042f2e'], dim: ['#23484d', '#204348', '#1e3d43', '#1b373e'], solid: '#134e4a' },
  blue: { bright: ['#1e3a8a', '#1c3378', '#192c66', '#172554'], dim: ['#293d70', '#283966', '#26355d', '#253253'], solid: '#1e3a8a' },
  purple: { bright: ['#581c87', '#4e157b', '#450e70', '#3b0764'], dim: ['#492d6f', '#442968', '#3f2562', '#39215b'], solid: '#581c87' },
  cyan: { bright: ['#164e63', '#114559', '#0d3c4e', '#083344'], dim: ['#25485b', '#224355', '#203e4f', '#1d394a'], solid: '#164e63' },
  red: { bright: ['#7f1d1d', '#6c1717', '#581010', '#450a0a'], dim: ['#5f2d34', '#542a31', '#49262d', '#3f232a'], solid: '#7f1d1d' },
}

const GIT_VERBS: Record<string, Omit<GitAction, 'kind'>> = {
  commit: { verb: 'commit', running: '正在提交', done: '已提交', tone: 'green', icon: ICON.commit },
  push: { verb: 'push', running: '正在推送', done: '已推送', tone: 'teal', icon: ICON.push },
  pull: { verb: 'pull', running: '正在拉取', done: '已拉取', tone: 'blue', icon: ICON.pull },
  fetch: { verb: 'fetch', running: '正在獲取', done: '已獲取', tone: 'blue', icon: ICON.pull },
  checkout: { verb: 'checkout', running: '正在檢出', done: '已檢出', tone: 'blue', icon: ICON.branch },
  switch: { verb: 'switch', running: '正在切換', done: '已切換', tone: 'blue', icon: ICON.branch },
  branch: { verb: 'branch', running: '正在建立分支', done: '已建立分支', tone: 'blue', icon: ICON.branch },
  merge: { verb: 'merge', running: '正在合併', done: '已合併', tone: 'purple', icon: ICON.merge },
  rebase: { verb: 'rebase', running: '正在變基', done: '已變基', tone: 'purple', icon: ICON.merge },
  'cherry-pick': { verb: 'cherry-pick', running: '正在挑選提交', done: '已挑選提交', tone: 'purple', icon: ICON.merge },
  stash: { verb: 'stash', running: '正在暫存', done: '已暫存', tone: 'orange', icon: ICON.stash },
  reset: { verb: 'reset', running: '正在重置', done: '已重置', tone: 'red', icon: ICON.undo },
  restore: { verb: 'restore', running: '正在還原', done: '已還原', tone: 'red', icon: ICON.undo },
  revert: { verb: 'revert', running: '正在撤銷', done: '已撤銷', tone: 'red', icon: ICON.undo },
  add: { verb: 'add', running: '正在暫存', done: '已暫存', tone: 'green', icon: ICON.git },
  rm: { verb: 'rm', running: '正在刪除', done: '已刪除', tone: 'red', icon: ICON.git },
  mv: { verb: 'mv', running: '正在移動', done: '已移動', tone: 'orange', icon: ICON.git },
  tag: { verb: 'tag', running: '正在打標籤', done: '已打標籤', tone: 'purple', icon: ICON.tag },
  init: { verb: 'init', running: '正在初始化', done: '已初始化', tone: 'green', icon: ICON.git, init: true },
  clone: { verb: 'clone', running: '正在克隆', done: '已克隆', tone: 'blue', icon: ICON.pull, init: true },
}

const GH_VERBS: Record<string, Omit<GitAction, 'kind'>> = {
  'pr create': { verb: 'pr create', running: '正在建立 PR', done: '已建立 PR', tone: 'purple', icon: ICON.pr },
  'pr merge': { verb: 'pr merge', running: '正在合併 PR', done: '已合併 PR', tone: 'purple', icon: ICON.merge },
  'pr checkout': { verb: 'pr checkout', running: '正在檢出 PR', done: '已檢出 PR', tone: 'blue', icon: ICON.pr },
  'pr comment': { verb: 'pr comment', running: '正在評論 PR', done: '已評論 PR', tone: 'purple', icon: ICON.pr },
  'pr review': { verb: 'pr review', running: '正在審查 PR', done: '已審查 PR', tone: 'purple', icon: ICON.pr },
  'repo clone': { verb: 'repo clone', running: '正在克隆', done: '已克隆', tone: 'blue', icon: ICON.github, init: true },
  'release create': { verb: 'release create', running: '正在釋出', done: '已釋出', tone: 'purple', icon: ICON.tag },
  'issue create': { verb: 'issue create', running: '正在建立議題', done: '已建立議題', tone: 'purple', icon: ICON.github },
}

const READ_ONLY_GIT = new Set(['status', 'log', 'diff', 'show', 'blame', 'rev-parse', 'ls-files', 'grep', 'describe', 'config', 'remote', 'reflog', 'shortlog', 'help', 'version', 'check-ignore'])

function segments(command: string, seps: string[] = []): string[][] {
  const out: string[][] = []
  let cur: string[] = []
  let tok = ''
  let quote = ''
  let has = false
  const endTok = () => {
    if (has) cur.push(tok)
    tok = ''
    has = false
  }
  const endSeg = () => {
    endTok()
    if (cur.length) out.push(cur)
    cur = []
  }
  for (let i = 0; i < command.length; i++) {
    const ch = command[i] ?? ''
    if (quote) {
      if (ch === quote) quote = ''
      else if (ch === '\\' && quote === '"' && i + 1 < command.length) tok += command[++i]
      else tok += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
      has = true
    } else if (ch === '\\' && i + 1 < command.length) {
      tok += command[++i]
      has = true
    } else if (ch === '#' && !has) {
      while (i + 1 < command.length && command[i + 1] !== '\n') i++
    } else if (ch === ' ' || ch === '\t') endTok()
    else if (ch === '\n' || ch === ';') {
      seps.push(';')
      endSeg()
    } else if (ch === '&' && (command[i - 1] === '>' || command[i + 1] === '>')) {
      tok += ch
      has = true
    } else if (ch === '&' || ch === '|') {
      const twice = command[i + 1] === ch
      if (twice) i++
      seps.push(twice ? ch + ch : ch)
      endSeg()
    } else {
      tok += ch
      has = true
    }
  }
  endSeg()
  if (!quote) return out
  seps.push(';')
  return command
    .split(/&&|\|\||;|\||\n/)
    .map(s => s.trim().split(/\s+/).filter(Boolean))
    .filter(s => s.length > 0)
}

function stripGlobals(tokens: string[]): string[] {
  const out = [...tokens]
  if (out[0] === 'env') out.shift()
  while (out.length && /^[A-Z_][A-Z0-9_]*=/.test(out[0] ?? '')) out.shift()
  return out
}

function gitVerb(tokens: string[]): number {
  let i = 1
  while (i < tokens.length && (tokens[i] ?? '').startsWith('-')) {
    if (tokens[i] === '-C' || tokens[i] === '-c') i++
    i++
  }
  return i
}

function gitReadOnly(verb: string, rest: string[]): boolean {
  if (!verb || READ_ONLY_GIT.has(verb)) return true
  if (verb === 'stash') return ['list', 'show'].includes(rest[0] ?? '')
  if (verb === 'branch') return rest.every(t => t.startsWith('-'))
  if (verb === 'tag') return rest.length === 0 || rest.some(t => /^(-l|--list|-n\d*|--contains|--points-at|--merged|--no-merged|-v|--verify)$/.test(t))
  return false
}

export function chainOf(command: string): { size: number; and: boolean } {
  const seps: string[] = []
  const size = segments(command, seps).length
  return { size, and: seps.every(s => s === '&&') }
}

export function gitActions(command: string): GitAction[] {
  const out: GitAction[] = []
  for (const raw of segments(command)) {
    const tokens = stripGlobals(raw)
    const head = tokens[0]?.split('/').pop()
    if (head === 'git') {
      const i = gitVerb(tokens)
      const verb = tokens[i] ?? ''
      const rest = tokens.slice(i + 1)
      if (gitReadOnly(verb, rest)) continue
      const spec = verb === 'checkout' && rest.includes('--') ? GIT_VERBS.restore : GIT_VERBS[verb]
      if (spec) out.push({ kind: `git ${verb}`, ...spec })
    } else if (head === 'gh') {
      const pair = `${tokens[1] ?? ''} ${tokens[2] ?? ''}`
      const spec = GH_VERBS[pair]
      if (spec) out.push({ kind: `gh ${pair}`, ...spec })
    }
  }
  return out
}

export const BRANCH_ICON = ICON.branch

const READERS = new Set(['rg', 'grep', 'egrep', 'fgrep', 'find', 'fd', 'fdfind', 'cat', 'head', 'tail', 'bat', 'less', 'more', 'ls', 'eza', 'tree', 'wc', 'sed', 'awk', 'jq'])
const PATTERN_FIRST = new Set(['rg', 'grep', 'egrep', 'fgrep', 'sed', 'awk', 'jq'])
const OUTPUT_PATHS = new Set(['rg', 'grep', 'egrep', 'fgrep', 'find', 'fd', 'fdfind'])

function tidy(path: string): string {
  const s = path.replace(/\/+$/, '')
  return s === '' ? '/' : /^[A-Za-z]:$/.test(s) && isAbsolute(`${s}/`) ? `${s}/` : s
}

export function resolve(cwd: string, p: string, home = ''): string {
  let path = posix(p)
  if (home && (path === '~' || path.startsWith('~/'))) path = home + path.slice(1)
  const drive = isAbsolute(path) && !path.startsWith('/') ? path.slice(0, 2) : ''
  const parts = isAbsolute(path) ? [drive] : posix(cwd).replace(/\/+$/, '').split('/')
  for (const seg of path.slice(drive.length).split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') {
      if (parts.length > 1) parts.pop()
    } else parts.push(seg)
  }
  return tidy(parts.join('/'))
}

const WRITE_FLAGS = /^-(delete|exec|execdir|ok|okdir|fprint\w*|fls|x|X|-exec|-exec-batch)$/

export function readOnly(command: string): boolean {
  const bare = ` ${command}`.replace(/\d*>&\d/g, ' ').replace(/(\d*|&)>>?\s*\/dev\/null/g, ' ')
  if (/[^>]>[^>&]|>>/.test(bare)) return false
  return segments(command).every(raw => {
    const tokens = stripGlobals(raw)
    const head = tokens[0]?.split('/').pop() ?? ''
    if (head === 'cd' || head === 'echo' || head === 'printf' || head === 'true' || head === 'pwd') return true
    if (head === 'git') {
      const i = gitVerb(tokens)
      return gitReadOnly(tokens[i] ?? '', tokens.slice(i + 1))
    }
    if (head === 'sed') return !tokens.some(t => t.startsWith('-i'))
    if (head === 'find' || head === 'fd' || head === 'fdfind') return !tokens.some(t => WRITE_FLAGS.test(t))
    return READERS.has(head)
  })
}

export function readTargets(command: string, sessionCwd: string, stdout: string, home = ''): string[] {
  let cwd = sessionCwd
  const out = new Set<string>()
  let listsPaths = false
  for (const raw of segments(command)) {
    const tokens = stripGlobals(raw).map(t => posix(t.replace(/^["']|["']$/g, '')))
    const head = tokens[0]?.split('/').pop() ?? ''
    if (head === 'cd' && tokens[1]) {
      cwd = resolve(cwd, tokens[1], home)
      continue
    }
    if (!READERS.has(head)) continue
    if (head === 'sed' && tokens.some(t => t.startsWith('-i'))) continue
    if (OUTPUT_PATHS.has(head)) listsPaths = true
    const args = tokens.slice(1)
    let skipPattern = PATTERN_FIRST.has(head) && !args.some(t => t === '-e' || t === '-f' || t === '--files')
    for (let i = 0; i < args.length; i++) {
      const a = args[i] ?? ''
      if (a.startsWith('-')) {
        if (/^-(e|f|g|t|T|m|A|B|C|-glob|-type|-max-count|name|iname|maxdepth|mindepth)$/.test(a)) i++
        continue
      }
      if (skipPattern) {
        skipPattern = false
        continue
      }
      if (/[*?<>|]/.test(a)) continue
      out.add(resolve(cwd, a, home))
    }
  }
  if (listsPaths) {
    for (const line of stdout.split('\n').slice(0, 400)) {
      const path = posix(line).match(drivesOn() ? /^((?:[A-Za-z]:)?[^:\0]+?)(?::\d+[:-]|$|:)/ : /^([^:\0]+?)(?::\d+[:-]|$|:)/)?.[1]?.trim()
      if (path && !path.includes(' ')) out.add(resolve(cwd, path, home))
    }
  }
  return [...out].slice(0, 60)
}
