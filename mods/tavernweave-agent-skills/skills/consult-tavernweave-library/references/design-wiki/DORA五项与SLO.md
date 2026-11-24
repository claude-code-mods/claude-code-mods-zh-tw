---
title: DORA五項與SLO
created: 2026-08-14
updated: 2026-08-14
type: concept
status: active
tags:
  - wiki
  - concept
  - research
  - tooling
sources:
  - https://dora.dev/guides/dora-metrics/
  - https://dora.dev/insights/dora-metrics-history/
  - https://dora.dev/research
  - https://dora.dev/quickcheck/
  - https://sre.google/sre-book/table-of-contents/
  - https://sre.google/sre-book/service-level-objectives/
  - https://sre.google/workbook/table-of-contents/
  - https://sre.google/workbook/implementing-slos/
  - https://sre.google/workbook/slo-engineering-case-studies/
  - https://sre.google/workbook/alerting-on-slos/
  - https://sre.google/resources/book-update/slos/
knowledge_class: factual
---

# DORA五項與SLO

本頁不是已採用 KPI，也不是本倉庫已落地的儀表盤。檢索日 2026-08-14。賬本來自 [[queries/第三批蒸餾目標]] B3-DORA 與 [[queries/第二批蒸餾目標]] B2-Book。

## 一句話定義

DORA 五項是軟體**交付結果**的吞吐與不穩指標；SLO 是使用者可感知可靠性的**目標值**。兩套東西相鄰，不是同一張表。

## 為什麼重要

團隊需要能對照、能改進的交付結果，也需要能做取捨的可靠性目標。DORA 用五項預測組織績效與成員福祉；SRE 用 SLI / SLO / 錯誤預算決定先做功能還是先補可靠。本頁只收官方入口，不把它們寫成工坊或髮卡已經在跑的 KPI。

## 如何運作

### 現行五項（不是四鍵）

