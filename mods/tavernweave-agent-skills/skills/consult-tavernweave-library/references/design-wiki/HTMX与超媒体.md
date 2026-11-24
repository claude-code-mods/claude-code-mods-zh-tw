---
title: HTMX與超媒體
created: 2026-08-14
updated: 2026-08-15
type: concept
status: active
tags:
  - wiki
  - concept
  - tooling
  - research
sources:
  - https://htmx.org/essays/when-to-use-hypermedia/
  - https://htmx.org/essays/hypermedia-on-whatever-youd-like/
  - https://htmx.org/essays/locality-of-behaviour/
  - https://htmx.org/essays/hypermedia-friendly-scripting/
  - https://data-star.dev/guide/getting_started
  - https://alpinejs.dev/start-here
  - https://stimulus.hotwired.dev/handbook/introduction
  - https://htmx.org/essays/hypermedia-driven-applications/
  - queries/第三批蒸餾目標.md
  - queries/前端視覺與靈感站點蒸餾目標.md
  - concepts/前端架構名詞與取捨.md
  - comparisons/行業架構方案何時用.md
knowledge_class: factual
---

# HTMX與超媒體

本頁不是已採用技術，也不是換棧工單。檢索日 2026-08-14。賬本樞紐是 [[queries/第三批蒸餾目標]] 的 **B3-Htmx**（7 條）。

