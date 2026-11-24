---
title: ORM三面
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
  - https://www.prisma.io/docs/orm
  - https://www.prisma.io/docs/orm/overview/introduction/what-is-prisma
  - https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
  - https://www.prisma.io/docs/orm/next
  - https://www.prisma.io/docs/next
  - https://www.prisma.io/docs/orm/next/reference
  - https://www.prisma.io/docs/orm/next/fundamentals/reading-data
  - https://www.prisma.io/docs/orm/next/reference/orm-client
  - https://orm.drizzle.team/docs/overview
  - https://orm.drizzle.team/docs/data-querying
  - https://orm.drizzle.team/docs/rqb
  - https://kysely.dev/docs/intro
  - https://kysely.dev/docs/recipes/relations
  - queries/第三批蒸餾目標.md
  - concepts/後端架構名詞與工坊對照.md
knowledge_class: factual
---

# ORM三面

本頁不是已採用技術，也不是工坊必須改資料層的工單。檢索時間：2026-08-14。賬本見 [[queries/第三批蒸餾目標]]（B3-ORM）。只談公開文件裡的查詢面自稱，不寫攻擊、繞過或憑證。

## 一句話定義

「ORM 三面」不是一個標準，而是三家 TypeScript 資料層對自己的定位：Prisma 同時活著 **7 GA** 與 **Next EA** 兩套產品查詢面；Drizzle **自稱**同時有 SQL-like 與 Relational 的雙面 ORM；Kysely **明文**「不是 ORM」，只做型別安全的 SQL 查詢構建器。

## 為什麼重要

聽到「上個 ORM」先問對方指哪一面。巢狀物件 Client、鏈式 model API、SQL 形 builder、關係 `with`、以及「我根本不是 ORM」，生成的 SQL 和對呼叫方的承諾都不一樣。先分清**產品代際**和**自稱品類**，才不會把 Early Access 寫成現行 GA，或把查詢構建器寫成關係對映器。

## 權威入口

檢索日 2026-08-14。下列 13 條是本頁真源。憑證、連線串、攻擊面不收。

