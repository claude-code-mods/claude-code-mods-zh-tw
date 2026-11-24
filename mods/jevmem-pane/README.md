# jevmem pane

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

一個 Claude Code 側邊面板，位於你的對話旁，顯示 [jevmem](https://github.com/Avinash-jetwani/jevmem) 為你剛傳送的提示與剛結束的回合做了什麼：

1. **本提示召回的內容**：每一條提供給 Claude 的記憶行（其 id、種類與文字），以及有多少條被保留未用。
2. **守衛**：守衛詢問過或拒絕的最後一次呼叫，附帶規則與分數，並對應到該呼叫。
3. **上一回合儲存的內容**：jvmem 從該回合儲存的行及其種類，或該回合被跳過的原因。

每行都有 `why`（為什麼）、`wrong`（不對）與 `forget`（忘記）按鈕。`forget` 與 `wrong` 會改動 `JEVMEM.md`（該行以 `[retired]` 保留），因此它們會先詢問；規則只能在終端中退役，因為 `jevmem trust` 就是那樣工作的。面板讀取 `.jevmem/` 下的三個本地檔案，並以引數向量執行 `jevmem` 命令；它不向任何地方傳送資料，也不讀取任何金鑰。

## 安裝

在已新增 jevmem 市場（`claude plugin marketplace add Avinash-jetwani/jevmem`）的 Claude Code 中：

```
/plugin install jevmem-pane@jevmem
```

它需要 jevmem 命令（`npm install -g jevmem`）以及一個已啟用的專案（`jevmem setup`）。在寬度 144 列或更寬的終端中，面板會自行開啟；`/jevmem` 在任意寬度下開啟或關閉它（在全屏終端中從 110 列起停靠在對話旁，更窄時則在提示行上方）。僅支援 Claude Code：Cursor 沒有面板。

完整說明（含各狀態含義）見 [docs/pane.md](https://avinash-jetwani.github.io/jevmem/pane/)。

## 出處與許可證

- 原作者：[Avinash-jetwani](https://github.com/Avinash-jetwani/jevmem)
- 原倉庫：https://github.com/Avinash-jetwani/jevmem
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
