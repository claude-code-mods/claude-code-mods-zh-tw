---
title: PWA與儲存配額
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
  - https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  - https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
  - https://developer.mozilla.org/en-US/docs/Web/API/Cache
  - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
  - https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
  - https://web.dev/articles/storage-for-the-web
  - https://web.dev/articles/persistent-storage
  - https://web.dev/learn/pwa/caching
  - https://storage.spec.whatwg.org/
  - https://www.w3.org/TR/service-workers/
  - https://www.w3.org/TR/IndexedDB/
  - https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
  - https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
  - concepts/酒館宿主與iframe分層.md
knowledge_class: factual
---

# PWA與儲存配額

本頁不是已採用技術，也不改工坊或角色卡棧。檢索時間：2026-08-14。賬本樞紐是 [[queries/第二批蒸餾目標]] **B2-PWA**（16 條採集，本頁收 13 條入口）。清單欄位見 [[queries/第三批蒸餾目標]] B3-Mani；OPFS / 本機選取見 B3-FS 與 [[concepts/酒館宿主與iframe分層]]。

## 一句話定義

PWA 是可安裝的頂層 Web 應用：用清單向作業系統登記，用 Service Worker 攔截請求、用 Cache / IndexedDB / OPFS 做離線桶。儲存配額是瀏覽器按**源**給這些桶的上限與驅逐規則。卡 iframe 不是 PWA。

## 為什麼重要

離線、安裝、角標都掛在「已安裝的頂層應用」上。配額和驅逐決定這份離線資料能活多久。兩件行業事實常被誤套到嵌入框：Safari 連續七日無互動可清指令碼可寫儲存；快取裡的 opaque 跨源響應用於配額時會被墊高。兩者都是頂層 / 已安裝站點的合同，不是狀態列 iframe 的儲存合同。

## 權威入口

