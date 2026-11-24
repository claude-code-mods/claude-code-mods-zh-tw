---
title: GraphQL與非同步事件合同
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
  - https://spec.graphql.org/September2025/
  - https://spec.graphql.org/
  - https://github.com/graphql/graphql-over-http
  - https://graphql.github.io/graphql-over-http/draft/
  - https://graphql.org/learn/serving-over-http/
  - https://github.com/graphql/composite-schemas-spec
  - https://www.apollographql.com/docs/graphos/reference/federation/versions
  - https://www.asyncapi.com/docs/reference/specification/latest
  - https://cloudevents.io/
  - https://github.com/cloudevents/spec/tree/ce@v1.0.2/cloudevents
  - https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md
  - https://github.com/cloudevents/spec/blob/main/docs/RELEASES.md
knowledge_class: factual
---

# GraphQL與非同步事件合同

賬本見 [[queries/第三批蒸餾目標]]（B3-GQL、B3-Async）。本頁不是已採用技術。

## 一句話定義

GraphQL 是**語言與執行合同**：客戶端按型別系統自選欄位，服務按文件執行 query / mutation / subscription。AsyncAPI 是**訊息驅動 API 的機器可讀描述**；CloudEvents 是**事件信封**。三者都不是 REST 的預設升級，也不等於 WebSocket。

## 為什麼重要

同步 HTTP 合同管「現在就要答案」。欄位形狀因客戶端而異、或事實要跨程序廣播時，行業會另寫查詢語言、非同步合同或事件信封。先分清**語言 / 傳輸 / 廠商拼圖式 / 訊息描述 / 事件信封**，才不會把 Apollo 文件、Stage 2 草案或 `main` 草稿當成現行規範。

## 權威入口

檢索日 2026-08-14。下列 12 條是本頁真源；語言規範不寫傳輸。

