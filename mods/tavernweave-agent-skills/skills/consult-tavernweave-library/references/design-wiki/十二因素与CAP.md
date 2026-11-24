---
title: 十二因素與CAP
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
  - https://12factor.net/
  - https://12factor.net/codebase
  - https://12factor.net/config
  - https://12factor.net/backing-services
  - https://12factor.net/build-release-run
  - https://12factor.net/processes
  - https://12factor.net/dev-prod-parity
  - https://12factor.net/logs
  - https://github.com/twelve-factor/twelve-factor
  - https://www.12factor.net/blog/open-source-announcement
  - https://github.com/twelve-factor/twelve-factor/blob/next/UPDATE_FAQ.md
  - https://github.com/twelve-factor/twelve-factor/blob/next/GOVERNANCE.md
  - https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/
  - https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf
  - queries/第三批蒸餾目標.md
  - concepts/後端架構名詞與工坊對照.md
knowledge_class: factual
---

# 十二因素與CAP

本頁不是已採用的應用合同，也不是工坊已經在跑的一致性模型。檢索時間：2026-08-14。賬本見 [[queries/第三批蒸餾目標]] B3-12F。對照短句見 [[concepts/後端架構名詞與工坊對照]]「十二因素與 CAP」；本頁展開入口與衝突，不整段複製那一節。

## 一句話定義

十二因素是 2011 年面向 SaaS 的應用–平臺合同：一份程式碼庫、多份部署，配置進環境，程序無狀態。CAP 說的是網路分割槽下，共享資料系統不能同時要完美的一致性與可用性。一層管怎麼部署程序，一層管分割槽時怎麼取捨資料，不要併成一張「雲原生清單」。

## 為什麼重要

聽到「按十二因素做」先問看的是現網 2011 正文，還是 2024 修訂倉的 `next`。聽到「CAP 三選二」先問是教材口號，還是 Brewer 2012 自己標成誤導的那一版。Gilbert/Lynch 2002 是形式化證明，本輪沒有合法免費全文，不鏈盜版。工坊和角色卡都不因此改棧。

