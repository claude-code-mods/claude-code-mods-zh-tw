# prismantis

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

一個 Claude Code mod，用彩色重繪 Claude 的回覆：表格、標題、列表、引用、高亮程式碼、數字、路徑與連結、mermaid 圖表，以及工具行，共 17 種主題，並帶複製按鈕。執行 `/prismantis setup` 選擇外觀，或 `/prismantis demo` 檢視它繪製的一切。

截圖、全部選項與更新日誌見[完整 README](https://github.com/NahumLitvin/prismantis#readme)。

## 它執行、讀取和改動了什麼

prismantis 不發任何網路請求。以下一切都在你的機器上完成。

- **程式。** 點選 `⧉ html` 或 `▣ png` 會把複製的表格、圖示或圖形透過標準輸入交給剪貼簿輔助程式：macOS 上是 `osascript`，Windows 上是 `powershell.exe`（它讀取 `SystemRoot` 找到它），Linux 上是 `copyq`。開啟 `latex` 時，它從你的 `PATH` 執行 `ratex-render`，把回覆中的公式透過標準輸入傳入。它不再執行其他任何東西。
- **檔案。** 它讀取回復中作為 Markdown 圖片連結的本地 PNG（最大 2 MB），以在 kitty 或 Ghostty 中繪製它。它讀回 `ratex-render` 寫入 `$TMPDIR/prismantis-latex-<session>-<id>` 的 PNG。它自身不寫任何檔案。
- **設定。** `/prismantis setup` 與 `/prismantis theme` 透過 `/config` 儲存你的選擇，只寫入 prismantis 自己的選項（`prismantis.theme`、`prismantis.tableStyle` 及其他設定步驟）。你的設定中沒有任何其他內容會改變。
- **桌面應用顏色。** 僅在 `desktopColors` 為 `match` 時：會話啟動時以及 `/prismantis theme` 時，它用 `$.theme.set` 按當前調色盤為會話設定桌面應用的顏色。把 `desktopColors` 改回 `off` 會呼叫一次 `$.theme.clear()`。它在會話啟動或過載時絕不清除。
- **鉤子。** 它透過 `ui.render` 繪製，透過 `command.run` 應答 `/prismantis` 命令，在 `config.set` 中觀察自己的 `desktopColors` 行，在 `prompt.submit` 中新增僅模型可見的[圖示提示](https://github.com/NahumLitvin/prismantis#diagram-hints)說明，並在開啟 `keyPointHint` 時新增要點說明，還在 `engine.create` 中為[其他 mod](https://github.com/NahumLitvin/prismantis#other-mods) 新增 `$.prismantis.markdown`。`prismantis.markdown` 是該呼叫自己的事件。

## 出處與許可證

- 原作者：[Nahum Litvin](https://github.com/NahumLitvin/prismantis)
- 原倉庫：https://github.com/NahumLitvin/prismantis
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
