---
title: MCP與A2A
created: 2026-08-14
updated: 2026-08-15
type: concept
status: active
tags:
  - wiki
  - concept
  - tooling
  - research
  - agent-harness
  - safety
sources:
  - https://modelcontextprotocol.io/specification/2026-07-28
  - https://github.com/modelcontextprotocol/specification/blob/main/schema/2026-07-28/schema.ts
  - https://github.com/modelcontextprotocol/specification/blob/main/schema/2026-07-28/schema.json
  - https://modelcontextprotocol.io/specification/2026-07-28/schema
  - https://modelcontextprotocol.io/specification/2026-07-28/server/tools
  - https://modelcontextprotocol.io/specification/2026-07-28/architecture
  - https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning
  - https://modelcontextprotocol.io/specification/2025-11-25
  - https://a2a-protocol.org/latest/specification/
  - https://a2a-protocol.org/v1.0.0/specification/
  - https://github.com/a2aproject/A2A/blob/main/specification/a2a.proto
  - https://a2a-protocol.org/latest/spec/a2a.json
  - https://a2a-protocol.org/latest/topics/a2a-and-mcp/
  - https://a2a-protocol.org/latest/topics/agent-discovery/
  - https://modelcontextprotocol.io/extensions/tasks/overview
  - 10-收件箱/寫回候選/第五批-B5-MCP.md
  - queries/第五批蒸餾目標.md
  - concepts/HTTP合同與問題詳情.md
knowledge_class: factual
---

# MCP與A2A

賬本見 [[10-收件箱/寫回候選/第五批-B5-MCP]]（B5-MCP，13 條入口）與 [[queries/第五批蒸餾目標]]。本頁不是已採用技術，也不是本倉必須改接 MCP / A2A 的工單。檢索時間：2026-08-14。只收官方 spec / schema，不寫本倉怎麼接、怎麼配、怎麼運維，也不寫攻擊步驟。

## 一句話定義

MCP（Model Context Protocol）是 **agent-to-tool** 合同：Host / Client / Server 用 JSON-RPC 列出並呼叫工具、資源和提示。A2A（Agent2Agent）是 **agent-to-agent** 合同：獨立代理用 Agent Card 發現彼此，用有狀態 `Task` 委派與共享結果。官方寫 complementary，**不是同一層、也不是互相替代**。

## 為什麼重要

「給模型接工具」和「讓兩個不透明代理協作」都叫 agent 協議，合同物件完全不同。混成一份，會把函式式 `tools/call` 當成跨代理任務匯流排，或把 A2A `Task` 當成子代理 / 工具呼叫。

本倉 [[20-Agent-Harness/README]] 的本地 JSON Schema 是任務 / 軌跡 / 證據的**倉內**合同，**不是**行業 MCP。[[70-協同橋接/README]] 寫「LLMWiki 不是同名 MCP 產品」只說明主題相鄰、防止混裝，不構成採用或拒絕。

## 權威入口

