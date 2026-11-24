---
title: Iceberg與湖倉
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
  - https://iceberg.apache.org/spec/
  - https://iceberg.apache.org/terms
  - https://iceberg.apache.org/rest-catalog-spec/
  - https://parquet.apache.org/docs/
  - https://parquet.apache.org/docs/file-format/
  - https://github.com/apache/parquet-format
  - https://arrow.apache.org/faq/
  - https://clickhouse.com/docs/reference/functions/table-functions/iceberg
  - https://clickhouse.com/docs/use-cases/data-lake/support-matrix
  - https://clickhouse.com/docs/engines/table-engines/integrations/iceberg
  - queries/第三批蒸餾目標.md
  - queries/第二批蒸餾目標.md
  - concepts/後端架構名詞與工坊對照.md
knowledge_class: factual
---

# Iceberg與湖倉

本頁不是已採用的表格式，也不是工坊要上物件儲存湖表的工單。檢索時間：2026-08-14。賬本見 [[queries/第三批蒸餾目標]] **B3-Ice**（約 5 條）。只談公開規範與引擎能力頁，不寫叢集搭建、憑證或攻擊步驟。

## 一句話定義

Apache Iceberg 是一份**表格式**規範：把分散式檔案系統或物件儲存裡一堆慢變的不可變檔案，當成一張可提交、可演進的表來管。湖倉是物件儲存 + 表格式 + 目錄 + 計算引擎疊在一起的架構稱呼，不是 Iceberg 產品名，也不是某家數倉。

## 為什麼重要

聽到「上湖倉」先問三層：檔案怎麼落盤、表狀態誰當真相、引擎讀到哪一版。Parquet 只管單個列存檔案；Iceberg 管「哪些檔案構成當前快照」；Catalog 管「這張表現在的元資料指標」。三者併成一詞，就會把「能讀 Parquet」寫成「已經上了 Iceberg」，或把 ClickHouse 整合寫成「規範已齊」。工坊和酒館卡 iframe **沒有**物件儲存湖表面；行業正當性仍保留，見文末對映。

分析表不是 OLTP 隔離切法，見 [[concepts/Postgres與多租戶]]。Iceberg snapshot 是一次提交的檔案集合，不是事件日誌重放，見 [[concepts/事件溯源與CQRS]]。

## 權威入口

