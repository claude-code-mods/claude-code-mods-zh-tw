---
title: 事件溯源與CQRS
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
  - https://martinfowler.com/eaaDev/EventSourcing.html
  - https://martinfowler.com/bliki/CQRS.html
  - https://martinfowler.com/bliki/ReportingDatabase.html
  - https://martinfowler.com/eaaDev/EventCollaboration.html
  - https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing
  - https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs
  - https://learn.microsoft.com/en-us/azure/architecture/patterns/materialized-view
  - https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven
  - https://docs.kurrent.io/getting-started/concepts.html
  - https://docs.kurrent.io/server/v24.10/features/streams.html
  - https://docs.kurrent.io/server/v26.0/features/projections/
  - https://docs.kurrent.io/server/v25.0/features/persistent-subscriptions.html
  - queries/第五批蒸餾目標.md
  - concepts/後端架構名詞與工坊對照.md
knowledge_class: factual
---

# 事件溯源與CQRS

本頁不是已採用技術，也不是工坊必須上事件儲存或讀寫雙模型的工單。檢索時間：2026-08-14。賬本見 [[queries/第五批蒸餾目標]] B5-ES。對照頁已有 CQRS 一句；本頁補 ES 專口，不重抄 [[concepts/Saga三義與補償]]。

## 一句話定義

事件溯源（Event Sourcing）把每次狀態變更收成事件，按施加順序儲存，用重放重建狀態。CQRS 把更新模型與讀取模型分開，**可以沒有事件**。二者常疊用，定義不是一條。

## 為什麼重要

聽到「上 ES/CQRS」先問是拆讀寫，還是以事件為真源。[[concepts/後端架構名詞與工坊對照]] 已寫「不繫結」；微軟示意圖常疊畫，仍分專頁。對稱 CRUD + 一條狀態機不必上雙模型，更不必上事件儲存。工坊釋出 / 稽核主路徑仍是同步 REST + 狀態機，不上事件溯源——這是產品落點，不是行業否定。

## 權威入口

賬本 12 條見 [[queries/第五批蒸餾目標]] B5-ES。本頁只釘定義與衝突，不映象採集行。

