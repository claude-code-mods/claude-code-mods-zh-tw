# Codex 使用與安裝

TavernWeave 已有 23 個標準 Skill、各自的 `agents/openai.yaml` 和受支援的 `.codex-plugin/plugin.json`。本說明補充獨立 Skill 的安裝、路徑解析和驗收，不替換 Claude Code／DSH 的安裝方式，也不修改使用者的全域性指令。

## 先選一種安裝方式

- **外掛方式**：使用 Codex 外掛包及宿主當前提供的匯入、市場或安裝入口。包內的 `skills/` 由外掛清單宣告；不要將整個外掛目錄當作一個 Skill 塞入技能目錄。賬戶側啟用見[統一外掛指南](plugin-guide.md)。
- **獨立 Skill 方式**：把完整的 23 個 Skill 目錄放入當前 Codex 掃描的目錄。常用位置是使用者級 `~/.agents/skills/`，或目標專案的 `.agents/skills/`。倉庫原始碼自己的 `skills/` 不等於專案級發現目錄。

同一環境儘量選一種方式，避免外掛、使用者目錄和專案目錄各裝一套同名 Skill。已有舊路徑安裝不要直接刪除或遷移，先確認宿主實際載入的來源。`CODEX_HOME` 用於 Codex 配置，並不表示應把新安裝目標機械替換成它的 `skills/` 子目錄。

發現位置與呼叫方式依據[官方 Skills 文件](https://learn.chatgpt.com/docs/build-skills)核對；外掛格式依據[官方打包文件](https://developers.openai.com/plugins/build/plugins)。現有相容清單繼續保留，不為適配而重新命名 Skill 或強制改成另一種外掛格式。

## 跨平臺獨立安裝

需要 Python 3.9+。從本倉庫或 Codex 外掛包根目錄執行，先看只讀預覽：

```sh
python3 scripts/install-codex-skills.py --target "$HOME/.agents/skills"
```

確認目標和變更清單後，再實際安裝和核驗：

```sh
python3 scripts/install-codex-skills.py --target "$HOME/.agents/skills" --apply
python3 scripts/install-codex-skills.py --target "$HOME/.agents/skills" --verify
```

Windows PowerShell 對應示例：

```powershell
py -3 scripts/install-codex-skills.py --target "$HOME/.agents/skills"
py -3 scripts/install-codex-skills.py --target "$HOME/.agents/skills" --apply
py -3 scripts/install-codex-skills.py --target "$HOME/.agents/skills" --verify
```

僅限某個專案使用時，將 `--target` 換成該專案真實路徑，例如 `"/absolute/path/to/my-project/.agents/skills"`。指令碼必須從 TavernWeave 的副本讀取，不允許把安裝目標放回同一份原始碼樹。

如果同名 Skill 已有改動，預覽會列出 `changedSkills`，預設不會覆蓋。確認要替換後，使用相同目標並增加 `--apply --replace`。原目錄會保留在回執 `backup` 指向的位置，位於掃描目錄之外；無關個人 Skill 保持不變。需要恢復時先比較現有檔案與備份，再明確選擇要恢復的目錄，不要自動回滾後來新增的工作。

安裝器只複製技能及其資源，核對完整清單與檔案雜湊。不聯網、不運行復制來的程式碼、不寫 `AGENTS.md`／`CLAUDE.md`、不註冊外掛，也不處理偏好設定。連結、junction 和重解析路徑會被保守拒絕；如確需在對應位置安裝，先核實實際非連結目錄。它處理普通檔案操作失敗的回滾，但不宣稱具備斷電事務恢復能力。`installed-with-cleanup-warning` 表示技能已安裝，僅清理或回執落盤發生問題；按 `backup`／`retainedWorkDirectory` 檢視保留內容，不要盲目重複安裝。

原 PowerShell 安裝器及獨立授權的 Host Front Door 流程仍可用，見[安裝與更新](../README.md#安裝與更新)。

## 實際呼叫，不只檢查檔案

獨立安裝後，在目標專案的新任務裡用 `/skills` 或輸入 `$` 檢查可見條目，再發出一個小請求：

```text
使用 $consult-tavernweave-library 為“角色卡世界書規劃”選擇最少的相關資料。
先說明當前載入的 Skill 來源；有 Node 時執行隨包路由，沒有終端時只讀對應路由資料，並明確哪些檢查沒執行。
```

ChatGPT 的外掛介面使用當前提供的技能選擇入口，不必照搬 CLI 命令。任務裡的 `$skill-name` 是呼叫意圖，不是 shell 命令；帶外掛字首時採用宿主返回的完整標識。Codex 通常會檢測技能變化，未出現時重啟後重試；本專案仍要求新任務觀察，作為獨立於檔案安裝的驗收證據。

驗證分開記錄：

1. `--verify` 的 `matchedSkills: 23`：安裝檔案與選定原始碼匹配。
2. `quick_validate.py`：Skill 格式檢查，不證明被選中或正確執行。
3. 當前宿主技能列表：發現狀態；記錄實際來源，檢查重名。
4. 新任務選中技能、讀到資料並完成小成果：呼叫觀察。
5. Node／Python、瀏覽器、真實 SillyTavern、裝置和人工驗收：各自單獨檢查，不能相互替代。

## 指令碼與資源路徑

保留 23 個兄弟 Skill 目錄及資源，不要只複製入口檔案。`<skill-root>` 始終是當前所用 `SKILL.md` 的真實目錄；輸入和輸出使用專案目錄。帶空格的路徑作為完整引數引用。`skill://...` 只是宿主資源定位符，不能直接交給 Node 或 Python。

從任意專案目錄使用一個已解析的絕對路徑：

```sh
node "/absolute/skills/consult-tavernweave-library/scripts/query-library.mjs" --skill tavern-card-builder --intent "rolecard" --limit 1
```

沒有終端時，Library Skill 可以按其說明只讀機器路由與所需資料，報告路由指令碼未執行。不能因為外掛已載入就假定本機檔案、登入態、瀏覽器或雲端執行時可用。

專案指令遵守宿主實際載入鏈，包括有效的 `AGENTS.override.md`、`AGENTS.md` 與配置的備用名。安裝對映不是專案規則的上級權威；見[官方 AGENTS.md 說明](https://learn.chatgpt.com/docs/agent-configuration/agents-md)。

## 維護者回歸

```sh
python3 -B tests/test_codex_skill_install.py
python3 -B tests/test_plugin_packages.py
node --test tests/codex-skill-distribution.test.mjs
node scripts/sync-guidance.mjs --check
```

安裝測試使用臨時目錄，覆蓋預覽、完整安裝、冪等、備份、衝突、併發改動、回滾和路徑限制，並從獨立安裝樹執行資料路由及文字精修測試。它不觸碰真實使用者的 Codex 配置，也不代表已經完成所有作業系統或桌面外掛的執行驗收。
