---
title: 狀態機與SCXML
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
  - https://stately.ai/docs/state-machines-and-statecharts
  - https://stately.ai/docs/xstate
  - https://stately.ai/docs/actor-model
  - https://stately.ai/docs/migration
  - https://xstate.js.org/docs/guides/machines.html
  - https://xstate.js.org/docs/guides/scxml.html
  - https://www.w3.org/TR/scxml/
  - https://www.w3.org/2015/08/scxml-errata.html
  - https://www.sciencedirect.com/science/article/pii/0167642387900359
  - https://statecharts.dev/
  - https://github.com/matthewp/robot
  - https://gitlab.com/scion-scxml/scion
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
knowledge_class: factual
---

# 狀態機與SCXML

本頁不是已採用技術。檢索日 2026-08-14。賬本樞紐是 [[queries/第二批蒸餾目標]] 的 **B2-SM**。

## 一句話定義

有限狀態機（FSM）用有限個互斥狀態和確定性遷移描述「現在在哪、事件來了去哪」。狀態圖（statechart）在 FSM 上加層次、併發和通訊。SCXML 是把狀態圖寫成可執行 XML 的 W3C 合同。XState / robot3 / SCION 是實現，不是規範本身。

## 為什麼重要

布林旗一多就會出現「載入中又成功又失敗」。狀態機把合法組合寫死，非法組合進不去。狀態圖再解決「狀態爆炸」：子狀態、並行區和訊息，不必把每一種組合攤成一張平面表。行業用它做控制元件行為、嚮導、會話和長流程編排。本倉庫的稽核列舉和寫回流程也是狀態機，但那是產品/治理 FSM，不是 XState，更不是 SCXML 直譯器。

## 權威入口

