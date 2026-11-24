# tokendoctor

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

同一個 Claude Code，最多省 38%。

回放你自己的歷史會話，展示每項改動本來能省多少，然後只應用你選中的改動。

**你的過去會話說了算，不是別人的基準。** 某項設定能省多少取決於你的工作方式：會話多長、用哪些模型、做什麼工作。

- ① 回看最近 30 天：`/tokendoctor:sessions` 以 200K/300K/400K/600K 壓縮視窗逐請求回放每個會話，顯示各自的花費。只讀，不呼叫模型，不改動任何內容。
- ② 只改你的會話顯示划算的：`/tokendoctor:optimize` 根據這些數字提出改動，只應用你選中的，且先以 diff 展示。`/tokendoctor undo` 可撤銷。
- ③ 可選：用滑動代替摘要。當 Claude Code 要停下總結對話時，改為丟棄舊工具輸出而保留每條訊息，無模型呼叫，只需幾毫秒。

## 安裝

```bash
claude plugin marketplace add localixai/tokendoctor
claude plugin install tokendoctor@tokendoctor
```

重啟 Claude Code 並執行 `/tokendoctor:sessions`。

## 出處與許可證

- 原作者：[localixai](https://github.com/localixai/tokendoctor)
- 原倉庫：https://github.com/localixai/tokendoctor
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
