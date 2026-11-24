# AGENTS.md

Context Attachment Manager（上下文素材管理器，2026-10-11 前叫 Codex Attachment Manager）：讓使用者逐輪決定，Codex 任務和 Claude Code 會話裡的哪些圖片和檔案進入下一輪請求。

## 從哪裡讀起

- [docs/spec.md](docs/spec.md)：目標、範圍、硬約束和驗收標準，是唯一的事實來源，描述當前版本。
- [docs/design.md](docs/design.md)：技術方案，講現在是怎麼實現的。
- [docs/v0.4/plan.md](docs/v0.4/plan.md)：Claude 桌面 Code 接入的 v0.4 變更方案；任務和驗收分別見同目錄的 `tasks.md`、`acceptance.md`。當前正式規格仍以 `docs/spec.md` 為準，未透過的遷移關卡不算已實現。
- [docs/v0.5/plan.md](docs/v0.5/plan.md)：v0.5 方案，Claude Code 壓縮後保留圖片（已釋出 0.5.0）。
- [docs/v0.6/plan.md](docs/v0.6/plan.md)：v0.6 方案，預設開啟自動選圖、Claude 桌面版自動打開面板（已釋出 0.6.0）。
- [docs/v0.7/plan.md](docs/v0.7/plan.md)：v0.7 方案，Codex 的子代理和旁聊也自動選圖（已釋出 0.7.0）。
- [docs/v0.8/plan.md](docs/v0.8/plan.md)：v0.8 方案，模型給每張圖寫特徵行、壓縮後照樣拿對圖，面板改成搜尋加縮圖（已釋出 0.8.0）。
- [docs/v0.10/plan.md](docs/v0.10/plan.md)：v0.10 方案，壓縮和續接之後照樣拿回之前的圖，編號不變（已釋出 0.10.0；關卡結果見方案第 3 節）。
- [docs/v0.11/plan.md](docs/v0.11/plan.md)：v0.11 方案，把外掛拆成接入層、核心層、面板層，其他 Agent 平臺只接核心、不帶面板（已釋出 0.11.0）。
- [docs/history/v0.1/](docs/history/v0.1/)：v0.1 的開發記錄（原方案、任務記錄、各階段報告、最初的構想），只作參考，不作依據。
- [CHANGELOG.md](CHANGELOG.md)：每個版本的更新記錄，釋出時就是 Release 說明。
- [eval/README_CN.md](eval/README_CN.md)：評測（英文版 [eval/README.md](eval/README.md)），裝外掛和不裝外掛的對比：方法、結果和復現步驟。這一份是 Codex 裡的關鍵幀對話；Claude Code 裡壓縮兩次再分叉的長任務在 [eval/long-task/](eval/long-task/README_CN.md)。

## 已確認的規矩