B2-SM 樞紐是 Stately 的狀態機/狀態圖導論。下列 12 條是入口，不是教程，也不映象全文。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [State machines and statecharts](https://stately.ai/docs/state-machines-and-statecharts) | B2-SM 樞紐。FSM 一次一態；狀態圖加層次 / 併發 / 通訊。Studio 把兩者都叫 state machines |
| 2 | [XState v5](https://stately.ai/docs/xstate) | 現行庫文件。事件驅動 + 狀態圖 + 演員模型；v4 文件另指 `xstate.js.org/docs` |
| 3 | [Actor model](https://stately.ai/docs/actor-model) | 跑起來的機器是演員：封裝狀態、郵箱序列、只靠事件通訊、可 spawn/invoke |
| 4 | [v4 → v5 遷移](https://stately.ai/docs/migration) | `Machine()` → `createMachine()`；`interpret()` → `createActor()`；v5 要 TypeScript ≥ 5.0 |
| 5 | [v4 Machines](https://xstate.js.org/docs/guides/machines.html) | 頁首寫明 **v4 不再維護**。第二參仍是 actions/guards/services，不是 v5 的 `setup()` |
| 6 | [v4 SCXML 對照](https://xstate.js.org/docs/guides/scxml.html) | v4 自稱相容 SCXML；`on` ≈ `<transition>`，`_event` 是 SCXML 事件形 |
| 7 | [SCXML 1.0 Rec](https://www.w3.org/TR/scxml/) | 2015-09-01 Recommendation。CCXML + Harel；解釋演算法在 Appendix D |
| 8 | [SCXML errata](https://www.w3.org/2015/08/scxml-errata.html) | 2016-12-28 止 7 條編輯勘誤；無 pending。Rec 未出 1.1 |
| 9 | [Harel 1987](https://www.sciencedirect.com/science/article/pii/0167642387900359) | 狀態圖原文：層次 + 正交併發 + 廣播。doi:10.1016/0167-6423(87)90035-9 |
| 10 | [statecharts.dev](https://statecharts.dev/) | 概念站。SCXML 定語義邊角；庫對規範是「不同程度支援」，不是等價物 |
| 11 | [robot3 / Robot](https://github.com/matthewp/robot) | 小函式式不可變 FSM，BSD-2-Clause。活文件宣告在 [thisrobot.life](https://thisrobot.life/)；**舊 guides 路徑 404**，見衝突 |
| 12 | [SCION GitLab](https://gitlab.com/scion-scxml/scion) | SCXML 編譯/執行單倉。GitHub `jbeard4/SCION` 只是遷址 stub |

## 如何運作

先分四層，避免把論文、XML、JS 庫和一條稽核列舉寫成同一個東西：

| 層 | 合同 | 典型入口 | 不負責 |
|---|---|---|---|
| 形式 | 狀態、事件、確定性遷移；狀態圖再加層次/併發/通訊 | Harel 1987；Stately 導論 | 某種檔案格式、某個 npm 包 |
| 規範 | XML 文件 + Appendix D 解釋演算法 | SCXML Rec / errata | 必須用 XState 或必須用 XML 才能做 FSM |
| 實現 | 把機器跑成演員或 service | XState v5、robot3、SCION | 取代 HTTP 合同或 MVU 補丁協議 |
| 產品列舉 | 少數命名狀態、人工推進 | 工坊稽核、寫回狀態機 | 層次、並行區、SCXML 直譯器 |

FSM：啟動進入唯一頂層初始態；任一時刻只在一個原子態；同一「狀態 × 事件」總指向同一目標。狀態圖用父態裝子態、用並行區同時活兩塊、用事件/演員通訊，避免把「走路×搖尾」攤成四格。

XState v5：`createMachine` / `setup().createMachine` 寫邏輯；`createActor(machine).start()` 才是活例項。演員只改自己的狀態，靠 `send` / 快照訂閱往來。`@xstate/store` 是另一條小事件 store，官方說「不必上狀態圖時從這兒起」，不要和 `xstate` 併成一個包。

robot3：`state` + `transition` + `interpret`。巢狀靠 `invoke` 另一臺機器，不是 SCXML 複合態。它仍用 `interpret`；不要把 XState v5 的 `createActor` 抄過去。

SCION：按 SCXML 跑。`scion-core` 2.x 跟 Appendix D；1.x 舊語義已棄，要相容走 `scion-core-legacy`。這是實現宣告，不是 Rec 改版。

## 必須保留的衝突

- **robot3 舊 guides 404。** 當日 WebFetch：`thisrobot.life/guides`、`/guides.html`、`/api.html`、`/api/createMachine.html`、`/integrations.html` 均 404。README 仍鏈 integrations。搜尋索引還能看到 `/guides.html` 舊目錄，以抓取 404 為準，不把舊 guides 當現行文件。活入口是 GitHub + 首頁宣告。
- **v5 / v4 文件不要並。** 現行在 `stately.ai/docs`。`xstate.js.org/docs/guides/*` 是未維護 v4。根路徑 `xstate.js.org/docs` 現場像 v5 README，不要和 guides 當成同一份。
- **Studio 用詞。** 官方把 FSM 和狀態圖都叫 state machines；本頁敘述仍分開。
- **「相容 SCXML」≠ 就是 SCXML 直譯器。** v4 有對照頁；v5 主文件不把 `scxmlToMachine` 當主路徑。轉換若出現，在工具鏈，不升成 Rec 實現宣告。
- **SCION 址。** GitHub stub → GitLab。README 仍指 `scion.scxml.io`，當日抓取超時。1.x 語義 ≠ Appendix D。
- **勘誤未改 Rec 版本。** 七條編輯勘誤，沒有 SCXML 1.1。
- **VS Code 擴充套件。** v5 文件寫明尚未完全支援 v5。
- **對映 ≠ 採用。** 稽核列舉、寫回流程、Zag 控制元件機都不是「已採用 XState/SCXML」。

## 例子

- 正例：播放器 `stopped / playing / paused`，`PLAY` / `PAUSE` / `STOP` 寫死；全屏是父態，裡面再分播放/暫停。
- 正例：狗「散步」父態裡並行「走/跑」和「搖尾/不搖」——Stately 導論的並行區。
- 正例：工坊包 `pending → approved / rejected / withdrawn`。合法邊三條，不必上 XState。
- 反例：`isLoading && isSuccess && isError` 三旗同時為真。
- 反例：把 Zag 控制元件機、Temporal 工作流、SCXML 文件寫成「都是 XState」。
- 反例：因本頁出現 XState 就寫進發卡 recipe。

## 邊界與易混概念

- 不包括：接入步驟、Studio 付費面、把某庫寫成「本倉庫已採用」。
- FSM ≠ 狀態圖 ≠ SCXML ≠ XState。一層是模型，一層是 XML 合同，一層是 JS 實現。
- 演員模型 ≠ 狀態機。XState 明文：跑起來的機器才是演員；演員也可以不是狀態機。
- robot3 ≠ 迷你 XState。前者是扁平/可組合 FSM；後者按狀態圖 + 演員編排。
- 稽核/寫回「狀態機」≠ SCXML。命名狀態加合法邊，不是直譯器。
- Temporal / BPMN（[[queries/第三批蒸餾目標]] B3-WF）是工作流引擎，不是客戶端狀態圖。Saga 三義見 [[concepts/Saga三義與補償]]。
- Zag 機器是無頭控制元件行為，見 [[concepts/無頭元件與根節點]]；對映 iframe 根，不是本頁樞紐。
- HTMX「少前端狀態機」是超媒體取向，見 [[concepts/HTMX與超媒體]]、[[concepts/前端架構名詞與取捨]]，不是行業否定。

## 對映到本倉庫

獨立工坊站已用同步 REST + 稽核列舉 `pending → approved / rejected / withdrawn`。公開列表只出已批准。這是一條本地狀態機，不必上 SCXML，也不必上 XState 演員系統。寫回治理是 `captured → … → published`，見 [[10-收件箱/寫回候選/README-寫回候選怎麼用|寫回候選怎麼用]]，同樣不是規範直譯器。

角色卡變數以 **MVU** 為心智：模型吐補丁、bundle 應用、Zod 攔結構。開合/拖拽是本地 UI state。不要把 `stat_data` 改寫成狀態圖上下文。控制元件若將來要對齊無頭庫，根節點問題歸 Zag/`getRootNode`，不歸本頁。

兩邊都留行業正當性。複雜嚮導、多演員會話、要視覺化的長流程，行業該看上表。本頁不按「卡用不上」刪 SCXML / XState / robot3。現不上是產品對映，見 [[comparisons/工坊架構該上與不該上]]、[[comparisons/行業架構方案何時用]]。

## 來源與證據

- FSM / 狀態圖：Stately 導論（一次一態；層次/併發/通訊）；Harel 1987 ScienceDirect。
- SCXML：Rec 2015-09-01；errata 止 2016-12-28，七條編輯級。
- XState v5 / 演員 / 遷移：stately.ai 三頁。v4 對照與 SCXML 事件形：`xstate.js.org/docs/guides/*`，頁首自稱不再維護。
- robot3：GitHub README 指向 `thisrobot.life`；舊 guides 路徑當日 404。
- SCION：GitLab README；GitHub 倉是遷址頁。
- 查詢賬本：[[queries/第二批蒸餾目標]] B2-SM；[[queries/第三批蒸餾目標]] B3-WF。

已知衝突見上節，不靜默覆蓋。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區

## 相關內容

- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
- [[concepts/前端架構名詞與取捨]]
- [[concepts/後端架構名詞與工坊對照]]
- [[concepts/無頭元件與根節點]]
- [[concepts/Saga三義與補償]]
- [[concepts/MVU變數閉環]]
- [[concepts/HTMX與超媒體]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
