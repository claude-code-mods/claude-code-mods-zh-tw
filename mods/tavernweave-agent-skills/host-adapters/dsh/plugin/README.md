# TavernWeave X DSH

TavernWeave 的 DeepSeek Harness（DSH）外掛包。

- 一個可選 Agent 預設 **TavernWeave X DSH**（preset id: `tavernweave`）；
- 包內直接攜帶 TavernWeave 的 **23 個 Skill**（不依賴使用者先裝技能包）；
- 自動注入 **TavernWeave Host Front Door**（不再要求寫 `AGENTS.md`）；
- 包內同時攜帶 **神之手 DSH 客戶端面板**：Skill 輪盤、完整浮窗、世界書、前端設計＆動效資料庫、專案/卡管理；一次安裝，不再單獨裝第二個 UI 包；
- Skill 輪盤支援顯示/隱藏，開關位於會話頭，狀態儲存在本機；
- DSH preset 摘要寫明“23 個角色卡工程 Skill、Host Front Door 與精簡工具組合”，便於在選擇 preset 時看清包內能力和工具邊界；
- 安裝/升級/解除安裝走 DSH 自己的外掛機制（bundle patch），不復制檔案到使用者技能目錄。

## 要求

- DeepSeek Harness `0.2.1-rc.2`（`engines.dsh` 已宣告；DSH 仍處於 Developer Preview，升級 DSH 後需重新核驗）。
- 安裝後新建會話，在 Agent preset 選擇器裡選擇 **TavernWeave X DSH**。

## 安裝（DSH 桌面版）

1. 解壓發行資產或保留 `.tgz`；用已釋出的 `TavernWeave-DSH-v2.4.0.tgz`（也可在原始碼樹執行 `node scripts/build-dsh-plugin.mjs` 重新生成）；
2. 側欄 **外掛 → 新增外掛 → 安裝第三方外掛**；
3. 選擇本包（本地目錄 / `.tgz`）；
4. 安裝完成後啟用該 bundle；
5. 新建任務，選擇 **TavernWeave X DSH** preset。

## 安裝（CLI / Web profile）

```sh
dsh plugin --profile <profile> add <包名|git 地址|tarball|本地路徑>
```

`desktop` profile 由 Desktop shell 管理，不要直接用 `dsh plugin --profile desktop`。

## 解除安裝

在外掛頁停用並移除 **TavernWeave X DSH** bundle；或用 `dsh plugin --profile <profile> remove liarmttt-tavernweave-dsh`。
解除安裝後不殘留技能目錄或全域性指令檔案。

## 行為邊界

- 提供 Skill、前門口徑、可選 preset 和 DSH 客戶端面板；不改變 DSH 的模型、賬號、網路或許可權設定。
- 不實現跨任務偏好持久化；四檔大白話引導仍是當前任務內選擇，面板輪盤開關只儲存在本機。
- 世界書/專案/卡管理只讀寫使用者選定路徑；卡內指令碼不執行，卡內容不寫回。
- 若之前單獨裝過舊 `godhand-dsh` UI 包，升級到本包前先移除舊包，避免同一套介面重複載入。
- 真實 SillyTavern、模型效果與跨平臺驗收與安裝是不同證據，安裝成功不等於這些已透過。
