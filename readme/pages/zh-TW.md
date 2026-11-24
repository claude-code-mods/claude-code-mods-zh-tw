# 精選 Claude Code 模組

{{languages}}

**逐一挑選、驗證、固定版本。新增一次，{{count}} 個模組隨裝即用。**

> **全部 {{count}} 個模組已完整繁體中文化。** 介面文字、指令、面板、提示與說明文件皆為繁體中文；外掛原始碼已內建於本儲存庫，安裝後即顯示繁體中文，無需額外設定。僅程式碼識別字、hook 事件名稱、技能（skills）與模型呼叫說明保留英文，以確保功能不變。

Mod 是以函式鉤子寫成的 Claude Code 外掛：可以觀察、修改或接管 Claude Code 的行為，也能繪製自己的介面。這個市集收錄了社群裡最好的 mod。每一個都以 `claude plugin validate` 驗證過，並固定在驗證時的 commit，作者之後的修改不會未經審核就到你這裡。

需要 Claude Code 2.1.287 或更新版本。

## 安裝

在 Claude Code 終端機工作階段中輸入：

```
/plugin marketplace add claude-code-mods/claude-code-mods-zh-tw
/plugin install <模組名>@claude-code-mods-zh-tw
```

例如 `/plugin install terminal-browser@claude-code-mods-zh-tw`。執行 `/plugin marketplace update claude-code-mods-zh-tw` 取得新模組與更新。

## 目錄

每張卡片的**權限**是驗證工具回報的、該模組除了繪製介面以外還能做的事。安裝前請先看看它的原始碼：驗證只是靜態讀取程式碼，並不執行它，也不等於安全稽核。

{{catalog}}

## 推薦模組

開一個 issue，附上模組儲存庫的連結。也可以自己新增：在 `community.json` 加一筆（儲存庫、目錄、審核過的 commit、分類、授權），在 `readme/summaries.json` 寫上各語言的一句話簡介，執行 `python3 scripts/build-catalog.py`，再送出 pull request。

## 致謝與本地化

每個模組歸其原作者所有，沿用各自的授權。本儲存庫在收錄之外還做了**繁體中文本地化**：把外掛內建到 `mods/` 目錄，翻譯介面文字、指令說明、面板與提示，並翻譯各模組的說明文件（原版文件保留為 `README.en.md`）。原作者與授權在每份文件末尾註明。若你希望移除本地化副本或調整署名方式，請開 issue。

非官方專案，與 Anthropic 無關。
