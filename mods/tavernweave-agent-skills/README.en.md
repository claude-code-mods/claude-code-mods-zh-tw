# TavernWeaveX無限月讀

> **2.4.0 正式發行**：新增 **Antigravity（AGY）原生適配**——AGY 宿主外掛模板、指令檔案與四檔引導偏好的持久化適配；並把 Codex、Claude 外掛清單與 marketplace 描述對齊安裝主清單，恢復版本一致性。23 個 Skill 的名稱和數量不變。發行資產與校驗檔案見 [v2.4.0 正式釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.4.0)。原始碼安裝按本地清單核對 23 個 Skill；完整驗證範圍見 CHANGELOG 與 DSH 合同。

> 本版在 **2.3.6** 基礎上新增 Antigravity 原生適配，保留 23 個 Skill。2.2.0 引入的 Claude Code 外掛繼續提供 Host Front Door 自動注入、`tavernweave` agent 與輸入框上方的 Soul 模式切換；**TavernWeave X DSH** 外掛包現在內建神之手客戶端面板（輪盤、完整浮窗、世界書、前端設計＆動效資料庫、專案/卡管理），一次安裝；世界書設計與寫作入口繼續提供。完整包、外掛包與校驗檔案見 [v2.4.0 正式釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.4.0)；來源與合入記錄見[升級說明](docs/dual-task-upgrade.md)。

<p align="center">
  <img src="docs/assets/tavernweave-v1-cover.png" alt="一臺位於幻想酒館中的數字織機，將角色卡、世界書、設計資料與工程模組編織成統一工作流" width="100%">
</p>

<p align="center"><strong>把靈感、資料、程式碼與驗收，織成一張真正可維護的角色卡。</strong></p>

TavernWeaveX無限月讀（沿用 TW 簡稱）幫助你把想法做成能使用、能繼續修改的角色卡、網頁或小工具。你可以直接說想做什麼，或哪裡出了問題；TW 會整理需求、提出方案、製作和檢查，並說明接下來怎樣試用。它透過按任務載入的 Skill（按任務呼叫的工作能力）組織這些工作，支援 Codex、Claude Code，並透過 **TavernWeave X DSH** 外掛包支援 DeepSeek Harness；DSH 包內同時帶有神之手客戶端面板。

