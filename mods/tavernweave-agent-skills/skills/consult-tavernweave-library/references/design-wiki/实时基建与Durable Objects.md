---
title: 即時基建與Durable Objects
created: 2026-08-15
updated: 2026-08-15
type: concept
status: active
tags:
  - wiki
  - concept
  - tooling
  - research
sources:
  - https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/
  - https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/
  - https://developers.cloudflare.com/durable-objects/best-practices/websockets/
  - https://developers.cloudflare.com/workers/runtime-apis/websockets/
  - https://docs.partykit.io/
  - https://docs.partykit.io/how-partykit-works/
  - https://docs.partykit.io/glossary/
  - https://blog.cloudflare.com/cloudflare-acquires-partykit/
  - https://github.com/cloudflare/partykit/blob/main/packages/partyserver/README.md
  - https://liveblocks.io/docs/concepts
  - https://liveblocks.io/docs/collaboration-features/multiplayer/sync-engine/liveblocks-storage
  - https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
  - https://websockets.spec.whatwg.org/
  - queries/第二批蒸餾目標.md
  - concepts/CRDT與local-first.md
knowledge_class: factual
---

# 即時基建與Durable Objects

本頁不是已採用技術，也不改工坊或角色卡棧。檢索時間：2026-08-15。賬本見 [[queries/第二批蒸餾目標]]（B2-RT）。只收房間、連線、會話壽命的概念入口，不收報價、接入步驟、憑證或攻擊。

## 一句話定義

即時基建是把多個客戶端路由到**同一份房間例項**、並在連線還在時轉發訊息的通道層。Durable Object 是 Cloudflare 的一種有全域性唯一名、單執行緒、計算與儲存綁在一起的 Worker 例項，常被用來當這間房。它把更新送到人，**不負責**兩份富文字怎麼合。

## 為什麼重要

「上即時」常被寫成一條棧。實際至少四層：管道（WebSocket）、房間（誰跟誰在同一例項）、在場（游標、誰線上）、文件合併（CRDT）。混成一詞，就會把休眠、信令、Yjs 更新和報價頁當成同一份規範。[[concepts/CRDT與local-first]] 已把本頁預告為通道概念頁：管房間、連線、會話壽命。本倉庫髮卡與工坊**不因此改棧**；行業正當性仍保留。

## 權威入口

