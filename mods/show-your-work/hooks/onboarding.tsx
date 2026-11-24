// First run and settings: the settings pane, the welcome and the tour.
import { atom, update } from 'claude-code'
import type { EngineInterface } from 'claude-code'

import type { Shown } from '../types'

import { SETTINGS, settings, state } from './state'
import type { Field } from './state'
import { act, flush, startTelemetry, track } from './telemetry'
import { prepare } from './media'
import { preparedOf } from './history'
import { BRANCHES, checkForUpdate, findUpdate, installUpdate, PLUGIN } from './updater'
import type { Found } from './updater'
import { STOPS } from './tour'
import type { Stop } from './tour'
import { atStep, play, player, players, redraw, stop, Viewer } from './player'
import type { Ui } from './player'

// ── Settings and welcome ─────────────────────────────────────────────────

export const WELCOME = 'show-your-work-welcome'
// The settings pane's and the tour's redraws. Declared in each file that
// reads or updates it: the engine only reads an atom declared in the same file.
const welcome = atom({ plugin: 'show-your-work', key: 'welcome' } as const, 0)

// A no to usage data given before these settings (0.5.12's question, 0.5.16's command) stays a no.
// Updates are on for everyone: fixes have to reach every install.
export const earlierNo = (consent: unknown, statsOff: unknown, updatesOff: unknown) => {
  const asked = consent && typeof consent === 'object' ? consent as { stats?: unknown; updates?: unknown } : {}
  return { isStatsOff: statsOff === true || asked.stats === false, isUpdatesOff: updatesOff === true || asked.updates === false }
}

// Reads the saved settings once per plugin load. A reload starts with the
// defaults in memory, and without this pictures would be laid out as Standard
// until the next session start.
let hasLoadedSettings = false
export async function ensureSettings($: EngineInterface) {
  if (hasLoadedSettings) return
  hasLoadedSettings = true
  // Unreadable (no store): the defaults stand.
  await loadSettings($).catch(() => undefined)
}

export async function loadSettings($: EngineInterface) {
  const saved = ((await $.store.get('settings')) ?? {}) as Partial<Record<Field, unknown>>
  if (typeof saved.usage_stats !== 'boolean' && earlierNo(await $.store.get('consent'), await $.store.get('statsOff'), null).isStatsOff) settings.usage_stats = false
  for (const { field } of SETTINGS) if (typeof saved[field] === 'boolean') settings[field] = saved[field] as boolean
}

async function switchSetting($: EngineInterface, field: Field, value: boolean) {
  // The saved choices, not this module's copy: a reload resets the copy.
  await loadSettings($)
  settings[field] = value
  act(`setting_${field}_${value ? 'first' : 'second'}`)
  await $.store.set('settings', { ...settings })
  // The profile keeps the install's current choice of update channel.
  if (field === 'stable_updates') track('settings_changed', { $set: { update_channel: value ? 'stable' : 'latest' } })
  if (field === 'standard_size') {
    track('settings_changed', { $set: { picture_size: value ? 'standard' : 'large' } })
    // Players already on screen redraw at the new size.
    redraw($)
  }
  // Turning usage data off sends one last signal saying so, then nothing more.
  if (field === 'usage_stats' && !value && state.isOn) {
    track('usage_data_turned_off', { $set: { usage_data: 'off' } })
    await flush($).catch(() => undefined)
  }
  // Off means off: nothing queued is kept for later.
  if (field === 'usage_stats' && !value) {
    state.isOn = false
    state.queue = []
  }
  if (field === 'usage_stats' && value && state.isWelcomed) await startTelemetry($, state.statsContext)
  // A new channel is followed now.
  if (field === 'stable_updates' && state.isWelcomed) {
    await $.store.set('updateCheckedAt', 0)
    void checkForUpdate($, state.pluginVersion, value ? BRANCHES.stable : BRANCHES.latest).catch(() => undefined)
  }
  await update($, welcome, n => n + 1)
}

// Updates and usage counts wait for the welcome on a first run, so a switch
// turned off there is off before anything is sent.
export async function startBackground($: EngineInterface) {
  if (hasStarted) return
  hasStarted = true
  if (settings.usage_stats) await startTelemetry($, state.statsContext)
  await checkForUpdate($, state.pluginVersion, settings.stable_updates ? BRANCHES.stable : BRANCHES.latest)
}

