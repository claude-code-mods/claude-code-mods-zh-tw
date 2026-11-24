---
title: TanStack查詢與路由
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
  - https://tanstack.com/
  - https://tanstack.com/llms.txt
  - https://tanstack.com/query/latest
  - https://tanstack.com/query/latest/docs/framework/react/overview
  - https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
  - https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state
  - https://raw.githubusercontent.com/TanStack/query/main/LICENSE
  - https://tanstack.com/router/latest
  - https://tanstack.com/router/latest/docs/framework/react/overview
  - https://tanstack.com/router/latest/docs/comparison
  - https://tanstack.com/router/latest/docs/how-to/migrate-from-react-router
  - https://raw.githubusercontent.com/TanStack/router/main/LICENSE
  - queries/第五批蒸餾目標.md
  - queries/第三批蒸餾目標.md
  - concepts/前端架構名詞與取捨.md
  - concepts/邊緣快取與SWR.md
  - concepts/虛擬列表.md
  - concepts/HTTP合同與問題詳情.md
knowledge_class: factual
---

# TanStack查詢與路由

本頁不是已採用前端棧，也不是工坊或酒館卡必須換棧的工單。檢索時間：2026-08-14。賬本樞紐是 [[queries/第五批蒸餾目標]] 的 **B5-TanStack**；分路原稿仍在 [[10-收件箱/寫回候選/第五批-B5-TanStack]]。只談公開文件與許可，不寫攻擊步驟或憑證。本頁只蒸 **Query** 與 **Router**。Form / Table 只當鄰接邊界；Virtual 只回指 [[concepts/虛擬列表]]。

## 一句話定義

TanStack Query 管的是**遠端共享狀態的客戶端副本生命週期**（抓取、快取、同步、更新），不是通用 HTTP 快取，也不是 Redux / MobX / Zustand 的替代。TanStack Router 把**路由樹當應用合同**、把 URL 當狀態管理器；它不是 React Router 7。

## 為什麼重要

列表、詳情、許可權這類資料：遠端持久、非同步到達、多人共有、別人能改、本地副本會過期。把它們塞進全域性 store，等於手寫快取接線。Query 把這套接線收走，本地 theme / sidebar 仍可留 store。路由側：篩選、頁碼、深鏈該進 URL，不該只活在記憶體。Router 用型別化路由樹和 search schema 把 URL 變成合同，而不是字串桶。工坊與酒館卡都還沒裝這兩件；本頁只拆名詞，不選型。

## 權威入口

