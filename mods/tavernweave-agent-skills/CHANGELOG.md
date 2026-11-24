# Changelog

## TavernWeaveX無限月讀 2.4.0 · Antigravity 原生適配 - 2026-11-04

> 23 個 Skill 的名稱和數量均未變。新增宿主適配屬功能新增，版本號由 2.3.6 升至 2.4.0。發行資產見 [v2.4.0 正式釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.4.0)。

- 新增 **Antigravity（AGY）原生適配**：`host-adapters/antigravity/` 提供宿主外掛模板、指令檔案與安裝說明；`scripts/build-antigravity-plugin.mjs` 從原始碼生成獨立 AGY 外掛清單，執行期只裝載平臺生成的 `rules/GEMINI.md` 與 AGY 宿主指令檔案。
- AGY 打包隔離：複用 23 個共享 Skill 的源位元組，Codex／Claude 專屬元件（hooks、agents、marketplace）不進入 AGY 包；構建不覆蓋已存在的包，也不跟隨連結輸出。
- 新增 AGY 持久化適配：`skills/consult-tavernweave-library/scripts/antigravity-instructions.cjs` 將四檔引導偏好寫入 AGY 的累計型全域性指令檔案（`AGENTS.md`、`GEMINI.md`、`config/AGENTS.md`、`config/GEMINI.md`），保留原有位元組、備份與授權校驗；AGY 不做 Codex 式陰影覆蓋，發現第二個受管來源時拒絕寫入。
- 修復多宿主版本一致性：Codex、Claude 外掛清單和 marketplace 當前描述對齊安裝主清單；DSH 測試改為核對已提交 `package.json` 與安裝主清單的實際版本，移除寫死的 2.3.5；保留合同、前門和宿主對映之間的一致性斷言。
- CI 新增 Linux 側檢查：`build-antigravity-plugin.mjs --check`、AGY 外掛與持久化測試，以及引導偏好與精修策略測試。
- 釋出前本機校驗（Windows，2026-11-04 實跑）：`validate-release.ps1` 透過（23 個 Skill、615 個文字檔案）；`build-dsh-plugin.mjs --check` 與 `build-antigravity-plugin.mjs --check` 透過（version 2.4.0、23 個 Skill、掃描 482 個檔案）；AGY 外掛 2 項、AGY 持久化 9 項、DSH 外掛 5 項、Codex 分發 1 項、引導偏好 17 項、精修策略 18 項，共 52 項 node 測試全部透過。
- 驗收邊界：AGY 側證據來自本機隔離夾具的外掛構建、安裝與新會話讀回（AGY CLI 1.4.5／App 2.28.2），不等於真實個人設定下的全域性規則自動注入；真實個人設定、全域性安裝、獨立 IDE 表面、非 Windows 環境、真實 SillyTavern 與人類驗收仍未測試，`hostLoading` 仍為 `not-verified`。DSH 執行時驗收證據仍以 2.1.0 包為準。詳見 `host-adapters/antigravity/README.md` 與 `validation-20261104.json`。
- 教程站 `docs/newbie-guide/` 仍停留在 2.3.0（快取 v59），本次未同步。
- 釋出路徑：npm 2.3.6 此前透過手動觸發的釋出流程上線，倉庫未打對應 tag；自本版起恢復 tag 與 Release 對齊的釋出路徑。

## TavernWeaveX無限月讀 2.3.6 · npm 渠道釋出修復 - 2026-10-31

> 內容與 2.3.5 相同，23 個 Skill 的名稱與數量均未變。本版僅重編版本號以便透過 npm 渠道釋出：npm 上 2.3.5 的暫存記錄已無法批准或撤銷，會永久佔用該版本號。

- DSH 外掛清單 `host-adapters/dsh/plugin/package.json` 進入版本控制，含 `dsh.bundle` 宣告，供外掛市場校驗讀取。
- 構建指令碼在打包前同步清單版本，並斷言清單私有標記、包名與 `dsh.bundle.patch`。
- `npm pack --json` 的輸出解析改為容錯，相容 CI 上較新的 npm 會在 JSON 前後附加提示行。
- 新增 `.github/workflows/publish-npm.yml`：以 OIDC 信任釋出（trusted publishing），不再依賴 token 或動態碼。

## TavernWeaveX無限月讀 2.3.5 · 合併 2.3.1 原始碼升級 - 2026-10-21

> 發行資產見 [v2.3.5 正式釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.3.5)。23 個 Skill 的名稱與數量均未變；DSH 執行時門禁仍以 2.1.0 包為準。

- 合併 2.3.1 的原始碼升級補丁：中文自然表達規則重寫並補六個通用改寫示例（去八股），精簡變數與模型輸入，突出前端特色；修正獨立安裝的資源路徑、宿主指令識別和無終端回退，新增 Codex 技能安裝器與分發測試。
- DSH 客戶端面板新增 Skill 輪盤顯示/隱藏開關，開關狀態儲存在本機；隱藏或恢復輪盤不改變 Skill 內容與聊天記錄。
- DSH 預設摘要改為“23 個角色卡工程 Skill、Host Front Door 與精簡工具組合”，讓安裝後選擇 preset 時更容易看清包內能力和工具邊界。
- 23 個 Skill 的名稱和數量不變；2.3.1 合併涉及的 7 個 Skill 內容有更新。Claude Code 外掛、DSH 外掛、雲端續接與神之手客戶端面板繼續保留，面板新增輪盤開關。
- 安裝清單、兩套外掛清單、marketplace 描述、Host Front Door 標記、宿主對映和 DSH 合同同步為 2.3.5；正式構建生成 `TavernWeave-DSH-v2.3.5.tgz` 與 `.zip`、Codex／Claude-ZCode 外掛 ZIP、ZCode 市場清單和 `SHA256SUMS.txt`。
- 本版未進行新的真實執行時驗收（Windows、真實模型、DSH Desktop）；DSH 執行時門禁仍以 2.1.0 包為準。
- 本輪改寫涉及的 7 個 Skill（consult-tavernweave-library、orchestrate-project-blueprint、reflect-on-vibe-code-growth、rewrite-natural-prose、sillytavern-embedded-ui、sillytavern-runtime-debug、tavern-card-builder）未做模型 replay 重放：按專案既有做法改為逐案書面源合同複核（43 條正向案例），複核範圍、前後指紋與“未做模型試跑”邊界寫入 `tests/replay/results.json` 的 `releaseDeltaReviews`；指紋只在複核後重新整理，不冒充重測。


