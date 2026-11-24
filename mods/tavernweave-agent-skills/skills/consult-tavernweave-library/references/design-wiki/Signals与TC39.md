---
title: Signals與TC39
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
  - https://github.com/tc39/proposal-signals
  - https://tc39.es/process-document/
  - https://github.com/proposal-signals/signal-polyfill
  - https://angular.dev/guide/signals
  - https://angular.dev/api/core/signal
  - https://docs.solidjs.com/concepts/intro-to-reactivity
  - https://docs.solidjs.com/reference/basic-reactivity/create-signal
  - https://docs.solidjs.com/concepts/stores
  - https://preactjs.com/guide/v10/signals/
  - https://vuejs.org/guide/essentials/reactivity-fundamentals.html
  - https://vuejs.org/guide/extras/reactivity-in-depth.html
  - https://vuejs.org/api/reactivity-core.html
  - queries/第五批蒸餾目標.md
  - queries/第三批蒸餾目標.md
  - concepts/前端架構名詞與取捨.md
  - concepts/CRDT與local-first.md
knowledge_class: factual
---

# Signals與TC39

本頁不是已採用技術，也不改工坊或角色卡棧。檢索日 2026-08-14。賬本樞紐是 [[queries/第五批蒸餾目標]] 的 **B5-Signal**；分路原稿仍在 [[10-收件箱/寫回候選/第五批-B5-Signal]]。入口與階段結論轉引該頁，本頁未重抓。只收**訊號原語**，不重收 Solid Start / Qwik City / RR7 modes。框架已出荷的 signal / `ref` **不是** TC39 Stage 草稿。

## 一句話定義