- 原始對話記錄和素材檔案始終只讀。
- 真實資料不進倉庫：從真實會話和使用者素材裡提取的內容只能放在本機的 `local/`（已被 git 忽略）或工具的資料目錄（Windows 是 `%USERPROFILE%\.codex-attachment-manager`），任何時候都不提交。
- 外掛本體在 `plugin/`（`plugin/src` 是執行程式碼），測試和實驗指令碼在 `spike/`，一行命令用的安裝、解除安裝指令碼在 `scripts/`。改動執行程式碼後，要重新執行 `cam install`，Codex 快取裡的外掛副本才會更新；不要讓已安裝的配置指向不存在的檔案。
- `scripts/*.ps1` 只用 ASCII 字元：Windows PowerShell 5.1 用 `irm … | iex` 下載時按 Latin-1 解碼，中文會亂碼。
- 倉庫裡的文件和程式碼不寫使用者本機的具體路徑；通用位置（如 `~/.codex`、`%LOCALAPPDATA%`）可以寫。
- 對外的資訊以英文為主：README.md、INSTALL.md、CONTRIBUTING.md、eval/README.md、倉庫簡介、CHANGELOG.md（釋出時就是 Release 說明）用英文，README_CN.md、eval/README_CN.md 是中文版；`docs/` 下的規格、方案和開發記錄，以及本檔案，保持中文（使用者 2026-09-28 定）。
- 評測的報告和結果放在 `eval/`，指令碼在 `spike/src/eval-*.ts`。README 是給所有使用者看的，只在底部留一小節，用白話說兩句並連結過去；評測是寫給工程師看的（使用者 2026-10-24 定）。
- CHANGELOG 的每一版（也就是 Release 說明）是寫給所有使用者看的：開頭一句話說這一版帶來什麼，再用白話分“新功能”“修復”“更新後要做的”“怎麼測的”，講使用者能感受到的變化；內部機制、token 數、版本號細節等寫給工程師的內容，放進最後一個摺疊的 `<details>` 技術細節裡（使用者 2026-11-01 定）。
- 先在 Windows 上開發和測試。技術棧用 TypeScript/Node。
- 介面開發：Claude 自己截圖檢查效果；做到介面的關鍵節點時，截圖給使用者看，停下來等反饋再繼續（使用者 2026-09-24 確認）。
- 測試時呼叫模型一律用 `gpt-6-sol`，推理強度 `low`，包括指令碼自測和桌面版測試，為了省 token（使用者 2026-09-24 要求）。
- 介面和提示文字分簡體中文、英文兩份：面板的在 `plugin/src/panel/panel.html` 的文字表裡，外掛服務和命令列的在 `plugin/src/core/messages.ts`。新增或修改文字時兩份一起改，單元測試會檢查條目一一對應。改發給模型的佔位符和說明（`plugin/src/core/words.ts`）時，中文、英文（`--lang en`）各跑一次 `spike/src/v01-placeholder-selftest.ts`（使用者 2026-09-25 要求）和 `spike/src/v01-needs-selftest.ts`（沒有名字的工具截圖全部取消後，模型能不能按編號要圖、面板能不能認出來；使用者 2026-09-26 要求）；改的是自動選圖的文字（自動版的佔位符和說明、`cam_view_image` 的說明和返回的文字）時，再跑 `spike/src/v03-auto-selftest.ts`（模型該取圖時會不會取、不該取時會不會不取；使用者 2026-10-06 要求）；改的是特徵行說明時，再跑 `spike/src/v08-features-selftest.ts`（模型會不會給新圖寫特徵行、照原話記評價、正文裡不提，壓縮後能不能靠特徵行拿對圖；v0.8）；改的是壓縮後放回的說明和清單時，再跑 `spike/src/v10-compaction-selftest.ts`（Codex 壓縮之後，模型能不能靠清單認出之前的圖、要看原圖時按編號取對；v0.10）。這些自測三個 GPT-6 模型都要跑：`gpt-6-sol`、`gpt-6-luna`、`gpt-6-astra`，推理強度 low，用環境變數 `CAM_TEST_MODEL` 切換（使用者 2026-09-28 要求）。自測在使用者的 Codex 裡建的任務，測完由指令碼自動歸檔，不留給使用者手動整理（使用者 2026-09-28 要求）；遺留的可以用 `spike/scripts/archive-test-threads.ts` 歸檔。
- 分工：Claude 維護 `docs/` 下的規格和方案，並負責開發和測試（階段 0 的 T0–T2 由 Codex 完成；測試需要在 Codex 之外啟動 app-server，所以從 T3 起改由 Claude 執行）。其他協作者不修改 spec.md 和 design.md。

## Git 規範

- 只維護 `main` 一條長期分支，暫不設 `develop` 等分支。`main` 必須始終可用。
- 不直接在 `main` 上提交。每項工作都開一個短分支，命名格式為“型別/簡短描述”，例如 `spike/phase0`、`feat/asset-index`、`fix/rollout-parse`、`docs/spec-update`。
- 提交資訊用約定式格式：`型別(範圍): 描述`，例如 `feat(indexer): 解析內聯圖片`。
- 合併前先驗證，確認相關測試和檢查都透過。然後用 `git merge --no-ff` 合併到 `main`，不開 PR，合併後刪除短分支。
- 不對 `main` 強推，不改寫 `main` 上已經推送的歷史。
- GitHub 上 `main` 有分支保護（使用者 2026-09-28 要求）：禁止強推和刪除；其他人改 `main` 要提 PR，三個平臺的 CI（`test (windows-latest)`、`test (macos-latest)`、`test (ubuntu-latest)`）透過，並由倉庫所有者批准。倉庫所有者是管理員，不受這些限制，照常在本地 `--no-ff` 合併後推送。
- 遠端只用 SSH（`git@github.com:…`），不用 HTTPS。
