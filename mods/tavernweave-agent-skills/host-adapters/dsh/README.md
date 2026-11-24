# TavernWeave X DSH（DeepSeek Harness 外掛包）

這是 TavernWeave 2.1.0 起的 **DSH 正式適配入口**：一個可安裝的 DeepSeek Harness bundle 外掛包，內含 23 個 TavernWeave Skill、Host Front Door、可選的 `tavernweave` Agent 預設，以及神之手 DSH 客戶端面板（Skill 輪盤、完整浮窗、世界書、前端設計＆動效資料庫、專案/卡管理）。

> 舊的 TW Lite 離線預設（`tw-lite-entry` / `tw-lite-full` / `tw-lite-contract.json`）自 2.1.0 起已移除，不再維護。倉庫歷史裡仍可追溯。

## 組成

| 檔案 | 作用 |
|---|---|
| [`plugin/index.js`](plugin/index.js) | Host 外掛：註冊 23 個 Skill（帶資源基目錄）、注入 Host Front Door |
| [`plugin/cordis.patch.yml`](plugin/cordis.patch.yml) | Bundle patch：插入 `tavernweave` preset（摘要寫明“23 個角色卡工程 Skill、Host Front Door 與精簡工具組合”，含 persona/instructions/終端/fs/skill/ask-user/present/compaction） |
| [`plugin/package.template.json`](plugin/package.template.json) | 包元資料模板，構建時寫入版本號 |
| [`plugin/locale/`](plugin/locale/)、[`plugin/icon.svg`](plugin/icon.svg) | 外掛頁展示元資訊 |
| [`dsh-plugin-contract.json`](dsh-plugin-contract.json) | 機器合同：審計版本、組成、安裝/解除安裝、執行時門禁 |
| [`../../scripts/build-dsh-plugin.mjs`](../../scripts/build-dsh-plugin.mjs) | 生成 `.tgz` 發行資產並做包內校驗 |

會話頭提供 Skill 輪盤顯示/隱藏開關，狀態儲存在本機；隱藏後可從同一按鈕恢復。

## 安裝

### 桌面版（DSH Desktop）

1. 取得已釋出的 `TavernWeave-DSH-v2.4.0.tgz`（也可在原始碼樹執行 `node scripts/build-dsh-plugin.mjs` 重新生成同名本地包）；
2. 側欄 **外掛 → 新增外掛 → 安裝第三方外掛**；
3. 填入本地路徑或 `.tgz`，完成安裝並啟用 bundle；
4. 新建任務 → Agent preset 選擇 **TavernWeave X DSH**。

### CLI / Web profile

```sh
dsh plugin --profile <profile> add <本地路徑|tarball|git 地址|包名>
```

`desktop` profile 由 Desktop shell 管理：Desktop 自帶執行時的 `dsh plugin --profile desktop ...` 可以執行；透過 npm 安裝的 `dsh` CLI 會拒絕該 profile。普通使用者優先在外掛頁操作。

## 與現有 TW 包的關係

- Codex / Claude Code 的 ZIP 與技能包安裝方式**保持不變**；Claude Code 透過外掛市場安裝時，前門由外掛的 SessionStart hook 注入、`tavernweave` agent 對應本包的 preset（見倉庫 README 的“Claude Code 外掛”）；
- DSH 使用本外掛包，不再需要把 `skills/` 複製到 `.agents/skills`；
- 如果之前把 TW 的 Host Front Door 寫進了 `AGENTS.md`，DSH 裡應移除該區塊，避免與外掛注入重複（Codex 仍保留；Claude Code 外掛的 hook 遇到該區塊會自動停止注入）。

## 當前狀態

- `dsh-plugin-contract.json` 的 `runtimeAccepted` 已在 **DSH Desktop 0.2.1-rc.2** 上翻轉為 `true`：外掛頁、preset 選擇、23 Skill 目錄、Front Door、Soul 與完全許可權下的終端均完成實機驗收。
- 已完成：DSH Desktop 外掛頁（TW 圖示、無元資訊錯誤）、新任務選擇 `TavernWeave X DSH` preset、23 個 Skill 目錄、Front Door、`開啟soul模式` 進入阿瞳 Soul、完全許可權下的終端命令；另有 SDK 執行層的載入與引用證據（詳見 [runtime-acceptance.md](runtime-acceptance.md)）。
- 已完成：DSH Desktop 外掛頁出現 bundle、新任務選擇 `TavernWeave X DSH` preset、23 個 Skill 目錄、`開啟soul模式` 啟用 Soul（見 `runtime-acceptance.md`）。
- 尚未完成：pwsh 依賴任務（當前 OneDrive reparse-point 工作區被 DSH workspace-write 沙箱擋住，見合同 knownEnvironmentIssues；可切完全許可權或換普通目錄後重測）、停用/解除安裝清理、Linux/WSL、真實 SillyTavern 與模型效果。
- 不支援（v1）：跨任務偏好持久化（面板輪盤開關只儲存在本機）、專用 UI 與客戶端擴充套件。
- 2.4.0 沒有重跑上述 DSH Desktop 實機驗收；歷史驗收證據對應 2.1.0 包，仍需按新包重測後才能更新結論。
