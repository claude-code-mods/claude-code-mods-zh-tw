---
title: OAuth與OIDC
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
  - https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/
  - https://datatracker.ietf.org/wg/oauth/documents/
  - https://www.rfc-editor.org/rfc/rfc6749.html
  - https://www.rfc-editor.org/rfc/rfc6750.html
  - https://www.rfc-editor.org/rfc/rfc7636.html
  - https://www.rfc-editor.org/rfc/rfc8252.html
  - https://www.rfc-editor.org/rfc/rfc8414.html
  - https://www.rfc-editor.org/rfc/rfc9101.html
  - https://www.rfc-editor.org/rfc/rfc9126.html
  - https://www.rfc-editor.org/rfc/rfc9207.html
  - https://www.rfc-editor.org/rfc/rfc9449.html
  - https://www.rfc-editor.org/rfc/rfc9700.html
  - https://www.rfc-editor.org/rfc/rfc9728.html
  - https://openid.net/developers/specs/
  - https://openid.net/specs/openid-connect-core-1_0.html
  - https://openid.net/specs/openid-connect-discovery-1_0.html
  - https://openid.net/specs/fapi-security-profile-2_0-final.html
  - https://www.w3.org/TR/fedcm/
  - queries/第五批蒸餾目標.md
  - queries/第二批蒸餾目標.md
  - concepts/後端架構名詞與工坊對照.md
knowledge_class: factual
---

# OAuth與OIDC

本頁不是已採用授權棧，也不改工坊或角色卡鑑權。檢索時間：2026-08-14。只談公開規範入口，不寫攻擊步驟、繞過、PoC 或憑證。賬本樞紐是 [[queries/第五批蒸餾目標]] **B5-OAuth**（15 條入口，本頁全收）。人到依賴方的公鑰憑證見 [[concepts/通行金鑰規範入口]] 與 [[queries/第二批蒸餾目標]] **B2-Auth**，本頁不重抄。

## 一句話定義

OAuth 是委託框架：客戶端經授權伺服器拿到對受保護資源的有限訪問許可。OIDC 疊在 OAuth 2.0 上，用 `openid` scope 與 ID Token 回答「人是誰」。沒有這層就還是純委託。二者都不是授權模型，也不是通行金鑰。

## 為什麼重要

產品常把 RFC 6749、2.1 草案、OIDC、FAPI 併成「已經上了 OAuth 2.1」。哪一份已是 RFC / OpenID Final、哪一份仍是草案，決定能不能當現行合同引用。**OAuth 2.1 仍是草案**，不能寫成已廢止 2.0。工坊現網 OAuth 只證明發布者，見 [[concepts/後端架構名詞與工坊對照]]；本頁只給規範入口，不改那一頁的落點。

## 權威入口

檢索 2026-08-14。15 條，不是教程，也不映象全文。B2-Auth 的 WebAuthn / CTAP 行不在此表。規範安全節只鏈不展開。

