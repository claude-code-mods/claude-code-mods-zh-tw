# Antigravity / AGY 適配

此適配把現有 23 個 Skill、由維護源生成的 Host Front Door 常駐規則，以及 AGY 工具名的 `tavernweave` Agent 組成一個原生外掛。它不設定預設引導擋位，也不啟用持續洗稿。模型執行、IDE 介面與真實 SillyTavern 驗收分別記錄。

## 構建與安裝

需要 Node.js 22 或更新版本，以及帶 `plugin validate` 命令的 AGY CLI。以下構建命令在原始碼倉庫根執行：

```sh
node scripts/build-antigravity-plugin.mjs --check
node scripts/build-antigravity-plugin.mjs
```

構建結果在 `dist/TavernWeave-Antigravity-v<版本>/`，版本來自 `tavernweave-install-manifest.json`。也可傳 `--output-dir <新目錄>`；構建器拒絕覆蓋已有目錄。它讀取當前工作樹，修改中的檔案也會進入候選包；發行前必須審查並提交相應原始碼。生成目錄不是新的維護源。

將下面的 `<生成目錄>` 換成構建回執裡的絕對路徑：

```sh
agy plugin validate "<生成目錄>" --strict --json
agy plugin install "<生成目錄>"
agy plugin list --json
```

安裝和更新均針對生成的 AGY 包。不要把倉庫根直接作為 AGY 安裝目標：倉庫根仍是現有 Claude 外掛，AGY 的 Claude 匯入轉換不屬於這份原生適配的驗收路徑。更新前先檢查 `plugin list --json` 的來源與實際路徑；存在同名舊包時按本機 AGY 的更新提示處理，不另建不同名字的重複安裝。

當前官方文件列出的全域性外掛目錄為 `~/.gemini/config/plugins/`，專案目錄為 `.agents/plugins/`；以實際 `plugin list --json` 回執為準。需要專案隔離驗證時，將生成包放在測試專案的 `.agents/plugins/` 下，在該專案中檢查發現結果。

生成包包含：

- `.antigravity-plugin/plugin.json`：AGY 原生清單。
- `skills/`：完整共用 Skill 目錄，名稱和 description 保持不變。
- `rules/AGENTS.md`：從 `host-adapters/tavernweave-front-door.md` 生成；不手改生成檔案。
- `agents/tavernweave.md`：AGY 原生工具清單；用實際檔案讀取能力載入 Skill。
- `build-receipt.json`：檔案構建回執，不冒充客戶端載入或人類驗收。

AGY 透過常駐規則載入前門，不使用 Claude 的 SessionStart hook、`CLAUDE_PLUGIN_ROOT` 或 Soul 切換 UI。因此無需向個人全域性規則再安裝一份前門；現有專案若已含前門，應核對版本和重複來源。`manage-host-front-door.ps1` 仍只管理 Codex/Claude 的全域性檔案。

## 擋位與持續洗稿

兩個隨包管理器均支援 `--host antigravity`，保留原有顯式授權、僅預覽受控區塊、預覽令牌、備份、編碼和無關內容保護。

客戶端 `--scope-root` 是已核實的 `.gemini` 目錄（不是 `config/`）。支援的目標為其中的 `AGENTS.md`、`GEMINI.md`、`config/AGENTS.md`、`config/GEMINI.md`。若已有同類受控區塊，沿用其目標；沒有時可提議 `.gemini/AGENTS.md`，但不自動選擇或儲存任何偏好。

例如，只查詢擋位：

```sh
node "<consult-skill-root>/scripts/manage-guidance-preference.mjs" --host antigravity --scope-root "<絕對路徑/.gemini>" --target "<絕對路徑/.gemini/AGENTS.md>"
```

洗稿管理器還支援 `--scope workspace`：`--scope-root` 為選定專案目錄，目標可以是該目錄的 `AGENTS.md` / `GEMINI.md` 或 `.agents/` 中的同名檔案。舊 `.agent/`、`_agents/`、`_agent/` 別名也納入檢查。

AGY 的規則疊加讀取，不採用 Codex 的首個非空檔案優先規則。管理器會檢查上述預設檔案、預設規則目錄的直接 `.md` 子檔案，以及工作區到 Git 根的預設規則；其他檔案已有同類受控區塊時拒絕新增，保持原檔案不動。預覽令牌也繫結這些檔案的內容，其他來源在預覽後變化時須重新預覽。

此管理器不解釋自定義 `rules.json` 或 `@[label](path)` 引用；發現它們會停止並要求核對實際載入來源。其他外掛、額外掛載工作區、宿主私有配置和規則總預算仍需在宿主裡檢查，檔案回執不聲稱完整解析宿主。外掛升級只更新包內容，不覆蓋使用者儲存的擋位或洗稿區塊。

## 驗證與邊界

```sh
node --test tests/antigravity-plugin.test.mjs tests/antigravity-persistence.test.mjs
```

