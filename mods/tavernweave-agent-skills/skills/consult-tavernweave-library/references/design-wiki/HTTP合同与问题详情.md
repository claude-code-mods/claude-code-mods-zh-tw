---
title: HTTP合同與問題詳情
created: 2026-08-14
updated: 2026-08-14
type: concept
status: active
tags:
  - wiki
  - concept
  - tooling
  - research
  - safety
sources:
  - https://www.rfc-editor.org/rfc/rfc9457.html
  - https://json-schema.org/specification
  - https://google.aip.dev/
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
  - concepts/後端架構名詞與工坊對照.md
knowledge_class: factual
---

# HTTP合同與問題詳情

本頁不是已採用規範，也不是工坊必須改錯誤體的工單。檢索時間：2026-08-14。只談公開規範與風格指南，不寫攻擊步驟、繞過或憑證。

## 一句話定義

HTTP 合同是呼叫方能穩定依賴的表面：動詞、路徑、狀態碼、媒體型別、成功體與錯誤體。問題詳情是其中一種**可複用錯誤體**，現行 IETF 文字是 [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html)，媒體型別 `application/problem+json`（另有 XML 等價物）。它廢止了 RFC 7807，但**不強迫**每個 API 都改用它。

## 為什麼重要

狀態碼只能說「大概哪一類失敗」。機器客戶端還要知道失敗型別、這一次發生在哪、人能讀的短說明。沒有合同，客戶端只能猜字串；合同亂了，重試、分頁和版本會靜默裂開。工坊主路徑已經是同步 REST，見 [[concepts/後端架構名詞與工坊對照]]「契約一句」：公共 HTTP 用 OpenAPI 這類跨語言合同，要生成客戶端再補檔案。本頁只補錯誤體、schema 與風格指南，不復制那一頁。

