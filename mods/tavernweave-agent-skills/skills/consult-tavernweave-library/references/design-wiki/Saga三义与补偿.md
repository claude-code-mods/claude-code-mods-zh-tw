---
title: Saga三義與補償
created: 2026-08-14
updated: 2026-08-14
type: concept
status: active
tags:
  - wiki
  - concept
  - tooling
  - research
sources:
  - https://microservices.io/patterns/data/saga.html
  - https://microservices.io/patterns/data/transactional-outbox.html
  - https://microservices.io/patterns/communication-style/idempotent-consumer.html
  - https://docs.temporal.io/
  - https://docs.temporal.io/design-patterns/saga-pattern
  - https://www.omg.org/spec/BPMN/2.0.2
  - https://www.omg.org/spec/BPMN/2.0.1
  - https://www.iso.org/standard/62652.html
  - https://docs.camunda.io/docs/components/modeler/bpmn/compensation-events/
  - https://learn.microsoft.com/en-us/azure/architecture/patterns/rate-limiting-pattern
  - https://learn.microsoft.com/en-us/azure/architecture/patterns/throttling
  - https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker
  - https://learn.microsoft.com/en-us/azure/architecture/patterns/retry
  - https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
knowledge_class: factual
---

# Saga三義與補償

蒸餾自 [[queries/第二批蒸餾目標]] B2-Dist 與 [[queries/第三批蒸餾目標]] B3-WF / B3-RL / B3-CB。檢索日 2026-08-14。不是本倉庫已採用的分散式事務棧。

## 一句話定義

