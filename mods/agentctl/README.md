# agentctl —— 單個 Claude Code 會話的 Agent 控制面板

已用 **Claude Code 2.1.288**（無頭）與 **2.1.289**（互動，宿主自動更新後）測試（`claude plugin validate .`、`claude plugin test .`：203 個測試）；0.2.x 已在 2.1.289 上即時重新驗證（§ 0.2.x 即時驗證）。
mods API 被標記為可能在版本間變更；宿主寫入 `.claude-plugin/types/` 的型別宣告是當前安裝版本的權威。每次升級 Claude Code 後執行 `claude plugin validate .`。

設計：本倉庫中的 `docs/features/agent-control-plane-mod/`（需求、可行性研究、技術規格、請求票據）。該目錄不屬於 sd0x-dev-flow 外掛：安裝外掛不會安裝該 mod。要安裝它，執行 `/agentctl-setup`（它檢查宿主、經你批准後安裝 `agentctl@sd0xdev-marketplace`，並構建你的首條任務行；`/agentctl-setup --task` 與工作流技能會代擬一份方案供你接受），或用 `claude --plugin-dir mods/agentctl` 為一個會話載入它。

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

## 首次執行

直接輸入你正在做的事 —— 不需要任何其他命令：

```text
/agentctl 測試一下這個新功能
```

1. 該 mod 把一條給 Claude 的請求放進你的輸入框（它從不傳送）。按 **Enter**。
2. Claude 讀取專案並起草一份範圍 —— 它可編輯什麼、哪些檢查算作證據、“完成”意味著什麼 —— 並透過 mod 內建的輔助程式（`bin/propose.mjs`）寫入。若有不清楚之處，它會問你，而不是自行編造許可權。
3. 在該回復末尾，mod 顯示範圍並在輸入框提供 `/agentctl accept <digest>`：**Tab**，然後 **Enter**。接受即繫結該範圍；它不會開始任何工作。
4. 讓 Claude 開始。`/agentctl` 顯示進展與下一步 —— 執行檢查，然後 `/agentctl handoff`；`/agentctl help` 列出其餘命令。

一位未讀過設計的測試者獨立完成了步驟 1–4 與交接（§ 無指導執行）。

傳送請求本身就是一次普通的 Claude 回合；mod 自身不呼叫模型。當你的目標以中文書寫時回覆使用繁體中文，否則用英文 —— 這只是啟發式，不是語言區域檢測。

## 它做什麼

| 功能 | 方式 |
|---|---|
| 任務範圍 | Claude 起草方案（`/agentctl-setup --task`，或在 mod 安裝後 `/feature-dev`、`/bug-fix`、`/refactor`）；mod 預覽它，而在你自己的提示行輸入 `/agentctl accept` 繫結的正是所預覽的內容 —— 見 § 方案。在提示行輸入 `/agentctl task set <json>` 也能把任務繫結到工作樹。工具輸出、檔案與訊息無法改變它 —— 只有你輸入的命令可以。繫結按工作樹，因此你在同一工作樹的另一會話中自行執行 `task set` / `task clear` 確實會替換或清除它。任務記錄與交接按工作樹保留，因此兩個工作樹中的同一任務 id 指向兩個不同任務。儲存錯誤會被如實報告，且原任務繼續生效；記錄缺失的繫結在工作樹中只允許讀取 |
| 拒絕 | 一個拒絕列表。被識別的直接生產寫入與遠端 git 寫入，**無論有無任務**都被拒絕；在繫結任務時，其自身的 `forbid` 條目與工作樹根之外的編輯也被拒絕。編輯根會繫結編輯工具（Write、Edit、NotebookEdit）；透過 shell 重定向寫入的檔案是 Bash 命令，mod 無法分類，因此交給宿主 —— 拒絕資訊會告訴 Claude 不要用其他方式達到同樣結果，但編輯根不是沙箱。mod 無法分類的一切 —— 指令碼、複合 shell、未知工具 —— 都交給 Claude Code 自己的許可權提示或自動模式，記錄為 `delegated`。下游拒絕絕不會被削弱，也絕不會建立允許。**盡力而為**：mod 讀取每次工具呼叫，從不讀取指令碼內容或其啟動的命令，因此指令碼內的 push 屬於宿主與該工作流自行授權的範圍 |
| 證據 | 一次運行當它匹配已宣告的 `check` 執行器時算數 —— 優先匹配詞語，因此帶新增引數的仍算數，但可能比宣告的檢查更少；而管道、重定向或包裝（`npm test \| grep pass`）不算。accept 回覆與 `/agentctl` 會把每個檢查命名為與之匹配的一行，或 —— 當格式化器無法把某個詞以單段引用時 —— 命名其 JSON 詞形，若原樣複製則不匹配（同樣詞的、正確引用的拼寫則匹配）。匹配的呼叫以 Git 派生的樹讀數括起（執行器優先匹配，因此宣告的 `git status` 檢查也算檢查）；其後的編輯會在 30 秒內使結果變為 stale；後臺檢查在見到終端結果前保持“completion unobserved”。證據屬於它被觀察到時的任務與策略版本，且覆蓋率不完全的讀數永遠不會被列為已驗證 |
| 面板 | 提示行上方的狀態帶是緊湊的：任務、執行時及其時長、需要你做什麼、閘門讀數及其年齡（超過 30 秒標 `stale`）、上次交接時間。`/agentctl` 是緊湊的狀態回覆 —— 下一步、任務、需要你做什麼、閘門與證據；`/agentctl status --details` 還會加上儲存健康度、執行時、上下文與 5h 視窗。閘門、上下文與視窗行會註明來源與年齡，或顯示 `missing` / `unavailable`，每條證據行則顯示其結論、新鮮度、覆蓋率與年齡 |
| 交接 | `/agentctl handoff` —— 從記錄得出八個回答，無模型、無網路、無程序；重新開啟時完整記錄（僅轉錄）；裸 `/agentctl` 只指向它，`/agentctl last` 列印它 |
| 停止 | `/agentctl stop` —— 儲存交接、請求取消當前回合、列出正在跟蹤的操作；絕不說“全部已停止” |

