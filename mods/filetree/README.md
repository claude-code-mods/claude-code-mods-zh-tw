# Claude Code Filetree

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

一個 Claude Code 的 IDE 風格檔案樹，顯示 Claude 正在做什麼、在哪一個檔案裡。

主要特性：顯示/導航目錄內所有檔案（支援 Git 狀態、nvim 鍵位）；動畫顯示 Claude 正在讀取/工作的位置；用 z 導航目錄、s/i 搜尋、q 搜尋檔案內容、d 做 diff；檔案預覽、目錄大小矩形圖。

## 安裝

```bash
claude plugin marketplace add data-goblin/claude-code-filetree
claude plugin install filetree@claude-code-filetree
```

在低於 2.1.287 的 Claude Code 上會報 `Unrecognized key: "options"`：先 `claude update` 再安裝。

## 出處與許可證

- 原作者：[data-goblin](https://github.com/data-goblin/claude-code-filetree)
- 原倉庫：https://github.com/data-goblin/claude-code-filetree
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
