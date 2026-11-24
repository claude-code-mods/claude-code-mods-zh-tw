# 介面文案翻譯規則

只翻譯**使用者在 Claude Code 介面裡看得見的文字**。其他一切保持英文原樣。

## 要翻譯（使用者可見）

- `label:` 按鈕/選項文字 —— 如 `label: 'Cancel'` → `label: '取消'`
- `placeholder:` 輸入框佔位符
- 面板/狀態帶的標題與正文 —— `$.ui.open({ title: ... })`、`<Text>`、`<Box>` 裡的文案、`title:` 屬性
- 狀態行 / toast / 提示條文字（`$.ui.status(...)`、`$.ui.log(...)` 中直接給使用者看的提示）
- 斜槓命令在 `/` 選單裡顯示的 `description`（`$.command.register({ description: ... })`）
- 能力/設定的 `title` 與面向使用者的說明（`userConfig.*.title`）

## 不要翻譯（保持英文）

- `$.tool.register({ description, inputSchema })` —— 這些是給模型看的
- `skills/` 目錄下的一切
- 程式碼註釋、變數名、函式名、日誌與除錯資訊
- 測試檔案（`*.test.ts`、`*.test.tsx`）
- prompt 片段、模型指令、錯誤碼
- 檔案路徑、命令列、API 識別符號、hook 事件名

## 硬性要求

1. 只改字串字面量的內容，**不要動引號、轉義、模板字串結構**。
2. 改完每個檔案後必須語法可解析；不能確定是否是使用者可見文字時，**保持英文不改**。
3. 不要改動 README（已翻好）、不要改 marketplace.json、不要 git 提交。
4. 報告時列出改了哪些檔案、翻了多少條。