## 方案

Claude 透過 mod 內建的 `bin/propose.mjs`（`/agentctl <目標>` 路徑）或 sd0x-dev-flow 的 `agentctl-setup.js propose`（設定與工作流技能）寫出 `~/.claude/agentctl/proposals/<URI 編碼的工作樹>.json`（在工作樹之外）；兩者都會先應用 mod 自身的校驗。mod 在會話啟動時與每個主回合結束時各讀取一次、再次校驗，並保留**生效**物件：工作樹取自會話，若方案指定了另一個工作樹、針對已不再繫結的任務起草，或與內建類別重疊，則會被拒絕（原因會記錄）。預覽會在轉錄與狀態帶中列出每個被接受的許可權及其 SHA-256 摘要（24 位十六進位制）。每條最多顯示 160 個字元；更長的以 `…` 結尾，而摘要 —— 以及 accept 所繫結的內容 —— 仍然覆蓋全部，因此若某條草稿你無法看到完整內容，請丟棄它。

| 命令 | 誰 | 作用 |
|---|---|---|
| `/agentctl proposal` | 任何人 | 列印等待中的預覽 |
| `/agentctl accept [digest 字首]` | **僅你的提示行** | 若自預覽以來已繫結的任務未變，則繫結保留的物件 —— 絕不重新讀取檔案 |
| `/agentctl discard` | 任何人 | 丟棄等待中的方案；已繫結的任務保留 |

之後修改檔案會產生新的預覽與摘要；較舊的摘要不再匹配。同一工作樹上的併發會話共享一個繫結與一個儲存，且跨會話非原子：請在顯示預覽的那個會話中 accept。

## 任務 JSON

```json
{
  "goal": "investigate the quiz service timeout",
  "allow": ["edit"],
  "editRoots": ["src", "tests"],
  "forbid": ["terraform apply"],
  "executors": [{ "argv": ["npm", "test"], "check": true }],
  "needsUser": [["npm", "publish"]],
  "tools": ["mcp__docs__search"],
  "acceptance": ["unit tests pass on the final tree"]
}
```

內建的禁止類別無論有無任務都生效，併疊加在任務自身之上：生產寫入（`kubectl apply|delete|patch|rollout|scale|edit|replace`、`helm install|upgrade|uninstall|rollback`、`gcloud … deploy|delete|update`）與遠端 git 寫入（`git push`、`gh pr merge`）。任務裡絕不該有秘密：策略欄位中形似憑據的值會被拒絕。

`needsUser` 只在曾見到有人在回答處發問：`default`（手動）、`acceptEdits` 與 `auto` 許可權模式下的互動終端（`lib/verdict.js`）。該模式在每個提示與工具結束時從經典鉤子輸入讀取；在見到之前，以及在其他任何介面或模式 —— `-p`、`dontAsk`、`plan`、`bypassPermissions`、桌面、VS Code、移動端 —— 下一個 `needsUser` 呼叫會被拒絕。回合中途切換的模式會在下次工具結束時被看到。

