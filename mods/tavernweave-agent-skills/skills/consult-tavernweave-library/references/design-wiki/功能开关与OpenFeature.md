---
title: 功能開關與OpenFeature
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
  - https://openfeature.dev/docs/reference/intro/
  - https://openfeature.dev/specification/
  - https://openfeature.dev/specification/sections/flag-evaluation
  - https://openfeature.dev/docs/reference/concepts/evaluation-api
  - https://openfeature.dev/docs/reference/concepts/evaluation-context
  - https://openfeature.dev/docs/reference/concepts/provider
  - https://openfeature.dev/docs/reference/sdks/sdk-compatibility
  - https://www.cncf.io/projects/openfeature/
  - https://github.com/open-feature/spec
  - https://docs.getunleash.io/get-started/unleash-overview
  - https://docs.getunleash.io/concepts/feature-flags
  - https://docs.getunleash.io/sdks
  - https://docs.growthbook.io/features/basics
  - https://docs.growthbook.io/lib
  - https://docs.growthbook.io/lib/openfeature
  - https://docs.growthbook.io/self-host/remote-evaluation
  - queries/第二批蒸餾目標.md
  - concepts/後端架構名詞與工坊對照.md
knowledge_class: factual
---

# 功能開關與OpenFeature

本頁不是已採用技術，也不是工坊必須上開關平臺的工單。檢索時間：2026-08-14。賬本見 [[queries/第二批蒸餾目標]] B2-Flag。只談公開規範與廠商概念頁，不寫攻擊步驟、憑證、成品或卡 JSON。

## 一句話定義