| # | 入口 | 釘什麼 |
|---|---|---|
| 1 | [GraphQL September 2025](https://spec.graphql.org/September2025/) | 現行**語言**規範。規範文字許可是 [OWFa 1.0](https://spec.graphql.org/September2025/)（原始碼 MIT、資料集 CC0）。請求與訂閱都寫明不要求特定序列化或傳輸。 |
| 2 | [spec.graphql.org 版本表](https://spec.graphql.org/) | Latest Release = September 2025（2025-09-03）。另有 Working Draft，不要把草稿當現行。 |
| 3 | [graphql-over-http 倉](https://github.com/graphql/graphql-over-http) | 傳輸草案，倉頭寫 **Stage 2: Draft**。語言規範故意不寫傳輸層。 |
| 4 | [GraphQL over HTTP 渲染稿](https://graphql.github.io/graphql-over-http/draft/) | 同上草案的可讀頁；不覆蓋語言規範。 |
| 5 | [Serving over HTTP](https://graphql.org/learn/serving-over-http/) | graphql.org 教學對齊草案，**不是**語言規範。只覆蓋無狀態 query/mutation。 |
| 6 | [composite-schemas-spec](https://github.com/graphql/composite-schemas-spec) | 基金會拼圖式，倉頭 **Stage 0: Preliminary**。與 Apollo Federation **並行**，不是其繼任。 |
| 7 | [Apollo Federation 版本目錄](https://www.apollographql.com/docs/graphos/reference/federation/versions) | 廠商目錄**有** v2.9（2024-08，引入 `@cost` / `@listSize`）。本輪直鏈 `/docs/federation/v2.9/` 與 `/docs/graphos/reference/federation/v2.9/` **404**。 |
| 8 | [AsyncAPI latest](https://www.asyncapi.com/docs/reference/specification/latest) | 現頁釘 **3.1.0**（Apache-2.0）。協議無關；bindings 才寫 AMQP/MQTT/Kafka/WS/HTTP 等。 |
| 9 | [cloudevents.io](https://cloudevents.io/) | CNCF Graduated。釋出說明釘 **v1.0.2**（2022-02-05）。 |
| 10 | [CloudEvents v1.0.2 樹](https://github.com/cloudevents/spec/tree/ce@v1.0.2/cloudevents) | **釋出釘**。必填上下文：`id` / `source` / `specversion` / `type`。序列化裡 `specversion` 仍寫 `1.0`（只帶主次，補丁不改欄位值）。 |
| 11 | [CloudEvents main spec.md](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md) | 標題是 **1.0.3-wip**，不是已釋出。 |
| 12 | [CloudEvents RELEASES](https://github.com/cloudevents/spec/blob/main/docs/RELEASES.md) | 已釋出最後一檔仍是 1.0.2。CESQL 1.0.0 是另一份規範。 |

基金會語言規範**沒有** Persisted Queries 專章。Apollo APQ、以及 graphql-over-http 倉裡的 Persisted Documents RFC / 附錄，都不是基金會語言規範。

## 如何運作

**GraphQL 語言。** 文件裡是操作（query 只讀取、mutation 先寫再取、subscription 按事件流取）和可複用 fragment。服務公佈型別系統；客戶端按欄位粒度要資料，響應形狀跟請求走。規範還寫校驗、執行、內省。它不是通用程式語言，也不規定儲存。請求由 schema、document、可選 operationName / variableValues / initialValue / extensions 組成；`extensions` 留給實現，避免亂加頂層欄位。

**語言規範寫什麼、不寫什麼。** 寫語法、型別、執行演算法、響應裡 `data` / `errors` / `extensions` 的形狀。不寫 HTTP 方法、狀態碼、媒體型別、URL、WebSocket 子協議、持久化查詢 ID。訂閱只規定源事件流如何變成響應流，以及何時結束；確認、緩衝、重傳、QoS 故意留給實現。

**傳輸另冊。** 語言規範 §6 寫：請求與訂閱都不要求特定序列化或傳輸。HTTP 常見，但是 Stage 2 草案與教學頁，不是 2025-09 正文。教學頁：單端點（常 `/graphql`）、POST 必做、GET 僅 query；`Accept` 走向 `application/graphql-response+json`。有 `data` 且非 null 時仍給 2xx（HTTP 沒有「部分成功」碼）。鑑權在進 GraphQL 之前；欄位授權在執行期，允許部分響應。

**拼圖式兩套。** Apollo Federation 是廠商超圖：子圖 `@link` 到 `https://specs.apollo.dev/federation/v2.x`。基金會 Composite Schemas 要標準化組合與分散式執行，仍是 Stage 0。並存，不要寫成「基金會已經取代 Federation」。

**AsyncAPI 3.1.0。** 描述應用在 channel 上 send / receive 的訊息 API，不假定拓撲。server 可以是 broker 或帶 WS 的服務。規範不建議從 receiver 文件機械翻成 sender：channel、summary、operation id 都可能對不上，中間還可能有轉發。協議細節進 bindings，不進核心物件。文件除 Components 外宣告的東西，實現必須用到。

**CloudEvents。** 跨廠商的事件資料描述。必填四元組讓中間人能不拆 payload 就路由。JSON 格式所有實現必須支援。結構化模式把整事件放進訊息體；二進位制模式把 data 放進體、屬性放進協議元資料。它不是 broker，也不替代 AsyncAPI 的操作/通道圖。

## 行業何時該上

對照 [[comparisons/行業架構方案何時用]] 與 [[concepts/後端架構名詞與工坊對照]]。本頁補合同層，不刪那些行。

| 合同 | 何時該上 | 不該當成 |
|---|---|---|
| 同步 REST / OpenAPI | 現在就要答案；固定動詞；跨語言 HTTP | 「落後，必須升 GraphQL」 |
| GraphQL | 多客戶端要自選欄位、少 over-fetch | REST 預設升級；傳輸規範；Persisted Queries 已標準化 |
| GraphQL over HTTP | 已決定 GraphQL，要客戶端/庫互操作 | 已 Accepted 的傳輸標準（仍是 Stage 2） |
| Federation / Composite Schemas | 多團隊多子圖要一張超圖 | 小 CRUD 的預設切法；兩套規範已合一 |
| AsyncAPI | 訊息驅動、多協議、要對通道和操作 | 同步稽核結果的替身；從對端文件自動生成 |
| CloudEvents | 事件要跨廠商/平臺，先統一信封 | 佇列或 broker 本身 |
| WebSocket / SSE | 高頻雙向，或只聽進度 | 合同層；GraphQL 語言正文 |

N+1、欄位級授權、快取鍵都比 REST 難，這是行業頁已寫的代價，不是工坊禁令。

## 例子

- 正例：移動端和後臺要的欄位差很多，用 GraphQL 讓客戶端自選；HTTP 互操作另看 Stage 2 草案，不假裝語言規範已寫傳輸。
- 正例：訂單已確認要扇出庫存、郵件、審計，用訊息通道（AsyncAPI 描述）+ CloudEvents 信封；下單同步應答仍走 REST。
- 反例：把 `spec.graphql.org/September2025` 當成 HTTP 狀態碼或 `application/graphql-response+json` 的真源。
- 反例：把 Apollo Federation 寫成基金會現行規範，或把 Composite Schemas Stage 0 寫成已取代 Federation。
- 反例：引用 `/docs/federation/v2.9/` 當穩定直鏈；目錄有 v2.9，版本路徑本輪 404。
- 反例：把 CloudEvents `main` 的 1.0.3-wip 寫成已釋出，或把信封 `specversion: 1.0` 誤認為「還停留在 1.0.0」。

## 邊界與易混概念

- 不包括：具體 GraphQL 伺服器實現、攻擊面清單、工坊 Gateway schema、憑證。
- GraphQL 語言 ≠ GraphQL over HTTP ≠ graphql.org 教學頁。
- 基金會無 Persisted Queries 規範 ≠ 業界沒有 APQ / trusted documents。後者是廠商或傳輸倉 RFC。
- Apollo Federation ≠ Composite Schemas。並行；成熟度差一檔（產品目錄 vs Stage 0）。
- AsyncAPI ≠ CloudEvents。前者畫應用與通道，後者封一條事件。
- GraphQL subscription ≠ WebSocket ≠ CloudEvents。訂閱是語言裡的長活操作；WS 是傳輸；CloudEvents 是信封。
- 「latest」要釘死：AsyncAPI latest 現為 3.1.0；CloudEvents 釋出釘 1.0.2。

## 來源與證據

- 語言現行與 OWFa、以及「不要求特定傳輸」： [September 2025](https://spec.graphql.org/September2025/) Overview / §6 請求註記 / §6.2.3 Delivery Agnostic / Licensing 表。
- 傳輸仍 Stage 2：[graphql-over-http](https://github.com/graphql/graphql-over-http) 倉頭與 `spec/GraphQLOverHTTP.md`。
- 基金會無 Persisted Queries：2025-09 正文無此專章；傳輸倉 RFC 與 Apollo APQ 不能填這個空。
- Federation 目錄有 v2.9、直鏈 404：版本頁有 `## v2.9`；本輪開啟 `/docs/federation/v2.9/`、`/docs/graphos/reference/federation/v2.9/` 返回 404。
- 兩套拼圖式並行：Composite Schemas 倉 Stage 0；Apollo 版本目錄仍在發 v2.x。
- AsyncAPI 3.1.0：官方 latest 頁標題與 Version 3.1.0。
- CloudEvents 釋出 1.0.2、`main` 1.0.3-wip：cloudevents.io 釋出說明、`ce@v1.0.2` 樹、`main` spec 標題、RELEASES 表。

已知衝突（不靜默覆蓋）：

1. 語言規範不寫傳輸；HTTP 仍是 Stage 2。教學頁可對齊草案，但不能升格為 2025-09 正文。
2. 基金會無 Persisted Queries 規範；廠商 APQ 與 over-HTTP RFC 並存，名稱還和 trusted documents 纏在一起。
3. Apollo Federation 與基金會 Composite Schemas Stage 0 並行。
4. Apollo v2.9 **目錄有、直鏈曾 404**（本輪復現）。
5. CloudEvents 釋出釘 v1.0.2，`main` 是 1.0.3-wip；信封 `specversion` 仍是 `1.0`。
6. AsyncAPI 不建議 receiver/sender 文件對翻。
7. 「工坊現在不上」不是「GraphQL / AsyncAPI 不是正當行業方案」。

## 對映到本倉庫

當前工坊：模組化單體 + 同步 REST（`list` / `detail` / `create` / `update` / `withdraw` / `review`）；稽核要同步可見。**不上 GraphQL，也不上 AsyncAPI / CloudEvents 當主路徑。** 這是產品落點，見 [[comparisons/工坊架構該上與不該上]]。

行業頁仍必須寫清何時該上：[[comparisons/行業架構方案何時用]] 已有 GraphQL 行與 WebSocket / SSE 行；[[concepts/後端架構名詞與工坊對照]] 契約一句寫 GraphQL「不是 REST 的預設升級」。本頁補規範釘與衝突，不把工坊禁令寫成行業否定。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 `SCHEMA.md` 的 Tag Taxonomy
- [x] 已釋出到正式區，並同步 `index.md` 與 `log.md`

## 相關內容

- [[queries/第三批蒸餾目標]]
- [[concepts/後端架構名詞與工坊對照]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/工坊架構該上與不該上]]
- [[concepts/前端架構名詞與取捨]]
- [[concepts/HTTP合同與問題詳情]]
