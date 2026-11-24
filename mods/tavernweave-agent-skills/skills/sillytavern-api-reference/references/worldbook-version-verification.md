# E03：世界書版本核驗鏈

這裡補充世界書從入口到最終請求的核驗記錄，沿用 [API 核驗流程](../SKILL.md)與[公開導航基線](core-facts.md)，不新增 API 層，也不提供可直接裝入酒館的程式碼。目標執行版本未知時，可以查固定原始碼、編寫靜態夾具，但不能把示例標為“可執行”。

## 先記錄實際鏈，再選最小探針

1. **宿主與配置**：識別 SillyTavern 版本/commit、請求介面、當前卡/書繫結、相關開關及原生遞迴關閉狀態。不能從匯出條目推定全域性設定。
2. **所選擴充套件**：記錄 ST-Prompt-Template 和實際參與的助手、MVU、Zod/註冊器版本、來源、執行上下文、載入/就緒證據。純文字或原生用例不為測試強裝擴充套件；浮動 Git/CDN URL 記為“未固定”，不以下載或 HTTP 成功證明執行。
3. **入口與 API**：逐項記錄入口階段、可達前提、符號、引數/返回值、變數作用域、訊息視窗、快取生命週期、處理順序、目標缺失或停用時的行為，以及預算邊界。只查用例實際依賴的部分。
4. **固定權威**：查詢與目標版本匹配的文件、實現和宣告；來源有衝突時記錄差異。原始碼能證明該修訂的實現，不能證明使用者已安裝該修訂，或跨擴充套件時序已在目標環境成立。
5. **隔離探針**：每次只驗證一個契約，使用自行編寫、不含遠端依賴的材料。按 [E07](../../sillytavern-runtime-debug/references/worldbook-isolated-runtime-checks.md)取得環境/操作授權後，觀察入口→條件→讀取→輸出→最終請求，必要時比對前後狀態。提示預覽不自動授權模型呼叫。
6. **結論**：分別給出原始碼結論、目標環境觀察、最終提示證據、模型行為結果及阻塞原因；只在適用版本和執行上下文下發布已實測示例。

每項記錄複用專案現有依賴/證據賬本，最少包含：`checkId`、依賴及交付類別、目標版本/commit、來源 URL 與路徑/行、入口與上下文、輸入/預期、實測結果/證據、狀態、下一步。缺版本填 `unknown`，未執行填 `not-run`，不能用空白表示透過。

## 本次來源核驗記錄（2026-10-15）

以下為公開原始碼只讀核驗，沿用已有固定導航基線；不宣稱最新版本。**使用者目標宿主、擴充套件版本、配置和執行環境均未核驗；本表沒有任何 runtime pass。** 本次沒有執行宿主指令碼或遠端依賴。

