# Context Attachment Manager

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

一個面向圖片密集型對話的本地外掛，支援 Codex、Claude Code 及其他 agent。較早的圖片不再隨每條訊息重發；模型按 ID 取回所需圖片，即使對話壓縮後也如此。

它給每張圖編號（IMG-001、IMG-002……），把較早的圖片換成簡短佔位符：模型按需按 ID 取回原圖；每張圖有一行說明與你的批註；佔位符只寫一次，讓提示詞快取繼續有效；原圖與歷史都不刪除。預設開啟。

## 安裝

把下面這句發給你的 agent，它會識別平臺並安裝：

```text
Install Context Attachment Manager for me, following https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

然後重啟 agent。在 Codex 中開啟任務側欄的 Context Assets；在 Claude Desktop 的 Code 標籤頁中有圖片時面板會自動開啟，輸入 `/cam` 可重新喚回。

## 出處與許可證

- 原作者：[chipfighter](https://github.com/chipfighter/context-attachment-manager)
- 原倉庫：https://github.com/chipfighter/context-attachment-manager
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
