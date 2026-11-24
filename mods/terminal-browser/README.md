# terminal-browser Claude Code 外掛（繁體中文版）

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。


> 本外掛為實驗性功能，存在一些[已知限制](#注意事項)。

https://github.com/user-attachments/assets/a79e7667-6fcb-49a4-9967-44d0f942102c

## 安裝

安裝 terminal-browser：
```
curl -fsSL https://terminal-browser.sh/install | bash # 或 brew install terminal-browser
```

確保 Claude Code 是最新版本：
```
claude update
```

在 `~/.claude/settings.json` 中加入以下配置以啟用 Claude Code 的介面外掛：
```json
{
  "env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" }
}
```

安裝 terminal-browser 外掛：
```
# 設定 marketplace
claude plugin marketplace add zenbu-labs/terminal-browser

# 安裝外掛
claude plugin install terminal-browser@terminal-browser
```

現在可以在 Claude Code 中輸入 "/browser" 開啟瀏覽器。

### 更新

更新 Claude Code 外掛：
```
claude plugin update terminal-browser@terminal-browser
```

更新 terminal-browser：
```
terminal-browser upgrade
```

### 配置

你可以配置該外掛，讓 Claude 使用一個工具來開啟瀏覽器。此功能預設關閉，因為 Claude 已可透過 `terminal-browser` CLI 在終端分屏中開啟瀏覽器。在 `~/.claude/settings.json` 中加入以下內容即可啟用：

```json
{
  "pluginConfigs": {
    "terminal-browser@terminal-browser": {
      "options": {
        "agentTool": true
      }
    }
  }
}
```

## terminal-browser 外掛 API

該外掛附帶一個 API，可在另一個 Claude Code 外掛中以程式設計方式開啟瀏覽器並載入 URL。可用它構建的實用外掛示例：
- `/tldraw` 斜槓命令：在 Claude Code 分屏中開啟 tldraw
- `/open-pr` 斜槓命令：開啟當前分支關聯的 PR

```typescript
export type BrowserOpenInput = { url?: string }

export type BrowserOpenResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

export type Browser = {
  open: (input: BrowserOpenInput) => Promise<BrowserOpenResult>
  close: (input?: Record<string, never>) => Promise<boolean>
}

// 用法：在你的外掛 hooks 模組中
on('command.run', { command: 'tldraw' }, async ($) => {
  const result = await $.browser.open({ url: 'https://www.tldraw.com/' })
  return { text: result.ok ? '已開啟 tldraw' : result.error }
})
```

## 工作原理

terminal-browser 使用 [kitty 圖形協議] 在終端內顯示由真實瀏覽器生成的畫素。為了在 Claude Code 內顯示瀏覽器，我們使用了 Claude Code 新的[函式鉤子 API](https://github.com/anthropics/claude-code/issues/91870)。

terminal-browser 的內部實現已提取為 JavaScript 庫 —— https://github.com/zenbu-labs/terminal-browser/tree/main/pixel —— 如果你想在 Claude Code 或終端內構建圖形應用，可以參考。

## 支援的終端

該外掛只能在支援 [kitty 圖形協議] 並實現 [kitty unicode placeholders](https://sw.kovidgoyal.net/kitty/graphics-protocol/#unicode-placeholders) 的終端中執行。常見的支援終端：
- [ghostty](https://ghostty.org)
- [kitty](https://sw.kovidgoyal.net/kitty/)

如果你的終端不支援所需功能，在 Claude Code 中開啟瀏覽器可能導致 TUI 亂碼。

任何基於 libghostty 構建的終端也都支援，例如：
- [cmux](https://cmux.com/)
- [supacode](https://supacode.sh/)

更多基於 libghostty 的終端：[awesome-libghostty](https://github.com/Uzaaft/awesome-libghostty)

即使終端支援圖形功能，如果運行了多路複用器，外掛也可能不工作，因為多路複用器會重寫終端輸出、破壞終端圖形命令。tmux 支援即將到來（terminal-browser 目前可在 tmux 中工作，但還不能透過 Claude Code 外掛使用）；在 herdr 中透過外掛執行效能很差，但可能很快改善。其他多路複用器尚未測試，如不可用請提 issue。

## 注意事項

- 依賴終端支援 [kitty 圖形協議]
- 滑鼠位置有時會略有偏差，因為 Claude Code 沒有啟用畫素座標滑鼠上報
- 外掛需要向本地 HTTP 伺服器發起 fetch 請求以與 CLI 通訊，作業系統可能提示終端想訪問本地網路
- Claude Code 為聊天區設定了很大的最小寬度，有時無法把瀏覽器調整到想要的大小
- 外掛依賴實驗性的函式鉤子 API，該 API 不穩定，外掛可能在不同版本間失效

[kitty 圖形協議]: https://sw.kovidgoyal.net/kitty/graphics-protocol/

## 出處與許可證

- 原作者：[zenbu-labs](https://github.com/zenbu-labs/terminal-browser)
- 原倉庫：https://github.com/zenbu-labs/terminal-browser
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
