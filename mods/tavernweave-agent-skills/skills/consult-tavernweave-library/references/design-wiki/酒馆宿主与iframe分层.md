---
title: 酒館宿主與 iframe 分層
created: 2026-08-13
updated: 2026-08-14
type: concept
status: active
tags:
  - wiki
  - concept
  - sillytavern
  - tooling
sources:
  - <local-workspace>/<local-guide-db>/C1_前端基礎-TavernHelper與iframe.md
  - <local-workspace>/<local-guide-db>/C2_前端應用-狀態列與控制中心.md
  - <local-workspace>/<local-guide-db>/C3_HTML美化與CSS.md
  - <local-workspace>/<local-guide-db>/A5_渲染管線與宏.md
  - <local-workspace>/<local-guide-db>/C12_抽屜式狀態列-移動端方案.md
  - <local-workspace>/<local-guide-db>/D7_移動端與響應式適配.md
  - https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/基本用法/渲染器.html
  - https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/功能詳情/其他工具函式.html
  - https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/chats.js
  - <local-workspace>/卡A/卡A 4.0.0/components/options_bridge.js
  - <local-workspace>/怪談筆記/components/scripts/kdn_bridge.js
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/CSSOM_view/Viewport_concepts
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme
  - https://web.dev/articles/sandboxed-iframes
  - https://fs.spec.whatwg.org/
  - https://wicg.github.io/file-system-access/
  - https://www.w3.org/TR/appmanifest/
  - https://www.w3.org/TR/badging/
  - https://w3c.github.io/web-share-target/
  - https://github.com/w3c/web-share-target
  - https://zagjs.com/guides/composition
  - https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
knowledge_class: factual
---

# 酒館宿主與 iframe 分層

卡前端不是一張網頁。先認**誰造了這個窗**，再決定 `window` / `document` / `$` / `Mvu` 還在不在。卡側 `data-*` 協議見 [[concepts/角色卡DOM與掛載點]]；口語總表見 [[concepts/角色卡前端名詞中英對照]]。

SillyTavern **release** 分支 `chats.js`（2026-08-13 直讀）確認：ST 自己把訊息渲進 `.mes_text`，給 class 加 `custom-` 字首。**ST 框架不給角色卡開 iframe。** 樓裡能跑 JS 的框，是酒館助手（JS-Slash-Runner）或卡自己塞進去的。

## 先分兩條渲染路

| 路 | 誰渲 | 產物 | 能不能跑 `<script>` |
|---|---|---|---|
| ST 訊息樓 | SillyTavern `messageFormatting()` → DOMPurify | `.mes .mes_text` 裡的 HTML | 不能。指令碼被剝掉 |
| TH 前端介面 | 酒館助手渲染器 | 獨立 iframe（像一張小網頁） | 能。TH 再注入 API |

TH 官方條件（[渲染器](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/基本用法/渲染器.html)）：

1. 內容包在 Markdown 程式碼塊裡（三個反引號）；
2. 塊裡同時有 `<html>` 和 `</html>`。

穩定卡的狀態列正則 Replace With 就是這種程式碼塊。OMNI / 氣泡 / 行動選項**不是**這條路：它們是正則直寫進 `.mes_text` 的碎片 HTML，走 ST 淨化，不進 TH iframe。

社群先例：阡濯「html 程式碼注入器」用程式碼塊換介面；TH 文件寫明最初靈感來自它。本 Wiki 記機制，不搬第三方卡。

## iframe 全表

從外到內。名字混了就會把 `getVariables` 寫進沒有 TH 的窗。