B3-Ice 樞紐是 [Iceberg Table Spec](https://iceberg.apache.org/spec/)。下列 **5** 條是入口，不是教程，也不映象全文。Parquet 與第三波 [[queries/第三批蒸餾目標]] **B3-OLAP**（Arrow）重疊，不在本頁重蒸 Arrow。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [Iceberg Table Spec](https://iceberg.apache.org/spec/) | B3-Ice 樞紐；v1–3 已採納，v4 未採納 |
| 2 | [Iceberg Terms](https://iceberg.apache.org/terms) | Catalog / Snapshot / Manifest / Partition spec |
| 3 | [REST Catalog Spec](https://iceberg.apache.org/rest-catalog-spec/) | 跨語言目錄協議；OpenAPI，不是 Hive Thrift |
| 4 | [Parquet 文件](https://parquet.apache.org/docs/) | 列存**檔案**格式入口；規範真身在 parquet-format 倉 |
| 5 | [Parquet File Format](https://parquet.apache.org/docs/file-format/) | `PAR1` + row group + 檔案尾元資料；不是錶快照 |

並行回指，不升條：[Arrow FAQ](https://arrow.apache.org/faq/)（記憶體列式 ≠ 落盤 Parquet）；ClickHouse [iceberg 表函式](https://clickhouse.com/docs/reference/functions/table-functions/iceberg) 與 [support-matrix](https://clickhouse.com/docs/use-cases/data-lake/support-matrix)（引擎能力，不是規範）。Delta / Hudi 見 [[10-收件箱/寫回候選/第六批-B6-Delta]]，本頁不重抄。REST Catalog 的合同形狀見 [[concepts/OpenAPI與Arazzo]]、[[concepts/HTTP合同與問題詳情]]，本頁不重蒸 HTTP 錯誤體。

## 如何運作

### 三層不要並

| 層 | 官方心智 | 不是 |
|---|---|---|
| 檔案格式 | Parquet / Avro / ORC：單個不可變資料檔案怎麼編碼 | 不是表、不是目錄、不是引擎 |
| 表格式 | Iceberg：用元資料檔案跟蹤**哪些**資料/刪除檔案構成一次提交 | 不是查詢引擎，也不代替 Catalog |
| 目錄 | Catalog：按名字找到表，交出**當前**元資料位置 | 不是 snapshot 裡的檔案清單 |

[規範概述](https://iceberg.apache.org/spec/)：表狀態活在 metadata 檔案裡；每次變更寫一份新 metadata，再用原子交換替換指標。一次 snapshot 列出當時全部資料檔案。檔案清單先落在 manifest，再由一份 manifest list 彙總。規劃掃描時先看 manifest 統計，避免 O(n) 按分割槽目錄掃物件儲存。讀者不持鎖；寫者樂觀提交，指標已被別人換走就按新版本重試。

[Terms](https://iceberg.apache.org/terms)：Catalog 的第一職責是跟蹤一張表的當前 metadata。REST / Hive Metastore / JDBC / Nessie 都是實現，不是四種表格式。[REST Catalog](https://iceberg.apache.org/rest-catalog-spec/) 把實現細節收到服務端，客戶端只講一份 OpenAPI；官方把它類比 Hive 的 Thrift 協議，不是 HMS 本身。

分割槽是表配置（hidden partitioning）：讀計劃用資料謂詞，不靠路徑字串。v1 起資料檔案格式是 Parquet、Avro、ORC。行級刪除在 v2 起用 delete file（位置刪除或等值刪除）；v3 起位置刪除還可編碼成 deletion vector。

### 格式版本

規範原文（2026-08-14 抓取）：**Versions 1, 2 and 3 of the Iceberg spec are complete and adopted by the community. Version 4 is under active development and has not been formally adopted.**

| 版 | 規範一句話 | 本頁用法 |
|---|---|---|
| v1 | 用不可變檔案管分析表 | 基線；升 v2 後 v1 檔案仍合法 |
| v2 | 行級更新/刪除；delete file | 位置刪除 + 等值刪除 |
| v3 | 擴充套件型別與能力 | variant / 幾何、列預設值、row lineage、**binary deletion vectors**、表加密鍵 |
| v4 | 元資料結構重整 | **未正式採納**；已寫相對路徑，便於搬表而不重寫元資料樹 |

版本號只在會破壞向前相容（舊讀者讀不懂新表）時遞增。引擎未實現的能力，表可以繼續按舊版寫。v4 正文裡已出現相對路徑規則，不等於 v4 已被社群採納。

### Parquet 與 Arrow

[Parquet](https://parquet.apache.org/docs/) 是列存**檔案**格式。官方寫明規範在 [parquet-format](https://github.com/apache/parquet-format) 倉，不是 Iceberg spec 的一章。Iceberg 用它當資料檔案容器之一。

[Arrow FAQ](https://arrow.apache.org/faq/)：Parquet 不是執行時記憶體格式；Arrow 才是記憶體列式，常與 Parquet 成對出現（盤上 Parquet，記憶體 Arrow）。Arrow 主文件版本釘在 B3-OLAP，本頁不升條、不寫 v25 / JS v21。

## 必須保留的衝突

- **v1–3 已採納，v4 未採納。** 真源是 Iceberg spec 文首 Format Versioning。v4 章節已出現在同一頁，仍寫「under active development and has not been formally adopted」。不要把「頁上有 v4 節」寫成「v4 已釋出 / 已採納」。
- Iceberg 規範已採納 v3，ClickHouse 官方仍寫只讀 v1/v2。表函式頁開篇是 read-only 介面，並寫 currently supports reading v1 and v2；[support-matrix](https://clickhouse.com/docs/use-cases/data-lake/support-matrix) 的 Format versions 寫 **v1 and v2 supported. V3 not supported**。兩邊都留，不併成「ClickHouse 已跟規範 v3」。
- 同一份 ClickHouse 矩陣另標 INSERT 自 26.2 為 Beta、建表/DELETE 為 Experimental。這與「read-only」開篇句並存，不靜默覆蓋 B3 那句「只讀 v1/v2」。
- Parquet ≠ Iceberg ≠ Arrow。檔案、表、記憶體三層。
- Iceberg ≠ Delta ≠ Hudi。跨格式元資料生成歸 B6-Delta，本頁不裁定誰是湖倉標準。
- Flink 文件樹裡的 Iceberg 聯結器舊路徑 404；用法在 Iceberg 專案頁。見 [[10-收件箱/寫回候選/第四批-B4-DataEng]]，不改本頁樞紐。

## 例子

- 正例：物件儲存上多份 Parquet，Iceberg snapshot 列出當前集合；讀引擎向 Catalog 要 metadata 指標，按 snapshot 規劃檔案，不掃整個桶。
- 正例：刪一行時 v2 追加 position delete file，或 v3 寫 deletion vector，不必立刻重寫整份資料檔案。
- 正例：Spark 與 Trino 配同一 REST Catalog，看到同一張表的當前 metadata。
- 反例：能用 DuckDB 讀一個 `.parquet`，就聲稱「已經上 Iceberg / 湖倉」。
- 反例：把規範已採納的 v3（deletion vector、variant）當成 ClickHouse 現網能力。
- 反例：把工坊物件儲存裡的角色卡包當成湖表，或把卡變數 `stat_data` 當成 Iceberg snapshot。

## 邊界與易混概念

- 不包括：叢集搭建、憑證、攻擊步驟、基準營銷、把某引擎寫成「本倉庫已採用」。
- 不包括：Delta PROTOCOL、Hudi timeline、XTable / UniForm 正文（B6-Delta）。
- 不包括：DuckDB / Arrow / SQLite 正文（B3-OLAP）；Flink / dbt 編排（B4-DataEng）。
- 易混：湖倉（架構稱呼）≠ Iceberg（表格式）≠ ClickHouse / DuckDB（引擎）≠ Parquet（檔案）。
- 易混：Catalog 的「當前指標」≠ snapshot 的「檔案集合」≠ Parquet footer 的「列塊偏移」。
- 易混：v2 position delete file ≠ v3 deletion vector ≠ Delta `deletionVectors` ≠ Hudi MoR log。
- 易混：REST Catalog 協議 ≠ 某一個商業目錄產品，也 ≠ 工坊同步 REST。
- 易混：湖表物件儲存 ≠ 工坊釋出包物件儲存。
- 易混：Iceberg snapshot ≠ [[concepts/事件溯源與CQRS]] 的事件日誌；分析表 ≠ [[concepts/Postgres與多租戶]] 的倉/池/橋。
- 易混：REST Catalog 的 OpenAPI ≠ [[concepts/gRPC與Connect]] 的 RPC 合同。
- 易混：Parquet 列存檔案 ≠ [[concepts/媒體格式與編解碼]] 的圖/音影片容器與編解碼。
- 易混：Iceberg 樂觀提交換指標 ≠ [[concepts/十二因素與CAP]] 的無狀態程序或 CAP 分割槽取捨。
- 區分：先問檔案、表、目錄、引擎哪一層；再問規範版與引擎宣告的版是否同一句。

## 對映到本倉庫

工坊當前：Gateway 同進程、目錄靜態、包進物件儲存、同步 REST。物件儲存裡是釋出包，不是 Iceberg 表。酒館卡 iframe 無叢集、無湖表掃描面。不上 Iceberg runtime、不上 REST Catalog、不把卡包目錄改成 snapshot。這是產品落點，不是對錶格式的行業否定。

| 本倉物 | 實際在做 | 不是 |
|---|---|---|
| [[concepts/後端架構名詞與工坊對照]] | 同步 REST + 包進物件儲存 | 湖表、Catalog、snapshot |
| [[comparisons/工坊架構該上與不該上]] | 釋出 / 稽核要同步可見 | 多引擎共用一份分析表 |
| [[concepts/Postgres與多租戶]] | 弱多租戶靠所有權 | 用湖表分割槽冒充租戶隔離 |
| [[concepts/OpenAPI與Arazzo]] | 公共 HTTP 以後要補合同 | REST Catalog 已落地 |
| [[concepts/C4與ADR]] | 說明方式入口 | 本頁不是「已決定上湖倉」的 ADR |
| 髮卡 recipe / 世界書 | 條目與元件裝配 | Iceberg manifest |

以後若做「多引擎共用一份分析表」，再單獨立項，不從本頁自動推出。引擎若跑在集群裡，工作負載合同見 [[concepts/Kubernetes工作負載]]；平臺可觀測見 [[concepts/可觀測與OpenTelemetry]]、[[concepts/Prometheus與OpenMetrics]]。行業「何時用」仍看 [[comparisons/行業架構方案何時用]]。**不要把本頁寫成工坊或髮卡已採用 Iceberg / 湖倉。**

## 來源與證據

- 表格式與版本句：Iceberg spec 文首 Format Versioning；v1–v4 各節；Overview 的 metadata 原子交換。檢索 2026-08-14。
- Catalog / REST：Terms「tracking a table's current metadata」；REST Catalog Spec「common API (using the OpenAPI spec)」。
- Parquet：專案文件指 parquet-format 倉為規範真身；File Format 頁給 `PAR1` 佈局。
- Arrow 對照：FAQ「Parquet is not a runtime in-memory format」。
- ClickHouse：表函式開篇 read-only + reading v1 and v2；矩陣 Format versions = v1/v2，V3 not supported。
- 賬本：[[queries/第三批蒸餾目標]] B3-Ice / B3-CH / B3-OLAP；第二批已點名「湖倉/ClickHouse」。Delta / Hudi 分路仍在 [[10-收件箱/寫回候選/第六批-B6-Delta]]；Flink 舊路徑見 [[10-收件箱/寫回候選/第四批-B4-DataEng]]。

已知衝突見上節，不靜默覆蓋。未跑 ClickHouse / Spark / 物件儲存真機。v4 郵件列表單條投票（相對路徑等）不等於整份 v4 已採納。

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
- [[10-收件箱/寫回候選/第六批-B6-Delta]]
- [[10-收件箱/寫回候選/第四批-B4-DataEng]]
- [[concepts/後端架構名詞與工坊對照]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/OpenAPI與Arazzo]]
- [[concepts/Postgres與多租戶]]
- [[concepts/事件溯源與CQRS]]
- [[concepts/Redis與日誌佇列]]
- [[concepts/ORM三面]]
- [[concepts/向量檢索入口]]
- [[concepts/十二因素與CAP]]
- [[concepts/Kubernetes工作負載]]
- [[concepts/可觀測與OpenTelemetry]]
- [[concepts/Prometheus與OpenMetrics]]
- [[concepts/gRPC與Connect]]
- [[concepts/媒體格式與編解碼]]
- [[concepts/C4與ADR]]
- [[concepts/Saga三義與補償]]