[DORA 指南](https://dora.dev/guides/dora-metrics/)（2026-01-05）寫明現行是**五項**，從最初四鍵演到現在。按吞吐 / 不穩分組：

| 因子 | 指標 | 量什麼 |
|---|---|---|
| 吞吐 Throughput | Change lead time | 提交進版本控制 → 部署到生產 |
| 吞吐 | Deployment frequency | 一段時間內的部署次數，或兩次部署間隔 |
| 吞吐 | Failed deployment recovery time | 一次需要立刻干預的失敗部署，恢復要多久 |
| 不穩 Instability | Change fail rate | 部署後必須立刻干預（回滾 / hotfix）的比例 |
| 不穩 | Deployment rework rate | 因生產事故而做的**計劃外**部署比例 |

研究結論：速度與穩定長期不是互斥；高績效組五項都好，低績效組五項都差。指南要求按**單個應用或服務**量，不要把多團隊、多系統揉成一個組織分去比。

[演變史](https://dora.dev/insights/dora-metrics-history/)（2026-01-02）：2014 先試四變數，當年變更失敗率未並進同一潛變數；2015 才定吞吐 / 穩定對偶；2018 另加可用性，改稱 SDO，交付核仍是四鍵；2021 可用性擴成可靠性，年報曾誤把可靠性叫「第五項」——史文明寫那是**運營績效**，不是交付第五項；2023 把 MTTR / 恢復服務時間改成 Failed deployment recovery time，只覆蓋**變更引起**的損傷，不含機房停電這類外因；2024 才把 Deployment rework rate 加成交付第五項。恢復時間現在算吞吐，不再跟舊 MTTR 一起算穩定。

年報入口只記 [dora.dev/research](https://dora.dev/research)。Core Model 故意落後於當年分析。自測入口 [Quick Check](https://dora.dev/quickcheck/) 現為五題，不存答案。

### SLO 專章（只收官方 HTML）

SRE 本頁只收書中 SLO 專章與 Workbook 相關章，走 [sre.google](https://sre.google/sre-book/table-of-contents/) 合法 HTML（CC BY-NC-ND 4.0）。不收盜版 PDF，不把整本 SRE / Accelerate 當本頁正文。

[書第 4 章](https://sre.google/sre-book/service-level-objectives/) 三分：

- **SLI**：某方面服務水平的定量指標（延遲、錯誤率、可用性 / yield、耐久）。
- **SLO**：該 SLI 的目標或區間。問「沒達到會怎樣」若無約定後果，多半隻是 SLO。
- **SLA**：含後果的合同（退款、處罰等）。SRE 通常不寫 SLA，但要幫著避免觸發後果。

[Workbook 第 2 章](https://sre.google/workbook/implementing-slos/) 把 SLI 寫成 good / total；錯誤預算 = `100% − SLO`。100% 不是合理目標：使用者鏈路本身不滿 100%，且變更是故障主因。沒有經批准的 SLO、沒有錯誤預算政策，SLO 只是又一個彙報數字，不是決策工具。同書第 3 章是案例，第 5 章把 SLO 收成告警（推薦多視窗多燃燒率）。官方索引：[SLO 專章入口](https://sre.google/resources/book-update/slos/)。

## 例子

- 正例：對**一個**生產服務量五項，用 Quick Check 或對話定基線，再改最緊約束。
- 正例：首頁「100 毫秒內成功返回的請求 / 全部請求」作 SLI，SLO 99.9%，四周錯誤預算用來決定能不能發大功能。
- 反例：下令「年底每應用每天必須部署多次」——指南點名這是把指標當目標（Goodhart）。
- 反例：把手機殼與大型機、或把髮卡 JSON 與工坊 Gateway 揉成一個 DORA 分。
- 反例：`verify-repo` 綠、或工坊 `approved`，寫成 Change lead time / Change fail rate 已落地。

## 邊界與易混概念

- 不包括：盜版 Accelerate / SRE PDF；攻擊演練；把年報 PDF 映象進 Vault。
- 不包括：本倉庫已實施的 DORA 儀表盤或 SLO 燃燒告警——**沒有這回事**。
- 易混：四鍵（舊交付核）≠ 2021 誤稱的「第五項可靠性」≠ 2024 起的交付五項。
- 易混：MTTR / 恢復服務時間 ≠ Failed deployment recovery time。後者只覆蓋變更引發、需立刻干預的失敗部署。
- 易混：Change fail rate ≠ Deployment rework rate。前者是失敗部署佔比，後者是事故觸發的計劃外部署佔比。
- 易混：DORA 五項 ≠ SLO / SLI / SLA。前者是交付結果；後者是使用者體驗目標與合同。
- 易混：錯誤預算 ≠ 產品釋出門。預算管可靠性與功能的取捨；釋出門管「這件東西能不能出」。
- 區分：先問「在量交付過程還是使用者體驗」；再問「有沒有合同後果」；最後問「這是研究指標還是本倉產品檢查單」。

## 對映到本倉庫（產品門 ≠ DORA 五項）

髮卡釋出門、工坊稽核門、Wiki 靜態門都是**產品門**。它們回答「這份產物能不能出」。DORA 五項回答「這個應用的交付過程快不穩不穩」。**不要把 DORA 寫成工坊 KPI 已落地。**

| 本倉門 | 實際在驗 | 不是 |
|---|---|---|
| 髮卡釋出門 | 真機匯入 SillyTavern：能進、世界書能載入、首條正常、已宣告擴充套件能起。見 [[50-創意庫/README]]、[[concepts/打包回封路徑]] | Deployment frequency / Change lead time |
| Wiki / 蒸餾門 | 來源可定位 + `verify-repo`。知識攝入不套真機 | 五項裡的任何一項 |
| 工坊釋出 / 稽核門 | 狀態機 `pending → approved / rejected / withdrawn`；公開列表只出已批准。見 [[comparisons/工坊架構該上與不該上]] | Change fail rate、SLO、錯誤預算 |
| 打包回封 | compose / pack / 嵌入對賬；創意庫 `allow_release: false` 不產出髮卡物 | Failed deployment recovery time |
| 卡內 fail closed | 宿主契約失敗則停，不是燃燒率告警。見 [[concepts/創意工坊與安全契約]] | Workbook 第 5 章的 SLO 告警 |

對照句：卡A / 卡B / 怪談「已驗證穩定、可有已知 bug」是產品類，不是 SLO 未破。工坊同步 REST 與稽核狀態機是已用後端形態，不是 DORA 採集管線。行業「何時用」仍看 [[comparisons/行業架構方案何時用]]，本頁不改那張表。

## 來源與證據

權威入口 11 條（6–12 範圍內）：

1. [DORA 五項指南](https://dora.dev/guides/dora-metrics/) — 現行定義、分組、誤區。
2. [五項演變史](https://dora.dev/insights/dora-metrics-history/) — 四鍵 → 五項；MTTR 改名；2021 誤稱。
3. [年報與 Core 入口](https://dora.dev/research) — 只記此入口，不映象各年 PDF。
4. [DORA Quick Check](https://dora.dev/quickcheck/) — 五題自測。
5. [SRE 書目錄](https://sre.google/sre-book/table-of-contents/) — B2-Book 合法總入口。
6. [書第 4 章 SLO](https://sre.google/sre-book/service-level-objectives/) — SLI / SLO / SLA。
7. [Workbook 目錄](https://sre.google/workbook/table-of-contents/) — 只從這裡進專章。
8. [Workbook 第 2 章](https://sre.google/workbook/implementing-slos/) — 錯誤預算配方。
9. [Workbook 第 3 章](https://sre.google/workbook/slo-engineering-case-studies/) — 案例，不是規範。
10. [Workbook 第 5 章](https://sre.google/workbook/alerting-on-slos/) — 按 SLO 告警。
11. [官方 SLO 專章索引](https://sre.google/resources/book-update/slos/) — 書 + Workbook 合法彙總。

已知衝突（不靜默覆蓋）：

- 現行五項 vs 大量舊文、培訓、工具仍寫四鍵。
- 2021 年報把可靠性叫「第五項」；史文與 2024 模型都否定它是交付第五項。交付第五項是 2024 的 Deployment rework rate。
- 2023 起恢復時間只覆蓋變更失敗；舊 MTTR 覆蓋更寬。
- 恢復時間：2015 模型在穩定側，2026 指南在吞吐側。兩邊按年份留。
- 2024 年報 PDF 在 [research](https://dora.dev/research) 下仍有「four keys」殘留句，同時正文已出現五項因子表。以指南 + 演變史為現行定義，年報按年引用，不刪 PDF 裡的舊句。
- DORA 五項與 SLO 不是同一套指標；錯誤預算不是髮卡 / 工坊釋出門。
- SRE 只收官方 HTML 專章。Accelerate 紙書與盜版 PDF 不進本頁。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 `SCHEMA.md` 的 Tag Taxonomy
- [x] 已釋出到正式區，並同步 `index.md` 與 `log.md`

## 相關內容

- [[queries/第三批蒸餾目標]]
- [[queries/第二批蒸餾目標]]
- [[concepts/後端架構名詞與工坊對照]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
- [[concepts/打包回封路徑]]
- [[concepts/創意工坊與安全契約]]
- [[50-創意庫/README]]
