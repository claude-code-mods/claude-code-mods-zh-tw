---
title: JSON Schema與Protobuf
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
  - https://json-schema.org/specification
  - https://json-schema.org/specification-links
  - https://json-schema.org/draft/2020-12/json-schema-core.html
  - https://json-schema.org/draft/2020-12/json-schema-validation.html
  - https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-01
  - https://datatracker.ietf.org/doc/draft-ietf-jsonschema-json-schema/
  - https://protobuf.dev/overview/
  - https://protobuf.dev/programming-guides/proto3/
  - https://protobuf.dev/programming-guides/proto2/
  - https://protobuf.dev/editions/overview/
  - https://protobuf.dev/programming-guides/encoding/
  - https://protobuf.dev/programming-guides/json/
  - https://protobuf.dev/programming-guides/field_presence/
  - https://protobuf.dev/reference/protobuf/proto3-spec/
  - https://www.rfc-editor.org/rfc/rfc8949.html
  - https://www.rfc-editor.org/info/rfc7049
  - queries/第三批蒸餾目標.md
  - concepts/HTTP合同與問題詳情.md
knowledge_class: factual
---

# JSON Schema與Protobuf

本頁不是已採用技術，也不改工坊或角色卡棧。檢索日 2026-08-14。賬本樞紐是 [[queries/第三批蒸餾目標]] **B3-Schema**。HTTP 錯誤體 / OpenAPI / 公司風格指南見 [[concepts/HTTP合同與問題詳情]]，本頁不重蒸。

## 一句話定義