檢索 2026-08-14。13 條，不是教程，也不映象全文。B2 採集 16 條裡的離線菜譜 / SW 週期課未升格進本表。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) | B2-PWA 樞紐；註冊、等待啟用、`fetch` / `waitUntil` |
| 2 | [MDN PWA 總覽](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) | 安裝、離線、SW、Cache、IndexedDB 分指南 |
| 3 | [Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache) | 請求/響應桶；不跟 HTTP 快取頭；條目須自刪 |
| 4 | [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | 結構化資料 / Blob；SW 裡存業務資料 |
| 5 | [配額與驅逐](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | best-effort vs persistent；LRU；Safari 主動清 |
| 6 | [web.dev 網頁儲存](https://web.dev/articles/storage-for-the-web) | Cache / IDB / OPFS 怎麼選；七日句；數字會過時 |
| 7 | [web.dev 持久儲存](https://web.dev/articles/persistent-storage) | `persist()` / `persisted()`；勿在 onload 求 |
| 8 | [web.dev PWA 快取](https://web.dev/learn/pwa/caching) | opaque 常按約 7 MB 計配額 |
| 9 | [WHATWG Storage](https://storage.spec.whatwg.org/) | 桶、`persist()`、`estimate()` 平臺模型 |
| 10 | [W3C Service Workers](https://www.w3.org/TR/service-workers/) | 2026-08-12 Nightly CRD；含 Cache / CacheStorage |
| 11 | [IndexedDB 3.0](https://www.w3.org/TR/IndexedDB/) | 事務、物件倉庫；擬取代 2.0 |
| 12 | [WebKit 七日與 ITP](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/) | 指令碼可寫儲存七日帽；主屏應用另計 |
| 13 | [MDN Manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest) | 安裝元資料。規範字段詳頁在 B3-Mani，本條只證「有安裝面」 |

刻意未收：Workbox（庫，不是平臺 API）、AppCache / WebSQL、Edge 教程、2019 Service Workers 1 舊 CR。

## 如何運作

PWA 不是單一 API。安裝面是 Web App Manifest（`name` / `icons` / `start_url` / `display` / 作用域）；執行面是 [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)（安全上下文、無 DOM、無 Web Storage）；資料面是 Cache（URL→Response）、IndexedDB（結構化 / Blob）、OPFS（源私有檔案）。[Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache) 不跟 HTTP 快取頭走，條目不過期除非自刪。

預設是 **best-effort**：壓力下按 LRU 整源刪除，不先問使用者。[WHATWG Storage](https://storage.spec.whatwg.org/)（2026-03-15 活標準）把桶、`persist()`、`estimate()` 收成平臺模型。`navigator.storage.persist()` 只擋**儲存壓力驅逐**。Chrome 按參與度 / 已安裝 / 通知許可權靜默批或拒；Firefox 彈窗。使用者仍可手清。不要在 `onload` 求。`persist()` **不是** Safari 七日清除的豁免。

配額按源，不按路徑。`estimate()` 是估值，防指紋；跨源資源體積會被墊。寫滿拋 `QuotaExceededError`，須 `try/catch`。Web Storage（`localStorage` / `sessionStorage`）各約 5 MiB、同步、SW 不可用，不當離線主桶。

### Safari 七日清除

[WebKit 2020-03-24](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)：自 iOS / iPadOS 13.4、Safari 13.1 起，該站在「Safari 使用日」裡連續七日無點選 / 輕觸，指令碼可寫儲存會被刪。受影響（排除部分遺留型別）：IndexedDB、LocalStorage、Media keys、SessionStorage、Service Worker 註冊與 Cache。伺服器 Set-Cookie 豁免。計數的是 Safari 使用日，不是牆上七日。

加到主屏、以 standalone / fullscreen 跑的 Web 應用**不是 Safari 的一部分**，有自己的使用日計數；按預期使用就會重置，不應被這條清掉。WebKit 寫：若已安裝 Web 應用仍被清，視為嚴重 bug。酒館卡 iframe 沒有這層主屏計數。

### opaque 虛報配額

`no-cors` 跨源響應進 Cache 後是 opaque：指令碼讀不到體和頭。[web.dev 快取課](https://web.dev/learn/pwa/caching) 寫：部分瀏覽器上報很大的體積，例如 **7 MB**，即使檔案只有 1 KB。MDN 配額頁寫：`estimate()` 會故意墊高跨源用量。這是防洩露跨源真實體積，不是「這個檔案真佔 7 MB」。CDN 字型 / 圖若按 opaque 進 Cache，會提前撞配額。同源或 CORS 可讀響應才按近真實體積計。

## 必須保留的衝突

- **Safari 配額數字分叉。** MDN：macOS 14 / iOS 17 起，WebKit 瀏覽器應用每源約磁碟 60%，嵌入 WKWebView 約 15%，主屏 Web 應用按瀏覽器檔；舊版先給 1 GiB 再問。web.dev 儲存文仍寫 Safari「大約 1 GB，滿了再問、每次 +200 MB」，並自稱未找到官方文件。兩邊都留；寫現行 WebKit 用 MDN + WebKit 部落格，web.dev 數字標會過時。
- **Firefox 配額數字分叉。** MDN：best-effort 取磁碟 10% 與 10 GiB 站點組上限的較小者；persistent 可達磁碟 50%、封頂 8 TiB。web.dev：瀏覽器最多用剩餘磁碟 50%，eTLD+1 組 2 GB。兩邊都留，不以一篇覆蓋另一篇。
- **`persist()` 擋不住七日。** 壓力 LRU 跳過 persistent 源；Safari 主動清是另一條，豁免靠主屏應用計數，不是 `persist()`。
- **`estimate()` 虛報是合同。** 跨源 / opaque 被墊；不能用返回值當真實位元組或指紋。
- **SW 規範雙軌。** `/TR/service-workers/` 是 Nightly CRD；Service Workers 1 另向 Rec。實現常落後條文。
- **IndexedDB 3.0 擬取代 2.0**，部分能力未齊；窗口裡的原生 API 仍偏事件，不是全 Promise。
- **B3-Mani / B3-FS 重疊。** 清單 WD、Share Target 無 TR 且倉已歸檔、OPFS vs 本機選取，詳頁不在本檔案。本頁只證安裝面與儲存桶分層。
- **對映 ≠ 採用。** 卡 iframe 不是 PWA，不等於行業不再談 PWA。

## 例子

- 正例：獨立工坊站若要離線目錄，用 SW + Cache 存殼資源，用 IndexedDB 存結構化草稿，寫前看 `estimate()`，寫時接 `QuotaExceededError`。
- 正例：已加到主屏的頂層 PWA 用自己的使用日計數，不跟 Safari 標籤頁共用七日帽。
- 正例：跨源 CDN 資源要進 Cache，先走 CORS，避免一條 1 KB 圖按 7 MB 計。
- 反例：把七日清除或 opaque 虛報寫成「狀態列 iframe / blob 真身的儲存合同」。
- 反例：在卡 iframe 裡註冊 SW、寫 `localStorage`，當成角色進度真源。
- 反例：以為 `persist()` 能擋住 Safari 七日，或擋住使用者手清。
- 反例：因本頁出現 PWA 就寫進 recipe / 髮卡依賴。

## 邊界與易混概念

- 不包括：Workbox 接入、離線菜譜逐步實現、把卡做成可安裝應用、攻擊或繞過儲存隔離。
- PWA ≠ 「網頁能快取」。沒有 OS 安裝面就沒有獨立於 Safari 的主屏計數，也沒有徽章 / Share Target / 檔案處理。
- `persist()` ≠ 七日豁免。前者擋壓力 LRU；後者是 Safari ITP 主動清，豁免靠已安裝 Web 應用的獨立計數。
- `estimate()` ≠ 真實佔用。opaque 墊高是特性，不是 bug。
- Cache ≠ HTTP 快取。Cache API 不認 `Cache-Control`。
- OPFS ≠ 本機選取。前者 `getDirectory()`，後者 `showOpenFilePicker` 等，見宿主頁。
- Web Storage ≠ Storage Manager。`localStorage` 同步且 SW 不可見。
- 清單欄位、Share Target 歸檔、徽章：B3-Mani / 宿主頁，本頁不重蒸。

## 對映到本倉庫

對映放最後，不當過濾器。行業句對獨立站仍成立。

[[concepts/酒館宿主與iframe分層]] 已寫：ST 框架不給角色卡開 iframe；樓裡能跑 JS 的框是酒館助手或卡自己塞的。Web App Manifest / 徽章 / Share Target / 檔案處理掛在已安裝頂層應用，**不自動落到卡**。卡 iframe 沒有 OS 安裝面，也沒有獨立於 Safari 的主屏使用日。

因此：

1. **卡 iframe 不是 PWA。** 不要把七日清除或 opaque 虛報配額當成狀態列、控制中心或 blob 真身的儲存合同。
2. 卡側持久狀態仍走 chat 變數、`eventOn` / `eventEmit` 和宿主橋，見宿主頁與 [[concepts/MVU變數閉環]]。
3. blob 真身再隔一層，預設無 TH 全域性，桶跟 `blob:` / 該框 origin 有關，見 [[concepts/git掛載與遠端真身]]。
4. 獨立工坊站**可以**談 PWA / 配額；那是頂層站點合同，不是「本倉已上 PWA」。
5. 宿主 ST 若跑在本機或非 Safari，七日句對它也不自動成立。不要從卡框反推宿主儲存政策。

本頁不寫「已採用 Service Worker / Workbox / persist()」。

## 來源與證據

- 七日：WebKit 2020-03-24 原文；MDN 配額頁「Proactive eviction」；web.dev 儲存文寫 iOS 13.4 / Safari 13.1，已安裝 PWA 例外。
- opaque：web.dev PWA 快取課「7Mb / 1Kb」；MDN `estimate()` 墊跨源。iframe 補丁曾引 Workbox 執行時快取，本頁以平臺課為準，不把庫升入口。
- `persist()`：WHATWG Storage；web.dev 持久儲存（Chrome 靜默、Firefox 彈窗、勿 onload）。
- SW 規範：`/TR/service-workers/` 2026-08-14 直讀為 Nightly CRD（2026-08-12），並寫 Service Workers 1 另沿 Recommendation 軌道。
- 賬本：[[queries/第二批蒸餾目標]] B2-PWA；重疊 [[queries/第三批蒸餾目標]] B3-Mani / B3-FS。

已知衝突見上節，不靜默覆蓋。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區

## 相關內容

- [[concepts/酒館宿主與iframe分層]]
- [[concepts/git掛載與遠端真身]]
- [[concepts/MVU變數閉環]]
- [[concepts/CRDT與local-first]]
- [[comparisons/嵌入三路徑對照]]
- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