| ID | 固定來源與已讀位置 | 本次可確認的窄結論 | 目標環境仍需驗證 |
| --- | --- | --- | --- |
| V-HOST | [SillyTavern package.json](https://github.com/SillyTavern/SillyTavern/blob/8172dcd0ee672d3cd9a5e5f7af134f91a45cd2b8/package.json) | 此修訂宣告 1.18.0 | 安裝版本、請求介面和最終組裝路徑 |
| V-TEMPLATE | [模板 manifest](https://github.com/zonde306/ST-Prompt-Template/blob/ada54bb22e3dab0a07e473d383b4c2fe40bc6573/manifest.json) | 此修訂宣告 1.17.4.3 | 實際版本、開關、上下文與各入口是否可達 |
| V-HELPER | [助手 manifest](https://github.com/N0VI028/JS-Slash-Runner/blob/36d8889a99f1cf09d3d1f8aabd0eba33975dc64d/manifest.json) | 此修訂宣告 4.8.19 | 是否參與用例、安裝版本與目標 frame 的暴露能力 |
| V-MVU | [MVU 固定快照](https://github.com/MagicalAstrogy/MagVarUpdate/tree/b42817925d0391c15fa242a8238d2bbe28eb6319) | 僅核對已有導航修訂可讀；不據 package 版本推斷髮布身份 | 所用載入器對應修訂、註冊器、Zod 來源/版本、就緒與持久化均未核驗 |
| V-READ | [worldinfo.ts L212–275](https://github.com/zonde306/ST-Prompt-Template/blob/ada54bb22e3dab0a07e473d383b4c2fe40bc6573/src/function/worldinfo.ts#L212-L275)，[ejs.ts L321–355](https://github.com/zonde306/ST-Prompt-Template/blob/ada54bb22e3dab0a07e473d383b4c2fe40bc6573/src/function/ejs.ts#L321-L355) | 此路徑沒有按 `disable` 過濾；讀取先找條目，再處理正文；未命中返回空字串。名稱比較還含匹配分支，不能把字串名稱當作絕對精確定址保證 | 停用目標能否被實際讀到、最終輸出、重名/特殊字元、外部書繫結與返回值 |
| V-WINDOW | [chat.ts L67–112](https://github.com/zonde306/ST-Prompt-Template/blob/ada54bb22e3dab0a07e473d383b4c2fe40bc6573/src/function/chat.ts#L67-L112) | 此模板快照的單參 `getChatMessages(-1)` 對全部聊天 `slice(-1)`；本例選擇的 `getChatMessages(-1, 'user')` / `(-1, 'assistant')` 呼叫形態則先按角色過濾，再各自 `slice(-1)`，最後處理訊息文字。因此分別取最後一條對應角色訊息，不能稱為最近三條。結論嚴格限定這些實參和模板快照，不移用助手同名 API；本例尚未經目標宿主實測 | 實際視窗、角色過濾、處理後的文字和目標版本差異 |
| V-STATE | [variables.ts L36–64](https://github.com/zonde306/ST-Prompt-Template/blob/ada54bb22e3dab0a07e473d383b4c2fe40bc6573/src/function/variables.ts#L36-L64)，[L398–500](https://github.com/zonde306/ST-Prompt-Template/blob/ada54bb22e3dab0a07e473d383b4c2fe40bc6573/src/function/variables.ts#L398-L500) | 此原始碼區分快取與指定作用域，讀取受訊息/候選上下文和快取重新整理條件影響；缺失預設值不是初始化哨兵歸一化 | 寫入者、模板讀取者、UI與下一輪是否讀取同一訊息/候選；不同入口是否誤用舊快取 |
| V-ENTRY | [handler.ts L76–132](https://github.com/zonde306/ST-Prompt-Template/blob/ada54bb22e3dab0a07e473d383b4c2fe40bc6573/src/modules/handler.ts#L76-L132)，[L975–987](https://github.com/zonde306/ST-Prompt-Template/blob/ada54bb22e3dab0a07e473d383b4c2fe40bc6573/src/modules/handler.ts#L975-L987) | 此實現有獨立世界書預處理入口與其他生成/渲染處理器；不能把某一入口的順序當作所有入口的全域性順序 | 選定入口真正到達、條件執行、後續原生選擇和目標請求中出現 |
| V-BUDGET | [features_cn.md 的預算說明](https://github.com/zonde306/ST-Prompt-Template/blob/ada54bb22e3dab0a07e473d383b4c2fe40bc6573/docs/features_cn.md#L450-L460) | 此版本文件提示顯式引入內容與宿主預測計數存在邊界；`ignore_budget=false` 不能證明模板輸出已按全域性預算裁剪 | 實際最終請求的去重、分詞及溢位處理，交 [E06](../../sillytavern-rolecard-performance/references/worldbook-output-budget.md) |

這些來源只用來定位事實，不復制上游教程或實現。相關專案的許可邊界沿用 core-facts。原始碼中的原生遞迴示例不屬於本次採用方案；TW 保持關閉原生遞迴的既定政策，不借版本核驗更改使用者卡配置。

## 按專案能力選待驗問題

- 多個選擇器分別使用章節、規則、實體別名時，逐項驗證目標身份、入口可達性及實際輸出；欄位與目標完整性歸 [E05](../../sillytavern-database-rolecards/references/worldbook-target-state-contract.md)。
- 使用停用資料或狀態投影時，分別驗證實際讀取、最終請求與儲存前後；檔案中存在初值、載入器或介面，不證明初始化、註冊或消費閉環已成功。

API、排錯和變數相關工作仍交給各自負責的技能；場景分類可以重疊，也可以調整。函式禁令、固定順序、品牌繫結深度、六模板獨佔均不是證據。確認目標版本後才能給出精確函式實現，不向純文字專案強加這些檢查。