JSON Schema 是用 JSON 描述 JSON 形狀的方言（現行站點釘 **2020-12**）。Protobuf 是 IDL + 編譯器 + 執行時 + 線格式的另一條合同族。CBOR 是自描述二進位制交換格式，現行文字是 [RFC 8949](https://www.rfc-editor.org/rfc/rfc8949.html)（STD 94）。三者都不是「一種標準 JSON」。

## 為什麼重要

同步 HTTP 要穩定欄位，行業會先寫形狀，再選信封。JSON Schema 管「這份 JSON 長什麼樣」；Protobuf 管「跨語言訊息怎麼編號、怎麼編解碼」；CBOR 管「不要 schema 也能拆開的緊湊二進位制」。版本釘錯會靜默裂開：實現仍跑 2020-12，有人卻把過期 IETF 稿或新 WG 稿寫成已成 RFC；或把 7049 當現行 CBOR。

## 權威入口

檢索 2026-08-14。16 條，不映象全文。B3 採集行不在本頁逐條複製。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [JSON Schema Specification](https://json-schema.org/specification) | B3-Schema 樞紐；站點稱 **2020-12** 現行 |
| 2 | [版本表](https://json-schema.org/specification-links) | 年月元模式、bhutton IETF 標識、未釋出 snapshot |
| 3 | [2020-12 Core](https://json-schema.org/draft/2020-12/json-schema-core.html) | `$schema` / `$id` / `$ref` / 詞彙表；仍標 I-D |
| 4 | [2020-12 Validation](https://json-schema.org/draft/2020-12/json-schema-validation.html) | `type` / `required` / `properties` 等斷言詞 |
| 5 | [draft-bhutton-json-schema-01](https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-01) | 2020-12 對應 IETF 文；2022-12 已過期 |
| 6 | [jsonschema WG 新稿](https://datatracker.ietf.org/doc/draft-ietf-jsonschema-json-schema/) | `-02`，2026-07-01；自述勿替換已實現版本 |
| 7 | [Protobuf Overview](https://protobuf.dev/overview/) | IDL + 生成程式碼 + 線格式；非正式標準組織規範 |
| 8 | [proto3 語言指南](https://protobuf.dev/programming-guides/proto3/) | 現行常用語法；推薦標量 `optional` |
| 9 | [proto2 語言指南](https://protobuf.dev/programming-guides/proto2/) | `required` 禁用於新欄位；packed 要顯式開 |
| 10 | [Editions 總覽](https://protobuf.dev/editions/overview/) | 取代 proto2/proto3 標籤；已釋出最新 **2024** |
| 11 | [Encoding](https://protobuf.dev/programming-guides/encoding/) | 欄位號 + wire type；例子按 2023+ |
| 12 | [ProtoJSON](https://protobuf.dev/programming-guides/json/) | Protobuf→JSON 對映，不是 JSON Schema |
| 13 | [Field Presence](https://protobuf.dev/programming-guides/field_presence/) | 隱式 / 顯式 / editions 預設 |
| 14 | [proto3 語言規格](https://protobuf.dev/reference/protobuf/proto3-spec/) | 自承不完整；`protoc` 為真源 |
| 15 | [RFC 8949 CBOR](https://www.rfc-editor.org/rfc/rfc8949.html) | STD 94；廢止 7049；格式未換代 |
| 16 | [RFC 7049 狀態頁](https://www.rfc-editor.org/info/rfc7049) | 已 obsolete，只作歷史 |

刻意未收：gRPC / Connect 傳輸、AIP 錯誤信封、攻擊面、憑證、工坊 Gateway 真身欄位。

## 如何運作

### JSON Schema：站點現行 ≠ IETF RFC

[json-schema.org/specification](https://json-schema.org/specification) 寫明現行版本是 **2020-12**，上一版 2019-09。規範拆成 Core 與 Validation；Relative JSON Pointer 另冊，Core/Validation 幾乎不用它。元模式從原「Draft 8」起改用年月標識，通用方言元模式是 `https://json-schema.org/draft/2020-12/schema`。

[版本表](https://json-schema.org/specification-links) 把 2020-12 的 IETF 標識寫成 `draft-bhutton-json-schema-00/01` 與對應 Validation 稿，釋出日 2022-06-16。渲染 Core 頁標題仍是 Internet-Draft，過期日 2022-12。按 I-D 六個月規則，**這些 bhutton 稿早已過期**，從未升 RFC。

與此同時，[jsonschema WG](https://datatracker.ietf.org/doc/draft-ietf-jsonschema-json-schema/) 的 `draft-ietf-jsonschema-json-schema-02`（2026-07-01，過期 2027-01-02）在推進，意向 Proposed Standard，狀態仍是 WG Document。該稿自述：「literally a draft」，**尚未準備好讓實現者拿它替換已廣泛實現的版本**。站點「Latest Snapshot」是另一份未釋出草稿。兩邊都留：站點現行 ≠ IETF 已成 RFC；新 WG 稿 ≠ 立刻改 `$schema`。

OpenAPI 可以引用 JSON Schema，但 OpenAPI 不是 JSON Schema 本身，見 HTTP 合同頁與 [[concepts/OpenAPI與Arazzo]]。

### Protobuf：proto2 / proto3 / editions 並行

[Overview](https://protobuf.dev/overview/)：`.proto` 定義 + `protoc` 生成程式碼 + 語言執行時 + 線格式。適合幾兆以內的結構化記錄；整訊息假定能進記憶體。官方寫明：**不是任何組織的正式標準**。線格式不是規範編碼：同一邏輯訊息可以有多種合法位元組，不能未解析就比相等。

[proto3](https://protobuf.dev/programming-guides/proto3/) 用 `syntax = "proto3"`；不寫 `syntax`/`edition` 時編譯器按 **proto2**。標量預設可選；推薦給標量加 `optional`（顯式存在），以便遷 editions。不加則走隱式存在：預設值（0 / 空串 / false / 列舉 0）不落線，讀端分不清「沒寫」和「寫成預設」。列舉第一個值必須是 0。proto3 重複數值欄位預設 packed。

[proto2](https://protobuf.dev/programming-guides/proto2/) 仍有 `required`。官方寫 **Do not use**：proto3 與 editions 已去掉該標籤；語義應放應用層。`required` 幾乎改不掉；未識別列舉會被當成缺欄位，連帶讓 required 檢查失敗。proto2 重複數值預設不 packed，新程式碼應顯式 `[packed = true]`。

[Editions](https://protobuf.dev/editions/overview/) 用 `edition = "2023"` / `"2024"` 取代 `syntax`。現行已釋出 edition 是 **2024**。它是一組帶預設值的 feature，可在檔案 / 訊息 / 欄位上覆蓋。官方寫：不改二進位制、文字、JSON 序列化；可與 proto2/proto3 互 import。`required` 標籤不可用，舊語義用 `features.field_presence = LEGACY_REQUIRED`。Editions 預設顯式存在，可用 `IMPLICIT` 對齊 proto3 隱式標量。

[線格式](https://protobuf.dev/programming-guides/encoding/) 是帶編號的 TLV：欄位號 + wire type + 載荷。舊解析器靠型別跳過未知欄位。欄位號 1–15 佔一位元組；**永不復用**已用或已 reserve 的號。編碼頁例子按 Edition 2023+。

[ProtoJSON](https://protobuf.dev/programming-guides/json/) 是 Protobuf 訊息的規範 JSON 對映，**不是**給任意 JSON Schema 用的。它寫不出 `number[][]` 或 `number|string` 這類常見 JSON Schema 形。欄位名進載荷（預設 lowerCamelCase）；一般不傳播未知欄位；刪欄位會讓舊 JSON 解析失敗。int64 預設輸出字串，避免超過 2^53 丟精度。

[proto3 語言規格](https://protobuf.dev/reference/protobuf/proto3-spec/) 自承不完整，真源是 C++ `protoc`。

RPC 怎麼走 HTTP/2 或瀏覽器，不在本頁。

### CBOR：8949 廢止 7049，格式未換代

[RFC 8949](https://www.rfc-editor.org/rfc/rfc8949.html) 廢止 [RFC 7049](https://www.rfc-editor.org/info/rfc7049)。文首寫：編輯改進、細節與勘誤，**與 7049 交換格式完全相容，不創造新的格式版本**。目標含小程式碼體積、無需 schema 即可解碼、覆蓋 JSON 型別並加位元組串。它不是 Protobuf 的 IETF 替代品，也不是 JSON Schema 的二進位制版。

## 必須保留的衝突

- 站點稱 2020-12 現行，IETF 舊草案已過期、新 WG 稿並行。實現基線仍是 2020-12；WG `-02` 自述不是替換件。
- RFC 7049 已被 8949 廢止；8949 不換代交換格式。
- Protobuf 官方自稱非正式標準；CBOR 是 IETF STD 94。不要併成「都是 RFC」。
- proto2 / proto3 / edition 2023 / 2024 語法並行；預設存在性不同。
- ProtoJSON ≠ JSON Schema；OpenAPI ≠ JSON Schema。
- proto3 語言規格頁 ≠ `protoc` 行為。
- HTTP 合同頁已書籤雙軌與 CBOR 廢止句；本頁是形狀/編碼專頁，不覆蓋那一頁的錯誤體結論。
- **對映 ≠ 採用。**

## 例子

- 正例：公共 HTTP JSON 用 2020-12 寫欄位約束，`$schema` 釘 `draft/2020-12`；錯誤體另選 9457 或領域物件，見 HTTP 合同頁。
- 正例：跨語言、要按欄位號演進的內部訊息用 proto3（標量加 `optional`）或 edition 2024；刪欄位先 `reserved` 號。
- 正例：受限節點要自描述二進位制、且已有 JSON 資料模型，用 CBOR 8949，不要引 7049。
- 反例：把過期 `draft-bhutton-*` 或 WG `-02` 寫成「JSON Schema 已是 RFC」，或立刻改生產 `$schema`。
- 反例：把 ProtoJSON 當成 JSON Schema 方言，或把 JSON Schema 檔案餵給 `protoc`。
- 反例：新欄位標 proto2 `required`，或複用欄位號。
- 反例：因本頁出現 Protobuf / CBOR 就寫進工坊主路徑或髮卡 recipe。

## 邊界與易混概念

- 不包括：攻擊、繞過、憑證、OAuth 金鑰、Gateway 真身 schema、gRPC 傳輸步驟。
- JSON Schema ≠ OpenAPI ≠ Schema.org ≠ ProtoJSON。
- 站點 2020-12 ≠ 已成 RFC；WG 新稿 ≠ 現行實現基線。
- Protobuf ≠ JSON Schema：前者要 `.proto` 才能完整解釋位元組；後者描述的是 JSON 例項。
- proto3 ≠ editions。edition 2024 已釋出，不等於全行業已棄 proto3。
- ProtoJSON 演進規則 ≠ 二進位制線格式演進規則。
- CBOR 8949 ≠ 「CBOR 2.0」。相容 7049 交換格式。
- CBOR 可無 schema 解碼；Protobuf 線格式不能。
- 酒館角色卡 JSON / PNG 載荷 ≠ JSON Schema 2020-12 方言。

## 對映到本倉庫

對映放最後，不當過濾器。行業句對獨立服務仍成立。

當前工坊：同步 REST；公共合同以後要生成客戶端再補 OpenAPI，見 [[concepts/後端架構名詞與工坊對照]]「契約一句」與 [[comparisons/工坊架構該上與不該上]]。HTTP 錯誤體怎麼選，見 [[concepts/HTTP合同與問題詳情]]。

因此：

1. **本倉未採用** 2020-12、IETF 新稿、proto3 / editions 或 CBOR 當主交換格式。
2. 若以後補 OpenAPI，欄位形狀用 JSON Schema 時釘 **2020-12**，不要抄 WG `-02`。
3. Protobuf / gRPC 不是工坊主路徑；形狀若要對照，入口仍是 `protobuf.dev`，傳輸另頁。
4. 卡 JSON 是角色卡格式，不是本頁的 schema 方言。
5. 本 Vault 不收 Gateway 真身欄位或憑證。

## 來源與證據

- 2020-12 現行：specification 文首；版本表 2022-06-16 與 bhutton 標識。
- bhutton 過期：datatracker / 渲染 Core 的 Expires 2022-12。
- WG 並行且勿替換：`draft-ietf-jsonschema-json-schema-02` Introduction。
- Protobuf 非標準組織規範、線格式非規範：overview。
- proto2 `required` 停用、editions 最新 2024、存在性預設：proto2 / editions / field_presence。
- ProtoJSON 不能表達任意 JSON Schema：json 頁 Non-goals。
- proto3 規格不完整：proto3-spec 頁首。
- CBOR：8949 文首 Obsoletes 7049；7049 狀態頁 obsolete。
- 賬本：[[queries/第三批蒸餾目標]] B3-Schema。

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
- [[concepts/OpenAPI與Arazzo]]
- [[concepts/GraphQL與非同步事件合同]]
- [[concepts/後端架構名詞與工坊對照]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/工坊架構該上與不該上]]
- [[queries/第三批蒸餾目標]]
