# TavernWeave 統一外掛使用指南

> **2.4.0 正式發行**：新增 **Antigravity（AGY）原生適配**——AGY 宿主外掛模板、指令檔案與四檔引導偏好的持久化適配；並把 Codex、Claude 外掛清單與 marketplace 描述對齊安裝主清單，恢復版本一致性。23 個 Skill 的名稱和數量不變。發行資產與校驗值見 [v2.4.0 正式釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.4.0)。原始碼安裝按本地清單核對 23 個 Skill；完整驗證範圍見 CHANGELOG 與 DSH 合同。

> 已釋出正式版為 2.4.0，共 23 個 Skill。從 [v2.4.0 正式釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.4.0)獲取發行資產；[升級說明](dual-task-upgrade.md)保留原補丁與修復證據。上一版 2.3.6 與 2.3.5 是 npm 渠道修復版，沒有對應的 GitHub 釋出頁；2.3.0、2.2.0、2.1.0 與 2.0.0 也是 23 個 Skill；1.9.1 為 22 個。

TavernWeaveX無限月讀 2.4.0 新增 Antigravity 原生適配，沿用安裝標識 `tavernweave-agent-skills` 和原有相容流程；2.2.0 引入的 Claude Code 外掛繼續提供 Host Front Door 自動注入、`tavernweave` agent 與 Soul 模式切換；2.1.0 引入的 [TavernWeave X DSH 外掛包](../host-adapters/dsh/README.md)繼續提供，2.0.0 引入的[世界書規劃與寫作 Skill](../skills/worldbook-design-and-writing/SKILL.md)繼續保留。Codex 與 dots 共用 `TavernWeave-Codex-v2.4.0.zip`，沒有單獨的“cloud 版”。這個外掛幫助使用者在 dots 雲端長任務中呼叫 TW 的工作方法：把目標分階段完成，儲存可續接的工作記錄，再從實際檔案和證據接著做。