功能開關（feature flag / feature toggle）是執行時可控的分支：不改原始碼、不重新部署，就能開啟、關閉或改一條程式碼路徑。[OpenFeature](https://openfeature.dev/docs/reference/intro/) 是 CNCF Incubating 的廠商無關評估 API；真正算值的是 Provider 後面的開關係統（本頁收 [Unleash](https://docs.getunleash.io/concepts/feature-flags) 與 [GrowthBook](https://docs.growthbook.io/features/basics)）。

## 為什麼重要

長壽分支、金絲雀、A/B、降級、按地域或許可限制功能，都要求「配置能變、評估能看上下文」。沒有統一 API，每個服務綁死一家 SDK；有了 OpenFeature，應用程式碼只認 Evaluation API，換後端改 Provider。它**不**替你管理開關生命週期，也不保證廠商專有能力（粘性分桶、印象資料、視覺化實驗）能從公共介面露出。

這是釋出控制合同，不是 HTTP 操作清單，也不是錯誤體。操作與錯誤體見 [[concepts/HTTP合同與問題詳情]]、[[concepts/OpenAPI與Arazzo]]。部署進生產 ≠ 對使用者可見：DORA 五項量的是交付吞吐與不穩，見 [[concepts/DORA五項與SLO]]，不要把開關平臺寫成已落地的釋出門。

## 權威入口

檢索 2026-08-14。16 條，不是教程，也不映象全文。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [OpenFeature 導論](https://openfeature.dev/docs/reference/intro/) | B2-Flag 樞紐；開關定義與 SDK 抽象。釋出路徑對照 [[concepts/後端架構名詞與工坊對照]] |
| 2 | [OpenFeature 規範](https://openfeature.dev/specification/) | 規範性條款；Experimental / Hardening / Stable。廠商無關合同另見 [[concepts/OpenAPI與Arazzo]] |
| 3 | [Flag Evaluation 專節](https://openfeature.dev/specification/sections/flag-evaluation) | Evaluation API、Provider、預設值。錯誤回預設值 ≠ [[concepts/HTTP合同與問題詳情]] |
| 4 | [Evaluation API 概念](https://openfeature.dev/docs/reference/concepts/evaluation-api) | 基本/詳細求值；出錯或 No-op 回撥用方預設值 |
| 5 | [Evaluation Context](https://openfeature.dev/docs/reference/concepts/evaluation-context) | 動態 vs 靜態上下文；targetingKey |
| 6 | [Providers](https://openfeature.dev/docs/reference/concepts/provider) | 翻譯層；domain / Multi-Provider |
| 7 | [SDK 兼容表](https://openfeature.dev/docs/reference/sdks/sdk-compatibility) | 服務端 dynamic-context；客戶端 static-context |
| 8 | [CNCF OpenFeature](https://www.cncf.io/projects/openfeature/) | 2022-06-17 入會；2023-11-21 Incubating。成熟度 ≠ 本倉已採用 |
| 9 | [規範倉](https://github.com/open-feature/spec) | SDK 自己不算評估邏輯 |
| 10 | [Unleash 架構總覽](https://docs.getunleash.io/get-started/unleash-overview) | 後端本地算；前端由服務端/Edge 算。Edge 下發 ≠ [[concepts/邊緣快取與SWR]] |
| 11 | [Unleash 開關概念](https://docs.getunleash.io/concepts/feature-flags) | 型別、生命週期、策略變體。生命週期 ≠ [[concepts/狀態機與SCXML]] |
| 12 | [Unleash SDK 總覽](https://docs.getunleash.io/sdks) | 官方 SDK；OpenFeature Provider 標 Beta |
| 13 | [GrowthBook 開關基礎](https://docs.growthbook.io/features/basics) | key / 型別 / 預設值；停用則 payload 不含該 feature |
| 14 | [GrowthBook SDK](https://docs.growthbook.io/lib) | 客戶端 / 服務端 / 邊緣；預設本地評估 |
| 15 | [GrowthBook OpenFeature](https://docs.growthbook.io/lib/openfeature) | Provider 覆蓋 Python / Go / .NET / Java |
| 16 | [GrowthBook Remote Evaluation](https://docs.growthbook.io/self-host/remote-evaluation) | 客戶端送屬性，私有端點只回收已算值。遠端先算 ≠ [[concepts/邊緣快取與SWR]] |

上表 **16** 條。B2 採集目標約 12 條，本表按樞紐展開，不映象採集行。刻意未收：LaunchDarkly / Split 營銷頁、報價、接入菜譜、憑證樣例、盜版 PDF、把開關寫進卡 JSON 的成品。

## 如何運作

### 開關本身

最簡形態是執行時可改的 if/else。完整系統還要管理面、環境、定向規則、審計，以及按主體算值的上下文。Unleash 把開關放在專案與環境裡，用 activation strategy 決定對某個 Unleash Context 是否啟用；多策略是 OR。GrowthBook 用唯一 feature key、型別（boolean / string / number / JSON）和預設值，再用規則覆蓋。兩邊都把「程式碼進生產」和「對使用者可見」拆開。

布林旗一多，合法組合會炸。互斥狀態與遷移歸 [[concepts/狀態機與SCXML]]；功能開關管的是同一狀態下要不要走某條路徑，不是狀態機本身。

### OpenFeature 合同

[規範倉](https://github.com/open-feature/spec) 寫明：SDK 只提供廠商無關對接面，**自己不算 flag**。應用設 Provider、取 Client、呼叫 `getBooleanValue` 等；出錯或未設 Provider（No-op）都回呼叫方給的預設值。Provider 把引數譯成某家系統的表示，可以包廠商 SDK、打 REST，或讀本地檔案。

評估上下文裝定向用的任意資料。`targetingKey` 在 Evaluation API 裡可選，但很多後端要它做百分比滾動。服務端 SDK 是 **dynamic-context**：全域性 / Client / 呼叫點三層合併，每次求值可帶不同上下文。客戶端 SDK 是 **static-context**：上下文在 API 上非同步更新，Provider 先 reconcile，再對快取做同步求值。這是 OpenFeature 對「客戶端 vs 服務端」的定義，不是「規則在不在瀏覽器裡」。

### 評估發生在哪

三套官方說法並存，不要併成一句「執行時評估」：

1. **呼叫點**。OpenFeature 把評估定義成應用呼叫 Evaluation API 的那一次。
2. **本地對快取規則求值**。Unleash 後端 SDK 拉全量配置，在程序內算（重新整理預設約 15s）；GrowthBook 預設客戶端與服務端 SDK 也是先拉 payload 再本地算。
3. **遠端先算完再下發**。Unleash 前端 SDK 不在本地算，由 Unleash 或 Edge 按上下文返回已啟用開關；GrowthBook [Remote Evaluation](https://docs.growthbook.io/self-host/remote-evaluation) 讓客戶端只拿已算好的值，規則與未用變體不到端上。

配置變更傳到程序都有延遲。呼叫點拿到的值，可能是剛算的，也可能是上次拉取的遠端結果。這不是 HTTP 新鮮度或 `stale-while-revalidate`，見 [[concepts/邊緣快取與SWR]]。這也不是事件日誌重放，也不是跨服務補償：事件真源見 [[concepts/事件溯源與CQRS]]；補償見 [[concepts/Saga三義與補償]]。

## 必須保留的衝突

- **評估時機與地點（最要緊）。** OpenFeature 把「評估」釘在 Evaluation API 呼叫點；Unleash 後端與 GrowthBook 預設 SDK 在本地對快取規則求值；Unleash 前端與 GrowthBook Remote Evaluation 在服務端 / Edge / 私有端點先算完再下發。三套都是官方說法。不能寫成單一的「客戶端評估」或「執行時評估」。
- **「客戶端 vs 服務端」至少三軸。** OpenFeature：dynamic-context vs static-context。Unleash：全量配置本地算 vs 只下發已算結果。GrowthBook：預設本地算（規則可見）vs Remote Evaluation（規則不可見）；文件還寫多數人從客戶端 SDK 起步。三軸不要併成一張表的同一列。
- **誰是應用合同。** OpenFeature：應用只依賴 Evaluation API，換 Provider 不改呼叫點。Unleash 與 GrowthBook：公共 API 只覆蓋各家共有能力；要專有能力請用原生 SDK。Unleash 的 OpenFeature Provider 檢索日仍標 Beta。兩邊都留。
- **GrowthBook OpenFeature 語言面窄。** 官方 Provider 列 Python / Go / .NET / Java，沒有與 JS 客戶端 SDK 對等的一條。JS 應用走原生 SDK 或自寫 Provider，不能從本頁推出「全語言已齊」。
- **停用與預設值。** OpenFeature：停用是 reason，不是 error；無 Provider / 出錯回預設值。GrowthBook：整 feature 停用則不進 payload，求值 `null`。不要用一家的停用語義覆蓋另一家。
- **Incubating ≠ 已採用。** CNCF 成熟度不是本倉庫技術選型。對映句不是過濾器。本頁**不是**「工坊已採用 OpenFeature / Unleash / GrowthBook」。
- **開關拉取 / 遠端先算 ≠ HTTP 邊緣快取。** 配置重新整理與 Remote Evaluation 不是 RFC 5861 的 SWR，也不等於 CDN 新鮮度。

## 例子

- 正例：服務用 OpenFeature Client 求 boolean，Provider 指向 Unleash 或 GrowthBook；換廠商只改 bootstrap。
- 正例：瀏覽器走 Unleash 前端 SDK 或 GrowthBook Remote Evaluation，端上不持有規則。
- 正例：後端 Unleash SDK 本地算，使用者屬性不出程序。
- 反例：把 OpenFeature 當成開關管理面（它沒有 Admin UI，也不管生命週期）。
- 反例：因本頁出現 Unleash / GrowthBook 就寫進 recipe 或髮卡依賴。
- 反例：把卡 iframe 裡的 if/else 或世界書條目寫成 OpenFeature 評估。
- 反例：把本頁寫成「工坊必須上開關平臺」，或把 CNCF Incubating 當成已採用證明。

## 邊界與易混概念

- 不包括：接入步驟、金鑰、繞過定向、攻擊評估端點、成品實驗平臺。
- OpenFeature ≠ 開關係統。前者是評估合同，後者才存規則與環境。
- 廠商 SDK ≠ OpenFeature 合同。專有能力往往只在原生 SDK。
- 客戶端 SDK ≠ 瀏覽器裡算規則。OpenFeature 的「客戶端」指 static-context；Unleash 前端明確不在本地算。
- 評估 API 呼叫 ≠ 規則引擎剛跑完。呼叫點讀到的可能是快取的遠端結果。
- 停用語義分叉：OpenFeature 用 `disabled` reason，不當錯誤；GrowthBook 停用則該 feature 不進 payload，求值 `null`，走 fallback。
- 功能開關 ≠ 狀態機。開關是執行時路徑；互斥狀態見 [[concepts/狀態機與SCXML]]。
- 功能開關 ≠ 事件溯源 / CQRS，也 ≠ Saga 補償。
- 開關配置快取 ≠ [[concepts/邊緣快取與SWR]] 的 HTTP 共享快取。
- 易混：聽到「標準開關 API」就以為專有能力（粘性分桶、印象、視覺化實驗）已經從公共介面露出。

## 對映到本倉庫

這是獨立服務與應用執行時的釋出控制合同，不是卡 JSON、世界書或宿主 iframe 的開關模型。本倉也未採用任何開關平臺。**不要把本頁寫成工坊或髮卡已採用 OpenFeature / Unleash / GrowthBook。**

| 本倉物 | 實際在做 | 不是 |
|---|---|---|
| [[concepts/後端架構名詞與工坊對照]] | 同步 REST + 稽核狀態機 | 開關管理面或 Evaluation API |
| [[comparisons/工坊架構該上與不該上]] | 釋出 / 稽核要同步可見 | 用遠端開關當「已釋出」真源 |
| [[concepts/酒館宿主與iframe分層]] | 卡 UI 在宿主 / iframe 分層 | OpenFeature 評估點 |
| [[concepts/創意工坊與安全契約]] | 卡內 fail closed | 開關定向或實驗分桶 |
| [[concepts/C4與ADR]] | 說明方式入口 | 本頁不是「已決定上開關平臺」的 ADR |
| 髮卡 recipe / 世界書 | 條目與元件裝配 | 功能開關 payload |

工坊主路徑仍是同步 REST 與 `pending → approved / rejected / withdrawn`，見對照頁。那是產品狀態機，不是 OpenFeature 評估。卡內 if/else 或世界書條件注入，見 [[concepts/世界書注入路徑]]，不要寫成 Evaluation API。行業「何時用」仍看 [[comparisons/行業架構方案何時用]]，本頁不改那張表。

## 來源與證據

- 開關定義：OpenFeature 導論「執行時 if/else」；Unleash 概念頁「不改原始碼管理功能」。
- OpenFeature 不算值：[規範倉 README](https://github.com/open-feature/spec)；Provider 概念頁。
- 動態/靜態上下文：Evaluation Context 概念頁與 [SDK 兼容表](https://openfeature.dev/docs/reference/sdks/sdk-compatibility)。
- Unleash 評估地點：[架構總覽](https://docs.getunleash.io/get-started/unleash-overview) 四格表；SDK 總覽重複同一句。
- GrowthBook 預設本地算、可選遠端算：[SDK 總覽](https://docs.growthbook.io/lib) 與 Remote Evaluation 專頁。
- 廠商對 OpenFeature 的保留：Unleash SDK 頁標 Beta，並建議印象資料 / impact metrics 用原生 SDK；GrowthBook OpenFeature 頁寫粘性分桶、Visual Editor、SSE 用原生 SDK。
- CNCF：2022-06-17 接受，2023-11-21 Incubating。Apache-2.0。
- 賬本：[[queries/第二批蒸餾目標]] B2-Flag。分路原稿仍在 [[10-收件箱/寫回候選/概念-功能開關與OpenFeature]]。

已知衝突見上節，不靜默覆蓋。工坊或髮卡真機未核任何開關平臺——本來就沒有已落地的 Provider 可驗。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[queries/第二批蒸餾目標]]
- [[10-收件箱/寫回候選/概念-功能開關與OpenFeature]]
- [[concepts/後端架構名詞與工坊對照]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/OpenAPI與Arazzo]]
- [[concepts/狀態機與SCXML]]
- [[concepts/DORA五項與SLO]]
- [[concepts/邊緣快取與SWR]]
- [[concepts/事件溯源與CQRS]]
- [[concepts/Saga三義與補償]]
- [[concepts/C4與ADR]]
- [[concepts/創意工坊與安全契約]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/世界書注入路徑]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/工坊架構該上與不該上]]
