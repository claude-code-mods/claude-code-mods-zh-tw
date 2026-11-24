---
title: OpenAPI與Arazzo
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
  - https://www.openapis.org/
  - https://www.openapis.org/what-is-openapi
  - https://spec.openapis.org/
  - https://spec.openapis.org/oas/latest.html
  - https://spec.openapis.org/oas/v3.1.2.html
  - https://spec.openapis.org/arazzo/latest.html
  - https://spec.openapis.org/overlay/latest.html
  - https://learn.openapis.org/
  - https://jsonapi.org/
  - https://jsonapi.org/format/
  - https://datatracker.ietf.org/doc/html/draft-kelly-json-hal-11
  - https://www.iana.org/assignments/media-types/application/vnd.hal+json
  - 10-收件箱/寫回候選/第五批-B5-OpenAPI.md
  - queries/第三批蒸餾目標.md
  - concepts/HTTP合同與問題詳情.md
knowledge_class: factual
---

# OpenAPI與Arazzo

本頁不是已採用合同，也不改工坊或角色卡棧。檢索日 2026-08-14。賬本樞紐是 [[10-收件箱/寫回候選/第五批-B5-OpenAPI]] **B5-OpenAPI**（14 條採集，本頁全收）。公司風格指南迴 [[queries/第三批蒸餾目標]] **B3-APIsty**；問題詳情與 JSON Schema 雙軌回 [[concepts/HTTP合同與問題詳情]]。本頁只收描述語言：OAS 3.1 / 3.2、Arazzo、Overlay、JSON:API、HAL。

## 一句話定義

OpenAPI Specification（OAS）是用 YAML/JSON 寫 HTTP API 結構與句法的**描述語言**，和實現語言脫鉤。Arazzo 描述跨介面的**呼叫序列**；Overlay 用 JSONPath 改已有描述文件。JSON:API 與 HAL 管資源/超媒體**文件形狀**，不是 OAS 的替代品。

## 為什麼重要

跨語言客戶端要靠一份機器可讀操作清單，而不是讀原始碼或抓包。工坊「契約一句」已把公共 HTTP 指向 OpenAPI，見 [[concepts/後端架構名詞與工坊對照]]。但「有 OAS 檔案」不等於錯誤體已是 9457，也不等於 Schema 已等於 json-schema.org 2020-12，更不等於 Arazzo 工作流已是預設生產棧。先分清**描述操作 / 約束欄位 / 約束資源文件 / 公司風格指南**四層。

## 權威入口

