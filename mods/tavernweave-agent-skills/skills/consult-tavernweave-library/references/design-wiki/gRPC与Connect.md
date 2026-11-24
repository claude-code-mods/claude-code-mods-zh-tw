---
title: gRPC與Connect
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
  - https://grpc.io/docs/what-is-grpc/introduction/
  - https://grpc.io/docs/what-is-grpc/core-concepts/
  - https://grpc.io/docs/what-is-grpc/faq/
  - https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
  - https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md
  - https://grpc.io/blog/state-of-grpc-web/
  - https://grpc.io/docs/platforms/web/basics/
  - https://connectrpc.com/docs/introduction
  - https://connectrpc.com/docs/protocol
  - https://connectrpc.com/docs/faq/
  - https://connectrpc.com/docs/web/choosing-a-protocol
  - https://grpc.io/docs/languages/go/quickstart/
  - https://connectrpc.com/docs/go/getting-started
  - https://github.com/grpc/proposal/blob/master/G2-http3-protocol.md
  - 10-收件箱/寫回候選/第五批-B5-gRPC.md
  - queries/第五批蒸餾目標.md
  - queries/第三批蒸餾目標.md
  - concepts/JSON Schema與Protobuf.md
  - concepts/HTTP合同與問題詳情.md
  - concepts/HTTP3與QUIC.md
knowledge_class: factual
---

# gRPC與Connect

本頁不是已採用技術，也不是工坊必須改 RPC 棧的工單。檢索時間：2026-08-14。只談公開傳輸合同，不寫攻擊步驟、繞過或憑證。賬本見 [[queries/第五批蒸餾目標]] B5-gRPC；分路原稿仍在 [[10-收件箱/寫回候選/第五批-B5-gRPC]]。形狀與欄位戰爭見 [[concepts/JSON Schema與Protobuf]]，本頁不重蒸。

## 一句話定義

gRPC 是帶**傳輸合同**的 RPC：預設用 Protocol Buffers 當 IDL 和交換格式，線上按 HTTP/2 對映髮帶長度字首的訊息，狀態多半在 trailers。Connect 是瀏覽器友好、且與 gRPC 相容的 HTTP API 庫族，同一份 `.proto` 服務可走 **gRPC / gRPC-Web / Connect** 三種 HTTP 對映。三者不是三份 schema。

## 為什麼重要

GraphQL 語言規範故意不寫傳輸；gRPC **寫**。瀏覽器沒有 HTTP/2 幀控制面，也不支援 trailers，所以不能把「服務端已經是 gRPC」直接接到網頁 `fetch`。不先分清原生合同、Web 合同、Connect 自有協議，就會把 Envoy 翻譯代理、JSON 除錯面或 HTTP/3 提案寫成「gRPC 已經換代」。

## 權威入口

