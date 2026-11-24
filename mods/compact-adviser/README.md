# compact-adviser

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

在完成的檢查點建議（或在選擇加入後自動執行）`/compact`，由 TypeSafe Jev 判定。其 hooks 模組僅在 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` 恰為 1 時啟用。

## 安裝

```sh
claude plugin marketplace add kunchenguid/compact-adviser
claude plugin install compact-adviser@compact-adviser
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude
```

然後執行 `/compact-adviser`。

## 出處與許可證

- 原作者：[kunchenguid](https://github.com/kunchenguid/compact-adviser)
- 原倉庫：https://github.com/kunchenguid/compact-adviser
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