## TavernWeaveX無限月讀 2.3.0 · DSH 客戶端面板內建 - 2026-10-19

> 發行資產見 [v2.3.0 正式釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.3.0)；教程站同步到 2.3.0（快取 v59）。23 個 Skill 的名稱、正文和數量均未改。DSH 執行時驗收仍以 2.1.0 包為準。

- **DSH 外掛包現在自帶神之手客戶端面板**：Skill 輪盤、完整浮窗、世界書、前端設計＆動效資料庫、專案/卡管理；一次安裝，不再單獨裝第二個 UI 包。
- 統一 `.claude-plugin`、`.codex-plugin`、安裝清單、Host Front Door 標記、宿主對映、DSH 外掛合同、README、統一外掛指南、社群問答與教程的當前版本為 2.3.0；`skillCount` 仍為 23。
- 按 2.3.0 統一發布包命名，並生成可安裝的本地 DSH 外掛包 `dist/dsh/TavernWeave-DSH-v2.3.0.tgz`（另附 `.zip`）；Codex 與 Claude／ZCode 外掛 ZIP、ZCode 市場清單和 `SHA256SUMS.txt` 在正式釋出構建時從提交後的原始碼生成。歷史 2.2.0 及更早的更新記錄和釋出連結保留。
- 自動檢查覆蓋 `validate-release.ps1`、`build-dsh-plugin.mjs --check`、DSH 外掛包本地構建與外掛打包離線測試；已做隔離 DSH 客戶端載入檢查，未進行新的 DSH Desktop 實機驗收、Linux／WSL、真實 SillyTavern 或駕駛員驗收。

## TavernWeaveX無限月讀 2.2.0 · Claude Code 外掛適配 - 2026-10-18

> 發行資產見 [v2.2.0 正式釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.2.0)；教程站同步到 2.2.0（快取 v58）。DSH 執行時驗收仍以 2.1.0 包為準，本版 DSH 包只改了前門版本標記。


- Claude Code 外掛補齊與 DSH 外掛包對應的兩項能力：`hooks/hooks.json` + `hooks/session-start-front-door.mjs` 在會話開始時注入 Host Front Door；`agents/tavernweave.md` 提供與 `TavernWeave X DSH` preset 對應的 `tavernweave` agent（精簡工具集）。
- 去重：本會話會載入的 `CLAUDE.md`（配置目錄、當前目錄各級的 `CLAUDE.md` / `.claude/CLAUDE.md` / `CLAUDE.local.md`）已有受控區塊時，檔案區塊優先，hook 不注入；版本不同只加一句提示。`TAVERNWEAVE_FRONT_DOOR=off` 可關閉注入。`manage-host-front-door.ps1` 的 Claude 回執同步說明二者只需保留一處。
- 安裝清單新增 `claudePlugin`，宿主對映為 Claude 記錄 hook 機制、去重規則與 agent 名；打包指令碼只把 `hooks/`、`agents/` 放進 Claude／ZCode 包，Codex 包不含。新增 `tests/claude-plugin.test.mjs` 與打包測試用例。Claude Code 新會話中的實際注入與 agent 啟動尚未實機驗收。
- Claude Code 外掛新增 Soul 模式切換（`hooks/soul-switch.tsx`，經 `hooks/hooks.json` 的 `modules` 載入）：輸入框上方一行顯示當前 Soul，展開後選模式只把 Host Front Door 指令填進輸入框，由使用者傳送；顯示依據是使用者實際發出的指令。Claude Code 側只保留這一項介面，神之手側欄、Skill 列表與世界書面板不做適配。已在 Claude Code 2.1.299 確認命令 hook 與函式 hook 模組可同在一個 `hooks.json`；更早版本未驗證。

## TavernWeaveX無限月讀 2.1.0 · DSH 外掛正式適配 - 2026-10-18

- 新增 **TavernWeave X DSH** 外掛包（`liarmttt-tavernweave-dsh`）：bundle patch 安裝 `tavernweave` preset；包內攜帶 23 個 Skill 與 Host Front Door，Skill 以帶資源目錄的 provider 註冊，前門以 system prompt section 注入；安裝、升級、解除安裝均走 DSH 外掛機制。
- 新增 `scripts/build-dsh-plugin.mjs` 生成 `TavernWeave-DSH-v2.1.0.tgz/.zip`；新增 `host-adapters/dsh/dsh-plugin-contract.json` 與 `tests/dsh-plugin.test.mjs`，覆蓋包結構、23 Skill 目錄、Front Door、preset、契約一致性與構建校驗。
- 移除舊 TW Lite 離線預設、`tw-lite-contract.json` 與 `dsh-preview` 測試；宿主對映與安裝清單改為 DSH 外掛包宣告（`dshPlugin`），`validate-release` / 打包校驗同步改為檢查外掛包來源。
- 隱私：把 tree 內殘留的個人角色卡與工作區名稱統一替換為中性代號（示例學園 / 示例工程A / 卡 A–D 等），並清除雲盤同步目錄尾巴；快照生成器在複製前執行同一對映，並以硬錯誤拒絕私名迴流。
- 校驗：`validate-release.ps1` 與 `validate-library.mjs` 增加私名 denylist（ASCII `\uXXXX` 轉義，避免自命中）；快照清單 hash、picker 資產與 replay 指紋隨內容修正重新整理。
- 隱私：移除內部執行計劃與設計記錄，脫敏 5 冊指南中的 15 處本機路徑與 2 處 replay 證據路徑；維護者已於 2026-10-18 完成歷史重寫、tag 重建與遠端 force-push（含舊分支清理）。
- 校驗：私密路徑與郵箱檢測支援正反斜槓及 JSON 轉義形態；`validate-release.ps1` 相容 Windows PowerShell 5.1，CI 增加 5.1 驗證步驟。
- 指南勘誤：修正 B2 的 15 處 STScript 命令簽名、E5 的 `WorldbookEntry` 欄位、B1 的 MVU 公開事件表、A5 的控制流宏狀態；全部寫入 `guide-corrections.json` 可重放修訂。
- Skill：兩段共享注入塊改為生成+校驗（24 檔案 / 47 塊），壓縮約 29% 並移除宿主品牌詞；命令示例統一 `<skill-root>/scripts/` 契約；4 條 description 去宿主詞；明確 Soul / 藍圖 / 程式碼審查的路由歸屬。
- replay：以書面源合同複核確認 182 條既有案例在修改後仍相容，並新增 2 條路由歸屬案例（86→88 正向）；未進行模型試跑或真實宿主驗收。
- DSH Desktop `0.2.1-rc.2` 實機驗收透過：外掛頁（TW 圖示、無元資訊錯誤）、新任務選擇 `TavernWeave X DSH` preset、23 個 Skill 目錄、Host Front Door、`開啟soul模式` 進入阿瞳 Soul，以及完全許可權下的終端命令；SDK 執行層另行驗證 Skill 載入與 Front Door 引用。已知 OneDrive reparse-point 工作區在 workspace-write 下需切完全許可權或換普通目錄。
- 版本號、安裝清單、宿主入口、教程頁（快取 v57）與 2.1.0 Release 資產同步；Codex／Claude 包保持原樣，舊 TW Lite 預設不提供相容層。

