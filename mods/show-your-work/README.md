# claude-show-your-work

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

不離開終端即可檢視、審閱並迭代 agent 的工作。為 Claude Code 提供圖片、影片與視覺化 QA。

## 安裝

```
/plugin marketplace add https://github.com/iamumeransari/claude-show-your-work.git#releases
/plugin install show-your-work@iamumeransari
```

支援 macOS 與 Linux 上的 Ghostty 和 kitty，需要 Claude Code 2.1.286+。影片/音訊還需 ffmpeg，HTML 需 Chrome/Chromium/Playwright 瀏覽器，PDF 需 poppler。

## 用法

Claude 構建或修改可視內容時會在聊天中展示。也可直接要求：“給首頁 hero 出四個方向並排展示”“構建登錄檔單、測試它並給我看錄屏”。

- 前後對比錄屏：舊版與新版錄製相同步驟，同步並排播放
- 變更標記：每處改動帶時間戳，點選跳到對應時刻
- 即時檢查：每項測試在影片到達時變綠或變紅
- 圖片與影片：並排比較多個方案，播放器支援時間軸、版本切換與儲存

## 出處與許可證

- 原作者：[iamumeransari](https://github.com/iamumeransari/claude-show-your-work)
- 原倉庫：https://github.com/iamumeransari/claude-show-your-work
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
