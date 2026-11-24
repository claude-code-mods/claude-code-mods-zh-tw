---
title: SharedWorker與Web Locks
created: 2026-08-14
updated: 2026-08-15
type: concept
status: active
tags:
  - wiki
  - concept
  - tooling
  - research
  - sillytavern
sources:
  - https://html.spec.whatwg.org/multipage/workers.html
  - https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker
  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
  - https://developer.mozilla.org/en-US/docs/Web/API/Worker
  - https://www.w3.org/TR/web-locks/
  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API
  - https://html.spec.whatwg.org/multipage/web-messaging.html#broadcastchannel
  - https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
  - https://wicg.github.io/storage-buckets/
  - https://wicg.github.io/storage-buckets/explainer.html
  - https://developer.chrome.com/docs/web-platform/storage-buckets
  - https://storage.spec.whatwg.org/
  - 10-收件箱/寫回候選/第五批-B5-Worker.md
  - queries/第五批蒸餾目標.md
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
  - concepts/酒館宿主與iframe分層.md
knowledge_class: factual
---

# SharedWorker與Web Locks

本頁不是已採用技術，也不改工坊或角色卡棧。檢索時間：2026-08-14。賬本是 `10-收件箱/寫回候選/第五批-B5-Worker.md`（B5-Worker，12 條），樞紐見 [[queries/第五批蒸餾目標]]。不重抄 [[queries/第二批蒸餾目標]] **B2-Wasm** / **B2-PWA**，也不重抄 [[queries/第三批蒸餾目標]] **B3-FS**。Service Worker 只當 HTML 點名的第三種 worker。

## 一句話定義

同源多瀏覽上下文要協作時，現行入口不是「一個 Worker API」：Dedicated Worker 綁建立者；SharedWorker 按 origin（另加指令碼 URL / 可選名字）被多個上下文共用；BroadcastChannel 是同儲存鍵上的命名廣播；Web Locks 是同儲存桶裡的協作鎖；Storage Buckets 想把「一個源一個預設桶」拆成可獨立驅逐的命名桶——後一件不是 Rec。

## 為什麼重要

多標籤、多 iframe 看起來像「各過各的」，平臺卻按 origin / 儲存鍵 / 儲存桶把它們穿在一起。把 SharedWorker 當成「這個 iframe 文件自己的後臺執行緒」，或把 Locks / BroadcastChannel 寫成「只要同 origin 就通」，都會在第三方分割槽上靜默切開。卡 iframe 是獨立瀏覽上下文，但共享原語不按文件例項切。本倉庫角色卡與工坊**不因此改棧**；行業正當性仍保留。

## 權威入口

