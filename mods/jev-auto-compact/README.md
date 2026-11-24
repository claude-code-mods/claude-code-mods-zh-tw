# jev-auto-compact

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。

基於 Jev 的逐字壓縮：當上下文達到 60% 時，在不生成任何內容的情況下裁剪陳舊的工具呼叫。如果無可裁剪內容則直接跳過（絕不回退到 LLM 摘要）；同時為 learning.db 記錄證據。

## 安裝

```
/plugin install jev-auto-compact@claude-code-mods-zh
```

## 出處與許可證

- 原作者：[notque](https://github.com/notque/vexjoy-agent)
- 原倉庫：https://github.com/notque/vexjoy-agent
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
