---
title: 邊緣快取與SWR
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
  - https://httpwg.org/specs/rfc5861.html
  - https://www.rfc-editor.org/info/rfc5861
  - https://www.rfc-editor.org/rfc/rfc9111.html
  - https://www.rfc-editor.org/rfc/rfc9213.html
  - https://www.rfc-editor.org/rfc/rfc9110.html
  - https://www.rfc-editor.org/rfc/rfc9651.html
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching
  - https://nextjs.org/docs/app/guides/incremental-static-regeneration
  - https://swr.vercel.app/docs/getting-started
  - https://developers.cloudflare.com/cache/concepts/cache-control/
  - https://developer.mozilla.org/en-US/docs/Web/API/Cache
  - https://html.spec.whatwg.org/multipage/speculative-loading.html
  - https://www.rfc-editor.org/rfc/rfc8297.html
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
  - concepts/前端架構名詞與取捨.md
knowledge_class: factual
---

# 邊緣快取與SWR

本頁不是已採用技術，也不是工坊必須改 `Cache-Control` 的工單。檢索時間：2026-08-14。賬本樞紐是 [[queries/第二批蒸餾目標]] 的 **B2-Edge**。

## 一句話定義

邊緣快取是把可複用的 HTTP 響應放在離使用者更近的**共享快取**（常是 CDN）裡，按新鮮度決定直接給、先校驗、還是回源。本頁的 **SWR** 只指 [RFC 5861](https://httpwg.org/specs/rfc5861.html) 的 `stale-while-revalidate`：新鮮期過後，快取可以先給陳舊副本，同時在後臺再驗證。**`swr` ≠ `isr`。** 它也不是 React 的 `useSWR`。

## 為什麼重要

源站不必為每個 GET 再算一遍。瀏覽器私有快取、CDN 共享快取、源站前的一層，壽命可以分開寫。寫錯層會出現：瀏覽器還拿著舊頁、CDN 已經過期；或把只該給一個人的響應放進共享快取。工坊站預設 SSG/ISR、卡 runtime 走雙 CDN，都是「分發或渲染」而不是本頁要選的協議。本頁只把 HTTP 快取合同和三個常被併成一詞的「SWR」拆開。

## 權威入口

B2-Edge 樞紐是 RFC 5861。下列 **14** 條是 2026-08-14 直讀過的官方頁，不是映象。B2-Edge 採集行不在本頁逐條複述。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [RFC 5861（HTTPWG）](https://httpwg.org/specs/rfc5861.html) | `stale-while-revalidate` 與 `stale-if-error`；二者獨立 |
| 2 | [RFC 5861 狀態頁](https://www.rfc-editor.org/info/rfc5861) | **Informational**，不是 Standards Track |
| 3 | [RFC 9111 HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html) | 現行快取 STD 98；廢止 7234；引用 5861 作陳舊擴充套件 |
| 4 | [RFC 9213 Targeted Cache Control](https://www.rfc-editor.org/rfc/rfc9213.html) | `CDN-Cache-Control`；對準一類快取 |
| 5 | [RFC 9110 HTTP 語義](https://www.rfc-editor.org/rfc/rfc9110.html) | ETag / Last-Modified / Vary / GET；不管 CDN 產品 |
| 6 | [RFC 9651 Structured Fields](https://www.rfc-editor.org/rfc/rfc9651.html) | 現行結構化欄位；9213 仍引已廢的 8941 |
| 7 | [MDN Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control) | 指令速查，不是 IETF 真源 |
| 8 | [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) | 新鮮度 / 校驗導讀 |
| 9 | [Next.js ISR](https://nextjs.org/docs/app/guides/incremental-static-regeneration) | 框架重建靜態頁；**不是** HTTP SWR |
| 10 | [Vercel SWR 入門](https://swr.vercel.app/docs/getting-started) | React `useSWR` 鉤子；客戶端拉數 |
| 11 | [Cloudflare Origin Cache-Control](https://developers.cloudflare.com/cache/concepts/cache-control/) | 一家 CDN 的實現面；正文仍寫對齊 7234 |
| 12 | [MDN Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) | Service Worker / Cache Storage，另一層 |
| 13 | [WHATWG speculative loading](https://html.spec.whatwg.org/multipage/speculative-loading.html) | 推測載入 ≠ 新鮮度；歸 B3-Hint |
| 14 | [RFC 8297 103 Early Hints](https://www.rfc-editor.org/rfc/rfc8297.html) | 103 ≠ 快取；仍是 Experimental |

上表 **14** 條。圖 CDN（B3-Img）、PWA 配額（見 [[concepts/PWA與儲存配額]]）、Durable Objects（見 [[concepts/即時基建與Durable Objects]]）不在本頁展開。

## 如何運作

### 新鮮、陳舊、再驗證

[RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html) 把快取分成**私有**（常跟一個使用者代理）和**共享**（中間人、CDN）。目標是複用先前響應，而不是強迫每家都存。響應在新鮮壽命內可直接複用；過期後通常要帶著 ETag / Last-Modified 回源再驗證（9110 的條件請求）。沒有顯式過期時，快取可以對「可啟發式快取」的狀態碼估一個壽命，常見上界是 `Last-Modified` 距今間隔的約 10%。啟發式不是 `max-age` 的替代寫法。

`Age` 是沿路各快取駐留時間之和。9111 §5.5 **廢止 `Warning`**：陳舊與否看 `Age` 和其他欄位，不要再要求 `Warning: 110`。

### RFC 5861：兩扇獨立的窗

5861 是 2010 年 Informational 擴充套件，不是 9111 正文裡的指令。9111 §4.2.4 明確：除非斷開、客戶端/源站明示（例如 5861），或另有帶外合同，快取不得主動給陳舊響應。

- `Cache-Control: max-age=600, stale-while-revalidate=30`：600 秒內新鮮；再 30 秒內可以先給陳舊副本，並**不阻塞**地再驗證。窗過完仍未驗證，就不應繼續按 SWR 供陳舊。非同步驗證通常由**落在窗內的請求**觸發；窗太窄或流量太稀，就會有請求擋住等源站。
- `stale-if-error`：再驗證得到 500/502/503/504（或等價連通失敗）時，可在標明的陳舊上限內改給舊成功響應。它不改變新鮮度計算。

兩扇窗獨立。有 SWR 不等於出錯也兜底；有 SIE 不等於後臺靜默重新整理。5861 安全節反對為了 SWR 去預取或自動重新整理，以免放大請求。

### 對準 CDN：RFC 9213

`Cache-Control` 對所有快取一視同仁；`s-maxage` 只覆蓋共享快取的壽命，蓋不住 `stale-while-revalidate` 這類擴充套件。9213 用**目標列表**選第一個有效的 `*-Cache-Control`。CDN 快取若吃到有效的 `CDN-Cache-Control`，**必須忽略**同響應裡的 `Cache-Control` 與 `Expires`。例：`Cache-Control: max-age=60, s-maxage=120` 加 `CDN-Cache-Control: max-age=600`，CDN / 其他共享快取 / 瀏覽器壽命可以是 600 / 120 / 60。

代價是 **Age 懲罰**：CDN 按更長壽命繼續供的響應，下游看起來可能已經陳舊。實現上有人會改 `Date`/`Expires` 或去掉 `Age`；9213 不強制某一種。目標欄位按 Structured Fields 解析；用普通 `Cache-Control` 解析器會互操作失敗。9213 仍規範引用 RFC 8941；現行結構化欄位是 **RFC 9651**（廢止 8941）。兩邊都留。

### 三詞不要並

| 詞 | 真源 | 層 |
|---|---|---|
| HTTP SWR | RFC 5861 `stale-while-revalidate` | 快取供陳舊 + 後臺再驗證 |
| ISR | [Next ISR](https://nextjs.org/docs/app/guides/incremental-static-regeneration) | 框架按 `revalidate` / `revalidatePath` 重建**頁面** |
| `useSWR` | [swr.vercel.app](https://swr.vercel.app/docs/getting-started) | React 鉤子：去重、記憶體快取、聚焦再拉 |

Next 文件自己用 “background regeneration (stale-while-revalidate)” 形容 ISR，這是命名撞車，不是「ISR = RFC 5861」。ISR 不支援靜態匯出；`revalidate = 60` 是路由段配置。`useSWR` 管元件要哪份 JSON，不管 CDN 怎麼存 HTML。

### 實現面會改語義

[Cloudflare Origin Cache-Control](https://developers.cloudflare.com/cache/concepts/cache-control/) 寫：企業可開關「嚴格尊重源站」；免費檔預設開。正文仍寫對齊 **RFC 7234**，而現行是 9111。`s-maxage` 帶 `proxy-revalidate` 語義，**共享快取不得在未再驗證時供陳舊**，因此不要和 `stale-while-revalidate` 寫在同一套共享策略裡。Always Online 開著時，Cloudflare 會忽略 SWR/SIE。Workers Cache API 的 `match`/`put` 也不支援這兩扇窗。廠商頭（`CDN-Cache-Control`、`Cloudflare-CDN-Cache-Control`）是 9213 約定，不是第二份 IETF 新鮮度模型。

## 必須保留的衝突

- **`swr` ≠ `isr`。** HTTP `stale-while-revalidate` ≠ Next ISR ≠ React `useSWR`。
- RFC 5861 是 **Informational**；RFC 9111 是 STD 98，廢止 7234，並把 5861 當「允許供陳舊」的擴充套件引用。
- 5861 仍寫陳舊響應應帶 `Warning`；9111 **廢止 Warning**，改看 `Age`。
- `stale-while-revalidate` ≠ `stale-if-error`；兩扇窗獨立。
- `s-maxage` 隱含 `proxy-revalidate`，會關掉共享快取上的 SWR。
- 9213：有效 `CDN-Cache-Control` 讓該 CDN **忽略** `Cache-Control`/`Expires`；`s-maxage` 不能代替對 SWR 的對準。
- 共享快取 ≠ 私有快取 ≠ 9213 的 CDN 類；邊緣計算（Worker / Durable Object）≠ 邊緣快取。
- Cloudflare 實現文仍引 7234；OCC 開關會改變 `max-age=0` / `no-cache` 是「不存」還是「存了必再驗證」。
- 9213 引 RFC 8941；8941 已被 9651 廢止。
- 103 / Speculation Rules ≠ 新鮮度（見 [[concepts/Web效能與INP]]、B3-Hint）。
- Service Worker Cache API ≠ HTTP 共享快取（見 [[concepts/PWA與儲存配額]]）。
- 圖 CDN 變換（B3-Img）≠ HTTP 快取語義。
- 工坊 SSG/ISR 是渲染落點，**不是**「本倉已上 HTTP SWR」。
- 卡雙 CDN（[[concepts/git掛載與遠端真身]]）是資源分發，不是源站 `Cache-Control` 策略。

## 例子

- 正例：公開目錄 HTML 寫 `max-age` + 可選的 `CDN-Cache-Control`；瀏覽器短、CDN 長。
- 正例：可容忍短暫陳舊的只讀 GET，加獨立的 `stale-while-revalidate`，且**不要**再給共享快取加 `s-maxage` 來「順便」延壽。
- 正例：源站 5xx 時寧可給舊成功頁，用 `stale-if-error`，不要指望 SWR 代勞。
- 反例：把 ISR 的 `export const revalidate = 60` 寫成 RFC 5861。
- 反例：把 `useSWR('/api/user')` 當成 CDN 指令，或把稽核寫結果交給共享 SWR。
- 反例：個人儀表 `Cache-Control: public`，或 `no-store` 的響應還指望 CDN 命中。

## 邊界與易混概念

- 不包括：物件儲存憑證、快取投毒/繞過步驟、報價頁、本倉庫「已採用」某 CDN。
- 不包括：把 103、預渲染、字型子集、圖變換寫成快取新鮮度。
- 啟發式新鮮度 ≠ 顯式 `max-age`。
- `no-store`（不要存）≠ `no-cache`（可存但用前必須再驗證）。
- 易混：聽到「SWR」就以為框架、鉤子和 HTTP 指令是同一個旋鈕。

## 對映到本倉庫

獨立工坊站預設 **SSG/ISR + islands**，目錄是快取靜態讀，見 [[concepts/前端架構名詞與取捨]]、[[comparisons/工坊架構該上與不該上]]。那是渲染與產品快取，不是源站必須發出 5861 指令。釋出 / 稽核要同步可見，寫面不要靠共享 SWR 藏舊狀態。

卡側 git 掛載是 jsDelivr 雙源拉 runtime，見 [[concepts/git掛載與遠端真身]]。那是分發失敗時換源，不是 `CDN-Cache-Control`。本頁不把工坊或卡寫成「已上邊緣 SWR」。Gateway 同步 REST 的錯誤體仍歸 [[concepts/HTTP合同與問題詳情]]。

## 來源與證據

- 兩扇窗與 Informational：RFC 5861 正文與 `/info/rfc5861`。
- 現行快取、供陳舊條件、廢止 Warning / 7234：RFC 9111 文首、§4.2.4、§5.5。
- 對準 CDN 與 Age 懲罰：RFC 9213 §2–3。
- ISR / `useSWR`：Next 16 文件與 swr.vercel.app 入門（2026-08-14 直讀）。
- 實現分叉：Cloudflare OCC 頁（仍寫 7234；`s-maxage` 關掉 SWR）。
- 賬本：[[queries/第二批蒸餾目標]] B2-Edge；重疊見 B3-Hint、B3-Img、[[concepts/PWA與儲存配額]]。

已知衝突見上節，不靜默覆蓋。某家 CDN 是否完整實現 5861 兩扇窗：以該家文件為準，標未知。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區

## 相關內容

- [[concepts/前端架構名詞與取捨]]
- [[concepts/Web效能與INP]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/git掛載與遠端真身]]
- [[concepts/PWA與儲存配額]]
- [[comparisons/工坊架構該上與不該上]]
- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
