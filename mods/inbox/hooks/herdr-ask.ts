import type { BannerView } from './banners'
import { answerHerdrMod, herdrModNow, NEWER_ANSWER_TEXT, savedAnswer } from './herdr-install'
import type { ModFiles } from './herdr-install'

/** Where the question asks about: the app home, the mod's folder as shown, and when the answer it found was saved. */
type AskPlace = { appHome: string; folder: string; answeredAt: number | null }

/**
 * The question a host asks before it installs the inbox's Herdr mod. `asking` shows the question with its buttons,
 * `answering` shows without them while either press runs, and `answered` shows a press's result until the host clears
 * it. `answeredAt` is when the answer the host found was saved, so an answer another session saves since closes the
 * question.
 */
export type HerdrAsk =
  ({ is: 'asking' } & AskPlace) | ({ is: 'answering'; isYes: boolean } & AskPlace) | { is: 'answered'; text: string }

export type OpenHerdrAsk = Extract<HerdrAsk, { is: 'asking' }>

const LEAD = '是否安裝收件箱的 Herdr 外掛？'
const INSTALLING_TEXT = '正在 Herdr 中安裝收件箱外掛…'
const SAVING_TEXT = '正在儲存回答…'
const INSTALLED_TEXT = '✓ 已在 Herdr 中安裝收件箱外掛。'

/** The question's buttons, in the order every look draws them. Install is the answer the inbox recommends. */
export const HERDR_ASK_BUTTONS = [
  { id: 'herdr-install', label: '安裝', isYes: true },
  { id: 'herdr-skip', label: '不安裝', isYes: false },
] as const

/** The question in a host that found the mod missing, with the home folder written `~` in the folder it names. */
export function herdrAskOf(appHome: string, home: string | undefined, answeredAt: number | null): OpenHerdrAsk {
  const folder = `${appHome}/mods/inbox`
  const shown = home && folder.startsWith(`${home}/`) ? `~${folder.slice(home.length)}` : folder

  return { is: 'asking', appHome, folder: shown, answeredAt }
}

/** The question as the banner under the tab bar, or null when there is none. */
export function herdrAskBanner(ask: HerdrAsk | null): BannerView | null {
  if (!ask) return null
  const isAsking = ask.is === 'asking'
  const lead = ask.is === 'answered' ? ask.text : ask.is === 'asking' ? LEAD : ask.isYes ? INSTALLING_TEXT : SAVING_TEXT
  const body = isAsking
    ? `它會在 ${ask.folder} 為 Herdr 應用新增收件箱面板，並使其與收件箱保持同步。`
    : null

  return { kind: 'herdr-mod-ask', tone: 'ask', lead, body }
}

/** The question while a press of Install or Don't install runs, with its buttons hidden so no second press starts. */
export const answeringOf = (ask: OpenHerdrAsk, isYes: boolean): HerdrAsk => ({ ...ask, is: 'answering', isYes })

/**
 * Runs an Install or Don't install press: saves the answer, and installs the mod after Install. `later` says how to
 * install it after Don't install, in the host's words. Resolves with the question's next state and why the press
 * failed, if it did.
 */
export async function answerHerdrAsk(
  files: ModFiles,
  ask: OpenHerdrAsk,
  bundledFolder: string,
  isYes: boolean,
  now: number,
  later: string,
): Promise<{ ask: HerdrAsk | null; failure: string | null }> {
  const result = await answerHerdrMod(files, ask.appHome, bundledFolder, isYes, now)
  if (result.is === 'failed') return { ask: null, failure: result.text }

  return { ask: { is: 'answered', text: isYes ? INSTALLED_TEXT : `${later}以後再安裝。` }, failure: null }
}

/**
 * The question for a host that draws the inbox outside a Herdr app terminal, as the Codex app's tab: it asks when the
 * app's settings folder exists, no answer is saved and nothing is at `mods/inbox`. It reads the answer first, so a
 * saved answer, which most polls find, costs one small read. `/.` follows a link at the settings folder itself, as
 * dotfile managers make.
 */
export async function herdrAskInApp(
  files: ModFiles,
  appHome: string,
  home: string | undefined,
): Promise<OpenHerdrAsk | null> {
  if ((await savedAnswer(files, appHome)) !== null) return null
  if ((await files.kind(`${appHome}/.`)) !== 'folder') return null

  return (await files.kind(`${appHome}/mods/inbox`)) === null ? herdrAskOf(appHome, home, null) : null
}

/** Whether the question still waits: the mod is still missing, and no session has saved an answer since it asked. */
export async function isHerdrAskOpen(files: ModFiles, ask: OpenHerdrAsk): Promise<boolean> {
  const state = await herdrModNow(files, ask.appHome).catch(() => null)

  return (
    state === null || (state.installed === 'missing' && state.answer !== 'newer' && state.answeredAt === ask.answeredAt)
  )
}

/**
 * For `/inbox herdr`: the question again, even after a no, or why it cannot show. `appHome` is null outside a Herdr
 * app terminal, or when the app has no settings folder.
 */
export async function askHerdrAgain(
  files: ModFiles,
  appHome: string | null,
  home: string | undefined,
): Promise<OpenHerdrAsk | string> {
  if (!appHome) return '請在 Herdr 應用終端中執行 /inbox herdr，以在其中安裝收件箱外掛。'
  const state = await herdrModNow(files, appHome).catch((err: unknown) =>
    err instanceof Error ? err : new Error(String(err)),
  )
  if (state instanceof Error) return `無法讀取 Herdr 應用的外掛目錄。${state.message}`
  const ask = herdrAskOf(appHome, home, state.answeredAt)
  if (state.installed === 'inbox') return '收件箱外掛已安裝在 Herdr 中。'
  if (state.installed === 'own') return `${ask.folder} 中已有其他外掛，收件箱不會改動它。`
  if (state.answer === 'newer') return NEWER_ANSWER_TEXT

  return ask
}