// The first run (see 'toured'): the plugin runs /show-your-work once, and its output row
// in the chat draws the welcome. That run answers with WELCOME_TEXT, which is
// how its row is told from the person's own /show-your-work.
export const WELCOME_TEXT = 'show-your-work is installed and ready.'
export async function openWelcome($: EngineInterface) {
  await prepareSplash($).catch(() => undefined)
  await finishWelcome($)
  await openTour($)
}

// /show-your-work update opens this pane. It checks GitHub for the newest
// version on the person's channel (Stable or Latest) right away, skipping the
// once-a-day limit, then offers Install. Nothing installs until they press it.
export const UPDATE = 'show-your-work-update'
type UpdateCheck =
  | { phase: 'checking' }
  | { phase: 'found'; found: Found }
  | { phase: 'installing'; latest: string }
  | { phase: 'installed'; latest: string }
  | { phase: 'failed' }
let updateCheck: UpdateCheck = { phase: 'checking' }
export async function openUpdate($: EngineInterface) {
  updateCheck = { phase: 'checking' }
  await $.ui.open({ id: UPDATE, title: '更新', focus: true, closeOnEscape: true, holdToasts: true, rows: 9, columns: 70 })
  await update($, welcome, n => n + 1)
  await loadSettings($)
  const branch = settings.stable_updates ? BRANCHES.stable : BRANCHES.latest
  const found = await findUpdate($, state.pluginVersion, branch).catch((): Found => ({ kind: 'offline' }))
  updateCheck = { phase: 'found', found }
  await update($, welcome, n => n + 1)
}

async function installFound($: EngineInterface, found: Extract<Found, { kind: 'update' | 'move' }>) {
  act('update_install')
  updateCheck = { phase: 'installing', latest: found.latest }
  await update($, welcome, n => n + 1)
  const isDone = await installUpdate($, found, state.pluginVersion).catch(() => false)
  updateCheck = isDone ? { phase: 'installed', latest: found.latest } : { phase: 'failed' }
  await update($, welcome, n => n + 1)
}

export function UpdatePane(ui: Ui, $: EngineInterface) {
  const { Box, Text, Button } = ui
  const channel = settings.stable_updates ? '穩定版' : '最新版'
  const close = <Button key="update-close" label="關閉" onPress={() => void $.ui.close({ id: UPDATE })} />
  const c = updateCheck
  const found = c.phase === 'found' ? c.found : null
  // Each outcome of the check sets a bold headline, a dim second line, and
  // the buttons. Install shows only when there is a newer version.
  let head = '正在檢查更新…'
  let line = `當前版本 ${state.pluginVersion} · ${channel}`
  let actions: Ui[] = []
  if (found?.kind === 'update' || found?.kind === 'move') {
    head = `版本 ${found.latest} 可供安裝`
    actions = [<Button key="update-install" variant="primary" label="安裝" onPress={() => void installFound($, found)} />, close]
  } else if (found?.kind === 'current') {
    head = '你已安裝最新版本'
    actions = [close]
  } else if (found?.kind === 'pending') {
    head = `已安裝版本 ${found.latest}`
    line = '重啟 Claude Code 即可開始使用。'
    actions = [close]
  } else if (found?.kind === 'folder') {
    head = '此副本從資料夾執行，因此不會更新'
    actions = [close]
  } else if (found?.kind === 'busy') {
    head = '正在安裝更新'
    line = '請稍後再檢查。'
    actions = [close]
  } else if (found?.kind === 'pinned') {
    head = `此安裝已固定到 ${found.ref}，因此不會更新`
    actions = [close]
  } else if (found?.kind === 'no_cli') {
    head = '找不到 Claude Code 的命令'
    line = '請手動更新：claude plugin update show-your-work@iamumeransari'
    actions = [close]
  } else if (found?.kind === 'offline') {
    head = '無法檢查更新'
    line = '請檢查網路連線，然後再次執行 /show-your-work update。'
    actions = [close]
  } else if (c.phase === 'installing') {
    head = `正在安裝 ${c.latest}…`
  } else if (c.phase === 'installed') {
    head = `已安裝版本 ${c.latest}`
    line = '重啟 Claude Code 即可開始使用。'
    actions = [close]
  } else if (c.phase === 'failed') {
    head = '無法安裝更新'
    line = `請重試，或執行：claude plugin update ${PLUGIN}@iamumeransari`
    actions = [close]
  }
  return (
    <Box flexDirection="column" paddingX={2} paddingBottom={1}>
      <Text bold>{head}</Text>
      <Text dimColor>{line}</Text>
      {actions.length > 0 && <Box flexDirection="row" columnGap={2} marginTop={1}>{actions}</Box>}
    </Box>
  )
}

