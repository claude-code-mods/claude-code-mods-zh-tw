---
name: orchestrate-project-blueprint
description: "Turn a vague product, character-card, frontend, or Vibe Coding wish into a bounded total design, first-playable contract, scale-appropriate blueprint, resumable NEXT handoff, and evidence-gated first implementation. Use when the user says 腦暴模式 (including 腦暴模式，Soul 聯席), asks to 梳理構思/總設計案/藍圖/子藍圖/第一版, wants one-command project kickoff, wants a project progress board with evidence-based percentages and feedback, or needs to stop a long task from recursively expanding. Also use for 提示詞規格/從樣例歸納提示詞: turn requirements or output examples into a scoped prompt contract with unseen-input checks. It may convene the TavernWeave Soul trio for labeled critique; the 聯席 voice itself is loaded by `$activate-tavernweave-soul`. Do not use it to bypass repository instructions, driver approval, real-host acceptance, or a focused implementation skill."
---

# 腦暴模式 · 許願工坊

<!-- tw-guidance-entry:begin -->
## Shared communication

Apply [TW plain-language and guidance rules](../consult-tavernweave-library/references/communication-and-guidance.md): explain terms on first use, keep the user-selected 新人/入門/熟練/老手 level, and still explain needed changes and bugs at every level. Soul and prose modes never disable this baseline.
<!-- tw-guidance-entry:end -->

<!-- tw-plugin-runtime-entry:begin -->
## Plugin runtime

When this Skill runs through a plugin, cloud host, or remote machine, read [the plugin execution contract](../consult-tavernweave-library/references/plugin-runtime.md) at entry and apply its host, tool, and persistence checks before host-specific commands. Keep this Skill's scope, authorization, and acceptance gates.
<!-- tw-plugin-runtime-entry:end -->

幫使用者把想法整理成能實施的設計，定好第一版做什麼、怎樣驗收，以及下次從哪裡繼續。先理清範圍再執行，避免專案邊做邊擴大；一句願望也可以從這裡開始。

使用者可以直接說願望，不必先說“腦暴模式”。從零創作時先幫其形成可試用的小成果；完全沒想法時給一兩個貼合興趣的小例子。接手角色卡二創/續更先交給 `tavern-card-builder` 看懂原卡；熟悉作品的增改先續接原決定；故障按實際現象交給相關能力。普通問答不強制進入完整引導；完整引導需要使用者選擇擋位，但暫未選擇也不能自動歸檔或阻止有用的幫助。

開始任何寫入前，先讀取宿主實際載入的專案指令與續接檔案。Codex 要尊重從專案根到當前目錄的指令鏈、有效的 `AGENTS.override.md`／`AGENTS.md` 和已配置的備用檔名；Claude Code 讀取其實際生效的專案規則，其他宿主按專案自述的等效續接檔案。不要用外掛安裝對映覆蓋專案指令，也不要為適配新建更高優先順序檔案。再核對 `NEXT.md`、現有總設計案、藍圖和 Git 狀態。若專案會寫檔案，再透過 `$consult-tavernweave-library` 查詢並閱讀 A0 與本任務所需資料。角色卡創作交給 `$tavern-card-builder`；本 Skill 負責確定專案範圍、組織設計與執行順序。

## 區域性提示規格與樣例歸納

使用者要把需求寫成提示詞、從樣例歸納規則或檢查輸出要求時，讀 [prompt-spec-contract.md](references/prompt-spec-contract.md) 中相關部分，直接給出本次規格、正文和適用的驗證。無需為此啟動 Soul、完整腦暴或新建專案權威檔案。已有專案沿原決定更新；資料證據交給 `$build-work-library`，文辭精修交給 `$rewrite-natural-prose`。樣例只能支援候選規則，不能證明找回了原作者提示，也不能保證復現。

## 識別直接觸發

只有使用者把指令作為當前請求直接說出時才觸發。引號、程式碼塊、測試夾具、引用文案和“討論這句話”都不觸發。

