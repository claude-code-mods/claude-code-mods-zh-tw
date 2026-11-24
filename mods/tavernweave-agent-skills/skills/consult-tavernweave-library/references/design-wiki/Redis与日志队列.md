---
title: Redis與日誌佇列
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
  - https://redis.io/docs/latest/develop/data-types/
  - https://redis.io/docs/latest/develop/data-types/compare-data-types/
  - https://redis.io/docs/latest/develop/use-cases/cache-aside/
  - https://redis.io/docs/latest/develop/use-cases/job-queue/
  - https://redis.io/docs/latest/develop/pubsub/
  - https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
  - https://redis.io/docs/latest/develop/data-types/streams/
  - https://redis.io/docs/latest/develop/use-cases/streaming/
  - https://redis.io/legal/licenses/
  - https://kafka.apache.org/intro/
  - https://kafka.apache.org/43/design/design/
  - https://docs.nats.io/nats-concepts/what-is-nats
  - https://docs.nats.io/nats-concepts/subjects
  - https://docs.nats.io/nats-concepts/jetstream
  - https://www.rabbitmq.com/tutorials/amqp-concepts
  - https://www.rabbitmq.com/docs/exchanges
  - https://www.rabbitmq.com/docs/streams
  - queries/第三批蒸餾目標.md
  - concepts/後端架構名詞與工坊對照.md
knowledge_class: factual
---

# Redis與日誌佇列