檢索 2026-08-14。14 條，不是教程，也不映象全文。B3-APIsty / 9457 / JSON Schema 雙軌未升格進本表。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [OAI 樞紐](https://www.openapis.org/) | 「最廣泛使用的 API **描述**標準」；OAS / Arazzo 走 `latest`，Overlay 按鈕仍釘 v1.0.0.html |
| 2 | [出版物樞紐](https://spec.openapis.org/) | 權威 HTML；Learn / Tooling 是伴讀，不是規範真身 |
| 3 | [OAS 3.2.0](https://spec.openapis.org/oas/latest.html) | `latest` = **3.2.0**（2025-09-19）；Apache-2.0；minor 可做低影響不相容 |
| 4 | [OAS 3.1.2](https://spec.openapis.org/oas/v3.1.2.html) | 同日補丁；3.1.* 工具應相容整條 3.1 線 |
| 5 | [Schema 方言](https://spec.openapis.org/oas/latest.html) | Schema Object 自稱 2020-12 **超集**；預設方言仍是 `oas/3.1/dialect/base` |
| 6 | [Learn](https://learn.openapis.org/) | OAS 伴讀；「最發達工具生態」物件是 **OAS**，不是 Arazzo |
| 7 | [Arazzo 1.1.0](https://spec.openapis.org/arazzo/latest.html) | 現行 **1.1.0**（2026-05-17）；描述呼叫序列 |
| 8 | [Overlay 1.1.0](https://spec.openapis.org/overlay/latest.html) | 現行 **1.1.0**（2026-01-14）；JSONPath 改描述文件 |
| 9 | [What is OAS](https://www.openapis.org/what-is-openapi) | 頁標 2023-12-20；只講 OAS 生命週期，**未寫** Arazzo / Overlay |
| 10 | [JSON:API 樞紐](https://jsonapi.org/) | 媒體型別 `application/vnd.api+json`；1.1 終稿 2022-09-30 |
| 11 | [JSON:API 1.1](https://jsonapi.org/format/) | 現行 1.1；只加不刪；`data` 與 `errors` 不得同文檔共存 |
| 12 | [JSON:API 錯誤](https://jsonapi.org/format/) | 頂層 `errors[]`；`status` 是字串 ≠ 9457 單物件 |
| 13 | [HAL I-D](https://datatracker.ietf.org/doc/html/draft-kelly-json-hal-11) | `-11` 2023-10-19，過期 2024-04-21；草案媒體型別 `application/hal+json`；**不是 RFC** |
| 14 | [HAL IANA](https://www.iana.org/assignments/media-types/application/vnd.hal+json) | 2011-07-14 登記 **`application/vnd.hal+json`** |

刻意未收：9457 / 7807 / 冪等鍵、AIP / Azure 專冊、GraphQL / AsyncAPI 正文、盜版規範 PDF。

## 如何運作

### OAS 3.1 / 3.2 是描述語言

[What is OpenAPI](https://www.openapis.org/what-is-openapi)（頁標 2023-12-20）：OAS 寫 HTTP API 的結構與句法。3.2.0 正文：OpenAPI Document（OAD）給人與機器發現能力。`latest.html` = **3.2.0**（2025-09-19）；3.1 線現行補丁是 [3.1.2](https://spec.openapis.org/oas/v3.1.2.html)，與 3.2.0 **同一天**釋出。釘 3.1 線看 `v3.1.2.html`，不要把 `latest` 當成 3.1。3.0.4（2024-10-24）仍公佈，其 Schema Object **不是** 2020-12。minor 版本**可以**做低影響不相容。OAS 可描述任意 JSON 錯誤體——包括 9457、AIP-193 或 JSON:API `errors[]`。

### Schema Object：超集聲稱 vs 預設方言

3.1 / 3.2 都寫：Schema Object 是 JSON Schema Draft **2020-12 的超集**；未另述則關鍵字語義跟 JSON Schema；允許布林 schema。預設 `$schema` 卻是 OAS 方言 `https://spec.openapis.org/oas/3.1/dialect/base`（**3.2 仍用 3.1 這條 URI**），不是 json-schema.org 通用元 schema。`description` / `format` 被 OAS 加長；另有 `int32` 等格式。OAS 基礎詞表 `$vocabulary` 為 **false**，通用 JSON Schema 實現可以把 `discriminator` / `xml` / `example` 當未知關鍵字。`spec.openapis.org` 上的 JSON Schema **僅供參考**，衝突以 HTML 規範為準。可用 `jsonSchemaDialect` / `$schema` 改預設；工具必須認 OAS 方言，其他草案只是 MAY。不要寫成「3.1 已等於 2020-12」，也不要寫成「3.1 仍是 3.0 那套分叉」。站點 2020-12 vs IETF 新稿仍歸 HTTP 合同頁。

### Arazzo / Overlay：已釋出 ≠ 與 OAS 同成熟度

Arazzo 現行 **1.1.0**（2026-05-17；首發 1.0.0，2024-05-29）：至少一份 `sourceDescriptions` + 至少一個 workflow；可指向 OpenAPI **或** AsyncAPI。Overlay 現行 **1.1.0**（2026-01-14；首發 1.0.0，2024-10-17）：對已有 OAD 做可重複變換，`target` 是 RFC 9535 JSONPath，動作 `update` / `remove` / `copy`。Overlay 1.0.0 自述由**少數早期工具**實現。Learn 的「最發達工具生態」句只覆蓋 OAS。OAI 首頁 Overlay 按鈕仍指向 **v1.0.0.html**；Arazzo / OAS 用 `latest`。What-is 頁停在 2023-12、未提兩份伴生規範。

### JSON:API 與 HAL：文件形狀，不是 OAS

JSON:API 管資源怎麼請求/修改、伺服器怎麼回；主物件是 `data` / `included` / `links`，不是 path+verb 清單。可用 OAS **描述**一個 JSON:API 服務，二者不是替代。1.1 終稿 2022-09-30；只加不刪；`data` 與 `errors` 不得同文檔共存。頂層 `errors[]` 的 `status` 是**字串**，信封和媒體型別都不是 RFC 9457。HAL 只約定 `_links` / `_embedded`。草案自稱 `application/hal+json`；IANA 實際登記的是 **`application/vnd.hal+json`**。過期 I-D ≠ 已廢止實踐，也 ≠ RFC。

## 必須保留的衝突

- **3.1 JSON Schema 對齊程度（兩邊留）。** 規範側：Schema Object = 2020-12 **超集**，關鍵字預設不另加語義。實現側：預設方言是 OAS `3.1/dialect/base`（3.2 仍用此 URI）；基礎詞表可被通用校驗器忽略；參考 JSON Schema 非規範；3.0 線仍不是 2020-12。不要寫成「3.1 已等於 json-schema.org 2020-12」，也不要寫成「3.1 仍是 3.0 那套分叉」。站點 2020-12 vs IETF 新稿仍歸 HTTP 合同頁。
- **Arazzo 成熟度（兩邊留）。** 規範側：OAI 正式規範，已到 1.1.0，首頁與 OAS 並列。生態側：比 OAS 年輕兩年；Learn 工具生態句不覆蓋它；Overlay 正文承認早期工具少；首頁 Overlay 仍鏈 1.0.0。已釋出 ≠ 預設生產棧。
- JSON:API `errors[]` ≠ RFC 9457。HAL 草案 `application/hal+json` ≠ IANA `application/vnd.hal+json`。
- `latest.html` = 3.2.0，不是 3.1。3.2 方言 URI 是否改成 `oas/3.2/dialect/base`：本波未見，標待複核。
- **對映 ≠ 採用。** 工坊「以後補 OAS 檔案」不等於本倉已上 3.2 或 Arazzo。

## 例子

- 正例：工坊以後要生成跨語言客戶端，物件是一份 OAS 檔案（釘 3.1.2 或跟 `latest` 走 3.2.0），錯誤體形狀另寫，不假裝已是 9457。
- 正例：用 OAS 描述一個 JSON:API 服務；文件形狀仍歸 JSON:API，操作清單歸 OAS。
- 正例：多步「先建再查」流程若要機器可讀，另寫 Arazzo，並宣告工具是否認 1.1.0。
- 反例：把 `latest.html` 當成 3.1，或把 3.0.4 Schema Object 當成 2020-12。
- 反例：把通用 JSON Schema 校驗器直接套 OAS 方言，卻期望 `discriminator` / `xml` 生效。
- 反例：因 Arazzo / Overlay 已釋出，就寫成預設生產棧或「本倉已採用」。
- 反例：把 JSON:API `errors[]` 或 HAL `_links` 寫成 OAS 的替代，或把草案 `hal+json` 寫成 IANA 型別。

## 邊界與易混概念

- 不包括：攻擊步驟、掃描清單、繞過、憑證、盜版 PDF、安裝清單、角色卡 / 工坊成品。
- OAS ≠ JSON Schema。Schema Object 自稱 2020-12 超集，預設方言仍是 OAS `3.1/dialect/base`。
- OAS ≠ JSON:API ≠ HAL ≠ AIP。描述操作、約束資源文件、公司風格指南是三層。
- Arazzo ≠ OAS。前者是呼叫序列，後者是 path+verb 清單；Arazzo 可引用 AsyncAPI，不把 GraphQL 升進本頁。
- Overlay ≠ 新 API。它改已有 OAD，不單獨定義資源。
- JSON:API `errors[]` ≠ RFC 9457 `application/problem+json`。欄位名像，信封和媒體型別不是同一份。
- HAL 草案媒體型別 ≠ IANA 登記型別。過期 I-D 不是 RFC。
- `latest.html` = 3.2.0；要 3.1 線請釘 `v3.1.2.html`。
- 分頁 / `/v1/` / 9457 / 冪等鍵過期：回 HTTP 合同頁，本頁不重蒸。

## 對映到本倉庫

對映放最後，不當過濾器。行業句對獨立 HTTP 合同仍成立。

[[concepts/後端架構名詞與工坊對照]]「契約一句」：公共 API 用 OpenAPI 這類跨語言合同，要生成客戶端再補檔案。[[concepts/HTTP合同與問題詳情]] 已寫：有 OAS 檔案 ≠ 錯誤體已是 9457。本頁只補描述語言版本、方言和伴生規範。

因此：

1. **工坊若補跨語言 HTTP 合同，物件是 OAS 檔案**（3.1.2 或 3.2.0），不是 Arazzo 工作流，也不是必須改 JSON:API / HAL 信封。
2. Schema 校驗不要預設當成 json-schema.org 2020-12；先認 OAS 方言，再決定要不要改 `jsonSchemaDialect`。
3. 角色卡 JSON/PNG、世界書、MVU 不是 OAS 文件。不要把本頁寫進 recipe / 髮卡依賴。
4. 非同步事件合同仍歸 [[concepts/GraphQL與非同步事件合同]]。Arazzo 可引用 AsyncAPI，不升 GraphQL 條。
5. 本頁不寫「已採用 OpenAPI 3.2 / Arazzo / Overlay / JSON:API」。

## 來源與證據

- OAS 版本：`spec.openapis.org/oas/latest.html` = 3.2.0（2025-09-19）；`v3.1.2.html` 同日；3.0.4 仍公佈。
- 方言：3.1 / 3.2 HTML 自稱 2020-12 超集；預設 `$schema` 為 `oas/3.1/dialect/base`（3.2 仍用此 URI）；參考 JSON Schema 非規範。
- Arazzo / Overlay：各自 `latest` 為 1.1.0；Learn 工具生態句只覆蓋 OAS；首頁 Overlay 仍鏈 1.0.0。
- JSON:API：jsonapi.org/format 1.1；`data`/`errors` 互斥；`status` 為字串。
- HAL：I-D `-11` 過期；IANA 登記 `vnd.hal+json`。
- 賬本：B5-OpenAPI；重疊 B3-APIsty / HTTP 合同頁 / B3-Schema。

已知衝突見上節，不靜默覆蓋。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區

## 相關內容

- [[concepts/HTTP合同與問題詳情]]
- [[concepts/GraphQL與非同步事件合同]]
- [[concepts/後端架構名詞與工坊對照]]
- [[10-收件箱/寫回候選/第五批-B5-OpenAPI]]
- [[queries/第三批蒸餾目標]]
- [[queries/第二批蒸餾目標]]
