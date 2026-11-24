---
title: Prometheus與OpenMetrics
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
  - https://prometheus.io/docs/introduction/overview/
  - https://prometheus.io/docs/concepts/data_model/
  - https://prometheus.io/docs/concepts/metric_types/
  - https://prometheus.io/docs/instrumenting/exposition_formats/
  - https://prometheus.io/docs/specs/om/open_metrics_spec/
  - https://openmetrics.io/
  - https://prometheus.io/docs/prometheus/latest/querying/basics/
  - https://prometheus.io/docs/practices/naming/
  - https://grafana.com/docs/grafana/latest/fundamentals/
  - https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/create-dashboard/
  - https://prometheus.io/docs/visualization/grafana/
  - https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
  - https://www.cncf.io/projects/openmetrics/
  - https://www.cncf.io/blog/2024/09/18/openmetrics-is-archived-merged-into-prometheus/
  - https://github.com/prometheus/OpenMetrics
  - https://datatracker.ietf.org/doc/draft-richih-opsawg-openmetrics/
  - queries/第五批蒸餾目標.md
  - queries/第二批蒸餾目標.md
  - concepts/可觀測與OpenTelemetry.md
  - concepts/DORA五項與SLO.md
knowledge_class: factual
---

# Prometheus與OpenMetrics

本頁不是已採用管線，也不是本倉庫已落地的刮取或看板。檢索時間：2026-08-14。賬本樞紐是 [[queries/第五批蒸餾目標]] **B5-Prom**（13 條官方入口）。只談公開規範與線格式，不寫攻擊步驟、憑證或預設口令。

[[concepts/可觀測與OpenTelemetry]] 已寫：OTel 不是儲存或看板，後端可以是 Jaeger、Prometheus 或商業產品。本頁不當新發現「可用 Prometheus」，只展開**拉取、線格式、PromQL、Grafana 儀表**。不重抄 traces / span / `traceparent` / baggage / 瀏覽器 RUM。SLI / SLO 回 [[concepts/DORA五項與SLO]]。

## 一句話定義

Prometheus 是按 HTTP **拉取**採集的時序指標系統：樣本用指標名加標籤標識，用 PromQL 查詢。OpenMetrics 1.0 是收緊後的**線格式**，不是另一套儲存。Grafana OSS 是查、畫、告警、探索的視覺化面，不是指標庫。

## 為什麼重要

雲服務要把數值時序留下來排障，但不能假裝 100% 按請求計費。沒有統一 exposition，各程序各吐各的；沒有查詢語言，看板只能硬綁儲存。Prometheus 合同是刮取 + 文字/OM/protobuf + PromQL。OTel 指標模型與這條線格式靠相容專頁翻譯，不是同一合同。

## 權威入口

