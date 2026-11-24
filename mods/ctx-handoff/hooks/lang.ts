// 回覆語言提醒的純邏輯（不碰 $）：判斷一段回覆是不是目標語言、狀態怎麼走、提醒怎麼寫。
// 判斷只看「說明文字」：先去掉程式碼、網址、路徑、指令等，再數漢字、假名、韓文與英文單字。
// 寧可漏提醒也不要誤提醒：夾英文術語的中文、很短的句子、程式碼與專有名詞都不該觸發
import { tag } from './notes'

export type ReplyLang = 'zh-TW' | 'zh-CN' | 'en' | 'ja'
export type ReplyLangSetting = 'auto' | 'off' | ReplyLang
export const REPLY_LANG_SETTINGS: readonly ReplyLangSetting[] = ['auto', 'off', 'zh-TW', 'zh-CN', 'en', 'ja']
export const isReplyLangSetting = (v: unknown): v is ReplyLangSetting => REPLY_LANG_SETTINGS.includes(v as ReplyLangSetting)

// ---------- 設定 → 目標語言 ----------

const TW = /繁體|繁體|traditional|zh[-_ ]?(?:tw|hk|hant)|臺灣|臺灣|taiwan/i
const CN = /簡體|簡體|簡體|simplified|zh[-_ ]?(?:cn|hans|sg)|大陸|大陸|mainland/i
const JA = /^ja\b|japanese|日本語|日本語|日語|日語|nihongo/i
const EN = /^en\b|english|英語|英語|英文/i

// Claude Code 的 language 設定（自由文字，例如「繁體中文」「English」「日本語」）對應到目標語言；
// 只寫「中文」或「Chinese」分不出繁簡，沒設或認不得都回 undefined（不提醒）
export function replyLangOfSetting(setting: unknown): ReplyLang | undefined {
  if (typeof setting !== 'string') return undefined
  const s = setting.trim()
  if (!s) return undefined
  if (TW.test(s)) return 'zh-TW'
  if (CN.test(s)) return 'zh-CN'
  if (JA.test(s)) return 'ja'
  if (EN.test(s)) return 'en'
  return undefined
}

// 設定值 + Claude Code 的 language → 這個對話要用的目標語言（undefined＝不提醒）
export function resolveReplyLang(setting: ReplyLangSetting, claudeLanguage: unknown): ReplyLang | undefined {
  if (setting === 'off') return undefined
  return setting === 'auto' ? replyLangOfSetting(claudeLanguage) : setting
}

// ---------- 簡繁專用字 ----------

// 一對一排好的「簡體字 繁體字」，只放簡繁寫法不同、而且簡體字不會出現在一般臺灣繁體文章裡的字。
// 刻意不放：理、後（皇后）、臺、裡、只、幹、雲、復、於、內、周、衝、並、聽、異、黨、廠（繁體也在用或另有用法）
export const PAIRS = [
  '這這', '們們', '說說', '時時', '會會', '為為', '對對', '發發', '經經', '過過', '還還', '進進', '沒沒', '問問', '麼麼', '樣樣',
  '現現', '應應', '該該', '與與', '個個', '從從', '動動', '見見', '長長', '開開', '關關', '題題', '設設', '計計', '數數', '據據',
  '記記', '錄錄', '處處', '驗驗', '證證', '測測', '試試', '輸輸', '錯錯', '誤誤', '實實', '際際', '項項', '檔檔', '讀讀', '寫寫',
  '請請', '讓讓', '給給', '變變', '將將', '節節', '點點', '單單', '簡簡', '體體', '語語', '較較', '線線', '網網', '頁頁', '務務',
  '產產', '業業', '東東', '門門', '間間', '機機', '軟軟', '執執', '碼碼', '類類', '調調', '結結', '構構', '創創', '刪刪', '導導',
  '庫庫', '態態', '狀狀', '況況', '總總', '無無', '當當', '電電', '腦腦', '視視', '覺覺', '學學', '習習', '師師', '員員', '報報',
  '認認', '識識', '別別', '選選', '擇擇', '參參', '協協', '議議', '儲儲', '緩緩', '區區', '塊塊', '邊邊', '緣緣', '壓壓', '縮縮',
  '傳傳', '遞遞', '載載', '術術', '編編', '譯譯', '運運', '環環', '權權', '級級', '備備', '啟啟', '終終', '顯顯', '圖圖', '標標',
  '擊擊', '鍵鍵', '盤盤', '針針', '拋拋', '釋釋', '慮慮', '擔擔', '響響', '優優', '續續', '繼繼', '斷斷', '聯聯', '絡絡', '鏈鏈',
  '層層', '覽覽', '話話', '討討', '論論', '難難', '確確', '嗎嗎', '謝謝', '幫幫', '買買', '賣賣', '錢錢', '費費', '購購', '賬帳',
  '號號', '鑰鑰', '書書', '條條', '規規', '則則', '圍圍', '舉舉', '兩兩', '聞聞', '閱閱', '隊隊', '階階', '隨隨', '義義', '亂亂',
  '頭頭', '興興', '親親', '僅僅', '倉倉', '眾眾', '傷傷', '側側', '養養', '軍軍', '農農', '減減', '剛剛', '劇劇', '辦辦', '勞勞',
  '勢勢', '雙雙',
] as const
export const SIMPLIFIED_ONLY = new Set(PAIRS.map(p => p[0]))
export const TRADITIONAL_ONLY = new Set(PAIRS.map(p => p[1]))