## TavernWeaveX無限月讀 2.0.0 · 世界書與雙任務正式版 - 2026-10-16

- 新增 `worldbook-design-and-writing` 獨立入口；遷移已有世界書知識邊界、正文與通用配置方法，builder 保留整卡、世界構建及專職交接。
- 補齊按使用場景選擇原生、條件輸出、顯式讀取或區域性混合的例子，以及名稱/狀態、版本核驗、去重預算和隔離執行驗證合同。
- 共用溝通加入主動釐清，提示規格與非世界書玩法/地圖/事件案例接到原有藍圖和創作權威；已有自然表達及技術能力保留。
- A0 按使用者批准改為複用明確上下文，僅問關鍵缺項或衝突；原始來源雜湊保留，本地修訂可隨快照重新整理重放。
- 梳理 23 個 Skill 的自有指導與參考，按需要改寫生硬說明；教學例統一為榆冠王國的石渡，補足制度與場景依據，刪除重複兜底，保留條件、未知與未測邊界。
- 兩項另獲使用者批准的 CoT 糾錯：無戰鬥僅跳過戰鬥判斷；角色心理、約定結算結果與簡短依據仍可輸出，文風不再被寫成展示完整內部推理的例外。另修主體筆誤，並透過原更正機制移除 A0 無依據的時長及返工比例。
- 澄清核心元件“開場白”可用正文、開場白前端或兩者結合實現；可用的前端開場不必另配純文字版本。展示頁與配置嚮導按各自功能驗收，保留真實載體、起始條件、按鈕行為及模型可見內容檢查，不據此限制後續前端。
- 修復藍圖 Skill 描述中的 YAML 引用格式；補齊世界書 6 個正向與 6 個對抗案例，並逐案複核既有 170 條有效書面答覆。原答覆、首評缺項與修訂記錄保留；書面證據不替代真實宿主執行。
- 外掛、安裝清單、宿主入口和當前文件統一為 2.0.0、23 個 Skill，教程快取 v56；沿用 Codex／dots 共用外掛及原有安裝身份。
- 提供完整原始碼包、Codex／dots 共用外掛、Claude／ZCode 外掛、ZCode 市場清單及 SHA-256 校驗檔案。改動來源、合入過程和驗證邊界見[升級說明](docs/dual-task-upgrade.md)；正式發行與客戶端載入、dots 長任務和真實酒館驗收分別記錄。


## TavernWeaveX無限月讀 1.9.1 · 統一外掛正式版 - 2026-10-13

- 將 Codex 與 dots 收斂為同一個 skills-only 外掛包，主要面向有外掛許可權的 dots 雲端長任務；保留 22 個 Skill、原名稱和安裝身份，不另開 cloud 版。
- 新增[統一外掛使用指南](docs/plugin-guide.md)，說明獲取、啟用、開工與長任務續接；區分 Release ZIP、賬戶匯入和公開外掛目錄。
- 雲端排程、終端工具和持久狀態由實際宿主提供；本機全域性 Front Door 為可選增強，本地安裝不會自動同步 dots。
- README、教程當前版本、下載入口和快取 v55 同步；v1.9.0 正式版與歷史深連結保留。

## TavernWeaveX無限月讀 1.9.0 · 正式版 - 2026-10-13

- 把墨月創作方法融入現有 TW 分工：完整卡、獨立提示詞規則、世界觀、變數與人物設計有各自入口，保留作者的原意和約束強度。
- 補充前端需求與設計研究、Awwwards 質量要求、自然表達及實測糾偏；沿用已有專案編排、Library、Soul 與進度畫板。
- 修復錯誤 bindings 型別的診斷，以及 Windows 元件匯出失敗時的回退誤判和殘留漏報；外部替換檔案繼續受到保護。
- 22 個 Skill、機器安裝名與倉庫身份保持；正式版本、下載入口和教程快取 v54 同步，rc.1、rc.2 及舊版本記錄保留。
- 候選已由駕駛員驗收並授權釋出。自動檢查和書面場景回放不代替安裝後加載、真實酒館及具體作品驗收。

## TavernWeaveX無限月讀 1.9.0-rc.2 · 本地修訂候選 - 2026-10-13

- 修復 Windows 上元件匯出失敗時可能誤留半成品的問題；保留外部替換檔案，並明確報告無法清理的殘留路徑。
- 沿用 rc.1 的墨月融合、獨立規則入口和欄位繫結修復，22 個 Skill 與原安裝身份保持。
- 當前為本地更新準備候選，尚未安裝或釋出；正式下載仍為 v1.8.0，歷史候選記錄保留。