## 權威入口

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [Twelve-Factor 現網樞紐](https://12factor.net/) | 2011 正文仍在；應用–平臺合同 |
| 2 | [I. Codebase](https://12factor.net/codebase) | 一份程式碼庫，多份部署 |
| 3 | [III. Config](https://12factor.net/config) | 配置進環境；開源試紙 |
| 4 | [IV. Backing services](https://12factor.net/backing-services) | 可插拔資源 |
| 5 | [V. Build, release, run](https://12factor.net/build-release-run) | 三階段分離 |
| 6 | [VI. Processes](https://12factor.net/processes) | 無狀態程序；禁粘性會話 |
| 7 | [X. Dev/prod parity](https://12factor.net/dev-prod-parity) | 縮小時間 / 人員 / 工具差距 |
| 8 | [XI. Logs](https://12factor.net/logs) | 事件流 / `stdout` |
| 9 | [修訂倉](https://github.com/twelve-factor/twelve-factor) | 預設枝 `next`，尚未替換現網 |
| 10 | [2024-11-12 開源公告](https://www.12factor.net/blog/open-source-announcement) | 原文釘 2011；重新整理開始 |
| 11 | [UPDATE_FAQ](https://github.com/twelve-factor/twelve-factor/blob/next/UPDATE_FAQ.md) | 改什麼、不改什麼；擬保持十二項 |
| 12 | [GOVERNANCE](https://github.com/twelve-factor/twelve-factor/blob/next/GOVERNANCE.md) | `next` → `main` 才算正式改宣言 |
| 13 | [CAP Twelve Years Later（InfoQ）](https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/) | Brewer 2012；「三選二」標誤導 |
| 14 | [Perspectives on the CAP Theorem（MIT TDS）](https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf) | Gilbert/Lynch 2012 合法免費綜述，不是 2002 證明文 |

上表 **14** 條。B3-12F 的採集行不在本頁映象。

## 如何運作

### 現網仍是 2011 正文

[12factor.net](https://12factor.net/) 在 2026-08-14 仍是 Adam Wiggins / Heroku 經驗合成的方法論。寫給「把軟體當服務來跑」的開發與運維。目標：宣告式搭建、與作業系統合同乾淨、適合雲平臺、縮小開發與生產差異、擴縮不必先改架構。語言與 backing service 組合不限。

[2024-11-12 開源公告](https://www.12factor.net/blog/open-source-announcement) 把原文釘在 2011。修訂倉 FAQ 把導言說成「和 2012 一樣真」。年份兩邊留，不以 FAQ 覆蓋公告。

### 十二項（現網標題）

| # | 因素 | 現網一句 |
|---|---|---|
| I | [Codebase](https://12factor.net/codebase) | 一份版本庫，多份部署。多份程式碼庫就不是一個 app，是分散式系統；共享程式碼抽成庫。 |
| II | Dependencies | 顯式宣告並隔離依賴。 |
| III | [Config](https://12factor.net/config) | 隨部署而變的東西進環境變數，不進程式碼。試紙：隨時開源也不洩憑證。內部路由 / 模組接線不算這類 config。 |
| IV | [Backing services](https://12factor.net/backing-services) | 資料庫、佇列、SMTP、快取都是可插拔資源；換第三方只改控制代碼，不改程式碼。 |
| V | [Build, release, run](https://12factor.net/build-release-run) | 構建出包 → 包加配置成不可變 release → 再跑。執行時改程式碼回不去構建。 |
| VI | [Processes](https://12factor.net/processes) | 一個或多個無狀態、不共享記憶體的程序；持久化進 backing service。粘性會話是違規。 |
| VII | Port binding | 透過繫結埠匯出服務。 |
| VIII | Concurrency | 用程序模型橫向擴。 |
| IX | Disposability | 快起、優雅停，最大化魯棒。 |
| X | [Dev/prod parity](https://12factor.net/dev-prod-parity) | 縮小時間 / 人員 / 工具差距；各部署用同一類、同一版本的 backing service。 |
| XI | [Logs](https://12factor.net/logs) | 日誌是事件流；程序寫無緩衝 `stdout`，路由與存檔交給執行環境。 |
| XII | Admin processes | 管理任務當一次性程序跑。 |

這是 2011 合同，不是 Kubernetes 清單，也不是「必須先拆成微服務」的理由。工作負載物件怎麼補齊，見 [[concepts/Kubernetes工作負載]]。依賴宣告也不是成分清單，見 [[concepts/SBOM與SLSA]]。

### 2024 修訂倉尚未替換現網

[twelve-factor/twelve-factor](https://github.com/twelve-factor/twelve-factor) 於 2024-10 建倉，預設枝 `next`。README 寫明：這裡是**將要**替換 12factor.net 的更新正文；改動先留在 `next`，維護者認為本輪完成才算數。

[UPDATE_FAQ](https://github.com/twelve-factor/twelve-factor/blob/next/UPDATE_FAQ.md)：先拆原則 / 例子 / 指導並更新例子；意圖保持十二項；原文會繼續留在新站。範圍仍是應用與平臺的介面，不是把 DRY / YAGNI 收成新因素。

[GOVERNANCE](https://github.com/twelve-factor/twelve-factor/blob/next/GOVERNANCE.md)：中大改在 `next`；大版本要維護者超半數簽字，才從 `next` 進 `main` 並正式改宣言，一年至多一次。品牌現階段仍由 Heroku 控。

因此：倉裡的 `next` ≠ 現網站。培訓若把修訂稿寫成「現行十二因素」，與現網衝突；兩邊都留。

### CAP：教材「三選二」與 Brewer 2012

[Brewer 2012 *CAP Twelve Years Later*](https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/)（先刊 IEEE *Computer*；InfoQ 與 IEEE Computer Society 合作轉載，本頁只用這一合法免費入口）：

- C：相當於只有一份最新資料。
- A：這份資料可更新（高可用）。
- P：能容忍網路分割槽。

「三選二」當初是為了開啟設計空間。Brewer 把這句標成誤導：它過度簡化。CAP **只禁止**分割槽存在時同時要完美的 C 和 A。分割槽少見時，沒有理由先放棄 C 或 A。選擇可以按操作、資料、使用者、子系統細分；C / A / P 都是連續量，不是開關。現代目標是：為具體應用最大化說得通的 C+A 組合，並顯式計劃分割槽期與恢復。

操作上，分割槽是通訊的時限。超時後必須做分割槽決策：取消操作（降 A）或繼續（冒不一致）。無限重試等於選 C。沒有全域性「已分割槽」共識。

分割槽管理三步：檢測 → 進入顯式分割槽模式（限制部分操作，或記下恢復所需歷史）→ 恢復時收斂狀態並補償分割槽期的錯。ATM 例子：分割槽期仍允許有上限的取現（保 A、限風險），恢復後再審計與收費補償。

ACID 的 C / A 與 CAP 的 C / A **不是同一對字母**。選可用性並不自動丟掉原子性或耐久。事件溯源 / CQRS、CRDT 是另兩套資料與合併模型，見 [[concepts/事件溯源與CQRS]]、[[concepts/CRDT與local-first]]，不要寫成 CAP 的三個字母。

### 2002 證明文無合法免費全文

Seth Gilbert / Nancy Lynch, *Brewer's conjecture and the feasibility of consistent, available, partition-tolerant web services*, ACM SIGACT News 33(2), 2002。本輪未找到作者頁或開放獲取的合法免費全文。ACM Digital Library 書目頁要登入或付費才能看正文。本頁不鏈盜版 PDF，也不把付費頁寫成免費入口。

同作者 2012 的 [*Perspectives on the CAP Theorem*](https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf) 掛在 MIT TDS 組，是合法免費綜述：按 2002 文回顧形式化，並把 CAP 放進「不可靠系統裡安全與活性不能同時保證」的更大框。它仍寫：不可靠時必須在實踐中犧牲 C 或 A（或兩者都松）。這與 Brewer 2012「分割槽少見時不必先棄 C 或 A」並置，不互相覆蓋。2012 綜述 ≠ 2002 證明文。

## 必須保留的衝突

- 現網 2011 正文 vs 修訂倉 2024 `next`「將替換」但未替換。
- 教材 / 舊文「CAP 三選二」vs Brewer 2012 標為誤導。
- Gilbert/Lynch 2012 綜述仍用「不可靠時須犧牲 C 或 A」的形式化口吻 vs Brewer 2012「分割槽少見時不必先棄 C 或 A」。兩邊按作者留。
- 開源公告寫 2011，FAQ 把導言說成 2012。
- 2002 證明文無合法免費全文；2012 綜述不能冒充 2002。
- 工坊「現在不上」≠「十二因素 / CAP 不正當」。
- 本頁對映工坊與髮卡的**部署合同與分割槽取捨**；**不是**「本倉庫已採用十二因素或已選定 CAP 點」。

## 例子

- 正例：同一 Git 倉出開發 / 預發 / 生產多份部署；憑證只在環境變數；程序無狀態，會話進 Redis。快取與佇列控制代碼見 [[concepts/Redis與日誌佇列]]。
- 正例：構建產物與配置合成帶唯一 ID 的不可變 release；回滾換上一個 release，不在執行時改程式碼。
- 正例：分割槽期 ATM 按上限繼續取現，恢復後對賬並補償透支——按操作選 A，用審計補 C。
- 反例：把 `next` 枝草稿寫成 12factor.net 現行正文。
- 反例：給單機工坊或酒館 iframe 貼 CA / CP / AP 標籤。
- 反例：讀到「三選二」就先把稽核庫改成最終一致，或先放棄可用性。
- 反例：把 Gilbert 2002 的盜版 PDF 或付費 DL 寫成免費依據。

## 邊界與易混概念

- 不包括：盜版論文、攻擊步驟、憑證、把修訂倉寫成已替換現網。
- 不包括：本倉庫已採用十二因素或已選定 CAP 點——**沒有這回事**。
- 現網 2011 ≠ 修訂倉 `next`。
- 十二因素 ≠ 微服務、≠ Kubernetes、≠ DORA 五項。交付結果指標見 [[concepts/DORA五項與SLO]]。
- 粘性會話違規 ≠ 瀏覽器 Session Cookie。後者是宿主會話，不是把使用者態快取在某個卡程序裡。
- 髮卡 compose / pack / 回封 ≠ Build / Release / Run。回封主鏈見 [[concepts/打包回封路徑]]；行業打包器見 [[concepts/構建鏈與Vite]]。
- Config 進環境 ≠ 功能開關平臺。執行時分支見 [[concepts/功能開關與OpenFeature]]。
- CAP 的 C ≠ ACID 的 C；CAP 的 A ≠ ACID 的 Atomicity。
- Brewer 2012 的分割槽恢復補償 ≠ [[concepts/Saga三義與補償]] 的三義，只是用了同一家族的「事後補」。
- Gilbert/Lynch 2012 綜述 ≠ 2002 證明文。
- C4 圖畫的是執行時邊界，不是十二因素的程序合同，見 [[concepts/C4與ADR]]。
- 區分：先問「在談部署合同還是分割槽取捨」；再問「依據是現網、修訂倉，還是哪一年的 CAP 表述」。

## 對映到本倉庫

當前工坊：Gateway 同進程；同步 REST；目錄靜態；包進物件儲存；稽核狀態機要同步可見結果。角色卡跑在酒館 iframe，無 OS 安裝面，也沒有十二因素那種平臺程序模型。詳見 [[concepts/後端架構名詞與工坊對照]]、[[comparisons/工坊架構該上與不該上]]、[[concepts/酒館宿主與iframe分層]]。

這是產品落點，不是對十二因素或 CAP 的行業否定。**不要把本頁寫成工坊或髮卡已採用十二因素，或已選定 CA / CP / AP。**

| 本倉物 | 實際在做 | 不是 |
|---|---|---|
| 憑證不進 Vault、不進卡原始碼 | 安全紅線，見 [[concepts/創意工坊與安全契約]] | 已落實 Config 因素 |
| `verify-repo` 綠 | 靜態檢查 | CAP 可用性，也不是 Build / Release |
| 工坊 `approved` | 稽核狀態機同步可見 | 已選一致性點 |
| 真機匯入成功 | 產品驗收 | 十二因素 release |
| 髮卡 compose / pack / 回封 | 原始碼拼卡 | Build / Release / Run |
| Gateway 同進程 + 同步 REST | 產品主路徑 | 必須先貼 CA / CP / AP，或先上分割槽模式 |

HTTP 操作合同與錯誤體是另一層，見 [[concepts/HTTP合同與問題詳情]]。行業「何時用」仍看 [[comparisons/行業架構方案何時用]]，本頁不改那張表。

## 來源與證據

權威入口以上表 14 條與 [[queries/第三批蒸餾目標]] B3-12F 為準。只收合法免費頁。

1. [Twelve-Factor 現網樞紐](https://12factor.net/) — B3-12F；2011 正文仍在。
2. [I. Codebase](https://12factor.net/codebase) — 一份程式碼庫，多份部署。
3. [III. Config](https://12factor.net/config) — 配置進環境；開源試紙。
4. [IV. Backing services](https://12factor.net/backing-services) — 可插拔資源。
5. [V. Build, release, run](https://12factor.net/build-release-run) — 三階段分離。
6. [VI. Processes](https://12factor.net/processes) — 無狀態程序；禁粘性會話。
7. [X. Dev/prod parity](https://12factor.net/dev-prod-parity) — 縮小三類差距。
8. [XI. Logs](https://12factor.net/logs) — 事件流 / `stdout`。
9. [修訂倉](https://github.com/twelve-factor/twelve-factor) — 預設枝 `next`，尚未替換現網。
10. [2024-11-12 開源公告](https://www.12factor.net/blog/open-source-announcement) — 原文釘 2011；重新整理開始。
11. [UPDATE_FAQ](https://github.com/twelve-factor/twelve-factor/blob/next/UPDATE_FAQ.md) — 改什麼、不改什麼；擬保持十二項。
12. [GOVERNANCE](https://github.com/twelve-factor/twelve-factor/blob/next/GOVERNANCE.md) — `next` → `main` 才算正式改宣言。
13. [CAP Twelve Years Later（InfoQ）](https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/) — Brewer 2012；「三選二」標誤導。
14. [Perspectives on the CAP Theorem（MIT TDS）](https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf) — Gilbert/Lynch 2012 合法免費綜述，不是 2002 證明文。

已知衝突見上節，不靜默覆蓋。尚缺：Gilbert/Lynch 2002 合法免費全文；IEEE *Computer* 2012 付費頁不收，改用 InfoQ 轉載。未跑工坊或 SillyTavern 真機。`12factor.net/about` 本輪 404。

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
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
- [[concepts/創意工坊與安全契約]]
- [[concepts/Saga三義與補償]]
- [[concepts/DORA五項與SLO]]
- [[concepts/C4與ADR]]
- [[concepts/Kubernetes工作負載]]
- [[concepts/SBOM與SLSA]]
- [[concepts/Redis與日誌佇列]]
- [[concepts/事件溯源與CQRS]]
- [[concepts/CRDT與local-first]]
- [[concepts/功能開關與OpenFeature]]
- [[concepts/打包回封路徑]]
- [[concepts/構建鏈與Vite]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/酒館宿主與iframe分層]]
