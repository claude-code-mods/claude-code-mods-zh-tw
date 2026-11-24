---
title: WinterTC與伺服器JS
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
  - https://wintertc.org/
  - https://wintertc.org/faq
  - https://wintertc.org/work
  - https://www.w3.org/groups/cg/wintercg/
  - https://www.w3.org/community/wintercg/
  - https://www.w3.org/community/wintercg/2025/01/10/goodbye-wintercg-welcome-wintertc/
  - https://ecma-international.org/publications-and-standards/standards/ecma-429/
  - https://min-common-api.proposal.wintertc.org/
  - https://ecma-international.org/wp-content/uploads/ECMA-429_1st_edition_december_2025.pdf
  - https://runtime-keys.proposal.wintertc.org/
  - https://docs.deno.com/api/web/about/
  - https://bun.sh/docs/runtime/web-apis
  - https://nodejs.org/api/globals.html
  - queries/第三批蒸餾目標.md
  - concepts/後端架構名詞與工坊對照.md
knowledge_class: factual
---

# WinterTC與伺服器JS

本頁不是已採用技術，也不是工坊或角色卡換執行時的工單。賬本見 [[queries/第三批蒸餾目標]]（B3-Winter）。檢索日 2026-08-14。只收委員會與執行時合同入口，不收攻擊、CVE 或利用步驟。

## 一句話定義

WinterTC（Ecma TC55）是給**伺服器 / 邊緣上的 JS 執行時**訂最低公共 Web API 面的技術委員會。它不發明一門新語言，也不替代 ECMA-262。現行標準號是 **ECMA-429**（Minimum common web API，2025 快照）。前身 WinterCG 是 W3C 社群組，**不能**發標準。

## 為什麼重要

瀏覽器外的 JS 都在抄 Web API，但抄哪些、哪裡允許偏，過去沒有可引用的最低面。沒有這份合同，`fetch` / `URL` / Streams 在 Node、Deno、邊緣執行時上的「看起來像瀏覽器」只是各自文件。WinterTC 把最低面釘成 Ecma 標準，並把改 Web 規範的需求送回 WHATWG / W3C，而不是另起一份分叉 Fetch。本倉庫工坊與角色卡棧**不因此換執行時**；行業正當性仍保留。

## 權威入口