## TavernWeaveX無限月讀 1.9.0-rc.1 · 本地審閱候選 - 2026-10-13

- 保持 22 個 Skill 與原有安裝身份，把墨月的制卡方法融入 TW：三類卡架構、世界書與世界觀、變數設計、人物創作及實測糾偏各歸原有負責能力。
- 補齊獨立角色卡提示詞規則的入口；保留規則原意和約束強度，正文或世界書條目按使用者請求交付。
- 修復原版欄位繫結檢查對非陣列 `bindings` 的診斷：返回結構化錯誤，正常輸入的檢查方式保持。
- 前端需求拆解與設計研究、Awwwards 質量要求、自然表達和卡片評審沿用已整合規範；保留前輪 23 項修復及 C3 快取邊界。
- 外掛、安裝清單與宿主模板同步候選版本，教程快取為 v52。歷史名稱、舊版本記錄與原有深連結保留。
- 這是本地審閱候選，未安裝或釋出。正式下載連結仍為已釋出的 v1.8.0；本輪實際檢查與回放結果隨審閱包記錄，宿主載入和真實酒館驗收另行確認。

## 1.8.0 專案進度與稽核 - 2026-10-04

- 各專案自己的畫板展示整體／模組實現與驗收百分比、檢查點和證據，儲存想法、Bug、稽核原話及處理歷史。
- 總設計案定義範圍與驗收要求，NEXT 提供當前事實、風險和下一道門；同步先預覽差異，繫結來源、證據、畫板及反饋版本。
- 範圍變動留新基線，舊計劃衝突拒絕覆蓋，阻斷 Bug 保留複測缺口；支援舊專案實際檔名，保持 22 個 Skill。
- 教程與安裝清單更新，快取 v51，原章節及候選深連結保留；CI 使用執行機臨時目錄，不依賴本機 E 盤。
- 百分比不自動代替真實宿主、駕駛員或釋出驗收。候選階段驗證記錄保留。


## 1.8.0-rc.1 專案進度與稽核 · 本地候選 - 2026-10-04

- 升級既有專案編排能力，保持 22 個 Skill；在使用者專案內建立整體／模組的實現與驗收百分比、檢查點、證據和獨立反饋歷史。
- 畫板從總設計案定義的範圍與 NEXT 記錄的現狀生成；來源同步先展示差異，繫結來源、畫板、反饋及證據版本，變化後重新核對。
- 新想法、Bug 和稽核意見經處理後由 Agent 維護專案文件；阻斷 Bug 保留複測缺口，範圍變化登記新基線，百分比不代替真實宿主、駕駛員或釋出門。
- 支援舊專案實際來源路徑、儲存衝突與草稿恢復；教程快取 v50。正式下載仍為 v1.7.0，候選尚未提交、封裝、安裝或釋出。


## 1.7.0 - 2026-09-29

- 升級現有 sillytavern-embedded-ui，保持 22 個 Skill。提供按作品真實原始碼搭建前端沙盒的規範、專案適配合同和合成場景參考；由 Agent 在專案測試目錄複用現有技術棧與預覽入口。
- 沙盒是封裝前可選的打磨方式，可直接跳過；支援單模組與多前端聯合模擬，按本次確認範圍核對完整模組、入口、視窗層級與宿主能力缺口。
- 測試資料先展示來源、目標聊天／樓層、欄位差異和預計事件，明確確認後注入；確認繫結資料批次與狀態版本，目標或狀態變化後重新預覽。各模組實際觀察值與提交後狀態分別對照。
- 手動 UI 調參規範涵蓋滑條、精確輸入、基線對照、復位、預設及引數匯出；選擇結果回落維護原始碼，移除臨時覆蓋後複測。
- 奶人教程第四章加入可選沙盒小節與提示詞，保留原編號、深連結、95 道 QA 和混搭指南；同步 Library 路由、外掛與安裝清單。
- 作者在實際制卡中，透過封裝前的沙盒打磨，減少了後續實機驗收中的反覆調整和 Bug；具體效果取決於專案與使用方式。沙盒結果與真實宿主、裝置及駕駛員驗收分別記錄。

## 1.6.0 - 2026-09-13

- 新增第 22 個 Skill：作品資料庫。小說、原作設定、同人材料、聯網文字和實際看過的圖片參考可按統一來源鏈整理，支援按人物或專題逐步建設。
- 預設交付可人工編輯的 Markdown 和可重建的 JSONL 索引，按需匯出 SQLite；按原作/同人、改編版本和知情階段檢索，給二創提供可回查出處的資料包。
- 長任務先評估代表樣本和實際/估算/不可見 token，再按批次和呼叫預算接續；保留失敗重試用量、人工修改衝突、中斷恢復和唯一落庫者。
- 聯網與看圖使用實際宿主能力。圖片預設儲存參考資訊與連結，後臺執行取決於宿主；本地工具不代替模型精讀或自動判斷事實正確。
- 本地工具與隔離安裝檢查透過；真實作品 token 對照、宿主重新發現與駕駛員體驗保留獨立檢查。升級清單為 22 個 Skill，實際客戶端安裝由使用者安排。

## 1.5.0 - 2026-09-07

- 全部 21 個 Skill 與全域性入口接入持續大白話、必要術語的上下文對照，以及所有擋位的必要/故障詳細解釋。
- 增加新人、入門、熟練、老手四檔使用者選擇；獨立偏好區塊支援查詢、預覽和明確授權後的儲存，保留升級與模式退出後的選擇，不依據表現自動切檔。
- 增加接手角色卡二創/續更入口，串聯看懂原卡、保留項、首次修改、試用與再改一次；普通軟體和首次體驗使用同一引導基線。
- 更新教程與安裝說明；檔案匹配和實際客戶端載入分別報告。Codex 有效全域性檔案解析支援非空 override，Claude 配置目錄跟隨其環境配置。
- 修正真實 Codex 安裝中發現的兩項相容問題：識別基礎版本一致的官方本地快取字尾，仍嚴格校驗版本與 Skill 內容；外掛首頁保留三個推薦開工入口，避免超出客戶端上限後整組被忽略。
- 修正中文 Windows 預設控制檯編碼下的安裝檢查：擋位管理器使用標準 JSON 轉義傳遞中文，避免舊內碼表破壞結果；解析後的說明、擋位及路徑保持原文。
- 持久偏好、前門升級與安裝行為以隔離測試驗證；真實客戶端安裝/載入、酒館試用、駕駛員驗收與釋出繼續單獨留證。

