---
title: SBOM與SLSA
created: 2026-08-14
updated: 2026-08-15
type: concept
status: active
tags:
  - wiki
  - concept
  - tooling
  - research
  - safety
sources:
  - https://spdx.dev/
  - https://spdx.dev/learn/overview/
  - https://spdx.dev/use/specifications/
  - https://spdx.github.io/spdx-spec/v3.0.1/
  - https://spdx.dev/spdx-3-1-ontology-and-schema-available-for-review/
  - https://cyclonedx.org/
  - https://cyclonedx.org/specification/overview/
  - https://cyclonedx.org/capabilities/sbom/
  - https://cyclonedx.org/docs/1.7/json/
  - https://slsa.dev/
  - https://slsa.dev/spec/v1.2/
  - https://slsa.dev/spec/v1.2/about
  - https://slsa.dev/spec/v1.2/provenance
  - https://docs.sigstore.dev/
  - queries/第五批蒸餾目標.md
  - concepts/創意工坊與安全契約.md
knowledge_class: factual
---

# SBOM與SLSA

本頁不是已採用清單格式，也不是工坊或角色卡必須上 SBOM / SLSA 的工單。檢索時間：2026-08-14。賬本樞紐是 [[queries/第五批蒸餾目標]] **B5-SBOM**（14 條官方入口，本頁全收）。只談公開規範分層，不寫利用、繞過簽名、偽造身份或供應鏈攻擊步驟。

## 一句話定義