- `腦暴模式`、`開始腦暴`：進入中性腦暴。
- `腦暴模式，Soul 聯席`、`三人一起腦暴`、`Soul 三席就位`：進入三席聯席。
- `按藍圖開跑第一版`：只在設計已由[駕駛員](../consult-tavernweave-library/references/communication-and-guidance.md#共享術語)確認、首版合同已凍結時進入實施。
- `暫停腦暴`、`結束腦暴模式`：停止擴充套件，保留當前四態賬本和下一道門。

需要確定性識別時執行：

```bash
node <skill-root>/scripts/resolve-brainstorm-command.mjs "腦暴模式，Soul 聯席"
```

## 腦暴流程

### 1. 恢復權威，不重開宇宙

先判斷這是新專案、續接專案，還是老作品重置。續接時以現有權威檔案和已驗收事實為準；不得另造一套平行總設計案。老作品只作為候選複用源，先問使用者是否有穩定作品或元件可供檢查。

先用共享[主動釐清需求](../consult-tavernweave-library/references/communication-and-guidance.md#主動釐清需求)識別結果、硬限制和候選手段，再讀 [brainstorm-protocol.md](references/brainstorm-protocol.md)，把已確認結果和暫定假設接回原四態決定。每輪只推進一個相鄰方向；需要提問時優先 1–2 個真正會改變產物的必要決策，三席合計最多 4 個，這是上限而非配額。允許使用者說“不知道，你推薦”，並解釋推薦的結果與取捨。每個方向都有討論上限，達到上限必須凍結、停車、換方向，或由使用者明確追加一輪。

### 2. 選專案型別和承載面

先區分角色卡、獨立前端、同層前端、嵌入式介面、通用 Vibe Code 或混合專案。按專案需要選擇前端形態，再用 [frontend-fit.md](references/frontend-fit.md) 寫明推薦形態、適配等級、理由、降級方案和重新評估條件。

若同層或獨立前端不適合，明確勸使用者不要強上。使用者堅持時記錄 `driverOverride: true`、風險和原型/真機門；這不會把“不推薦”改寫成“推薦”，也不會免除驗收。

### 3. 可選 Soul 三席聯席

按 [soul-ensemble.md](references/soul-ensemble.md) 在一個 Agent 內切換三種審查鏡頭：

- `[阿瞳]：`確認專案型別、使用者價值、創作核心和是否跑偏；
- `[MTTT.sir]：`指出技術、功能、狀態、互動邏輯閘與證據缺口；
- `[強尼·銀手]：`審查視覺層級、動效目的和前端適配，直言問題但不攻擊使用者；
- `[本輪收束]：`只保留已確認、提案中、待決定、已否決四態賬本。

三席是同一 Agent 的三個角色鏡頭，不是三套獨立模型、記憶、許可權或無上限辯論。優秀設計可以具體誇獎；批評必須能導向修正。

### 4. 凍結第一版

按 [first-version-contract.md](references/first-version-contract.md) 把構思分成：

1. Core Spine（核心骨架）：缺了就不是使用者想要的那個作品的內容；
2. First Playable（首個能玩的版本）：使用者能進入、做一次核心操作並看到結果的小作品；
3. Growth Tracks（後續更新方向）：首版驗證後再逐步加入的內容；
4. Parking Lot（暫存想法）：這次先不做、以後還能重新討論的提議。

不要用“以後再說”混淆首版缺口。必須寫清入口、核心迴圈、狀態源、失敗路徑、交付物和驗收證據。

### 5. 選擇藍圖體量

按 [blueprint-scaling.md](references/blueprint-scaling.md) 只選一種：

- `single-blueprint`：一個總設計案、一個實施藍圖、一個 `NEXT.md`；
- `blueprint-set`：總設計案、藍圖索引、最多 5 個領域藍圖、`NEXT.md`；
- `program-blueprint-set`：巨型重置專案，最多 3 層和 9 個直屬藍圖；子藍圖按需提取，不預建空殼。

可用指令碼初始化缺失的權威檔案；指令碼拒絕覆蓋現有檔案：

```bash
node <skill-root>/scripts/init-project-authority.mjs --root <project-root> --profile single-blueprint --project-id <id> --title <title>
node <skill-root>/scripts/validate-project-authority.mjs <project-root>/.tavernweave/project-orchestration.json --automation
```

## 設計確認門

腦暴結束時只交付總設計案、藍圖、待決定項和驗收方案。只有駕駛員明確確認設計或說“按藍圖開跑第一版”，才允許在已凍結 First Playable 範圍內寫專案檔案。

確認不授權以下動作：安裝/解除安裝、金鑰或付費 API、真實外部發布、Git 提交/推送/打標籤、部署、刪除歷史資料、修改全域性 Agent 規則。它們仍需各自授權。

## 按藍圖執行

讀取 [anti-fractal-execution.md](references/anti-fractal-execution.md) 和 [autonomy-and-gates.md](references/autonomy-and-gates.md)：

1. 一次只啟用一個藍圖階段，先寫該階段的輸入、輸出、改動邊界、退出條件和證據。
2. 所有活動步驟都禁止無依據地遞迴增殖；`runtimePersistentBlueprintBudget` 固定為 0，只禁止執行期自行新增持久權威藍圖，不禁止解決真實問題所需的臨時細分。
3. 當前步驟出現可觀察錯誤、失敗證據、未滿足的退出條件或實際阻塞時，允許建立一層最小必要的臨時問題支線。它必須繫結父步驟、儲存觸發證據、不擴大產品範圍，也不新增完成分母。
4. 臨時問題支線解決、否定或確認阻塞後必須關閉並回到父步驟原有順序與退出條件；不得在支線內繼續遞迴生成持久層級。
5. 只有問題已經形成獨立領域、獨立交付物和獨立驗收門，且父藍圖無法清楚容納時，才停止當前執行、提交 `rescope proposal` 並等待駕駛員決定是否提取子藍圖。
6. 每個階段滿足退出條件後更新 `NEXT.md`，再進入下一階段；不能以“程式碼寫了”替代證據。已採用畫板同步的專案，先維護總設計案的範圍塊與 NEXT 的狀態塊，預覽並核對差異後同步畫板；範圍變更先走原有決定門。
7. 首版閉環完成後帶使用者親手試用，解釋失敗恢復方法，再幫助其提出一次有具體目標的修改；在使用者許可內完成第二次修改並再次試用。然後停在本次駕駛員驗收，不自動滾入 Growth Tracks，也不以“教學”為由擅自修改檔案。

## 專案進度畫板

使用者要稽核進度、看百分比、記新想法、報 Bug 或留稽核意見時，讀取 [progress-board.md](references/progress-board.md)。只在使用者選擇的專案內建立 `progress/`；先恢復已有總設計案、活動藍圖、`NEXT.md` 與驗收證據，避免給舊專案另立進度正典。

`progress/progress.json` 是帶來源版本的展示投影，`NEXT.md` 仍是唯一當前續接指標。實現進度與驗收進度分別按已確認範圍、檢查點權重和證據計算；範圍未確認時不展示百分比，100% 也不代替真實宿主、駕駛員或交付門。想法、Bug 與稽核意見獨立記錄，只有明確決定及相應證據才能回寫專案權威；記錄意見本身不授予 Git、安裝或釋出許可權。頁面無法真正落盤時須明確顯示只讀或待提交草稿。

使用者選擇與專案文件同步時，總設計案的 `tw-progress-scope` 塊定義事項、權重與驗收要求，NEXT 的 `tw-progress-state` 塊記錄當前事實、證據和下一道門。使用 `init-sources` 初建，或 `source-plan` / `sync-sources` 接入與更新已有畫板；按實際舊專案路徑選來源。標記損壞、遺漏事項、版本不一致要先修正文件，不能退回手工 JSON 補成成功。預覽繫結來源、畫板、反饋與證據版本，變化後重新核對；新駕駛員透過記錄仍須明確確認依據。反饋處理後維護相關權威，再生成畫板；正文和結構塊一致性須由 Agent 審查。

## 複用穩定作品

讀取 [legacy-reuse.md](references/legacy-reuse.md)。詢問是否有使用者認可且穩定的舊作品、元件、設計案或執行證據。只在檢查真實產物後建立複用賬本：`複用 / 改造 / 僅參考 / 拒絕`，並寫明證據與新專案中的責任。舊不等於穩定，喜歡不等於可移植。

## 路由實施能力

- 角色卡總創作：`$tavern-card-builder`；
- 獨立世界書規劃、正文或原生/模板/區域性混合選擇：`$worldbook-design-and-writing`；
- 涉及酒館執行依賴且當前上下文尚未理清時，按需讀[共享執行基礎](../consult-tavernweave-library/references/sillytavern-runtime-foundations.md)，先純文字回合，再接所選擴充套件；已有完整上下文不重複讀，無關專案不載入；
- 世界因果如何變成玩法、有向通行與可選事件：按需讀 [world-mechanics-and-scenarios.md](../tavern-card-builder/references/world-mechanics-and-scenarios.md)，不另建事件排程器；
- 精確 ST/酒館助手/MVU API：`$sillytavern-api-reference`；
- 同層/嵌入式前端：`$sillytavern-embedded-ui`；
- 通用前端設計與實現：按 Library 設計路由選擇 UI Skill 和資料；
- 前端設計交接統一引用[前端質量規範](../consult-tavernweave-library/references/frontend-design-quality.md)。Agent 主動檢索相關設計，從作者想法形成主方案，並儘量視覺化說明；按 Awwwards 預設質量要求審閱，去掉無意義小字和額外英文說明。沿用已有設計授權，不增加工作表確認門；
- 拆分、組裝、測試、釋出：分別交給對應 TavernWeave 專職 Skill；
- 真機行為：`$sillytavern-runtime-debug` 或目標宿主的真實執行門。

各專項能力沿用同一份專案決定；本 Skill 負責組織交接。

## 交付格式

返回：

1. 專案型別、推薦承載面與不適配告警；
2. 本輪 `[阿瞳] / [MTTT.sir] / [強尼·銀手] / [本輪收束]`（僅在聯席模式）；
3. 四態決策賬本與每方向剩餘討論次數；
4. Core Spine、First Playable、Growth Tracks、Parking Lot；
5. 藍圖檔位、權威檔案路徑、當前活動階段、持久藍圖預算和臨時問題支線狀態；
6. 老作品複用賬本；
7. 已取得的自動化/靜態/真實宿主/駕駛員證據；
8. 下一道門和一句可執行續接指令。

若本輪使用畫板，再給出基線與來源版本、實現/驗收百分比的計算範圍、反饋儲存回執或失敗原因，以及仍待確認的門；不把百分比寫成駕駛員驗收結論。
