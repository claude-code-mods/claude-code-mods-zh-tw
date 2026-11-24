---
title: 站內搜尋與Pagefind
created: 2026-08-14
updated: 2026-08-15
type: concept
status: active
tags:
  - wiki
  - concept
  - research
  - tooling
knowledge_class: factual
sources:
  - https://pagefind.app/docs/
  - https://pagefind.app/docs/running-pagefind/
  - https://pagefind.app/docs/indexing/
  - https://pagefind.app/docs/hosting/
  - https://pagefind.app/docs/multilingual/
  - https://typesense.org/docs/
  - https://typesense.org/docs/overview/what-is-typesense.html
  - https://typesense.org/docs/overview/comparison-with-alternatives.html
  - https://www.meilisearch.com/docs/learn/getting_started/what_is_meilisearch
  - https://www.meilisearch.com/docs/resources/self_hosting/overview
  - https://www.meilisearch.com/docs/learn/resources/faq
  - https://github.com/meilisearch/meilisearch/blob/main/README.md
  - https://docsearch.algolia.com/docs/what-is-docsearch
  - https://docsearch.algolia.com/docs/who-can-apply/
  - https://docsearch.algolia.com/docs/docsearch-program
  - https://lucaong.github.io/minisearch/
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
  - concepts/前端架構名詞與取捨.md
---

# 站內搜尋與Pagefind

本頁不是已採用技術，也不改工坊或角色卡棧。檢索日 2026-08-14。賬本樞紐是 [[queries/第二批蒸餾目標]] **B2-Search**（約 12 條採集，本頁收 14 條入口）。文件站生成器見 B2-Docs / [[10-收件箱/寫回候選/第四批-B4-Docs]]；分面交互見 [[queries/第三批蒸餾目標]] B3-Facet。SSG 產物是 Pagefind 的輸入，見 B3-SSG。

## 一句話定義

站內搜尋是站點自己的檢索麵：使用者在本站查本站內容，不是公網爬蟲。五條常見路是 **構建後靜態索引**（Pagefind）、**自建/託管搜尋引擎**（Typesense、Meilisearch）、**文件站託管爬蟲**（Algolia DocSearch）、**程序內記憶體索引**（MiniSearch）。

## 為什麼重要

文件站和知識庫沒有檢索就只能靠目錄。行業常把五條路併成「裝一個搜尋框」，但合同不同：誰在何時建索引、查詢跑在瀏覽器還是遠端、有沒有配額和徽標義務。靜態站可以零伺服器搜上萬頁；動態目錄、多租戶過濾、語義/對話檢索通常要推文件進一臺搜尋引擎。選錯合同的典型後果是：預覽環境搜不到、上線後索引停在舊構建、或把 DocSearch 免費檔當成任意站點的無限配額。

## 權威入口

