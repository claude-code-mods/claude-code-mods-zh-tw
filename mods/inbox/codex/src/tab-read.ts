import { clipLabel } from '../../hooks/text'
import { LISTED_TABS } from '../../hooks/tabs'
import { heldReplies, SETTLED_MS, keptDiscards } from '../../hooks/timing'
import { openOnArrival } from '../../hooks/action-plan'
import type { Holds } from '../../hooks/timing'
import { capitalized } from '../../hooks/press-labels'
import { newRows, openRows } from './arrivals'
import { addNewRows } from '../../hooks/arrivals'
import type { TabView as View } from './core'
import { POLL_MS, settledIds, settledSeen, undoShownIds } from './settle'
import { tabState, selection, drafts, entering } from './tab-state'
import { later, callTool, READ_TIMEOUT_MS } from './tab-host'
import { drawIn } from './tab-motion'
import { listInput } from './list-input'
import { follow, tabWaits } from './tab-selection'
import { PAGE, swapPage } from './tab-swap'
import { takeShownRows } from './tab-shown'

export function applyView(next: View, seq: number) {
  if (tabState.isDisposed || seq < tabState.shown) return
  tabState.shown = seq
  tabState.readError = null
  tabState.pollFailures = 0
  tabState.readAt = Date.now()
  const before = tabState.seen
  tabState.seen = settledSeen(tabState.seen, settledIds(next), Date.now())
  if ([...tabState.seen.keys()].some(id => !before.has(id))) drawIn(SETTLED_MS)
  tabState.view = next
  const isOpening = LISTED_TABS.every(t => tabState.rowsSeen[t.id] === undefined)
  const rows = newRows(tabState.rowsSeen, next, next.isFetchingPrs)
  tabState.rowsSeen = rows.seen
  const isVisible = document.visibilityState === 'visible'
  if (isVisible && tabState.wasVisibleAtRead) tabState.newRows = addNewRows(tabState.newRows, rows.added)
  tabState.wasVisibleAtRead = isVisible
  const added = [...rows.added.needsYou, ...rows.added.findings]
  for (const id of added) entering.add(id)
  for (const { id: t } of LISTED_TABS) {
    const id = openOnArrival(tabWaits(next, t), selection[t]?.id ?? null, rows.added[t])
    if (id) selection[t] = { id, openedAt: 0 }
  }
  follow(next, isOpening ? openRows(next) : rows.added)
  tabState.isReadDraw = true
  try {
    tabState.draw()
  } finally {
    tabState.isReadDraw = false
  }
}

export async function read() {
  const generation = tabState.viewGeneration
  const seq = ++tabState.requested
  try {
    const next = await callTool<View>(
      'inbox_view',
      { demo: tabState.isDemo, tab: tabState.tab, ...holds(), shownRows: takeShownRows() },
      READ_TIMEOUT_MS,
    )
    if (generation !== tabState.viewGeneration || seq < tabState.shown) return
    tabState.requestedPage = next.devPage
    if (tabState.updateError?.page !== tabState.requestedPage) tabState.updateError = null
    const isPageOld = tabState.requestedPage !== PAGE
    if (isPageOld && !tabState.updateError) void swapPage(tabState.requestedPage)
    tabState.serverNote = next.isPluginFolderGone
      ? {
          text: '請退出並重新開啟 Codex 以載入已安裝的收件箱。其檔案已被移動或刪除，因此仍在執行 Codex 啟動時的版本。',
          kind: 'server-gone',
        }
      : next.serverLoadError
        ? {
            text: `The inbox server could not load its new build, so it still runs the last one. ${next.serverLoadError}`,
            kind: 'server-load-failed',
          }
        : next.serverBuild !== SERVER_BUILD && !isPageOld
          ? { text: '此標籤頁與收件箱伺服器來自不同的構建版本。', kind: 'server-builds-differ' }
          : null
    applyView(next, seq)
  } catch (err) {
    if (tabState.isDisposed || generation !== tabState.viewGeneration || seq < tabState.shown) return
    if (tabState.view) tabState.pollFailures++
    else tabState.readError = failureText(err)
    tabState.draw()
  }
}

/** The host rejects with its JSON-RPC error object, not an Error. */
function failureText(err: unknown): string {
  const message =
    typeof err === 'object' && err !== null && typeof (err as { message?: unknown }).message === 'string'
      ? (err as { message: string }).message
      : String(err)
  const reason =
    clipLabel(
      message
        .replace(/^(Failed|Not done): /, '')
        .replace(/\s+/g, ' ')
        .trim(),
      120,
    ) || '未給出原因'

  return capitalized(/[.!?…]$/.test(reason) ? reason : `${reason}.`)
}

export async function poll() {
  try {
    await read()
  } catch (err) {
    console.error(err)
  } finally {
    later(poll, POLL_MS)
  }
}

export function replies(): Record<string, number> {
  return heldReplies(tabState.typing, Object.fromEntries(drafts))
}

export function holds(): Holds {
  tabState.discarded = keptDiscards(tabState.discarded, tabState.shownSince)

  return {
    replies: replies(),
    discarded: tabState.discarded,
    shownSince: tabState.shownSince,
    listInput: listInput(Date.now()),
    undoShown: undoShownIds(tabState.seen, Date.now()),
  }
}