## 權威入口

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html) | 現行問題詳情；廢止 7807 |
| 2 | [RFC 7807 狀態頁](https://www.rfc-editor.org/info/rfc7807) | 被廢止的舊文字，只作歷史 |
| 3 | [Idempotency-Key 草案 -07](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) | 已過期，暫無繼任 RFC |
| 4 | [JSON Schema Specification](https://json-schema.org/specification) | 站點稱 **2020-12** 現行 |
| 5 | [JSON Schema 版本表](https://json-schema.org/specification-links) | 舊 IETF 標識與過期草案對照 |
| 6 | [jsonschema WG 新稿](https://datatracker.ietf.org/doc/draft-ietf-jsonschema-json-schema/) | 新 WG 稿並行，未取代 2020-12 |
| 7 | [RFC 8949 CBOR](https://www.rfc-editor.org/rfc/rfc8949.html) | 廢止 RFC 7049；交換格式相容 |
| 8 | [Google AIP 總站](https://google.aip.dev/) | 公司風格指南樞紐，不是 IETF RFC |
| 9 | [AIP-193 Errors](https://google.aip.dev/193) | `google.rpc.Status` / HTTP `{error:{…}}` |
| 10 | [AIP-158 Pagination](https://google.aip.dev/158) | 集合分頁的**公司**寫法 |
| 11 | [AIP-185 Versioning](https://google.aip.dev/185) | URI 裡放 `v1` 的**公司**寫法 |
| 12 | [Google 舊 API 總則](https://cloud.google.com/apis/design) | 各節只轉 AIP，不再當獨立真源 |
| 13 | [Microsoft 根 Guidelines.md](https://github.com/microsoft/api-guidelines/blob/vNext/Guidelines.md) | 已廢；通知讀者改看專冊 |
| 14 | [Azure REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md) | 現行 Azure 專冊；版本用查詢引數 |
| 15 | [OpenAPI 最新規範](https://spec.openapis.org/oas/latest.html) | HTTP 操作合同，不是 JSON Schema 本身 |
| 16 | [RFC 9110 HTTP 語義](https://www.rfc-editor.org/rfc/rfc9110.html) | 狀態碼與協商；不管 `/v1/` 或分頁 |

上表 **16** 條。B2-API / B3-Schema / B3-APIsty 的採集行不在本頁映象。

## 如何運作

### HTTP 合同三層

1. **傳輸語義**：狀態碼、方法冪等、內容協商，歸 [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)。
2. **操作清單**：路徑、引數、成功/失敗體，行業常用 [OpenAPI](https://spec.openapis.org/oas/latest.html) 寫下來。
3. **文件形狀**：JSON 欄位約束用 JSON Schema；二進位制信封常用 Protobuf，二者不是同一份規範。

「有 OpenAPI 檔案」不等於「錯誤體已經是 9457」。OpenAPI 可以描述任意 JSON 錯誤物件。

### RFC 9457 問題物件

規範物件是一個 JSON 物件，常見成員：

| 成員 | 作用 |
|---|---|
| `type` | 問題型別 URI；預設視為 `about:blank`（只重複狀態碼語義） |
| `title` | 對型別的短摘要，不應隨每次發生而變（本地化除外） |
| `status` | 諮詢性狀態碼；必須與真實 HTTP 狀態碼一致 |
| `detail` | 這一次的人讀說明；客戶端不應靠解析它取欄位 |
| `instance` | 這一次發生的 URI；可解引用或只當不透明標識 |

允許按問題型別加擴充套件成員；不認識的擴充套件必須忽略。多種不同型別同時失敗時，規範建議回**最相關或最緊急**的一條，而不是隨便做一個「批處理錯誤袋」。9457 新增了常見問題型別的 IANA 登記處，並寫明 `type` 可以是不可解引用 URI。附錄 A 給了一份非規範 JSON Schema，標題仍寫 “RFC 7807 problem object”——那是附錄用詞殘留，**不能**據此說 7807 仍現行。

9457 自己說：若響應仍是資源的一種表示，或已有領域錯誤格式，不必改用問題詳情。它要避免的是每家再發明一套 fault 文件，不是替換已有領域體。

規範安全節只給設計約束：問題詳情不是除錯通道；不要經 HTTP 介面給出實現內部資訊。本頁到此為止，不展開利用面。

### JSON Schema 與並行稿

[json-schema.org/specification](https://json-schema.org/specification) 寫明現行版本是 **2020-12**，上一版 2019-09。規範拆成 Core 與 Validation。2020-12 對應的 IETF 文是 `draft-bhutton-json-schema-01` 等，按 Internet-Draft 規則早已過期。與此同時，[jsonschema WG](https://datatracker.ietf.org/doc/draft-ietf-jsonschema-json-schema/) 的新稿在推進；該稿自述尚未準備好讓實現者拿它替換已廣泛實現的版本。兩邊都留：站點現行 ≠ IETF 已成 RFC；新 WG 稿 ≠ 立刻改 `$schema`。

Protobuf 是另一條合同族（IDL + 編解碼）。CBOR 現行是 [RFC 8949](https://www.rfc-editor.org/rfc/rfc8949.html)，**RFC 7049 已被 8949 廢止**；8949 明確不創造新的交換格式版本。

### 風格指南不是 IETF 分頁/版本 RFC

Google 的分頁、版本、錯誤分別在 AIP-158 / AIP-185 / AIP-193。AIP-193 的 HTTP JSON 是 `{ "error": { "code", "message", "status", "details" } }`，與 9457 的扁平 `type`/`title`/`detail` **不是同一信封**。AIP-185 把主版本放在 URI 第一段（`v1`，不暴露 minor/patch）。Azure 專冊要求每個操作帶查詢引數 `api-version`。這是兩家公司書，不是 IETF 對 `/v1/` 或集合分頁的專用 RFC。

**IETF 無集合分頁專用 RFC，無 `/v1/` URL 版本規範。** 需要分頁或版本策略時，引用公司指南或自己寫進 OpenAPI，不要偽稱「有 RFC」。

冪等：使 `POST`/`PATCH` 可安全重試的 `Idempotency-Key` 草案 **-07 已過期**（datatracker 標 Expired & archived，過期日 2026-04-18），**暫無繼任 RFC**。產品可以自定冪等鍵，但不能把它寫成已標準化的 HTTP 欄位。

## 必須保留的衝突

- RFC 7807 已被 **9457** 廢止。
- 冪等鍵草案 -07 已過期，暫無繼任 RFC。
- IETF 無集合分頁專用 RFC，無 `/v1/` URL 版本規範。
- JSON Schema 站點稱 2020-12 現行，IETF 舊草案過期、新 WG 稿並行。
- RFC 7049 已被 8949 廢止（CBOR）。
- Google 舊 API 總則只轉 AIP；Microsoft 根 `Guidelines.md` 已廢，看 azure 專冊。
- 9457 問題詳情 ≠ AIP-193 `error` 信封 ≠ Azure 專冊錯誤章。三套都正當，不要併成一種「標準錯誤 JSON」。
- OpenAPI ≠ JSON Schema；Protobuf ≠ JSON Schema。
- 本頁對映工坊同步 REST 的**錯誤體選擇**；**不是**「工坊必須上 9457」。

## 例子

- 正例：4xx/5xx 固定一種已文件化的錯誤物件；`type` 或機器可讀碼穩定，人讀句子可本地化。
- 正例：集合一開始就帶分頁欄位（AIP-158 的理由：後加分頁會改行為）。這是風格建議，不是 IETF 強制。
- 正例：工坊 `create` / `update` / `withdraw` / `review` 失敗時，狀態碼 + 一種穩定 JSON，欄位寫進以後的 OpenAPI。
- 反例：把 7807 當現行標準，或把過期冪等鍵草案寫成 RFC。
- 反例：把 AIP 的 `/v1/` 或 Azure 的 `api-version` 說成 IETF 規定。
- 反例：用 `detail` 當除錯堆疊；或同一失敗有時 9457、有時 AIP-193、有時裸字串。

## 邊界與易混概念

- 不包括：具體 Gateway schema、OAuth 金鑰、物件儲存憑證、攻擊或繞過步驟。
- 問題詳情 ≠ 授權模型，也 ≠ 重試演算法。
- `status` 成員 ≠ 真實 HTTP 狀態碼的替代品；中介軟體仍看響應行。
- 公司風格指南可對內當「必須」，對外只是一家之書。
- 易混：聽到「標準錯誤格式」就以為全世界只剩 9457。9457 明文允許已有領域格式繼續用。

## 對映到本倉庫

當前工坊：同步 REST（`list` / `detail` / `create` / `update` / `withdraw` / `review`），公共合同以後要生成客戶端再補 OpenAPI，見 [[concepts/後端架構名詞與工坊對照]] 與 [[comparisons/工坊架構該上與不該上]]。本頁只問錯誤體要不要對齊行業信封。

對齊方式是**選一種並寫進合同**：9457、AIP-193 形、或現有領域 JSON 都可以。選定之後客戶端按欄位讀，不要解析散文。這是「同步 REST 錯誤體要穩定」，不是「工坊必須上 9457」，也不是對 GraphQL / tRPC 的行業否定。卡內 fail closed 仍歸 [[concepts/創意工坊與安全契約]]。本 Vault 不收 Gateway 真身欄位。

## 來源與證據

- 問題詳情與廢止關係：RFC 9457 文首與 Appendix D；7807 狀態頁。
- 冪等鍵過期：datatracker 對該 draft 的 Expired & archived。
- JSON Schema 雙軌：官方 specification / specification-links，以及 jsonschema WG 新稿自述。
- CBOR：RFC 8949 文首「Obsoletes: 7049」。
- 風格指南空心化：`cloud.google.com/apis/design` 各節轉 AIP；Microsoft 根 `Guidelines.md` 的 deprecation notice 指向 azure / graph 專冊。
- 查詢賬本：[[queries/第二批蒸餾目標]] B2-API；[[queries/第三批蒸餾目標]] B3-Schema、B3-APIsty。

已知衝突見上節，不靜默覆蓋。IETF 是否會給冪等鍵或分頁另出 RFC：尚無繼任文字，標未知。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞（含 `safety`：只談規範約束）
- [x] 已釋出到正式區，並同步 `index.md` 與 `log.md`

## 相關內容

- [[concepts/後端架構名詞與工坊對照]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
- [[concepts/創意工坊與安全契約]]
- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
- [[concepts/Saga三義與補償]]
- [[concepts/GraphQL與非同步事件合同]]
