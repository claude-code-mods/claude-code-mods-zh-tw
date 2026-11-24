# ctx-handoff

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

長會話工具包：讓 Claude 記住你教它的內容、捕捉它常見的疏漏，並在你回來時從長會話的中斷處繼續。

- 長會話接近滿時：自動寫入區分已驗證工作與未驗證改動的摘要，清空並開啟新會話繼續
- 你離開一小時後：保持快取溫熱約 4 小時，下次訊息不必全價重讀
- 重複指令：變成專案筆記，重複 3 次後寫入倉庫
- `/clear` 或重開 Claude Code：新會話知道上次停在哪裡
- Claude 重複失敗命令或未測試就說“完成”：立即收到一行提醒

## 安裝

需要 Claude Code 2.1.287+。

```sh
claude plugin marketplace add cablate/ctx-handoff-mod
claude plugin install ctx-handoff@ctx-handoff-mod
```

新會話中輸入 `/handoff` 檢視狀態。基於 Claude 訂閱與長會話（如 1M 上下文模型）；API key、Bedrock 或 Vertex 上快取只有 5 分鐘，請執行 `/handoff refresh off`。

## 出處與許可證

- 原作者：[cablate](https://github.com/cablate/ctx-handoff-mod)
- 原倉庫：https://github.com/cablate/ctx-handoff-mod
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
