---
title: C4與ADR
created: 2026-08-14
updated: 2026-08-15
type: concept
status: active
tags:
  - wiki
  - concept
  - research
  - tooling
sources:
  - https://c4model.com/
  - https://c4model.com/introduction
  - https://c4model.com/abstractions
  - https://c4model.com/abstractions/container
  - https://c4model.com/abstractions/component
  - https://c4model.com/diagrams
  - https://c4model.com/diagrams/code
  - https://c4model.com/faq
  - https://adr.github.io/
  - https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
  - https://adr.github.io/madr/
  - https://arc42.org/overview/
  - https://docs.arc42.org/home/
  - https://docs.arc42.org/section-9/
  - queries/第三批蒸餾目標.md
  - concepts/後端架構名詞與工坊對照.md
knowledge_class: factual
---

# C4與ADR

本頁不是已採用的畫圖規範，也不是已落地的決策日誌。檢索時間：2026-08-14。賬本見 [[queries/第三批蒸餾目標]] B3-C4。只收官方入口，不收生成器站，不收盜版書。

## 一句話定義

C4 是一套**架構圖**（程式碼地圖的縮放層）；arc42 是架構說明的**十二節骨架**；ADR 是**單條**架構決策及其理由。三者可巢狀，不是同一層，也不能互相替換。

## 為什麼重要

團隊常把「畫張 C4」「補一份 arc42」「寫個 ADR」當成三選一。官方各自回答不同問題：圖怎麼分層、整本說明放哪些節、這一條決定為什麼留下。混層會導致一張圖裡塞流程與部署、十二節被當成四張圖、或把整本模板誤寫成一條決策。本頁只收官方入口。

## 權威入口