| # | 入口 | 釘什麼 |
|---|---|---|
| 1 | [Prisma ORM 總覽](https://www.prisma.io/docs/orm) | 本區文件釘 **Prisma 7** 為現行 **generally available**。橫幅另推 Next EA。Client 例是 `prisma.user.findMany({ include })`。直連必須給 driver adapter。 |
| 2 | [What is Prisma ORM](https://www.prisma.io/docs/orm/overview/introduction/what-is-prisma) | 7 的查詢面：生成 Client，返回普通物件。`findMany` / `create` / `update` 吃巢狀 `where` / `include` / `data`。Client 與 Migrate 開源；**Studio 不開源**。 |
| 3 | [Upgrade to Prisma ORM 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) | 7 是破壞升級：`prisma-client` 生成器、`output` 必填、adapter 必給。**v7 尚不支援 MongoDB**，官方寫繼續用 v6。 |
| 4 | [What is Prisma Next](https://www.prisma.io/docs/orm/next) | Next 是下一主版本，現為 **Early Access**。要留在現行 GA 就繼續 Prisma 7。合同優先，不是 7 的小改。 |
| 5 | [Introduction to Prisma Next](https://www.prisma.io/docs/next) | 同一 EA：又寫 Next 是**新專案推薦起點**、通往 Prisma 8。與「GA 仍是 7」並存，兩邊留。 |
| 6 | [Prisma Next API reference](https://www.prisma.io/docs/orm/next/reference) | Next **自寫 three query surfaces**：ORM client（`where` / `create` / `include`，PG+Mongo）；SQL query builder（`select` / `innerJoin`，**僅 PG**）；pipeline builder（Mongo，走 `db.query`）。再往下才是 raw。 |
| 7 | [Reading data with Prisma Next](https://www.prisma.io/docs/orm/next/fundamentals/reading-data) | 給 7 使用者的對照：`findMany` → `.all()`，`findFirst` / `findUnique` → `.first()`。 |
| 8 | [Prisma Next ORM client](https://www.prisma.io/docs/orm/next/reference/orm-client) | 入口是 `postgres(...)` / `mongo(...)` 之後的 **`.orm` facet**（如 `db.orm.public.User.where({ email }).first()`），不是 7 的 `new PrismaClient().user.findUnique`。 |
| 9 | [Why Drizzle](https://orm.drizzle.team/docs/overview) | 自稱 **the only ORM with both relational and SQL-like query APIs**。SQL-like 是核心；Queries API 管巢狀關係。宣稱關係查詢「exactly 1 SQL query」。 |
| 10 | [Drizzle Query Data](https://orm.drizzle.team/docs/data-querying) | 兩套寫法並列：`db.select().from().leftJoin()` 對 SQL；`db.query.users.findMany({ with })` 對巢狀。由呼叫方選。 |
| 11 | [Drizzle Queries / RQB](https://orm.drizzle.team/docs/rqb) | 關係查詢是 schema + query builder 的**可選擴充套件**。`with` 裡的列必須走回調引數，不能直接用匯入的 table 物件。 |
| 12 | [Kysely Introduction](https://kysely.dev/docs/intro) | 自稱 type-safe、autocomplete-friendly 的 **TypeScript SQL query builder**，受 Knex 啟發。不是 ORM 頁。 |
| 13 | [Kysely Relations 配方](https://kysely.dev/docs/recipes/relations) | 原文全大寫：**Kysely IS NOT an ORM. Kysely DOES NOT have the concept of relations.** 巢狀靠方言 JSON 函式；`jsonArrayFrom` / `jsonObjectFrom` 是 SQL 助手，不是關係 API。 |

上表 **13** 條。B3-ORM 採集行不在本頁映象。

## 如何運作

### Prisma 7 GA

Schema 建模 → `prisma generate` 出 Client → `prisma.user.findMany({ where, include })`。查詢面是**巢狀物件**：過濾、關係和寫入都塞進一個引數袋。7 起直連必須注入 driver adapter；連線 URL 走 `prisma.config.ts`，不在此抄。Mongo 不在 7 的 GA 面裡。

### Prisma Next EA

Schema（或 TypeScript）先編成可 diff 的合同，再對合同寫鏈式查詢。日常走 `.orm`：`.where().all()` / `.first()`。官方把 7 的 `findMany` / `findUnique` 對映到這兩個 terminal。要 join / 聚合且 ORM client 沒露出來，走 SQL query builder（現只釘 PostgreSQL）。Mongo 聚合走 pipeline builder。這是另一套產品 API，不是 7 的別名。

### Drizzle

核心是 SQL-like：`select` / `from` / `join` 與生成 SQL 接近 1:1。另給 `db.query.*.findMany({ with })` 取巢狀行，並宣稱單條 SQL。兩面都自稱 ORM。關係面是 opt-in，不是唯一入口。

### Kysely

你自備 `Database` 介面（或 codegen）。執行時 JS 型別由 `pg` / `mysql2` 等驅動決定，Kysely **不改**執行時輸出型別。寫法是 `selectFrom('person').selectAll().execute()`。沒有「關係」概念；要巢狀就自己寫 JSON 子查詢。入門頁還寫：不要把庫憑證寫進原始碼。本頁不收連線串。

## 行業何時該上

對照 [[concepts/後端架構名詞與工坊對照]] 的三層「領域常綁 ORM」——那是分層代價，不是本頁三家已採用。行業總表見 [[comparisons/行業架構方案何時用]]。

| 面 | 何時該上 | 不該當成 |
|---|---|---|
| Prisma 7 Client | 要 schema-first、生成型別、巢狀 `include`，且接受 GA 工具鏈 | Next EA；Mongo 已在 7 就緒 |
| Prisma Next | 評 EA、或新專案願跟合同/鏈式 API 走 | 現行 GA；「已經是 Prisma 8」 |
| Drizzle 雙面 | 要 SQL 形 builder，偶爾用 `with` 取巢狀 | 「唯一真正的 ORM」已成行業標準（這是自稱） |
| Kysely | 只要型別安全 SQL，自己管 schema / 遷移 / 關係 | ORM；有 `jsonArrayFrom` 就等於關係對映 |
| 原始驅動 / SQL | 每條語句都要手寫、或引擎特性無封裝 | 「沒有型別就不能查」 |

N+1、物件-關係阻抗、洩漏的抽象都是行業頁已寫的代價，不是工坊禁令。

## 必須保留的衝突

- 賬本寫「7 GA 與 Next EA **兩套**查詢面」；Next 參考頁自寫產品內 **three query surfaces**。跨版本是兩套產品 API（7 巢狀物件 vs Next 鏈式）；Next 產品內是三面。兩邊留。
- `/docs/next` 寫 Next 是新專案推薦起點；`/docs/orm` 與 upgrade 釘 GA 仍是 7，Mongo 還要留 v6。
- Drizzle 自稱「唯一同時有 relational + SQL-like 的 ORM」；Prisma Next 也公開 ORM client + SQL query builder。自稱兩邊留，本頁不判誰贏。
- Kysely 提供 JSON 巢狀助手 ≠ 它承認關係或自稱 ORM。
- 「工坊現在不上這些庫」不是「行業不該用 ORM / 查詢構建器」。
- Prisma 7 巢狀物件 Client ≠ Prisma Next `.orm` 鏈式 ≠ Next SQL QB ≠ Next Mongo pipeline。
- Prisma 7 GA ≠ Prisma Next EA ≠ Prisma 8（8 尚未作為現行釋出釘在本批文件）。
- 本頁對映工坊資料訪問詞表；**不是**「工坊必須上 Prisma / Drizzle / Kysely」。

## 例子

- 正例：生產要穩定生成 Client 和 `findMany({ include })`，釘 Prisma **7** 文件區，不把 Next 示例貼進 7 程式碼。
- 正例：同一 Drizzle 專案裡，報表用 `select().from().leftJoin()`，詳情頁用 `db.query.users.findMany({ with })`；兩面都是官方給的。
- 正例：Kysely 用 `jsonArrayFrom` 嵌寵物列表，並在註釋裡寫「這不是 ORM 關係」。
- 反例：把 `db.orm.public.User.where().all()` 寫成 Prisma 7。
- 反例：因 Drizzle 自稱「唯一雙面」就寫「Prisma 沒有 SQL 形 API」——Next 參考頁已公開 SQL query builder。
- 反例：把 Kysely 配方里的 JSON 巢狀升級成「Kysely 其實是 ORM」。

## 邊界與易混概念

- 不包括：注入/繞過、連線串與金鑰、工坊 Gateway schema、具體成品選型工單。
- Prisma 7 巢狀物件 Client ≠ Prisma Next `.orm` 鏈式 ≠ Next SQL QB ≠ Next Mongo pipeline。
- Prisma 7 GA ≠ Prisma Next EA ≠ Prisma 8（8 尚未作為現行釋出釘在本批文件）。
- Drizzle SQL-like ≠ Drizzle Relational Queries。後者 opt-in。
- Kysely ≠ ORM。官方連 relations 概念都否認。
- 「latest / Next / 推薦新專案」要看所在頁：`/docs/orm` 釘 7；`/docs/next` 推 Next。

## 對映到本倉庫

當前工坊：模組化單體 + 同步 REST；資料訪問未採用 Prisma / Drizzle / Kysely。三層裡「領域常綁 ORM」只說明橫切變更貴，見 [[concepts/後端架構名詞與工坊對照]]。本頁補查詢面釘與衝突，不把工坊禁令寫成行業否定，也不寫成已採用清單。

## 來源與證據

- 7 是現行 GA、Next 是 EA：[/docs/orm](https://www.prisma.io/docs/orm) 正文與橫幅；[/docs/orm/next](https://www.prisma.io/docs/orm/next)「continue with Prisma 7」。
- 7 查詢面是巢狀物件 Client：[What is Prisma](https://www.prisma.io/docs/orm/overview/introduction/what-is-prisma) 的 `findMany` / `include` / `create`。
- 7 破壞點與 Mongo 仍走 v6：[Upgrade to v7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)。
- Next 三面與 `.orm` 對照：[API reference](https://www.prisma.io/docs/orm/next/reference)、[reading-data](https://www.prisma.io/docs/orm/next/fundamentals/reading-data)、[orm-client](https://www.prisma.io/docs/orm/next/reference/orm-client)。
- 新專案推薦 Next：[/docs/next](https://www.prisma.io/docs/next) 原句。
- Drizzle 雙面自稱：[overview](https://orm.drizzle.team/docs/overview)、[data-querying](https://orm.drizzle.team/docs/data-querying)、[rqb](https://orm.drizzle.team/docs/rqb)。
- Kysely 明文非 ORM：[intro](https://kysely.dev/docs/intro)、[relations](https://kysely.dev/docs/recipes/relations)。
- 查詢賬本：[[queries/第三批蒸餾目標]] B3-ORM。

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
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/GraphQL與非同步事件合同]]
- [[concepts/Postgres與多租戶]]
