---
title: 可觀測與OpenTelemetry
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
  - https://opentelemetry.io/docs/
  - https://opentelemetry.io/docs/what-is-opentelemetry/
  - https://opentelemetry.io/docs/concepts/observability-primer/
  - https://opentelemetry.io/docs/concepts/signals/traces/
  - https://opentelemetry.io/docs/concepts/context-propagation/
  - https://opentelemetry.io/docs/specs/otel/overview/
  - https://opentelemetry.io/docs/languages/js/getting-started/browser/
  - https://opentelemetry.io/docs/specs/semconv/
  - https://www.w3.org/TR/trace-context/
  - https://www.w3.org/TR/baggage/
  - https://web.dev/articles/vitals
  - https://web.dev/articles/vitals-measurement-getting-started
  - https://web.dev/articles/vitals-field-measurement-best-practices
  - https://github.com/GoogleChrome/web-vitals
  - queries/第二批蒸餾目標.md
  - queries/前端視覺與靈感站點蒸餾目標.md
  - concepts/Web效能與INP.md
  - concepts/DORA五項與SLO.md
  - concepts/Prometheus與OpenMetrics.md
knowledge_class: factual
---

# 可觀測與OpenTelemetry

本頁不是已採用技術，也不是本倉庫已落地的 RUM / 追蹤。檢索時間：2026-08-14。賬本見 [[queries/第二批蒸餾目標]] **B2-Otel**（約 14 條）。文件真身是 [`opentelemetry.io`](https://opentelemetry.io/docs/)；採集時 [`otel.io`](https://otel.io/) **503**，不當入口。

B2-Otel-11 的 Web Vitals 與第一批架構 **A1** 同文，**不是新發現**。指標合同仍回 [[concepts/Web效能與INP]]；本頁只談它怎麼被匯出進遙測。

## 一句話定義

可觀測是從系統**對外吐出的訊號**理解內部狀態，好問「為什麼這樣」、處理未知未知。OpenTelemetry（OTel）是 CNCF 的**廠商中立框架**：埋點、生成、收集、匯出 traces / metrics / logs。它**不是**儲存或視覺化後端。

## 為什麼重要

雲與微服務讓一次請求跨多程序。沒有統一訊號，只能翻各家日誌、各家 APM 詞。OTel 給一套 API / 語義約定 / 傳輸，資料仍歸你；後端可以是 Jaeger、Prometheus 或商業產品。拉取、線格式與看板見 [[concepts/Prometheus與OpenMetrics]]，本頁不重抄。入門課把可靠性寫成「使用者預期的事有沒有發生」；SLI / SLO 只點到，專章在 [[concepts/DORA五項與SLO]]，本頁不整頁複述。

前端 RUM 不是第二套合同。場資料裡的 LCP / INP / CLS 仍是 A1；OTel 瀏覽器埋點只是同一簇指標的匯出面。實驗室（Lighthouse）先抓回歸，場資料才是合同。

## 權威入口

檢索 2026-08-14。B2-Otel 滿額 **14** 條（8–14 範圍內）。OTLP、Collector、Trace Context Level 2、CrUX、Browser semconv 專頁當時讓位，正文只點到。不映象採集行。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [遙測文件總口](https://opentelemetry.io/docs/) | CNCF 文件樞紐 |
| 2 | [何為開放遙測](https://opentelemetry.io/docs/what-is-opentelemetry/) | 框架不是後端 |
| 3 | [可觀測入門課](https://opentelemetry.io/docs/concepts/observability-primer/) | 定義；log / span / trace |
| 4 | [追蹤訊號釋義](https://opentelemetry.io/docs/concepts/signals/traces/) | span、屬性、狀態、kind |
| 5 | [上下文傳播論](https://opentelemetry.io/docs/concepts/context-propagation/) | inject / extract；接到 `traceparent` |
| 6 | [規範總覽正文](https://opentelemetry.io/docs/specs/otel/overview/) | 訊號、約定、baggage、傳播 |
| 7 | [瀏覽器埋點入](https://opentelemetry.io/docs/languages/js/getting-started/browser/) | 官方標 experimental |
| 8 | [語義約定總表](https://opentelemetry.io/docs/specs/semconv/) | 檢索日 1.44.0；穩定度分割槽 |
| 9 | [追蹤上下文標](https://www.w3.org/TR/trace-context/) | W3C REC：`traceparent` / `tracestate` |
| 10 | [行李頭規範文](https://www.w3.org/TR/baggage/) | 與 Trace Context 獨立；CR |
| 11 | [核心體驗指標](https://web.dev/articles/vitals) | **= 第一批 A1**，不是新發現 |
| 12 | [現場測量入門](https://web.dev/articles/vitals-measurement-getting-started) | field ≠ lab |
| 13 | [現場上報實踐](https://web.dev/articles/vitals-field-measurement-best-practices) | beacon / p75；示例非 OTel |
| 14 | [現場指標庫文](https://github.com/GoogleChrome/web-vitals) | 測量庫，非規範 |

刻意未收：OTLP / Collector 專頁、Trace Context L2、CrUX、Browser semconv 專頁、廠商 APM 報價、把 `otel.io` 當入口。

## 如何運作

### 框架四件，不是一個產品

[What is OpenTelemetry](https://opentelemetry.io/docs/what-is-opentelemetry/) 列：規範、[OTLP](https://opentelemetry.io/docs/specs/otlp/) 協議、語義約定、語言 API / SDK、庫生態、零程式碼埋點、[Collector](https://opentelemetry.io/docs/collector/)。儲存與看板故意留給別的工具。歷史是 OpenTracing 與 OpenCensus 合併。規範層檢索日見 [Specification 1.60.0](https://opentelemetry.io/docs/specs/otel/)；版本常變，勿當教程釘死。

規範總覽把客戶端拆成 **API**（橫切、埋點作者只許依賴它）、**SDK**（應用主人裝）、**語義約定**、**Contrib**。埋點作者不得直接引用任何 SDK 包。

### 訊號：trace / span / log

[入門課](https://opentelemetry.io/docs/concepts/observability-primer/)：應用「埋夠了」是指排障不必再加探針。三件常用訊號：

- **log**：帶時間戳的訊息，預設不綁某次請求。
- **span**：一次工作單元；有名、起止、屬性、事件、連結、狀態。
- **trace**：一次請求穿過多個服務的路徑；由共享 `trace_id` 的一組 span 組成。根 span 無 `parent_id`。

[Traces](https://opentelemetry.io/docs/concepts/signals/traces/) 把 trace 看成帶上下文的結構化日誌集合，可來自不同程序。狀態預設 `Unset`（無錯完成）；`Error` 表示操作出錯；`Ok` 是開發者**顯式**蓋章，多數情況不必寫。Kind 提示後端怎麼拼：`Client` / `Server` / `Internal` / `Producer` / `Consumer`。

文件站主訊號是 traces / metrics / logs。規範總覽舉例把 tracing、metrics、**baggage** 寫成三個獨立訊號；Profiles 已進 1.60.0 目錄。兩邊都留，不要把「三支柱」寫成規範唯一列舉。

十二因素把日誌寫成程序 `stdout` 事件流，見 [[concepts/十二因素與CAP]]；那是部署合同，不是 OTel 的 log 訊號。

### 上下文傳播

跨邊界要對上同一條 trace，靠 **context**（至少 trace ID + span ID）和 **propagation**（序列化進載體）。預設傳播器走 [W3C Trace Context](https://www.w3.org/TR/trace-context/) 的 `traceparent`：

```text
<version>-<trace-id>-<parent-id>-<trace-flags>
```

例：`00-a0892f3577b34da6a3ce929d0e0e4736-f03067aa0ba902b7-01`。傳送側 **inject**，接收側 **extract**。無元資料欄位的協議也能塞，但接收後必須剝掉再處理，否則行為未定義。預設傳播器**因語言 SDK 而異**。RPC 元資料也是一種載體，協議面見 [[concepts/gRPC與Connect]]，本頁不寫接入步驟。

安全：不信任的入站頭可偽造追蹤圖；出站到外部服務可能洩漏內部 ID 或 baggage。Baggage 是另一套鍵值，**獨立於** Trace Context。

### 瀏覽器埋點（experimental）

[JS 瀏覽器起步](https://opentelemetry.io/docs/languages/js/getting-started/browser/) 官方標 **experimental**，大多未成規範。示例用 `WebTracerProvider`、`DocumentLoadInstrumentation`、可選 `ZoneContextManager`；服務端 HTML 可寫 `<meta name="traceparent">` 把服務端取樣決定交給頁。常見包：`@opentelemetry/sdk-trace-web`、`instrumentation-document-load`、`auto-instrumentations-web`。語義約定 [Browser](https://opentelemetry.io/docs/specs/semconv/browser/) 檢索日仍是 **Development**（B2 滿額未單列該頁）。

### Web Vitals 是匯出面，回 A1

[Web Vitals](https://web.dev/articles/vitals) 已是第一批 **A1** 樞紐，也是 B2-Otel-11。LCP / INP / CLS 閾值、75 分位、場 vs 實驗室，見 [[concepts/Web效能與INP]]。本頁只記：

- [現場測量入門](https://web.dev/articles/vitals-measurement-getting-started) 把 RUM / field 與 lab 分開，並指向自建上報。CrUX 是抽樣公開集，**不能替代**自有 RUM。
- [現場上報實踐](https://web.dev/articles/vitals-field-measurement-best-practices) 講 `sendBeacon`、`visibilitychange`、p75、禁均值。示例綁 GA / 自定義事件，**不是** OTel 匯出。
- [web-vitals](https://github.com/GoogleChrome/web-vitals) 是 Chrome 測量庫，對齊 CrUX / PSI 演算法；GitHub 不是規範。

後出的 `@opentelemetry/browser-instrumentation` Web Vitals 儀用同一庫吐結構化 log，仍 experimental，B2 滿額未收。不要把它寫成第二套指標合同。

## 必須保留的衝突

- **域名**：文件真身 `opentelemetry.io`。`otel.io` 採集時 503，不寫進入口表。
- **與第一批重疊**：B2-Otel-11 = A1 = `web.dev/articles/vitals`。B2-Perf 也續寫同一簇。記賬本續寫，不當新發現。
- **Trace Context 版本**：未標號 `/TR/trace-context/` 現指向 **v1 REC**（2021-11-23）。另有 Level 2 CR，B2 滿額未收。勿把未標號 URL 當成 L2。
- **Baggage 成熟度**：2024-05-30 仍是 Candidate Recommendation Snapshot；瀏覽器 UA **不在**實現範圍。隱私節寫明可帶使用者可識別資料。
- **瀏覽器埋點**：官方 JS 起步標 experimental / mostly unspecified。Browser semconv 仍 Development。後出的 browser-instrumentation 也 experimental，未升本頁入口。
- **訊號列舉**：使用者文件寫 traces / metrics / logs；規範總覽舉例寫 tracing / metrics / baggage；1.60.0 已有 Profiles。不靜默收成「只有三支柱」。
- **規範版本**：總覽與入口常變（檢索日規範 1.60.0、semconv 1.44.0）。以當時頁首為準，不把版本釘成永遠現行。
- **預設傳播器因語言 SDK 而異**；不要寫成「全語言預設都是 W3C」。
- **廠商 APM 術語與 OTel span / kind / status 不完全同名**。以概念頁與規範為準。
- **現場上報實踐的示例綁 GA**，不是 OTel exporter。web-vitals 是測量對齊，不是匯出合同。
- **OTel ≠ Prometheus**。前者生成與匯出；後者拉取、儲存與 PromQL。相容與改名衝突見 [[concepts/Prometheus與OpenMetrics]]，本頁不裁定指標真身。
- 滿額讓位：OTLP、Collector、Trace Context L2、CrUX、Browser semconv 專頁。需要時另開，不假裝本頁已蒸。
- 本頁對映工坊與髮卡的**訊號邊界**；**不是**「本倉已採用 OTel / 已接線 Collector」。

## 例子

- 正例：服務 A 調服務 B 時帶 `traceparent`；B 抽出同一 `trace_id`，在 Jaeger 裡看成一條瀑布。
- 正例：頁載入 span 管「從開始到結束」；「可互動」用 span event，因為時間點有意義。
- 正例：自建 RUM 用 web-vitals 取 LCP / INP / CLS，再經 OTLP 匯出；閾值仍讀 A1，不另造合同。
- 反例：把 `verify-repo` 綠或工坊 `approved` 寫成一條 trace 已落地。
- 反例：baggage 裡塞使用者憑證或 PII，再傳到不信任下游。
- 反例：把 otel.io 短域、或廠商 APM 詞，當成 OTel 規範真身。
- 反例：把本頁寫成「工坊必須上 OTel」，或把 CNCF 專案當成已採用證明。

## 邊界與易混概念

- 不包括：本倉庫已實施的 Collector / OTLP 閘道器 / 瀏覽器 RUM——**沒有這回事**。
- 不包括：攻擊步驟、憑證、把廠商報價頁當規範。
- 易混：可觀測 ≠ 監控儀表盤 ≠ 某家 APM 產品。OTel 管生成與匯出，不管存和畫。
- 易混：OTel ≠ Prometheus。存和刮見 [[concepts/Prometheus與OpenMetrics]]。
- 易混：log ≠ span ≠ trace。log 預設不綁請求；span 是有邊界的工作單元；trace 是跨邊界的因果鏈。
- 易混：`Unset` ≠ `Ok`。無錯完成用預設 `Unset`；`Ok` 是顯式終裁。
- 易混：Trace Context ≠ Baggage。前者傳播追蹤元資料；後者傳播應用自定義鍵值，且規範寫明可在無追蹤時單獨用。
- 易混：Web Vitals 合同 ≠ OTel 匯出。同一簇指標；合同在 A1 / INP 頁。
- 易混：CrUX ≠ 自有 RUM。公開抽樣集不能代替自己的場資料。
- 易混：SLI / SLO ≠ OTel 訊號。入門課只點到；專章在 DORA 頁。
- 易混：十二因素 XI Logs（`stdout` 事件流）≠ OTel log 訊號。前者是程序怎麼吐日誌，見 [[concepts/十二因素與CAP]]。
- 易混：功能開關評估點 ≠ span。執行時分支見 [[concepts/功能開關與OpenFeature]]。
- 區分：先問「在定義指標、在傳播上下文，還是在選後端」；再問「這是規範、實驗埋點，還是本倉產品門」。

## 對映到本倉庫

對映放最後，不當過濾器。行業合同對獨立站和嵌入 UI 都成立，**不是「卡不能談可觀測」**。本頁不宣佈已接線。**不要把本頁寫成工坊或髮卡已採用 OpenTelemetry。**

| 本倉物 | 實際在驗 | 不是 |
|---|---|---|
| `verify-repo` / `harness-smoke` | 靜態連結與協議接通 | 分散式 trace、SLI |
| 工坊 Gateway 日誌 | 同步 REST 生命週期 | Collector / OTLP 已落地 |
| 髮卡真機門 | 匯入、世界書、首條 | RUM 場資料合同 |
| 卡內 fail closed | 宿主契約失敗則停 | span `Error` 或 SLO 燃燒 |
| [[concepts/C4與ADR]] | 說明方式入口 | 本頁不是「已決定上 OTel」的 ADR |

iframe 與宿主是不同文件：框內互動可進頂層 Web Vitals 場資料，框內 `PerformanceObserver` / 頁內 tracer 預設看不到跨框條目。這是指標與 API 的已知分叉，見 [[concepts/Web效能與INP]]、[[concepts/酒館宿主與iframe分層]]，不是「嵌入就不用量」。跨框塞 `traceparent` 要自己設計載體，瀏覽器起步頁的 meta 只覆蓋**服務端渲染的那一頁**。

卡內 fail closed 仍歸 [[concepts/創意工坊與安全契約]]。工坊主路徑仍是同步 REST，見 [[concepts/後端架構名詞與工坊對照]] 與 [[comparisons/工坊架構該上與不該上]]。行業「何時用」仍看 [[comparisons/行業架構方案何時用]]，本頁不改那張表。

## 來源與證據

- 框架不是後端：[What is OpenTelemetry](https://opentelemetry.io/docs/what-is-opentelemetry/)；儲存與看板留給別的工具。
- log / span / trace：[可觀測入門課](https://opentelemetry.io/docs/concepts/observability-primer/) 與 [Traces](https://opentelemetry.io/docs/concepts/signals/traces/)。
- 傳播與 `traceparent`：[上下文傳播](https://opentelemetry.io/docs/concepts/context-propagation/)；[W3C Trace Context](https://www.w3.org/TR/trace-context/) 未標號 URL 指向 v1 REC。
- Baggage 獨立、CR、可帶可識別資料：[W3C Baggage](https://www.w3.org/TR/baggage/)。
- 瀏覽器埋點 experimental：[JS 瀏覽器起步](https://opentelemetry.io/docs/languages/js/getting-started/browser/)。
- Web Vitals 合同與場/實驗室：[[concepts/Web效能與INP]]；B2-Otel-11 = 第一批 A1。
- 現場上報示例綁 GA、非 OTel：[現場上報實踐](https://web.dev/articles/vitals-field-measurement-best-practices)。
- 查詢賬本：[[queries/第二批蒸餾目標]] B2-Otel；重疊索引見 [[queries/前端視覺與靈感站點蒸餾目標]]。
- 分路原稿仍在 [[10-收件箱/寫回候選/概念-可觀測與OpenTelemetry]]。

已知衝突見上節，不靜默覆蓋。工坊或髮卡真機未核任何 Collector / OTLP / 瀏覽器 RUM——本來就沒有已落地的管線可驗。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[queries/第二批蒸餾目標]]
- [[queries/前端視覺與靈感站點蒸餾目標]]
- [[10-收件箱/寫回候選/概念-可觀測與OpenTelemetry]]
- [[concepts/Prometheus與OpenMetrics]]
- [[concepts/Web效能與INP]]
- [[concepts/DORA五項與SLO]]
- [[concepts/十二因素與CAP]]
- [[concepts/功能開關與OpenFeature]]
- [[concepts/gRPC與Connect]]
- [[concepts/Kubernetes工作負載]]
- [[concepts/後端架構名詞與工坊對照]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/C4與ADR]]
- [[concepts/創意工坊與安全契約]]
- [[concepts/酒館宿主與iframe分層]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
