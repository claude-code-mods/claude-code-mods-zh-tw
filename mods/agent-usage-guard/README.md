# agent-usage-guard

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

防止 Claude Code 在十分鐘內耗盡你的五小時用量視窗。

它在花費發生前行動：在 agent 啟動、提示傳送或工具呼叫執行之前攔下失控花費。讀取套餐的即時用量，攔住子 agent 擴散、重上下文翻攪與重試迴圈。當你在鍵盤前，它用 Claude Code 自己的對話方塊詢問；無人能回答時，它拒絕並說明原因。

- 感知套餐：讀取 5 小時與每週百分比，為你看住視窗末尾
- 一次回答管一陣：批准在其條件解除或超時前一直生效
- 本地且隱私最小：無網路、無程序，只存計數與粗粒度分桶
- 失敗時放行：鉤子失敗時事件照常進行

## 安裝

```text
/plugin marketplace add rbartoli/agent-usage-guard
/plugin install agent-usage-guard@agent-usage-guard
/reload-plugins
```

然後執行 `/agent-guard` 檢視狀態。

## 出處與許可證

- 原作者：[rbartoli](https://github.com/rbartoli/agent-usage-guard)
- 原倉庫：https://github.com/rbartoli/agent-usage-guard
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