// ---------- 判斷 ----------

// 只有幾個字（「OK.」「Done.」）不判斷，其餘一律看比例：一兩句英文旁白也是換了語言（2026-10-30 使用者要求）
export const MIN_UNITS = 4
// 某種文字佔「單位」的比例超過這個才算主導。單位：英文 1 個單字、日韓中文 2 個字（平均詞長）
export const DOMINANT = 0.75
// 簡繁專用字至少 3 個、佔漢字超過 6%，才算寫成另一種字形
export const MIX_MIN = 3
export const MIX_SHARE = 0.06
// 最多分析前面這麼多字，免得很長的回覆拖慢每個步驟
const MAX_TEXT = 20_000

export type Counts = { han: number; kana: number; hangul: number; latin: number; simp: number; trad: number }

// 去掉不算「說明」的部分：圍欄程式碼、引用行、行內程式碼、網址、路徑、@提及、斜線指令、檔名與 a.b 形式的識別字。
// 表格的豎線、標點與符號不是字母，數字時不用處理
export function proseOf(text: string): string {
  const kept: string[] = []
  let fence: string | undefined
  for (const line of text.split('\n')) {
    const head = line.trimStart()
    const mark = head.startsWith('```') ? '```' : head.startsWith('~~~') ? '~~~' : undefined
    if (fence !== undefined) {
      if (mark === fence) fence = undefined
      continue
    }
    if (mark !== undefined) { fence = mark; continue }
    if (head.startsWith('>')) continue
    kept.push(line)
  }
  return kept.join('\n')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, ' ')
    .replace(/\bwww\.\S+/gi, ' ')
    .replace(/\b[A-Za-z]:[\\/][^\s"'`)\]>]*/g, ' ')
    .replace(/(?:\.{1,2}\/|~\/|\/)?(?:[\w.@~-]+\/)+[\w.@~-]*/g, ' ')
    .replace(/(?<!\w)@[\w./-]+/g, ' ')
    .replace(/(?<![\w/])\/[A-Za-z][\w:-]*/g, ' ')
    .replace(/\b[\w-]+(?:\.[\w-]+)+\b/g, ' ')
}

// 英文單字：2 個字母以上、全小寫或只有開頭大寫。全大寫縮寫（API、JSON）、駝峰、底線與夾數字的識別字都不算
const WORD = /^[A-Z]?[a-z]{2,}$/
const HAN_RE = /\p{Script=Han}/u
const KANA_RE = /[\p{Script=Hiragana}\p{Script=Katakana}]/u
const HANGUL_RE = /\p{Script=Hangul}/u

export function countOf(prose: string): Counts {
  const c: Counts = { han: 0, kana: 0, hangul: 0, latin: 0, simp: 0, trad: 0 }
  for (const ch of prose) {
    if (ch <= '\u007f') continue
    if (HAN_RE.test(ch)) {
      c.han += 1
      if (SIMPLIFIED_ONLY.has(ch)) c.simp += 1
      else if (TRADITIONAL_ONLY.has(ch)) c.trad += 1
    } else if (KANA_RE.test(ch)) c.kana += 1
    else if (HANGUL_RE.test(ch)) c.hangul += 1
  }
  // I'll、don't 這類縮寫只看前半
  for (const w of prose.match(/[A-Za-z0-9_]+(?:'[A-Za-z]+)?/g) ?? []) if (WORD.test(w.replace(/'[A-Za-z]+$/, ''))) c.latin += 1
  return c
}

export type Verdict = 'on' | 'off' | 'short'

export function judge(text: string, target: ReplyLang): Verdict {
  const c = countOf(proseOf(text.slice(0, MAX_TEXT)))
  const cjk = c.han + c.kana + c.hangul
  const cjkUnits = cjk / 2
  const total = cjkUnits + c.latin
  if (total < MIN_UNITS) return 'short'
  const latinShare = total > 0 ? c.latin / total : 0
  const mixed = (n: number) => n >= MIX_MIN && c.han > 0 && n / c.han > MIX_SHARE
  switch (target) {
    case 'en':
      return 1 - latinShare > DOMINANT ? 'off' : 'on'
    case 'ja':
      if (latinShare > DOMINANT) return 'off'
      if (c.hangul > c.han + c.kana) return 'off'
      // 日文一定有大量假名；有漢字卻幾乎沒有假名，是中文
      return c.han >= 30 && c.kana / (c.han + c.kana) < 0.1 ? 'off' : 'on'
    case 'zh-TW':
      if (latinShare > DOMINANT) return 'off'
      if (c.kana >= 10 && c.kana > c.han * 0.2) return 'off'
      return mixed(c.simp) ? 'off' : 'on'
    case 'zh-CN':
      if (latinShare > DOMINANT) return 'off'
      if (c.kana >= 10 && c.kana > c.han * 0.2) return 'off'
      return mixed(c.trad) ? 'off' : 'on'
  }
}

// ---------- 狀態與提醒文字 ----------

export const LANG_NAMES: Record<ReplyLang, string> = { 'zh-TW': '繁體中文', 'zh-CN': '簡體中文', en: 'English', ja: '日本語' }

// 提醒用目標語言寫（模型讀起來自然）；程式碼、指令、路徑與專有名詞維持原文
export function reminderText(target: ReplyLang): string {
  switch (target) {
    case 'zh-TW': return `${tag} 請用繁體中文說明（程式碼與專有名詞照原文；使用者指定其他語言的內容照寫）。`
    case 'zh-CN': return `${tag} 請用簡體中文說明（程式碼和專有名詞保持原文；使用者指定其他語言的內容照寫）。`
    case 'en': return `${tag} Please explain in English (keep code and proper nouns as is; content the user asked for in another language stays).`
    case 'ja': return `${tag} 説明は日本語で書いてください（コードと固有名詞は原文のまま。ユーザーが別の言語で頼んだ內容はそのまま）。`
  }
}

// 回合要結束時，最後的回答不是目標語言：擋下停止，請它重寫一次（已經印出的那則收不回來，使用者會看到兩則）
export function rewriteText(target: ReplyLang): string {
  switch (target) {
    case 'zh-TW': return `${tag} 最後的回覆不是繁體中文，請用繁體中文重寫一次（程式碼與專有名詞照原文；若是使用者指定其他語言的內容，不用重寫）。`
    case 'zh-CN': return `${tag} 最後的回覆不是簡體中文，請用簡體中文重寫一次（程式碼和專有名詞保持原文；若是使用者指定其他語言的內容，不用重寫）。`
    case 'en': return `${tag} Your final reply was not in English. Rewrite it in English (keep code and proper nouns as is; skip this if the user asked for that language).`
    case 'ja': return `${tag} 最後の返信が日本語ではありません。日本語で書き直してください（コードと固有名詞は原文のまま。ユーザーが別の言語を指定した內容なら不要）。`
  }
}

// 回合結束（Stop）時：最後的回答不是目標語言就回傳要擋下的理由。stop_hook_active（已經擋過一次）不再擋，
// 免得重寫後仍判斷不符時一直迴圈；擋下時清掉要跟著下一則訊息的提醒，重寫就是這次的提醒
export function stopRewrite(state: ReplyState, message: string | undefined, stopHookActive: boolean, target: ReplyLang): string | undefined {
  if (stopHookActive || !message || judge(message, target) !== 'off') return undefined
  clearNext(state)
  state.nudged = true
  return rewriteText(target)
}

// 提醒的進度：nudged＝這一段（連續不是目標語言的回覆）已經提醒過；
// pending＝等主對話下一個工具結果帶出去；next＝等使用者的下一則訊息帶出去
export type ReplyState = { nudged: boolean; pending: string | undefined; next: string | undefined }
export const freshReply = (): ReplyState => ({ nudged: false, pending: undefined, next: undefined })

// 記下主對話一個步驟的回覆。不是目標語言就排一次提醒（每段只提醒一次，之後有一步符合目標語言才重算）：
// 這步還要呼叫工具，提醒跟著下一個工具結果；沒有工具（最終回答）就跟著使用者的下一則訊息
export function noteStep(state: ReplyState, answer: string, hasToolUses: boolean, target: ReplyLang) {
  const verdict = judge(answer, target)
  if (verdict === 'on') state.nudged = false
  if (verdict !== 'off' || state.nudged) return
  state.nudged = true
  if (hasToolUses) state.pending = reminderText(target)
  else state.next = reminderText(target)
}

// 工具結果要附的提醒（附了就清掉）
export function takePending(state: ReplyState): string | undefined {
  const text = state.pending
  state.pending = undefined
  return text
}

// 使用者的下一則訊息要附的提醒：上一輪沒附出去的 pending 也一併帶上
export function peekNext(state: ReplyState): string[] {
  return [...new Set([state.pending, state.next].filter((s): s is string => s !== undefined))]
}
export function clearNext(state: ReplyState) {
  state.pending = undefined
  state.next = undefined
}