| 中文 | 標識 / 形態 | 誰建立 | `window` 裡有什麼 | 穩定卡用法 |
|---|---|---|---|---|
| 宿主頁 | SillyTavern 主文件，不是 iframe | ST | ST 自己的 jQuery、輸入框、主題 CSS 變數 | 小手機掛 `body`；選項橋改 `#send_textarea`；魔棒掛 `#extensionsMenu` |
| 指令碼框 | `TH-script--{指令碼名}--{指令碼id}` | TH，跑卡內/全域性指令碼 | TH 注入的全域性函式、`$`、`_`、`eventOn` | 控制中心、媒體庫、Zod 指令碼 |
| 訊息框 / 前端介面 | `TH-message--{樓層號}--{該樓第幾個介面}` | TH，把 ` ```html ` 渲成 iframe | 同上；另有 `getCurrentMessageId()` | 狀態列整頁 HTML（卡B卡內 HUD；卡A薄殼也走這條） |
| TH 的 Blob URL 模式 | 擴充套件設定「啟用 Blob URL 渲染」 | TH 可選 | 仍是 TH 前端介面，只是 `src` 換成 blob，方便看日誌 | 和卡 git-mount **不是同一件事**。部分瀏覽器不支援 |
| 卡內真身框 | `blob:` URL 或卡自己寫的 `<iframe id="xy-sb-inner">` | 卡 | **預設沒有** TH 全域性。卡A必須 `injectBridge` | 卡A git-mount 拉 `status-bar.html` |
| 抽屜/浮窗外殼裡的內容框 | HUD session 再套一層 iframe | 卡，掛在宿主 | 看外殼怎麼 bridge | 卡A移動抽屜 / 桌面浮窗 |
| 研究頁框 | 世界書編輯器裡帶 sandbox 的外鏈 iframe | 工坊 UI | 故意鎖死 | 不是 HUD |

官方 `getIframeName()`：[其他工具函式](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/功能詳情/其他工具函式.html)。指南 C1 還記過短名 `TH-message-N`；對賬以雙橫線官方格式為準。

```text
宿主頁  (SillyTavern)
 ├─ 指令碼框 TH-script--…          控制中心 / 媒體庫 / Zod
 ├─ #chat .mes[mesid]
 │    └─ .mes_text
 │         ├─ 淨化後的碎片 HTML     OMNI / 氣泡 / 選項  ← 不是 iframe
 │         └─ 訊息框 TH-message--樓號--序號
 │              └─ （卡A）blob 真身框
 ├─ 抽屜 / 浮窗外殼               掛宿主，不是掛訊息樓
 └─ 小手機 #xy-phone-root 等      掛宿主 body
```

隔離事實（生產卡已踩）：

- 指令碼框和訊息框**不是同一個 `window`**。`window.XY_RT_BASE` 經常到不了狀態列殼。
- blob 真身再隔一層：沒有 `$` / `Mvu` / `getVariables`，見 [[concepts/git掛載與遠端真身]]。
- 不同樓的訊息框互相看不見，要經 `parent`、chat 變數或 `eventEmit`。
- `window.parent` 在同源時是 ST 主窗；跨域會拋 SecurityError，生產程式碼用 `hostWindow()` / `hostDocument()` 包 try/catch。

## 宿主 chrome（私有 DOM，不是公開 API）

E5 已經寫：掛 `#extensionsMenu` 依賴 ST 私有 DOM。切版本可能改名。下列是三張穩定卡和 C12 **實際摸過的**節點，不是把 `index.html` 抄一遍。

| 選擇器 | 含義 | 誰在用 |
|---|---|---|
| `#chat` | 聊天列表容器 | 主題 / 量寬 |
| `.mes` | 一條訊息樓 | ST 自己；`$(`.mes[mesid="${id}"]`)` 出自 `chats.js` |
| `[mesid]` | 樓號屬性 | ST；不是 `data-message-id` |
| `.last_mes` | 最新樓 | 常見口語；以執行時 class 為準 |
| `.mes_text` | 訊息正文槽。淨化後的 HTML 進這裡 | 渲染管線終點 |
| `.mes_reasoning` | 推理塊 | `chats.js` 與 `.mes_text` 並列綁點選 |
| `#sheld` | 主聊天殼 | 移動端安全區、`--sheldWidth` |
| `#form_sheld` / `#send_form` | 底部發送區 | C12 量軟鍵盤避讓 |
| `#send_textarea` | 玩家輸入框 | `options_bridge.js`、`kdn_bridge.js` |
| `#send_but` | 傳送按鈕 | C10：若走宿主傳送鏈會摸它 |
| `#extensionsMenu` / `.extensionsMenu` | 魔棒選單 | 控制中心入口；沒有就回退 `document.body` |
| `#top-settings` / `#navbar` / `#sheld_header` | 頂欄 chrome | C12 量抽屜別擋住 |

