# Agent Standup 狀態帶

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。


![Agent Standup](.claude-plugin/icon.png)

當本機另一個 Claude Code 會話需要你時，在你的 Claude Code 提示行上方顯示一行提示：

    ✋ web-shop (VS Code) 需要確認
    Agent Standup · /agent-standup:open 檢視全部   隱藏

當某個會話開始等待你、或完成它的一輪時，還會彈出一個簡短的提示條。你仍留在當前會話中工作，同時知道其他會話是否卡在問題或確認上。

它是一個 mod：由 Claude Code 函式鉤子構成的外掛。它會在終端中繪製，也會在 Claude 桌面應用的 Code 標籤頁中繪製。在 VS Code 中，[Agent Standup 擴充套件](https://marketplace.visualstudio.com/items?itemName=DoubleGeste.agent-standup)會在其狀態列中顯示同樣的內容。

## 安裝

在 Claude Code 2.1.294 或更高版本中：

    /plugin install agent-standup-band --marketplace Atoll92/agent-standup

在更早的版本中，它會載入但什麼也不做：那些版本不執行 mod（且早於終端 2.1.221、其他環境 2.1.269 的版本也不會寫入它讀取的狀態檔案）。

若想把每個會話都看成一通即時團隊電話，可再安裝主外掛：`/plugin install agent-standup --marketplace Atoll92/agent-standup`，然後執行 `/agent-standup:open`。

## 它讀取和執行什麼

- 每 4 秒讀取一次 Claude Code 為每個開啟的會話保留的狀態檔案，位於 `~/.claude/sessions/<pid>.json`（或 `CLAUDE_CONFIG_DIR` 下）：包括是哪個會話、所在資料夾，以及它處於忙碌、空閒還是等待你。不讀取對話內容。由程式透過 `claude -p` 啟動的會話會被排除：它的問題會交給那個程式。Agent SDK 應用（如 Zed、自建應用）會保留，因為它們可能把選單展示給人。
- 執行 `ps`，用來確認標記為“等待中”的會話仍在執行：崩潰的會話會留下檔案。

它不寫入任何內容，也不向任何地方傳送資料。

## 更多

原始碼與問題反饋：https://github.com/Atoll92/agent-standup。非官方作品，與 Anthropic 無隸屬關係，也未獲其背書。MIT 許可證。

## 出處與許可證

- 原作者：[Atoll92](https://github.com/Atoll92/agent-standup)
- 原倉庫：https://github.com/Atoll92/agent-standup
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
