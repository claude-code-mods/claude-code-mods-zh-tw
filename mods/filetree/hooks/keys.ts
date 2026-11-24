import type { RowSpec } from './rows'

export type ShortcutKey = { key: string; label: string; terminal?: true }
export type ShortcutGroup = { title: string; keys: ShortcutKey[] }

const GROUPS: readonly ShortcutGroup[] = [
  {
    title: '移動',
    keys: [
      { key: 'j / k', label: '向下 / 向上' },
      { key: 'h / l', label: '摺疊或前往父目錄 / 展開' },
      { key: 'o, Enter', label: '開啟檔案或展開/摺疊資料夾' },
      { key: 'z', label: '跳轉到資料夾' },
      { key: 'Space', label: 'macOS 上的快速檢視', terminal: true },
    ],
  },
  {
    title: '搜尋',
    keys: [
      { key: 's', label: '聚焦搜尋框' },
      { key: 'i', label: '在游標所在的資料夾中搜索' },
      { key: 'c / r', label: '區分大小寫 / 正則表示式' },
      { key: 'q', label: '搜尋檔案內容而不是檔名' },
    ],
  },
  {
    title: '檔案與操作',
    keys: [
      { key: 'd', label: '差異比較' },
      { key: 'click', label: '選中一行' },
      { key: 'ctrl+click', label: '新增或取消選中一行；macOS 上為 alt+click' },
      { key: 'shift+click', label: '從錨點選擇範圍' },
      { key: 'shift+j / k', label: '向下 / 向上擴充套件選擇' },
      { key: 'v / V', label: '新增或取消該行 / 清除標記' },
      { key: 'y / Y', label: '複製相對 / 絕對路徑' },
      { key: 'u', label: '複製檔名' },
      { key: 't', label: '在 tmux 或 herdr 窗格中開啟終端' },
      { key: 'x', label: "防止 Claude 修改" },
      { key: 'w', label: '倉庫外寫入的檔案' },
    ],
  },
  {
    title: '檢視',
    keys: [
      { key: 'p', label: '預覽或樹狀圖', terminal: true },
      { key: 'f / b', label: '預覽翻頁', terminal: true },
      { key: '[ / ]', label: '上一頁 / 下一頁 PDF 或 Word 頁面', terminal: true },
      { key: 'a', label: '自動摺疊' },
      { key: 'n / g / m', label: '按名稱 / Git 狀態 / 大小排序' },
    ],
  },
  {
    title: '面板',
    keys: [
      { key: '?', label: '顯示或隱藏此列表', terminal: true },
      { key: 'ctrl+x tab', label: '將鍵盤焦點交給面板', terminal: true },
      { key: 'alt+l', label: '將鍵盤焦點交給檔案樹', terminal: true },
      { key: 'alt+h', label: '返回輸入框', terminal: true },
      { key: '/filetree keys', label: '設定 alt+l 和 alt+h', terminal: true },
      { key: 'Esc', label: '返回輸入框', terminal: true },
    ],
  },
]

export const SCROLL_KEYS: ReadonlySet<string> = new Set(['up', 'down', 'j', 'k', 'pageup', 'pagedown', 'f', 'b', 'home', 'end'])

export function shortcutGroups(desktop: boolean): ShortcutGroup[] {
  return GROUPS.map(g => ({ title: g.title, keys: g.keys.filter(k => !desktop || !k.terminal) })).filter(g => g.keys.length > 0)
}

export function shortcutRows(accent: string, muted: string): RowSpec[] {
  const groups = shortcutGroups(false)
  const width = Math.max(...groups.flatMap(g => g.keys.map(k => k.key.length))) + 2
  const rows: RowSpec[] = [{ id: '', left: [{ t: ' 快捷鍵', b: true, c: accent }], right: [{ t: '? 關閉 ', c: muted }] }]
  for (const g of groups) {
    rows.push({ id: '', left: [{ t: ' ' }], right: [] })
    rows.push({ id: '', left: [{ t: ` ${g.title}`, b: true }], right: [] })
    for (const k of g.keys) rows.push({ id: '', left: [{ t: `   ${k.key.padEnd(width)}`, c: accent }, { t: k.label }], right: [] })
  }
  return rows
}
