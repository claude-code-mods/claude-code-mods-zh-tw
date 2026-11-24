---
title: Feed與Schema.org
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
  - https://schema.org/
  - https://schema.org/docs/releases.html
  - https://www.w3.org/TR/json-ld11/
  - https://ogp.me/
  - https://www.dublincore.org/specifications/dublin-core/dcmi-terms/
  - https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
  - https://www.rssboard.org/rss-specification
  - https://www.rfc-editor.org/rfc/rfc4287.html
  - https://www.jsonfeed.org/version/1.1/
  - https://www.w3.org/TR/activitypub/
  - https://www.w3.org/TR/webmention/
  - https://atproto.com/specs/atp
  - https://datatracker.ietf.org/doc/charter-ietf-atp/
  - queries/第三批蒸餾目標.md
  - concepts/HTTP合同與問題詳情.md
  - concepts/JSON Schema與Protobuf.md
knowledge_class: factual
---

# Feed與Schema.org

本頁不是已採用技術，也不是工坊或角色卡必須上結構化資料、社交預覽或訂閱源的工單。檢索時間：2026-08-14。賬本樞紐是 [[queries/第三批蒸餾目標]] **B3-Semweb**、**B3-Feed**。只談公開詞表、編碼與聯合協議，不寫黑帽 SEO、賬號劫持或 exploit。

## 一句話定義

Schema.org 是網頁結構化資料的**共享詞表**；Feed 是內容更新的**聯合格式或社交投遞協議**。詞表告訴機器「這頁是什麼」，源告訴機器「後來又出了什麼」。兩者都不是 JSON Schema，也不是搜尋引擎的行為規範。

## 為什麼重要

卡片預覽、富摘要、訂閱源、聯邦社交常被併成「SEO / 開放圖譜」一詞。實際至少四層：詞表、編碼、平臺消費規則、聯合/投遞協議。層混了，就會把 schema.org 當 Google 真源，或把已死的 X Cards 當現行規範。

## 權威入口