當前原始碼為 **TavernWeaveX無限月讀 2.4.0 正式發行**，新增 Antigravity（AGY）原生適配與四檔引導偏好持久化，並修復多宿主版本一致性；共 23 個原生 Skill，名稱和數量不變。2.2.0 引入的 Claude Code 外掛繼續提供 Host Front Door 自動注入、`tavernweave` agent 與 Soul 模式切換（見 [Claude Code 外掛](#claude-code-外掛)）；**TavernWeave X DSH** 外掛包內建神之手客戶端面板，世界書設計與寫作入口繼續提供。機器安裝標識 `tavernweave-agent-skills`、已有技能名稱和倉庫地址沿用原版，便於核對升級。完整包和校驗檔案見 [v2.4.0 正式釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.4.0)；[v2.2.0](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.2.0)、[v2.1.0](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.1.0)、[v1.9.1](https://github.com/LiarMTTT/TavernWeave/releases/tag/v1.9.1)與 [v1.9.0](https://github.com/LiarMTTT/TavernWeave/releases/tag/v1.9.0)歷史釋出頁保留。

**統一外掛的主要用途是讓有許可權的使用者在 dots 雲端長任務中呼叫 TW。** Codex 與 dots 共用 `TavernWeave-Codex-v2.4.0.zip`，不另開 cloud 版。TW 提供 Skill 和參考資料；雲端執行、續接、持久儲存與工具來自實際宿主。本機安裝不會自動同步到 dots 賬戶。使用方法和賬戶入口說明見 **[統一外掛指南](docs/plugin-guide.md)**。

TW 可以單獨設計或改寫世界書：先釐清知識邊界、正文和觸發條件，再選擇原生條目、條件輸出、顯式讀取或區域性混合方案。世界書負責的內容與整卡、世界構建、變數及執行除錯分別交接；預算最佳化需要實際測量，模型效果需要對應宿主中的觀察。普通軟體與制卡任務也共用更明確的需求釐清和提示規格方法，已有決定能直接複用。

沿用 1.9.0 已確認的墨月創作方法：完整卡以開場白和世界書為核心，按純文字、MVU Zod、hybrid 組織製作，補充世界觀、變數與人物創作方法。前端先研究需求與相關設計，預設參照 Awwwards 的設計要求；介面保持乾淨，正文按用途避免套話。

只想寫一條角色卡提示詞規則時，也能直接提出要求。Agent 會保留原意與約束強度，按請求交付正文或世界書條目。欄位繫結工具遇到 `bindings` 型別錯誤時返回明確診斷，不再直接丟擲陣列方法異常。1.9.0 已修復 Windows 上元件匯出失敗後可能留下半成品的問題；無法清理的檔案會明確列出。版本改動見 [更新日誌](CHANGELOG.md)。

專案進度畫板繼續由 `orchestrate-project-blueprint` 在各專案內生成：顯示整體和分模組的實現／驗收進度條，展開檢查點與證據，儲存想法、Bug 和稽核原話。畫板可從專案總設計案讀取範圍與驗收要求，從 NEXT 讀取當前狀態、證據和下一道門；同步先預覽差異，來源、反饋或證據變化後重新核對。新增想法不自動擴大已確認範圍，百分比不自動代替駕駛員或真實宿主驗收。使用方法見[專案進度畫板](docs/project-progress-board.md)。

作品資料庫繼續支援小說、原作／同人資料與聯網文圖參考整理，預設交付可編輯 Markdown＋JSONL 索引，並可匯出 SQLite；按來源、改編版本和知情階段檢索。見[作品資料庫使用說明](docs/work-library.md)。

所有能力繼續遵守大白話和術語解釋；新人、入門、熟練、老手由使用者選擇。文字精修、全量與架構審查、腦暴、內建設計 Library、Soul 和接手舊卡引導繼續提供。安裝核驗以實際取得版本的機器清單為準；客戶端實際載入與具體作品質量／token 測量保留獨立檢查。

> TavernWeave 原創內容採用 [PolyForm Noncommercial License 1.0.0](LICENSE)。允許非商業使用、修改和分發；未經版權方另行授權，原版、修改版及再分發版本均不得用於商業目的。分發時須保留許可證和版權宣告。第三方內容仍適用其[各自的許可證](THIRD_PARTY_NOTICES.md)。

## 一句話開始

普通制卡或 Vibe Code：

```text
我想用 TavernWeave 做一個【描述你想要的作品】。
先看看已有檔案，幫我整理成一個能親手試用的小成果；用大白話說明推薦理由和我需要決定的事情。
```

已經有卡檔案，可以這樣開始：

```text
我接手了這張角色卡，想【沿原作繼續更新 / 做二創】。
先幫我看懂原卡，說明有哪些材料、哪些內容需要保留，再一起選第一次改動。
```

## 按你選擇的節奏協作

| 引導擋位 | 你會得到什麼 |
| --- | --- |
| 新人 | 一次一個小步驟，詳細解釋操作位置、原因、術語和預期結果 |
| 入門 | 一次一個小階段，同樣詳細說明做法、步驟關係、方案取捨和檢查方法 |
| 熟練 | 合併常規步驟，交代關鍵決定、理由和驗證結果 |
| 老手 | 日常直接給結論、改動、差異和證據，減少重複基礎教學 |

可以直接說“以後使用入門檔”或“把我的擋位改成老手”。儲存前說明實際位置和範圍，已有選擇隨升級保留；未選擇時不自動分檔。“這次簡短點”隻影響本次說明。**所有擋位在有需要或修 bug 時仍詳細解釋，除非你明確說對應範圍沒必要。**

必要術語在第一次出現時解釋，並結合當前任務給出“原術語 / 大白話 / 具體意思”對照。大白話與擋位獨立於 Soul 人格和文字精修，退出其中一種模式不會清除你的選擇。規則與完整例子見[共用溝通與引導](skills/consult-tavernweave-library/references/communication-and-guidance.md)。

## 可選的表達與協作方式

溫柔指導版：

```text
阿瞳助我！
```

嚴格學習版：

```text
MTTT.sir，拷打我！
```

前端審查彩蛋版：

```text
靈魂殺手！
```

從一句願望收束總設計案和第一版：

```text
腦暴模式
```

讓三種 Soul 鏡頭一起參與腦暴：

```text
腦暴模式，Soul 聯席
```

設計確認後執行凍結的首版：

```text
按藍圖開跑第一版
```

從當前證據重新核驗完整 Vibe Code 成長曆程：

```text
照鏡子
```

只輸出一份可複製、可儲存的完整文字評估表單：

```text
照鏡子，只要文字評估表單，不要畫板
```

退出人格層：

```text
Soul 歸位
```

Soul 仍是當前任務級 Portable 覆蓋層。阿瞳與 MTTT.sir 是公開 MTTT 方法的兩種教學投影；靈魂殺手以非官方強尼·銀手同人彩蛋人格審查前端，可以嘴臭但必須拿證據、給修法。三席聯席只是同一 Agent 的三個標記鏡頭，共享事實、許可權、每輪優先 1–2 個必要決策（合計最多 4 個）和同一收束賬本，不是三個獨立模型。它不會自動獲得 ChatGPT 歷史或私有 RAG，不會跨新任務永久保持，也不會擴大檔案、Git、網路、釋出或生產許可權。

## 文字精修與全量／架構審查 · v1.4.0

說“洗稿這段”“去 AI 味”“去八股”可直接得到一個保留原意的精修稿。預設輕潤色，也可指定結構改寫或深度重寫；角色設定、數字、程式碼、宏與變數等技術內容保持原有約束。

| 用法 | 開啟 | 關閉 |
| --- | --- | --- |
| 單次 | 洗稿這段…… | 交稿後結束 |
| 當前任務持續 | 開啟持續洗稿模式 | 退出洗稿模式 |
| 工作區持久 | 在本工作區開啟洗稿模式 | 關閉工作區洗稿模式 |
| 客戶端持久 | 為當前客戶端全域性開啟洗稿模式 | 關閉客戶端全域性洗稿模式 |

持續模式覆蓋創作正文、對外文案、日常說明、計劃和審查報告；保留引用、程式碼、必需模板與證據。持久模式先展示實際規則檔案和差異，由駕駛員同意後寫入獨立區塊。安裝／升級 TW 不自動開啟。任務退出隻影響當前任務；“檢視洗稿模式狀態”會區分各個範圍及宿主載入證據。

“全量審查”檢視整個約定範圍；“架構審查”追蹤職責、依賴、狀態和關鍵鏈路；“全量架構審查”組合兩者。軟體與角色卡均適用。報告保留已檢查、部分檢查、未讀及排除項，並交付全部有證據的發現。也可說“靈魂殺手，全量架構審查”，沿用 Soul 風格；摘要最多三條，完整報告不截斷。審查先交只讀結果。

## 五層入口

```text
Host Front Door（可選本地入口）
  -> Soul（阿瞳 / MTTT.sir / 靈魂殺手 / 三席，可選）
    -> 腦暴編排（總設計案 + First Playable + 藍圖/藍圖集，可選）
      -> Library（A0 + ST 指南 + 設計/動效 + 來源 Wiki + 挑選頁）
        -> 按機器清單分發的工程 Skill（創作、元件、API、UI、除錯、成長核驗、構建、驗收等）
```

- **Host Front Door（可選本地入口）** 將持續大白話、任務路由與協作規則接入本地客戶端；Claude Code 外掛安裝時由 SessionStart hook 自動注入，與 `CLAUDE.md` 區塊二選一（見 [Claude Code 外掛](#claude-code-外掛)）。使用者擋位單獨儲存，更新入口時保留；檔案匹配與客戶端實際載入分別檢查。
- **Soul（可選人格）** 在使用者選定的引導擋位內改變語氣與教學方式，不改變事實、許可權和驗收結果。
- **腦暴編排** 控制方向輪數、四態決策、第一版邊界和藍圖體量；任意活動步驟都不能無依據遞迴增殖。真實問題可以臨時細分，解決或確認阻塞後必須關閉支線並回到父步驟。
- **Library** 單體分發、按需讀取；安裝一次不等於每輪塞入整個資料庫。
- **工程 Skill** 繼續擁有實際工作。人格和資料都不能替代目標執行時權威。

## Skill 陣列

| Skill | 主要職責 |
| --- | --- |
| `activate-tavernweave-soul` | 開啟、互切或關閉阿瞳 / MTTT.sir / 靈魂殺手當前任務級模式；強尼是前端審查彩蛋人格，不儲存私有 RAG |
| `build-work-library` | 整理小說、原作與同人資料、聯網文字和圖片參考；來源回查、版本/階段篩選、人工編輯、分批接續、Markdown＋JSONL 與 SQLite 匯出 |
| `consult-tavernweave-library` | 強制路由 A0、31 冊正式 ST 指南與 C8 實驗指南，並按需查詢 462 個設計、194 個動效、86 個概念、1,609 條蒸餾賬本及離線挑選頁 |
| `orchestrate-project-blueprint` | 將角色卡或普通 Vibe Code 願望收束為總設計案、First Playable、分級藍圖集、NEXT 和反遞迴執行門；可召集 Soul 三席聯席；專案進度畫板、百分比與反饋記錄及總設計案／NEXT 同步 |
| `reflect-on-vibe-code-growth` | 從當前 Codex/Chat/專案與交付證據重新評估完整 Vibe Code 能力網路，同時輸出可獨立複製的完整文字評估表單與七章互動報告，按可比量表對照不可改寫的歷史節點，並儲存脫敏的 append-only 本地履歷 |
| `worldbook-design-and-writing` | 獨立規劃、拆合、審閱和精修世界書；聯合選擇原生、模板或區域性混合路徑，保留語義與知識邊界；精確 API 和執行驗收交專職能力 |
| `tavern-card-builder` | 識別卡型與依賴，維護創作權威、材料來源鏈、世界書、MVU、CoT、開局與記憶架構邊界 |
| `sillytavern-card-components` | 無損拆卡、元件邊界、registry/recipe 與往返一致性 |
| `sillytavern-component-update` | 元件級更新、可匯入測試製品與整卡 pipeline 交接，阻止靜默重封 |
| `sillytavern-render-regex-pipeline` | 用 fixture 驗證正則語義、placement、顯示/提示詞、深度與階段 |
| `sillytavern-rolecard-security` | 只讀掃描注入、動態執行、憑據形狀、遠端載入和跨幀許可權風險 |
| `sillytavern-database-rolecards` | 表結構、訊息樓層、繫結和冪等遷移；C8 同層相容仍為實驗路線 |
| `sillytavern-extension-dev` | 最小 UI 擴充套件腳手架、manifest、生命週期、能力快照和版本門 |
| `sillytavern-rolecard-performance` | 脫敏預算、迴歸與具名真實執行時取樣 |
| `sillytavern-media-live2d-runtime` | 媒體、音訊、Live2D、預載入、provider、fallback 與清理 |
| `sillytavern-card-pipeline` | 依賴預檢、即時開發適配、組裝、JSON/PNG、世界書同步和釋出門 |
| `sillytavern-api-reference` | 查證 ST、Tavern Helper、STScript、EJS、宏與 MVU 的版本敏感 API |
| `sillytavern-runtime-debug` | 在真實 SillyTavern 追蹤 iframe、控制檯、DOM、樣式、資料和生命週期 |
| `sillytavern-embedded-ui` | 開局頁、狀態列、控制中心、抽屜、浮窗和移動端互動；按作品搭建可選沙盒的規範、聯合模擬、狀態對照與滑條除錯 |
| `code-quality-workflow` | 全量／架構審查、覆蓋記錄、完整發現、門控、最小修復、迴歸與 Finish Mode |
| `rewrite-natural-prose` | 保留原意與技術結構的文字精修，支援單次、任務持續及分別授權的工作區／客戶端持久模式 |
| `shadcn-tailwind-ui` | 使用 React、shadcn/ui、Radix 和 Tailwind 構建可訪問產品介面 |
| `rolecard-workshop-ops` | 診斷和運維可配置釋出鏈，同時保護生產座標和憑據 |

## Library 公開邊界

一次安裝同時攜帶：

- A0 通用駕馭檢查單，作為寫入型任務的常駐前置；
- STDB 的 31 冊正式指南和 1 冊明確標記為實驗的 C8；
- AFV 完成 243/243 路篩選後的 462 個設計條目、194 個動效條目、86 個概念索引與 1,609 條蒸餾賬本；
- 86 份直接關聯的本地概念/Wiki、89 個自有本地技術沙盤與統一離線挑選頁；
- 檔案級來源、許可、脫敏次數和 SHA-256 清單。

明確不分發 A1 駕駛員母板、命令式舊 B1、過程檔案、本地證據、AFV raw/收件箱、243 份源篩選 JSON、私有 RAG、日誌、憑據和無關知識域；只保留不含私密正文的篩選聚合回執。挑選頁的“加入候選”只表示 `proposed`，不等於採用、安裝、許可透過或真實酒館驗收。

離線挑選頁位於安裝目錄：

```text
skills/consult-tavernweave-library/assets/picker/index.html
```

## 創作、續接與驗收

長專案使用 Markdown + YAML front matter + 受限結構塊維護唯一創作權威。確認、候選、待決、否決、實現、自動證據、真實宿主證據和駕駛員驗收不得混寫。使用者說“繼續”時先恢復權威、Git/工作樹、製品和下一道門，不重複訪問已凍結設定。

證據按層記錄：

```text
原始碼 -> 自動測試 -> 離線製品 -> 瀏覽器/桌面 -> 真實 SillyTavern -> 人工驗收 -> 釋出授權
```

任何一層都不能冒充下一層；自動化永遠不能自行寫入 `driver-accepted`。

## 奶人教程

第一次使用 TavernWeave，或想了解如何指揮 Agent 完成制卡、除錯和驗收，可閱讀：[TavernWeave 奶人教程 · Vibe Code 制卡入門](https://liarmttt.github.io/TavernWeave/)。

## 安裝與更新

Codex 使用者可先看[Codex 專項使用與安裝](docs/codex-skills.md)：區分外掛與獨立 Skill 發現位置，並提供無需 PowerShell 的 Python 安裝／核驗入口（預設只讀預覽，顯式應用後才寫入）。

以下步驟用於 Codex 或 Claude Code 的**本地安裝**。dots 賬戶中的外掛啟用與使用見[統一外掛指南](docs/plugin-guide.md)，本地安裝不會自動同步到雲端。安裝器必須以倉庫 `skills/` 的完整清單為源，建立缺失目錄，不能只覆蓋本機已經存在的 Skill。Host Front Door 是可選本地增強；安裝前先看目標規則檔案和差異：

```text
請完整安裝並啟用這個 Skill 倉庫：
https://github.com/LiarMTTT/TavernWeave

不要只覆蓋本機已經存在的 Skill。請以倉庫 skills/ 的完整目錄為準；安裝後按機器清單核對完整數量（2.3.0 為 23/23；已釋出的 1.9.1 為 22/22），並單獨確認 worldbook-design-and-writing、build-work-library、activate-tavernweave-soul、consult-tavernweave-library、orchestrate-project-blueprint、reflect-on-vibe-code-growth、rewrite-natural-prose 和 Library 離線挑選頁存在。

請檢測我使用的是 Codex 還是 Claude Code，說明 TavernWeave Host Front Door 是可選本地增強；先展示目標路徑、受控區塊和 diff，得到我確認後再安裝。不要改寫受控區塊以外的使用者規則。
```

更新：

```text
請把已安裝的 TavernWeave 完整更新到這個倉庫的最新版本：
https://github.com/LiarMTTT/TavernWeave

更新必須比較“倉庫應有目錄”和“實際安裝目錄”，建立新增 Skill，不能只修改舊目錄；同時檢查 Host Front Door 是否缺失、過期或漂移，明文給出“更新前門/先看 diff/僅更新 Skills”三種選擇。完成後返回兩份回執，再新建任務驗證本地宿主發現。dots 賬戶匯入另按外掛指南驗證。
```

如果宿主或 Agent 使用“把每個 Skill 複製到某個專案級目錄”的便攜安裝方式，可在倉庫根執行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-tavernweave.ps1 -TargetSkillRoot '<實際 Skill 根目錄>'
```

需要在安裝時處理全域性前門，顯式選擇宿主並讓指令碼詢問：

```powershell
# Codex：預設目標為 $CODEX_HOME\AGENTS.md；未設定時為 ~/.codex/AGENTS.md
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-tavernweave.ps1 -TargetSkillRoot '<實際 Skill 根目錄>' -AgentHost Codex -HostFrontDoorAction Prompt

# Claude Code：預設目標為 ~/.claude/CLAUDE.md
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-tavernweave.ps1 -TargetSkillRoot '<實際 Skill 根目錄>' -AgentHost Claude -HostFrontDoorAction Prompt
```

安裝動作只維護帶版本的 `tavernweave-host-front-door` 註釋區塊；已有檔案先留備份，重複安裝冪等，錯誤/重複標記與連結路徑會被拒絕。單獨預覽或安裝可執行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\manage-host-front-door.ps1 -AgentHost Codex -Action Preview
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\manage-host-front-door.ps1 -AgentHost Codex -Action Install
```

全域性規則修改是獨立執行門；Agent 不得因為“推薦”二字靜默寫入。Codex/Claude 需要新建任務或重啟後重新發現；前門回執也不能冒充 Soul Skill 已被實際呼叫。

安裝或更新後必須對**實際掃描位置**執行核驗，而不是隻檢查原始碼倉庫。核驗器預設拒絕把 TavernWeave 原始碼目錄本身當作安裝目標：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-install.ps1 -TargetRoot '<實際外掛根目錄或 Skill 根目錄>'
```

透過回執的技能數必須與所用原始碼的安裝清單一致。以下以 2.3.0 的 23 技能原始碼為例；已釋出的 1.9.1 原包仍為 22/22：

```text
INSTALLATION VERIFIED: 23/23
Library: present-and-matched
Library picker: present
Soul: present-and-matched
Host rediscovery: required-new-task
```

如果核驗時同時指定宿主與規則檔案，回執還會顯示 `Host Front Door: current|missing-block|outdated|drifted`；它是推薦狀態，不改變按機器清單核對 Skill 檔案完整性的判定。

目標目錄中的無關個人 Skill 會保留；機器清單中的 TavernWeave 官方目錄必須與當前原始碼逐檔案匹配。寫入目標最後一級必須明確名為 `skills`；安裝指令碼拒絕磁碟機代號根、使用者目錄根、原始碼倉庫內部目標和目錄連結，替換失敗時會回滾已有官方 Skill。

完成對應版本的完整核驗後新建任務或重啟會話，使本地宿主重新發現 Skill。新任務中仍需實際呼叫世界書設計與寫作、Soul、腦暴編排、照鏡子與 Library；安裝回執不能冒充宿主發現。v2.4.0 外掛包、`TavernWeave-DSH-v2.4.0.tgz`（DeepSeek Harness）與 SHA-256 校驗檔案見 [正式釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.4.0)。

維護者若只是在釋出前自檢原始碼樹，可顯式使用 `-AllowSourceTree`；該開關不能用於普通使用者的安裝回執。

## Antigravity / AGY 外掛

Antigravity / AGY 使用者請先看[原生外掛構建、安裝與驗證](host-adapters/antigravity/README.md)。該包複用 23 個 Skill，透過常駐規則載入前門，並提供 AGY Agent 與設定儲存適配；嚴格校驗和客戶端實測分別記錄。倉庫根的 Claude 外掛匯入轉換不是 AGY 原生包的安裝路徑。

## Claude Code 外掛

2.2.0 起，倉庫本身就是一個 Claude Code 外掛市場（`.claude-plugin/`）。在 Claude Code 中執行：

```text
/plugin marketplace add LiarMTTT/TavernWeave
/plugin install tavernweave-agent-skills@tavernweave
```

外掛包含四部分，前三項與 DSH 外掛包一一對應：

| 組成 | 檔案 | 對應 DSH |
| --- | --- | --- |
| 23 個 Skill，名稱帶 `tavernweave-agent-skills:` 字首 | `skills/` | Skill provider |
| Host Front Door 自動注入：每次會話開始時把前門作為會話上下文加入（需要 PATH 中有 `node`） | [`hooks/hooks.json`](hooks/hooks.json)、[`hooks/session-start-front-door.mjs`](hooks/session-start-front-door.mjs) | system prompt section |
| `tavernweave` agent：TW 專用人設，工具集同樣精簡（不含聯網與子代理） | [`agents/tavernweave.md`](agents/tavernweave.md) | `TavernWeave X DSH` preset |
| Soul 模式切換：輸入框上方一行 `Soul 阿瞳 ▸`，展開後選模式只把對應指令填進輸入框，由你傳送 | [`hooks/soul-switch.tsx`](hooks/soul-switch.tsx)（`hooks/hooks.json` 的 `modules`） | 神之手 Soul 小浮窗（CC 只保留這一項介面） |

`tavernweave` agent 可以作為主會話啟動：`claude --agent tavernweave-agent-skills:tavernweave`；也可以在普通會話裡讓 Claude 把 TW 任務交給它。如果之前把 Skill 複製進了 `~/.claude/skills`，改用外掛後可以移除那份副本，避免同名 Skill 出現兩次。

Soul 模式切換用的是 Claude Code 外掛的函式 hook 介面（官方標註為 early access）。它和前門 hook 寫在同一個 `hooks/hooks.json` 裡，已在 Claude Code 2.1.299 上確認兩者都會載入；更早的版本是否忽略 `modules` 欄位尚未驗證。切換隻記錄你實際發出的 Soul 指令，不代表 Soul 已被確認啟用；它從不替你傳送訊息。介面測試用 `claude plugin test .` 執行。

### 與 CLAUDE.md 區塊去重

前門只需要一處。hook 啟動時檢查本會話會載入的指令檔案：`$CLAUDE_CONFIG_DIR/CLAUDE.md`（未設定時為 `~/.claude/CLAUDE.md`），以及當前目錄到根目錄各級的 `CLAUDE.md`、`.claude/CLAUDE.md`、`CLAUDE.local.md`。檔案裡的受控區塊優先：

| 情況 | hook 的行為 |
| --- | --- |
| 這些檔案都沒有 `tavernweave-host-front-door` 區塊 | 注入外掛自帶的前門 |
| 已有同版本區塊 | 不注入，檔案區塊生效 |
| 已有其他版本區塊 | 不注入前門，只加一句版本不一致提示；檔案區塊仍生效 |
| 環境變數 `TAVERNWEAVE_FRONT_DOOR=off` | 完全不注入 |

- 透過外掛市場安裝的使用者，不需要再用 `manage-host-front-door.ps1` 寫入 `CLAUDE.md`。已經寫過、想改由外掛隨版本更新的，執行 `manage-host-front-door.ps1 -AgentHost Claude -Action Remove`（指令碼會先備份）。
- 透過 ZIP 或複製 `skills/` 安裝的使用者沒有這個 hook，仍按上文寫入 `CLAUDE.md`。
- 引導擋位（`tavernweave-guidance-preference` 區塊）不受影響，仍單獨儲存在 `CLAUDE.md`。

驗收狀態：hook、agent 與 Soul 切換的結構、去重規則、輸出格式和指令一致性由 [`tests/claude-plugin.test.mjs`](tests/claude-plugin.test.mjs) 離線檢查，Soul 切換的介面行為由 [`hooks/soul-switch.test.tsx`](hooks/soul-switch.test.tsx) 在終端與桌面兩種表面檢查；Claude Code 新會話中的實際注入、`--agent` 啟動和子代理呼叫尚未實機驗收（見安裝清單 `claudePlugin.hostLoading`）。

## DeepSeek Harness

2.1.0 起，DSH 改用獨立外掛包安裝，**不要**把 `skills/` 複製到 `.agents/skills`，也不需要寫 `AGENTS.md`：

1. 從 [v2.4.0 釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.4.0)下載 `TavernWeave-DSH-v2.4.0.tgz`；或在原始碼樹執行 `node scripts/build-dsh-plugin.mjs` 重新生成本地包 `TavernWeave-DSH-v2.4.0.tgz`；
2. DSH 桌面版：側欄 **外掛 → 新增外掛 → 安裝第三方外掛 → 本地路徑/tarball**，安裝後啟用 bundle；
3. 新建任務，在 Agent preset 中選擇 **TavernWeave X DSH**。

CLI/Web profile 使用 `dsh plugin --profile <profile> add <本地路徑|tarball|git 地址|包名>`；`desktop` profile 由 Desktop shell 管理，不要直接呼叫 CLI。

外掛包內直接攜帶 23 個 Skill 與 Host Front Door（作為 system prompt section 注入），安裝/升級/解除安裝都走 DSH 外掛機制。詳細組成、機器合同與執行時門禁見 [host-adapters/dsh/README.md](host-adapters/dsh/README.md)。DSH 仍處於 Developer Preview。2.1.0 已在 DSH Desktop `0.2.1-rc.2` 上完成外掛頁、preset 選擇、23 Skill 目錄、Front Door、Soul 與完全許可權終端的實機驗收；模型效果、Linux/WSL 與真實酒館仍是分開的驗收項。OneDrive reparse-point 工作區在 workspace-write 下需切完全許可權或換普通目錄（見合同 `knownEnvironmentIssues`）。
