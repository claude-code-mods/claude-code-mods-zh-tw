# Operator Memory for Claude Code

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。


Operator Memory 為 Claude Code 提供由 agent 維護的、以可讀 Markdown 儲存的持久專案與使用者上下文。

## 安裝

需要 Claude Code `v2.1.287` 或更高版本，並且 `PATH` 中已有 Operator Helper。

```sh
operator-helper install claude-code
```

安裝後請啟動一個新的 Claude Code 程序。執行 `claude plugin list` 確認 `operator@operator-memory` 已啟用，然後詢問 agent 是否可以使用 Operator Memory 指引。

外掛會把前言注入主系統提示詞和子 agent 的任務提示詞中。它每個程序只渲染一次記憶；重新載入記憶需要重啟 Claude Code。`/clear` 不會重新整理已快取的這段前言。

## 命令

- `/operator:user-init` — 配置使用者分割槽（User Partition）。
- `/operator:project-init` — 配置專案大腦（Project Brain）。
- `/operator:index` — 構建或重新整理專案索引（Project Index）。

## 更新

安裝期間，Helper 會為 Operator marketplace 啟用自動更新（重複安裝同樣如此）。之後如需關閉，可在 `/plugin` → Marketplaces 中設定。

重新執行 `operator-helper install claude-code`，或使用 `claude plugin update operator@operator-memory`，然後重啟 Claude Code。

驗證、更新與故障排查參見 [Claude Code 指南](https://github.com/aerovato/operator-memory/blob/main/docs/harnesses/claude-code.md)。本地開發時，在 workspace 根目錄執行 `bun run preview:claude-code`。

## 出處與許可證

- 原作者：[aerovato](https://github.com/aerovato/operator-memory)
- 原倉庫：https://github.com/aerovato/operator-memory
- 許可證：BSD-3-Clause
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