檢索 2026-08-14。14 條，不是教程，也不映象全文。B2 採集約 12 條，本表按官方樞紐加厚，未收報價頁、舊爬蟲逐步命令或自建叢集菜譜。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [Pagefind 入門](https://pagefind.app/docs/) | B2-Search 樞紐；構建後索引；無服務端；`--serve` 只是預覽 |
| 2 | [Running Pagefind](https://pagefind.app/docs/running-pagefind/) | `--site` 指向靜態 HTML 輸出；寫出 `pagefind/` 包 |
| 3 | [Configuring the index](https://pagefind.app/docs/indexing/) | `data-pagefind-body` / `ignore`；出現 body 標記則無標記頁不進索引 |
| 4 | [Hosting](https://pagefind.app/docs/hosting/) | 靜態包無需託管配置；CSP 與 Web Worker |
| 5 | [Multilingual](https://pagefind.app/docs/multilingual/) | 按 `lang` 分索引；zh/ja/ko 分詞在 extended |
| 6 | [Typesense 文件](https://typesense.org/docs/) | 總覽 / Guide / 按版本 API |
| 7 | [What is Typesense](https://typesense.org/docs/overview/what-is-typesense.html) | 容錯即時搜；推資料，不爬公網 |
| 8 | [Typesense 對照](https://typesense.org/docs/overview/comparison-with-alternatives.html) | 廠商對照 ES / Algolia / Meilisearch，作主張讀 |
| 9 | [What is Meilisearch](https://www.meilisearch.com/docs/learn/getting_started/what_is_meilisearch) | 推文件；全文 / 語義 / 對話同一 API |
| 10 | [Self-hosting Meilisearch](https://www.meilisearch.com/docs/resources/self_hosting/overview) | 單二進位制；Cloud 推薦；自託管要 master key |
| 11 | [What is DocSearch](https://docsearch.algolia.com/docs/what-is-docsearch) | 爬蟲與 v5 前端兩段；保留徽標 |
| 12 | [Who can apply](https://docsearch.algolia.com/docs/who-can-apply/) | 公開技術文件 / 技術部落格；非技術或未上線常拒 |
| 13 | [DocSearch program](https://docsearch.algolia.com/docs/docsearch-program) | 計劃免費；自建賬號免費檔約 1 萬條記錄 |
| 14 | [MiniSearch](https://lucaong.github.io/minisearch/) | 記憶體倒排；資料須能進程序 |

刻意未收：Elasticsearch 專頁（B2 名單外）、Algolia 商業報價、DocSearch Legacy 自建爬蟲逐步命令、Typesense/Meilisearch 金鑰與叢集操作、成品皮膚。

## 如何運作

**Pagefind** 在靜態生成器**之後**讀已構建 HTML，寫出靜態搜尋包（預設 `public/pagefind`）。瀏覽器按需載入分塊索引；官方稱約 1 萬頁全文字檢索總載荷可低於 300 kB，多數站更接近 100 kB。Pagefind **沒有服務端**；`--serve` 只是索引完後用任意靜態伺服器預覽。1.5.0 起 Component UI（`pagefind-component-ui.js` + `<pagefind-modal>`）取代 Default UI（`pagefind-ui.js` / `PagefindUI`）。`data-pagefind-body` 一旦在站內出現，沒有該屬性的頁面不再進索引。多語言看 `<html lang>`；中日韓分詞在 extended 發行（`npx pagefind` 預設）。託管頁寫：包已自壓縮，不必伺服器 gzip；嚴格 CSP 常要 `script-src 'wasm-unsafe-eval'`。

**Typesense / Meilisearch** 是常駐搜尋引擎：你把已有文件 **推入** 索引，再經 REST 做即時、容錯檢索。Typesense 寫明：它不像 Google 去爬公網，也不等於公網搜尋引擎。兩者都提供 Cloud 與自託管；Meilisearch 文件稱單二進位制、無外部依賴，Cloud 為推薦路徑，自託管要反代 HTTPS、程序管理器和 master key。Meilisearch 現網還談語義、混合檢索與對話/RAG；那是引擎能力，不是「文件站必須上」。

**DocSearch** 拆成兩段：Algolia Crawler 抽文件進 Algolia 索引；DocSearch v5 前端查該索引。爬蟲配置與前端包版本獨立。免費計劃面向**公開**技術文件與技術部落格，條件是結果旁保留 “Search by Algolia”。

**MiniSearch** 是瀏覽器/Node 記憶體全文引擎：字首、模糊、欄位加權、自動建議；資料必須能放進程序記憶體。適合客戶端即搜，不適合當全站伺服器。

### 靜態索引 vs 託管搜尋

一邊是構建產物裡的靜態包或記憶體倒排，查詢不經過你的搜尋程序（Pagefind、MiniSearch）。另一邊是執行中的引擎或 Algolia，查詢打遠端（Typesense、Meilisearch、DocSearch）。兩邊都留；不要併成一種「站內搜尋」。

## 必須保留的衝突

- **靜態索引 vs 託管搜尋。** Pagefind / MiniSearch：查詢在瀏覽器（或本程序），無搜尋伺服器。Typesense / Meilisearch / DocSearch：查詢打執行中的引擎或 Algolia。頻寬、新鮮度、過濾、配額合同不同；不能併成一種方案。
- **DocSearch 與 Algolia 配額不是同一合同。** 計劃頁寫：DocSearch program **免費**，交換條件是保留徽標。不能展示徽標、或要索引非文件頁時，自建 Algolia 應用；「Depending on the size of your documentation, you might need a paid plan. Free plans can hold up to 10,000 records。」不要把計劃免費讀成自建賬號無限量，也不要把 1 萬條記錄帽套回已入選的 DocSearch 應用（計劃頁未把該數字寫進 program 本身）。
- **Pagefind 預設是構建時索引。** 入門頁：先出靜態 HTML，再索引輸出目錄；開發伺服器未索引則沒有搜尋。生產必須在每次構建之後、部署之前再跑一遍。Node API 可索引非靜態內容，是例外入口，不覆蓋 CLI 預設。
- **Meilisearch 高可用說法分叉。** Typesense 對照：CE 單節點，複製要 Cloud 或 EE，且寫節點無自動選舉。Meilisearch 自託管/FAQ：自託管是 MIT CE、Cloud 為推薦，未在這兩頁複述 Raft。兩邊都留；不以廠商對照覆蓋對方文件。
- **許可雙軌。** Meilisearch 倉庫 SPDX 寫 `MIT AND BUSL-1.1`；README 把 CE 標 MIT、EE 標 BUSL/商業協議。不要寫成「整個 Meilisearch 都是 MIT」。
- **對映 ≠ 採用。** 文件站可以談搜尋島，不等於本倉或角色卡已上搜索。

## 例子

- 正例：SSG 文件站在 CI 裡 `build` 之後跑 `pagefind --site <out>`，把 `pagefind/` 一併釋出。
- 正例：商品/多租戶目錄把記錄推入 Typesense 或 Meilisearch，過濾和排序在查詢時改。
- 正例：公開技術文件申請 DocSearch，結果旁留 Algolia 徽標。
- 正例：開局頁或控制中心裡的小清單用 MiniSearch 在客戶端濾，不另開搜尋服務。
- 反例：只跑 `hugo serve` / 開發預覽，不索引輸出目錄，就寫「Pagefind 壞了」。
- 反例：把 DocSearch 免費計劃套到登入牆後的整站電商，或去掉徽標仍當免費檔。
- 反例：因本頁出現某引擎就寫進 recipe / 髮卡依賴。

## 邊界與易混概念

- 不包括：接入逐步實現、金鑰輪換、爬蟲繞過登入牆、攻擊檢索介面、盜版語料、成品搜尋皮膚。
- 站內搜尋 ≠ 公網搜尋引擎。Typesense 原文就把這兩者拆開。
- Pagefind ≠ 即時索引。預設合同是**構建後**讀 HTML；Node/Python API 可索引非 HTML，那是另一條入口，不是 `npx pagefind --site` 的預設。
- DocSearch ≠ 「Algolia 任意站點免費」。計劃只爬公開技術文件/部落格；去徽標或擴到非文件頁要自建應用，用量另計。
- MiniSearch ≠ 靜態站搜尋包。它不掃 `public/`，你自己 `addAll`。
- 分面（B3-Facet）是篩選互動；本頁是索引與查詢落在哪。
- 文件站生成器（B2-Docs）出 HTML；搜尋引擎另選，不互相替代。

## 對映到本倉庫

對映放最後，不當過濾器。行業句對獨立文件站 / 工坊站仍成立。

[[concepts/前端架構名詞與取捨]] 正例寫過「文件站 SSG + 搜尋島」。那是行業拼法，**不是**本倉已裝 Pagefind。卡 iframe、狀態列、blob 真身沒有「構建輸出目錄」這層合同，見 [[concepts/酒館宿主與iframe分層]]、[[concepts/git掛載與遠端真身]]。

因此：

1. **卡 iframe 不是文件站。** 不要把 Pagefind 構建後索引或 DocSearch 爬蟲寫成狀態列 / 控制中心的執行時依賴。
2. 獨立工坊站或專案文件**可以**談這五條路；那是頂層站點合同，不是「本倉已上搜索」。
3. 小清單客戶端濾可以用 MiniSearch 這類記憶體引擎做概念對照，仍不等於已採用。
4. 分面、SSG、文件寫法框架不在本頁重蒸。

本頁不寫「已採用 Pagefind / Typesense / Meilisearch / DocSearch / MiniSearch」。

## 來源與證據

- Pagefind 無服務端、構建後索引、`hugo serve` 看不到結果：入門頁與 Running 頁 2026-08-14 直讀。1.5.0 Component UI 取代 Default UI：各文件頁頂欄。
- Typesense 推資料、不爬公網：What is Typesense。對照頁是廠商主張，不作第三方審計。
- Meilisearch 單二進位制 / Cloud 推薦：自託管總覽與 FAQ。CE MIT、EE 含分片等且生產要用商業協議：其 GitHub README / LICENSE；Typesense 對照另稱 CE 單節點、高可用走 Cloud/EE，兩邊都留。
- DocSearch 兩段架構、資格、徽標、自建賬號「Free plans can hold up to 10,000 records」：What is / Who can apply / program 三頁。
- MiniSearch 記憶體與離線：官方站 Use case。
- 賬本：[[queries/第二批蒸餾目標]] B2-Search；重疊 [[queries/第二批蒸餾目標]] B2-Docs、[[queries/第三批蒸餾目標]] B3-SSG、B3-Facet；文件站加厚見 [[10-收件箱/寫回候選/第四批-B4-Docs]]。

已知衝突見上節，不靜默覆蓋。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[concepts/前端架構名詞與取捨]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/git掛載與遠端真身]]
- [[concepts/開局頁路徑]]
- [[concepts/控制中心與狀態列]]
- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
- [[10-收件箱/寫回候選/第四批-B4-Docs]]