輸入框不要直接 `input.value = …` 當正式傳送。穩定卡走酒館助手：`/setinput` 填、`/send \| /trigger` 直髮。

## TH iframe 裡預注入的全域性

C1 + 官方文件。主體在任意 TH iframe 裡可用，**不要假設宿主頁或 blob 真身也有**。

| 符號 | 來源 | 幹什麼 |
|---|---|---|
| `window.SillyTavern` | ST，TH 保證重新整理 | `getContext()` 等；完整 key 以真機為準 |
| `window.TavernHelper` | TH | 封裝 API；也有自由函式形態 |
| `eventOn` / `eventEmit` / `iframe_events` / `tavern_events` | TH（JS-Slash-Runner 注入） | 事件。`eventOn` 返回 `{ stop() }` |
| `getVariables` 等 | TH | 變數。作用域 `chat` / `global` / `message` / `script`… |
| `getIframeName` / `getCurrentMessageId` / `getScriptId` / `reloadIframe` | TH | 認窗。標 🚫TavernHelper 的是底層工具，文件單獨列出 |
| `$` / `_` / `z` / `YAML` / `toastr` | TH 內建庫 | blob 真身預設**沒有** |
| `Vue` / `PIXI` / `builtin` | 文件有，生產卡主路徑未當依賴 | medium，未走 |
| `Mvu` | MagVarUpdate，`initializeGlobal` | 不是 TH 內建；先 `waitGlobalInitialized('Mvu')` |

iframe 生命週期事件（`iframe_events`）：

| 常量 | 字串 | 回撥 |
|---|---|---|
| `MESSAGE_IFRAME_RENDER_STARTED` | `message_iframe_render_started` | `(iframe_name)` |
| `MESSAGE_IFRAME_RENDER_ENDED` | `message_iframe_render_ended` | `(iframe_name)` |
| `GENERATION_STARTED` | `js_generation_started` | `(generation_id)` |
| `GENERATION_ENDED` | `js_generation_ended` | `(text, generation_id)` |
| `STREAM_TOKEN_RECEIVED_FULLY` | `js_stream_token_received_fully` | `(full_text, generation_id)` |
| `STREAM_TOKEN_RECEIVED_INCREMENTALLY` | `js_stream_token_received_incrementally` | `(incremental_text, generation_id)` |

樓層 iframe 何時銷燬（翻頁 / swipe / 新訊息）仍是指南懸案 U7，本頁不假裝已測。

## 訊息樓淨化詞（不是 iframe 的那條路）

ST `chats.js` `addDOMPurifyHooks()` + `encodeStyleTags` / `decodeStyleTags`（release 直讀）：

| 詞 | 實際做什麼 |
|---|---|
| `MESSAGE_SANITIZE` | 這條 DOMPurify 配置開了，才改 class |
| `custom-` 字首 | 每個 class token 前面加 `custom-`。豁免：`fa-*`、`note-*`、`monospace`；已是 `custom-` 開頭的不再加 |
| `menu_button` | `MESSAGE_ALLOW_SYSTEM_UI` 時 BUTTON/DIV 可保留系統 UI class |
| `<style>` → `<custom-style>` | 進 DOMPurify 前 encode；出來再 decode。**不是**把 `style=""` 改名 |
| `.mes_text ` 字首 | decode 時給 CSS 選擇器加作用域，防汙染別的樓 |
| `ADD_TAGS: ['custom-style']` | 1.14.0 / 當前 release 仍是這個自定義標籤 |
| `data-*` / `aria-*` | DOMPurify 預設放行，所以協議寫屬性 |

因此：碎片 HTML（OMNI、氣泡、選項）選擇器用 `[data-*]`。TH iframe **內部**自己的文件不受這套 class 改寫；但模板一旦漏進 `.mes_text` 仍會被改。

## 視口、單位、高度