13 條是入口，不映象全文。規範頁已開啟；GitHub `schema.ts` / `schema.json` 採集輪 HTML 未吐正文，路徑以規範頁宣告為準。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [MCP Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28) | 本批樞紐。權威以 TypeScript `schema.ts` 為準。JSON-RPC 2.0。角色 Hosts / Clients / Servers。伺服器原語：Resources、Prompts、**Tools**。靈感來自 LSP，不是代理間任務匯流排。 |
| 2 | [schema.ts 2026-07-28](https://github.com/modelcontextprotocol/specification/blob/main/schema/2026-07-28/schema.ts) | 全部協議訊息的 **source of truth**。 |
| 3 | [schema.json](https://github.com/modelcontextprotocol/specification/blob/main/schema/2026-07-28/schema.json) + [Schema Reference](https://modelcontextprotocol.io/specification/2026-07-28/schema) | JSON Schema **從 TS 生成**，給工具用，不是另一份真源。嵌入 schema 預設 JSON Schema 2020-12。 |
| 4 | [Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) | **工具合同**。`tools/list` / `tools/call`；`inputSchema` 必為 JSON Schema 物件，不得 `null`；可選 `outputSchema`。工具是 model-controlled；描述/註解預設不信任（除非來自可信伺服器），呼叫前要使用者同意。這是同意原則，不是攻擊教程。 |
| 5 | [Architecture](https://modelcontextprotocol.io/specification/2026-07-28/architecture) | Host 協調多個 Client；每個 Client **1:1** 連一個 Server。現行修訂自稱 **stateless**：每請求自帶版本與能力。Server 不應讀整段對話，也看不見其他 Server。 |
| 6 | [Versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning) | **Modern** = `2026-07-28` 及以後：無握手，每請求 `_meta.io.modelcontextprotocol/protocolVersion`。**Legacy** = `2025-11-25` 及以前：`initialize` 會話。不支援則 `-32022` `UnsupportedProtocolVersionError`。 |
| 7 | [2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) | 上一修訂仍線上。舊文寫 Stateful connections；新文去掉會話與 `initialize`，實驗性 tasks **移出核心**。兩邊都留。 |
| 8 | [A2A Specification](https://a2a-protocol.org/latest/specification/) | 站標 Latest Released **1.0.0**。釘死頁 [v1.0.0](https://a2a-protocol.org/v1.0.0/specification/)。目標：獨立、可不透明的代理之間發現能力、協商模態、**管理協作任務**、交換資訊，而不讀對方內部狀態、記憶或工具。三層：資料模型 → 抽象操作 → 繫結（JSON-RPC / gRPC / HTTP+JSON）。協議版本用 Major.Minor，補丁號不參與相容談判。 |
| 9 | [`specification/a2a.proto`](https://github.com/a2aproject/A2A/blob/main/specification/a2a.proto) | 資料物件與請求/響應的 **single authoritative normative** 定義。包名 `lf.a2a.v1`。`Task` 註釋：A2A 的 **core unit of action**。正文另寫 `spec/a2a.proto`；本輪活檔案是 `specification/a2a.proto`。`/latest/spec/a2a.proto` 本輪 **500**。 |
| 10 | [a2a.json](https://a2a-protocol.org/latest/spec/a2a.json) | 自述 *Non-normative JSON Schema bundle extracted from proto*；`$schema` 2020-12；`version: "v1"`。JSON **不得**當真源。規範寫的 `specification/json/a2a.json` 本輪 **404**。 |
| 11 | [A2A and MCP](https://a2a-protocol.org/latest/topics/a2a-and-mcp/) | **官方分層**。MCP：代理如何用單個工具/資源（結構化輸入輸出，常無狀態）。A2A：獨立代理如何當對等方協作（發現、協商、共享任務、多輪）。**不是替代**。A2A 明文：不是子代理/工具呼叫協議，那些用框架原語或 MCP。 |
| 12 | [Agent Discovery](https://a2a-protocol.org/latest/topics/agent-discovery/) | Agent Card 是 A2A Server 的 JSON 自述（身份、端點、能力、鑑權、skills）。推薦 `https://{domain}/.well-known/agent-card.json`（RFC 8615）。登記處 API **規範未規定**。只記發現合同，不寫繞過鑑權。 |
| 13 | [MCP Tasks 擴充套件](https://modelcontextprotocol.io/extensions/tasks/overview) | `io.modelcontextprotocol/tasks`：給**長耗時 MCP 操作**（常是 `tools/call`）一個可輪詢控制代碼。這是工具層非同步，**不是** A2A 的代理間 `Task`。2026-07-28 已移出核心。 |

上表 **13** 條。B5-MCP 採集行不在本頁映象。

官方身份（不佔編號）：Linux Foundation 2025-06-23 立項稿與 Google 捐贈稿指向 <https://github.com/a2aproject/A2A>。倉是規範宿主，稿不是 schema。A2A 首頁還寫 IBM ACP 已併入 A2A；這是治理/譜系句，不是「MCP 被併入」。

## 如何運作

### 兩層對照，不合並

MCP 核心物件是 Tool / Resource / Prompt；A2A 核心物件是 Task / Message / AgentCard。MCP 不是代理間任務匯流排；A2A 不是子代理或工具呼叫協議。

### MCP 工具面

伺服器公佈工具清單；模型經 Client 調 `tools/call`。`inputSchema` 是 JSON Schema 物件。Host 協調多個 Client，每個 Client 只看見自己那一個 Server。現行修訂每請求自帶版本與能力，不靠會話握手。工具描述預設不信任，呼叫前要使用者同意——到此為止，不展開利用面。

### MCP 世代

`2025-11-25` 及以前是 Legacy：`initialize` 建會話，舊文自稱 Stateful。`2026-07-28` 起是 Modern：無握手。實驗性 tasks 從核心挪到擴充套件 `io.modelcontextprotocol/tasks`。舊入口仍活，不以新廢舊。

### A2A 任務面

先有資料模型（Task / Message / AgentCard / Part / Artifact），再有抽象操作（Send Message / Get Task / Cancel Task 等），最後綁到 JSON-RPC、gRPC 或 HTTP+JSON。對等代理不讀對方內部狀態、記憶或工具。發現靠 Agent Card，不是靠 MCP `tools/list`。

### schema 真源各走各的

MCP 以 **TypeScript `schema.ts`** 為準，JSON 是生成物。A2A 以 **`a2a.proto`** 為準，JSON 自述非規範。不要用「都有 JSON Schema」抹平。JSON Schema 方言本身見 [[concepts/JSON Schema與Protobuf]]，本頁不重蒸 2020-12。

### 兩個 Task

MCP Tasks 擴充套件給單次工具呼叫一個可輪詢控制代碼；A2A `Task` 是跨代理協作的工作單元。同名不同層。疊加也不是等同：A2A 寫遠端代理可以把部分 skill 暴露成 MCP 資源，同時寫 A2A 主場是有狀態協作，超出一次工具呼叫。

## 必須保留的衝突

- **不是同一層**：MCP 是工具/資源合同（host–client–server，函式式呼叫）。A2A 是代理間任務合同（對等、有狀態 Task、Agent Card）。官方寫 complementary，禁止併成一個協議。
- **兩個 Task**：MCP Tasks 擴充套件服務單次 `tools/call` 的非同步控制代碼；A2A `Task` 是跨代理協作的工作單元。
- **schema 真源**：MCP 以 TS 為準、JSON 生成；A2A 以 proto 為準、JSON 非規範。
- **MCP 世代**：`2025-11-25` 有會話握手；`2026-07-28` 無會話、每請求帶版本。舊入口仍活。
- **A2A 釘死 vs latest**：兩頁都標 1.0.0，HTML / JSON 體積不同；`main` proto 比 `v1.0.0` 標籤長。以釘死頁對釋出，latest 當現網站。
- **proto 路徑**：正文寫 `spec/a2a.proto`，活檔案是 `specification/a2a.proto`。兩邊留。
- **疊加不是等同**：部分 skill 可暴露成 MCP 資源 ≠ A2A 退化成一次工具呼叫。
- **倉內 Schema ≠ 行業 MCP**：本倉 Harness 四份 JSON Schema 是任務信封 / 軌跡 / 證據的本地合同，不能寫成 MCP `schema.ts` 或 A2A `a2a.proto` 的實現。

## 例子

- 正例：一個代理要讀日曆、查庫存，走 MCP `tools/list` / `tools/call`；工具 schema 釘在 MCP `schema.ts` 這一代。
- 正例：兩個獨立代理要發現對方、委派多輪任務、共享 Artifact，走 A2A Agent Card + `Task`；真源釘 `a2a.proto`。
- 正例：長耗時的同一次 `tools/call` 需要可輪詢控制代碼，用 MCP Tasks 擴充套件，不把它寫成 A2A 任務匯流排。
- 反例：把 MCP 和 A2A 併成「一種 agent 協議」，或把 A2A 寫成 MCP 的繼任。
- 反例：看見兩邊都有 JSON Schema 或都有名叫 Task 的物件，就當成同一合同。
- 反例：用 `2025-11-25` 的 `initialize` 會話心智去讀 `2026-07-28`，或把 latest HTML 體積差當成「已經不是 1.0.0」。
- 反例：把本倉 Harness 的 task / trace Schema 寫成「已經在跑 MCP」。

## 邊界與易混概念

- 不包括：SDK / 教程 / Inspector / Registry 釋出；Cursor 或 Hermes 配置；本倉 Harness 改接工單；越獄、提示注入利用、攻擊步驟；安全最佳實踐裡的攻擊向量清單。
- MCP ≠ A2A。分層以 [A2A and MCP](https://a2a-protocol.org/latest/topics/a2a-and-mcp/) 為準，不以第三方「MCP vs A2A」部落格為準。
- MCP Tasks 擴充套件 ≠ A2A `Task`。
- MCP `schema.ts` ≠ 生成的 `schema.json`；A2A `a2a.proto` ≠ 非規範 `a2a.json`。
- IBM ACP 併入 A2A ≠ MCP 被併入。
- 本倉 Harness 本地 JSON Schema ≠ MCP / A2A 現行規範。
- 「LLMWiki 不是同名 MCP 產品」≠ 本倉已接入或拒絕接入 MCP。本頁只收行業入口，不裁定本倉要不要接。

## 對映到本倉庫

[[20-Agent-Harness/README]] 有本地協議 Schema（任務、軌跡、證據、結果）；校驗器只覆蓋這四份倉內關鍵字子集。那是 **Harness 自己的合同**，不是 Model Context Protocol，也不是 A2A。本頁不替換 `20-Agent-Harness/01-協議/`，不升成本倉接入指南。

[[70-協同橋接/README]] 把「同名 MCP 產品」標成不要混裝：那是防把 Hermes 內建 Markdown LLMWiki 換成帶 SQLite / Web / MCP 憑證的另一實現，不是行業分層結論。

HTTP 錯誤體、OpenAPI 與 JSON Schema 方言見 [[concepts/HTTP合同與問題詳情]]、[[concepts/JSON Schema與Protobuf]]、[[concepts/OpenAPI與Arazzo]]，本頁不重收 RFC 9457 / OAS。不是已採用技術，也不做成品。本倉是否接入：未裁定。

## 來源與證據

- MCP 現行修訂、角色、原語、LSP 靈感： [2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28) 與 Architecture / Tools / Versioning。
- 訊息真源是 TS、JSON 生成：規範頁與 basic 對 `schema.ts` 的宣告。
- A2A 1.0.0、三層、`Task` 是核心工作單元：規範正文與 `specification/a2a.proto` 註釋。
- 官方分層 complementary、不是替代： [A2A and MCP](https://a2a-protocol.org/latest/topics/a2a-and-mcp/)。
- Agent Card 發現合同： [Agent Discovery](https://a2a-protocol.org/latest/topics/agent-discovery/)。
- MCP Tasks 已出核心、只服務工具層非同步：Changelog + [Tasks 擴充套件](https://modelcontextprotocol.io/extensions/tasks/overview)。
- 查詢賬本：[[10-收件箱/寫回候選/第五批-B5-MCP]]；樞紐表見 [[queries/第五批蒸餾目標]] B5-MCP。
- 採集缺口（待複核，不靜默填）：GitHub schema 檔案正文未吐；`/latest/spec/a2a.proto` 500；latest 與 v1.0.0 的逐欄位差未對完。

已知衝突見上節，不靜默覆蓋。本倉是否接入：未裁定。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 `SCHEMA.md` 的 Tag Taxonomy
- [x] 已釋出到正式區；本波不改 `index.md` 與 `log.md`

## 相關內容

- [[concepts/HTTP合同與問題詳情]]
- [[concepts/JSON Schema與Protobuf]]
- [[concepts/OpenAPI與Arazzo]]
- [[20-Agent-Harness/README]]
- [[70-協同橋接/README]]
- [[queries/第五批蒸餾目標]]
- [[10-收件箱/寫回候選/第五批-B5-MCP]]