## 它不是什麼

- **不是隔離邊界。** 它以你的許可權執行。生產只讀是憑據與目標 IAM/RBAC 的事。
- **不是唯一防線。** 若宿主跳過其鉤子（mod 被停用、worker 崩潰），這裡沒有任何東西會拒絕。請把具名的危險命令留在你自己的 `permissions.deny` 中，例如：

  ```json
  { "permissions": { "deny": ["Bash(kubectl delete:*)", "Bash(kubectl rollout:*)", "Bash(helm upgrade:*)"] } }
  ```

  這些規則匹配命令文字而非程式（`git -C . push` 是不同的文字），這就是兩層都存在的原因。`Bash(git push:*)` 被故意省略：sd0x-dev-flow 的 `/push-ci` 會執行它。
- 另一個 mod 可以在 `tool.check` 處改變結論；本 mod 在 `/agentctl policy` 中披露這一點。
- 被授權的執行器（如 `npm test`）執行時不分類其影響。

## 開發

```bash
cd mods/agentctl            # 從倉庫根目錄
claude plugin validate .   # 鉤子與 $ 呼叫：無 $.model.*、$.http.*、$.tool.register、$.prompt.submit（允許 fill/suggest/read）
claude plugin test .       # tests/ 下每個 *.test.ts
```

## 釋出

該 mod 獨立版本化，以 `agentctl-v<version>` 標籤釋出（`.github/workflows/release-agentctl.yml`），與 sd0x-dev-flow 的釋出分開。Claude Code 按版本快取已安裝外掛，因此對除本 README 或 `tests/` 之外的任何改動都需要升版本：提高 `.claude-plugin/plugin.json` 中的 `"version"`，然後從倉庫根目錄執行 `node .github/scripts/agentctl-version.js update`（或 `/bump-version agentctl`）。在兩者完成前 CI 的版本鎖會失敗，CI 也會在此執行 `claude plugin validate` 與 `claude plugin test`。

## 即時驗證（2026-10-04，臨時倉庫：2.1.288 無頭 `claude -p --plugin-dir`，2.1.289 互動 tmux）

這些行記錄的是 0.1.0 版本。自 0.2.0 起，未分類的呼叫改為委派給宿主而非拒絕，且增加了方案命令；0.2.x 的行見下表。

| 檢查 | 結果 |
|---|---|
| 在 `-p` 下載入與 `/agentctl` | 僅為該會話載入；約 3.7 秒回覆，無模型回合 |
| 從 `-p` 提示執行 `task set` | 被拒絕：`-p` 提示未被標記為 `composer`。無頭執行無法設定任務；請在互動提示中設定 |
| 被禁止與未分類的 Bash 呼叫 | 執行前被拒絕，並指出規則（`task-forbid: …`、`unclassified: python3 has no adapter`） |
| 被允許讀取（`git status`） | 進入宿主自己的許可權路徑並執行 |
| 檢查非零退出（`sh check.sh` → exit 1） | 記為 `error`：非零 Bash 退出以 `isError` 到達 mod |
| 證據括起 | 記錄前後讀數，覆蓋率 `git-hybrid` |
| 兩個併發會話 | 兩個會話記錄都寫入；任務記錄保留 |
| 退出後遺留程序 | 無 |
| 樹讀數成本 | 500 個已變更/未跟蹤檔案約 90ms；乾淨的 974 檔案倉庫約 75ms |
| 模型回合後的 5h 視窗（V7） | `1% (resets …)` 自宿主讀取，含其來源與年齡 |
| 後臺檢查（V5，後臺半） | 由宿主的任務通知（`<task-id>`、`<status>`）以 `error` 收尾 —— 無需輪詢。`TaskGet` 是待辦列表工具；`GetTask` 讀取後臺任務 |
| 子 agent 工具呼叫（V4） | 子 agent 的 `danger-cmd` 被同一規則拒絕 |
| 在 `-p` 下的 `ask`（V3，僅 `-p`） | 用副本應答 `ask` 時，兩種已測無頭配置（有/無 Bash 允許規則）在 2.1.288 上都沒執行該命令 —— 副本的 `ask` 未被自動批准 |
| 在 `-p` 流輸入下的 `/agentctl stop`（V6） | 輸入在回合結束後才被處理，因此 `immediate` 在此不適用；回覆稱未觀察到執行中的回合 —— 絕不說“已停止” |
| MCP 工具呼叫（V4） | 副本 MCP 工具在任務未命名它之前作為未分類被拒絕，隨後執行 |
| tmux 中的互動終端（V10） | 狀態帶在 80 與 50 列下正確渲染 CJK 目標文字，分別換行為兩行與三行 |
| 互動中前臺工具執行期間的 `/agentctl stop`（V6） | 立即執行（`immediate`）；回合被取消；宿主把執行中的命令移到後臺，它繼續執行 —— 回覆將其列為執行中且絕不說“已停止”；完成後，宿主通知關閉其證據 |
| 手動模式互動終端下的 `ask`（V3） | 用副本應答 `ask` 時，宿主顯示自己的審批對話方塊並帶 mod 的原因（是/否，無“不再詢問”）；拒絕會中斷呼叫；用釋出程式碼重跑（手動：對話方塊；`dontAsk`：mod 拒絕），並用副本在 `acceptEdits` 與 `auto`（對話方塊）及 `dontAsk`（拒絕）下測試。宿主傳送的字串從普通經典 `UserPromptSubmit` 鉤子（2.1.289）讀取：`default`、`acceptEdits`、`auto`、`plan`、`dontAsk` 各自原樣到達；在無自動模式的模型上（Haiku）`--permission-mode auto` 回退為 `default` |
| 互動啟動（實測發現） | `session.start` 與首次狀態帶渲染同時到達；兩個併發上下文構建使狀態帶停留在孤立上下文（`gates missing`）。已修復：一個共享構建 |
| 安裝、停用、解除安裝（Signal 12） | 從本地市場安裝、執行、停用（`/agentctl` 消失）、解除安裝：無 mod 程序殘留，`permissions` 設定位元組級一致。宿主自身留下空的 `extraKnownMarketplaces` 鍵、一個外掛快取目錄和空的 `installed_plugins.json`；mod 只留下自己的儲存檔案。事後全部已恢復並驗證位元組級一致 |