// /show-your-work: the switches, in a pane.
export async function openSettings($: EngineInterface) {
  await $.ui.open({ id: WELCOME, title: '設定', focus: true, closeOnEscape: true, holdToasts: true, rows: 10, columns: 70 })
  await update($, welcome, n => n + 1)
}

let hasStarted = false
async function finishWelcome($: EngineInterface) {
  if (state.isWelcomed) return
  state.isWelcomed = true
  // Where pictures can't show yet, the tour waits for a session where they do.
  if (state.canImage) await $.store.set('toured', true)
  await startBackground($)
}

// A five-second recording of a form being tested, played in the real
// player with its changes and checks; the picture of one without ffmpeg.
// The welcome's opening: show-your-work rising over a night sky, played once
// as a picture with no controls, then held on its last frame. A still
// without ffmpeg.
let splash: Shown | null = null
async function prepareSplash($: EngineInterface) {
  const opened = await prepare($, `${$.plugin.root}/assets/splash.mp4`, 'show-your-work')
    .catch(() => prepare($, `${$.plugin.root}/assets/splash.jpg`, 'show-your-work'))
    .catch(() => null)
  // The player's side list: what the plugin does, and real checks of this
  // setup, ticking as the opening plays.
  splash = opened && {
    ...opened,
    changesTitle: '功能介紹',
    changes: [
      { title: '已安裝', at: 1.8 },
      { title: 'Claude 能向你展示的一切', at: 5.0 },
      { title: 'Claude 展示它構建的內容', at: 15.7 },
    ],
    checks: [
      { name: '此終端可以繪製圖片', ok: state.canImage, at: 2.2 },
      { name: 'ffmpeg 可以播放影片', ok: !!opened.frames, at: 5.5 },
      { name: '外掛已安裝', ok: true, at: 16.0 },
    ],
  }
  await update($, welcome, n => n + 1)
  redraw($)
}

// /show-your-work's pane: the switches, and the way back into the tour.
export function Settings(ui: Ui, $: EngineInterface) {
  const { Box, Text, Button } = ui
  return (
    <Box flexDirection="column" paddingX={2} paddingBottom={1}>
      <Box flexDirection="row" columnGap={2} marginBottom={1}>
        <Button key="close" label="✕ 關閉" onPress={() => void $.ui.close({ id: WELCOME })} />
        <Button key="tour" label="檢視導覽" onPress={() => { act('tour_from_settings'); void $.ui.close({ id: WELCOME }).then(() => openTour($)) }} />
      </Box>
      <Box marginBottom={1}><Text bold>Show Your Work 設定</Text></Box>
      {SettingRows(ui, $)}
    </Box>
  )
}

// Quiet: plain words, the choice marked ● and the other ○, in columns that
// line up, so choosing moves nothing.
function SettingRows(ui: Ui, $: EngineInterface) {
  const { Box, Text, Button } = ui
  const first = Math.max(...SETTINGS.map(s => s.options[0].length)) + 4
  return (
    <Box flexDirection="column">
      {SETTINGS.map(s => (
        <Box key={`row-${s.field}`} flexDirection="row">
          <Box width={24} flexShrink={0}><Text dimColor>{s.title}</Text></Box>
          {s.options.map((label, k) => {
            const isChosen = settings[s.field] === (k === 0)
            return (
              <Box key={`slot-${s.field}-${k}`} width={k === 0 ? first : undefined} flexShrink={0}>
                {/* The default in green, the other in orange; the one not chosen
                    dim. Before Claude Code 2.1.295 a Button holds only its label. */}
                {state.canColourButtons ? (
                  <Button key={`${s.field}-${k}`} plain label={`${isChosen ? '●' : '○'} ${label}`} onPress={() => void switchSetting($, s.field, k === 0)}>
                    <Text color={k === 0 ? 'success' : 'claude'} dimColor={!isChosen}>{`${isChosen ? '●' : '○'} ${label}`}</Text>
                  </Button>
                ) : (
                  <Button key={`${s.field}-${k}`} plain {...(isChosen ? {} : { dimColor: true })} label={`${isChosen ? '●' : '○'} ${label}`} onPress={() => void switchSetting($, s.field, k === 0)} />
                )}
              </Box>
            )
          })}
        </Box>
      ))}
      <Box marginTop={1}><Text dimColor>使用資料是匿名的，有助於修復錯誤並改善產品體驗。絕不會分享敏感資料。</Text></Box>
    </Box>
  )
}