本頁不是已採用快取或 broker，也不是工坊要上 Redis / Kafka 的工單。檢索時間：2026-08-14。賬本：[[queries/第三批蒸餾目標]] **B3-Redis**（約 16 條）。樞紐 [Redis data types](https://redis.io/docs/latest/develop/data-types/)。排除第二批 Saga / Outbox（見 [[concepts/Saga三義與補償]]）。不收攻防、憑證、未授權訪問。

## 一句話定義

Redis 是**資料結構伺服器**：同一程序裡用字串、雜湊、列表、集合、有序集合、流等型別做事。行業裡的「佇列」是**領取後出隊**；「日誌」是**只追加、可回放**。兩者都可能跑在 Redis 上，但不是同一種合同。

## 為什麼重要

口語常把 Redis 說成「快取」，把 Kafka / Streams / 列表任務佇列說成同一種「訊息」。官方分層不是這樣：快取是旁路模式；列表任務佇列是單工領取；Streams 與 Kafka topic 是追加日誌；Pub/Sub 是至多一次、無歷史。先分清**型別 / 佇列 / 日誌 / 瞬時廣播 / 磁碟持久化 / 軟體許可**，才不會把客戶端 MIT、舊 persistence 路徑或 0.8 設計檔當成現行真源。

## 權威入口

檢索時間：2026-08-14。下列為可點真源，不是映象。許可另釘 [redis.io/legal/licenses](https://redis.io/legal/licenses/)。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [資料型別總覽](https://redis.io/docs/latest/develop/data-types/) | B3 樞紐。Redis 自稱 data structure server |
| 2 | [型別對照](https://redis.io/docs/latest/develop/data-types/compare-data-types/) | 時間序 + 多消費者協同讀才選 Streams；否則 Lists |
| 3 | [旁路快取](https://redis.io/docs/latest/develop/use-cases/cache-aside/) | 應用先讀快取，未命中再讀源並回填；語言無關樞紐 |
| 4 | [任務佇列](https://redis.io/docs/latest/develop/use-cases/job-queue/) | 列表存待領 ID，`BLMOVE` 原子搬到處理列表 |
| 5 | [Pub/Sub](https://redis.io/docs/latest/develop/pubsub/) | 至多一次、無歷史 |
| 6 | [持久化](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/) | 現行 OSS 頁；舊 `/docs/manual/persistence/` **404** |
| 7 | [Streams](https://redis.io/docs/latest/develop/data-types/streams/) | 5.0 起追加日誌；消費組可至少一次、可認領 |
| 8 | [流式用例](https://redis.io/docs/latest/develop/use-cases/streaming/) | 對照 Pub/Sub 與 job-queue |
| 9 | [Kafka Intro](https://kafka.apache.org/intro/) | 事件 / 主題 / 分割槽；Apache-2.0；現行 4.3 |
| 10 | [Kafka 4.3 Design](https://kafka.apache.org/43/design/design/) | 設計真身：持久化、投遞語義、日誌壓縮 |
| 11 | [What is NATS](https://docs.nats.io/nats-concepts/what-is-nats) | Core 至多一次、無佇列儲存 |
| 12 | [Subjects](https://docs.nats.io/nats-concepts/subjects) | `*` / `>` |
| 13 | [JetStream](https://docs.nats.io/nats-concepts/jetstream) | 至少一次、可回放 |
| 14 | [AMQP 0-9-1 模型](https://www.rabbitmq.com/tutorials/amqp-concepts) | 交換機 / 佇列 / 繫結；不是 AMQP 1.0 |
| 15 | [Exchanges](https://www.rabbitmq.com/docs/exchanges) | 當時文件頭 4.3 |
| 16 | [RabbitMQ Streams](https://www.rabbitmq.com/docs/streams) | 只追加；補佇列不是替 |

上表 **16** 條。B3-Redis 的採集行不在本頁映象。

## 如何運作

### Redis 先選型別

[資料型別總覽](https://redis.io/docs/latest/develop/data-types/) 把自己寫成 data structure server。通用面：字串、雜湊、列表、集合、有序集合、流；另有 JSON、時序、向量集、陣列、機率結構。專用面（地理 / 機率 / 時序 / 向量）不要拿來當通用佇列。

[對照選型](https://redis.io/docs/latest/develop/data-types/compare-data-types/) 的序列決策樹：要時間序或**多個消費者協同讀**，才選 Streams；否則用 Lists。官方排序口：Lists 適合佇列、棧、線性結構；Streams 適合日誌、時序、只追加，並自帶消費組、至少一次。

| 模式 | 官方入口 | 合同 | 不是 |
|---|---|---|---|
| 旁路快取 | [cache-aside](https://redis.io/docs/latest/develop/use-cases/cache-aside/) | 應用先讀快取，未命中再讀源並回填 | 語言客戶端專頁不是總入口 |
| 任務佇列 | [job-queue](https://redis.io/docs/latest/develop/use-cases/job-queue/) | 列表存待領 ID，`BLMOVE` 原子搬到處理列表；元資料在雜湊 | 專用 broker 的替身；文內仍提已棄用的 `BRPOPLPUSH` |
| 釋出訂閱 | [Pub/Sub](https://redis.io/docs/latest/develop/pubsub/) | 至多一次；訂閱者當時不在就永不見 | 佇列或日誌；7.0+ 分片 Pub/Sub 只縮傳播範圍 |
| 流 | [Streams](https://redis.io/docs/latest/develop/data-types/streams/) | 5.0 起追加日誌；消費組可至少一次、可認領 | Kafka 分割槽的等價物（官方自有對照節） |

[流式用例](https://redis.io/docs/latest/develop/use-cases/streaming/) 對照：Pub/Sub 無歷史；job-queue 是單工領取；要扇出且各池獨立進度，才用 Streams 消費組。

### 佇列 ≠ 日誌

兩邊都留，不要併成「訊息中介軟體」一詞。

- **佇列**：領取是破壞性的，設計趨向空。Redis 列表任務佇列、RabbitMQ 預設 queue、NATS queue group（組名是分活標籤，Core **不落盤**）走這條。
- **日誌**：只追加，消費不刪條目，多遊標可回放。Redis Streams、[Kafka topic](https://kafka.apache.org/intro/)（官方寫：不像傳統訊息系統，消費後不刪）、[RabbitMQ Streams](https://www.rabbitmq.com/docs/streams)（官方：補佇列不是替）、NATS JetStream 走這條。
- **瞬時廣播**：Redis Pub/Sub、Core NATS。無 broker 佇列、無歷史。不是上兩條的弱化版。

AMQP 0-9-1 把訊息發到 [exchange](https://www.rabbitmq.com/docs/exchanges)（教程常比郵箱），再按 binding 進 queue。[模型頁](https://www.rabbitmq.com/tutorials/amqp-concepts) 是 0-9-1，不是 AMQP 1.0。NATS / Pulsar 深頁第五批已收，本頁不重抄。

Kafka topic 是追加日誌，仍**不是**事件溯源的事件儲存（缺按實體查流與樂觀併發），見 [[concepts/事件溯源與CQRS]]。

### Kafka 設計真身在 4.3

[Intro](https://kafka.apache.org/intro/)：事件、主題、分割槽；主題多生產者多訂閱者。`/documentation/` 現與 `/intro/` 同文，舊 `#design` 錨點失效。設計真身是 [4.3 Design](https://kafka.apache.org/43/design/design/)（頁尾 2026-05-22 加 4.3 文件）：持久化、投遞語義、日誌壓縮。`/08/design/` 仍活，但是 0.8 死檔，勿引。

### 持久化 ≠ 訊息日誌

現行 OSS 頁：[persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)。舊路徑 `/docs/manual/persistence/` **404**。四檔：RDB 快照、AOF 寫日誌、合用、關閉（快取常見）。官方勸：要接近 PostgreSQL 級安全就 RDB+AOF；能接受數分鐘丟失可用 RDB；**不鼓勵單開 AOF**。7.0 多段 AOF；頁內另有 `BACKUP` 族。外鏈的 Redis Software 持久化 UI 是商業產品頁，不當 OSS 真源。AOF 是**程序如何落盤**；Streams / Kafka log 是**訊息如何被讀**。不要把兩層「log」併成一詞。

### Redis ≥8 是三許可，勿標 MIT

[Licenses](https://redis.io/legal/licenses/) 表：

| 版本 | 稱呼 | 許可 |
|---|---|---|
| ≤7.2 | Redis | BSD-3-Clause |
| 7.4 | Redis Community Edition | RSALv2 **或** SSPLv1 |
| ≥8 | Redis Open Source | RSALv2 **或** SSPLv1 **或** AGPLv3 |

RSALv2 / SSPLv1 官方自寫**不是**開源許可；AGPLv3 才是 OSI 認可的第三選項。客戶端（redis-py、ioredis、jedis 等）多是 MIT / BSD，**不要**把客戶端許可抄到伺服器上。本頁不收 Valkey 分叉專章（採集缺口）。

## 必須保留的衝突

- **佇列 ≠ 日誌。** 列表 / `BLMOVE`、AMQP queue 是破壞性領取；Streams / Kafka / RabbitMQ Stream / JetStream 是隻追加可回放。Pub/Sub 與 Core NATS 兩邊都不是。
- **Redis ≥8 三許可（RSALv2 / SSPLv1 / AGPLv3），勿標 MIT。** ≤7.2 才是 BSD-3；7.4 雙許可；客戶端 MIT 不傳到伺服器。
- 舊 persistence 路徑 404；現行頁勸勿單開 AOF，並外鏈商業頁。
- Kafka `/documentation/` 現等於 intro；設計在 `/43/design/design/`，不是 `/08/design/`。
- Kafka topic ≠ 事件儲存。日誌可回放，仍缺按實體查流與樂觀併發，見 [[concepts/事件溯源與CQRS]]。
- 本倉不上佇列主路徑，不是對行業方案的否定。
- 本頁對映工坊同步 REST 的**後加通知 / 匯出**；**不是**「工坊必須上 Redis 或 Kafka」。

## 例子

- 正例：會話或熱點讀用旁路快取；發信、匯出用列表 + `BLMOVE`；要回放或消費組用 Streams。
- 正例：跨服務事件流、要按鍵保序且消費後仍在，用 Kafka 4.3 主題，不當成 Redis 列表。
- 反例：把 Redis ≥8 標成 MIT，或把 redis-py 的 MIT 寫成伺服器許可。
- 反例：引用 `/docs/manual/persistence/`，或把 `/08/design/` 當現行 Kafka 設計。
- 反例：用 Pub/Sub 當任務佇列，或把 Streams 說成「就是佇列」。
- 反例：把工坊釋出稽核改成佇列主路徑。稽核要同步可見，見 [[comparisons/工坊架構該上與不該上]]。

## 邊界與易混概念

- 不包括：Redlock 爭議文、Streams 8.6 冪等專頁、Valkey 專章、攻防、憑證、本倉上 Redis 的實施工單。
- 不包括：Saga / Outbox / Inbox（第二批；正式名 Idempotent Consumer）。
- 易混：佇列 ≠ 日誌 ≠ Pub/Sub ≠ AOF。
- 易混：NATS queue group ≠ AMQP queue。前者是興趣圖上的分活名。
- 易混：RabbitMQ Stream ≠ 預設 queue。宣告時 `x-queue-type=stream` 釘死。
- 易混：Redis Software 持久化頁 ≠ OSS persistence 概念頁。
- 易混：Kafka topic ≠ 事件溯源事件儲存。
- 區分：先問「領取後還在不在、要不要回放」；再問「這是行業合同還是本倉產品門」。

## 對映到本倉庫

工坊通訊主路徑是同步 REST（`list` / `detail` / `create` / `update` / `withdraw` / `review`）。[[concepts/後端架構名詞與工坊對照]] 寫：訊息佇列只適合後加通知、匯出、郵件，**不當同步 API 替身**。[[comparisons/行業架構方案何時用]] 同行。AsyncAPI 的 Kafka/AMQP binding 是合同描述，見 [[concepts/GraphQL與非同步事件合同]]，不是本頁真源。稽核列舉是產品狀態機，見 [[concepts/狀態機與SCXML]]，不是 broker 消費組。

| 本倉物件 | 實際是 | 不是 |
|---|---|---|
| 釋出 / 稽核 | 同步 REST + 狀態機 | Redis 列表或 Kafka 主題 |
| 卡 iframe / HUD | 宿主頁掛載 | Pub/Sub 通道 |
| Wiki / 蒸餾門 | 來源可定位 + `verify-repo` | 消費組至少一次 |
| 髮卡 JSON/PNG | 回封產物 | RDB / AOF |

**不要把本頁寫成工坊要上 Redis 或 Kafka。** 「現在不上」不是「這些不是正當行業方案」。

## 來源與證據

- 型別與選型：資料型別總覽、對照決策樹。
- 四種用法：cache-aside、job-queue（`BLMOVE`）、Pub/Sub、Streams / 流式用例。
- 持久化：現行 OSS persistence 頁；本輪復現 `/docs/manual/persistence/` 404。
- Kafka：Intro 與 4.3 Design（頁尾 2026-05-22）；`/08/design/` 是 0.8 死檔。
- NATS：What is NATS / Subjects / JetStream。
- RabbitMQ：AMQP 0-9-1 模型、Exchanges、Streams。
- 許可：[redis.io/legal/licenses](https://redis.io/legal/licenses/)。
- 查詢賬本：[[queries/第三批蒸餾目標]] B3-Redis。

已知衝突見上節，不靜默覆蓋。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區

## 相關內容

- [[queries/第三批蒸餾目標]]
- [[concepts/後端架構名詞與工坊對照]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/工坊架構該上與不該上]]
- [[concepts/GraphQL與非同步事件合同]]
- [[concepts/Saga三義與補償]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/事件溯源與CQRS]]
- [[concepts/狀態機與SCXML]]