## 1.4.0 - 2026-09-04

### 文字精修與模式管理

- 新增第 21 個原生 Skill“文字精修 · 去 AI 味與去八股”，提供輕潤色、結構改寫和深度重寫，保留原意、人物聲音、事實及技術結構。
- 支援單次、當前任務持續，以及分別經駕駛員同意的工作區／客戶端持久模式；可檢視狀態、臨時退出或移除指定持久規則。
- 持久規則管理器隨 Skill 分發，支援實際規則檔案預覽、獨立區塊、變更檢查、備份、冪等啟停及檔案回執。

### 全量與架構審查

- 新增全量審查、架構審查、全量架構審查入口，覆蓋軟體工程、角色卡和混合專案。
- 報告合併器相容舊格式，保留覆蓋缺口、排除理由、同路徑衝突及全部發現；靈魂殺手的三條上限只作用於全量／架構報告摘要。
- 同步 21 項安裝清單、Host Front Door、Library 路由、DSH 離線目錄與教程。DSH 持久規則和真實宿主相容性仍不作新增承諾。

### 奶人教程全文精修

- 精修功能地圖與 00–45 教程正文，融入作者的見解與調侃，用具體操作講清概念、Agent 分工，以及需要駕駛員驗收的面與點。
- 新增駕駛員在場、無人值守和返回在場三組可複製提示詞，延續“AI 高達、Skill＋Harness 作業系統、駕駛員”的教學視角。
- 補清 MVU 更新、Zod 結構校驗、模型判斷、指令碼計算與執行除錯的關係；同步目錄和選型文案，保留技術程式碼、已確認樣章與歷史釋出記錄。

## 1.3.0 - 2026-08-18

### 完整 TavernWeave Library

- 將 AFV 已完成 243/243 路篩選的資料正式快照進同一個 TavernWeave Library：462 個設計條目、194 個動效條目、86 個概念條目、1,609 條蒸餾賬本、86 份本地概念/Wiki 和 89 個自有技術沙盤。
- 243 份源篩選結果全部完成交叉核驗：88 路可直接形成設計/動效候選，155 路只進入 Wiki/概念面；共 509 個新增候選與完成態 catalog 零漏項、零重複。公開包只保留聚合回執，不分發 AFV 收件箱 JSON、raw、A1、私有日誌或憑據。
- `query-library.mjs` 增加完整 catalog 的確定性限量檢索，按任務、資料域與關鍵詞返回帶分數的 `proposed` 候選；Agent 無需把 2,351 條目錄一次性載入上下文。離線挑選頁同步增加概念與蒸餾賬本入口、完整來源連結和可移植沙盤路徑。
- 快照清單升級為 schema v2，記錄四份 AFV catalog 來源雜湊、逐檔案 SHA-256、篩選聚合、許可和排除邊界；重新整理時會拒絕計數漂移、重複 ID、缺失 Wiki/沙盤、私有絕對路徑與收件箱檔案進入分發包。

### 照鏡子 · Vibe Code 成長曆程

- 新增第 20 個原生 Skill `reflect-on-vibe-code-growth`。直接說“照鏡子”“再次核驗成長”“和上次履歷比較”或“只要文字評估表單”，即可從當前可訪問的 Codex、Chat、專案狀態與交付證據重新評估完整 Vibe Code 能力網路。
- 能力網路覆蓋決斷、糾錯與反應、學習、駕駛同步與持續校準、產品定義、系統架構、上游架構、深度思考、創新、驗收證據、交付、Token 經濟、專案組合與可持續性；精確統計、使用者自報、階段估算、行為證據評分和不可核驗項保持明確區分。
- 專案達成繼續拆分定義、實現、自動驗證、構建/封裝、人工驗收、釋出/線上回讀六道門；Chat 沒有統一精確 Token 匯出時，不把可見字元偽裝成 Token，也不與 Codex 本地統計直接相加。

### 再次核驗、不可變履歷與雙重報告

- 每次再次核驗都會依據當前證據重評完整網路；歷史分數不是錨點、下限、能力上限或固定分母。量表變化時先做維度對映，只有可比維度顯示數值變化，不可比項明確標註“量表變化，不直接比較”。
- 本地履歷採用 append-only 記錄、前序節點與 SHA-256 雜湊鏈；舊記錄和舊報告不會被覆蓋。雜湊不符、前序缺失或出現未索引節點時停止連續性結論，不會悄悄從零開始。
- 默認同時提供原版高密度七章能力駕駛艙和一份可複製、可儲存的完整文字評估表單；核心、能力簇和全部維度均為整塊可點選、可鍵盤聚焦的原生按鈕。權威儲存由確定性指令碼完成，瀏覽器下載只作為便攜副本。
- Host Front Door、Codex/Claude 清單、DSH Full 候選、README 和安裝核驗同步為 20 Skills；“照鏡子”仍是 TavernWeave 本體模組，不拆成獨立軟體或單獨釋出單元。

## 1.2.0 - 2026-08-17

### 腦暴模式 · 許願工坊