| # | 入口 | 釘什麼 |
|---|---|---|
| 1 | [Fowler Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) | ES 專口。變更收成事件物件，按序儲存，壽命與應用狀態相同。能重建、時間點查詢、重放。官方記錄可以是事件日誌，也可以是當前應用狀態。快照是加速，不是另立真源。 |
| 2 | [Fowler CQRS](https://martinfowler.com/bliki/CQRS.html) | 寫模型與讀模型分開。可共庫或各庫。**可以沒有事件。** 多數系統是高風險複雜度；只該用在個別 Bounded Context。 |
| 3 | [Reporting Database](https://martinfowler.com/bliki/ReportingDatabase.html) | 查詢很重但領域不配 CQRS 時，先卸報表到只讀庫。Reporting DB ≠ 全量 CQRS。 |
| 4 | [Event Collaboration](https://martinfowler.com/eaaDev/EventCollaboration.html) | 元件靠廣播協作，傳送方不認訂閱者。說話方式，不是「狀態由事件序列重建」。 |
| 5 | [微軟 Event Sourcing](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) | 追加儲存記下動作；事件儲存是當前狀態的權威源。按實體一條 eventstream，重放叫 *rehydration*。遷入遷出都貴，多數部分用傳統資料管理即可。 |
| 6 | [微軟 CQRS](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs) | 命令改資料，查詢只回 DTO。基礎檔可共庫分邏輯；進階檔分庫、分擴。**訊息不是 CQRS 要件。** 「部分實現把 ES 收進 CQRS」。 |
| 7 | [Materialized View](https://learn.microsoft.com/en-us/azure/architecture/patterns/materialized-view) | 預計算、可丟、可從源重建的只讀投影。ES 源不宜直接查時常常必要，不是 CQRS 本身。 |
| 8 | [Event-driven 風格](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven) | 生產者 / 通道 / 消費者。EDA 是整合風格。耐久日誌能重放 ≠ 領域狀態以事件為真源。 |
| 9 | [Kurrent Concepts](https://docs.kurrent.io/getting-started/concepts.html) | 事件是過去的事實；日誌只追加、是最終真源；流按 stream ID 切；樂觀併發按流版本。 |
| 10 | [Event streams](https://docs.kurrent.io/server/v24.10/features/streams.html) | 一流多屬一實體；`$all` 不可往裡寫。中間不能抽刪一條。正文仍寫 EventStoreDB。 |
| 11 | [Projections](https://docs.kurrent.io/server/v26.0/features/projections/) | 反應式追加或連結。許多問題更適合另掛讀模型 + catch-up，不要預設當 CQRS 讀側。 |
| 12 | [Persistent subscriptions](https://docs.kurrent.io/server/v25.0/features/persistent-subscriptions.html) | 伺服器記位點、至少一次、組內競速，**不保證順序**。投遞層，不是溯源定義。 |

`docs.eventstore.com` 本輪超時，概念頁以 `docs.kurrent.io` 為準。產品線現用 KurrentDB 名；v24.10 流頁仍寫 EventStoreDB。同一產品，兩名並存。

## 如何運作

### 事件溯源：狀態由事件序列重建

Fowler：每次變更收成事件物件並按施加順序儲存。能完整重建、時間點查詢、重放。官方記錄可以是事件日誌，也可以是當前應用狀態；後者成立時，日誌可以只做審計與特殊處理。快照加速重放，不是另立真源。

微軟：事件儲存是關於當前狀態的權威源。按實體一條流，重放叫 rehydration。全量重放貴，所以常做物化檢視。同頁硬釘：

- **事件儲存 ≠ 訊息代理。** Kafka 一類缺按實體查流與樂觀併發，適合扇出，不能替事件儲存。
- 糾正靠再追加補償事件，原事件留下。這是同一條流上的不可變糾正，**不是**跨服務 [[concepts/Saga三義與補償|Saga]]。
- 快照最佳化重水合，事件流仍是真源。
- 投遞通常至少一次，消費要冪等。

Kurrent：細粒度流按實體切，不是一條大雜流。事件與位置不可改。截斷 / 軟刪 / 硬刪是產品語義，中間不能抽刪一條。

### CQRS：讀寫模型分開，可以沒有事件

Fowler（Greg Young 一路）：更新模型與讀取模型分開。通常是兩套物件模型。可以共庫，也可以各庫。**可以沒有事件。** 讀寫不對稱或要分擴時才值。CQRS 頁寫它「naturally fits」任務 UI、Event Collaboration、最終一致、Event Sourcing——是常疊，不是定義合併。

微軟：基礎檔可共庫分邏輯；進階檔分庫、分擴、分儲存技術。訊息不是要件。部分實現把事件儲存當寫模型與單一真源，讀模型從事件做物化檢視。疊用代價：最終一致、複雜度上升、檢視生成要快照。

領域不配 CQRS 但查詢很重時，先看 Reporting Database：主系統仍服務多數查詢，只把吃重報表卸到另一套只讀庫。

### 常疊用不是同一條

對照頁已寫「常和 CQRS 組合，**不繫結**」。本頁兩邊都留，不靜默合成一詞。

| 可以單獨成立 | 不能據此合併定義 |
|---|---|
| CQRS 共庫分物件、無事件 | 「上了 CQRS 就是事件溯源」 |
| ES 以當前狀態為官方記錄、不拆讀寫 | 「上了事件日誌就是 CQRS」 |
| 物化檢視服務 ES 查詢 | 物化檢視 = CQRS |
| ES 常與 CQRS 畫在一張圖 | 兩頁互鏈 = 同一模式 |

## 必須保留的衝突

- **ES ≠ CQRS。** Fowler：CQRS 可以沒有事件；ES 可以把當前狀態當官方記錄、不必拆讀寫。微軟：兩頁互鏈、示意圖常疊畫，仍分專頁。常疊用不是同一模式。
- 審計日誌 ≠ 事件溯源（Fowler 允許當前狀態作官方記錄；微軟 / Kurrent 把事件儲存寫成權威源）。
- 事件儲存 ≠ Kafka / 匯流排。
- 補償事件 ≠ [[concepts/Saga三義與補償|Saga]] 三義。
- Event Collaboration / EDA / Reporting DB / 物化檢視 / 持久訂閱 / 產品投影都不是 ES。
- EventStoreDB 與 KurrentDB 是更名，不是兩種模式。
- 工坊「現在不上」≠「行業不正當」。本頁對映產品落點，**不是**「工坊已採用 ES / CQRS」。

## 近鄰不是 ES

| 詞 | 一句話 | 不是什麼 |
|---|---|---|
| Event Collaboration | 廣播狀態變化，傳送方不認訂閱者 | 不是用事件序列重建狀態 |
| EDA | 生產者 / 通道 / 消費者的整合風格 | 耐久日誌能重放 ≠ ES |
| Reporting Database | 報表卸到只讀庫 | 不是全量 CQRS |
| 物化檢視 | 可丟、可重建的只讀投影 | 不是 CQRS 本身 |
| 持久訂閱 | 伺服器記位點的投遞 | 不是溯源定義 |
| 產品投影 | 長時間相關查詢；官方勸另掛讀模型 | 不是 CQRS 讀側預設解 |
| 補償事件 | 同一流再追加一條糾正 | 不是 [[concepts/Saga三義與補償|Saga]] 三義 |

## 例子

- 正例：讀寫不對稱、讀側要單獨擴，只拆 CQRS 物件模型，共庫、無事件。
- 正例：要審計與時間點重建，事件流當真源；查詢另做物化檢視。可以疊 CQRS，不是必須。
- 正例：查詢很重但寫模型仍對稱，先上 Reporting Database，不上全量 CQRS。
- 反例：把 ES 與 CQRS 寫成一詞，或把「常組合」當成定義合併。
- 反例：用 Kafka 當事件儲存；或把補償事件寫成跨服務 Saga。
- 反例：把 Event Collaboration / EDA / 持久訂閱 / 產品投影當成事件溯源。
- 反例：工坊稽核主路徑上事件儲存，卻把「現在不上」寫成「ES / CQRS 不正當」。

## 邊界與易混概念

- 不包括：Saga / Outbox / Inbox 重抄、攻擊與 ACL、預設口令、Kafka 運維、工坊已採用宣告。Saga 回 [[concepts/Saga三義與補償]]。
- **ES ≠ CQRS。** Fowler：CQRS 可以沒有事件；ES 可以把當前狀態當官方記錄、不必拆讀寫。微軟：兩頁互鏈、示意圖常疊畫，仍分專頁。
- Fowler 允許「日誌只做審計、當前狀態是官方記錄」；微軟 ES 與 Kurrent 把事件儲存 / 日誌寫成權威源。衝突留：審計日誌 ≠ 事件溯源。
- 事件儲存 ≠ Kafka / 匯流排。
- 補償事件 ≠ Saga 三義。
- EventStoreDB 與 KurrentDB 是更名，不是兩種模式。
- Greg Young / Udi Dahan 原文、EventStore 客戶端 SDK、工坊或 EventStore 真機本輪未核。

## 對映到本倉庫

對照頁已寫：對稱的包 CRUD + 狀態機不必上雙模型。[[comparisons/工坊架構該上與不該上]]：現在不上 CQRS / 事件溯源。[[comparisons/行業架構方案何時用]]：讀寫不對稱才考慮 CQRS；要審計、重放、時間旅行才考慮事件溯源，且不繫結 CQRS。

當前工坊：Gateway 同進程；同步 REST（`list` / `detail` / `create` / `update` / `withdraw` / `review`）；稽核狀態機 `pending → approved / rejected / withdrawn`。釋出 / 稽核要同步可見，主路徑不上事件儲存、不上讀寫雙模型。這是產品落點，不是對 ES / CQRS 的行業否定。

## 來源與證據

權威入口以上表 12 條與 [[queries/第五批蒸餾目標]] B5-ES 為準。分路原稿仍在 [[10-收件箱/寫回候選/第五批-B5-ES]]。對照句見 [[concepts/後端架構名詞與工坊對照]]「寫讀分離與事件」。

已知衝突見上節，不靜默覆蓋。

尚缺：Greg Young / Udi Dahan 原文（Fowler CQRS 外鏈）；EventStore 客戶端 SDK 合同；`docs.eventstore.com` 是否仍映象；工坊或 EventStore 真機。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] ES ≠ CQRS 兩邊都留
- [x] 未重抄 Saga；未寫攻擊步驟
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區

## 相關內容

- [[queries/第五批蒸餾目標]]
- [[10-收件箱/寫回候選/第五批-B5-ES]]
- [[concepts/後端架構名詞與工坊對照]]
- [[concepts/Saga三義與補償]]
- [[concepts/狀態機與SCXML]]
- [[concepts/GraphQL與非同步事件合同]]
- [[concepts/HTTP合同與問題詳情]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/工坊架構該上與不該上]]
