# 社群問答與混搭指南的維護

## 問答正文

直接編輯 `docs/community-qa.md` 和 `docs/tavern-cards-community-qa.md`。它們是正文來源；不要手改生成的 `community-qa-content.html` 或 `resources/` 下的 MD 副本。

```sh
python -m pip install -r requirements-dev.txt
python scripts/build-guide-qa.py
python scripts/build-guide-qa.py --check
node --test tests/newbie-guide-navigation.test.mjs
```

生成器保留正文、題號、作者待審說明、表格和示例，把相對倉庫連結轉成網頁可用的 GitHub 連結。下載版 MD 同樣轉換連結，離開倉庫後仍可查閱來源；原始 MD 不修改。問答數量變更時，應同步生成器中的數量、教程入口及側欄文案。Pages 工作流釋出前也會生成一次，確保網頁跟隨 MD。

## 混搭指南

兩份收錄版分別位於 `guides/tw-moyue.html` 和 `guides/tw-tavern-cards.html`。共同閱讀樣式和流程圖載入器為 `guides/mix-guide.css`、`guides/mix-guide.js`。它們仍是獨立完整頁面，可以直接開啟。

2026-09-24 從使用者提供的兩份 HTML 收錄；保留作者的整體結構、步驟表、提示詞和流程圖。收錄時依據當前倉庫校正了 TW 的 22 個 Skill、審計工具的 Library 依賴、forge 預設的 `tavern-cards-state.json` 檔名，並補清 Soul 的宿主發現條件、完整規劃示例的適用範圍。墨月原包未在此次收錄中複核，原稿中的授權判斷改為歷史記錄與待作者確認。

Mermaid 流程相簿來自指南原有的 CDN，並保留備用域；網路不可用時顯示步驟表閱讀提示與流程圖文字。正文無需該庫。庫的載入和初始化方式可查 [Mermaid 使用文件](https://mermaid.js.org/config/usage.html)。Markdown 轉換使用 [Python-Markdown](https://python-markdown.github.io/) 的表格、圍欄程式碼和列表擴充套件。

## 本地檢視

在倉庫根執行 `python -m http.server 8765 --bind 127.0.0.1 --directory docs/newbie-guide`，再開啟 `http://127.0.0.1:8765/#community-help`。主教程需要 HTTP 載入正文分片，雙擊 `index.html` 不適合作為完整預覽。

修改後檢查新舊目錄、單題與全部展開、MD 下載、示例複製、兩份指南的流程圖、斷網提示、桌面與手機寬度。教程正文與互動的檢查不代表套件混搭已經在真實 Agent 或 SillyTavern 中透過驗收。

## 當前版本與快取

本地教程對應 TavernWeaveX無限月讀 2.3.0 正式版，快取為 v59。同步 `index.html` 中的版本元資訊與資源查詢引數、`app.js` 的正文分片引數、當前頁尾和 `tests/newbie-guide-navigation.test.mjs` 的快取斷言。當前版本條目為 `release-v2-3-0`；`release-v2-2-0`、`release-v2-1-0`、`release-v2-0-0`、`release-v1-9-1`、`release-v1-9-0`、rc.2、rc.1 及更早正式版條目保留；舊名稱、徽標和深連結屬於歷史記錄，保持原樣。README、安裝說明和 Q&A 的正式下載入口指向 v2.3.0 正式釋出頁。統一外掛使用說明見 `docs/plugin-guide.md`。

當前 Q&A 版本說明以 `docs/community-qa.md` 為源，生成網頁與下載副本；不要直接改生成物。本地教程改動不代表網頁已部署，也不代表客戶端已更新。

## v1.7.0 可選沙盒章節及 v1.8.0 畫板

畫板同步按總設計案範圍塊與 NEXT 狀態塊生成，先核對版本繫結的差異。第四章 `content-8.html` 的 `frontend-sandbox` 位於章節導語後、`runtime-evidence` 前；保留原 37–45 編號。功能地圖、當前版本與歷史日誌分別維護，當前正式下載入口指向 v2.3.0 釋出頁，歷史小節保留自身版本連結。候選錨點 release-v1-7-0-rc-1 與 release-v1-8-0-rc-1 保留為對應正式小節的相容入口。Q＆A與skill聯動仍位於 TW 導航下方，95 問來源不變。

沙盒方法見 `docs/frontend-sandbox.md` 與 `skills/sillytavern-embedded-ui/references/`。TW 只提供搭建規範與場景參考，由 Agent 在專案測試目錄按真實原始碼搭建，沿用專案的技術棧、預覽入口和視覺風格。公開場景只用合成數據；私有作品與瀏覽器原始記錄保留在外部測試目錄。維護時檢查採用／跳過、確認注入、舊確認失效、欄位對照和引數復位；Mock Receiver 的真實記錄職責保持原義。