| 詞 | 含義 |
|---|---|
| `vw` / `vh` | 在 TH 訊息 iframe 裡相對**這個 iframe**，不是瀏覽器視口。TH 文件專項警告 |
| `min-height: *vh` | TH 會改成相對瀏覽器高度，防 iframe 被自己撐死迴圈 |
| `window.frameElement` | 內層指令碼摸外層 `<iframe>` DOM，用來改高度 |
| `syncHeight` + `ResizeObserver` | 卡A殼把內層高度同步到外層 |
| `visualViewport` | 軟鍵盤 / 瀏覽器 chrome 變化；C12 抽屜要聽它 |
| `env(safe-area-inset-*)` | 劉海 / Home 條。宿主 `#sheld`、PWA `body.PWA` 已補 |
| `--sheldWidth` / `--fontScale` / `--SmartThemeBodyColor` | 寫在宿主 `documentElement`，iframe **不繼承**。同源才能 `parent` 去讀 |
| `@media (max-width: 1000px)` | ST 宿主主斷點，側欄變全屏抽屜 |
| `1000px` vs 卡片內 `600px` | 不是同一套斷點。卡片不要呼叫宿主 `isMobile()`（module 匯出，iframe 拿不到） |
| `movingUI` | ST 可拖面板。C13：不當角色卡公開 API |

TH 高度：穩定卡不靠社群常見的 `postMessage { type: 'frameHeight' }`；靠 TH 自適應或自己 `syncHeight`。

跨文件視覺約束（不改上表）：

- 跨文件 iframe 的 `backdrop-filter` 糊不到宿主聊天區；磨砂只能做在本框，或改掛宿主文件。
- 上表裡的 `--sheldWidth` 等宿主 CSS 變數仍不繼承；但 `color-scheme` 會傳入 iframe。
- Shadow DOM 只抗樣式洩漏，不是安全邊界。
- 對照見 [[comparisons/嵌入三路徑對照]]；審美連結見 [[queries/前端視覺與靈感站點蒸餾目標]]；前端名詞取捨見 [[concepts/前端架構名詞與取捨]]。

## OPFS 與本機選取

兩套檔案系統，不要併成「瀏覽器能讀寫盤」。