// The welcome row: the opening in the real player, with its side list, then
// what to ask and one quiet line about updates and usage counts.
export async function Opening($: EngineInterface, e: Parameters<EngineInterface['ui']['resolve']>[0], site: string, viewport?: { columns: number; rows: number }) {
  const { Box, Text } = $.ui.resolve(e) as Ui
  let view = null
  // Where pictures can't draw, the heading alone: a warning has no place here.
  if (splash && state.canImage) {
    view = await Viewer($, e, atStep(splash, site), site, false, viewport)
  }
  return (
    <Box flexDirection="column" rowGap={1}>
      {view ?? <Text bold color="claude">✦ show-your-work 已安裝並就緒</Text>}
      <Box flexDirection="column">
        <Text>Claude 現在可以直接在聊天中向你展示圖片和影片。試著讓 Claude 建立一些內容，並以圖片或錄影的形式在聊天中展示給你。</Text>
        <Text dimColor>它會自動更新併發送匿名使用統計。可使用 /show-your-work 修改設定，使用 /show-your-work tour 檢視所有功能。</Text>
      </Box>
    </Box>
  )
}

// ── Tour ─────────────────────────────────────────────────────────────────

// A walk through the player on the launch film's demos: the opening, a recording with
// its report, the same recording against the broken version, a screenshot's
// history, then the commands and switches. Opens by itself on a fresh
// install; /show-your-work tour, or the button in the settings, opens it again.
const TOUR = 'show-your-work-tour'
// The tour is a message in the chat, drawn by the output row of
// /show-your-work tour (TOUR_TEXT marks it): it lays out at the chat's full
// width at any window size. tourSite is the live row; an older one shrinks to
// a line.
export const TOUR_TEXT = 'show-your-work tour.'

// The one line above the control a stop points at, in the tour's row only.
const tourMedia: { recording?: Shown | null; compare?: Shown | null; history?: Shown | null } = {}

// The demo's media, read once, all from the launch film: the new-trip form
// tested with its changes and checks, the Tern hero before and after its
// trip card, and the hero's history from four directions to every width.
// Loads the demo media for steps 2, 3 and 4 in parallel. Each one redraws
// the tour when it finishes, so a step never waits for the others' media.
async function prepareTour($: EngineInterface) {
  const dir = `${$.plugin.root}/assets/tour`
  const ready = () => update($, welcome, n => n + 1)
  const recording = async () => {
    if (tourMedia.recording !== undefined) return
    tourMedia.recording = await (async () => {
      const clip = await prepare($, `${dir}/trip-form.mp4`, '新建行程表單')
      const lead = clip.frames?.lead ?? 0
      const at = (s: number) => Math.max(0, s - lead)
      return {
        ...clip,
        // Where each step lands in the recording (its QA run, 1.3 s behind the log).
        changes: [
          { title: '日期可選擇範圍，摘要中顯示晚數', at: at(5.25) },
          { title: '無效郵箱會提示錯誤', at: at(6.85) },
          { title: '邀請變成標籤', at: at(9.1) },
          { title: '建立行程後開啟該行程', at: at(10.5) },
        ],
        checks: [
          { name: '日期可選擇範圍', ok: true, at: at(5.25) },
          { name: '錯誤郵箱會收到提示', ok: true, at: at(6.85) },
          { name: '邀請變成標籤', ok: true, at: at(9.1) },
          { name: '建立行程後開啟該行程', ok: true, at: at(10.7) },
          { name: '螢幕閱讀器標籤', ok: true, at: at(11.2) },
        ],
        summary: [
          { label: '行程表單端到端可用', ok: true, passed: 4, total: 4 },
          { label: '螢幕閱讀器標籤', ok: true, passed: 1, total: 1 },
        ],
      } as Shown
    })().catch(() => prepare($, `${dir}/hero.jpg`, 'Tern 首頁').catch(() => null))
    await ready()
  }
  const compare = async () => {
    if (tourMedia.compare !== undefined) return
    tourMedia.compare = await (async () => ({
      ...(await prepare($, `${dir}/hero.jpg`, 'Tern 首頁')),
      changes: [{ title: '標題旁的行程卡片' }, { title: '按鈕下方的好友與行程數量' }],
      compare: await prepare($, `${dir}/direction-b.jpg`, '原始'),
    }) as Shown)().catch(() => null)
    await ready()
  }
  const history = async () => {
    if (tourMedia.history !== undefined) return
    tourMedia.history = await (async () => {
      const hero = `${dir}/hero.jpg`
      return {
        ...(await prepare($, `${dir}/breakpoints.jpg`, 'Tern 首頁')),
        changes: [{ title: '桌面、平板和手機' }],
        note: '桌面、平板和手機',
        compare: await preparedOf($, hero),
        history: [
          { path: `${dir}/concepts.jpg`, note: '四個方向' },
          { path: `${dir}/direction-b.jpg`, note: '方案 B，完整尺寸' },
          { path: hero, note: '標題旁的行程卡片' },
        ],
        historyAt: 2,
      } as Shown
    })().catch(() => null)
    await ready()
  }
  await Promise.all([recording(), compare(), history()])
}