第一批已收 [HTMX HDA](https://htmx.org/essays/hypermedia-driven-applications/)，見 [[queries/前端視覺與靈感站點蒸餾目標]] 與 [[concepts/前端架構名詞與取捨]] 的一行定義。**本頁不重蒸 HDA 長論**，只互指。

## 一句話定義

超媒體驅動的介面：伺服器繼續出 HTML（或 HTML 補丁），瀏覽器用宣告式屬性做增強，而不是先拉 JSON 再在客戶端重寫整棵 UI。HTMX 把 HTML 加成超媒體控制元件；Alpine / Stimulus 管頁內短暫態；Datastar 自稱把「後端補丁 + 前端 `data-*`」合成一套。

## 為什麼重要

[[concepts/前端架構名詞與取捨]] 已把 HTMX / HDA 放進頁面形態表：伺服器已能出 HTML、互動是增強時少前端狀態機；複雜客戶端編排仍弱，見 [[concepts/狀態機與SCXML]] 與 [[concepts/Signals與TC39]]。本頁補 B3 深頁：何時該上、行為區域性、友好指令碼、HOWL，以及 Datastar / Alpine / Stimulus 三套增強合同。名詞本身沒有對錯；對錯在互動粒度和離線/高頻需求對不上。

## 權威入口

B3-Htmx 樞紐是 [When Should You Use Hypermedia](https://htmx.org/essays/when-to-use-hypermedia/)（2022-10-23）。下列 **7** 條是本批真源。HDA 長論不算第 8 條。

| # | 入口 | 本頁用它記什麼 |
|---|---|---|
| 1 | [When to use](https://htmx.org/essays/when-to-use-hypermedia/) | 文字/CRUD/巢狀塊宜；離線、高頻態、表格動態依賴不宜 |
| 2 | [HOWL](https://htmx.org/essays/hypermedia-on-whatever-youd-like/) | 超媒體前端把後端語言從「必須 JS」裡鬆開 |
| 3 | [LoB](https://htmx.org/essays/locality-of-behaviour/) | 行為應在單元內一眼可見；與 DRY、SoC 官方承認互斥 |
| 4 | [Friendly scripting](https://htmx.org/essays/hypermedia-friendly-scripting/) | 互指 HDA；網路交換仍走超媒體；事件、島嶼、禁當 JSON RPC |
| 5 | [Datastar 入門](https://data-star.dev/guide/getting_started) | `data-*` + `@get`；`text/html` 按 id morph，或 SSE 補丁 |
| 6 | [Alpine 起步](https://alpinejs.dev/start-here) | `x-data` / `x-on` / `x-show`；頁內釘 jsDelivr `3.15.8` |
| 7 | [Stimulus 手冊](https://stimulus.hotwired.dev/handbook/introduction) | 增強「已有 HTML」；`data-controller` 橋到 JS |

許可（B3 採集，本輪未再開啟各倉 LICENSE 檔案）：HTMX 庫 0BSD、隨筆無 SPDX；Alpine / Stimulus MIT；Datastar **核心 MIT、Pro 另購**。

## 如何運作

### 不是二選一

[When to use](https://htmx.org/essays/when-to-use-hypermedia/) 借 Rich Harris 的 Transitional：同一應用可以混超媒體與 SPA 島。HTMX 與 Harris **同意要混**，**不同意線畫在哪**——作者認為有了 htmx，超媒體能走得比多數人以為的更遠。遊戲核心可以自己管指標，設定頁仍可用超媒體。官方還寫：把 SPA 島嵌進更大的超媒體應用，通常比反過來容易。島的元件合同見 [[concepts/Lit與自定義元素]] 與 [[concepts/無頭元件與根節點]]。

### 何時該上、何時不該

宜：UI 主要是文字和圖片；表單 CRUD；更新落在邊界清楚的巢狀塊裡（計數與集合同區，才能一次換一塊）；深鏈和首屏。Contexte 用 htmx 換 React 的演示被作者自己限定為「媒體站極適合」，**不是**「任何團隊換棧都砍 67%」。

不宜：依賴在渲染時算不出來（電子表格那種任意公式）；必須離線全功能（Service Worker 只標複雜選項，不是預設合同，見 [[concepts/PWA與儲存配額]] 與 [[concepts/CRDT與local-first]]）；UI 態極高頻（滑鼠軌跡、對戰幀；長列表虛擬化見 [[concepts/虛擬列表]]）；要整段複製 React 系元件（如 shadcn）；團隊/招聘不認超媒體。Twitter / Gmail 被作者當成「能用超媒體做」的粗粒度例子；Google Sheets / Maps 當成反例。絕大多數站點遠小於這四者。

超媒體 API 可以跟 UI 走：區塊改了，端點可以整段改。這是超媒體開發的特點，不是穩定 JSON 資源 API。JSON 資源合同見 [[concepts/HTTP合同與問題詳情]]、[[concepts/OpenAPI與Arazzo]] 與 [[concepts/JSON Schema與Protobuf]]。

### HOWL：前端是 HTML，後端隨便

[HOWL](https://htmx.org/essays/hypermedia-on-whatever-youd-like/)（Hypermedia On Whatever you'd Like）：前端主要是 HTML 加一點友好指令碼時，「後端為何不也用 JS」的壓力會下降。作者說這不是反 JS——htmx 本身用 JS 寫成，伺服器用 JS/TS 也可以，見 [[concepts/WinterTC與伺服器JS]]。HOWL 只恢復 MPA 那條「伺服器語言可選」。

### LoB 與友好指令碼

[LoB](https://htmx.org/essays/locality-of-behaviour/)：看一個單元就應看出它做什麼。`<button hx-get="/clicked">` 比把點選邏輯藏進另一份 jQuery 檔案更符合 LoB。LoB 不是把實現內聯，而是把**呼叫**放在看得見的地方。官方明文：LoB 常與 DRY、SoC 打架；htmx 允許屬性寫在父節點以免重複，這是用 DRY 換 LoB。離得越遠（隔幾行 < 隔一頁 < 隔檔案），違規越重。沒有硬規則。

[Friendly scripting](https://htmx.org/essays/hypermedia-friendly-scripting/) 把 HDA 裡「指令碼只增強、不顛覆」展開成可檢查的拇指規則（**不重抄 HDA 正文**）：

1. 尊重 HATEOAS：不要用 `fetch` / `XHR` 去換純 JSON 資料 API，除非響應仍是超媒體。客戶端查詢層見 [[concepts/TanStack查詢與路由]]。
2. 純前端短暫態可以留在客戶端（開合、顯隱）。要改伺服器上的系統態，必須走超媒體交換。
3. 元件用自定義事件對外說話，htmx 才能 `hx-trigger` 把它變成超媒體控制元件（例：Sortable.js 的 `end`）。
4. 必須自己管網路的複雜控制元件，做成島，再用事件接回外層超媒體。
5. 內聯指令碼（Alpine、hyperscript）可選，不是友好指令碼的必要條件。內聯與信任邊界見 [[concepts/CSP與Trusted Types]]。
6. 現實庫常不守 HATEOAS：能包一層就包，不能就隔離使用，不要為純度花光復雜度預算。

### 三套增強，不是三個 HTMX

| 庫 | 合同 | 不是 |
|---|---|---|
| Alpine | 在已有 HTML 上宣告 `x-data` 等，跟蹤頁內物件；`x-show` / `x-model` / `x-for` 管顯隱、繫結、迴圈 | 不是超媒體交換層；起步頁釘的 `3.15.8` 不是「永遠最新」 |
| Stimulus | 志向有限：給「已經有的 HTML」接 controller；`data-controller` 像 `class` 接 CSS 那樣接 JS | 不是 SPA；手冊站採集時標 3.2.2（2023-08-07） |
| Datastar | 入門頁自稱後端反應像 htmx、前端反應像 Alpine；`@get()` 發 fetch；`text/html` 按元素 id morph；`text/event-stream` 則是 `datastar-patch-elements` SSE | 不是 HTMX 的另一發行版；核心 MIT ≠ Pro |

Datastar 預設 morph：只改變動的 DOM，並只重應用改過的 `data-*`，以保留前端態。響應裡必須已有對應 id，morph 才接得上。SSE 事件之間要空兩行。入門頁推薦自託管指令碼，CDN 只當最快起步。`data-*` 選擇器習慣見 [[concepts/OMNI正則與data屬性選擇器]]。

## 例子

- 正例：媒體站、後臺表單、設定頁用超媒體；深鏈和首屏走 HTML。
- 正例：聯絡人詳情把郵箱計數和郵箱列表放同一塊，一次替換該塊。
- 正例：拖拽島觸發事件，外層 `hx-trigger` / 等價物再 POST HTML。
- 正例：Alpine 只做下拉開合，不把開合同步成伺服器資源。
- 反例：把 Contexte 的 67% 寫成「換 htmx 的普遍收益」。
- 反例：每個 mousemove 打一槍超媒體請求。
- 反例：把 Datastar 寫成「HTMX + Alpine 的官方合併發行」，或把核心 MIT 寫成整站（含 Pro）都 MIT。
- 反例：因本頁出現這些庫就寫進 recipe / 髮卡依賴。

## 邊界與易混概念

- 不包括：HDA 長論重述、*Hypermedia Systems* 全書、hyperscript 語言全文、具體後端 SDK 教程。
- 不包括：本倉庫已採用 HTMX / Datastar / Alpine / Stimulus。
- 易混：HDA（第一批已收的架構隨筆）≠ 本頁的「何時用 / LoB / 友好指令碼」。
- 易混：HOWL ≠ 「禁止伺服器用 JS」。
- 易混：LoB ≠ 把實現細節糊進標記；也 ≠ 可以無視 DRY。
- 易混：Alpine / Stimulus 的頁內態 ≠ 超媒體交換。短暫態可以本地；系統態不行。
- 易混：Datastar 的 SSE 補丁 ≠ HTMX 的 `hx-*` 屬性面；事件名和 morph 策略是另一份合同。
- 易混：Transitional 混用 ≠ 「已經是 SPA」。島堆多了仍會變成偽 SPA，見 [[concepts/前端架構名詞與取捨]]。
- 酒館卡 iframe 無這套超媒體往返的預設宿主；對映見末節，不是選型。

## 來源與證據

- 何時用、巢狀塊、離線/高頻反例：本輪開啟 [when-to-use-hypermedia](https://htmx.org/essays/when-to-use-hypermedia/)。
- HOWL 與 JS Pressure：本輪開啟 [hypermedia-on-whatever-youd-like](https://htmx.org/essays/hypermedia-on-whatever-youd-like/)。
- LoB 定義及與 DRY/SoC 的衝突：本輪開啟 [locality-of-behaviour](https://htmx.org/essays/locality-of-behaviour/)。
- 友好指令碼六條：本輪開啟 [hypermedia-friendly-scripting](https://htmx.org/essays/hypermedia-friendly-scripting/)；HDA 只互指，不摘長論。
- Datastar morph / SSE：本輪開啟 [getting_started](https://data-star.dev/guide/getting_started)。
- Alpine 指令與 `3.15.8` 釘死：本輪開啟 [start-here](https://alpinejs.dev/start-here)。
- Stimulus 定位：本輪開啟 [handbook/introduction](https://stimulus.hotwired.dev/handbook/introduction)。
- 許可分叉與 Stimulus 版本標：[[queries/第三批蒸餾目標]] B3-Htmx 採集行（2026-08-14）。

### 已知衝突（不靜默覆蓋）

- **Datastar 核心 MIT ≠ Pro。** B3 釘：核心 MIT、Pro 另購。入門頁只講 MIT 核心指令碼與自託管；不要寫成整套產品線同一許可。
- **LoB 與 DRY / SoC 官方互斥。** 作者要你做主觀取捨，不是選一個原理消滅另一個。
- **HDA 不重收。** 第一批已有長論入口；本頁只蒸深頁。前端架構頁的一行定義仍有效，本頁不替換它。
- **隨筆無 SPDX，庫有許可。** 四篇 htmx.org/essays 本輪未見 SPDX；0BSD 只標庫。
- **Alpine 起步頁版本釘死。** `3.15.8` 是該教程 CDN 行，不是現行唯一發行。
- **與 Harris 的線。** 雙方都要 Transitional；線的位置兩邊留，本頁不判誰贏。

## 對映到本倉庫

角色卡 HUD：入口掛宿主 document，整頁尾本走 TH iframe，開合/拖拽是本地 UI state，MVU 是服務端狀態心智，見 [[concepts/入口外殼與HUD宿主]] 與 [[concepts/酒館宿主與iframe分層]]。這不是 HTMX 往返，也不是 Datastar SSE。獨立工坊站當前落點仍是 SSG/ISR + islands，見 [[comparisons/工坊架構該上與不該上]] 與 [[concepts/邊緣快取與SWR]]。對映 ≠ 本倉庫已採用 HTMX / Alpine / Stimulus / Datastar。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] 未重蒸第一批 HDA 長論
- [x] `tags` 只使用 `SCHEMA.md` 的 Tag Taxonomy
- [ ] 同步 `index.md` 與 `log.md`（本波不改）

## 相關內容

- [[queries/第三批蒸餾目標]]
- [[queries/前端視覺與靈感站點蒸餾目標]]
- [[concepts/前端架構名詞與取捨]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/工坊架構該上與不該上]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/狀態機與SCXML]]
- [[concepts/WinterTC與伺服器JS]]
- [[concepts/Lit與自定義元素]]
- [[concepts/邊緣快取與SWR]]
- [[concepts/PWA與儲存配額]]
- [[concepts/CSP與Trusted Types]]
- [[concepts/OpenAPI與Arazzo]]
- [[concepts/Signals與TC39]]
- [[concepts/虛擬列表]]
- [[concepts/JSON Schema與Protobuf]]
- [[concepts/TanStack查詢與路由]]
