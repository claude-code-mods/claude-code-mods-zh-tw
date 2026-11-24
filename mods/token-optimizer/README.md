# Token Optimizer 桌面版

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

Claude 桌面應用的狀態列。它繪製在提示行上方，顯示會話質量、上下文填充量、快取倒計時，以及你的 5 小時與每週限制，並由 Clawd 演示會話正在做什麼。

## 安裝

它隨 Token Optimizer 外掛一起釋出（`hooks/hooks.json` 在 `modules` 下列出本目錄的 `hooks/register.tsx`），因此沒有額外要安裝的東西。本目錄保留自己的清單，僅為了讓它的測試能用 `claude plugin test` 獨立執行。`npm run typecheck` 與 `npm test` 覆蓋純模組（CI）；`npm run typecheck:engine` 針對 Claude Code 的外掛 API 宣告檢查 `hooks/` 與 `tests/engine/`，這些宣告只有 claude CLI 會寫入，因此只能在本地執行。

需要 Claude Code 2.1.287 或更高版本以及 Anthropic 的 mod 功能。Anthropic 可以遠端關閉 mod；關閉時不會出錯，只是狀態列不出現。終端保留其現有的狀態行。不支援 VS Code。

要確認它是否生效，開啟一個啟用了 Token Optimizer 外掛的 Claude 桌面會話。在提示行上方尋找帶 Clawd 與快取倒計時的 Token Optimizer 狀態帶。若不存在，檢查外掛已啟用、mod 可用、且 `TOKEN_OPTIMIZER_STATUS_BAR` 不為 `0`，然後重啟會話。外掛的 `hooks/hooks.json` 註冊的是 `desktop/token-optimizer-desktop/hooks/register.tsx`。

要在不使用你的會話的情況下檢查記賬，執行 `python3 <plugin>/skills/token-optimizer/scripts/measure.py mod-action --selftest`。它會列印 `PASS` 或 `FAIL`，並使用一個臨時資料目錄。失敗的動作診斷會記入 Token Optimizer 資料目錄的 `mod-actions.log`。

## 你會得到什麼

- 一句關於最緊迫事項的話，最多帶一個按鈕。
- 五個帶懸浮卡片的標記：質量等級、上下文填充、快取倒計時、5 小時限制、每週限制。
- **Clawd 旁的箭頭**展開另一行：分支、會話時長、工具呼叫數、壓縮（若有）、上次儲存檢查點的時間（任何種類，或來自更早會話的相關檢查點），以及過去 30 天 Token Optimizer 為你節省的 token 數，與儀表盤顯示的總數一致。
- 按鈕：**清理**（按 Token Optimizer 的指引壓縮）、**重新開始**（第二次點選儲存檢查點、清空，並把它交給你的首條訊息）、**保持溫熱**（手動一鍵重新整理快取，僅在快取仍溫熱時可用，絕不自動，會使用少量用量）。
- **完整儀表盤**：在展開行的末尾，一個純文字連結，兩種尺寸的狀態帶都顯示（摺疊的狀態帶不顯示它）。點選它會執行 `measure.py dashboard`，與 `token-dashboard` 技能的命令相同：它重新生成儀表盤頁面並用預設瀏覽器開啟（macOS 上 `open`，Linux 上 `xdg-open`，Windows 上檔案關聯）。執行時狀態帶顯示“正在開啟儀表盤。”；失敗時狀態帶會顯示數秒“無法開啟儀表盤。”，其他什麼也不會發生。執行中再次點選會被忽略。該連結是以 `plain` 樣式繪製的按鈕。

快取倒計時是估算：Claude 套餐為 1 小時，API 為 5 分鐘，儘可能從會話本身測量。

## 設定

在 `~/.claude/settings.json` 的 `env` 塊中，`TOKEN_OPTIMIZER_STATUS_BAR=0` 隱藏狀態列，`TOKEN_OPTIMIZER_STATUS_BAR_ANIMATE=0` 讓 Clawd 靜止不動。`TOKEN_OPTIMIZER_STATUS_BAR_TIME_FORMAT=24h`（或 `12h`）強制用於限制續期時間的時鐘格式；未設定時跟隨你的區域設定。

箭頭旁的 `–` 按鈕把狀態帶縮小到一行，`+` 恢復；箭頭仍可展開其下的詳情行，且選擇會被記住，跨會話與重啟保留。`TOKEN_OPTIMIZER_STATUS_BAR_SIZE=slim` 在未存下選擇前設定初始尺寸；終端狀態行也用同一變數列印單行。

上下文標記在你設定了壓縮視窗時按自己的視窗度量：`CLAUDE_CODE_AUTO_COMPACT_WINDOW`、`/autocompact` 或 `autoCompactWindow` 設定，範圍為 Claude Code 的 100K–1M，且不超過模型的視窗。僅用 `--autocompact` 為單次啟動給出的視窗它看不到。

## 完整文件

參見 [Token Optimizer README](../../README.md#desktop-status-bar) 與文件站的“Claude desktop app”頁面。

## 出處與許可證

- 原作者：[alexgreensh](https://github.com/alexgreensh/token-optimizer)
- 原倉庫：https://github.com/alexgreensh/token-optimizer
- 許可證：NOASSERTION（詳見原倉庫）
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
