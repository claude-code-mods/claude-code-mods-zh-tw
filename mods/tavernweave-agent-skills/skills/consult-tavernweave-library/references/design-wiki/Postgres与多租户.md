---
title: Postgres與多租戶
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
  - https://www.postgresql.org/docs/current/transaction-iso.html
  - https://www.postgresql.org/docs/current/applevel-consistency.html
  - https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html
  - https://www.postgresql.org/docs/current/ddl-rowsecurity.html
  - https://www.postgresql.org/docs/current/sql-createpolicy.html
  - https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models
  - https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data
  - https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html
  - https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/partitioning-models.html
  - https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/bridge.html
  - https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/matrix.html
  - https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/rls.html
  - https://cloud.google.com/spanner/docs/implement-multi-tenancy
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
  - concepts/後端架構名詞與工坊對照.md
  - concepts/ORM三面.md
knowledge_class: factual
---

# Postgres與多租戶

本頁不是已採用庫棧，也不是工坊要上 RLS / schema-per-tenant 的工單。檢索時間：2026-08-14。賬本：[[queries/第二批蒸餾目標]] B2-Data、B2-Tenant。`/docs/current/` 當時指向 **PostgreSQL 18.6**。只談公開文件，不寫攻擊、繞過或憑證。

## 一句話定義

Postgres 給應用的是一套隔離等級、鎖和行安全策略；多租戶是把「誰的資料」切到例項、庫、schema 或行上的產品選擇。兩層常疊用，不是同一張圖。

## 為什麼重要

聽到「上多租戶」先問切在哪一層：獨佔例項、每租戶一庫、每租戶一 schema，還是同行加 `tenant_id`。隔離等級回答併發看見什麼；RLS 回答漏寫 `WHERE` 時庫還攔不攔。雲廠商對「單庫裡按物件切開」說法不一致，本頁兩邊留，不併成一種標準切法。查詢面自稱見 [[concepts/ORM三面]]，不替代本頁的隔離切法。工坊當前是弱多租戶，隔離靠所有權，見文末對映。