TW 外掛是 **skills-only 資源包**，提供說明、參考資料和隨包指令碼，不附帶 MCP 伺服器、後臺常駐服務或金鑰。雲端任務能使用的終端、應用、檔案和持久狀態由實際宿主及賬戶許可權決定。dots 的雲電腦有自己的檔案、軟體和瀏覽器，可在使用者本機關閉後繼續工作；如果任務改在已連線的本機執行，就需要本機線上並保持應用可用。[dots 雲電腦與應用說明](https://learn.chatgpt.com/docs/dots/computers-and-apps)

## 獲取與啟用

只在 Codex 本地使用時，也可按[Codex 專項指南](codex-skills.md)選擇獨立 Skill 安裝；不要把使用者級／專案級技能目錄與外掛包內部的 `skills/` 混為一談，也不要重複安裝同名副本。

從 [v2.4.0 正式釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.4.0)取得需要的資產，並用同頁的 `SHA256SUMS.txt` 核對下載檔案：

| 檔案 | 用途 |
| --- | --- |
| `TavernWeave-Codex-v2.4.0.zip` | Codex／dots 共用外掛包 |
| `TavernWeave-Claude-ZCode-v2.4.0.zip` | Claude Code／ZCode 分發包 |
| `TavernWeave-ZCode-marketplace-v2.4.0.json` | ZCode 市場清單 |
| `TavernWeave-DSH-v2.4.0.tgz` | DeepSeek Harness 外掛包（TavernWeave X DSH） |
| `TavernWeave-DSH-v2.4.0.zip` | DeepSeek Harness 外掛包 ZIP |
| `SHA256SUMS.txt` | 已釋出檔案的 SHA-256 校驗值 |

上一版 [v2.3.0 釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.3.0)、[v2.2.0 釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.2.0)、[v2.1.0 釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.1.0)、[v2.0.0 釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.0.0)與更早的 [v1.9.1 釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v1.9.1)保留歷史發行包和校驗檔案；分別按 23／23／23／23／22 個 Skill 的清單核對，不能與 2.4.0 混用。

Claude Code 可直接從本倉庫的外掛市場安裝 `tavernweave-agent-skills`，外掛自帶 Host Front Door 注入 hook、`tavernweave` agent 與輸入框上方的 Soul 模式切換，與 `CLAUDE.md` 區塊的去重規則見 [README 的 Claude Code 外掛](../README.md#claude-code-外掛)。

DeepSeek Harness 不走技能目錄安裝，而是使用 `TavernWeave-DSH-v2.4.0.tgz`（已釋出的正式包）；在 DSH 外掛頁安裝並啟用 bundle，再在新任務中選擇 `TavernWeave X DSH` preset。也可在原始碼樹執行 `node scripts/build-dsh-plugin.mjs` 重新生成本地包。詳見 [host-adapters/dsh/README.md](../host-adapters/dsh/README.md)。

若賬戶提供外掛匯入或啟用入口，按該入口當前顯示的步驟選擇 Codex／dots 共用包，啟用後在新任務中讓 dot 查詢 TavernWeave。具體入口和許可權以賬戶介面為準；這份指南不指定未經證實的個人匯入按鈕，也不推斷某個訂閱套餐一定可用。**下載或解壓 ZIP 不會自動把外掛同步到 dots 賬戶。**本地檔案齊全、賬戶已匯入、外掛已啟用、dot 在任務裡確實呼叫到 Skill，是不同的狀態。

OpenAI 的[外掛打包規範](https://developers.openai.com/plugins/build/plugins)允許外掛以 `skills/` 提供工作方法，MCP 伺服器按實際需要新增。需要公開分發時，擁有相應開發者組織許可權的釋出者可按[官方上傳與提交流程](https://developers.openai.com/plugins/deploy/submission)上傳 ZIP、檢視自動檢查結果、提交稽核，並在稽核通過後釋出。Release ZIP 與公開外掛目錄上架也是不同的分發入口；使用者只需選擇自己賬戶實際可用的入口。

如果賬戶暫時沒有外掛匯入入口，可以儲存 2.4.0 發行包，向賬戶管理員或平臺確認可用許可權。不要把本機解壓當作雲端啟用。若只在本地 Codex 或 Claude Code 使用，按 [README 的安裝與更新](../README.md#安裝與更新)以所選版本的清單核對：2.4.0 為 23/23，歷史 1.9.1 為 22/22。本地全域性規則中的 TavernWeave Host Front Door 是可選增強，不是 dots 雲端使用外掛的前置條件。

## 開始一件事

在已啟用外掛的新任務中，直接說想做什麼，dot 會按任務選擇相關 Skill。第一次使用時，可以先讓它列出當前實際可見的 TW Skill，再開始一個小成果：

```text
請檢視當前任務能使用的 TavernWeave Skill，並用其中合適的能力幫我寫一條角色卡世界書規則：角色遇到陌生人先保持禮貌和距離，確認可信後才透露秘密。給我可編輯的條目草稿，說明觸發條件和容易誤傷的情形。先只在聊天裡交付。
```

這類純文字工作不需要雲端終端。若要執行隨包 Node.js 或 Python 指令碼、生成檔案或檢查工程，先讓 dot 確認它的雲電腦是否提供相應執行時、可寫目錄，並核對指令碼在**本次雲端環境**中可訪問。可從 `skills/consult-tavernweave-library/scripts/query-library.mjs` 的資料路由查詢，或 `skills/shadcn-tailwind-ui/scripts/generate_tailwind_config.py` 的配置檔案生成開始。沒有相應終端時，讓 dot 交付可編輯的文字方案或改用當前環境真正具備的工具。

## 長任務怎樣接著做

開始前告訴 dot 成果放在哪裡、每階段如何檢查。讓它在可持續訪問的工作位置保留目標、已完成內容、實際驗證結果、當前檔案和下一步；中斷後先回讀這些記錄與檔案，再繼續。可以直接傳送：

```text
請把這個任務分階段推進。每完成一階段，在當前可持續訪問的工作位置記錄目標、已完成內容、實際驗證結果、檔案位置和下一步。中斷後先回讀記錄與檔案，再核對現狀繼續；若這個工作位置不能持久儲存，請告訴我可用的替代方式。
```

若希望本機關機後繼續，請確認任務確實在 dots 雲電腦執行，並從該 dot 的雲端任務檢視進度。連線本機、使用本機瀏覽器或從雲端協調本地任務時，執行位置會不同；讓 dot 說明工作發生在哪裡。外部郵件、雲盤、釋出和其他應用寫入仍按使用者當次授權進行，先交付可檢查草稿再執行需要授權的動作。

## 遇到問題怎樣反饋

反饋時附上 TavernWeave 版本、取得外掛的入口、賬戶能看到的啟用狀態、任務實際執行位置、原提示、實際表現和預期表現。若問題涉及指令碼，附命令、退出狀態和產物路徑；涉及續接，附中斷前後記錄與檔案是否仍可訪問。可以遮去賬戶和私人內容。這樣能區分包內容、賬戶分發、宿主發現和實際任務執行各層的問題，方便針對具體環節修復。