檢索 2026-08-14。B5-Prom 滿額 **13** 條。不映象採集行。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [Prometheus 總覽](https://prometheus.io/docs/introduction/overview/) | 本頁樞紐；拉取、單節點、不適合計費 |
| 2 | [資料模型](https://prometheus.io/docs/concepts/data_model/) | 名 + 標籤；UTF-8 是 v3 SHOULD 例外 |
| 3 | [指標型別](https://prometheus.io/docs/concepts/metric_types/) | 庫有 TYPE；伺服器多半當 float |
| 4 | [Exposition 格式](https://prometheus.io/docs/instrumenting/exposition_formats/) | 0.0.4 / OM 文字 / Prom protobuf |
| 5 | [OpenMetrics 1.0](https://prometheus.io/docs/specs/om/open_metrics_spec/) | 現行規範掛 prometheus.io |
| 6 | [openmetrics.io](https://openmetrics.io/) | 本輪仍自稱 sandbox；不寫成現行治理真身 |
| 7 | [PromQL 入門](https://prometheus.io/docs/prometheus/latest/querying/basics/) | instant / range；不是 OTLP |
| 8 | [命名慣例](https://prometheus.io/docs/practices/naming/) | 單位進名字；反對只放元資料 |
| 9 | [Grafana 基礎](https://grafana.com/docs/grafana/latest/fundamentals/) | 查、畫、告警、探索 |
| 10 | [建立儀表](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/create-dashboard/) | 面板 + 查詢 |
| 11 | [Prometheus 對 Grafana](https://prometheus.io/docs/visualization/grafana/) | 內建資料來源；不抄口令 |
| 12 | [OTel ↔ Prom/OM 相容](https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/) | 狀態 Mixed |
| 13 | [CNCF OpenMetrics](https://www.cncf.io/projects/openmetrics/) | 2024-07-02 Archived；配套 [併入 Prometheus](https://www.cncf.io/blog/2024/09/18/openmetrics-is-archived-merged-into-prometheus/) |

刻意未收：廠商報價、Mimir 叢集菜譜、預設登入口令、把 `openmetrics.io` 首頁當現行治理真身。

## 如何運作

### 拉取，不是推送預設

[Overview](https://prometheus.io/docs/introduction/overview/)：SoundCloud 起源，2016 進 CNCF（K8s 之後第二個託管專案）。時序 + 標籤；**HTTP scrape**；短命作業才走中間 Pushgateway；單節點自治、不依賴分散式儲存。適合純數值時序與排障；**不適合**要 100% 準確的按請求計費。圖由 Grafana 或其他 API 消費者畫。刮取目標若跑在集群裡，工作負載物件見 [[concepts/Kubernetes工作負載]]，本頁不升 Pod 合同。

Exposition 是 HTTP GET，語義面見 [[concepts/HTTP合同與問題詳情]]；本頁只管指標線格式，不談錯誤體。

### 資料模型與型別

[資料模型](https://prometheus.io/docs/concepts/data_model/)：時序由指標名 + 標籤唯一標識。名/標籤 MAY 用任意 UTF-8；**SHOULD** 仍走舊字元集。UTF-8 名是 Prometheus **v3.0.0** 才加，生態未齊時守 SHOULD。`__` 字首標籤保留。空標籤值 ≡ 無該標籤。冒號留給 recording rules。

[指標型別](https://prometheus.io/docs/concepts/metric_types/)：庫 API 四件 Counter / Gauge / Histogram / Summary。除 native histogram 外，**伺服器目前不消費 TYPE**，都壓成無型別 float 時序。Classic histogram 拆成 `_bucket{le=}` / `_sum` / `_count`；native 是複合樣本。v3.0 起 `le` / `quantile` 按 OpenMetrics Canonical Numbers 規範化。

### 三套線格式

[Exposition](https://prometheus.io/docs/instrumenting/exposition_formats/)：Prom 2.0 起預設文字 `text/plain;version=0.0.4`。OpenMetrics 文字 `application/openmetrics-text;version=1.0.0`，以 `# EOF` 收尾；≥2.5.0 可刮，≥2.23.0 可聯邦。Protobuf 在 2.0 曾標廢棄，**3.0 復活**並積極維護。3.0 起缺/不可解析 `Content-Type` **刮取失敗**。OM protobuf ≠ Prom protobuf。

[OpenMetrics 1.0](https://prometheus.io/docs/specs/om/open_metrics_spec/)：Published，2020-11。線格式，與傳輸無關；實現者 **MUST** 對文件化 URL 做 HTTP GET，**SHOULD** 為 `/metrics`。比 Prom 文字多 Info / StateSet / GaugeHistogram，以及 unit、exemplar、created timestamp。掃蕩式改 0.0.4 或 1.0 視為越界。文內寫「目的是帶進 IETF」；並注 **2.0 在 Prometheus 工作組進行**。Exemplars 可掛 Trace ID，只記「線格式可選掛鉤」，追蹤合同仍回 [[concepts/可觀測與OpenTelemetry]]。

### PromQL 與命名

[PromQL](https://prometheus.io/docs/prometheus/latest/querying/basics/)：instant / range；四型別 instant vector / range vector / scalar / string。`rate` 對 gauge float 不報錯，對 gauge histogram 會警告。預設 lookback 5 分鐘；目標不再吐某序列則標 stale。不是 OTLP。

[命名慣例](https://prometheus.io/docs/practices/naming/)：慣例不是強制。**SHOULD** 單位作字尾、計數加 `_total`、用基本單位。OTel 等約定**不把單位/型別寫進名字**；Prometheus **強烈建議寫進名字**，理由是 YAML 告警/錄製規則要能裸讀，以及避免 `process_cpu` 秒與毫秒撞名。高基數標籤（使用者 ID / 郵箱）明確警告。

### Grafana 是視覺化面

[Fundamentals](https://grafana.com/docs/grafana/latest/fundamentals/)：Grafana OSS 查詢、視覺化、告警、探索指標/日誌/追蹤，不管存在哪。Loki / Tempo / Mimir / Pyroscope 是旁專案，本頁不當新棧。

[建立儀表](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/create-dashboard/)：儀表 = 面板集合；**每個面板至少一條查詢**才能出圖。`/dashboards/` 總口本輪直抓超時，定義句來自同站檢索回填。

[Prometheus 對 Grafana](https://prometheus.io/docs/visualization/grafana/)：資料來源自 Grafana 2.5.0（2015-10-28）內建。面板裡寫 PromQL；7.2+ 建議 `$__rate_interval`。不抄預設登入口令。

十二因素把日誌寫成程序 `stdout` 事件流，見 [[concepts/十二因素與CAP]]；那是部署合同，不是 Prom 時序，也不是 Grafana 資料來源。

## 必須保留的衝突

- **OpenMetrics 歸屬**：[`openmetrics.io`](https://openmetrics.io/) 本輪仍寫「CNCF **sandbox** project」、已釋出、文字+protobuf。CNCF 專案頁寫 2018-08-10 入駐、**2024-07-02 Archived**；2024-09-18 社群文寫資產遷入 Prometheus，IETF RFC **未成**，倉庫現 [prometheus/OpenMetrics](https://github.com/prometheus/OpenMetrics)。1.0 正文仍寫「帶進 IETF」；[draft-richih-opsawg-openmetrics-00](https://datatracker.ietf.org/doc/draft-richih-opsawg-openmetrics/) 2021-05-29 **Expired**，不是 RFC。2.0 在 Prometheus 治理下進行。兩邊（獨立標準敘事 vs 已收回 Prom 格式）都留；不把該首頁寫成現行治理真身。
- **OTel 指標 vs Prometheus exposition**：OTel 主張能從 Prom/StatsD **無損譯入**；譯出到 Prom 線格式卻要改名、補字尾（例：`hvac.on` + 單位 `s` → `hvac_on_seconds_total`）。反向：Prom 名 **MUST** 作 OTLP Name 且 **SHOULD NOT** 改。相容專頁狀態 Mixed。Prometheus 命名頁公開反對「單位只放元資料」。兩邊都留，本頁不裁定誰是指標真身。
- **線格式三套**：0.0.4 文字 / OM 1.0 文字 / Prom protobuf。Protobuf 廢棄後又在 3.0 復活。
- **TYPE 是否生效**：庫與線格式有型別；伺服器除 native histogram 外仍當無型別 float。
- **Grafana 儀表專頁**：fundamentals 與 create-dashboard 核到；`/dashboards/` 與 datasource 專頁本輪超時，不假裝整節已映象。
- 本頁對映的是拉取與線格式；**不是**「工坊必須上 Prometheus / Grafana」。

## 例子

- 正例：程序在 `/metrics` 吐 0.0.4 或 OM 文字；Prometheus 按 HTTP GET 刮取；Grafana 面板寫 PromQL。
- 正例：counter 名帶 `_total` 與單位字尾，如 `http_requests_total`；告警規則能裸讀。
- 正例：短命批處理經 Pushgateway，長跑服務仍走拉取。
- 反例：把 OTel 指標名 `hvac.on` 原樣當 Prom 名，或把譯出改名當成「同一套指標」。
- 反例：把 Grafana、Mimir 或工坊日誌寫成 Prometheus 已落地。
- 反例：把 `openmetrics.io` 首頁寫成現行 CNCF sandbox 真身，或把 Expired IETF draft 寫成 RFC。

## 邊界與易混概念

- 不包括：本倉庫已實施的刮取、Pushgateway、Grafana——**沒有這回事**。
- 不包括：攻擊步驟、憑證、預設口令、廠商報價、Mimir 叢集搭建。
- 不包括：OTel traces / 傳播 / RUM（回 [[concepts/可觀測與OpenTelemetry]]）；SLO 燃燒（回 [[concepts/DORA五項與SLO]]）。
- 易混：Prometheus ≠ OTel。前者是拉取+儲存+PromQL；後者是生成/匯出框架。
- 易混：OpenMetrics ≠ 獨立現行專案。1.0 是線格式；歸屬說法衝突，見上節。
- 易混：Grafana ≠ 指標庫。它查別人的資料。
- 易混：庫 TYPE ≠ 伺服器型別。除 native histogram 外，伺服器當無型別 float。
- 易混：OM protobuf ≠ Prom protobuf。相容專頁寫 Prom 尚未支援 OM protobuf。
- 易混：十二因素 XI Logs（`stdout` 事件流）≠ Prom 時序。前者見 [[concepts/十二因素與CAP]]。
- 易混：Gateway 同步 REST 日誌 ≠ `/metrics` exposition。
- 區分：先問「在刮、在查、在畫，還是在跨模型翻譯」；再問「這是規範、過期草案，還是本倉產品門」。

## 對映到本倉庫

對映放最後，不當過濾器。行業合同對獨立站和嵌入 UI 都成立。本頁不宣佈已接線。**不要把本頁寫成工坊或髮卡已採用 Prometheus / OpenMetrics / Grafana。**

| 本倉物 | 實際在驗 | 不是 |
|---|---|---|
| `verify-repo` / `harness-smoke` | 靜態連結與協議接通 | Prometheus 刮取、PromQL |
| 工坊 Gateway 日誌 | 同步 REST 生命週期 | `/metrics` exposition 已落地 |
| 髮卡真機門 | 匯入、世界書、首條 | Grafana 儀表或 SLO 燃燒 |
| 卡內 fail closed | 宿主契約失敗則停 | Grafana 告警或錯誤預算 |
| [[concepts/C4與ADR]] | 說明方式入口 | 本頁不是「已決定上 Prometheus」的 ADR |
| 叢集工作負載 | Pod / Deployment 物件 | 已掛 scrape；見 [[concepts/Kubernetes工作負載]] |

第五批把 CSP、Push、Prom 同組為「站點防禦與觀測」：瀏覽器頭 / 推送五層 / 拉取線格式。瀏覽器防禦頭見 [[concepts/CSP與Trusted Types]]，與本頁線格式不是同一份。卡內 fail closed 仍歸 [[concepts/創意工坊與安全契約]]。工坊主路徑仍是同步 REST，見 [[concepts/後端架構名詞與工坊對照]] 與 [[comparisons/工坊架構該上與不該上]]。行業「何時用」仍看 [[comparisons/行業架構方案何時用]]，本頁不改那張表。

## 來源與證據

- 拉取、單節點、不適合計費：[Overview](https://prometheus.io/docs/introduction/overview/)。
- 名 + 標籤、UTF-8 是 v3 SHOULD：[資料模型](https://prometheus.io/docs/concepts/data_model/)。
- 庫 TYPE vs 伺服器 float：[指標型別](https://prometheus.io/docs/concepts/metric_types/)。
- 三套線格式與 3.0 `Content-Type` 失敗：[Exposition](https://prometheus.io/docs/instrumenting/exposition_formats/)。
- OpenMetrics 1.0 現行正文掛 prometheus.io：[OM 規範](https://prometheus.io/docs/specs/om/open_metrics_spec/)。
- PromQL instant / range，不是 OTLP：[查詢入門](https://prometheus.io/docs/prometheus/latest/querying/basics/)。
- 單位進名字、反對只放元資料：[命名慣例](https://prometheus.io/docs/practices/naming/)。
- Grafana 是視覺化面：Fundamentals、create-dashboard；Prometheus 內建資料來源頁。`/dashboards/` 本輪超時。
- OTel ↔ Prom 譯名與 Mixed：[相容專頁](https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/)。
- OpenMetrics 歸檔併入 Prometheus：CNCF 專案頁 2024-07-02 Archived；[2024-09-18 社群文](https://www.cncf.io/blog/2024/09/18/openmetrics-is-archived-merged-into-prometheus/)。`openmetrics.io` 本輪仍寫 sandbox。
- IETF 稿過期： [draft-richih-opsawg-openmetrics-00](https://datatracker.ietf.org/doc/draft-richih-opsawg-openmetrics/) 2021-05-29 Expired，不是 RFC。
- 查詢賬本：[[queries/第五批蒸餾目標]] B5-Prom；與 B2-Otel 的後端選項重疊見 [[queries/第二批蒸餾目標]]。
- 分路原稿仍在 [[10-收件箱/寫回候選/第五批-B5-Prom]]。

已知衝突見上節，不靜默覆蓋。工坊或髮卡真機未核任何刮取、Pushgateway 或 Grafana——本來就沒有已落地的管線可驗。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[queries/第五批蒸餾目標]]
- [[queries/第二批蒸餾目標]]
- [[10-收件箱/寫回候選/第五批-B5-Prom]]
- [[concepts/可觀測與OpenTelemetry]]
- [[concepts/DORA五項與SLO]]
- [[concepts/Web效能與INP]]
- [[concepts/十二因素與CAP]]
- [[concepts/Kubernetes工作負載]]
- [[concepts/CSP與Trusted Types]]
- [[concepts/gRPC與Connect]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/後端架構名詞與工坊對照]]
- [[concepts/C4與ADR]]
- [[concepts/創意工坊與安全契約]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