下列 **12** 條是 B5-TanStack 在 2026-08-14 直讀過的官方頁，不是映象。Form / Table / Virtual 入口不在本表展開。B5-TanStack 採集行不在本頁映象。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [tanstack.com](https://tanstack.com/) | 棧根；現網寫 MIT、**paid tiers none** |
| 2 | [llms.txt](https://tanstack.com/llms.txt) | 代理索引；仍列舊包名 `react-location` |
| 3 | [Query 產品頁](https://tanstack.com/query/latest) | **v5 Latest**；「server-state standard」；舊名 React Query |
| 4 | [Query 概述](https://tanstack.com/query/latest/docs/framework/react/overview) | 抓取 / 快取 / 同步 / 更新 **server state** |
| 5 | [Query 預設值](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults) | 預設視快取為 stale；無觀察者 5 分鐘 `gcTime` |
| 6 | [Query 是否替代客戶端狀態](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state) | **不替代** Redux / MobX / Zustand |
| 7 | [Query LICENSE](https://raw.githubusercontent.com/TanStack/query/main/LICENSE) | MIT；Copyright 2021-present Tanner Linsley |
| 8 | [Router 產品頁](https://tanstack.com/router/latest) | 路由樹是應用合同；現網 React + Solid |
| 9 | [Router 概述](https://tanstack.com/router/latest/docs/framework/react/overview) | 自帶輕量 SWR 快取；鬆散基於 Query |
| 10 | [Router 對照](https://tanstack.com/router/latest/docs/comparison) | 與 **React Router DOM**、Next.js 分列 |
| 11 | [遷出 RR7](https://tanstack.com/router/latest/docs/how-to/migrate-from-react-router) | 卸 `react-router`，換 `@tanstack/react-router` |
| 12 | [Router LICENSE](https://raw.githubusercontent.com/TanStack/router/main/LICENSE) | MIT；Copyright 2021-present Tanner Linsley |

上表 **12** 條。

## 如何運作

### Query：副本生命週期，不是通用快取

官方對 server state 的定義是：遠端持久、走非同步 API、共享所有權、別人能改、客戶端副本會過期。產品頁同時寫「server-state standard」和「gives async data a cache, a lifecycle」。兩邊都留：它**有**快取，但快取物件是這份會過期的遠端副本，不是「通用 HTTP 快取層」。

[Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)：`useQuery` 預設把快取當 **stale**。`staleTime: Infinity` 仍可被 `invalidateQueries` 打髒；`'static'` 連手動失效也不觸發重抓。無觀察者後預設 **5 分鐘** `gcTime`。失敗預設靜默重試 3 次再進 UI。

[Does this replace client state](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state) 短答：它替換的是客戶端裡那套非同步快取接線，**不是**本地 / 客戶端狀態管理器。Redux / MobX / Zustand 也能硬存非同步資料，但更笨。theme、sidebar 仍可留全域性 store。[[concepts/前端架構名詞與取捨]] 已按此分層，不是本頁新發現。細粒度讀時訂閱見 [[concepts/Signals與TC39]]，那是客戶端原語，不是這份會過期的遠端副本。

### Router：路由樹是合同，不是 RR7

[產品頁](https://tanstack.com/router/latest)：「The route tree is the application contract。」URL 是狀態管理器。框架面現網是 **React 與 Solid**。要用伺服器時加 Start，**同一棵路由樹**；Start 不是本頁主條。

[概述](https://tanstack.com/router/latest/docs/framework/react/overview)：自帶 loader 的輕量 SWR 快取，**鬆散基於 Query，面更小**；並設計去接 Query / SWR / Apollo。致謝寫明站在 Remix 等肩上，這是譜系，不是同一合同。`llms.txt` 仍列 `react-location`；現網安裝與遷移頁寫的是 `@tanstack/react-router`，舊名不當現包。

[對照表](https://tanstack.com/router/latest/docs/comparison) 三列：TanStack Router / Start · **React Router DOM** · Next.js。Search Param Schema Validation：TanStack ✅，React Router 🛑。SWR Loader Caching：TanStack ✅，React Router 🛑。檔案路由兩邊都有，不是同一套生成物。search 欄位形狀若要對照文件約束，見 [[concepts/JSON Schema與Protobuf]]；那是 schema 方言，不是 Router 自己的路由樹合同。

[遷出 RR7](https://tanstack.com/router/latest/docs/how-to/migrate-from-react-router) 標題就是 *Migrate from React Router v7*：卸 `react-router`、換 `@tanstack/react-router`、另生 `routeTree.gen.ts`。RR7 的 `action` 在該頁寫成「通常用 mutation 或表單庫」，不是對等 API。B3-Meta 已寫：Remix 一名兩物，v2 繼任是 RR7。詞彙像（loader / 檔案路由），合同不是一份。

### 鄰接件只記邊界

- Form：產品頁仍標 **v1 Latest**；2026-08-06 有 v2 alpha。**不要把 Latest 寫成 v2**。B2-Form 是 APG / combobox，不是本庫。
- Table：**v9 Latest**（2026-08-04 stable）；無頭引擎不是 AG Grid。舊 `/docs/introduction` 本波 404。無頭控制元件的根節點心智見 [[concepts/無頭元件與根節點]]。
- Virtual：只回指 [[concepts/虛擬列表]]（B3-Virt；座標器不是元件）。本頁不重開。

許可：根站口徑全家 MIT、無付費檔。Query / Router 版權年都是 2021-present。同 SPDX 仍按倉分條。`query.gg` 是付費課，不是 SPDX。文件站點正文沒有另標 CC，本頁不發明第二份文件許可。

## 必須保留的衝突

- **Query 快取 vs 伺服器狀態**：官方定義的是遠端共享狀態的客戶端副本生命週期（stale / 後臺重抓 / `gcTime`），不是通用快取，也不是 Redux 替代。兩邊都留，不要併成「Query = 快取」或「Query 沒有快取」。
- **Router ≠ RR7**：官方對照表分列；官方遷移頁是 *from React Router v7*。loader / 檔案路由詞彙相近，search 校驗、路由樹生成、action 面不是同一合同。
- Router 自帶快取 **≠** Query 快取。概述寫明前者面更小、鬆散基於後者。
- Router 的「SWR」≠ RFC 5861 的 `stale-while-revalidate`，也 ≠ Vercel `useSWR`。HTTP 那一層見 [[concepts/邊緣快取與SWR]]。
- Form：**v1 Latest** 與 **v2 alpha** 並存。
- Table V9 已 stable；`/docs/introduction` 死。Virtual 已在 [[concepts/虛擬列表]]。
- `react-location` 是舊名，不是現包 `@tanstack/react-router`。
- [[concepts/前端架構名詞與取捨]] 已引 Query 做服務端狀態對映，不是已採用 `@tanstack/react-query`。

## 例子

- 正例：把「別人會改、重新整理還要在」的列表 / 詳情交給 Query；modal 開合、當前 tab 留本地 UI state。
- 正例：篩選和頁碼進 Router 的 search schema，不只寫在記憶體。
- 正例：從 RR7 遷出時另生 `routeTree.gen.ts`，不要假定 `action` 一對一還能用。
- 反例：用 Query 替代 Redux / Zustand，把 theme、sidebar 也塞進 query cache。
- 反例：把 Query 寫成通用 HTTP 快取或 CDN `Cache-Control`。
- 反例：把 TanStack Router 與 React Router 7 當成同一合同，或把 Remix 譜系寫成同一份 API。
- 反例：把 Router loader 的輕量 SWR 快取寫成已經裝了 Query。
- 反例：把本倉庫或酒館卡寫成「已採用 TanStack」。

## 邊界與易混概念

- 不包括：Start / DB / Store / AI / Charts / Pacer 當本頁主條。
- 不包括：Form / Table 的完整版本面（只記 Latest ≠ alpha、無頭 ≠ AG Grid）。
- 不包括：攻擊與快取投毒步驟、query.gg 付費課、成品皮膚、卡 JSON/PNG。
- 不包括：把 Query 當卡變數心智。卡變數仍以 [[concepts/MVU變數閉環]] 為準。
- 不包括：把 Query 寫成超媒體客戶端。伺服器繼續出 HTML 的那條見 [[concepts/HTMX與超媒體]]。
- 易混：聽到「快取」就以為是 HTTP / CDN / [[concepts/PWA與儲存配額]] 的 Cache API。
- 易混：聽到「SWR」就以為 Router、`useSWR` 和 RFC 5861 是同一個旋鈕。
- 易混：檔案路由兩邊都有，就當成生成物相同。

## 對映到本倉庫

[[concepts/前端架構名詞與取捨]] 已把「服務端狀態 / Query」與本地 UI state、全域性 store 分開。那是分層，不是安裝面。酒館卡 iframe 無 Query / Router 安裝面，見 [[concepts/酒館宿主與iframe分層]]。超媒體路徑（伺服器繼續出 HTML）見 [[concepts/HTMX與超媒體]]，不要和 Query 的 JSON 客戶端副本併成一條。工坊獨立站若以後要選型，仍須另核許可與相容，不能從本頁升格成「已採用」。Gateway 同步 REST 的錯誤體仍歸 [[concepts/HTTP合同與問題詳情]]；操作清單若以後要生成客戶端，見 [[concepts/OpenAPI與Arazzo]]。

## 來源與證據

- Query 定義與預設值：產品頁、概述、Important Defaults、Does this replace client-state（2026-08-14 直讀，見 B5）。
- Router 合同與 RR7 分列：產品頁、概述、comparison、migrate-from-react-router。
- 許可：兩倉 raw `LICENSE`；根站 MIT、無付費檔。
- 查詢賬本：[[queries/第五批蒸餾目標]] B5-TanStack；Virtual 回指 [[concepts/虛擬列表]] / [[queries/第三批蒸餾目標]] B3-Virt。分路原稿仍在 [[10-收件箱/寫回候選/第五批-B5-TanStack]]。
- 狀態分層已有頁：[[concepts/前端架構名詞與取捨]]。

已知衝突見上節，不靜默覆蓋。某次安裝是否真的帶了 Query 或 Router：以該專案 lockfile 為準，標未知。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區
- [ ] 同步 `index.md` 與 `log.md`（本波不改）

## 相關內容

- [[concepts/前端架構名詞與取捨]]
- [[concepts/MVU變數閉環]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/邊緣快取與SWR]]
- [[concepts/虛擬列表]]
- [[concepts/HTMX與超媒體]]
- [[concepts/Signals與TC39]]
- [[concepts/PWA與儲存配額]]
- [[concepts/JSON Schema與Protobuf]]
- [[concepts/OpenAPI與Arazzo]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/無頭元件與根節點]]
- [[queries/第五批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
- [[10-收件箱/寫回候選/第五批-B5-TanStack]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/工坊架構該上與不該上]]