上表 **14** 條。B3-C4 的採集行不在本頁映象。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [C4 官網](https://c4model.com/) | 發明人 Simon Brown 站；圖模型真源 |
| 2 | [Introduction](https://c4model.com/introduction) | 「程式碼的地圖」；四層縮放 |
| 3 | [Abstractions](https://c4model.com/abstractions) | 人 / 系統 / 容器 / 元件 / 程式碼 |
| 4 | [Container](https://c4model.com/abstractions/container) | Not Docker；執行時邊界 |
| 5 | [Component](https://c4model.com/abstractions/component) | 介面後的功能組；不可單獨部署 |
| 6 | [Diagrams](https://c4model.com/diagrams) | 四張靜態 + 三張配套；多數團隊前兩張即可 |
| 7 | [Code 圖](https://c4model.com/diagrams/code) | 可選；不推薦長期手維護 |
| 8 | [C4 FAQ](https://c4model.com/faq) | 與 UML / arc42 關係；不暗示過程 |
| 9 | [ADR 組織入口](https://adr.github.io/) | AD / ASR / ADR / 決策日誌詞彙 |
| 10 | [Nygard 2011](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) | 一條一檔案；推翻保留 |
| 11 | [MADR](https://adr.github.io/madr/) | Markdown 模板；3.0 / 4.0 改名史 |
| 12 | [arc42 十二節總覽](https://arc42.org/overview/) | 骨架入口 |
| 13 | [arc42 文件首頁](https://docs.arc42.org/home/) | 十二節分頁與提示 |
| 14 | [arc42 第 9 節](https://docs.arc42.org/section-9/) | 決策可寫成 ADR，須回指第 4 節 |

## 如何運作

### 三者不是同一層

| 層 | 是什麼 | 官方入口 | 不是什麼 |
|---|---|---|---|
| C4 | 靜態結構圖的縮放：上下文 → 容器 → 元件 → 程式碼；另有景觀 / 動態 / 部署三張配套圖 | [c4model.com](https://c4model.com/) | 不是文件目錄，也不是決策日誌 |
| arc42 | 十二節可裁剪骨架：該寫什麼、按什麼順序寫 | [arc42 overview](https://arc42.org/overview/) | 不是圖符號，也不等於一條 ADR |
| ADR | 一條架構顯著決策 + 理由；多條構成決策日誌 | [adr.github.io](https://adr.github.io/) | 不是十二節全文，也不是 C4 的第四層 |

[C4 FAQ](https://c4model.com/faq) 寫明可以和 arc42 **組合**，並給了節到圖的對應：第 3 節 Context and Scope → 系統上下文圖；積木檢視 L1 / L2 / L3 → 容器 / 元件 / 程式碼圖。組合不等於同一層：arc42 還有目標、約束、策略、執行、部署、橫切、質量、風險、詞彙等節，C4 並不覆蓋。

### C4：圖，不是過程

[Introduction](https://c4model.com/introduction) 把 C4 說成「程式碼的地圖」，按縮放講不同故事。[Diagrams](https://c4model.com/diagrams) 點名四張靜態圖：系統上下文、容器、元件、程式碼。多數團隊只需前兩張。另有三張配套：系統景觀、動態、部署。C4 只管靜態結構；流程、狀態機、領域模型、資料模型要另補 UML / BPMN / ER 等。狀態機合同見 [[concepts/狀態機與SCXML]]，不是 C4 的第四層。

[Abstractions](https://c4model.com/abstractions)：軟體系統由一個或多個容器（應用與資料儲存）組成，容器裡是元件，元件由程式碼元素實現；人使用這些系統。

[Container](https://c4model.com/abstractions/container) 標題即 **Not Docker**：容器是執行時邊界（Web 應用、桌面/移動端、無伺服器函式、資料庫、物件儲存、檔案系統等）。JAR / DLL 通常不是容器。以服務端渲染 HTML 為主的站點多半是**一個**容器；若大量前端指令碼自成 SPA，則是**兩個**容器（兩個程序空間）。超媒體取向見 [[concepts/HTMX與超媒體]]，那是頁面形態，不是 C4 符號。S3 / RDS 這類託管儲存，因桶和 schema 仍由你負責，按容器畫，不畫成外部系統。

[Component](https://c4model.com/abstractions/component)：一組藏在明確介面後的相關功能。元件**不是**獨立部署單元；可部署的是容器。包名、JAR、資料夾通常也不是元件。這與 UI 自定義元素、WASI 元件模型不是同一詞，見 [[concepts/Lit與自定義元素]]、[[concepts/WASI與元件模型]]。

[Code 圖](https://c4model.com/diagrams/code) 官方標 **不推薦**作長期文件：IDE 可按需生成；只給最重要或最複雜的元件。FAQ：第四張圖 2010 年叫 classes，2015–2016 改名 code。C4 **不**暗示設計流程或崗位分工（不是分析師畫上下文、架構師畫容器、開發只畫程式碼）。

### arc42：十二節骨架

[overview](https://arc42.org/overview/) 與 [docs 首頁](https://docs.arc42.org/home/) 十二節一致：1 引言與目標；2 約束；3 上下文與範圍；4 方案策略；5 積木檢視（通常最厚）；6 執行時檢視；7 部署檢視；8 橫切概念；9 架構決策；10 質量需求；11 風險與技術債；12 詞彙表。可裁剪；更輕可用一頁 canvas。模板自 2005 年起，工具無關。

### ADR：一條決策

[adr.github.io](https://adr.github.io/)：架構決策（AD）是針對架構顯著需求的有理由選擇；ADR 捕捉**一條** AD 及其理由；集合才是決策日誌。組織目標是統一詞彙與工具指標，不是單一強制模板。背景指向 Zdun 等的可持續決策與 Y 句式，也指向 2011 年 Nygard 博文。

[Nygard 2011](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)：一條 ADR 對應一條顯著決策；放在倉內 `doc/arch/adr-NNN.md`；序號單調不復用；推翻則舊條標 superseded，不刪。結構：Title / Context / Decision / Status / Consequences。全文一兩頁。Context 價值中立；Decision 用「We will …」；後果正負中性都寫。

[arc42 第 9 節](https://docs.arc42.org/section-9/) 把 ADR 當作該節的一種形式，也可改用表或分節；重要決策若已在第 4 節寫過，此處引用，避免重複。它推薦 Nygard 結構，並指向 adr GitHub 上的其他模板。

[MADR](https://adr.github.io/madr/) 是 Markdown 模板，不是第三套「架構方法」。現行站頭寫 Markdown Architectural Decision Records。3.0.0-beta（2022-05-17）曾改名為 Markdown **Any** Decision Records；4.0.0（2024-09-17）為強調架構工作，又拼回 Architectural，並寫仍可用於任何決策。3.0.0 把正負後果並回 Consequences。完整模板另有 Decision Drivers、Considered Options、Confirmation 等可選節。雙許可 MIT 或 CC0。

HTTP 操作合同、錯誤體與 schema 是另一層，見 [[concepts/HTTP合同與問題詳情]]、[[concepts/OpenAPI與Arazzo]]；不要把 OpenAPI 檔案寫成一條 ADR，也不要把 ADR 寫成介面清單。

## 必須保留的衝突

- C4 / arc42 / ADR 可組合，但不是同一層。FAQ 的節對映是嵌入，不是三選一。
- C4 container：官方寫 Not Docker，同頁又寫有時與 Docker 等基礎設施容器有對應。兩邊留。
- C4 vs UML：已用 UML 且有效則繼續；C4 是簡化，也可當走向 UML 的臺階。FAQ 把「倒退」與「夠用」並列。
- 第四張圖：舊名 classes，現行 code。
- ADR 模板：Nygard 四段、Y 句式、MADR 全模板並存；arc42 第 9 節還允許表或分節。
- MADR 3.0.0-beta 改稱 Any Decision Records；4.0.0 站頭改回 Architectural，並寫仍可記任何決策。
- 「軟體系統」是 C4 最難定義的抽象；組織口語裡的應用 / 產品 / 服務不要直接等同。
- 本頁對映工坊與髮卡的**說明方式**；**不是**「本倉庫已採用 C4 / arc42 / ADR」。

## 例子

- 正例：先畫系統上下文和容器圖，說明酒館宿主、卡內 iframe、工坊 Gateway 各是哪個軟體系統 / 容器，見 [[concepts/酒館宿主與iframe分層]]；一條 ADR 只記「卡 UI 是否另開 iframe」。
- 正例：若要整本說明，用 arc42 當目錄：第 3 / 5 節嵌 C4 圖，第 9 節鏈 ADR 檔案。
- 反例：把 C4、arc42、ADR 寫成三選一的「架構文件格式」。
- 反例：一張圖裡混系統、Docker 服務、React 元件和類。
- 反例：把 `AGENTS.md` 或本頁寫成「本倉庫已採用 ADR / C4」。

## 邊界與易混概念

- 不包括：Structurizr / IcePanel / C4-PlantUML 等生成器或建模站；不把它們當 C4 真源。
- 不包括：Simon Brown 或 arc42 紙書的盜版 PDF；付費課不進本頁。
- 不包括：本倉庫已實施的 C4 圖集、arc42 手冊或 ADR 目錄——**沒有這回事**。
- 易混：C4 container ≠ Docker 容器。官方否認等同，又承認有時一一對應。兩邊按原文留。
- 易混：C4 component ≠ UI 元件 / npm 包 / JAR，也 ≠ WASI 元件。
- 易混：C4 軟體系統 ≠ 產品域、限界上下文、能力、部落或小隊。
- 易混：C4 四張圖 ≠ arc42 十二節。FAQ 的節對映是嵌入關係。
- 易混：ADR ≠ 會議紀要 ≠ 整本架構說明。Nygard：一條記錄一個決定。
- 易混：Nygard 四段 ≠ Y 句式 ≠ MADR 全模板。adr.github.io 指向多模板並存。
- 易混：MADR 3.x「Any」≠ 4.0 站頭的「Architectural」。改名史兩邊留。
- 易混：C4 第四層 classes（2010）≠ code（2015 後）。現行用 code。
- 易混：事件溯源 / CQRS 是執行時資料與讀寫模型，見 [[concepts/事件溯源與CQRS]]；不是 C4 圖，也不是一條 ADR。
- 區分：先問「要的是圖、目錄，還是這一條決定」；再問「container 是執行時邊界還是映象」；最後問「這是行業入口還是本倉已採用」。

## 對映到本倉庫

本倉用 Wiki 頁、對照表和治理檔案回答「名詞怎麼用、產物能不能出」。那不是 C4 圖，也不是 ADR 日誌。**不要把本頁寫成工坊或髮卡已採用 C4 / arc42 / ADR。**

| 本倉物 | 實際在做 | 不是 |
|---|---|---|
| [[concepts/後端架構名詞與工坊對照]] | 後端名詞與工坊現狀對照 | C4 容器圖 |
| [[comparisons/行業架構方案何時用]] | 行業方案何時上 | arc42 十二節正文 |
| [[comparisons/工坊架構該上與不該上]] | 工坊產品取捨 | 一條 ADR |
| `AGENTS.md` / `SCHEMA.md` | 治理與寫回門 | 決策日誌；推翻也不按 superseded 編號留舊條 |
| 髮卡釋出 / 打包回封 | 真機匯入與嵌入對賬 | 部署圖或 arc42 第 7 節 |

對照句：卡A / 卡B / 怪談的穩定驗收是產品門，不是 C4 程式碼圖。工坊同步 REST 與稽核狀態機是已用後端形態，不是 arc42 例項。行業「何時用」仍看 [[comparisons/行業架構方案何時用]]，本頁不改那張表。

## 來源與證據

權威入口以上表 14 條與 [[queries/第三批蒸餾目標]] B3-C4 為準。不收生成器站，不收盜版書。

1. [C4 官網](https://c4model.com/) — 發明人 Simon Brown 站；圖模型真源。
2. [Introduction](https://c4model.com/introduction) — 「程式碼的地圖」；四層縮放。
3. [Abstractions](https://c4model.com/abstractions) — 人 / 系統 / 容器 / 元件 / 程式碼。
4. [Container](https://c4model.com/abstractions/container) — Not Docker；執行時邊界。
5. [Component](https://c4model.com/abstractions/component) — 介面後的功能組；不可單獨部署。
6. [Diagrams](https://c4model.com/diagrams) — 四張靜態 + 三張配套；多數團隊前兩張即可。
7. [Code 圖](https://c4model.com/diagrams/code) — 可選；不推薦長期手維護。
8. [C4 FAQ](https://c4model.com/faq) — 與 UML / arc42 關係；不暗示過程。
9. [ADR 組織入口](https://adr.github.io/) — AD / ASR / ADR / 決策日誌詞彙。
10. [Nygard 2011](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) — 一條一檔案；推翻保留。
11. [MADR](https://adr.github.io/madr/) — Markdown 模板；3.0 / 4.0 改名史。
12. [arc42 十二節總覽](https://arc42.org/overview/) — 骨架入口。
13. [arc42 文件首頁](https://docs.arc42.org/home/) — 十二節分頁與提示。
14. [arc42 第 9 節](https://docs.arc42.org/section-9/) — 決策可寫成 ADR，須回指第 4 節。

已知衝突見上節，不靜默覆蓋。未跑工坊或髮卡的 C4/ADR 真機——本來就沒有已落地的圖集或決策日誌可驗。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[queries/第三批蒸餾目標]]
- [[queries/第二批蒸餾目標]]
- [[concepts/後端架構名詞與工坊對照]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/工坊架構該上與不該上]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/狀態機與SCXML]]
- [[concepts/HTMX與超媒體]]
- [[concepts/事件溯源與CQRS]]
- [[concepts/OpenAPI與Arazzo]]
- [[concepts/Lit與自定義元素]]
- [[concepts/WASI與元件模型]]
