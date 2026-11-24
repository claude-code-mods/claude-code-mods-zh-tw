---
title: WebRTC信令邊界
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
  - https://www.w3.org/TR/webrtc/
  - https://www.w3.org/TR/2025/REC-webrtc-20250313/
  - https://www.rfc-editor.org/rfc/rfc8825.html
  - https://www.rfc-editor.org/rfc/rfc9429.html
  - https://www.w3.org/TR/mediacapture-streams/
  - https://www.w3.org/TR/webrtc-stats/
  - https://www.rfc-editor.org/rfc/rfc8831.html
  - https://www.rfc-editor.org/rfc/rfc8445.html
  - queries/第三批蒸餾目標.md
  - concepts/CRDT與local-first.md
  - concepts/前端架構名詞與取捨.md
knowledge_class: factual
---

# WebRTC信令邊界

本頁不是已採用技術，也不是工坊或角色卡必須改上對等通話的工單。檢索時間：2026-08-14。賬本見 [[queries/第三批蒸餾目標]]（B3-RTC）。只收 API / 協議入口與範圍邊界，不寫攻擊步驟、CVE 或利用。

## 一句話定義

W3C WebRTC Rec 是瀏覽器裡的 **`RTCPeerConnection` API 合同**：把本地軌和任意資料送到實現對等協議的另一端。**信令協議與信令通道不在本 Rec。** IETF 總覽同樣把客戶端—伺服器、伺服器—伺服器的信令選擇標為套件範圍外。JSEP 只讓指令碼控制本端 offer/answer 與 ICE，不規定訊息怎麼送到對端。

## 為什麼重要

「上 WebRTC」常被寫成一條棧。實際至少四層：採集（getUserMedia）、對等 API（本 Rec）、媒體/資料平面（IETF 套件）、應用自選的信令。混成一詞，就會把 WebSocket 信令房、TURN 中繼、或 DataChannel 當成 Rec 裡的同一份規範。本倉庫卡 iframe 與工坊都不因此改成對等通話棧；行業正當性仍保留。

## 權威入口

