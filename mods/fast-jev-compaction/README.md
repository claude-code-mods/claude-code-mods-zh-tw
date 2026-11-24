# fast-jev-compaction

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

一個 Claude Code 外掛，用 Jev 的判定取代壓縮摘要：每次工具呼叫與結果都在一次快速請求中打分，陳舊的被丟棄或截斷，保留下來的逐字不變。也可作為 npm 庫使用。

多數上下文壓縮會讓 LLM 總結舊回合，而摘要是有損的：檔案路徑、精確報錯、約束或命令可能消失。本庫從不重寫任何內容，只刪除 Jev 判定不再需要的工具呼叫與結果。

工作原理：每個 tool_use 與 tool_result 按 tool_use_id 配對；發給 Jev 的狀態是完整對話，工具結果替換為簡短說明；狀態分階段擬合進 maxStateTokens；對每個未固定呼叫問 Jev 兩個問題（呼叫是否保留、結果是否逐字保留）；按閾值決定保留/截斷/移除；最後重建訊息列表。

## 安裝

```sh
npm install fast-jev-compaction
export TYPESAFE_API_KEY=...
```

## 出處與許可證

- 原作者：[tamaratran](https://github.com/tamaratran/fast-jev-compaction)
- 原倉庫：https://github.com/tamaratran/fast-jev-compaction
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