「Saga」不是一個詞。口語裡至少三義並存：[microservices.io 資料模式](https://microservices.io/patterns/data/saga.html)（跨服務本地事務序列）、[Temporal 補償程式碼](https://docs.temporal.io/design-patterns/saga-pattern)（工作流裡手寫的補償棧）、[BPMN 補償事件](https://docs.camunda.io/docs/components/modeler/bpmn/compensation-events/)（圖上的邊界事件與補償處理器）。三者都談失敗後怎麼撤，但合同、載體和觸發方式不同，不要併成一詞。

## 為什麼重要

聽到「上個 Saga」先問是哪一義：訊息編排、引擎程式碼，還是流程圖符號。Outbox / Inbox 是資料 Saga 的配套，不是工作流引擎功能。限流、熔斷、艙壁、重試是韌性層，不是補償層。工坊當前用同步 REST + 稽核狀態機，不上分散式 Saga；這是產品對映，不是對行業方案的否定。

## Saga 三義

| 義 | 真源 | 載體 | 回滾怎麼發生 | 不是什麼 |
|---|---|---|---|---|
| 資料模式 | [microservices.io Saga](https://microservices.io/patterns/data/saga.html) | 每服務本地事務 + 訊息 | 某步因業務規則失敗，再跑一串補償事務；編舞靠事件，編排靠協調器 | 不是 Temporal API，也不是 BPMN 符號 |
| Temporal 補償程式碼 | [Temporal Saga Pattern](https://docs.temporal.io/design-patterns/saga-pattern) | Workflow 裡的補償列表；Java 有 `Saga` helper | 失敗後按登記順序的逆序（LIFO）跑補償 Activity；官方建議先登記再執行正向 Activity | 不是 BPMN 圖元素，也不規定編舞/編排訊息協議 |
| BPMN 補償事件 | OMG BPMN；實現說明見 [Camunda Compensation events](https://docs.camunda.io/docs/components/modeler/bpmn/compensation-events/) | 邊界補償事件 + `isForCompensation` 處理器 + 中間/結束丟擲 | 拋補償後只調用**已成功完成**活動的 handler；用 association，不用 sequence flow | 不是 Temporal 閉包棧，也不是 Database-per-Service 的訊息 Saga |

1987 年資料庫長事務論文是更早的歷史線，本頁不併入上表三義。

## 如何運作

### 資料模式：本地事務串 + 補償事務

前提是 [Database per Service](https://microservices.io/patterns/data/saga.html)：訂單與客戶不在同一庫，不能開一條跨服務 ACID。2PC 被標成不可用選項。做法是把一筆跨服務生意寫成一串本地事務；每步改自己的庫，再發訊息觸發下一步。某步因業務規則失敗，就對已完成的步驟跑補償事務。協調有兩種：編舞（各服務發領域事件）與編排（協調器發命令）。

代價寫在同一頁：沒有自動回滾，補償要人設計；沒有 ACID 的隔離，併發 Saga 可能讀到中間態，要用對策。發起方若用同步 `POST` 開非同步流，還要另定如何得知結局（等完再回、輪詢、或事後推事件）。

可靠跨出下一步，服務必須**原子地**改庫併發布訊息。傳統「庫 + 訊息代理」2PC 同樣被排除。配套是 [Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html)：同一本地事務裡寫入業務行和 outbox；獨立 relay 再投遞。Event Sourcing 是另一條原子出路，不繫結必須上。

Relay 可能投兩次。消費側正式名是 [Idempotent Consumer](https://microservices.io/patterns/communication-style/idempotent-consumer.html)，不是「Inbox 模式」。做法是記下已處理訊息 ID（獨立 `PROCESSED_MESSAGES` 表，或寫進業務實體），重複投遞當一次。口語 Inbox 指這件事，寫正式名。

本輪檢索 [martinfowler.com](https://martinfowler.com/)：**沒有** Saga / Outbox 專文。近鄰是 [Transactionless](https://martinfowler.com/bliki/Transactionless.html)、[Two-Phase Commit](https://martinfowler.com/articles/patterns-of-distributed-systems/two-phase-commit.html)、[Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)。不要把 Fowler 層文當成這兩條模式的真源。

### Temporal：補償是程式碼，不是圖

[Temporal 文件總入口](https://docs.temporal.io/) 把自己寫成 Durable Execution：Workflow / Activity、崩潰後續跑、Activity 預設可重試。這裡的「Saga」是設計模式頁：每步配一個能撤自己副作用的補償；失敗則逆序執行。各 SDK 載體不同（Python/Go 列表、TypeScript `unshift`、Java `saga.addCompensation` + `compensate()`），合同相同：先登記、逆序跑、補償必須冪等，並能處理「正向 Activity 根本沒跑完 / 沒跑成」。

官方對比兩種登記時機：先登記更安全（刷卡已發生但 Activity 報失敗時仍能撤），補償要能 no-op；後登記只撤已成功步，邏輯簡單，但半成功會漏撤。這是程式碼約定，不是 BPMN 的「只補償已完成活動」。Temporal 的 Activity 重試與補償棧疊用，但重試本身不是 Saga。

### BPMN：補償是事件與處理器

[ISO/IEC 19510:2013](https://www.iso.org/standard/62652.html) **等於** [OMG BPMN 2.0.1](https://www.omg.org/spec/BPMN/2.0.1)。OMG 現行正式版是 [BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2)（2014-01）。不要把 ISO 號寫成 2.0.2，也不要把 2.0.2 寫成 ISO 正文。

圖上的合同：活動掛補償邊界事件；handler 帶補償標記、用 association 掛上，不進正常順序流。程序走到補償中間丟擲或結束事件時，在作用域內呼叫已完成活動的 handler；進行中或已終止的不調。可按 `activityRef` 只補某活動，否則廣播該作用域。Camunda 頁是實現說明，規範真身在 OMG PDF。

### 限流 ≠ 節流 ≠ 令牌桶

[微軟 Rate Limiting](https://learn.microsoft.com/en-us/azure/architecture/patterns/rate-limiting-pattern)（2026-06-08）：**呼叫方**控制自己往下游送請求的速率，好待在對方的 throttling 限額內，少製造 429 風暴。典型是批次攝入；常配持久佇列，按容量出隊。

[微軟 Throttling](https://learn.microsoft.com/en-us/azure/architecture/patterns/throttling)（2026-05-29）：**被呼叫方 / 系統**給例項、租戶或整服務設資源上限，過載時拒絕、降級或推遲，以保住 SLO。策略包括按主體限額、功能降級、佇列削峰。Outbound rate limits 在節流頁裡是保護不健康依賴的一種手段，仍不是 Rate Limiting 那一頁的定義。

令牌桶是實現演算法。Azure API Management 經典檔用滑動視窗，v2 檔用令牌桶——這是產品實現，不是「Rate Limiting 模式 = 令牌桶公式」。三詞不要互換。

### 熔斷 / 艙壁 / 重試：另一層

| 模式 | 管什麼 | 典型狀態 / 手段 |
|---|---|---|
| [Retry](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry) | 短暫故障，預期再試能成 | 取消 / 立即重試 / 延遲重試；要看是否冪等 |
| [Circuit Breaker](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker) | 別對大機率失敗的遠端呼叫死磕 | Closed → Open → Half-Open |
| [Bulkhead](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead) | 隔離資源池，一艙進水整船不沉 | 連線池、執行緒池、分例項、分佇列 |

微軟寫明：Retry 期望成功，Breaker 阻止很可能失敗的呼叫；二者可疊，但重試必須理會斷路器已開。艙壁頁建議與 retry / breaker / throttling 組合。Azure 模式總表把 Saga 建在 Compensating Transaction 上；B3-CB 裁定 **Saga 行不採，回 B2-Dist**。補償事務與資料 Saga 相近，仍不要用來把上面三義併成一詞。

這一層回答「這次呼叫還要不要打出去、資源會不會被一個壞依賴抽乾」。Saga 三義回答「跨步生意失敗後業務狀態怎麼收」。不是同一層。

## 例子

- 正例：訂單與額度分庫，用資料 Saga + Outbox + Idempotent Consumer 串本地事務；失敗走補償，不開 2PC。
- 正例：Temporal Workflow 在 `addBankAccount` 前登記 `disconnectBankAccounts`，下游半成功也能冪等撤。
- 正例：BPMN 圖給「已訂機票」掛補償 handler，取消行程時拋補償事件，只撤已完成活動。
- 正例：呼叫方按 Rate Limiting 勻速寫入；服務方按 Throttling 在過載時 429 / 降級；依賴持續失敗時熔斷，執行緒池按艙壁切開。
- 反例：把 Temporal `Saga` helper、BPMN 補償事件、microservices.io 編舞寫成「一種 Saga」。
- 反例：把口語 Inbox 寫成正式模式名；或引用 Fowler 當 Saga/Outbox 專文。
- 反例：把令牌桶公式、節流、限流三詞互換；或把熔斷當分散式事務。
- 反例：工坊稽核主路徑上分散式 Saga / 事件匯流排，卻把「現在不上」寫成「這些模式不正當」。

## 邊界與易混概念

- 不包括：具體引擎選型、工坊已採用宣告、攻擊或憑證。
- 三義並存，不要併成一詞。
- Inbox 正式名是 Idempotent Consumer。
- Fowler 無 Saga/Outbox 專文。
- ISO 19510 = BPMN 2.0.1；OMG 現行 2.0.2。
- 微軟 Rate Limiting ≠ Throttling ≠ 令牌桶公式。
- 熔斷 / 艙壁 / 重試與 Saga 不是同一層。
- Azure Saga 專頁本輪不採，資料模式回 microservices.io。
- Camunda 是 BPMN 實現說明，不是 OMG 規範替代。
- Temporal 文件總入口講平臺；補償合同以 saga-pattern 頁為準。
- 區分方法：先問載體是訊息、程式碼列表，還是圖事件；再問這一層管的是業務補償還是呼叫韌性。

## 對映到本倉庫

當前工坊：Gateway 同進程；同步 REST（`list` / `detail` / `create` / `update` / `withdraw` / `review`）；稽核狀態機 `pending → approved / rejected / withdrawn`。釋出 / 稽核要同步可見結果，主路徑不上分散式資料 Saga、不上 Temporal/BPMN 補償引擎、不上 Outbox 中樞。佇列以後可以後加通知，不能當稽核骨架。限流 / 熔斷若出現，也只是邊緣保護，不是補償層。詳見 [[concepts/後端架構名詞與工坊對照]]、[[comparisons/工坊架構該上與不該上]]。

這是產品落點，不是對 Saga / Outbox / 工作流補償 / 限流熔斷的行業否定。對稱 CRUD + 一條狀態機夠用時，本地事務比跨服務補償便宜。

## 來源與證據

權威入口（16）：

1. [Saga（資料模式）](https://microservices.io/patterns/data/saga.html) — B2-Dist 樞紐。
2. [Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html) — 改庫與發訊息的原子配套。
3. [Idempotent Consumer](https://microservices.io/patterns/communication-style/idempotent-consumer.html) — Inbox 正式名。
4. [Temporal 文件總入口](https://docs.temporal.io/) — Durable Execution 平臺。
5. [Temporal Saga Pattern](https://docs.temporal.io/design-patterns/saga-pattern) — 補償程式碼合同。
6. [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2) — OMG 現行正式版。
7. [OMG BPMN 2.0.1](https://www.omg.org/spec/BPMN/2.0.1) — 與 ISO 19510 同一正文。
8. [ISO/IEC 19510:2013](https://www.iso.org/standard/62652.html) — 國際標準號；正文 = 2.0.1。
9. [Camunda Compensation events](https://docs.camunda.io/docs/components/modeler/bpmn/compensation-events/) — BPMN 補償事件的實現說明。
10. [Rate Limiting](https://learn.microsoft.com/en-us/azure/architecture/patterns/rate-limiting-pattern) — 呼叫方控速。
11. [Throttling](https://learn.microsoft.com/en-us/azure/architecture/patterns/throttling) — 系統側限額。
12. [Circuit Breaker](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker) — 斷路。
13. [Retry](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry) — 短暫故障重試。
14. [Bulkhead](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead) — 艙壁隔離。
15. [[queries/第二批蒸餾目標]] — B2-Dist 賬本。
16. [[queries/第三批蒸餾目標]] — B3-WF / B3-RL / B3-CB 賬本。

已知衝突（不得靜默覆蓋）：

- Saga 三義並存；B3-WF 與 B3-CB 都要求不要併成一詞。
- Inbox 正式名是 Idempotent Consumer；Fowler 無 Saga/Outbox 專文。
- ISO 19510 = 2.0.1，OMG 現行 2.0.2。
- 微軟 Rate Limiting ≠ Throttling ≠ 令牌桶公式。
- 熔斷 / 艙壁 / 重試與 Saga 不是同一層；Azure Saga 行回 B2-Dist。
- 工坊「現在不上」≠「行業不正當」。

尚缺：ISO 頁本次抓取超時，等式轉引 OMG 2.0.1 與 ISO 條目摘要；Camunda 站點對 LLM 入口有時落到總索引，補償語義以該路徑人工頁為準。未跑工坊或 Temporal/Camunda 真機。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 `SCHEMA.md` 的 Tag Taxonomy
- [x] 已釋出到正式區，並同步 `index.md` 與 `log.md`

## 相關內容

- [[concepts/後端架構名詞與工坊對照]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
- [[concepts/創意工坊與安全契約]]
- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/DORA五項與SLO]]