檢索 2026-08-14。12 條，不是教程。MDN `Storage_Buckets_API`、`StorageBucket`、`/TR/storage-buckets/` 檢索日 404，不升條。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [HTML Workers](https://html.spec.whatwg.org/multipage/workers.html) | Dedicated 綁建立者；Shared 按 origin 命名；構造比 storage key + URL + 名字 |
| 2 | [MDN SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker) | Baseline Newly 2026-05；多視窗 / iframe 共用；須同 origin；走 `port` |
| 3 | [MDN Using web workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) | 壽命、`extendedLifetime`；Firefox 隱私窗不共享 |
| 4 | [MDN Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker) | Dedicated 對照；Baseline Widely 2015-07 |
| 5 | [Web Locks](https://www.w3.org/TR/web-locks/) | WD 2025-09-24；鎖管理器掛儲存桶；不是 Rec |
| 6 | [MDN Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) | Baseline Widely 2022-03；`ifAvailable` / `steal` / `signal` / `query()` |
| 7 | [HTML BroadcastChannel](https://html.spec.whatwg.org/multipage/web-messaging.html#broadcastchannel) | 目的地按 storage key + 頻道名 |
| 8 | [MDN Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) | 先寫同 origin，再寫頂層站點分割槽 |
| 9 | [Storage Buckets 規範](https://wicg.github.io/storage-buckets/) | 非 Rec；`persisted` / `quota` / `expires` |
| 10 | [Storage Buckets 解釋稿](https://wicg.github.io/storage-buckets/explainer.html) | 提議改 Storage Standard；另寫 `durability` |
| 11 | [Chrome Storage Buckets](https://developer.chrome.com/docs/web-platform/storage-buckets) | Chromium 122；`durability` 為提示 |
| 12 | [Storage Standard](https://storage.spec.whatwg.org/) | shelf / default 桶；`persist()` 只改 default |

上表 **12** 條。B5-Worker 的採集行不在本頁映象。B2-PWA / B2-Wasm / B3-FS 不重抄。

## 如何運作

五面不要併成一層：

1. **Dedicated Worker（對照）**：一個建立者、一條隱式訊息口、無 DOM。不是多標籤協調原語。MDN Worker 是 Baseline Widely（2015-07）。
2. **SharedWorker**：同 origin、同指令碼 URL（可選名字）共用一個 `SharedWorkerGlobalScope`。新客戶端走 `connect` + `MessagePort`。HTML 引言：不同站點同名不撞；同站不同指令碼 URL 會失敗。構造演算法另比 constructor storage key。MDN 標 Baseline Newly（2026-05）。構造器不在 `DedicatedWorkerGlobalScope`。
3. **BroadcastChannel**：輕量廣播。HTML 用 storage key 選目的地；MDN 用頂層站點分割槽解釋同一事實。傳送者自己不收。無協商、無語義。
4. **Web Locks**：`navigator.locks.request()`；預設 exclusive，可 shared。非同步獲鎖、回撥結束即放。鎖名無平臺語義。規範：每個儲存桶一個 lock manager；分割槽儲存的 UA 必須同樣分割槽鎖。規範是 WD（2025-09-24）；MDN 標 Baseline Widely（2022-03）。
5. **Storage Buckets**：`navigator.storageBuckets.open/keys/delete`。給站點顯式命名桶，UA 可按桶驅逐。WICG CG Report（2023-12-19），文首寫明不是 W3C Standard、不在 Standards Track。Chrome 122 起已裝。WHATWG Storage 檢索日仍只保證 default 桶；`persist()` 只改 default 桶，全有全無。

壽命（MDN Using）：無引用即停；同 origin 導航可短暫保活；`extendedLifetime` 可在引用清空後再活一小段。Firefox 隱私窗與普通窗不共享。

## 必須保留的衝突

- **SharedWorker：引言 origin vs 構造 storage key。** 01 引言與 02 寫同 origin；構造步驟匹配 constructor storage key + URL + 名字（`data:` 用建立環境的 key）。與 07 同一套 key，第三方分割槽會切開。不要併成「只要同 origin 就共用」。
- **Web Locks：WD ≠ Baseline Widely。** 05 是 2025-09-24 WD，文首禁止當已定稿引用。06 標 2022-03 起 Baseline Widely。成熟度兩套尺子。
- **Locks 範圍：origin 口吻 vs 儲存桶條文。** 05 摘要寫「同 origin」；正文與隱私節寫鎖管理器按儲存桶。06 文首跟摘要口吻。
- **BroadcastChannel：同 origin ≠ 同儲存分割槽。** 08 先寫同 origin，再寫頂層站點分割槽。07 匹配的是 storage key。
- **Storage Buckets 不是 Rec，但 Chrome 已裝。** 09 是 CG Report 2023-12-19。11 寫 Chromium 122 起可用。MDN 專頁與 `/TR/storage-buckets/` 404。不能寫成 Recommendation，也不能寫成「平臺已齊」。
- **Chrome `durability` ≠ 09 的選項表。** 11 / 10 有 `'strict'` / `'relaxed'` 提示；09 只有 `persisted` / `quota` / `expires`。
- **SharedWorker 成熟度。** 02 是 Baseline Newly（2026-05）；04 Dedicated 是 2015-07 Widely。HTML 章頭「現行引擎都有」不能抹掉 Shared 晚齊。
- **對映 ≠ 採用。** 卡 iframe 共享按 origin，不等於卡必須上 SharedWorker。

## 例子

- 正例：同 origin 的兩個視窗（或兩個 iframe）`new SharedWorker(同一指令碼 URL, 同一名字)`，共用一個 `SharedWorkerGlobalScope`，新客戶端走 `connect`。
- 正例：多標籤搶同一資源時用 `navigator.locks.request('name', …)`；回撥結束即放，不自造「鎖檔案」。
- 正例：同儲存鍵上的 `BroadcastChannel('x')` 做輕量廣播；傳送者自己不收。
- 反例：以為每個卡 iframe 文件各有一份 SharedWorker，互不相見。
- 反例：從 Dedicated Worker 裡再 `new SharedWorker()`。
- 反例：把 Storage Buckets 寫成 Recommendation，或把 Chrome `durability` 寫進 09 的選項表。
- 反例：因本頁出現這些 API 就寫進 recipe / 髮卡依賴。

## 邊界與易混概念

- 不包括：SW 專論、Wasm 進 Worker、OPFS、跨源 `postMessage` 教程、攻擊/繞過、憑證、成品、工坊或卡已採用宣告。
- SharedWorker ≠ Dedicated Worker。後者綁建立者；前者按 origin + URL + 名字共用。
- SharedWorker ≠ Service Worker。SW 回 B2-PWA。
- 同 origin ≠ 同儲存分割槽。BroadcastChannel 跟儲存鍵走；第三方 iframe 可被切開。
- Locks 摘要「同 origin」≠ 規範正文「按儲存桶」。分割槽儲存的 UA 必須同樣分割槽鎖。
- `persist()`（default 桶整包）≠ 按桶 `persisted`。前者 B2-PWA 已收。
- Storage Buckets ≠ 已進 WHATWG Storage 的多桶 API。12 檢索日仍寫「likely in the future」。

## 對映到本倉庫

卡 iframe 是獨立瀏覽上下文；SharedWorker 按 origin 共享，不按 iframe 文件例項。

行業句對獨立站仍成立。本頁不寫「已採用 SharedWorker / Locks / BroadcastChannel / 多桶」。blob 真身再隔一層，桶跟 `blob:` / 該框 origin 有關，見 [[concepts/git掛載與遠端真身]]。分層見 [[concepts/酒館宿主與iframe分層]]。配額與 SW 見 [[concepts/PWA與儲存配額]]。

## 來源與證據

- Shared 作用域：HTML Workers 引言與構造步驟；MDN SharedWorker。
- Locks：W3C WD 正文（鎖管理器按桶）與 MDN 實現面。
- Broadcast：HTML storage key；MDN 頂層站點分割槽例句（`a.com` 裡的 `b.com` iframe 不能跟頂層 `b.com` 通話）。
- 多桶：09 文首非 Standard；11 Chromium 122；12 仍只保證 default 桶。
- 賬本：`10-收件箱/寫回候選/第五批-B5-Worker.md`；樞紐 [[queries/第五批蒸餾目標]]；重疊 [[queries/第二批蒸餾目標]] B2-PWA / B2-Wasm、[[queries/第三批蒸餾目標]] B3-FS。

已知衝突見上節，不靜默覆蓋。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（`index.md` / `log.md` 本波不改）

## 相關內容

- [[concepts/酒館宿主與iframe分層]]
- [[concepts/git掛載與遠端真身]]
- [[concepts/控制中心與狀態列]]
- [[concepts/PWA與儲存配額]]
- [[queries/第五批蒸餾目標]]
- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
