---
title: CSP與Trusted Types
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
  - https://www.w3.org/TR/CSP3/
  - https://www.w3.org/TR/CSP2/
  - https://www.w3.org/TR/trusted-types/
  - https://www.w3.org/TR/SRI/
  - https://www.w3.org/TR/2016/REC-SRI-20160623/
  - https://www.w3.org/TR/permissions-policy-1/
  - https://www.w3.org/TR/reporting-1/
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
  - https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
  - https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Permissions_Policy
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy
  - 10-收件箱/寫回候選/第五批-B5-CSP.md
  - queries/第五批蒸餾目標.md
  - concepts/創意工坊與安全契約.md
knowledge_class: factual
---

# CSP與Trusted Types

本頁不是已採用防禦棧，也不是工坊或宿主必須改響應頭的工單。檢索時間：2026-08-14。只寫瀏覽器防禦合同，不寫繞過、payload、攻擊步驟或 PoC。

## 一句話定義

四份合同互補，不是同一份頭。Content Security Policy（CSP）約束文件能取/執行哪些資源；Trusted Types 把 DOM XSS 注入匯鎖成只收不可偽造的型別化值；Subresource Integrity（SRI）核子資源位元組是否對得上作者給出的雜湊；Permissions Policy 選擇開關瀏覽器能力。Trusted Types 的執行指令掛在 CSP 上。

## 為什麼重要

使用者代理預設會按文件宣告去取並執行指令碼、樣式、框和 worker。作者需要一份瀏覽器能執行的合同，而不是事後靠字串掃描。CSP3 文首寫明：CSP **不是**注入防護第一線，是縱深。Trusted Types 只管 DOM 注入匯，不管服務端生成標記。卡內 origin allowlist 與契約 1.1.0 fail closed 是應用合同，見 [[concepts/創意工坊與安全契約]]，不要和瀏覽器頭併成一份。

## 權威入口