移除：`--plugin-dir` 不安裝任何東西，也不改設定。mod 自身資料留在 `~/.claude/plugins/store/agentctl_*.json`（會話、任務、檢查點），起草的方案留在 `~/.claude/agentctl/proposals/`；刪除它們即可移除。

## 即時驗證，0.2.x（2026-10-05，臨時克隆與臨時裸遠端，2.1.289，Haiku）

| 檢查 | 結果 |
|---|---|
| 未繫結任務時直接 `git push`（`-p`） | 執行前以 `remote-git-write` 拒絕；遠端保持為空 |
| 未分類 `python3 -c …` 與會 push 的指令碼（`/bin/bash -p push.sh`，`-p`） | 均傳給宿主並執行；指令碼的 push 到達 git（被臨時遠端自身拒絕，而非 mod）—— 已披露的指令碼盲區 |
| 由 `agentctl-setup.js propose` 寫入的方案，互動啟動 | 預覽在會話啟動時以輔助程式的摘要記錄，狀態帶指名等待中的方案 |
| 在提示行輸入 `/agentctl accept <digest>` | 繫結預覽範圍為新任務；無 `base` 時輔助程式不列印摘要，mod 填入已繫結任務且其自身摘要被接受 |
| 一個已宣告檢查、一個未分類呼叫、一次根外編輯、一次直接 push（已繫結任務） | 檢查記為 `current` 證據；`python3` 被委派，`/agentctl events` 將其列為如此；編輯被拒 `edit outside the allowed roots`；push 被拒 `remote-git-write` |
| 從外部新增未跟蹤檔案 | 檢查在 32 秒內讀到 `stale (tree changed since)` |
| `/agentctl handoff`、重新開啟、`/agentctl`、`/agentctl last` | 交接說明何時讀取了樹，並在“未驗證”下列出該 stale 檢查；重新開啟時轉錄顯示它，裸 `/agentctl` 列印一行指標，`/agentctl last` 列印全部 |
| 0.2.1 中實測發現並修復 | 已接受的方案檔案被下一會話再次讀為陳舊草稿（現按工作樹記住）；內建拒絕說“該任務的範圍”，Claude 隨後提議擴大任務（現為“內建類別，任務無法解除”）；轉錄行讀為 `agentctl: agentctl:` |
| 兩次 `-p` 探測的成本 | 各 2–3 回合，Haiku 上各約 $0.06；mod 自身回覆、預覽與狀態帶不呼叫模型 |
| 獨立對抗測試（Codex，2026-10-05），0.2.2 修復 | 絕對或大寫程式路徑（`/usr/bin/git push`、`GIT push`）繞過內建類別；編輯根如 `../other` 授權工作樹之外的寫入；方案上限計字元而非 UTF-8 位元組；未繫結任務時委派呼叫未被 `/agentctl events` 記錄。摘要一致性、原型鍵、其他工作樹拒絕、證據分割槽與部分覆蓋率均成立 |

