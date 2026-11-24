# Lot Map for Claude Code

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

一個 Claude Code mod：在聊天旁的面板中即時展示工作地圖。每次工具呼叫、模型步驟、鉤子和技能都從中心向其站點發送脈衝，因此你看到的是記憶、檔案、shell、網路和 agent 在工作。

它在本機執行，不向任何地方傳送資料。參見 [隱私說明](PRIVACY.md)。

## 安裝

```
/plugin install lot-map --marketplace alexeyw/lot-map
```

若提示找不到外掛，先新增市場 `claude plugin marketplace add alexeyw/lot-map`。面板在會話啟動時自動開啟；終端中需要至少 144 列，否則輸入 `/lot-map`。

## 出處與許可證

- 原作者：[alexeyw](https://github.com/alexeyw/lot-map)
- 原倉庫：https://github.com/alexeyw/lot-map
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