// Runs /show-your-work tour, whose output row draws the tour.
async function openTour($: EngineInterface) {
  // A plugin's own run never reaches its own command.run hook: the tour starts
  // here, and its row is drawn by the args it carries.
  startTour($)
  await $.command.run({ command: PLUGIN, args: 'tour' }).catch(() => undefined)
}

// What /show-your-work tour does before its row draws: the first stop, and
// the demo's media read in the background.
export function startTour($: EngineInterface) {
  act('tour_open')
  state.isTourPending = true
  state.isTourDone = false
  state.tourStop = 0
  loadDemo($)
}

// Starts loading every step's media: step 1's video and the others at the same
// time. Runs once per plugin load. A reload clears the loaded media but keeps
// the tour's row in the chat, so Tour calls this too when it finds media missing.
let isDemoLoading = false
function loadDemo($: EngineInterface) {
  if (isDemoLoading) return
  isDemoLoading = true
  if (!splash) void prepareSplash($).catch(() => undefined)
  void prepareTour($).catch(() => undefined)
}

// Each stop starts its player fresh; its video waits for Play.
export function goToStop($: EngineInterface, to: number) {
  stop($, state.tourSite)
  players.delete(state.tourSite)
  state.tourStop = Math.max(0, Math.min(STOPS.length - 1, to))
  state.isStopDone = false
  const media = mediaOf(STOPS[state.tourStop]!)
  void update($, welcome, n => n + 1)
}

const mediaOf = (s: Stop) => (s.media === 'splash' ? splash : s.media ? tourMedia[s.media] : null) ?? null

async function finishTour($: EngineInterface, isSkip: boolean) {
  act(isSkip ? `tour_skip_${state.tourStop}` : 'tour_done')
  stop($, state.tourSite)
  state.isTourDone = true
  await update($, welcome, n => n + 1)
}