本輪 WebFetch 核過 [wintertc.org](https://wintertc.org/)：TC55，目標是跨伺服器執行時的 API 互操作，先訂與 Web 共享的 minimum common API，並與 WHATWG / W3C 協作。下列 **13** 條是本頁真源。

| # | 入口 | 釘什麼 |
|---|---|---|
| 1 | [wintertc.org](https://wintertc.org/) | 現行樞紐。WinterTC = Ecma TC55，Technical Committee on Web-interoperable Server Runtimes。 |
| 2 | [WinterTC FAQ](https://wintertc.org/faq) | 目標、不做什麼、與 WinterCG 的關係。本輪正文仍寫「WinterTC 就緒後 WinterCG **將**關閉」——與第 4 條衝突，兩邊留。成員組織寫 Bloomberg / Cloudflare / Deno / Igalia / Node.js。 |
| 3 | [WinterTC Work](https://wintertc.org/work) | Minimum Common API 標 **Standard**；Runtime Keys 標 **Technical Report**；Sockets / Iterable Streams / CLI 標 **Proposal**；Fetch 與 Web Crypto Streams 是向 WHATWG / WICG 收集需求，不是 WinterTC 分叉稿。 |
| 4 | [W3C groups/cg/wintercg](https://www.w3.org/groups/cg/wintercg/) | 「The Web-interoperable Runtimes Community Group was **closed on 3 April 2025**.」工作已轉 Ecma。 |
| 5 | [W3C community/wintercg](https://www.w3.org/community/wintercg/) | 同組社群首頁：「This group was closed on **2025-04-03**.」 |
| 6 | [Goodbye WinterCG, welcome WinterTC](https://www.w3.org/community/wintercg/2025/01/10/goodbye-wintercg-welcome-wintertc/) | 2025-01-10 移交說明。當時仍寫「WinterTC 完全就緒後社群組再關」。 |
| 7 | [ECMA-429 目錄](https://ecma-international.org/publications-and-standards/standards/ecma-429/) | Ecma 出版物頁：2025 快照的 Minimum common web API。 |
| 8 | [min-common-api 可讀站](https://min-common-api.proposal.wintertc.org/) | 本輪頁首仍是 **Draft, 31 July 2026**。同一頁又寫「adopted by the General Assembly of December 2025」。可讀站 ≠ 已摘 Draft 標。 |
| 9 | [ECMA-429 1st ed. PDF](https://ecma-international.org/wp-content/uploads/ECMA-429_1st_edition_december_2025.pdf) | 封面 **1st Edition / December 2025**。大會已過；不要只憑第 8 條的 Draft 標說「還沒透過」。 |
| 10 | [Runtime Keys](https://runtime-keys.proposal.wintertc.org/) | 執行時識別符號技術報告。收錄**不**等於符合 Minimum Common API，也不等於背書。機器源 `runtime-keys.json`；「Published version: To be determined upon Ecma TR publication」。鍵含 `node` / `deno` / `bun` / `workerd` 等。 |
| 11 | [Deno Web Platform APIs](https://docs.deno.com/api/web/about/) | Deno **官方** Web 合同。自稱實現大量 Web Platform API，差異寫在本頁（如 fetch、Cache）。不是 ECMA-429 符合性宣告。 |
| 12 | [Bun Web APIs](https://bun.sh/docs/runtime/web-apis) | Bun **官方** Web 合同。宣告 DOM / History 等瀏覽器面不相關；其餘按類列出部分或完整支援。不是符合性證書。 |
| 13 | [Node.js Global objects](https://nodejs.org/api/globals.html) | Node **官方** 全域性合同（本輪文件頭為 v26.7.0）。列出 Node 自有全域性，並納入 AbortController、`fetch`、WebSocket 等 Web API。規範自己舉例：Node 的 `globalThis` **不是** EventTarget。 |

Deno / Bun / Node 只收到上表合同頁。不收安全通告、漏洞細節或攻擊面清單。

## 如何運作

**兩代組織。** 2022-05 在 W3C 成立 WinterCG（社群組，誰都能參加，但不能發標準）。2024-12 成立 Ecma TC55 / WinterTC。2025-01 公開發移交。W3C 組頁釘 **2025-04-03 已關**。FAQ 本輪仍用將來時，當作過期句子，不要回寫成「還沒關」。

**ECMA-429 管什麼。** 2025 快照：從 W3C / WHATWG 裡抽出一份**最低**公共面，給想跟 Web 互操作的伺服器執行時。符合實現必須按對應 Web 規範提供所列介面與屬性，並符合 ECMA-262。可以多實現未列入的 Web API。擴充套件不得讓規範行為不合規。年更是委員會意向，不是本頁已見到的第二版。

**最低面在哪一層。** 索引要求 `globalThis` 上出現 DOM 的 AbortController / EventTarget、Fetch 的 `fetch` / Request / Response / Headers、URL / URLPattern、Streams、Encoding、File API 的 Blob / File、CompressionStream、Web Crypto、`performance`、WebAssembly 等。Web Workers **不強制**；只有執行時真有 `WorkerGlobalScope` 時才補事件處理器。`FormData` 的 HTML 表單引數不在最低面裡，預設行為有定義，傳入 HTML 元素則本版不規定。

**全域性物件不是 Window。** 規範不要求實現 `Window` / `WorkerGlobalScope` 介面本身，但可把主全域性對映到 Window、把 worker 全域性對映到 WorkerGlobalScope。對不上這些介面的全域性，只能穩妥實現 `[Exposed=*]` 的 API。為避免新全域性砸舊程式碼，允許拿掉 `readonly`，讓使用者刪或覆蓋。Node 被規範點名：異常走 `process` 的 `uncaughtException` / `unhandledRejection`，而不是 `window.onerror`。

**允許的偏離。** 伺服器常沒有 origin，因而會違反 Fetch「給請求加 Origin」的要求；規範要求把偏離和影響寫進執行時文件。預設 `User-Agent` / `navigator.userAgent` 用來識別執行時，應看成不透明整串。

**WinterTC 不另寫 Fetch。** FAQ 與 Work 一致：不 fork 現有 Web 規範；要改 Fetch 或 Web Crypto 流式，把需求送回 WHATWG / WICG。Sockets、CLI、`import.meta` / `navigator` 登記處都還不是 ECMA-429。

**Runtime key ≠ 符合性。** `deno` / `bun` / `node` 在表裡，只說明識別符號已登記。報告寫明：收錄不蘊含符合任何 Ecma 規範（含 Minimum Common API）。

## 行業何時該上

| 合同 | 何時該上 | 不該當成 |
|---|---|---|
| ECMA-429 最低面 | 庫要在多個 Web 互操作執行時上跑同一套 `fetch` / URL / Streams | 「實現了 fetch 就等於符合 429」；瀏覽器 DOM 全集 |
| 各執行時官方合同 | 要用該執行時的超集、偏差、許可權模型 | WinterTC 符合性宣告 |
| Runtime Keys | 配置、條件匯出、檢測要穩定字串 | 符合性、效能排名、背書 |
| Sockets / CLI 提案 | 需要 TCP 或 argv / env 的跨執行時面 | 已進 ECMA-429 |
| 執行時專有 API（`Deno.*` / `Bun.*` / `node:`） | 該執行時上的檔案、程序、許可權 | 最低公共 Web 面 |

## 必須保留的衝突

- ECMA-429 已過 2025-12 大會，可讀站 2026-08-14 仍掛 Draft。目錄頁與 PDF 是已釋出標準一側；`min-common-api.proposal.wintertc.org` 頁首是 Draft 一側。同一可讀頁甚至兩句話並存。
- W3C 寫 WinterCG 2025-04-03 已關；FAQ 與 2025-01 博文仍用「將關閉」。
- Runtime key 有名 ≠ 符合 Minimum Common API。
- FAQ 成員名單與 Keys 表不是同一集合（例如 `bun`）。
- 「工坊現在不換執行時」不是「429 不是正當行業合同」。

## 例子

- 正例：跨 Node / Deno / 邊緣寫可移植庫時，先按 ECMA-429 最低面設計，再開啟第 11–13 條看超集和偏離。
- 正例：要 TCP 或統一 `argv`，去 Work 頁的 Proposal，不把它們寫進「429 已標準化」。
- 反例：看見可讀站頁首 Draft，就說大會還沒過；或看見 PDF 的 December 2025，就說可讀站已不是 Draft。
- 反例：把 runtime key 表裡有 `bun` 寫成「Bun 已符合 Minimum Common API」，或把 FAQ 成員名單寫成符合性名單。
- 反例：把 WinterCG 文件或 wintercg.org 舊域當成 2026-08-14 的現行樞紐。

## 邊界與易混概念

- 不包括：攻擊面、CVE、繞過、憑證、具體打分榜、工坊換棧工單。
- WinterCG ≠ WinterTC。前者已關；後者才能發 Ecma 標準。
- ECMA-429 ≠ ECMA-262。429 是 Web API **子集**的執行時合同；語言仍是 262。
- 大會透過 ≠ 可讀站已摘 Draft 標。2026-08-14 兩邊同時為真。
- Runtime key 收錄 ≠ 符合 429。
- Deno / Bun / Node 官方合同 ≠ 429 符合性證書。三者都宣告自己的 Web 超集或偏差。
- WinterTC 成員組織 ≠ 執行時實現清單。FAQ 未列 Oven / Bun；Keys 表有 `bun`。
- 提案中的 Sockets / CLI ≠ 已釋出標準。
- 酒館卡 iframe 不是伺服器 JS 執行時；本頁不自動落到卡內宿主。

## 對映到本倉庫

當前工坊與角色卡開發線都不因本頁改用 Deno / Bun，也不把 ECMA-429 寫成已採用依賴。這是產品落點，不是對委員會的否定。行業對照仍見 [[comparisons/行業架構方案何時用]] 與 [[concepts/後端架構名詞與工坊對照]]。本頁只釘入口與衝突。

## 來源與證據

- 樞紐與 TC55 定位：本輪開啟 [wintertc.org](https://wintertc.org/)。
- WinterCG 關閉日：W3C 組頁「closed on 3 April 2025」；社群首頁「closed on 2025-04-03」。
- FAQ 仍用將來時談關閉：本輪 [faq](https://wintertc.org/faq)「When WinterTC is fully set up… WinterCG will close」。
- 大會已過、可讀站仍 Draft：PDF 1st Edition December 2025；可讀站頁首 Draft, 31 July 2026，正文同時寫 December 2025 GA。
- 不 fork Web 規範：[faq](https://wintertc.org/faq)「What are we NOT trying to do?」與 [work](https://wintertc.org/work) 的 Fetch / Web Crypto Streams 行。
- Keys 不蘊含符合性：[runtime-keys](https://runtime-keys.proposal.wintertc.org/) Note 2；Published version 仍 TBD。
- 三家執行時合同：Deno about、Bun Web APIs、Node globals（本輪標題 v26.7.0）。

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
- [[concepts/後端架構名詞與工坊對照]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/工坊架構該上與不該上]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/WASI與元件模型]]
- [[concepts/邊緣快取與SWR]]
- [[concepts/HTTP3與QUIC]]
- [[concepts/SharedWorker與Web Locks]]
- [[concepts/JS Temporal]]
- [[concepts/MCP與A2A]]
- [[10-收件箱/寫回候選/第七批-B7-Hono]]