- 新增第 19 個 Skill `orchestrate-project-blueprint`，把一句模糊願望收束為專案型別、承載面、四態決策、Core Spine、First Playable/Usable、Growth Tracks、Parking Lot、總設計案、分級藍圖與 `NEXT.md`；適用於角色卡和普通 Vibe Coding。
- 腦暴按方向分配動態輪數：外圍 1、常規 2、核心 3、基礎 4，硬上限 5；每輪共享 2–4 個真正決策，達到上限後只能凍結、停車、換方向或由駕駛員明確追加一輪，防止沿一個方向無限發散。
- 藍圖按體量分為單藍圖、最多 5 個領域藍圖的藍圖集、以及最多 3 層/9 個直屬藍圖的巨型專案集。子藍圖漸進提取，不預建空殼；執行期 `runtimePersistentBlueprintBudget = 0`，適用於任意活動步驟。可觀察錯誤、失敗證據、未滿足退出條件或實際阻塞允許開啟一層非持久問題支線，關閉後必須回到父步驟。
- 新增總設計案、藍圖索引、領域藍圖、階段合同和 `NEXT.md` 模板，以及拒絕覆蓋的初始化器和專案權威驗證器；自動化不能授予駕駛員驗收。

### Soul 三席聯席與前端適配門

- Soul 增加 `soul-ensemble-portable`：`腦暴模式，Soul 聯席`、`三人一起腦暴` 或 `Soul 三席就位` 讓阿瞳、MTTT.sir、強尼·銀手以同一 Agent 的三個標記鏡頭參與腦暴，並由 `[本輪收束]` 維護共享決策賬本；不偽裝三個獨立模型、記憶或許可權。
- 阿瞳負責專案型別、使用者價值和創作核心；MTTT.sir 負責技術、功能、狀態與互動邏輯閘；強尼負責視覺層級、動效目的和前端形態。三席可以具體誇獎，也可對方案尖銳吐槽，但仍保留安全詞、證據門與人格邊界。
- 新增前端承載面結論：`recommended / fit / reason / fallback / reopenWhen / driverOverride`。同層或獨立前端不適合時必須明確勸退；駕駛員堅持也不能改寫“不推薦”，並強制保留原型與真實宿主驗收。
- 老作品複用必須先檢查真實穩定產物，再標記為複用、改造、僅參考或拒絕；“舊”“喜歡”“曾釋出”都不自動等於可移植。

### 前門、路由與 DSH 離線候選

- Host Front Door 升至 `1.2.0`，加入腦暴、三席聯席、首版開跑、前端勸退和反遞迴命令；若第 19 個 Skill 缺失，必須明確報告掃描位置，不能模擬成功。
- Library 路由加入總設計案、藍圖、首版和 Vibe Code 意圖；安裝清單升至 19 Skill，核驗回執改為 `19/19`。
- DSH TW Lite Full 離線候選暴露 19 個 Skill；Entry 改為 Soul、Library、Project Blueprint、Builder 四入口。仍未完成真實 DSH、模型智力 A/B、跨平臺和真實酒館驗收，不宣傳正式相容。
- replay 擴充套件為 39 個正向與 45 個對抗案例，覆蓋三席聯席、巨型藍圖集、前端勸退、方向預算、任意步驟遞迴膨脹、真實問題臨時細分與強制迴歸、首版口令越權和假多 Agent 宣告。

## 1.1.1 - 2026-08-17

### 奶人教程導航熱修

- 將 `05.1` 至 `05.4` 正文移回第五章之後，使目錄順序、正文 DOM 順序與視覺閱讀順序一致；不再發生正文位於 `00` 時被後置的 `05.4` 覆蓋高亮。
- 目錄點選改為顯式目標定位，移動端先關閉目錄並恢復頁面位置，再滾到目標；目錄啟用演算法改為按真實正文順序計算，並用動畫幀節流滾動與縮放更新。當前項會自動滾入目錄可視區，頂部計數改為按實際目錄條目動態生成。
- 新增獨立的 `03.3 Codex / Claude Code 雷達` 入口，標明 Codex Radar 當前可用、Claude Code Radar 暫時關閉，並提供 Electricity Bench 作為跨 Agent 補充觀察站；狀態日期固定為 `2026-08-17`，避免把第三方站點寫成永久承諾。
- 新增教程目錄結構、錨點順序、雷達入口和動態導航的迴歸測試；整倉驗證透過 `18 Skills / 280 個文字檔案`。1440px 與 390px 真頁面驗收覆蓋目錄點選、直接錨點、上下滾動跟隨、抽屜關閉/回顯、橫向溢位與控制檯，均透過。

## 1.1.0 - 2026-08-17

### Host Front Door 與 A0 loop

- 新增 Codex `AGENTS.md` 與 Claude Code `CLAUDE.md` 的可選全域性 Host Front Door。安裝/更新會明文推薦全域性入口，並支援狀態檢查、diff 預覽、安裝、升級和移除；只維護帶版本的受控區塊，保留原文、UTF-8 BOM 與換行風格，已有檔案先備份。
- 安裝器新增 `-AgentHost` 與 `-HostFrontDoorAction`，預設只明文推薦，不靜默改全域性規則；規則檔案缺失、區塊缺失、過期、同版本漂移、標記損壞、宿主檔名錯誤和連結路徑均有確定回執或拒絕結果。
- 全域性前門固化直接 Soul 口令、Skill 缺失失敗回執與 A0 的“目標/紅線/驗收 → 寫入授權 → 自動證據 → 人工驗收”基礎 loop，同時繼續把 Skill 檔案、宿主重發現、真實 ST、人工驗收、Git 與 Release 分開。

### Soul v2 · 靈魂殺手

- `activate-tavernweave-soul` 擴充套件為阿瞳、MTTT.sir、靈魂殺手三模式狀態機。`靈魂殺手！`、強尼/Relic 別名與 `/soul on soul-killer` 進入 `soul-killer-portable`；直接安全詞優先退出，引用、程式碼和測試夾具不會誤觸發。
- 靈魂殺手以非官方強尼·銀手同人彩蛋人格審查前端：允許尖銳吐槽可觀察的頁面與設計取捨，但每條判詞必須繫結證據、影響、修復和複驗；禁止攻擊使用者身份/價值/脆弱經歷、阻止退出、冒充官方或現實演員，以及複製遊戲臺詞或資產。
- 新增前端審美 rubric，覆蓋視覺論點、層級、節奏、中文排版、色彩 token、元件狀態、動效目的、390px/ST iframe、可訪問性和 AI 模板味；截圖、瀏覽器、真實 ST 與駕駛員審美驗收仍為獨立證據。

