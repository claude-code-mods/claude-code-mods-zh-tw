# Claude Code 原生提示預測

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。


本介面卡使用 Claude Code 原生的函式鉤子（function hooks）。它已在 Claude Code 2.1.310 上驗證；更早版本不在支援範圍內。載入到新程序的方式是 `--plugin-dir <介面卡絕對路徑>` 並設定 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`。載入介面卡並不會把它安裝到使用者的全域性 Claude 配置中。

啟動器必須提供 `PEBREL_PREDICTION_ENDPOINT`（帶埠的 HTTP IPv4 迴環地址）、`PEBREL_PREDICTION_TOKEN` 以及 `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=false`。最後一個變數用於停用該程序內 Claude Code 內建的預測推理；不設定它，介面卡就不會工作，以免對同一輪完成重複發起兩次推理請求。不會修改任何全域性設定或主模型設定。

只有成功完成、且終端輸入框為空並已掛載的主回合才有資格觸發。`$.session.messages()` 提供記憶體中的使用者/助手文字；不會發送工具呼叫的載荷。橋接端最多接收 24 條訊息，每條最多 3000 個 UTF-16 單元，總計不超過 12000 單元。預測提示詞、所配置的提供商、語言及進一步的上下文限制均由 Pebrel 負責。介面卡不新增任何說話風格提示詞，也不做持久化。

本地化的橋接文案 `loading_text` 會顯示在 Claude Code 底部灰色的 `PromptHint` 中，並每 400 毫秒依次追加 `.`、`..`、`...`。它不可編輯，也從不會發送給 `prompt.suggest`。候選完成後呼叫原生 `$.prompt.suggest({text})`，因此原生的 Tab/右方向鍵行為會填充輸入框而不會提交。輸入框始終歸 Claude Code 所有。

編輯、提示詞變更、新回合、會話結束以及十秒期限都會使待處理的介面工作失效。每個結果都會重新校驗版本、會話和空草稿。原生 `http.fetch` API 沒有中止訊號：這裡的取消只是抑制過期結果，網路/請求的期限由橋接端負責。預測介面空閒時不會留下磁碟輪詢或定時器。

執行行為契約：`node --test tests/*.test.mjs`；執行真實的 Claude 掃描器：`claude plugin validate --strict --json <介面卡目錄>`。模擬測試不能證明原生終端的視覺驗收，也不能證明與未測試 Claude 版本的相容性。

## 出處與許可證

- 原作者：[Kuddev](https://github.com/Kuddev/pebrel)
- 原倉庫：https://github.com/Kuddev/pebrel
- 許可證：GPL-3.0
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