SBOM（Software Bill of Materials）是製品裡有哪些軟體成分的**清單文件**。現行社群至少有兩份互不相容的清單標準：[SPDX](https://spdx.dev/) 與 [CycloneDX](https://cyclonedx.org/)。[SLSA](https://slsa.dev/) 是讓這類宣告更可信的完整性等級與出處證明，**不是**第三份 SBOM schema。[Sigstore](https://docs.sigstore.dev/) 是身份基簽名與透明日誌，可籤 SBOM，**不定義** BOM 物件模型。

## 為什麼重要

釋出物、依賴樹和構建記錄常被口頭說成「有 SBOM」。不分清單、等級、簽名，就會把許可證短名、一份 JSON、一份出處證明、一次簽名當成同一件事。本倉既有「無 SPDX」多半指 License List 短名缺失（[[concepts/動畫庫與動效管線|Spline runtime]]、[[concepts/CRDT與local-first|Upwelling]] 等），不證明已採用 SPDX 3 文件或 CycloneDX 1.7。先分層，再談要不要做。卡內 fail closed 仍歸 [[concepts/創意工坊與安全契約]]，與本頁的成分清單不是同一份合同。

## 權威入口

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [SPDX 樞紐](https://spdx.dev/) | System Package Data Exchange™ |
| 2 | [SPDX Overview](https://spdx.dev/learn/overview/) | 3.0 大改 2.2.1；License List 另述 |
| 3 | [SPDX Specifications](https://spdx.dev/use/specifications/) | Current 表寫 3.0 |
| 4 | [SPDX 3.0.1 HTML](https://spdx.github.io/spdx-spec/v3.0.1/) | 規範 HTML 標題 3.0.1 |
| 5 | [SPDX 3.1-RC1 公告](https://spdx.dev/spdx-3-1-ontology-and-schema-available-for-review/) | 2026-01-26；不升現行 |
| 6 | [CycloneDX 樞紐](https://cyclonedx.org/) | OWASP full-stack BOM |
| 7 | [CycloneDX Specification Overview](https://cyclonedx.org/specification/overview/) | 1.7 / ECMA-424 |
| 8 | [CycloneDX SBOM 能力頁](https://cyclonedx.org/capabilities/sbom/) | 只談軟體成分清單能力 |
| 9 | [CycloneDX 1.7 JSON](https://cyclonedx.org/docs/1.7/json/) | `bomFormat: "CycloneDX"` |
| 10 | [SLSA 樞紐](https://slsa.dev/) | 完整性框架；先生成 provenance |
| 11 | [SLSA specification v1.2](https://slsa.dev/spec/v1.2/) | 現行；Build + Source |
| 12 | [About SLSA](https://slsa.dev/spec/v1.2/about) | 配料表 vs 操作規範 |
| 13 | [SLSA Provenance](https://slsa.dev/spec/v1.2/provenance) | 出處 ≠ SBOM |
| 14 | [Sigstore 文件樞紐](https://docs.sigstore.dev/) | Cosign / Fulcio / Rekor；可籤 SBOM |

上表 **14** 條。CISA/NTIA 最低元素、ISO 目錄頁、`spdx.org` 許可證表本輪不當新條。B5-SBOM 的採集行不在本頁映象。

## 如何運作

### 四層，不要併成一份合同

| 層 | 代表 | 合同怎麼說 |
|---|---|---|
| 清單格式 A | SPDX | Linux Foundation；資料模型 + 多種序列化；可表示 SBOM 及其他 BOM |
| 清單格式 B | CycloneDX | OWASP / Ecma；另一份 BOM 物件模型；`bomFormat` 必須是 `"CycloneDX"` |
| 完整性等級 | SLSA | 軌道 + 級別 + 出處證明；不是第三份 SBOM schema |
| 簽名與透明日誌 | Sigstore | Cosign / Fulcio / Rekor；可籤 SBOM，不定義 BOM schema |

「有一份 JSON」不等於「已有 SPDX 文件」。有簽名也不等於有清單。

### SPDX：清單格式 A，不是短名錶

[樞紐](https://spdx.dev/)自稱 System Package Data Exchange™，能表示帶軟體元件的系統之 SBOM，以及 AI / 資料 / 安全引用。規範是可免費取得的國際開放標準（ISO/IEC 5962:2021）。

[Overview](https://spdx.dev/learn/overview/) 寫三種獨立用法：用 3.0 工具、套 3.0 規範、參與開發。規範定義底層資料模型與多種序列化。原重心是許可 / 安全 / 組成；**3.0 是對 SPDX 2.2.1 的大改**，而 2.2.1 即免費的 ISO/IEC 5962:2021。3.0 擴到 AI 模型、資料集、構建資訊。另述「經策展的 SPDX 許可證識別符號與例外」——那是**另一份** SPDX 產物，不是本頁的清單文件。

[規範索引](https://spdx.dev/use/specifications/) Current Version 表只列 **3.0**。[HTML](https://spdx.github.io/spdx-spec/v3.0.1/) 標題是 **Version 3.0.1**。兩邊並陳，不併號。[3.1-RC1](https://spdx.dev/spdx-3-1-ontology-and-schema-available-for-review/)（2026-01-26）是第一個 release candidate，不升現行。

### CycloneDX：清單格式 B，不是 SPDX 的序列化

[樞紐](https://cyclonedx.org/)自稱 full-stack Bill of Materials。能力分列 SBOM、SaaSBOM、CBOM、VEX、HBOM、AI/ML-BOM；與 SPDX 並列，不當同一清單。

[規範總覽](https://cyclonedx.org/specification/overview/) Current Version **1.7**（2025-10-21）。文件：JSON / XML / Protobuf。媒體型別：`vnd.cyclonedx+json`、`vnd.cyclonedx+xml`、`x.vnd.cyclonedx+protobuf`。Developed By：OWASP Foundation、Ecma International。Standards：**ECMA-424**（2025-12-10，TC54）。約定檔名 `bom.json` / `bom.xml` / `*.cdx.json` / `*.cdx.xml`。

[1.7 JSON](https://cyclonedx.org/docs/1.7/json/)：`bomFormat` **Required**，列舉只能是 `"CycloneDX"`（幫助識別檔案，因 BOM 無強制檔名、JSON Schema 無名稱空間）。`specVersion` Required。VEX / CBOM 是同規範下的**其他能力**，不併進「一份 SBOM」。CycloneDX 的 JSON 形狀可用 JSON Schema 描述，見 [[concepts/JSON Schema與Protobuf]]；那是文件約束，不是第二份清單標準。

### SLSA：讓清單可信，不是第三份 schema

[樞紐](https://slsa.dev/)：Supply-chain Levels for Software Artifacts，讀作 “salsa”。OpenSSF。級別是討論供應鏈有多硬的共同語言。入門寫「先生成 provenance」。**不是 BOM 格式站**。

[v1.2](https://slsa.dev/spec/v1.2/) 是本輪核到的現行規範：軌道 + 級別 + 建議的 attestation（含 provenance）。Build Track 與 Source Track 分列。Provenance 與 VSA **建議、非規範必選**。同站 v1.1 仍活，頁上橫幅寫 1.2 才是 current。

[About](https://slsa.dev/spec/v1.2/about) 官方分層句：SBOM 像配料表；**SLSA 是讓配料表可信的食品安全操作規範**。SLSA 不告訴你原始碼是否按安全編碼寫；一件製品的 SLSA 級別**獨立於**其依賴的級別。軌道內級別遞增；文中寫 Build Track 現為 Level 1–3。

[Provenance](https://slsa.dev/spec/v1.2/provenance) = 可驗證資訊，把製品沿供應鏈追回產地：在哪、何時、如何產出。Build provenance ≠ Source provenance ≠ SBOM。

### Sigstore：籤製品，不定義清單

[文件樞紐](https://docs.sigstore.dev/)：OpenSSF / Linux Foundation 公益服務。籤的物件包括髮行檔案、容器、二進位制、**SBOM** 等。短命金鑰。三件：Cosign 客戶端；Fulcio 證書機構（OIDC 身份綁到短命證）；Rekor 只追加透明日誌。身份基 / “keyless” 是預設；不是第三份清單格式。OIDC 委託本身見 [[concepts/OAuth與OIDC]]，本頁不重抄。本頁只收概念，不抄簽發命令。

## 本輪版本快照

| 物件 | 頁上怎麼寫 | 不當成 |
|---|---|---|
| SPDX 社群現行 HTML | 3.0.1 | ISO 5962；3.1-RC1 |
| SPDX 規範索引 Current | 3.0 | 與 3.0.1 強行並號 |
| SPDX ISO | 5962:2021 = 2.2.1 | 「ISO 已是 3.x」 |
| CycloneDX 規範 | 1.7（2025-10-21）；ECMA-424（2025-12-10） | SPDX 的一種序列化 |
| SLSA | v1.2 現行；v1.1 頁仍在 | 第三份 SBOM |
| Sigstore | Cosign + Fulcio + Rekor | BOM schema |

## 必須保留的衝突

- **SPDX ≠ CycloneDX。** 兩份獨立清單標準：組織（Linux Foundation vs OWASP/Ecma）、現行社群版本（SPDX 3.0.1 HTML vs CycloneDX 1.7）、國際標準號（ISO/IEC 5962:2021 = SPDX **2.2.1** vs ECMA-424）、媒體型別與檔案約定、物件模型都不同。CycloneDX 要求 `bomFormat: "CycloneDX"`。不能寫成「SBOM 就是 SPDX」或「兩者是同一份清單的兩個序列化」。兩邊都留，本頁不裁定誰當工坊預設。
- **ISO 5962 ≠ SPDX 3。** 樞紐/規範索引把「SPDX 規範」掛到 ISO/IEC 5962:2021；Overview 寫明該 ISO 是 **2.2.1**。索引 Current 寫 3.0，HTML 標題寫 3.0.1。3.1 只是 RC。
- **SLSA / Sigstore 不是清單。** About 把 SLSA 寫成讓 SBOM 可信的處理規範；Sigstore 只籤製品。不要第三份 schema。
- **許可證短名 ≠ SBOM。** 本倉既有「無 SPDX」不證明已採用 SPDX 3 文件。
- 本頁對映的是成分清單與出處分層；**不是**「工坊必須上 SPDX / CycloneDX / SLSA」。

## 例子

- 正例：一份 CycloneDX 1.7 JSON 寫 `bomFormat: "CycloneDX"` 與 `specVersion`，列出元件與依賴。
- 正例：同一製品另附 SLSA Build provenance，說明在哪、何時、如何產出。
- 正例：用 Sigstore 簽上述 SBOM 檔案；驗證看身份、根信任與 Rekor 收錄，不把簽名當第二份 schema。
- 反例：把「倉庫有 SPDX-License-Identifier: MIT」寫成「已有 SBOM」。
- 反例：把 SPDX 與 CycloneDX 寫成同一份清單的兩種序列化。
- 反例：把 SLSA 級別或 Cosign 簽名寫成第三份 BOM 格式。

## 邊界與易混概念

- 不包括：掃描器接入課、簽發命令、自建證書機構或透明日誌菜譜。
- 不包括：威脅步驟、繞過簽名、偽造身份、供應鏈利用。
- 不包括：CISA/NTIA 最低元素、Wikipedia、廠商部落格當規範。
- 不包括：本倉庫已落地的 SBOM 管線或預設格式——**沒有這回事**。
- 易混：許可證短名 ≠ SBOM 文件。Overview 另述 License List；本倉「無 SPDX」指短名缺失。
- 易混：ISO/IEC 5962:2021 ≠ SPDX 3。ISO 是 2.2.1；3.0 是對它的大改。
- 易混：SLSA provenance ≠ SBOM。出處證明追產地；清單列成分。
- 易混：Sigstore 簽名 ≠ BOM schema。籤的是製品（可含 SBOM）。
- 易混：CycloneDX 的 VEX / CBOM ≠ 「一份 SBOM」。同規範下的其他能力。
- 區分：先問「在寫清單、在談完整性等級，還是在簽名」；再問「這是 SPDX、CycloneDX，還是本倉許可欄短名」。

## 對映到本倉庫

對映放最後，不當過濾器。行業合同對髮卡和工坊都成立，**不是「卡不能談成分清單」**。本頁不宣佈已接線，也不選預設格式。

| 本倉物 | 實際在驗 | 不是 |
|---|---|---|
| 「無 SPDX」/ Spline runtime | 許可證短名或 LICENSE 缺失 | SPDX 3 文件或 CycloneDX 1.7 |
| `verify-repo` / `harness-smoke` | 靜態連結與協議接通 | SBOM 生成或 SLSA 級別 |
| 工坊 Gateway 釋出物 | 包與所有權生命週期 | 已附 provenance 或 Cosign |
| 創意工坊安全契約 | 宿主 fail closed | 供應鏈完整性軌道 |
| 髮卡回封 / 構建鏈 | compose/pack 或行業打包器 | 已附 SBOM；見 [[concepts/打包回封路徑]]、[[concepts/構建鏈與Vite]] |
| 叢集工作負載 | Pod / Deployment 物件 | 映象已帶 SLSA；見 [[concepts/Kubernetes工作負載]] |

瀏覽器防禦頭見 [[concepts/CSP與Trusted Types]]，與本頁清單不是同一份。第五批把 SBOM 與 OAuth、OCI 同組為「身份與清單」：委託框架 / BOM 格式 / 映象合同，都不是髮卡依賴。錯誤體合同見 [[concepts/HTTP合同與問題詳情]]，也不在本頁。

## 來源與證據

- SPDX 分層與 3.0 大改 2.2.1：樞紐、Overview、規範索引 Current 表、3.0.1 HTML 標題、3.1-RC1 公告（2026-01-26）。
- ISO/IEC 5962:2021 = SPDX 2.2.1：Overview 原文；不能寫成「ISO 已是 3.x」。
- CycloneDX 1.7 / ECMA-424 / `bomFormat`：規範總覽與 1.7 JSON。
- SLSA v1.2 現行、provenance ≠ SBOM：v1.2 文首、About 配料表句、Provenance 頁。同站 v1.1 仍活，橫幅寫 1.2 才是 current。
- Sigstore 三件與可籤 SBOM：文件樞紐；不抄簽發命令。
- 查詢賬本：[[queries/第五批蒸餾目標]] B5-SBOM。

已知衝突見上節，不靜默覆蓋。3.1 是否已在檢索日之後升現行、SLSA 是否另出新 current：以各站文首為準，本頁不預支。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] SPDX vs CycloneDX 沒有併成一份清單
- [x] 衝突沒有被靜默覆蓋
- [x] 無利用 / 繞過 / 攻擊步驟
- [x] `tags` 只使用 SCHEMA 已有詞（含 `safety`：只談規範分層）
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[concepts/創意工坊與安全契約]]
- [[concepts/CSP與Trusted Types]]
- [[concepts/OAuth與OIDC]]
- [[concepts/JSON Schema與Protobuf]]
- [[concepts/構建鏈與Vite]]
- [[concepts/打包回封路徑]]
- [[concepts/Kubernetes工作負載]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/動畫庫與動效管線]]
- [[concepts/CRDT與local-first]]
- [[queries/第五批蒸餾目標]]
- [[queries/第二批蒸餾目標]]