本輪開啟過 [TR/webrtc](https://www.w3.org/TR/webrtc/)：頁首 **W3C Recommendation 13 March 2025**，短鏈指向 `REC-webrtc-20250313`。下列 **8** 條是本頁真源，對齊賬本「約條 8」。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [WebRTC Rec](https://www.w3.org/TR/webrtc/) | 現行樞紐。WebIDL API。含 Candidate Amendments。信令通道寫 **unspecified means**。 |
| 2 | [REC-webrtc-20250313](https://www.w3.org/TR/2025/REC-webrtc-20250313/) | 同文帶日期快照。Latest ED 在 `w3c.github.io/webrtc-pc/`，不要把 ED 當 Rec。 |
| 3 | [RFC 8825](https://www.rfc-editor.org/rfc/rfc8825.html) | 2021-01 總覽 / 適用性宣告。本身不定協議。信令路徑選擇 **outside the scope**。 |
| 4 | [RFC 9429 JSEP](https://www.rfc-editor.org/rfc/rfc9429.html) | 2024-04 Standards Track。**廢止 RFC 8829**。不規定信令模型；與投遞機制完全解耦。 |
| 5 | [Media Capture](https://www.w3.org/TR/mediacapture-streams/) | getUserMedia 真源。本輪 **CRD 2025-10-09**，不是 Rec。Rec 只擴充套件 `MediaStream` / `MediaStreamTrack`。 |
| 6 | [WebRTC Stats](https://www.w3.org/TR/webrtc-stats/) | `getStats` 識別符號。本輪 **CRD 2025-09-25**，不是 Rec。 |
| 7 | [RFC 8831](https://www.rfc-editor.org/rfc/rfc8831.html) | 2021-01 資料通道：非媒體走 SCTP-over-DTLS。不是信令規範。 |
| 8 | [RFC 8445](https://www.rfc-editor.org/rfc/rfc8445.html) | ICE。JSEP / Rec 的連通性檢查真源。8825 寫明多數實現當時仍近 RFC 5245。 |

RFC 8826 / 8827 是安全架構與安全功能指標。本頁**不蒸**其內容。

## 如何運作

### Rec 管本端物件

`RTCPeerConnection` 讓一頁與另一瀏覽器或實現對等協議的端點通訊。引言三面：ICE / STUN / TURN 穿越；收發本地軌；直接送任意資料。總覽在 RFC 8825 與 RFC 8826；採集在 GETUSERMEDIA。規範產品是實現這些介面的 user agent。

### 信令通道不在 Rec

§4.1：通訊靠交換控制訊息（a signaling protocol），通道由**未規定的手段**提供，一般是頁內指令碼經伺服器，例如 `WebSocket` 或 `XMLHttpRequest`。Rec 定義 `createOffer` / `createAnswer` / `setLocalDescription` / `setRemoteDescription` / `addIceCandidate`，以及只讀 `signalingState`。這些是本端狀態，不是 SIP、也不是某家房間協議。

### JSEP 解耦投遞

RFC 9429：媒體平面可控，信令平面儘量留給應用。實現幾乎完全脫離核心信令流；指令碼負責（1）傳入本地/遠端 session description，（2）與 ICE 狀態機互動。offer/answer 仍按 RFC 3264 交換，但定址、重傳、fork、glare 全交給應用。圖示是 Web App 之間走 App-Specific Signaling，JSEP 實現之間走 Media。

### IETF 總覽同口徑

RFC 8825：媒體路徑儘量直連，必須符合套件；信令路徑（high path）可經能改寫訊號的伺服器。客戶端—伺服器與伺服器—伺服器選哪種協議、二者如何翻譯，**在本文所述 WebRTC 協議套件範圍外**。典型是 TLS 上的應用自有協議，不是網元透明插 SIP ALG。

### 採集與統計是鄰接合同

麥克風/攝像頭許可權與約束在 Media Capture（仍 CRD）。`getStats` 的物件標識在 webrtc-stats（仍 CRD）。DataChannel 的非媒體傳輸在 RFC 8831，建立之後才有；它不能替代信令通道去完成首次 offer/answer。

### ICE 與 trickle

候選收集與連通性檢查在實現內，因為只有實現知道候選。Trickle ICE（RFC 8838）允許描述先走、候選後到。`onicecandidate` 把候選交給應用，再由應用自己的信令送出。`canTrickleIceCandidates` 看遠端描述是否宣告支援。

## 行業何時該上

對照 [[concepts/前端架構名詞與取捨]] 的即時表：那裡列了輪詢 / SSE / WebSocket，沒有把 WebRTC 寫成預設雙向通道。

| 合同 | 何時該上 | 不該當成 |
|---|---|---|
| WebRTC Rec API | 瀏覽器要對等送軌或 DataChannel | 信令協議；房間服務；「Rec 已規定 WebSocket」 |
| 應用信令（常 WS / HTTP） | 交換 SDP 與 ICE 候選 | Rec 的一部分；媒體平面 |
| JSEP / RFC 9429 | 要對齊 offer/answer 與 ICE 時序 | 可替換 Rec 的第二套 API |
| getUserMedia | 要本機麥/攝/屏 | 已是 Rec；對等傳輸本身 |
| RFC 8831 DataChannel | 對等連上之後送非媒體訊息 | 首次協商用的信令匯流排 |
| TURN / `iceServers` | 直連失敗時的中繼配置 | 信令伺服器；Rec 裡的必選公網中繼 |

## 必須保留的衝突

- 信令不在 Rec，也不在 IETF 套件。Rec 仍暴露 `signalingState` 與 offer/answer API；8825 / 9429 把協議與投遞標為範圍外。不要把 API 狀態機寫成「規範已定信令」。
- Rec 已是 2025-03-13，但含 Candidate Amendments；ED 另站。8825 仍引用當時的 W3C WD 短名。
- JSEP 現行 9429，舊文與部分實現註釋仍寫 8829。
- getUserMedia 與 Stats 仍是 CRD，WebRTC API 已是 Rec。
- 8825 正式依賴 RFC 8445，同時寫多數實現當時仍近 RFC 5245。
- 「工坊 / 卡不採用 WebRTC」不是「Rec 不是正當行業合同」。

## 例子

- 正例：頁內 `createOffer` → `setLocalDescription` → 把 SDP **用自己的** WebSocket 房間送出；對端 `setRemoteDescription` → `createAnswer` 再送回。通道是應用合同。
- 正例：把 Yjs / Automerge 增量交給已建立的 DataChannel。通道選擇見 [[concepts/CRDT與local-first]]；文件層不假定 WebRTC。
- 反例：寫「按 WebRTC Rec 做信令」或把 `signalingState` 當成房間協議狀態機。
- 反例：引用 RFC 8829 當現行 JSEP，或把 2025-03-13 Rec 寫成「已無修正、與 ED 逐字相同」。
- 反例：把 getUserMedia 或 `getStats` 識別符號寫成 Rec 正文；二者本輪仍是 CRD。
- 反例：用 DataChannel 充當**第一條** offer 的投遞通道——通道本身還沒協商完。

## 邊界與易混概念

- 不包括：CVE、憑證、具體 SFU 產品課、工坊換棧工單。
- WebRTC Rec ≠ 信令規範。Rec 有 `signalingState`，沒有信令協議。
- JSEP ≠ 信令協議。JSEP 是本端控制面；投遞機制完全解耦。
- RFC 8829 ≠ 現行 JSEP。現行是 RFC 9429。
- getUserMedia ≠ `RTCPeerConnection`。前者仍是 CRD。
- DataChannel ≠ 信令通道。前者是對等資料平面。
- WebSocket ≠ WebRTC。WS 常被選作信令載體，不是 Rec 的必選。
- WebRTC ≠ WebCodecs。幀編解碼見 [[concepts/媒體格式與編解碼]]；對等傳輸是本頁。
- 酒館卡 iframe 不是對等通話宿主；本頁不自動落到卡內。見 [[concepts/酒館宿主與iframe分層]]。

## 對映到本倉庫

當前髮卡與工坊開發線都不因本頁改上對等通話或自建信令房。[[concepts/前端架構名詞與取捨]] 的即時預設仍是輪詢 / SSE / WebSocket。[[concepts/CRDT與local-first]] 把 WebRTC 只當可選位元組通道。本頁只釘入口與衝突，不是採用通知。

## 來源與證據

- Rec 日期與地位：本輪 [TR/webrtc](https://www.w3.org/TR/webrtc/)「W3C Recommendation 13 March 2025」；「This document includes Candidate Amendments。」
- 信令未規定：同文 §4.1「signaling channel which is provided by unspecified means」。
- 套件範圍外：RFC 8825「The choice of protocols for client-server and inter-server signaling … are outside the scope of the WebRTC protocol suite」。
- JSEP 解耦與廢止：RFC 9429 Abstract「obsoletes RFC 8829」；§3.1「totally decoupled from the actual mechanism」。
- 採集 / 統計仍是草案：Media Capture CRD 2025-10-09；webrtc-stats CRD 2025-09-25。
- 資料通道：RFC 8831 Abstract，非媒體走 SCTP-over-DTLS。
- 查詢賬本：[[queries/第三批蒸餾目標]] B3-RTC。

已知衝突見上節，不靜默覆蓋。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[queries/第三批蒸餾目標]]
- [[concepts/CRDT與local-first]]
- [[concepts/前端架構名詞與取捨]]
- [[concepts/酒館宿主與iframe分層]]
- [[comparisons/行業架構方案何時用]]
- [[concepts/媒體格式與編解碼]]