// Draws the tour in the chat: the current step's player (or "Loading the
// demo…", or the settings on the last step), with the step bar under it. The
// bar takes the player's width so their edges line up.
let isTourHeld = false
export async function Tour($: EngineInterface, e: Parameters<EngineInterface['ui']['resolve']>[0], viewport?: { columns: number; rows: number }) {
  const ui = $.ui.resolve(e) as Ui
  const { Box, Text } = ui
  const s = STOPS[state.tourStop]!
  const media = mediaOf(s)
  if (state.isTourDone) return <Text dimColor>✓ 導覽已完成。可執行 /show-your-work tour 再次檢視。</Text>
  // Pictures can't show here: the notice says how to turn them on, and the
  // tour runs again in the first session where they show.
  if (!state.canImage) {
    if (!isTourHeld) { isTourHeld = true; void $.store.set('toured', false).catch(() => undefined) }
    const notice = splash ? await Viewer($, e, atStep(splash, state.tourSite), state.tourSite, false, { columns: viewport?.columns ?? 100, rows: Math.max(24, viewport?.rows ?? 40) }) : null
    return notice ?? <Text dimColor>載入中…</Text>
  }
  const room = { columns: viewport?.columns ?? 100, rows: Math.max(24, viewport?.rows ?? 40) }
  if (!media && s.media) loadDemo($)
  // Nothing to look at yet: no bar, so Next can't be pressed before the demo shows.
  if (!media && s.media) return <Text dimColor>正在載入演示…</Text>
  const view = media ? await Viewer($, e, atStep(media, state.tourSite), state.tourSite, false, room) : null
  const width = (view as { props?: { width?: number } } | null)?.props?.width ?? Math.min(room.columns - 2, 100)
  return (
    <Box flexDirection="column" rowGap={1}>
      {view ?? (s.media && <Text dimColor>正在載入演示…</Text>)}
      {state.tourStop === STOPS.length - 1 && (
        <Box key="settings-box" flexDirection="column" borderStyle="round" borderColor="subtle" paddingX={1} width={width}>
          <Text bold>設定</Text>
          <Box marginTop={1}>{SettingRows(ui, $)}</Box>
        </Box>
      )}
      {TourBar(ui, $, width)}
    </Box>
  )
}

// The step bar: progress dots and "N of 5" on the first line, then the
// instruction in capitals with Back, Next and Skip tour on the right. The bar
// is lavender, and turns green with a ✓ once the person has done the step.
function TourBar(ui: Ui, $: EngineInterface, columns: number) {
  const { Box, Text, Button } = ui
  const at = state.tourStop
  const s = STOPS[at]!
  const isLast = at === STOPS.length - 1
  const isDone = state.isStopDone
  // Button text is dark to read on the lavender. Claude Code before 2.1.295
  // can't colour a button's text, so there the buttons use the default colour.
  // Back and Next are bracketed; Skip tour is plain text, as the least wanted.
  // Next turns black with light text once the step is done. Light text, because
  // the terminal inverts a button under the pointer, and dark-on-black inverted
  // would match the bar and disappear.
  // The last step has nothing to do, so it starts green.
  const fill = isDone || !s.goal ? 'success' : 'suggestion'
  const onBar = (key: string, label: string, onPress: () => void, look: { isMain?: boolean; isButton?: boolean } = {}) => {
    const text = look.isButton ? `[ ${label} ]` : label
    if (!state.canColourButtons) return <Button key={key} plain label={text} onPress={onPress} bold={look.isMain} />
    return (
      <Button key={key} plain label={text} onPress={onPress}>
        {look.isMain ? <Text bold color="text" backgroundColor="inverseText">{`  ${label}  `}</Text> : <Text color="inverseText">{text}</Text>}
      </Button>
    )
  }
  return (
    <Box key="tour-bar" flexDirection="column" width={columns} paddingX={2} paddingY={1} backgroundColor={fill}>
      {/* Where you are; then what to do, with the way on beside it. */}
      <Text color="inverseText">{`${STOPS.map((_, i) => (i === at ? '●' : '○')).join(' ')}   ${at + 1} of ${STOPS.length}`}</Text>
      <Box flexDirection="row" alignItems="flex-end" columnGap={4}>
        <Box flexGrow={1} flexShrink={1}><Text bold color="inverseText">{(isDone ? `✓  ${s.tag}` : s.tag).toUpperCase()}</Text></Box>
        <Box flexDirection="row" columnGap={3} flexShrink={0}>
          {/* No Back on the last step: it's a wrap-up, and Done is the only choice. */}
          {at > 0 && !isLast && onBar('prev', '‹ 返回', () => { act(`tour_back_${at}`); goToStop($, at - 1) }, { isButton: true })}
          {/* Next fills in once the step is done; until then it's a plain button. */}
          {isLast
            ? onBar('done', '完成 ›', () => void finishTour($, false), { isMain: true, isButton: true })
            : onBar('next', '下一步 ›', () => { act(`tour_next_${at}`); goToStop($, at + 1) }, { isMain: !s.goal || isDone, isButton: true })}
          {!isLast && onBar('skip', '跳過導覽', () => void finishTour($, true))}
        </Box>
      </Box>
    </Box>
  )
}