## 權威入口

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [事務隔離](https://www.postgresql.org/docs/current/transaction-iso.html) | B2-Data 樞紐；四檔現象與 PG 實現 |
| 2 | [應用層一致性](https://www.postgresql.org/docs/current/applevel-consistency.html) | Serializable 可「只重試」；邏輯副本尚不覆蓋 |
| 3 | [隔離失敗重試](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html) | `40001` 整段重試；庫不自動重試 |
| 4 | [行安全策略](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | `ENABLE` 後預設拒絕；owner / `BYPASSRLS` 繞過 |
| 5 | [CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html) | `USING` vs `WITH CHECK`；`PERMISSIVE` OR / `RESTRICTIVE` AND |
| 6 | [Azure 租戶模型](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models) | B2-Tenant 樞紐；隔離是譜，不是一刀 |
| 7 | [Azure 資料層](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data) | 單庫「每租戶一張表」標反模式 |
| 8 | [AWS 倉池橋](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html) | silo / pool / bridge，可按層混用 |
| 9 | [AWS 分割槽三模型](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/partitioning-models.html) | 落到 PG：倉=例項、橋=庫或 schema、池=同行 |
| 10 | [AWS 橋接檔](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/bridge.html) | schema-per-tenant 是正式橋選項 |
| 11 | [AWS 決策矩陣](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/matrix.html) | 四格對照隔離、遷移、成本 |
| 12 | [AWS 池化 RLS](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/rls.html) | pool **必須** RLS；推薦會話變數 |
| 13 | [Spanner 四級](https://cloud.google.com/spanner/docs/implement-multi-tenancy) | Instance / Database / Table / Row |

上表 **13** 條。B2-Data 的型別/索引/UTIL 行、B3-CDC 邏輯複製、B3-PGR / B3-Neon 不在本頁映象。CDC / FTS / pgvector 見 [[concepts/向量檢索入口]]。

## 如何運作

### 隔離等級：四檔名，三檔實現

[事務隔離](https://www.postgresql.org/docs/current/transaction-iso.html) 用髒讀、不可重複讀、幻讀、序列化異常定義四檔。PostgreSQL 對外接受四檔名，內部只實現三檔：**Read Uncommitted 行為等於 Read Committed**（預設）。Repeatable Read **不允許幻讀**（標準允許更嚴）。Serializable 才禁止序列化異常。

預設 RC 下，兩次 `SELECT` 可以看見不同已提交資料。複雜校驗不要靠「連讀兩次合計」。[應用層一致性](https://www.postgresql.org/docs/current/applevel-consistency.html)：寫和需要一致讀的讀都走 Serializable，業務校驗可以「只重試」；否則用 `FOR UPDATE` / `FOR SHARE` / 表鎖。警告：**可序列化完整性尚不覆蓋熱備與邏輯副本**。

[隔離失敗](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html)：`40001` 必須整段重試，包括決定 SQL 和取值的應用邏輯。庫不自動重試。死鎖 `40P01` 也可重試。序列（`serial`）改動對其它事務立刻可見，回滾也不撤計數。

### 行安全：漏寫 WHERE 時庫還攔不攔

[RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) 在 `GRANT` 之上再按行過濾。`ENABLE ROW LEVEL SECURITY` 之後，普通查詢必須被策略放行；**沒有策略 = 預設拒絕**。表所有者通常不受策略約束，除非 `FORCE ROW LEVEL SECURITY`。超級使用者和 `BYPASSRLS` 角色始終繞過。`TRUNCATE` 與 `REFERENCES` 不受 RLS。引用完整性檢查（UNIQUE / PK / FK）也繞過策略，以免破壞完整性——這是規範約束，本頁不展開利用面。

[CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html)：`USING` 管看見哪些行，`WITH CHECK` 管寫入哪些行；只寫 `USING` 時二者相同。多條 `PERMISSIVE` 用 OR，`RESTRICTIVE` 用 AND。備份場景可把 `row_security` 設為 `off`：不會靜默漏行，而是在結果會被策略過濾時報錯。

AWS 池化檔寫明：pool **必須** RLS；推薦 `current_setting('app.current_tenant')`，不要每租戶一個數據庫使用者。這是廠商建議，不是 Postgres 規範要求。

### 租戶模型是譜

[Azure 租戶模型](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models) 把隔離畫成連續譜：全獨佔（什麼都不共享）→ 垂直分割槽（有的共享、有的獨佔）→ 全共享。先定義租戶（B2B 組織 vs B2C 個人/家庭），再對映邏輯租戶到部署（stamp / 有時叫超租戶）。共享部署靠應用程式碼和租戶標識切開；獨佔部署可以少寫多租戶程式碼，但貴。

[AWS SaaS Lens](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html) 用三個詞：silo（部分或全部資源獨佔，但仍共享身份與開通）、pool（共享資源）、bridge（按層混用）。不是整系統一刀切。

[AWS PG 分割槽](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/partitioning-models.html) 把三詞落到 Postgres：**倉 = 每租戶例項/叢集**；**橋 = 同例項裡每租戶一庫，或同庫裡每租戶一 schema**；**池 = 同 schema 同行**。[橋接專頁](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/bridge.html) 把 schema-per-tenant 寫成正式選項，並說它是 RLS 的替代，開通成本略高。這裡的 “database” 是 PG 邏輯庫，不是一臺 RDS 例項。

[決策矩陣](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/matrix.html) 四格並列：silo、橋-分庫、橋-分 schema、pool。schema 橋：中等租戶數、需要跨租戶對照時「首選」；pool：租戶多、每戶資料少，隔離最弱，必須自己做 RLS。

[Spanner](https://cloud.google.com/spanner/docs/implement-multi-tenancy) 另給四級：Instance / Database / Table / Row。Table 級可用 named schema。這是第三家詞彙，不拿來裁決 Azure / AWS。

## 必須保留的衝突

- **Azure vs AWS，兩邊都留。** Azure 資料層把單庫「每租戶一張表」（table-based isolation）標反模式，推 **tenant 列** 或 **每租戶一庫**。AWS 把 **schema-per-tenant** 列為正式橋接檔，並給對照矩陣。表 ≠ schema；兩家切的粒度不同，不要併成一句「雲廠商禁止/允許 schema-per-tenant」。
- Azure 隔離是譜；AWS 是 silo / pool / bridge 三詞。詞表不同，對映時寫清，不要互換。
- PG 對外四檔隔離名，內部三檔；RU=RC。
- Serializable 完整性尚不覆蓋熱備與邏輯副本。
- RLS 預設拒絕 ≠ 已寫策略；owner / `BYPASSRLS` / `TRUNCATE` / 引用完整性不走策略。
- AWS「pool 必須 RLS」是廠商檔，不是 Postgres 強制。
- B3-PGR 的 schema isolation 是 API 版本切面，不是租戶隔離。B3-Neon 分支語義另頁。
- 工坊「現在不上」≠「這些切法不正當」。

## 例子

- 正例：共享表加 `tenant_id`，會話設 `app.current_tenant`，RLS `USING` 對齊；應用仍帶租戶條件，策略當第二道門。
- 正例：合規要求獨佔時 silo（每租戶例項）；中等戶數、要跨戶對照時走 AWS 的 schema 橋，並接受 catalog 膨脹。
- 正例：業務校驗走 Serializable，捕獲 `40001` 後整段重試，不把半段提交當成功。
- 反例：單庫為每個租戶建一套表，卻說「這是 Azure 推薦」。Azure 點名這是反模式。
- 反例：把 Azure「不要每租戶一張表」寫成「AWS 的 schema-per-tenant 不正當」，或反過來。
- 反例：只靠應用 `WHERE tenant_id`、表未 `ENABLE` RLS，卻聲稱 pool 已隔離。
- 反例：把工坊「多釋出者共享目錄、隔離靠所有權」寫成已經上了 schema-per-tenant 或 RLS。

## 邊界與易混概念

- 不包括：具體連線串、憑證、攻擊步驟、廠商報價、B3 的 CDC / PostgREST / Neon 正文。
- 不包括：本倉庫已落地的 Postgres 多租戶——**沒有這回事**。
- 易混：table-per-tenant ≠ schema-per-tenant ≠ database-per-tenant ≠ instance-per-tenant。
- 易混：RLS ≠ `GRANT`；策略過濾行，許可權管物件。
- 易混：租戶標識列 ≠ 行安全。列是資料形狀，策略才是漏寫 `WHERE` 時的庫門。
- 易混：Azure「部署 / stamp」≠ AWS silo。前者是邏輯租戶到基礎設施的對映，後者是資源獨佔程度。
- 易混：邏輯複製的「可序列化」提交語義 ≠ 本頁事務隔離檔。
- 易混：隔離切法 ≠ [[concepts/ORM三面]] 的查詢面自稱。Prisma / Drizzle / Kysely 不決定倉、池、橋。
- 區分：先問切在例項、庫、schema 還是行；再問併發看見什麼；最後問漏寫過濾條件時誰攔。

## 對映到本倉庫

當前工坊：Gateway 同進程；目錄靜態；包進物件儲存；同步 REST；稽核狀態機 `pending → approved / rejected / withdrawn`；OAuth 只證明發布者；**弱多租戶靠所有權**。見 [[concepts/後端架構名詞與工坊對照]]、[[comparisons/工坊架構該上與不該上]]。資料訪問未採用 Prisma / Drizzle / Kysely，見 [[concepts/ORM三面]]。

不上 schema-per-tenant、不上共享庫 RLS、不按釋出者拆庫來模擬強隔離。這是產品落點，不是對倉/池/橋或 RLS 的行業否定。對稱 CRUD + 所有權夠用時，共享目錄比每釋出者一 schema 便宜。卡內 fail closed 仍歸 [[concepts/創意工坊與安全契約]]。本 Vault 不收 Gateway 真身欄位。

## 來源與證據

- 隔離與重試：PG 18 手冊 13.2 / 13.4 / 13.5；`/docs/current/` 檢索日指向 18.6。
- RLS：手冊 5.9 與 `CREATE POLICY`。
- Azure：租戶模型譜 + 資料層反模式句（table-based isolation）。
- AWS：SaaS Lens 三詞；PG 分割槽 / 橋接 / 矩陣 / RLS 建議。
- Google：Spanner 四級，只作第三家詞彙。
- 查詢賬本：[[queries/第二批蒸餾目標]] B2-Data、B2-Tenant。

已知衝突見上節，不靜默覆蓋。Azure 是否會另出 schema-per-tenant 專檔、AWS 是否改口：尚無繼任文字，標未知。未跑工坊或 Postgres 真機。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[concepts/後端架構名詞與工坊對照]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
- [[concepts/創意工坊與安全契約]]
- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
- [[concepts/ORM三面]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/Saga三義與補償]]
- [[concepts/GraphQL與非同步事件合同]]
- [[concepts/事件溯源與CQRS]]
- [[concepts/向量檢索入口]]
- [[concepts/Redis與日誌佇列]]
- [[concepts/Iceberg與湖倉]]
- [[concepts/十二因素與CAP]]
- [[concepts/Kubernetes工作負載]]
- [[concepts/功能開關與OpenFeature]]
- [[concepts/CRDT與local-first]]