## 即時驗證，0.3.0（2026-10-07，臨時克隆與臨時遠端，互動 tmux，Haiku）

Signal 13，在 2.1.289（步驟 1–3）與再次從頭在 2.1.292 上演練：

| 步驟 | 結果 |
|---|---|
| `/agentctl 幫 …/README 加一行測試說明` | 請求以繁體中文填入空輸入框，附帶來自 `$.plugin.root` 的輔助程式路徑；未傳送也未繫結 |
| Enter | Claude 執行輔助程式的 `--help`、讀取專案、發現檔案不存在並**詢問**，而非編造範圍；得到回答後透過輔助程式寫入方案 |
| 預覽 | 在回合結束時連同摘要與“僅綁定範圍；不啟動工作”顯示；狀態帶指名等待中的方案 |
| Tab + Enter | 從建議接受；回覆指名下一步 |
| “開始工作” | 接受根內的編輯進入宿主自己的許可權提示；宣告的檢查記為當前證據 |
| `/agentctl`、`handoff`、重新開啟、`last` | 狀態以下一步開頭；交接列出該檢查為已驗證及其讀數時間；重新開啟指向它，`last` 列印它 |
| 繫結任務時的第二個目標 | 輔助程式在繫結任務下交付；預覽說“替換：任務 …”；Tab + Enter 替換 |

演練中發現並修復：在 2.1.292 上，宿主自己的下一提示猜測（“確認”）佔用了輸入框，因此 Tab + Enter 會把那個詞發給 Claude —— 現在在有方案等待時 mod 會用 accept 行替換宿主的猜測，並在每個回合結束時再提供一次；accept 回覆最後一行在中文會話中仍為英文；有任務繫結時，填入回覆說“未繫結任何內容”。記錄的猶豫：Claude 曾試圖讀取工作樹之外的 mod 自身檔案（在宿主提示處被拒絕）；複製語言隨每個新會話重置。

## 無指導執行，0.3.0（2026-10-07，Codex 作為首次使用者，互動 tmux，一次性克隆）

測試者只被給了 `/agentctl <你在做什麼>`，既未讀 `docs/` 也未讀本 mod 程式碼。描述 → Enter → 預覽（約 72 秒，僅 README 範圍，三個檢查）→ Tab + Enter → “開始工作”→ `/agentctl` → `/agentctl handoff` 六步完成，無外部幫助。從其中發現並在 0.3.1 修復：

| 發現 | 0.3.1 |
|---|---|
| 在 README 已變更旁，交接讀為“Edits observed: 0”（Claude 經 Bash 編輯） | 該行計編輯工具呼叫，並說明 Bash 變更在樹行 |
| Claude 把測試用管道傳給 `grep`；交接稱檢查 stale，而 Claude 稱其透過 | accept 回覆指名應逐字執行的檢查；`/agentctl` 再次按名稱索取 |
| 工作已完成，`/agentctl` 仍說“讓 Claude 開始工作” | 下一步跟隨宣告的檢查：工作並執行、重跑非當前者，或交接 |
| 一次根外 Write 被拒，隨後同一檔案用 Bash heredoc 寫入 | 拒絕告訴 Claude 不要用其他方式達到結果；本節與 § 它做什麼 說明根只繫結編輯工具 |
| Claude 在同一回合提問並寫方案 | 起草請求說明要先等回答再寫 |

保持原樣：該執行耗時數分鐘，是因為克隆自身的 `CLAUDE.md` 要求文件變更需兩輪評審，而非 mod 所致。

## 未驗證

桌面、VS Code 與移動端的 V3，以及 `plan` 與 `bypassPermissions` 下（接受繞過模式警告是操作者自己的決定，因此未演練）：`needsUser` 在這些地方保持被拒絕。狀態帶在 tmux 中檢查過，未經 SSH。

## 出處與許可證

- 原作者：[sd0xdev](https://github.com/sd0xdev/sd0x-harness)
- 原倉庫：https://github.com/sd0xdev/sd0x-harness（路徑 mods/agentctl）
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