檢索日 2026-08-14。下列 12 條是本頁真源；G2 與 Connect Go 入門是並行入口，不升格為現行專頁。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [Introduction](https://grpc.io/docs/what-is-grpc/introduction/) | 預設 Protobuf IDL + 交換格式；`protoc` + 外掛出 stub |
| 2 | [Core concepts](https://grpc.io/docs/what-is-grpc/core-concepts/) | 四種 RPC；stub / channel / deadline / metadata |
| 3 | [FAQ](https://grpc.io/docs/what-is-grpc/faq/) | CNCF；現網最新 **v1.82.0**；瀏覽器走 gRPC-Web（GA） |
| 4 | [`PROTOCOL-HTTP2`](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md) | `application/grpc`；狀態在 **trailers**；HTTP 常 200 |
| 5 | [`PROTOCOL-WEB`](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md) | 瀏覽器限制 → 另一套協議；`application/grpc-web` |
| 6 | [State of gRPC-Web](https://grpc.io/blog/state-of-grpc-web/) | 瀏覽器實現不了 HTTP/2 gRPC 規格（2019，仍掛 grpc.io） |
| 7 | [Web Basics](https://grpc.io/docs/platforms/web/basics/) | Envoy `grpc_web` 過濾器做翻譯代理 |
| 8 | [Connect 引言](https://connectrpc.com/docs/introduction) | 三協議；自稱 HTTP/1.1、HTTP/2、**HTTP/3** |
| 9 | [Connect 協議](https://connectrpc.com/docs/protocol) | 不綁某一 HTTP 版本；**不用 trailers**；雙向流要 HTTP/2 |
| 10 | [Connect FAQ](https://connectrpc.com/docs/faq/) | 瀏覽器無 trailers → 不能說 gRPC；HTTP/3 實現未齊 |
| 11 | [選協議](https://connectrpc.com/docs/web/choosing-a-protocol) | 瀏覽器預設 Connect+JSON；gRPC-Web 預設二進位制 |
| 12 | [Go Quick start](https://grpc.io/docs/languages/go/quickstart/) | `protoc-gen-go` ≠ `protoc-gen-go-grpc` ≠ `protoc-gen-connect-go` |

並行：[Connect Go 入門](https://connectrpc.com/docs/go/getting-started)、[G2 HTTP/3](https://github.com/grpc/proposal/blob/master/G2-http3-protocol.md)。G2 不是 grpc.io 文件樹裡的現行專頁。

## 如何運作

### 原生 gRPC

客戶端像調本地物件一樣調另一臺機器上的方法。四種方法：一元、服務端流、客戶端流、雙向流。生命週期含 deadline（超時變 `DEADLINE_EXCEEDED`）、取消（已做修改不回滾）、metadata（鍵不得以 `grpc-` 開頭）、channel。成功判定兩邊獨立。

[`PROTOCOL-HTTP2`](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md)：`:method POST`、`:path /Service/Method`、`content-type` 以 `application/grpc` 開頭、`te: trailers`。響應 HTTP 狀態多為 **200**；`grpc-status` / `grpc-message` 在 Trailers（或 Trailers-Only）。訊息是 1 位元組壓縮旗 + 4 位元組大端長度 + 載荷。Protobuf 時 Content-Type 為 `application/grpc+proto`。路徑靜態，不按 REST 從 path / query 拆引數。

### 程式碼生成分家

`protoc` 加外掛同時出訊息程式碼和 RPC stub。Go：`protoc-gen-go` 出 `*.pb.go`；`protoc-gen-go-grpc` 出 `*_grpc.pb.go`。Connect 另裝 `protoc-gen-connect-go`，生成單獨包（handler + client），再 import 訊息包，避免把 RPC 框架拖進每個訊息包。形狀編譯器仍是 `protoc` / Buf，欄位戰爭不在本頁。

### 瀏覽器牆

2019 博文仍掛 grpc.io：**當前不可能在瀏覽器裡實現 HTTP/2 gRPC 規格**——沒有足夠細的請求控制；無法強制 HTTP/2；即使能，也拿不到原始 HTTP/2 幀。Connect FAQ（檢索日仍有效）：HTTP 規格里有 trailers 幾十年，**瀏覽器仍不支援**；gRPC 大量用 trailers，故瀏覽器裡的程式碼不能說 gRPC 協議。grpc.io FAQ 對「能在瀏覽器用嗎」的答案是 **gRPC-Web 已 GA**，不是「瀏覽器直接說 HTTP/2 gRPC」。

### gRPC-Web

[`PROTOCOL-WEB`](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md) 因為瀏覽器限制，實現的是與原生不同的協議，方便代理翻譯。Content-Type：`application/grpc-web` / `application/grpc-web-text`。支援任意 HTTP/*，不依賴 HTTP/2 幀。Trailers 打進響應體最後一條 length-prefixed 訊息（首位元組 MSB=1）。官方教程用 Envoy `envoy.grpc_web` 把瀏覽器請求轉到後端 gRPC。這是教程部署，不是「所有實現都必須 Envoy」——Connect 伺服器可本地說 gRPC-Web。`PROTOCOL-WEB` 曾期望 WHATWG Streams 讓原生協議變成可選；2026-08-14 現網 FAQ 仍寫瀏覽器不支援 trailers。兩邊留。

### Connect

服務端預設三種入口都收；客戶端預設 Connect，可開關切 gRPC / gRPC-Web。協議不依賴某一 HTTP 版本的成幀細節，**完全不用 HTTP trailers**。一元：`application/proto` / `application/json`，像精簡 REST；無副作用且標了 `idempotency_level = NO_SIDE_EFFECTS` 可用 GET。流：`application/connect+proto` / `+json`；雙向流**要求 HTTP/2**，其餘也可 HTTP/1.1。路徑仍是 `/Package.Service/Method`。瀏覽器預設 Connect+JSON（可用 GET）；gRPC-Web 預設二進位制，因並非所有 gRPC-Web 實現都收 JSON。OpenAPI 面向 REST/HTTP，Connect FAQ 寫明**不適用於**這類 RPC；描述語言見 [[concepts/OpenAPI與Arazzo]]，錯誤體與 HTTP 語義見 [[concepts/HTTP合同與問題詳情]]。

### HTTP/2 與 HTTP/3

原生 gRPC 現行合同是 `PROTOCOL-HTTP2`。G2 提案標 Status **Implemented**、實現欄只寫 **grpc-dotnet**、更新日期 2021-08-25；請求 / 響應形狀不變，Content-Type 仍是 `application/grpc`。Connect 協議自稱跨 HTTP/1.1/2/3，但 FAQ 寫「不是所有實現都有 HTTP/3」。不要寫成「gRPC 已改 HTTP/3」，也不要寫成「gRPC 永遠不能 HTTP/3」。HTTP/3 本身見 [[concepts/HTTP3與QUIC]]（賬本 B3-H3）。

## 必須保留的衝突

- **瀏覽器必須走 gRPC-Web 或 Connect，不能說原生 gRPC。** `PROTOCOL-HTTP2` 要 HTTP/2 幀與 trailers。`PROTOCOL-WEB`、2019 博文、Connect FAQ 一致：瀏覽器沒有這套控制面。`PROTOCOL-WEB` 曾期望 WHATWG Streams 讓原生協議變成可選；2026-08-14 現網 FAQ 仍寫瀏覽器不支援 trailers。代理模型兩邊留：官方 Web 教程用 Envoy；Connect 服務端可本地收 gRPC-Web。不裁定「必須 / 不必 Envoy」。
- HTTP/2 vs HTTP/3：現行原生合同仍是 `PROTOCOL-HTTP2`；G2 不是文件樹專頁；Connect HTTP/3 實現未齊。
- 三協議不是三個 schema。
- 版本釘：FAQ v1.82.0 vs 例子 v1.81.1。
- HTTP 200 ≠ RPC 成功。原生 gRPC 常 200，看 trailers 裡的 `grpc-status`。
- OpenAPI ≠ Connect / gRPC 合同。
- **對映 ≠ 採用。**

## 例子

- 正例：服務與服務之間用原生 gRPC（HTTP/2 + trailers）；網頁客戶端走 Connect 或 gRPC-Web，不要對 `fetch` 假裝能發 `application/grpc`。
- 正例：同一份 `.proto` 服務，後端 Connect 同時收三協議；瀏覽器 `createConnectTransport()` 預設 JSON，對接只會 gRPC-Web 的後端再切 `createGrpcWebTransport()`。
- 正例：Go 訊息外掛和 RPC 外掛分開裝，Connect handler 單獨成包。
- 反例：把「gRPC-Web 已 GA」寫成瀏覽器已經能說原生 gRPC。
- 反例：把 Envoy 寫成唯一合法部署，或把 Connect 本地收 gRPC-Web 寫成官方 Web 教程已經改口。
- 反例：把 G2 或 Connect 自稱 HTTP/3 寫成「gRPC 現行合同已是 HTTP/3」。
- 反例：因本頁出現 gRPC 就寫進工坊主路徑或髮卡 recipe。

## 邊界與易混概念

- 不包括：攻擊面、憑證、鑑權攔截器、TLS 套件、CORS 利用、OpenAPI 路徑戰爭、JSON Schema / proto edition 欄位戰爭、工坊 Gateway 真身、成品。
- 原生 gRPC ≠ gRPC-Web ≠ Connect 協議。同一份服務，三種 HTTP 對映。
- gRPC 寫傳輸；GraphQL 語言規範不寫。見 [[concepts/GraphQL與非同步事件合同]]。
- Protobuf 形狀 ≠ RPC 傳輸。欄位怎麼寫見 [[concepts/JSON Schema與Protobuf]]。
- HTTP 200 ≠ RPC 成功。原生 gRPC 常 200，看 trailers 裡的 `grpc-status`。
- Connect 預設 JSON ≠ 換了一份 schema。
- OpenAPI ≠ Connect / gRPC 合同。
- FAQ v1.82.0 ≠ Go Quick start 例子 v1.81.1。兩邊留。

## 對映到本倉庫

當前工坊：模組化單體 + 同步 REST（`list` / `detail` / `create` / `update` / `withdraw` / `review`），公共合同以後要生成客戶端再補 OpenAPI，見 [[concepts/後端架構名詞與工坊對照]]「契約一句」與 [[comparisons/工坊架構該上與不該上]]。

因此：

1. **本倉未採用** gRPC / gRPC-Web / Connect 當主路徑。
2. 若以後要對內 RPC，先分清瀏覽器不能說原生 gRPC，再選 gRPC-Web 或 Connect。
3. 形狀入口仍是 `protobuf.dev`；傳輸合同以本頁四條骨架為準。
4. 本 Vault 不收 Gateway 真身欄位或憑證。
5. **對映 ≠ 採用。**

## 來源與證據

- 原生對映與 trailers：[`PROTOCOL-HTTP2`](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md)。
- 瀏覽器牆：[`PROTOCOL-WEB`](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md)、[2019 博文](https://grpc.io/blog/state-of-grpc-web/)、[Connect FAQ](https://connectrpc.com/docs/faq/)、[grpc.io FAQ](https://grpc.io/docs/what-is-grpc/faq/)。
- Envoy 教程 vs Connect 本地收：[Web Basics](https://grpc.io/docs/platforms/web/basics/) 與 [Connect 引言](https://connectrpc.com/docs/introduction)。
- Connect 不用 trailers、雙向流要 HTTP/2：[協議](https://connectrpc.com/docs/protocol)。
- 瀏覽器選協議：[choosing-a-protocol](https://connectrpc.com/docs/web/choosing-a-protocol)。
- 外掛分家：[Go Quick start](https://grpc.io/docs/languages/go/quickstart/)、[Connect Go](https://connectrpc.com/docs/go/getting-started)。
- HTTP/3：G2 提案（Implemented / 僅 grpc-dotnet / 2021-08-25）；Connect FAQ「不是所有實現都有」。傳輸語義見 [[concepts/HTTP3與QUIC]]。
- 賬本：[[queries/第五批蒸餾目標]] B5-gRPC；分路原稿 [[10-收件箱/寫回候選/第五批-B5-gRPC]]。形狀對照 [[queries/第三批蒸餾目標]] B3-Schema 與 [[concepts/JSON Schema與Protobuf]]。

已知衝突見上節，不靜默覆蓋。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[queries/第五批蒸餾目標]]
- [[10-收件箱/寫回候選/第五批-B5-gRPC]]
- [[concepts/JSON Schema與Protobuf]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/HTTP3與QUIC]]
- [[concepts/OpenAPI與Arazzo]]
- [[concepts/GraphQL與非同步事件合同]]
- [[concepts/後端架構名詞與工坊對照]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/工坊架構該上與不該上]]
- [[queries/第三批蒸餾目標]]