| 詞 | 規範位置 | 入口 | 使用者看見什麼 |
|---|---|---|---|
| OPFS（源私有檔案系統） | [WHATWG File System 活標準](https://fs.spec.whatwg.org/) | `navigator.storage.getDirectory()` | 該源自己的桶，不先彈本機選資料夾 |
| 本機選取（File System Access） | 仍是 [WICG 社群稿](https://wicg.github.io/file-system-access/) | `showOpenFilePicker` / `showSaveFilePicker` / `showDirectoryPicker` | 使用者挑本機檔案或目錄 |

酒館卡 iframe 即使碰到這些 API，桶也跟該框的 origin / `blob:` 有關，不是「開啟使用者資料夾」。

## 卡 iframe 無 OS 安裝面

Web App Manifest、應用徽章、Share Target、檔案處理都掛在**已安裝的頂層 Web 應用**上。酒館卡 iframe 沒有這層安裝面，下列能力**不自動落到卡**。

| 能力 | 現行入口 | 為什麼落不到卡 |
|---|---|---|
| Web App Manifest | [W3C WD 2026-08-13](https://www.w3.org/TR/appmanifest/) | 清單描述啟動 URL、圖示、`display`、作用域；登記的是頂層已安裝應用 |
| 徽章 | [Badging API WD](https://www.w3.org/TR/badging/) | `setAppBadge` 寫的是已安裝應用在主屏 / Dock 上的角標 |
| Share Target | 無 TR；[倉已於 2026-06-30 歸檔](https://github.com/w3c/web-share-target) | 草稿仍在 [w3c.github.io](https://w3c.github.io/web-share-target/)；要進系統分享面板，且通常要求已安裝 |
| 檔案處理 | [WICG manifest-incubations `file_handlers`](https://wicg.github.io/manifest-incubations/#file_handlers-member) | 不在 appmanifest TR 裡；是「用已安裝 PWA 開啟這類檔案」 |

## 入口與外殼詞（窗在哪，按鈕是什麼）

| 中文 | 標識 | 掛哪 |
|---|---|---|
| 魔棒 / Wand | `#extensionsMenu` | 宿主 |
| 懸浮球 / launcher | C11 `OrbEntry` | 宿主；只 `dispatch(actionId)` |
| 命令登錄檔 | command registry | 入口層，不讀 `stat_data` |
| HUD session | `phase: idle/loading/ready/failed` | 抽屜和浮窗共用核心 |
| 抽屜殼 | DrawerShell | 宿主視口邊緣，不要寫進訊息 iframe |
| 浮窗殼 | FloatingShell | 宿主；不要在訊息 iframe 裡 `position:fixed` 裝浮窗 |
| 同層前端 | C5 | 首樓當整場 App。三張穩定卡**未走** |
| 獨立前端 | C6 | 脫離 ST。未走 |

## 跨窗怎麼說話

| 路徑 | 幹什麼 |
|---|---|
| `hostWindow()` / `hostDocument()` | 摸輸入框、魔棒、`body` |
| `getVariables` / chat 變數 | 持久狀態匯流排 |
| `eventOn` / `eventEmit` | 通知重新整理 |
| `initializeGlobal` / `waitGlobalInitialized` | 指令碼框把 `Mvu` 等介面交給別的框 |
| `injectBridge` | 只給**沒有 TH** 的 blob 真身補全域性 |
| `postMessage` | 瀏覽器標準；本專案高度同步未走這條 |

`reloadIframe()` 等於 `location.reload()`，會弄丟已 `initializeGlobal` 的介面。

## Zag `getRootNode`：浮層對到對的 document

Zag 用 `document.querySelectorAll` / `getElementById` 找觸發器和浮層。iframe、Shadow DOM 裡，全域性 `document` 常常不是元件所在的那棵樹。機器上下文要傳 `getRootNode`，返回**這個元件所在的** `Document` 或 `ShadowRoot`。

對映：狀態列訊息框、blob 真身、抽屜/浮窗外殼、宿主頁是不同 `document`。Tooltip / popover / 選單必須掛在觸發器那一棵樹上。這是跨文件根，不是「本倉庫已採用 Zag」。詳頁見 [[concepts/無頭元件與根節點]]。

## PWA 行業句；卡 iframe 不是 PWA

行業事實（對已安裝或頂層站點）：Safari 在連續七日無互動時可清指令碼可寫儲存；快取裡的 opaque 跨源響應用於配額時會被墊高。見 [WebKit 2020-03-24](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)、[MDN 配額](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)。

對映：卡 iframe 不是 PWA。沒有 OS 安裝面，也沒有獨立於 Safari 的「主屏應用」計數。不要把七天清除或 opaque 虛報配額當成「狀態列 iframe 的儲存合同」。卡側持久狀態仍走 chat 變數、`eventOn` / `eventEmit` 和宿主橋。

## 邊界

- JS-Slash-Runner 許可證不是開源；本頁只用官方文件和指南已公開的符號，不搬擴充套件原始碼。
- ST 選擇器是私有 DOM，版本會變。新程式碼優先 TH API（`/setinput`、`triggerSlash`），宿主 querySelector 當有界適配。
- 指南迴源基準多是 ST v1.14.0；`chats.js` 的 `custom-` 鉤子在 2026-08-13 的 **release** 仍在。API 簽名以當前安裝為準。
- Vue / PIXI / 資料庫同層 / Live2D：總圖示未走，本頁不展開。
- OPFS 是 WHATWG 活標準；本機選取仍是 WICG。兩者都不是「卡能讀寫使用者磁碟」。
- 酒館卡 iframe 無 OS 安裝面：Manifest / 徽章 / Share Target / 檔案處理不自動落到卡。
- Share Target 無 TR，`w3c/web-share-target` 已歸檔。
- Zag `getRootNode` 是跨文件根對映，不是本倉庫採用 Zag。
- 卡 iframe 不是 PWA。

## 相關內容

- [[concepts/角色卡前端名詞中英對照]]
- [[concepts/角色卡DOM與掛載點]]
- [[concepts/角色卡技術路徑總圖]]
- [[concepts/訊息渲染與正則管線]]
- [[concepts/git掛載與遠端真身]]
- [[concepts/入口外殼與HUD宿主]]
- [[concepts/小手機與宿主橋]]
- [[concepts/控制中心與狀態列]]
- [[concepts/斜槓命令與宿主傳送鏈]]
- [[comparisons/三張穩定卡前端對照]]
- [[comparisons/嵌入三路徑對照]]
- [[queries/前端視覺與靈感站點蒸餾目標]]
- [[concepts/前端架構名詞與取捨]]
- [[concepts/無頭元件與根節點]]
- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
