---
title: HTTP3與QUIC
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
  - https://www.rfc-editor.org/rfc/rfc9114.html
  - https://www.rfc-editor.org/rfc/rfc9000.html
  - https://www.rfc-editor.org/rfc/rfc9001.html
  - https://www.rfc-editor.org/rfc/rfc9002.html
  - https://www.rfc-editor.org/rfc/rfc9204.html
  - https://quicwg.org/
  - https://docs.deno.com/examples/quic/
  - https://docs.deno.com/runtime/fundamentals/http_server/
  - queries/第三批蒸餾目標.md
  - concepts/HTTP合同與問題詳情.md
  - concepts/後端架構名詞與工坊對照.md
knowledge_class: factual
---

# HTTP3與QUIC

本頁不是已採用傳輸，也不是工坊必須改 QUIC 的工單。賬本見 [[queries/第三批蒸餾目標]]（B3-H3）。檢索日 2026-08-14。只收 IETF 合同與執行時文件入口，不寫攻擊、繞過、放大或憑證。

## 一句話定義

**QUIC** 是跑在 UDP 上的通用安全傳輸（現行 [RFC 9000](https://www.rfc-editor.org/rfc/rfc9000.html)，2021-05）。**HTTP/3** 是把同一套 HTTP 語義映到 QUIC 上的對映（現行 [RFC 9114](https://www.rfc-editor.org/rfc/rfc9114.html)，2022-06）。HTTP/3 不是新語義，也不是「更快的 HTTP/2 改名」。

## 為什麼重要

HTTP/2 的多路複用對 TCP 不可見：丟一個包，同連線上未受影響的流也會停。QUIC 把流複用、每流可靠與擁塞控制做進傳輸層，HTTP/3 只負責幀與欄位。語義仍歸 [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)，錯誤體與 OpenAPI 仍歸 [[concepts/HTTP合同與問題詳情]]。本倉庫工坊與角色卡棧**不因此改傳輸**；行業正當性仍保留。

## 權威入口

本輪核過樞紐 [RFC 9114](https://www.rfc-editor.org/rfc/rfc9114.html)。下列 **8** 條是 B3-H3 真源，不是映象。

| # | 入口 | 釘什麼 |
|---|---|---|
| 1 | [RFC 9114 HTTP/3](https://www.rfc-editor.org/rfc/rfc9114.html) | 樞紐。HTTP 語義在 QUIC 上的對映；ALPN 預設 `h3`；發現見 §3.1。 |
| 2 | [RFC 9000 QUIC](https://www.rfc-editor.org/rfc/rfc9000.html) | 傳輸本身：流、連線、遷移、幀。應用協議之一才是 HTTP/3。 |
| 3 | [RFC 9001 QUIC-TLS](https://www.rfc-editor.org/rfc/rfc9001.html) | QUIC 用 TLS 1.3（或更新）做握手與金鑰；不是「再套一層 TLS over TCP」。 |
| 4 | [RFC 9002 Recovery](https://www.rfc-editor.org/rfc/rfc9002.html) | 丟包檢測與示例擁塞控制。不是 HTTP 幀規範。 |
| 5 | [RFC 9204 QPACK](https://www.rfc-editor.org/rfc/rfc9204.html) | HTTP/3 欄位壓縮。HPACK 假定全連線有序，QUIC 不給這個保證。 |
| 6 | [quicwg.org](https://quicwg.org/) | QUIC WG 現行樞紐。明文：HTTP/3 與 QPACK **已交回 HTTP WG** 維護。 |
| 7 | [Deno Communicate over QUIC](https://docs.deno.com/examples/quic/) | Deno **有** QUIC 示例與 `Deno.connectQuic` / `QuicEndpoint`。標 unstable。 |
| 8 | [Deno Writing an HTTP Server](https://docs.deno.com/runtime/fundamentals/http_server/) | `Deno.serve` 正文只寫 HTTP/1.1 與 HTTP/2。本輪 **無** HTTP/3 專頁。 |

gRPC / Connect 怎麼掛 HTTP/3 不在本頁，見 [[concepts/gRPC與Connect]]。快取語義回 [[concepts/邊緣快取與SWR]]，不在此重抄。

## 如何運作

### 兩層不要併成一詞

QUIC 是傳輸：一條連線裡多條獨立流，始終加密，包走 UDP。HTTP/3 是應用對映：知道對端有 HTTP/3 之後，開啟 QUIC 連線，用 `h3` 做 ALPN，再在流上走 HEADERS / DATA 等幀。RFC 9114 寫明：部分 HTTP/2 能力已被 QUIC 吞掉，其餘在 QUIC 之上重做。

### 語義不變

方法、狀態碼、欄位名仍是 RFC 9110。換 HTTP/3 不會自動改錯誤 JSON，也不會讓 OpenAPI 變成另一份合同。

### 發現與回退

客戶端可以對 `https` URI 直接試 QUIC；未另選協議時 ALPN 用 `h3`。源站也可用 `Alt-Svc`（或 HTTP/2 的 ALTSVC 幀）宣告等價 HTTP/3 端點，例如 `Alt-Svc: h3=":50781"`。UDP 被攔時，9114 要求客戶端改試基於 TCP 的 HTTP。伺服器可在任意 UDP 埠提供 HTTP/3；替代服務廣告必須帶顯式埠。

### `http` URI 不能直接當 HTTP/3

9114 §3.1.2：`http` 方案把權威綁在「能收 TCP」上。HTTP/3 不用 TCP，因此不能直接訪問 `http` 權威源；除非擴充套件（如 Alt-Svc）另指一個也權威、且能走 HTTP/3 的服務。

### 為什麼不能繼續用 HPACK

HPACK 依賴各流幀全域性有序。QUIC 流互不阻塞，這個保證沒了。QPACK 把表更新放到單獨的單向流，編碼後的欄位段只引用表、不改表，用來換壓縮率與隊頭阻塞。

### 連線怎麼建

HTTP/3 現行綁 QUIC v1；別的 QUIC 版本要另文規定。QUIC v1 握手是 TLS ≥1.3。域名目標必須能在握手裡告訴伺服器（通常 SNI）。QUIC 傳輸引數在加密握手裡設；HTTP/3 自己的 SETTINGS 必須作為各自控制流的首幀發出。

### Deno 合同停在傳輸

第 7 條示例自己寫：QUIC 是 HTTP/3 **底下**的傳輸，示例 ALPN 卻是 `echo`，不是 `h3` 站點。第 8 條與 `fetch` 文件只承認 HTTP/1.1 / HTTP/2 自動協商。有 QUIC API ≠ `fetch` / `Deno.serve` 已是 HTTP/3。WebTransport 示例會用 ALPN `h3`，那是另一套 API，不是本頁的 HTTP/3 文件頁。

## 行業何時該上

| 合同 | 何時該上 | 不該當成 |
|---|---|---|
| RFC 9114 | 要對瀏覽器或 CDN 提供 HTTP/3，或寫 `h3` / Alt-Svc | 「上了 HTTP/3 語義就變了」；QUIC 本身 |
| RFC 9000 族 | 自研非 HTTP 應用協議跑在 QUIC 上 | HTTP/3 幀表；「有 QUIC 就有 HTTP/3」 |
| RFC 9204 | 實現或評 HTTP/3 欄位壓縮 | 可把 HPACK 原樣搬到 HTTP/3 |
| HTTP WG 維護面 | 查 HTTP/3 / QPACK 的後續擴充套件 | 仍把 quicwg.org 當 HTTP/3 現行編輯組 |
| Deno QUIC API | 在 Deno 裡做原始 QUIC 流（unstable） | `Deno.serve` / `fetch` 的 HTTP/3 已交付 |

## 必須保留的衝突

- HTTP/3 已交回 HTTP WG，quicwg.org 仍列出 RFC 9114 / 9204。列出的是起源與指標，不是「QUIC WG 仍維護 HTTP/3」。
- Deno 有 QUIC 文件，無 HTTP/3 文件頁。
- `http` URI 的權威模型與 HTTP/3 的 UDP 傳輸對不上；不能直接當 HTTP/3。
- 「工坊現在不換傳輸」不是「9114 不是正當行業合同」。

## 例子

- 正例：源站繼續用 RFC 9110 語義與既有錯誤體；邊緣開啟 HTTP/3 只換對映與發現。
- 正例：UDP 不通時回落 HTTP/2 或 HTTP/1.1，不當成「HTTP/3 沒標準化」。
- 正例：要在 Deno 裡試傳輸，開啟第 7 條 QUIC 示例，並標 unstable；不要寫成官方 HTTP/3 指南。
- 反例：把 Google 早期 gQUIC 或「HTTP over QUIC」舊名當成現行 RFC 9114。
- 反例：看見 `Deno.connectQuic({ alpnProtocols: ["h3"] })` 就寫「Deno 已文件化 HTTP/3」。
- 反例：把 QPACK 寫成 HPACK 的別名，或把 HTTP/3 寫成 QUIC WG 仍在主筆的規範。

## 邊界與易混概念

- 不包括：攻擊面、0-RTT 利用、放大、中間盒繞過、CVE、工坊換傳輸工單。
- HTTP/3 ≠ QUIC。前者是對映，後者是傳輸。
- HTTP/3 ≠ 新 HTTP 語義。語義在 RFC 9110。
- HPACK ≠ QPACK。有序假設不同。
- QUIC-TLS ≠ TLS-over-TCP。金鑰日程嵌在 QUIC 包裡。
- Alt-Svc 廣告 ≠ 已經連上 HTTP/3。客戶端可以試，也可以不試。
- Deno QUIC ≠ Deno HTTP/3。本輪無後者專頁。
- WebTransport 用 `h3` ALPN ≠ `fetch` 已走 HTTP/3。
- 酒館卡 iframe 與工坊同步 REST 都不因本頁改 UDP。

## 對映到本倉庫

當前工坊公共面是同步 REST，卡 runtime 走宿主與雙 CDN，都不因本頁改 QUIC。這是產品落點，不是對 IETF 的否定。行業對照仍見 [[comparisons/行業架構方案何時用]] 與 [[concepts/後端架構名詞與工坊對照]]。本頁只釘入口與衝突。

## 來源與證據

- 對映與發現：本輪開啟 [RFC 9114](https://www.rfc-editor.org/rfc/rfc9114.html) 文首、§1–§3.2。
- 傳輸與 TLS：RFC 9000 / 9001 文首；恢復演算法在 9002，不在 9114。
- QPACK 替換 HPACK：RFC 9114 §2 與 RFC 9204 文首。
- 交回 HTTP WG：本輪 [quicwg.org](https://quicwg.org/)「Ownership of these drafts has now transferred back to the HTTP WG。」
- Deno 有 QUIC、無 HTTP/3 專頁：第 7 條示例存在；第 8 條只列 HTTP/1.1 與 HTTP/2。

已知衝突見上節，不靜默覆蓋。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 `SCHEMA.md` 的 Tag Taxonomy
- [x] 已釋出到正式區

## 相關內容

- [[queries/第三批蒸餾目標]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/後端架構名詞與工坊對照]]
- [[concepts/邊緣快取與SWR]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/工坊架構該上與不該上]]
- [[concepts/gRPC與Connect]]