檢索 2026-08-15。下列 **13** 條是入口，不是教程，也不映象全文。不收產品報價頁。賬本採集目標約 12 條。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [What are Durable Objects?](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/) | B2-RT 樞紐。全域性唯一名 + 附屬儲存；有狀態 serverless |
| 2 | [Lifecycle of a Durable Object](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/) | 活躍 / 空閒 / 休眠 / 不活躍；無 shutdown hook |
| 3 | [Use WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) | 一例項可掛多客戶端；標準 WS 與 Hibernation 兩套 API |
| 4 | [Workers WebSockets](https://developers.cloudflare.com/workers/runtime-apis/websockets/) | 有 WebSocket ≠ 有全域性唯一房間 |
| 5 | [What is PartyKit](https://docs.partykit.io/) | 多人即時應用的託管/執行時敘事 |
| 6 | [How PartyKit works](https://docs.partykit.io/how-partykit-works/) | 同一 `id` 進同一房間；底層是 Durable Object |
| 7 | [PartyKit Glossary](https://docs.partykit.io/glossary/) | Party / Room / Server 在他們書裡幾乎同義 |
| 8 | [Cloudflare acquires PartyKit](https://blog.cloudflare.com/cloudflare-acquires-partykit/) | 2024-04 收購公告；不是 API 合同 |
| 9 | [PartyServer README](https://github.com/cloudflare/partykit/blob/main/packages/partyserver/README.md) | 跑在 Durable Objects 上的庫；**不是** PartyKit 託管臺 |
| 10 | [Liveblocks Concepts](https://liveblocks.io/docs/concepts) | 房間 = 邊緣上的有狀態 WebSocket 伺服器 |
| 11 | [Liveblocks Storage](https://liveblocks.io/docs/collaboration-features/multiplayer/sync-engine/liveblocks-storage) | Storage / Presence / Broadcast；合併層另走 |
| 12 | [MDN WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) | 瀏覽器管道 API，不管房間定址 |
| 13 | [WHATWG WebSockets](https://websockets.spec.whatwg.org/) | Living Standard。本輪頁首 **Last Updated 15 March 2026** |

`https://liveblocks.io/docs/concepts/how-liveblocks-works` 本輪開啟後與第 10 條同文（Rooms 錨點在此）。`https://liveblocks.io/docs/ready-made-features/presence` 本輪落到營銷落地頁，不升條。Durable Objects 總覽頁鏈了 Pricing，本頁不收。

## 如何運作

### 四層先切開

| 層 | 活多久 | 本頁是否負責 | 典型入口 |
|---|---|---|---|
| 即時通道 / 房間 | 連線在、例項被定址時 | **是** | Durable Objects、PartyKit 房間、Liveblocks Room |
| 文件 CRDT | 進檔案、可離線再合 | 否 | [[concepts/CRDT與local-first]] |
| 在場 | 隨會話；人走即沒 | 只點名，不蒸合併 | Yjs Awareness、Fluid Presence、Liveblocks Presence |
| WebRTC 信令 | 協商 offer/answer 的那段 | 否 | [[concepts/WebRTC信令邊界]] |

通道把位元組送到人。CRDT 決定兩份更新怎麼收斂。在場是短暫態。WebRTC Rec **不規定**信令協議；房間服務常被拿去當信令載體，那是應用選擇，不是 Rec 的一部分。

### Durable Objects：一名字一例項

官方定義：Durable Object 是一種特殊的 Cloudflare Worker，把計算和儲存綁在一起。與普通 Worker 的差別：

1. **全域性唯一名**：可以從世界任何地方把請求打到**這一份**物件，用來協調多個客戶端。
2. **附屬持久儲存**：和物件住在一起，官方稱強一致且訪問快；正文寫容量上限 **10 GB**（檢索日；腳註未核）。

另外幾條官方要點：首次訪問才隱式建立；空閒數秒後可休眠；記憶體態在休眠後重置，需要留下的必須寫入附屬儲存；單執行緒、協作式多工；名稱空間對應一個實現類，官方寫「對能建立多少個沒有硬上限」。可選用 Actor 模型來理解：一例項收訊息、在自己的單執行緒上下文裡跑、再往外發。本頁不寫 stub / RPC 接入步驟。

官方也寫：Durable Objects **尚未**出現在每一個 Cloudflare 資料中心；現網機房他們指向 `where.durableobjects.live`。本輪**未開啟**該站。

### 生命週期與休眠

[生命週期頁](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/)：只建立 stub **不會**例項化；對 stub 呼叫方法之後，生命週期才開始。狀態包括：記憶體中活躍；記憶體中空閒但不可休眠；記憶體中空閒且可休眠；已休眠；不活躍（可能冷啟動）。

可休眠的條件必須**同時**成立，其中包括：沒有未完成的 `setTimeout` / `setInterval`；沒有進行中的 `fetch()`；**沒有使用 Web 標準 WebSocket API**；沒有仍在處理的請求；沒有活動的出站 TCP / 出站 WebSocket。滿足條件後，官方寫當前是空閒 **10 秒**進入休眠。不可休眠的空閒物件，官方寫再過 **70–140 秒**無事件會被整份逐出，進入不活躍。

休眠時：物件離開記憶體；**已休眠的 WebSocket 客戶端仍連在 Cloudflare 網上**；記憶體態丟；再有事件會重新跑 `constructor`。官方明確**不提供** shutdown hook，理由是不能保證每次關機都能跑到。關機時，官方寫 WebSocket 會被斷開，好讓新例項儘快接管。

[Use WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) 把 API 分成兩套：Hibernation（閒時物件可睡、客戶端不斷）與 Web 標準 WebSocket。一例項可作多客戶端的協調點（聊天室、多人遊戲是他們舉的例子）。官方用計費時長解釋為何推薦 Hibernation；**報價與計費數字本頁不收**。

### PartyKit：房間是 Durable Object

[How PartyKit works](https://docs.partykit.io/how-partykit-works/)：每個 PartyKit 伺服器（Party）背後是一個 Durable Object。同一 `id` 保證進同一房間（同一例項）；新 `id` 會要一個新例項。房間有狀態，可以按普通 JS/TS 類持有記憶體。傳輸是標準 HTTP 與標準 WebSocket，不綁死某一家客戶端 SDK。

[Glossary](https://docs.partykit.io/glossary/) 把 Party、Room、Server 都寫成「一份 Durable Object」。這是 PartyKit 書的用詞，不是 IETF 房間標準。

### PartyServer 不是同一份託管臺

Cloudflare [收購公告](https://blog.cloudflare.com/cloudflare-acquires-partykit/)日期是 **2024-04-05**。收購後，[PartyServer README](https://github.com/cloudflare/partykit/blob/main/packages/partyserver/README.md) 自稱：在 Durable Objects 上做即時應用的庫，**受 PartyKit 啟發**。它自己列的差別包括：URL 與伺服器名解耦；不含 PartyKit 對其它服務的繫結；**沒有** PartyKit 那種自動推斷的 Durable Object 繫結與 migration，要在 Wrangler 配置裡手寫。本頁不寫配置步驟。

`docs.partykit.io` 本輪仍活，仍按「CLI 部署到 PartyKit runtime」敘述。它與 PartyServer、裸 Durable Objects **不是**已經併成一條「現行唯一入口」。哪一條才是 2026 年推薦部署路徑：本頁標**不確定**。

### Liveblocks：房間是產品原語

[Concepts](https://liveblocks.io/docs/concepts)：Liveblocks 自稱即時基礎設施 **加上** 無衝突同步層。房間是「邊緣上的有狀態 WebSocket 伺服器」，通常對映到產品裡的一份文件、白板、表格之類。房間裡的原語包括 Presence、Broadcast、Storage、Feeds、Threads。平臺敘事是用 WebSocket 做在場、連線管理、低延遲訊息和房間編排。

[Storage](https://liveblocks.io/docs/collaboration-features/multiplayer/sync-engine/liveblocks-storage) 把 Storage 寫成 `LiveList` / `LiveMap` / `LiveObject` 這類 **conflict-free / CRDT-like** 結構，資料按房間永久存放；Presence 用來做頭像棧、游標；Broadcast 是事件，不是文件歷史。服務端 `setPresence` 官方寫成會過期的短暫值。**合併規則不在本頁寫**，見 [[concepts/CRDT與local-first]]。

Concepts 頁提到專案有區域、環境、金鑰等產品容器欄位。本頁只承認「房間是通道」，不收金鑰、鑑權步驟或報價。US / EU 區域官方標了更高套餐，**不鏈報價頁**。

### WebSocket 只是管道

[WHATWG WebSockets](https://websockets.spec.whatwg.org/) 提供瀏覽器裡的雙向通訊 API，不管房間名、也不管多客戶端如何匯合。[MDN WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) 本輪標 **Baseline Widely available \***，2015-07 起跨瀏覽器，部分能力支援度不一。

[Workers WebSockets](https://developers.cloudflare.com/workers/runtime-apis/websockets/) 讓普通 Worker 也能當 WebSocket 端點。這隻證明「這條程序能說話」。沒有全域性唯一名，就不能把它自動當成「全世界進同一間房」。相容日 ≥ `2026-04-07` 時，Workers 預設自動回 Close；≥ `2026-03-17` 時 `binaryType` 預設 `"blob"`。這是管道行為，不是房間語義。

## 必須保留的衝突

- 通道 ≠ CRDT ≠ 在場 ≠ WebRTC 信令。四層都正當，不要併成「即時 = Yjs」或「即時 = Durable Objects」。
- PartyKit 託管臺、PartyServer 庫、裸 Durable Objects：三套官方樹都還在。收購（2024-04）**沒有**讓 `docs.partykit.io` 消失，也沒有把 PartyServer 寫成「PartyKit 的唯一繼任 RFC」。
- PartyKit 詞彙表把 Durable Object 寫成「無限可擴充套件」；Cloudflare 樞紐更謹慎：建立數量無硬上限，但**不是每個資料中心都有**。兩邊都留。
- 使用 **Web 標準 WebSocket API** 會讓 Durable Object **不能**按生命週期頁進入休眠。Hibernation API 是 Cloudflare 擴充套件，不是 WHATWG 的一部分。
- 休眠：連線可仍在網上，物件記憶體態會丟。不要把「連線還在」寫成「類欄位還在」。
- Liveblocks 房間 ≠ Liveblocks Storage。前者是通道；後者官方自稱 CRDT-like，本頁不負責怎麼合。
- 普通 Worker 有 WebSocket ≠ 有 Durable Object 房間。
- 「工坊 / 卡不上房間服務」不是「行業沒有房間原語」。

## 例子

- 正例：聊天室或對局用同一個房間 `id` 定址；後加入的人進**同一**例項，例項再廣播。定址是通道，訊息體可以是任意位元組。
- 正例：Yjs / Automerge 的 update 位元組走房間的 WebSocket；合併仍在 `Y.Doc` / Automerge 文件裡，見 [[concepts/CRDT與local-first]]。
- 正例：游標、頭像棧走 Presence / Awareness；人斷線即沒，不寫進文件歷史。
- 正例：WebRTC 的 SDP / ICE 候選用房間當信令載體。載體是應用合同，不是 WebRTC Rec，見 [[concepts/WebRTC信令邊界]]。
- 反例：把兩份富文字的合併寫進房間物件，或把 Durable Objects 樞紐當成 CRDT 規範。
- 反例：把 SharedWorker 當成「多使用者房間」。它是同源多瀏覽上下文，見 [[concepts/SharedWorker與Web Locks]]。
- 反例：把本機 Cache / IndexedDB 配額當成房間會話壽命，見 [[concepts/PWA與儲存配額]]。
- 反例：收報價頁、寫 wrangler / 金鑰 / 鑑權步驟，或把 PartyKit 示例主機名當成本倉庫接入教程。

## 邊界與易混概念

- 不包括：報價、憑證、攻擊或繞過、具體接入步驟、某家 pub/sub 的報價對照。
- 即時通道 ≠ CRDT。通道可送任意位元組；收斂合同在文件層。
- 在場 ≠ 文件。一份隨會話死，一份進檔案。
- WebSocket ≠ 房間。管道沒有「同一 `id` 進同一例項」的保證。
- Durable Object ≠ 瀏覽器標準。它是 Cloudflare 執行時原語。
- PartyKit ≠ PartyServer。一個是他們文件裡的託管/runtime 敘事，一個是 DO 上的庫。
- Liveblocks ≠ Durable Objects。Liveblocks 是託管產品，自述房間跑在邊緣 WebSocket 上；底層是否等於使用者自己的 DO 類，官方概念頁**沒有**寫成「你在寫 Durable Object」，本頁不臆測。
- WebRTC 信令 ≠ 房間產品。Rec 把信令通道標為未規定手段。
- 同源多標籤的 SharedWorker / Web Locks ≠ 跨使用者房間。
- 卡 iframe 不是多人房間宿主；本頁不自動落到卡內。

## 對映到本倉庫

當前髮卡是單會話、單模型寫手：世界書教格式，bundle 打補丁，Zod 攔結構。沒有「多玩家各持連線、進同一房間廣播」的合同。獨立工坊站已用同步 REST + 靜態目錄；[[comparisons/工坊架構該上與不該上]] 寫明目錄更新稀，WebSocket / SSE 推目錄沒有主路徑收益。[[concepts/前端架構名詞與取捨]] 的即時表把 WebSocket 留給協作編輯、對戰、在場；那是行業表，不是「工坊必須上房間」。

本頁只釘入口與衝突，不是採用通知。以後若做「多人同時改同一份卡源」，那是新產品面，再單獨立項。

## 來源與證據

- Durable Object 定義與雙特性：樞紐頁「globally-unique name」「durable storage」；有狀態 serverless。
- 生命週期與無 hook：lifecycle 頁狀態表、休眠條件、10 秒 / 70–140 秒、shutdown 節「hooks are not provided」。
- WebSocket 與休眠：Use WebSockets「thousands of clients per instance」；休眠時客戶端仍連、記憶體重置。
- PartyKit 一 id 一房間：How PartyKit works；詞彙表 Party = Durable Object。
- 收購與分叉：Cloudflare 部落格 2024-04-05；PartyServer README「Inspired by PartyKit」及自列差別。
- Liveblocks 房間與原語：Concepts「stateful WebSocket server on the edge」；Storage 自稱 CRDT-like，Presence 為短暫指示。
- 管道：WHATWG Living Standard（2026-03-15）；MDN Baseline Widely available *。
- 賬本：[[queries/第二批蒸餾目標]] B2-RT。預告關係：[[concepts/CRDT與local-first]]。

已知衝突見上節，不靜默覆蓋。PartyKit 託管臺是否仍為推薦部署路徑、`where.durableobjects.live` 現網覆蓋、10 GB 腳註：本輪未核，標未知。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[concepts/CRDT與local-first]]
- [[concepts/WebRTC信令邊界]]
- [[concepts/SharedWorker與Web Locks]]
- [[concepts/PWA與儲存配額]]
- [[concepts/前端架構名詞與取捨]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
- [[queries/第二批蒸餾目標]]