Signals 是「讀時自動訂閱、寫時通知依賴」的響應式原語。TC39 有一份 [proposal-signals](https://github.com/tc39/proposal-signals) 草稿，頁首釘 **Stage 1**。Angular / Solid / Preact / Vue 的訊號（或等價的 `ref`）已經是現行產品合同。Stage 1 不是語言已出荷。

## 為什麼重要

外文常把「提案倉活著」寫成「JS 已有標準 Signals」，或反過來用框架出荷倒推「標準已定」。兩邊都不對。提案自比 Promises/A+：先對齊生態，再談標準；與 Promises 不同的是，它**不求統一應用面**，只求訊號圖與自動追蹤的核心語義。計劃在多框架原型驗證前**不升出 Stage 1**，且「只有實踐上適合多框架、且相對框架自帶訊號有真實收益才標準化」。卡內或工坊若當「瀏覽器全域性已有 `Signal`」，會在現行 ECMAScript 上靜默沒有這個物件。

## 權威入口

入口 **12** 條。`https://tc39.es/proposal-signals/` 本輪 **404**，真身在 GitHub。B5-Signal 的採集行不在本頁映象。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [tc39/proposal-signals](https://github.com/tc39/proposal-signals) | 本頁樞紐。Stage 1；末推 2026-01-25。草稿 `Signal.State` / `Computed` / `subtle`。無內建 `effect`。 |
| 2 | [TC39 Process](https://tc39.es/process-document/) | Stage 1 = under consideration，尚未選定首選方案（那是 Stage 2）。Stage 4 才 ready to be included。 |
| 3 | [signal-polyfill](https://github.com/proposal-signals/signal-polyfill) | 提案點名的預覽。README：**Do not use this in production**。無 `effect`。 |
| 4 | [Angular Signals](https://angular.dev/guide/signals) | **已出荷**。`signal(0)` 是 getter；`set` / `update`；`computed`；`effect`。 |
| 5 | [Angular `signal()`](https://angular.dev/api/core/signal) | `WritableSignal<T>`。`@angular/forms/signals` 是表單層，不當新原語。 |
| 6 | [Solid Intro](https://docs.solidjs.com/concepts/intro-to-reactivity) | 末更 2026-04-28。`createSignal` → `[getter, setter]`。元件函式只跑一次。 |
| 7 | [Solid `createSignal`](https://docs.solidjs.com/reference/basic-reactivity/create-signal) | `equals` 頁內 Default `false` vs 正文 `===`，兩邊留。 |
| 8 | [Solid Stores](https://docs.solidjs.com/concepts/stores) | `createStore` **不是** `createSignal`。signals 追蹤單值；stores 用 Proxy。 |
| 9 | [Preact Signals](https://preactjs.com/guide/v10/signals/) | `.value`；`computed` / `effect` / `batch`。`createModel` 是容器層。 |
| 10 | [Vue Fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals.html) | 推薦 `ref()`。DOM 更新進 next tick。 |
| 11 | [Vue Connection to Signals](https://vuejs.org/guide/extras/reactivity-in-depth.html) | 官方：signal ≡ `ref`。細粒度訂閱渲染**不是**資格條件。 |
| 12 | [Vue Reactivity Core](https://vuejs.org/api/reactivity-core.html) | `ref` / `computed` / `reactive` / `watchEffect`。預設 `flush: 'pre'`。 |

## 如何運作

### 主衝突：Stage 1 ≠ 框架已出荷

兩邊都留，不得互相覆蓋：

- **語言側仍是 Stage 1**。倉與 [process-document](https://tc39.es/process-document/) 釘 under consideration。Stage 2 才選首選方案，且仍可能永不進標準。polyfill 禁生產。`tc39.es/proposal-signals/` 404，不能把短鏈升成規範 URL。
- **四框架原語已出荷**。Angular `signal`、Solid `createSignal`、Preact `@preact/signals`、Vue `ref` 都是現行產品頁，不是「等標準再實現」的預告。

不能用提案草稿覆蓋出荷 API，也不能用出荷倒寫成「JS 已有標準 Signals」。Stage 1 比「已收口未入庫」更早，更不能當語言全域性。框架 signal ≠ Stage 草稿。

### 應用面分裂

提案自己寫：`.get()` / `.set()` **與所有流行 Signals API 都不一致**。目標是框架核心互操作，不是統一 `signal()`。

| 線 | 讀 | 寫 | 派生 | 副作用 |
|---|---|---|---|---|
| 提案草稿 | `Signal.State#get` | `#set` | `Signal.Computed` | **無** `effect`；框架用 `Signal.subtle.Watcher` |
| Angular | `count()` | `count.set` / `update` | `computed` | `effect` / `afterRenderEffect` |
| Solid | `count()` | `setCount` | memo | `createEffect` |
| Preact | `count.value` | 賦 `.value` | `computed` | `effect` |
| Vue | `count.value` | 賦 `.value` | `computed` | `watchEffect` / `watch` |

寫操作在提案裡同步立即可見；`notify` 同步，但禁止在回撥裡讀寫訊號。這是核心合同，不是應用面教程。

### 訊號 ≠ 細粒度 store

Vue 明文：細粒度訂閱渲染不是成為 signal 的必要屬性；現靠編譯器 + VDOM，並在探 Vapor（未寫成已替換）。Solid 把 `createStore` 寫成另一原語。Preact 用 `createModel` 把訊號、computed、effect、action 捆成容器。提案把「遞迴響應式 store proxy」列在**組合目標**，不是 `Signal.State` 本身。Pinia / Zustand / Jotai / 「Signals Store」營銷名不能當原語入口。

### effect、相等、排程

- 提案故意不收 `effect`（排程屬框架）；四框架都有，名字各異。polyfill 同樣留給庫作者用 `Watcher` 自造。
- 相等：Angular / 提案寫 `Object.is`。Solid `createSignal` 頁 Default `false`（每次都更新）vs 正文 `===`，同頁雙留，不裁定。
- 同步：提案寫 set 同步、computed 同步可讀。Vue 官方寫 DOM 更新進 next tick；`watchEffect` 預設 `flush: 'pre'`，不是提案 `Watcher.notify` 的同步中斷。不要併成同一排程。
- Angular `asReadonly()` 只擋 `set`/`update`，不擋深突變。非同步邊界後不再追蹤。`effect` 官方標給「非響應式 API」的副作用，不是預設派生。

### Solid 兩頁措辭

Stores 頁寫 signals「trigger a full re-render」；Intro 頁寫元件只跑一次、只更新用到的讀取。兩句並陳，不單邊採用。

## 必須保留的衝突

- **提案 Stage 1 vs 框架已出荷。** 倉與 process 釘 under consideration；Angular / Solid / Preact / Vue 原語頁是現行產品。不能用草稿覆蓋出荷 API，也不能用出荷寫成「JS 已有標準 Signals」。框架 signal ≠ Stage 草稿。
- 應用面分裂：提案 `.get`/`.set` 自承不跟流行面。
- 訊號 ≠ 細粒度 store 商標。
- effect 有無：提案無，四框架有。
- 相等預設：Solid 同頁打架。
- 同步合同：提案同步 vs Vue next tick。
- 入口死活：`tc39.es/proposal-signals/` 404。
- Solid Stores / Intro 兩頁措辭並陳。
- **對映 ≠ 採用。** 本頁補狀態分層缺口，不是「卡內要上 Signals」，更不是瀏覽器全域性已有 `Signal`。

## 例子

- 正例：講「JS 標準 Signals」時先報 Stage 1，再分列框架合同。
- 正例：對照原語用上表，不把 `createStore` / `reactive()` / `createModel` 寫成 `signal()`。
- 反例：因提案倉活著，寫成「瀏覽器已有 `Signal`」。
- 反例：用 Angular / Vue 出荷倒推「TC39 已收口」。
- 反例：把 `signal-polyfill` 塞進角色卡當生產依賴。
- 反例：把 Fluid Presence 的 transport `signal` 並進本詞。

## 邊界與易混概念

- 不包括：路由元框架（B3-Meta）、表單層 `@angular/forms/signals`、Svelte runes（提案列過設計輸入，本批不點名收）、MobX / RxJS 當「Signals」商標、攻擊步驟。
- Signals ≠ Fluid / WebRTC 的 signal 通道。後者見 [[concepts/CRDT與local-first]]、[[concepts/WebRTC信令邊界]]。
- Signals ≠ UI / Query / 全域性 store 三分。後者見 [[concepts/前端架構名詞與取捨]] 的「狀態分層」，那裡無訊號原語專節。
- `useOptimistic` 是 React 樂觀 UI，不是訊號圖。
- 區分方法：先問是 TC39 草稿還是某框架出荷頁；再問是單值原語還是 store / model。

## 對映到本倉庫

[[concepts/前端架構名詞與取捨]] 管狀態分層，不收本原語。本頁補那一缺口，不是釋出令，也不是「卡內要上 Signals」。角色卡嵌入 UI 今天仍按各卡已選棧（宿主 DOM、自管狀態、MVU）即可，見 [[concepts/MVU變數閉環]]。不要為對齊提案引入禁生產 polyfill。這是產品落點，不是對 Signals 的行業否定。現不上的取捨見 [[comparisons/工坊架構該上與不該上]]、[[comparisons/行業架構方案何時用]]。

## 來源與證據

權威入口上表 12 條，轉引 B5-Signal 2026-08-14 檢索。查詢賬本：[[queries/第五批蒸餾目標]] B5-Signal；[[queries/第三批蒸餾目標]] 的 B3-Meta 只作「不重收路由元框架」邊界。

已知衝突見上節，不靜默覆蓋。

尚缺：polyfill README 直抓全文待複核；提案是否仍停 Stage 1（末推 2026-01-25）；Solid `equals` 預設以原始碼還是文件為準。未跑瀏覽器或酒館真機。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區

## 相關內容

- [[queries/第五批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
- [[10-收件箱/寫回候選/第五批-B5-Signal]]
- [[concepts/前端架構名詞與取捨]]
- [[concepts/CRDT與local-first]]
- [[concepts/WebRTC信令邊界]]
- [[concepts/MVU變數閉環]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