檢索時間：2026-08-14。下表 **13** 條。B3-Semweb 原 13 行、B3-Feed 原 16 行不在本頁映象。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [schema.org](https://schema.org/) | 詞表真身。頁尾 **V30.0**（2026-03-19），CC BY-SA 3.0。編碼可用 JSON-LD / Microdata / RDFa。首頁可帶 development 橫幅，**釋出釘仍看 releases**。 |
| 2 | [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/) | W3C Rec 2020-07-16；廢止 1.0。是編碼，不是詞表。`/TR/json-ld/` 同文。 |
| 3 | [Open Graph Protocol](https://ogp.me/) | 社交圖物件協議。必填 `og:title` / `og:type` / `og:image` / `og:url`。OWF 0.9。靈感含 Dublin Core、canonical、微格式、RDFa。 |
| 4 | [X Cards 歷史概述](https://developer.x.com/docs/x-for-websites/cards/overview/abouts-cards) | **官方正文已死**。採集：307 到 `docs.x.com`，等價路徑 404，校驗器 307 到登入。本輪直抓 **403**。勿當現行規範。 |
| 5 | [DCMI Metadata Terms](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/) | 現行詞表，2020-01-20。鼓勵 `dcterms:`；舊 `dc:` 無限期留。ISO 15836 付費，本庫不收。 |
| 6 | [Google 結構化資料導論](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) | Search **行為**真源。明文：Search 以該文為準，不以 schema.org 為準。推薦 JSON-LD，也認 Microdata / RDFa。 |
| 7 | [RSS 2.0 Specification](https://www.rssboard.org/rss-specification) | 現行 **2.0.11**（2009-03-30）。功能凍結在 2.0.1，後續只澄清。CC BY-SA。董事會維護，**不是** IETF/W3C Rec。 |
| 8 | [RFC 4287 Atom](https://www.rfc-editor.org/rfc/rfc4287.html) | 2005-12，Atom **讀源**格式。寫源是 [RFC 5023 AtomPub](https://www.rfc-editor.org/rfc/rfc5023.html)，不是同一份。 |
| 9 | [JSON Feed 1.1](https://www.jsonfeed.org/version/1.1/) | 2020-08-07。`version` 用該 URL。MIME 應 `application/feed+json`，發現時可回退 `application/json`。社群規範，無 SPDX。 |
| 10 | [ActivityPub](https://www.w3.org/TR/activitypub/) | W3C Rec 2018-01-23。C2S + S2S；資料層是 [AS2 Core](https://www.w3.org/TR/activitystreams-core/) / [Vocabulary](https://www.w3.org/TR/activitystreams-vocabulary/)（2017-05-23）。TR 凍結，勘誤在 wiki/ED。 |
| 11 | [Webmention](https://www.w3.org/TR/webmention/) | W3C Rec 2017-01-12。連結通知，**不是**訂閱源格式。 |
| 12 | [AT Protocol 規範](https://atproto.com/specs/atp) | 現行實現真源。PDS / Relay / App View。文內仍寫「計劃交 IETF」。 |
| 13 | [IETF ATP 章程](https://datatracker.ietf.org/doc/charter-ietf-atp/) | 工作組 **2026-03-19 已批**、Active。尚無 RFC。倉庫稿 [draft-holmgren-at-repository](https://datatracker.ietf.org/doc/html/draft-holmgren-at-repository-02) 是 I-D，勿當 RFC。 |

舊文 [Harvard RSS 2.0](https://cyber.harvard.edu/rss/rss.html) 仍活但停在 **2.0.1**，勿當現行。sitemap / robots 歸 [[queries/第三批蒸餾目標]] B3-SEO，不在本表。

## 如何運作

### 詞表、編碼、消費方

Schema.org 只定型別和屬性（`Thing` → `CreativeWork` / `Person` 等）。怎麼寫進 HTML 是另一層：JSON-LD 指令碼、Microdata 屬性、或 RDFa。`@context` 常見仍寫 `http://schema.org/`；站點 https 也能開，兩寫都要收。形狀合同是另一族，見 [[concepts/JSON Schema與Protobuf]]；不要把詞表型別寫成 `$schema`。

V30.0 加了 GS1、Dublin Core、Open Graph 的**等價標註**。這表示詞表可對齊，不表示 Facebook / X / Google 會按同一規則消費。

Open Graph 用 `meta property` 把頁面變成圖物件。四必填缺一，物件就不完整。結構化子屬性（`og:image:width` 等）必須跟在對應根標籤後面；再出現一個根標籤，上一組就結束。`og:image` 的編碼與 MIME 見 [[concepts/媒體格式與編解碼]]，靜圖合同見 [[concepts/JPEG XL與HDR靜圖]]，不在本頁展開。

Google Search 用這些標記做富結果資格，但**必填/推薦欄位以 Search 文件為準**。schema.org 上多出來的屬性，對 Google 可以無意義。站內檢索是另一條，見 [[concepts/站內搜尋與Pagefind]]，不要和富結果併成「一種搜尋標記」。

X / Twitter Cards 曾用 `twitter:card` 等。2026-08-14：**沒有可引用的第一方正文**。歷史實現不能升格為現行規範。

Dublin Core 是更老的書目詞表。ogp.me 自稱受它啟發；Schema.org 30.0 給了等價標註。ISO 15836 是付費快照，本庫只記 DCMI 網頁。

### 聯合源：RSS / Atom / JSON Feed

三者都是「頻道 + 條目」的拉模型。

RSS 2.0：根 `rss version="2.0"`，下一個 `channel`。頻道必填 `title` / `link` / `description`。`item` 元素全可選，但至少要有 `title` 或 `description`。日期跟 RFC 822（年四位更好）。擴充套件必須進名稱空間；核心元素自己不進名稱空間，為了相容 0.91/0.92。規範路線圖寫明：格式凍結，新能力走模組或新格式。

Atom：IETF 讀源。有名稱空間、必填 `id` / `updated` 等，比 RSS 嚴。AtomPub（5023）是用 HTTP 寫 Atom 資源，不是閱讀器解析的那份格式。完整/分頁/歸檔源另見 RFC 5005。

JSON Feed 1.1：頂層 `version` + `title` + `items[]`。條目用 `id`；正文可以是 `content_text` 或 `content_html`。1.1 把單數 `author` 換成 `authors` 陣列，舊欄位永遠合法，讀端優先 `authors`。

推送不是源格式。[WebSub](https://www.w3.org/TR/websub/)（原 PubSubHubbub）是訂閱通知；2018 Rec，2026-06-02 只改安全考慮。RSS 自己的 `cloud` 是更老的輕量 pub-sub，不要和 WebSub 併成一詞。瀏覽器把加密報文投到 Service Worker 的那條，見 [[concepts/Web Push與角標]]，也不是 Feed。原始檔若被 CDN 快取，那是 [[concepts/邊緣快取與SWR]]，不是聯合格式。PWA 可以快取或離線開啟源頁，見 [[concepts/PWA與儲存配額]]，那是安裝與配額，不是 RSS/Atom 本身。

指標拉取也是拉模型，但名稱空間完全不同：Prometheus 抓的是樣本，見 [[concepts/Prometheus與OpenMetrics]]；遙測訊號見 [[concepts/可觀測與OpenTelemetry]]。兩者都不是內容訂閱源。

### 社交投遞：ActivityPub 與 AT Protocol

ActivityPub：每個 actor 有 `inbox` / `outbox`。可以只做 C2S、只做 S2S，或都做。投的是 ActivityStreams 2.0 JSON，不是 RSS 條目。超媒體 UI 往返見 [[concepts/HTMX與超媒體]]，不要和 inbox/outbox 併成一種「開放網頁」。

AT Protocol：身份在 DID，內容在可驗證倉庫，網路側是 PDS + Relay（舊文常寫 BGS）+ App View。應用約定在 Lexicon / NSID，不在核心協議裡寫關注或頭像。官網「計劃交 IETF」與 IETF ATP 組已成立**同時為真**；組已批 ≠ 已有 RFC。

Webmention：你的頁鏈到對方時，發一條通知。它不提供條目列表，也不能替代 Feed。

## 必須保留的衝突

- X Cards **官方正文已死**（307 / 404 / 本輪 403）。無第一方現行規範。
- Google Search **不以** schema.org 為 Search 行為真源。
- Schema.org 30.0 已給 DC / OG 做等價標註；ogp.me 自稱靈感來自 DC。詞表可對齊，平臺消費規則各寫各的。
- schema.org 首頁可帶 development 橫幅；現行釋出仍是 V30.0。
- Harvard RSS 停在 2.0.1；現行是 rssboard **2.0.11**。
- AT Protocol 官網仍寫「計劃交 IETF」；IETF ATP 組 2026-03-19 已批。尚無 RFC；I-D 勿當 RFC。
- Schema.org ≠ JSON Schema。形狀合同見 [[concepts/JSON Schema與Protobuf]]；HTTP 錯誤體見 [[concepts/HTTP合同與問題詳情]]。
- Atom ≠ AtomPub。讀源 vs 寫協議。
- ActivityPub ≠ AT Protocol。W3C Rec vs 廠商規範 + 已批未出 RFC 的 IETF 組。
- Webmention ≠ Feed。通知 vs 源。
- RSS Advisory Board 文字不是 IETF/W3C Rec；功能凍結。
- sitemap / `changefreq` 歸 [[queries/第三批蒸餾目標]] B3-SEO，不在本頁。
- ISO 15836 付費，不收。
- 本頁對映的是「公告可否聯合、頁面可否被機器讀型別」；**不是**「工坊或卡必須上 Schema.org / Feed」。

## 例子

- 正例：文章頁 JSON-LD `@type: Article`，另加 OG 四必填；Google 資格另對 Search 文件，不把 schema.org 全屬性當必填。
- 正例：更新列表發 RSS 2.0.11 或 Atom 或 JSON Feed 1.1；閱讀器拉源，不假裝這是 ActivityPub。
- 正例：聯邦社交用 ActivityPub inbox/outbox；AT 網用倉庫 + Relay。兩套並存，不寫成「開放社交只有一種」。
- 反例：把 X Cards 舊部落格或第三方備忘當現行規範。
- 反例：把 Harvard `rss.html` 或「RSS 2.0.1 已凍結」寫成現行入口，丟掉 2.0.11。
- 反例：把 Schema.org 寫成 JSON Schema，或把 Google 富結果失敗怪罪「詞表版本不是 30.0」。
- 反例：把 Webmention、WebSub、Web Push 或 Prometheus 抓取當成一種 RSS。

## 邊界與易混概念

- 不包括：黑帽 SEO、sitemap/robots 細則、工坊 Gateway 欄位、憑證、攻擊步驟。
- Schema.org 詞表 ≠ JSON-LD 語法 ≠ Google 富結果規則 ≠ OG 預覽 ≠ 已死的 X Cards。
- Feed 格式 ≠ 推送（WebSub / RSS `cloud`）≠ 瀏覽器推送（[[concepts/Web Push與角標]]）≠ 連結通知（Webmention）≠ 聯邦協議。
- 指標拉取 ≠ 內容源。Prometheus 與 OpenTelemetry 各管樣本和訊號，見上兩頁，不要和 RSS/Atom 併成「一種 pull」。
- h-entry / h-event 是微格式，日曆真源是 iCalendar（[[queries/第三批蒸餾目標]] B3-Cal），不要和本頁詞表併成一套。
- CloudEvents 是事件信封，見 [[concepts/GraphQL與非同步事件合同]]，不是訂閱源。
- 若用 HTTP 暴露「列出更新」的機器介面，操作清單走 [[concepts/OpenAPI與Arazzo]]，錯誤體走 [[concepts/HTTP合同與問題詳情]]，那不是 Schema.org，也不是 RSS。
- 易混：聽到「結構化資料」就以為一份 schema.org 能同時滿足搜尋、Facebook、X。

## 對映到本倉庫

卡執行時**未採用** Schema.org / OG / Feed / ActivityPub / AT Protocol。訊息樓、開局頁、控制中心仍走現有宿主與 MVU，見 [[concepts/角色卡技術路徑總圖]]。工坊主路徑仍是同步 REST，見 [[concepts/後端架構名詞與工坊對照]]。

若工坊或專案站要發更新列表，行業側可對映 RSS / Atom / JSON Feed，選一種並釘 MIME 與發現連結。這是「公告可聯合」，不是「卡必須出源」。聯邦社交與 Webmention 只作概念對照。產品落點見 [[comparisons/工坊架構該上與不該上]]；渲染/SEO 心智見 [[concepts/前端架構名詞與取捨]]。

本 Vault 不收 ISO 15836 全文，不把已死 X Cards 路徑寫進正式入口。

## 來源與證據

- Schema.org V30.0 與 DC/OG 等價標註：[schema.org](https://schema.org/) 頁尾；[releases](https://schema.org/docs/releases.html) 30.0 行（PR #4689 等）。
- JSON-LD 1.1 廢止 1.0：Rec 文首 Status。
- OG 四必填與靈感來源：[ogp.me](https://ogp.me/) Introduction / Basic Metadata / 頁尾。
- X Cards 正文已死：B3-Semweb 採集（307/404）；本輪 `developer.x.com/.../abouts-cards` → 403。
- Search 不以 schema.org 為準：Google 導論 “Structured data vocabulary and format” 段。
- DCMI 現行與 `dcterms:`：Terms 頁 Date Issued 2020-01-20 與 Introduction。
- RSS 2.0.11：rssboard 文首 Editor's Note 與 Roadmap 凍結句。
- Atom 讀源：RFC 4287 文首。
- JSON Feed 1.1 與 MIME：規範頁 Version 1.1 — 8/7/2020。
- ActivityPub 兩層：Rec Abstract / Overview。
- Webmention 是通知：Rec Abstract。
- ATP 組已批、官網仍寫計劃交 IETF：datatracker 章程 2026-03-19 Approved；[atproto specs](https://atproto.com/specs/atp) “What is Missing?”。

賬本：[[queries/第三批蒸餾目標]] B3-Semweb、B3-Feed。已知衝突見上節，不靜默覆蓋。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[queries/第三批蒸餾目標]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/JSON Schema與Protobuf]]
- [[concepts/OpenAPI與Arazzo]]
- [[concepts/GraphQL與非同步事件合同]]
- [[concepts/前端架構名詞與取捨]]
- [[concepts/後端架構名詞與工坊對照]]
- [[concepts/站內搜尋與Pagefind]]
- [[concepts/HTMX與超媒體]]
- [[concepts/邊緣快取與SWR]]
- [[concepts/PWA與儲存配額]]
- [[concepts/JPEG XL與HDR靜圖]]
- [[concepts/Web Push與角標]]
- [[concepts/媒體格式與編解碼]]
- [[concepts/Prometheus與OpenMetrics]]
- [[concepts/可觀測與OpenTelemetry]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
- [[concepts/角色卡技術路徑總圖]]