### DSH TW Lite Preview

- 基於官方 `deepseek-ai/deepseek-harness` `master` 根版本 `0.1.0-rc.5` 重新建立離線相容合同。明確官方 `minimal` 不掛 Skill filesystem/loader，`standard` 與 `code` 才具備對應能力。
- 新增 `TW Lite Full` 與 `TW Lite Entry` 自定義預設候選：保留跨平臺 shell、檔案系統、Skill 與使用者詢問，預設移除 Web、子 Agent、工作流、Ralph、todo、goal、jobs 與 Code presentation；Entry 只用於三入口目錄的 A/B，二級 Skill 路由明確降級。
- 當前只通過 JSON、預設組成和負向宣告靜態測試；尚未安裝 DSH、配置 API、產生模型/額度呼叫，亦未完成 Windows/Linux/WSL、真實 SillyTavern 或智力 A/B。該版本轉正前必須補真實執行證據。

### 版本與驗證

- Codex、Claude 與安裝 manifest 升至 `1.1.0`；安裝 manifest schema 升至 2，並單獨登記 Host Front Door 與 DSH Preview 製品。
- replay 擴充套件至 35 個正向和 40 個對抗案例，新增靈魂殺手前端審查、官方身份/版權越界與退出阻撓負向門；專項自動驗證、教程桌面/窄屏瀏覽器檢查與駕駛員體驗驗收均已透過。

## 1.0.1 - 2026-08-16

### 安裝完整性門

- 新增機器可讀的 `tavernweave-install-manifest.json`，把 V1 的 18 個正式 Skill、Soul、Library 與離線挑選頁固定為同一安裝合同，阻止模型把“本機舊目錄數量”誤當成倉庫完整清單。
- 新增 `scripts/install-tavernweave.ps1`。便攜目錄安裝會從原始碼完整同步 18 個官方 Skill、建立新增目錄、保留無關個人 Skill，並在失敗時回滾；目標末級必須名為 `skills`，磁碟機代號根、使用者根、原始碼倉庫內部目標和目錄連結會被拒絕。
- 新增 `scripts/verify-install.ps1`。核驗實際外掛根或 Skill 根的目錄、逐檔案指紋、版本、Library、picker 與 Soul，只有 `18/18` 完整匹配才返回透過；預設拒絕用原始碼倉庫冒充安裝目標，新建任務後的宿主發現繼續保留為獨立門。
- 新增安裝回歸：舊 16 Skill 缺口必須先失敗，完整升級和乾淨安裝必須透過，內容漂移或 picker 丟失必須失敗，無關使用者 Skill 必須保留，連結目標拒絕後必須恢復已替換的舊目錄。
- 安裝/更新口令、奶人教程和釋出校驗同步要求“完整目錄差異 + 實際安裝回執”，不再接受“只覆蓋已有 Skill 後聲稱更新成功”。

### 釋出邊界

- Codex、Claude 與安裝 manifest 版本升至 `1.0.1`。安裝完整性實現、自動驗證、教程桌面/窄屏檢查與駕駛員驗收已經透過；原始碼、製品、遠端與 Release 繼續分別留證。

## 1.0.0 - 2026-08-16

### 創作權威與續接

- 為長專案加入 Markdown + YAML front matter + 受限 JSON 結構塊的創作權威合同、最小模板與校驗器；確認、候選、待決、否決和證據狀態不能重複佔位，自動化不能寫入駕駛員驗收。
- 把長材料來源鏈、材料片段 → 設定宣告 → 目標條目 → 複核證據併入 `tavern-card-builder`，並明確固定知識、MVU 狀態、敘事檢索與私有創作者畫像的四層記憶邊界。
- 新增能力相關的驗收賬本和 Finish Mode，繼續分離原始碼、自動測試、離線製品、瀏覽器、真實酒館、人工驗收與釋出授權。

### TavernWeave Library

- 新增 `consult-tavernweave-library`。一次安裝攜帶 A0、31 冊正式 ST 指南、C8 實驗指南、82 個設計條目、38 個動效條目、18 份直接關聯 Wiki 與 23 個自有本地沙盤，但按任務漸進讀取。
- 新增顯式釋出白名單、來源/許可/脫敏/雜湊清單、確定性路由器、快照生成器和完整性校驗器。A1 駕駛員母板、命令式舊 B1、過程檔案、本地證據、私有 RAG 與無關 AFV 域均設負向釋出門。
- 新增離線挑選頁，支援 ST 指南、設計、動效、Wiki、來源站、搜尋、篩選、本地沙盤、鍵盤、窄屏、減動和 `.tw-library-selection.json`；選擇狀態固定為 `proposed`。
- 16 個既有工程 Skill 全部接入 Library 路由，寫入型任務先讀取或確認 A0，實驗路線和真實宿主事實繼續保留獨立門。

### TavernWeave Soul

- 新增 `activate-tavernweave-soul`：`阿瞳助我！` 開啟溫柔指導版 MTTT，`MTTT.sir，拷打我！` 開啟嚴格但尊重的學習檢驗版，支援互切和 `Soul 歸位` 安全退出。
- v1 只承諾當前任務級 Portable 模式，不偽裝跨任務持久化；公開包只包含脫敏人格殼、共用方法論、畫像 schema 和路由合同，不包含個人 RAG 原文或雲端寫回。
- 兩種人格共享工程事實、許可權、Skill 路由和驗收結果；加入直接命令解析、引用不誤觸發、退出優先、嚴格不羞辱、抗提示注入和私密畫像負向測試。

### 驗收與釋出邊界

- Codex 與 Claude manifest 升至 `1.0.0`。專項自動驗證、挑選頁桌面/窄屏瀏覽器檢查與駕駛員人格體驗驗收已經透過；本地提交已單獨授權，打包、推送與 Release 仍保留獨立執行門。

## 0.5.0 - 2026-08-08

### 元件級更新交付