| # | 入口 | 檢索日狀態 | 管什麼 |
|---|---|---|---|
| 1 | [RFC 6749](https://www.rfc-editor.org/rfc/rfc6749.html) | PS，2012-10；被 8252 / 8996 / 9700 更新 | OAuth 2.0 授權框架；廢止 1.0（5849） |
| 2 | [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750.html) | PS，2012-10；被 8996 / 9700 更新 | Bearer 持有即用；不是持有證明 |
| 3 | [RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html) | PS，2015-09 | PKCE；公開客戶端的 code 交換繫結 |
| 4 | [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252.html) | BCP 212，2017-10；更新 6749 | 原生應用走外部使用者代理 |
| 5 | [RFC 8414](https://www.rfc-editor.org/rfc/rfc8414.html) | PS，2018-06 | 授權伺服器元資料 |
| 6 | [RFC 9101](https://www.rfc-editor.org/rfc/rfc9101.html) | PS，2021-08 | JAR：請求引數進 JWT；與 PAR 互補 |
| 7 | [RFC 9126](https://www.rfc-editor.org/rfc/rfc9126.html) | PS，2021-09 | PAR：直推授權請求，換 `request_uri` |
| 8 | [RFC 9207](https://www.rfc-editor.org/rfc/rfc9207.html) | PS，2022-03 | 授權響應裡的 `iss` |
| 9 | [RFC 9449](https://www.rfc-editor.org/rfc/rfc9449.html) | PS，2023-09 | DPoP：應用層持有證明 |
| 10 | [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html) | BCP 240，2025-01；更新 6749 / 6750 / 6819 | 現行安全實踐；寫明 2.1 將吸收本文 |
| 11 | [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728.html) | PS，2025-04 | 受保護資源元資料；對 8414 |
| 12 | [draft-ietf-oauth-v2-1-15](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/) | **WG Document**；2026-03-02；過期 2026-09-03；里程碑 Dec 2026 交 IESG | 自稱將替換 6749 / 6750；**還不是 RFC** |
| 13 | [OIDC Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) | OpenID **Final**；短鏈已含 errata set 2；2023-12-15 | 疊在 OAuth 2.0 上的身份層與 ID Token |
| 14 | [OIDC Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html) | Final + errata set 2；2023-12-15 | RP 發現 OP 與 OAuth 端點 |
| 15 | [FAPI 2.0 Security Profile](https://openid.net/specs/fapi-security-profile-2_0-final.html) | OpenID **Final**，2025-02-22 | 高安全剖面，不是新框架 |

W3C 對照（不升為本表第 16 條）：[FedCM](https://www.w3.org/TR/fedcm/) 檢索日仍是 **FPWD，2024-08-20**。瀏覽器聯邦登入 API，不是 OAuth / OIDC 文字。B2-Auth 已收，見 [[concepts/通行金鑰規範入口]]。

刻意未收：`draft-ietf-oauth-browser-based-apps`（RFC Ed Queue，尚無 RFC 號）；`draft-ietf-oauth-security-topics-update-03`（仍是 WG Document，不能寫成已替換 9700）；已過期 Token Binding 草案；RFC 10027（跨裝置流 BCP 247，相鄰但不在本題）；OIDC Dynamic Client Registration 與 RFC 7591（同族不另開行）；oauth.net 社群門戶、廠商 SDK、OpenID 2.0 歷史。

## 如何運作

OAuth / OIDC 不是單一 RFC。六層只標邊界，不寫實現步驟。

1. **委託**：[RFC 6749](https://www.rfc-editor.org/rfc/rfc6749.html) 寫授權碼等許可型別；[RFC 8252](https://www.rfc-editor.org/rfc/rfc8252.html) 收原生應用走外部使用者代理。[RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html) 與 2.1 草案收緊仍寫在 6749 裡的舊模式，但 6749 正文仍在。**2.1 仍是 `-15` 草案，不是現行 RFC。**
2. **繫結**：[RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html) PKCE（讀 pixy）綁 code 交換；[RFC 9126](https://www.rfc-editor.org/rfc/rfc9126.html) PAR 把請求體從使用者代理挪到直連，換 `request_uri`；[RFC 9101](https://www.rfc-editor.org/rfc/rfc9101.html) JAR 可選再把引數裝進 JWT。PAR ≠ JAR，可並用。
3. **出示**：[RFC 6750](https://www.rfc-editor.org/rfc/rfc6750.html) Bearer 是持有即用；[RFC 9449](https://www.rfc-editor.org/rfc/rfc9449.html) DPoP 另加應用層持有證明，約束 access / refresh。DPoP 不代替客戶端認證，也不廢止 6750。
4. **發現**：[RFC 8414](https://www.rfc-editor.org/rfc/rfc8414.html) 看授權伺服器；[RFC 9728](https://www.rfc-editor.org/rfc/rfc9728.html) 看資源伺服器；OIDC Discovery 再加 OP 身份端點。
5. **身份層**：[OIDC Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) 要 `openid` scope 與 ID Token。OAuth 本身不提供標準的終端使用者認證資訊。
6. **剖面**：[FAPI 2.0](https://openid.net/specs/fapi-security-profile-2_0-final.html) 挑選並加嚴 1–5（PKCE `S256`、PAR、傳送方約束），不是第三套框架。

[RFC 9207](https://www.rfc-editor.org/rfc/rfc9207.html) 給授權響應加 `iss`。規範安全節只鏈不展開，不摘利用面。

## 必須保留的衝突

- **2.1 未廢 6749。** `-15` 文首寫 replaces / obsoletes 6749 與 6750，但 datatracker 狀態是 I-D Exists / WG Document。6749 仍是已刊 PS。9700 也寫 2.1 尚在開發、將吸收 BCP。兩邊都留，不把草案當已廢止 2.0。
- 2.1 自稱與 2.0 相容但收緊：PKCE 進核心；Implicit 與 Resource Owner Credentials **不寫入** 2.1。6749 正文仍列這些許可型別。9700：ROPC **MUST NOT**；implicit（`response_type=token`）**SHOULD NOT**。產品若只引 6749 會與 BCP / 2.1 草案打架。
- PKCE 三檔不要併成「只給 App」：7636 標題針對公開客戶端；9700 對公開客戶端 **MUST**、對機密客戶端 **RECOMMENDED**；2.1 把 PKCE 收成核心要求。
- PAR ≠ JAR；DPoP ≠ Bearer ≠ mTLS。9126 寫明 PAR 與 JAR 可並用。9449 **不是**客戶端認證方法，也不取代 6750。
- OAuth ≠ OIDC ≠ 授權模型 ≠ WebAuthn。OIDC Core 自寫疊在 6749 上；沒有這層就沒有標準 ID Token。
- OIDC 短鏈檢索日已是 **errata set 2**，不是 2014 初版。Discovery 同步。
- FAPI 2.0 是剖面。未採用 FAPI ≠ 未採用 OAuth。
- FedCM 是 FPWD；AuthZEN 是 PDP 合同。瀏覽器應用 BCP、9700 修訂草案、過期 Token Binding：**不成 RFC 不升表**。
- **對映 ≠ 採用。** 工坊 OAuth 只證明發布者，不等於行業不再談 2.1 / OIDC。

## 例子

- 正例：現行可引用的授權框架寫成 **RFC 6749 + RFC 9700**，並另注 2.1 仍是 `-15` 草案。
- 正例：要身份層就引 OIDC Core（errata set 2）與 Discovery，不把「有 OAuth」寫成「已有 ID Token」。
- 正例：高安全剖面另引 FAPI 2.0 Final；未採用 FAPI ≠ 未採用 OAuth。
- 反例：把 datatracker 上的 2.1 草案寫成已廢止 6749 / 6750。
- 反例：把 PKCE、PAR、JAR、DPoP 併成同一個開關，或把 DPoP 寫成已取代 Bearer RFC。
- 反例：把 FedCM、AuthZEN PDP API 或通行金鑰叫做 OAuth / OIDC 的下一版。
- 反例：因本頁出現 OAuth 就寫進 recipe / 髮卡依賴，或寫成「本倉庫已採用 2.1 / DPoP / PAR / FAPI」。
- 反例：把本頁當成攻擊、繞過或 PoC 手冊。

## 邊界與易混概念

- 不包括：釣魚、憑證樣例、廠商接入教程、OWASP 操作清單、把卡做成登入提供方。規範安全節回鏈 9700 / 各 RFC，不摘利用面。
- 不包括：攻擊步驟、繞過、PoC、Gateway token、物件儲存憑證、卡 JSON/PNG。
- OAuth ≠ OIDC。前者是委託；後者才給標準的終端使用者認證資訊。
- OAuth ≠ 授權模型。工坊對照頁已寫這句：委託證明「誰來證明人」，不管角色與許可權表。
- OAuth ≠ WebAuthn。通行金鑰是另一場儀式，見 [[concepts/通行金鑰規範入口]]。
- PAR ≠ JAR。9126 直推載荷；9101 把引數裝進 JWT。FAPI 2.0 要 PAR，不是自動要 JAR。
- DPoP ≠ Bearer ≠ 證書繫結。6750 持有即用；9449 應用層持有證明；證書繫結見 RFC 8705（本批不升表）。
- FAPI 2.0 是剖面，不是第三套授權框架。
- FedCM 是 W3C FPWD，不能寫成 OIDC 的下一版。
- OpenID 目錄裡的 AuthZEN Authorization API 是 PDP/PEP 決策合同，不是授權碼流。名字都叫 authorization，合同不同。

## 對映到本倉庫

對映放最後，不當過濾器。行業句對獨立站仍成立。

[[concepts/後端架構名詞與工坊對照]] 已寫：Cookie 管瀏覽器會話；JWT 管宣告信封；OAuth 管誰來證明人。三件可疊，不是三選一。當前工坊：Gateway 同進程管包生命週期 + 所有權 + 稽核；**OAuth 只證明發布者**，偽匿名，不是玩家追蹤。卡內 fail closed 見 [[concepts/創意工坊與安全契約]]。產品禁令表見 [[comparisons/工坊架構該上與不該上]]。

因此：

1. **本倉現網不是 OAuth 2.1 / OIDC / FAPI 棧。** 不要把草案或剖面寫成已採用依賴。
2. 釋出者證明仍按對照頁：OAuth 委託，不是授權模型，也不是卡內角色許可權。
3. 人到依賴方的公鑰憑證走 [[concepts/通行金鑰規範入口]]，不與本頁併成「無密碼登入」。
4. 獨立工坊站**可以**談 6749 + 9700 或將來的 2.1；那是頂層站點合同，不是「本倉已上 2.1」。

本頁不寫「已採用 2.1 / PKCE / PAR / DPoP / FAPI」。

## 來源與證據

- 查詢賬本：[[queries/第五批蒸餾目標]] B5-OAuth；細表仍在 [[10-收件箱/寫回候選/第五批-B5-OAuth]]；邊界對照 [[queries/第二批蒸餾目標]] B2-Auth。
- 版本釘：2.1 為 **-15**（2026-03-02，過期 2026-09-03，里程碑 Dec 2026 交 IESG）；OIDC 短鏈 errata set 2（2023-12-15）；FAPI Final **2025-02-22**；9700 = BCP 240（2025-01）；9728 = 2025-04。
- 2.1 狀態：datatracker 為 I-D Exists / WG Document，Intended RFC status 為空；文首自稱 replaces / obsoletes 6749 與 6750。
- 9700 文首寫 2.1 尚在開發、將吸收本文。6749 檢索日仍是已刊 PS。
- FedCM：`/TR/fedcm/` 文首 FPWD 2024-08-20。
- 時間：2026-08-14。B5 賬本記 WebFetch 核過上表樞紐文首與 WG 文件表。超時 / 404 不升表。

已知衝突見上節，不靜默覆蓋。2.1 是否已在檢索日之後交 IESG 或成 RFC：以 datatracker 對該 draft 的狀態為準，本頁不預支。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞（含 `safety`：只談規範入口，不寫攻擊）
- [x] 已釋出到正式區

## 相關內容

- [[concepts/後端架構名詞與工坊對照]]
- [[concepts/創意工坊與安全契約]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/通行金鑰規範入口]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
- [[queries/第五批蒸餾目標]]
- [[queries/第二批蒸餾目標]]
- [[10-收件箱/寫回候選/第五批-B5-OAuth]]