靜態驗收應包含：23 個 Skill 的位元組一致性、生成規則來源、AGY Agent 工具名、未夾帶 Claude hook/UI、重複和衝突設定拒絕、預覽後變更攔截、備份及無關內容保留。AGY 原生嚴格校驗應顯示 23 skills、1 agent、1 rule、0 hooks，且零錯誤、零警告。

本次驗證快照（2026-11-04，Windows / AGY CLI 1.4.5 / Antigravity App 2.28.2）：

| 檢查 | 觀察結果 |
| --- | --- |
| AGY 包與設定儲存、原有儲存管理器 | 46 項透過、0 項失敗 |
| Claude hook 與宿主設定檔案映射回歸 | 9 項透過、0 項失敗 |
| 原生 `plugin validate --strict --json` | 23 skills、1 agent、1 rule、0 hooks，`findings: []` |
| 隔離 Git 專案中的 AGY 新會話 | 會話報告前門與測試外掛路徑下的 23 個 Skill 可見；同時報告本機另有同名全域性副本，不能把這次結果解釋為無重複安裝 |
| 實際 Skill 讀取與原生 Agent | App 介面可選 `tavernweave`；工具記錄確認讀取專案外掛的主檔案及必要參考 |
| Soul 啟用、退出 | App 內實際解析為 `atong-portable`，返回完整啟用回執；退出解析為 `inactive`；獨立新會話未繼承模式 |
| 隔離設定完整互動 | 初始查詢 `unset`；具體預覽後儲存擋位和洗稿策略、生成備份；重複設定 `changed:false`；新會話實際查詢讀回 `selected/入門` 與 `current` |
| 累計規則與過期預覽 | 擋位檔案變化後舊洗稿令牌被拒絕；目標位元組未變，重新預覽後正常啟用 |
| 有界移除 | 只移除洗稿受控塊，恢復該夾具原始位元組；兩條標記行、另一檔案的擋位區塊和備份均保留 |
| 歷史書面回放 | 88 正向 + 96 對抗全覆蓋；178 條原答覆沿用、4 條最小修訂、2 條缺失補答，均有獨立複核；保留原文、缺失證據和首輪失敗，之後才重新整理指紋 |
| 全量發行檢查 | PowerShell 7.6.5 與 Windows PowerShell 5.1 均透過：23 個 Skill、615 個文字檔案；四項版本一致性錯誤已修復，回放指紋檢查透過 |
| 版本修復專項與 Python 迴歸 | DSH/Claude 13 項及安裝流程檢查透過；Python 輔助指令碼、打包與安裝回歸 54 項透過，1 項因本機無法建立測試符號連結而跳過 |

後續版本修復將 Codex/Claude 當前清單及 marketplace 描述對齊到安裝主清單的 2.3.6，並讓 DSH 測試比較源包與主清單的實際版本。原始互動和書面回放快照保留修復前的檢查狀態，本表記錄修復後的複測結果；2.3.6 的 npm-only 發行歷史不變；本修復隨後續 2.4.0 正式發行，安裝是否更新以該版發行說明為準。

源倉庫中的 `validation-20261104.json` 保留 11 項互動檢查、18 條脫敏工具回執和夾具位元組核對；`tests/replay/runs/2026-11-04-agy-validation/` 保留 184 條案例的書面複核鏈。書面回放不是 184 次新的模型試跑。App 兩次新會話的測試沿用原有 Turbo 設定，沒有改許可權設定或使用繞過引數，也沒有出現需新增人工授權的提示。

早先無互動 CLI 測試的命令許可權拒絕仍是有效記錄；本次透過的是 App 互動路徑，不宣稱無互動限制消失。此前全量執行曾出現兩次 Windows `EPERM` 重新命名錯誤，單獨重跑為 40 透過、1 跳過、0 失敗，本輪全量檢查未再出現；原因仍未確定。

新會話驗證的是已儲存夾具的實際查詢讀回，不是使用者真實全域性規則的自動注入。真實個人設定、全域性安裝、獨立 IDE 表面、非 Windows 環境、真實 SillyTavern 和人類驗收仍未測試；指令碼的 `hostLoading: not-verified` 不由檔案檢查改成成功。

實機驗收單獨記錄客戶端版本和表面（App / CLI / IDE），在新會話檢查 Skill 和規則來源，再實際呼叫一個 Skill、Soul 口令及設定查詢。儲存設定的測試只能使用隔離目錄或使用者已授權的真實目標；不得為了測試替使用者選擇長期擋位。關閉、更新外掛後還需檢查是否有舊副本殘留。靜態校驗、CLI 元件發現、模型遵循與 IDE UI 不是同一項證據。

Soul 圖形切換介面、Claude hook 匯入轉換、AGY Marketplace 釋出及真實 SillyTavern 行為不在此適配內。

官方依據（2026-11-04 核對）：[外掛結構與規則](https://antigravity.google/docs/build-plugins)、[預設發現與累計規則](https://antigravity.google/docs/customization-discovery)、[外掛安裝與核驗](https://antigravity.google/docs/plugins)、[Agent 配置](https://antigravity.google/docs/subagents)。