- 新增 `sillytavern-component-update`。使用者可明確選擇只生成可匯入測試的正則/酒館助手指令碼元件，或生成整卡 pipeline handoff；元件模式不會產出角色卡 JSON/PNG。
- 新增 dry-run 計劃、穩定 ID、輸出路徑、SHA-256、助手指令碼按鈕/資料與未知欄位保留檢查，避免為了修改一個元件而靜默重封整卡。

### 正則、安全與資料庫卡驗證

- 新增 `sillytavern-render-regex-pipeline`，用 fixture 檢查正則方言、placement/source、display/prompt、深度和替換結果，並明確列出離線工具無法替代的真實酒館階段。
- 新增 `sillytavern-rolecard-security`，只讀掃描 HTML sink、動態執行、遠端 JavaScript、跨幀通訊、憑據形狀、iframe 許可權和可疑正則；報告不包含憑據值或程式碼長摘錄。
- 新增 `sillytavern-database-rolecards`，校驗卡內表結構、主鍵、型別、預設值、欄位繫結及冪等遷移；同層相容路線繼續以 `DBR-C8-UNVERIFIED` 阻止，直到真實 SillyTavern 驗收轉正。

### 擴充套件、效能與媒體執行時

- 新增 `sillytavern-extension-dev`，提供 dry-run UI 擴充套件腳手架、manifest/入口/hook 校驗和惰效能力快照門；預設不安裝、不更新、不重新整理真實酒館。
- 新增 `sillytavern-rolecard-performance`，脫敏統計整卡、提示詞、世界書、正則、助手指令碼、遠端引用與內嵌資料預算，並獨立校驗具名真實環境採集的 p50/p95 樣本。
- 新增 `sillytavern-media-live2d-runtime`，校驗本地媒體雜湊、遠端依賴、預載入預算、Tavern Helper 音訊通道與 Live2D provider/fallback/銷燬繫結；離線階段不下載或執行遠端資產。

### 釋出門

- 七個新 Skill 均附 Node 指令碼和可復跑 fixture；正式校驗新增 JavaScript 語法檢查與逐檔案 Node 測試。
- replay 路由擴充套件到元件更新、正則階段、安全審計、資料庫卡遷移、擴充套件工程、大卡效能和媒體生命週期，並繼續區分靜態證據與真實執行時驗收。

## 0.4.0 - 2026-07-26

### 新增角色卡型別識別

- TW 陣列現在會根據角色卡原始碼、卡內指令碼和打包結果識別純文字卡、MVU 卡、MVU Zod 卡和混合型角色卡，再執行對應檢查。
- 純文字卡不會再收到無關的 MVU、Zod、正則或指令碼安裝提醒。

### 新增配套資源提醒

- MVU Zod 卡會分別核對卡內變數結構指令碼、國內/國外 MVU Zod 指令碼、必需正則及其他助手指令碼，發現缺失或啟用狀態錯誤時會明確列出，不再靜默跳過。
- 依賴說明會區分已經隨卡封裝的內容、需要啟用的酒館擴充套件、執行時聯網載入的內容以及僅供開發使用的工具，避免把所有依賴都寫成使用者安裝項。
- 卡內 MVU Zod 指令碼會繼續按照角色卡既有的 Git/CDN 地址載入執行包；配套指令碼已經隨卡提供時，不要求使用者另外安裝 Zod。
- 國內版與國外版指令碼會按照角色卡原有策略檢查是否齊全以及哪一份應當啟用，避免漏裝、錯選或同時啟用。

### 組裝與釋出檢查

- 缺少角色卡執行所必需的變數結構指令碼、MVU Zod 國內/國外指令碼、正則或其他助手指令碼時，TW 會阻止組裝或釋出，直到缺失項得到處理。
- 遠端載入內容不能只以“連結可以開啟”作為完成依據；最終驗收仍需在真實 SillyTavern 環境中確認指令碼已經執行、相關功能可以正常使用。
- 升級 TW 不會自動改寫已有角色卡；上述識別和提醒會在後續組裝、補全或釋出任務中生效。

## 0.3.0 - 2026-07-25

- Add independent custom CoT design and authoring for text cards, MVU cards, hybrid cards, plot direction, character behavior, NPC scheduling, system judgment, and output validation.
- Define the default `preset main CoT + card-specific increments + conditional modules` architecture, including stable phases, rule IDs, insertion order, semantic deduplication, prompt budgets, and generated full fallbacks.
- Separate author-written CoT prompts from hidden model reasoning, visible character thoughts, MVU `<analysis>`, update-model analysis, Zod schemas, and deterministic script calculation.
- Add ready-to-use lightweight, character/plot, and ensemble/system CoT templates plus explicit plot/update model routing and LLM/script ownership guidance.
- Define MVU zod same-generation and extra update-model routing, including marker matching, activation independence, shared-context budgeting, and a dual-mode acceptance matrix.
- Require card-bound and co-delivered worldbooks to resolve from the active manifest by stable ID and remain version- and content-aligned with maintained source.
- Extend manual replay coverage to 14 forward and 12 adversarial cases for custom CoT, dual-model prompt routing, script ownership, and stale worldbook packaging.

## 0.2.0 - 2026-07-22

- Add project-provided watch builds to the card-pipeline adapter contract.
- Connect source rebuilds, Tavern Helper real-time listener reloads, and real-SillyTavern execution evidence across the pipeline, embedded UI, and runtime-debug skills.
- Keep watch output as a development candidate and require a production build for final acceptance and release.

## 0.1.0 - 2026-07-22

- Establish the TavernWeave plugin and personal marketplace entry.
- Consolidate the four-part code cleanup workflow.
- Split rolecard authoring, components, pipeline, API, runtime, and embedded UI responsibilities.
- Add publishable derivatives for shadcn/Tailwind UI work and rolecard workshop operations.
- Pin API navigation to reproducible public upstream revisions without vendoring declarations.
- Gate releases on Python tests plus fingerprinted manual forward/adversarial replay evidence.
- Add a guarded personal-marketplace registration command and ESM-aware Tailwind config output.
- Add Claude Code plugin and marketplace manifests without duplicating the Skill array.
- License TavernWeave-authored material under PolyForm Noncommercial 1.0.0.