| # | 入口 | 檢索日狀態 | 管什麼 |
|---|---|---|---|
| 1 | [CSP3](https://www.w3.org/TR/CSP3/) | **WD 2026-08-13** | 現行短名 `/TR/CSP/` 也落到這裡。按 Fetch 重寫 |
| 2 | [CSP2](https://www.w3.org/TR/CSP2/) | **Rec 2016-12-15** | 目前唯一 Recommendation |
| 3 | [Trusted Types](https://www.w3.org/TR/trusted-types/) | **WD 2026-06-23** | DOM XSS 注入匯的型別鎖 |
| 4 | [SRI 現行短名](https://www.w3.org/TR/SRI/) | **WD 2026-03-20** | `integrity`；另加 Integrity-Policy |
| 5 | [SRI 2016 Rec](https://www.w3.org/TR/2016/REC-SRI-20160623/) | **Rec 2016-06-23** | 仍在的 Recommendation；無 Integrity-Policy |
| 6 | [Permissions Policy](https://www.w3.org/TR/permissions-policy-1/) | **WD 2026-06-18** | 能力開關；曾用名 Feature Policy |
| 7 | [Reporting API](https://www.w3.org/TR/reporting-1/) | **WD 2025-06-11** | `report-to` 共用基礎設施 |
| 8 | [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) | 指南 | 投遞頭 vs `http-equiv` |
| 9 | [MDN Trusted Types API](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API) | **Baseline Newly**（2026-02 起） | 三型別；策略由作者自寫 |
| 10 | [MDN SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) | 指南 | `sha256` / `sha384` / `sha512`；跨源須 CORS |
| 11 | [MDN Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Permissions_Policy) | **Experimental，非 Baseline** | 頭與 iframe `allow` |
| 12 | [MDN Permissions-Policy 頭](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy) | 頭參考 | 指令表與 `report-to` 引數 |

上表 **12** 條。`/TR/CSP/` 與 1 同文，`/TR/feature-policy/` 與 6 同文，不另計。採集賬本見 [[queries/第五批蒸餾目標]] 與 [[10-收件箱/寫回候選/第五批-B5-CSP]]。MDN 指南正文若含威脅示例，本頁不摘。

## 如何運作

### 四份合同怎麼分

1. **CSP**：伺服器（或早期 `meta`）告訴使用者代理：這個文件能取哪些子資源、能否跑行內指令碼/樣式、誰能嵌它。L3 用 Fetch 掛鉤。`meta http-equiv` **不支援** Report-Only，也不支援 `report-uri` / `frame-ancestors` / `sandbox`。
2. **Trusted Types**：只鎖 **DOM XSS 注入匯**。作者定義策略，匯只收 `TrustedHTML` / `TrustedScript` / `TrustedScriptURL`。服務端反射、資源禁閉、外洩、一般子資源載入，規範列為 **非目標**，並回指模板系統或 CSP `script-src`。執行面靠 CSP 指令 `require-trusted-types-for` / `trusted-types`。
3. **SRI**：核的是**內容雜湊**，不是伺服器身份。TLS 只證明連對了誰。跨源帶 `integrity` 必須能按 CORS 讀到體。2016 Rec 只管 `script`/`link` 上的 `integrity`；2026 WD 另加文件級 Integrity-Policy。
4. **Permissions Policy**：管能力（地理、全屏、攝像頭等），不管指令碼從哪來。與 Permissions API（使用者授權）不是同一份。停用後子框不能自己再開啟。

報告通道：L3 把 `report-uri` 標為棄用，改走 `report-to` + Reporting API；兩者同時出現時以後者為準。Reporting API 本身不是防禦指令。

### 現行 Level 與短名

[CSP2](https://www.w3.org/TR/CSP2/) 是 **2016-12-15 Recommendation**，目前唯一 Rec。文首寫 WG **預期** L3 廢止本 Rec，並鼓勵實現跟 L3。

[CSP3](https://www.w3.org/TR/CSP3/) 檢索日是 **Working Draft，2026-08-13**。現行短名 `/TR/CSP/` 落到 L3，不是 Rec。L3 按 Fetch 重寫；恢復 `frame-src`；增加 `worker-src`；`report-uri` 讓位 `report-to`。檢索日 L3 **尚未**廢止 L2。

引用必須寫清 Level 與成熟度，不能把短名當成 Rec。實現可以跟 L3 WD，引用 Rec 時仍要能指到 L2。

### Trusted Types 不是 CSP 替代

[Trusted Types](https://www.w3.org/TR/trusted-types/) 引言與 Non-goals 寫明：目標是 DOM 注入匯；不管服務端生成標記、資源禁閉、外洩、跨源 `data:` 文件執行，也不防惡意作者。MDN 寫明 API **不自帶淨化**，策略由作者自寫。TT 指令掛在 CSP 上，**不能**寫成「有 TT 就不必 CSP」。

MDN 標 Trusted Types 為 Baseline Newly（2026-02 起）；Permissions Policy 標 Experimental、非 Baseline。不要寫成同一成熟度。

## 必須保留的衝突

- **CSP2 Rec vs CSP3 WD。** 2 是 Rec；1 是 WD，且 `/TR/CSP/` 現落到 1。L2 文首鼓勵實現跟 L3，並預期 L3 廢止 L2；檢索日 L3 **尚未**廢止 L2。引用必須寫清 Level 與成熟度，不能把短名當成 Rec。
- Trusted Types 只覆蓋 DOM XSS 一角；TT 指令掛在 CSP 上，不能替代 CSP。
- SRI 短名現為 2026 WD；2016 Rec 仍在 dated URL。Integrity-Policy 只在新 WD。
- Permissions Policy ≠ Feature Policy 舊頭。改名後 HTTP 語法變了；iframe `allow` 仍是舊寫法。
- Permissions Policy ≠ Permissions API ≠ CSP。
- Reporting API 仍是 WD（2025-06-11）；L3 的 `report-to` 建在這份草稿上。
- 本頁是入口蒸餾，**不是**「工坊或宿主必須上 CSP3」。

## 例子

- 正例：新站點實現跟 L3 WD，文件同時標明 `/TR/CSP3/` 是 WD、`/TR/CSP2/` 仍是 Rec。
- 正例：用 HTTP 頭髮 CSP；需要 `frame-ancestors` / `sandbox` / Report-Only 時不用 `meta http-equiv`。
- 正例：DOM 寫入匯走 Trusted Types 策略；指令碼從哪來仍用 CSP `script-src`。
- 正例：跨源指令碼同時給 `integrity` 與 CORS，讓使用者代理能讀體核雜湊。
- 正例：能力開關用 Permissions-Policy 頭；巢狀框的 `allow` 按舊 Feature Policy 寫法單獨寫。
- 反例：把 `/TR/CSP/` 短名寫成 Recommendation。
- 反例：聲稱 L3 已廢止 L2，或把 L2 當現行實現真源而不標成熟度。
- 反例：寫「上了 Trusted Types 就不必 CSP」。
- 反例：把卡內 origin allowlist 叫做瀏覽器 CSP。
- 反例：把本頁當成繞過、payload 或 PoC 手冊。

## 邊界與易混概念

- 不包括：繞過、XSS payload、攻擊步驟、PoC、nonce 操作手冊、淨化庫配置、卡 JSON/PNG、憑證。
- 不包括：各瀏覽器對 L3 指令的實現差表；HTML / Fetch 裡 integrity 與 CSP 掛鉤的逐節演算法。
- CSP ≠ Trusted Types ≠ SRI ≠ Permissions Policy。四份互補。
- CSP ≠ 卡內安全契約。後者是應用層 fail closed，見 [[concepts/創意工坊與安全契約]]。
- Permissions Policy ≠ Permissions API。前者是文件/框的能力合同，後者是使用者授權提示。
- SRI ≠ TLS。雜湊核內容，證書核身份。
- `report-uri` ≠ `report-to`。L3 以後者為準；通道本身不構成允許列表。
- 易混：聽到「有 CSP」就以為注入已防住。CSP3 自己說它是縱深，不是第一線。

## 對映到本倉庫

[[concepts/創意工坊與安全契約]] 的 origin allowlist 與契約 1.1.0 fail closed 是**卡內應用合同**，不是瀏覽器 CSP / Trusted Types / SRI / Permissions Policy。

[[concepts/git掛載與遠端真身]] 只順口提到 CSP，不升本頁新發現。iframe 誰造窗見 [[concepts/酒館宿主與iframe分層]]。錯誤體合同見 [[concepts/HTTP合同與問題詳情]]，與本頁防禦頭不是同一份。

本頁只回答「這四份防禦合同分別管什麼、哪一級成熟」。不把工坊 Gateway 或酒館宿主寫成必須部署上述頭。未聲稱本倉庫髮卡已帶這些頭。

## 來源與證據

- CSP2 Rec：`/TR/CSP2/` 文首 2016-12-15 Recommendation；預期 L3 廢止、鼓勵跟 L3。
- CSP3 WD：`/TR/CSP3/` 文首 WD 2026-08-13；短名 `/TR/CSP/` 同文；文首「不是注入防護第一線」。
- Trusted Types：`/TR/trusted-types/` WD 2026-06-23；引言與 Non-goals。
- SRI：短名 `/TR/SRI/` WD 2026-03-20；dated Rec 2016-06-23。
- Permissions Policy：`/TR/permissions-policy-1/` WD 2026-06-18；`/TR/feature-policy/` 同文。
- Reporting：`/TR/reporting-1/` WD 2025-06-11。
- MDN：CSP 指南、Trusted Types API（Baseline Newly）、SRI、Permissions Policy（Experimental）。
- 採集賬本：[[queries/第五批蒸餾目標]] B5-CSP；分路原稿 [[10-收件箱/寫回候選/第五批-B5-CSP]]。

已知衝突見上節，不靜默覆蓋。L3 是否已在檢索日之後廢止 L2：以 `/TR/CSP2/` 與 `/TR/CSP3/` 文首為準，本頁不預支。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋（CSP2 Rec vs CSP3 WD 兩邊留）
- [x] 只寫防禦合同，未寫繞過、payload、攻擊步驟、PoC
- [x] `tags` 只使用 SCHEMA 已有詞（含 `safety`：只談規範合同）
- [x] 已釋出到正式區

## 相關內容

- [[concepts/創意工坊與安全契約]]
- [[concepts/git掛載與遠端真身]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/HTTP合同與問題詳情]]
- [[queries/第五批蒸餾目標]]
- [[10-收件箱/寫回候選/第五批-B5-CSP]]
