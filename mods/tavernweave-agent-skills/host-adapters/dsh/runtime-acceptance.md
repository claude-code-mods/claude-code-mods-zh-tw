# TavernWeave X DSH 執行時驗收記錄（進行中）

> 機器合同：[`dsh-plugin-contract.json`](dsh-plugin-contract.json)。在 `runtimeAccepted` 翻轉為 `true` 之前，本檔案只記錄部分證據。

## 已完成：SDK JSON-RPC 執行時的真實模型輪次（2026-10-18）

- DSH：`0.2.1-rc.2`（本機安裝版 `@deepseek-ai/dsh` 版本）
- 安裝路徑：把構建出的 `TavernWeave-DSH-v2.1.0.tgz` 解壓後，用 bundled `dsh` CLI 安裝進隔離 profile：
  `dsh plugin --profile twsdk add link:<extracted package>`（bundle 自動追加到 profile 的 `dsh.profile.bundles`）。
- 由於 `sdk` profile 不含 agent-preset 登錄檔，測試用 `--patch` 把 host 外掛作為全域性行掛載；這與正式 preset 路徑共享同一個 `index.js` 與同一份打包內容。
- 客戶端：自寫 JSON-RPC stdio 客戶端（`dsh-sdk-acceptance.mjs`），`initialize` 使用 `provider=deepseek-account, model=deepseek-flash, reasoningEffort=max`，向會話傳送一條中文提示詞。
- 觀測結果（會話 `tw-acceptance-1792311534928`）：
  - agent 呼叫了 `skill` 工具並載入 `consult-tavernweave-library`，工具結果包含完整 Skill 正文與 `<skill_resources>` 目錄提示；
  - 會話目錄含全部 23 個 TavernWeave Skill（`activate-tavernweave-soul` … `worldbook-design-and-writing`），另有 2 個來自該 profile 自身檔案系統 provider 的環境 Skill（非 TW）；
  - 模型在 reasoning 中引用了 **TavernWeave Host Front Door** 的規則，並在正式回覆中逐字引用了其中一條英文規則，說明 system-prompt section 注入對模型可見；
  - 單輪 usage：input 2004 / output 1048 / cache-read 11264 tokens（一次小請求）。
- 證據檔案（預設工作區，不隨倉庫分發）：`reviews/dsh-acceptance/sdk-result.json`、`sdk-notifications.json`。

## 第二輪：Soul 模式真實啟用（同一 SDK 執行時，2026-10-18）

- 輸入：`開啟Soul模式`
- 觀測（會話 `tw-acceptance-1792312025185`）：
  - agent 呼叫 `skill` 工具，引數為 `{"name": "activate-tavernweave-soul"}`，並讀取 persona-kernel、mode-contract、atong-mode 等隨包 references；
  - 執行 `scripts/resolve-soul-command.mjs "開啟 Soul 模式"`，返回 **Soul Mode 已開啟（任務級 / Portable，阿瞳）**，並按外掛執行合同彙報人格核心、創作者檔案與引導擋位未設定；
  - 該輪同時嘗試 `pwsh` 時遇到本機 DSH 沙箱 ACL 初始化失敗（`SetNamedSecurityInfoW failed (Win32 5)`），agent 如實報告"命令解析指令碼沒跑通"，沒有偽造成功回執。這是測試 profile 的終端沙箱問題，與外掛/Skill 載入無關。
- 結論：Skill 目錄、`skill` 工具、Soul Skill 的資源相對路徑與 Front Door 路由在真實模型輪次中均生效；不包含終端沙箱可用性證明。

## 第三輪：DSH Desktop 圖形介面實機驗收（2026-10-18）

- 會話：`session-18841be2-eb38-43cc-b6fd-b4c7f4fc537e`，workspace 為 OneDrive 重定向目錄（不在倉庫記錄絕對路徑）。
- 觀測：
  - 會話日誌出現 `agent-preset/selected` → `tavernweave`；介面頂部顯示 **TavernWeave X DSH**，外掛頁已出現該 bundle；
  - 新任務 system-reminder 的 `available_skills` 含全部 23 個 TavernWeave Skill 與 Host Front Door；
  - 使用者輸入 `開啟soul模式`，agent 呼叫 `skill` 工具載入 `activate-tavernweave-soul`，返回阿瞳 Soul Mode（任務級 / Portable），並如實報告終端命令未跑通；
  - 外掛頁圖示第一版誤畫成 T+V（顯示 `TV`），已改為 TW 字形路徑並改為 `icon-tw.svg` 做快取失效。
- 發現的環境問題（非外掛缺陷）：
  - `pwsh` 工具報 `SetNamedSecurityInfoW failed (Win32 5): grantWrite(<workspace>)`，連 `Get-Location` 都失敗；
  - 用隨包 `diagnose-windows-sandbox-acl` 診斷：路徑鏈上的 OneDrive 重定向根目錄是 **reparse point**（OneDrive 重定向目錄），指令碼按設計拒絕穿越 reparse point 改 ACL，verdict `PRECONDITION`，`nextAction=stop`；報告在 `reviews/dsh-acceptance/acl-recovery/`。
  - 工作區在 OneDrive 重定向目錄內時，DSH 的 workspace-write 沙箱無法完成 ACL 授權。解決辦法：把該會話切到 **完全許可權（full access）**，或把工作區放到非 reparse point 的普通目錄（如一個普通本地目錄）。
  - 這不是 TavernWeave 外掛/Skill 的問題：preset、Skill 目錄、Front Door、Soul 啟用均已在同一會話生效。

## 第四輪：普通路徑的 ACL 修復後，沙箱終端恢復（SDK 複核，2026-10-18）

- 對預設工作區下的 SDK 驗收目錄執行隨包診斷指令碼：verdict `PRECONDITION` → 選中 grant 目標 → 備份 DACL → 添加當前使用者 FullControl ACE → 復讀驗證 `writeOwner=true`（`GRANTED`，`nextAction=verify_original_confined_operation`）。
- 同一 SDK 會話隨後傳送 `開啟Soul模式，然後執行 Get-Location 並告訴我結果`：agent 載入 Soul Skill 並進入阿瞳模式，`pwsh` 的 `Get-Location` **執行成功**，返回上述目錄；不再出現 `SetNamedSecurityInfoW`。
- 結論：DSH 的 workspace-write 沙箱在普通本地目錄上可以透過一次性 ACL 修復恢復；**OneDrive 重定向目錄（reparse point）無法這樣修復**，需要完全許可權或換工作區。

## 第五輪：完全許可權下桌面終端恢復（使用者實測，2026-10-18）

- 使用者在 DSH Desktop 的 TavernWeave X DSH 會話中切換到 **完全許可權（full access）** 後，終端命令恢復正常；使用者反饋“完全許可權測試沒問題了”。
- 這說明 OneDrive reparse-point 工作區的問題只是 workspace-write 沙箱授權限制；切完全許可權即可正常做 TW 終端工作。預設模式下的限制已記錄在合同 `knownEnvironmentIssues`。
- 舊的 `icon-tw.svg` 元資料錯誤來自正在執行的 DSH 程序快取；磁碟上的包已改為 `icon.png`，完整重啟 DSH 後應消失。

## 尚未完成（轉正前必須補）

- DSH Desktop 外掛頁從發行資產安裝、啟用 bundle；
- 新建任務選擇 **TavernWeave X DSH** preset 並真實執行一個 TW 任務；
- 停用/解除安裝後確認註冊項清理乾淨；
- Linux/WSL 路徑與 bash 分支；
- 真實 SillyTavern 與模型效果（與安裝驗收分開，不得合併宣告）。
