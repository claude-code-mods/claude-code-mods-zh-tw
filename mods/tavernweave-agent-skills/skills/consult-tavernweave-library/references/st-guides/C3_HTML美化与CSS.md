# HTML 美化與 CSS 參考手冊

> 文件版本：v1.0.0 ｜ 最後更新：2026-07-14
> TW 本地修訂：2026-10-13，僅校正 messageFormatter 適用範圍與歷史 HUD 快取示例邊界；其餘採集日期和專案證據保持原義。

> 面向 SillyTavern 角色卡開發的可檢索參考文件
> 收集日期：2026-06-28 ｜ 回源基於 SillyTavern v1.14.0 + 本地成熟卡（卡A 2.5.0 / 卡B 2.6.0）
>
> 2026-07-14 增補導航：把首樓訊息介面擴充套件成單樓層完整遊玩應用時見 **《C5_同層前端.md》**，其訊息 HTML、iframe、DOMPurify 與 CSS 基礎仍由本冊提供；把單張角色卡直接發行成 Web / App / PC 程式時見 **《C6_獨立前端.md》**。C6 中程式本身就是角色卡，不繼承 ST 的 DOMPurify、訊息 iframe 或 TavernHelper 環境，必須由該作品自己的執行時承擔渲染與安全邊界。

---

## 目錄

0. [置信度分級體系（全手冊適用）](#0-置信度分級體系全手冊適用)
1. [機制總覽：HTML 注入管線](#1-機制總覽html-注入管線)
2. [DOMPurify 安全屏障](#2-dompur​ify-安全屏障)
3. [iframe：唯一完整逃逸機制](#3-iframe唯一完整逃逸機制)
4. [CSS 變數系統與主題色板](#4-css-變數系統與主題色板)
5. [佈局正規化](#5-佈局正規化)
6. [動畫正規化](#6-動畫正規化)
7. [毛玻璃浮層正規化](#7-毛玻璃浮層正規化)
8. [Tab 系統：純 CSS radio-hack](#8-tab-系統純-css-radio-hack)
9. [動態主題色切換（JS 寫入 CSS 變數）](#9-動態主題色切換js-寫入-css-變數)
10. [iframe 內 JS 變數讀取鏈路](#10-iframe-內-js-變數讀取鏈路)
11. [iframe 工程輔助函式](#11-iframe-工程輔助函式)
12. [ST 內建 CSS 變數與 Custom CSS 慣例](#12-st-內建-css-變數與-custom-css-慣例)
13. [高頻避坑清單](#13-高頻避坑清單)
14. [懸而未決：需真機驗證的問題](#14-懸而未決需真機驗證的問題)

---

## 0. 置信度分級體系（全手冊適用）

> **收集日期統一宣告**：本手冊全部條目收集於 **2026-06-28**，回源核實基於本地 SillyTavern **v1.14.0** + 本地生產狀態列 `卡A2.5.0/components/status_bar_regex_beauty_r5.html`（262 KB，以下簡稱「r5」）。依據型別標籤以採集時實際來源為準。

每條結論採用 **置信度等級 + 依據型別** 雙軸標註。

### 1 置信度三級

| 級別 | 含義 | 判定標準 |
|---|---|---|
| **high** | 已坐實，可直接施工 | 有執行時證據（真機實測 / 讀到執行時實現原始碼 / 生產卡驗證）；結論是事實的直接陳述而非下游推導；不在懸案清單 |
| **medium** | 待驗證，施工前須實測 | 強制二選一子標籤：`medium·單源孤證`（單一來源、無第二源、無實測）/ `medium·推導未驗證`（邏輯推導成立但未跑通，**須隨附真機驗證路徑**） |
| **low** | 孤證無源，禁止據此施工 | 零來源猜測 / 純歷史快照（須標年份 + 窄縮適用範圍） |

### 2 依據型別標籤（與置信度正交，強制標註）

`[執行時原始碼]`、`[真機]`、`[文件·多源]`、`[文件·單源]`、`[社群]`、`[推斷]`、`[歷史孤證:年份]`

### 3 兩條鐵規

1. **「從原始碼事實再推一步」的下游推導，即使原始碼本身已直讀，該推導結論最高只能 `medium·推導未驗證`**——除非已真機驗證。
2. **節級標註 = 節內條目下確界**——禁止整節標 high 卻內含懸案條目；衝突即拆節，區域性降級。

---

## 1. 機制總覽：HTML 注入管線

### 核心結論

本節對照正則擴充套件和舊資料描述的 messageFormatter 路徑。本冊 v1.14.0 基準沒有證實後者可用，不能據此選擇實現路線。訊息內容仍須遵守目標渲染管線的淨化邊界。

### 路徑對比表

| 路徑 | 入口 | 觸發時機 | DOMPurify 前後 | 來源 | 置信度 |
|---|---|---|---|---|---|
| A：正則擴充套件 | Extensions → Regex，"Replace With" 欄位 | afterMarkdown 前 | 產物進入 DOMPurify | 文件·多源 + 執行時 | **high** [文件·多源] |
| B：舊資料描述的 messageFormatter 鉤子 | `beforeRegex` / `afterRegex` / `afterMarkdown` | 不適用於本冊 v1.14.0 基準 | 不據此判斷渲染位置 | 同包 A5 的原始碼校準 | **low** [歷史孤證]；採用前須查證實際目標能力 |

### 路徑 A 使用前提

- 必須在使用者設定中關閉 "Show `<tags>` in responses"，否則 HTML 標籤會被轉義為純文字顯示。  
  **來源**：文件 + 本專案實戰 ｜ **置信度**：high [文件·多源]
- 本專案（卡B/卡A）實戰用法：正則匹配訊息末尾的 JSON 資料塊，替換為注入 iframe 的指令，iframe 內載入完整 HTML 文件。  
  **來源**：r5 檔案頭即 `<!doctype html>` 完整文件 ｜ **置信度**：high [執行時原始碼]

### 路徑 B 的版本邊界

[A5 的校準記錄](A5_渲染管線與宏.md#6-messageformatter-hook-api) 已指出：v1.14.0 的 `getContext()` 不提供此欄位，不能把舊描述作為該版本的可用介面。2026-10-13 複查固定標籤的 [extensions.js](https://github.com/SillyTavern/SillyTavern/blob/1.14.0/public/scripts/extensions.js) 也只轉出實際上下文介面；其他版本或第三方擴充套件是否提供鉤子，需要 `sillytavern-api-reference` 核對提供者、簽名和呼叫路徑。同步返回、執行階段和淨化位置均隨目標實現查證，不繼承舊結論。

---

## 2. DOMPurify 安全屏障

### 核心結論

DOMPurify 是訊息樓層的安全淨化層，多項 HTML 特性在此被攔截或轉換。各攔截行為置信度不同，施工前需逐條確認。

> **重要糾錯（v1.14.0 執行時原始碼確認）**：`<style>` 標籤經 ST 特有的 `encodeStyleTags()` → DOMPurify → `decodeStyleTags()` 三步管線處理（標籤替換為 `<custom-style>`，不是屬性替換）；`class` 屬性值逐詞加 `custom-` 字首（有豁免規則）；內聯 `style=""` 屬性**不被**重新命名，由 DOMPurify 直接透過。

### 攔截行為彙總表

| 行為 | 描述 | 來源 | 置信度 |
|---|---|---|---|
| `<style>` → `<custom-style>`（標籤替換，非屬性替換） | `<style>` 塊在進入 DOMPurify 前被 `encodeStyleTags()` 改寫為 `<custom-style>` 自定義標籤（內容 URL 編碼），DOMPurify 放行，再由 `decodeStyleTags()` 還原並加 `.mes_text ` 選擇器字首。**內聯 `style=""` 屬性不受此影響**，其本身在 DOMPurify 預設屬性白名單內 | chats.js `encodeStyleTags/decodeStyleTags` 直讀 | **high** [執行時原始碼] |
| ~~`style=""` → `custom-style=""`~~ | **此說法錯誤**：上方已更正。`custom-style` 是標籤名，不是屬性名；內聯 `style=""` 屬性在 DOMPurify 預設 html 屬性白名單中（purify.js 第200行可見），**不會**被重新命名 | chats.js + purify.js 直讀 | **high** [執行時原始碼]（舊說法已廢止） |
| `class` 屬性被加 `custom-` 字首 | DOMPurify `uponSanitizeAttribute` hook（chats.js 第1927–1935行）將所有 `class` 值逐詞加 `custom-` 字首；**豁免**：以 `fa-` 或 `note-` 開頭、或恰好等於 `monospace` 的詞保持原樣。原懸案 B 已解決 | chats.js 第1927–1935行直讀 | **high** [執行時原始碼] |
| `<script>` 徹底剝除 | 訊息樓層內不能執行 JS | DOMPurify 預設行為 | **high** [文件·多源] |
| `<thought>` 等非標準標籤被過濾 | 自定義標籤丟失或變純文字 | issue #4688 | **high** [社群] |
| `<body>` 選擇器不生效 | 訊息內注入的 `<style>` 裡 `body {}` 不影響容器內樣式 | issue #4688 | **high** [社群] |
| 常見 HTML 標籤被允許 | `<div>` `<span>` `<p>` `<table>` 等保留 | DOMPurify 預設白名單 | **high** [文件·多源] |
| `data-*` / `aria-*` 屬性預設允許 | `ALLOW_DATA_ATTR = true`（purify.js 第422行），`ALLOW_ARIA_ATTR = true` | DOMPurify purify.js 直讀 | **high** [執行時原始碼] |
| CSS 變數在內聯 `style` 中是否可讀 | `style=""` 屬性本身被允許透過；但 `style="--var:val"` 能否被 CSS 解析為變數仍依賴瀏覽器行為，見第 14 章懸案 A | — | medium·推導未驗證 |

### 避坑

- 所有需要 JS 執行或完整 CSS 作用域的功能，**唯一可靠路徑是 iframe**（`iframe` 標籤在 DOMPurify 預設 `DEFAULT_FORBID_CONTENTS` 中——見懸案 C，但經 Tavern Helper 注入後 iframe 內部是獨立文件，不受訊息樓層 DOMPurify 管線影響）。
- 訊息樓層注入的 `<style>` 塊中，選擇器必須寫在具體容器類名下，絕不用 `body` 選擇器。
- `class` 屬性值所有詞均被加 `custom-` 字首（豁免：`fa-*`、`note-*`、`monospace`）；在 Custom CSS 中引用時需使用 `custom-` 字首版本，或用 iframe 完全繞開。

---

## 3. iframe：唯一完整逃逸機制

### 核心結論

iframe 是本專案（卡B/卡A）經生產驗證的核心正規化。iframe 內部是獨立 HTML 文件，完全繞開訊息樓層的 DOMPurify 限制：內部 `<style>`、`<script type="module">`、自定義類名均可正常工作。

**來源**：r5 本地執行時原始碼 ｜ **適用版本**：ST v1.14.0 + Tavern Helper 擴充套件 ｜ **置信度**：high [執行時原始碼]

### iframe 能力邊界表

| 能力 | iframe 內 | 訊息樓層直接注入 | 置信度 |
|---|---|---|---|
| `<style>` CSS 完整生效 | 是 | 部分（受 DOMPurify 約束） | high [執行時原始碼] |
| `<script>` JS 執行 | 是 | 否（被 DOMPurify 剝除） | high [執行時原始碼] |
| 自定義類名完整匹配 | 是 | 受 `custom-` 字首影響 | high [執行時原始碼] |
| 內聯 `style=""` 生效 | 是 | **是**（DOMPurify 允許 `style` 屬性；訊息樓層內聯 style 可透過，但需真機驗證在 ST 渲染管線中是否被其他機制影響；iframe 內完全可控） | high [執行時原始碼]（iframe 內） / medium·推導未驗證（訊息樓層直注） |
| 讀取 ST 變數（`getVariables`） | 是（透過 Tavern Helper 注入的全域性函式） | 不適用 | high [執行時原始碼] |
| `window.parent` 訪問宿主頁面 | 是（同域時） | 不適用 | high [執行時原始碼] |

### iframe 懸案

- **正則直接注入的 `<iframe>` 標籤是否會被 DOMPurify 過濾**：見第 14 章懸案 C。本專案實戰 iframe 工作，但可能是 Tavern Helper 在 DOMPurify 之前介入注入，不能確認原生正則→DOMPurify 路徑下 iframe 標籤是否保留。

### iframe 高度適應

本專案**不使用** postMessage 高度協商，而是依賴 Tavern Helper 擴充套件的 iframe 渲染方式自動適應內容高度。  
通用備選方案（postMessage `{ type: 'frameHeight', height: H }`）為標準社群做法，但本專案未實測。  
**來源**：r5 原始碼觀察 ｜ **置信度**：medium·推導未驗證（未找到顯式 postMessage 呼叫）

---

## 4. CSS 變數系統與主題色板

### 核心結論

本專案使用兩層變數系統：
- **固定結構色**（`:root` 級，不隨 Tab/主題切換）
- **動態主題色**（同樣在 `:root`，但由 JS `applyTheme()` 按 Tab 切換時寫入）

以下程式碼為生產狀態，來自 r5 第 4–39 行。

**來源**：r5 `卡A2.5.0/components/status_bar_regex_beauty_r5.html` 第 4–39 行 ｜ **適用版本**：卡A v2.5.0 / 卡B v2.6.0 ｜ **置信度**：high [執行時原始碼]

### 完整色板程式碼

```css
:root {
  /* 固定結構色（不隨主題變化） */
  --hud-bg-1:        rgba(18,49,74,0.62);
  --hud-bg-2:        rgba(6,18,27,0.68);
  --hud-border:      #2d6d86;
  --hud-text:        #b8d9e8;
  --hud-mute:        #6f9daf;
  --hud-grid-line:   rgba(107,199,242,0.12);
  --hud-title-color: #d9f4ff;
  --hud-title-glow:  rgba(107,199,242,0.55);
  --hud-bg-panel:    rgba(7,19,29,0.45);
  --hud-bg-panel-2:  rgba(3,8,13,0.52);
  --hud-bg-soft:     rgba(107,199,242,0.05);
  --hud-bg-card:     rgba(11,28,41,0.18);
  --hud-control-bg:  rgba(5,15,24,0.42);
  --hud-structure-primary: #4be4ff;
  --hud-structure-glow:    rgba(75,228,255,0.58);
  --hud-structure-low:     rgba(75,228,255,0.16);

  --hud-base-font:  12px;
  --hud-base-width: 100%;

  /* 以下 6 個隨 Tab 切換（由 JS applyTheme() 動態寫入） */
  --theme-primary: #6bc7f2;
  --theme-glow:    rgba(107,199,242,0.55);
  --theme-accent:  rgba(107,199,242,0.32);
  --theme-soft:    rgba(107,199,242,0.07);
  --theme-mid:     rgba(107,199,242,0.72);
  --theme-low:     rgba(107,199,242,0.16);
}
```

### ST 內建 CSS 變數（部分）

| 變數名 | 含義 | 來源 | 置信度 |
|---|---|---|---|
| `--sheldWidth` | 主聊天容器寬度（由 `power_user.chat_width` 控制） | public/css/file-form.css、logprobs.css 直讀 | **high** [執行時原始碼] |
| `--mainFontSize` | 基礎字型大小（由字型縮放設定控制） | public/css/backgrounds.css 直讀 | **high** [執行時原始碼] |
| `--SmartThemeBlurStrength` | 背景模糊強度 | public/css/character-group-overlay.css 直讀 | **high** [執行時原始碼] |

> 注：ST 主題變數完整列表可在 ST 原始碼 `public/css/` 目錄檢索 `var(--` 模式獲取；以上三個均已在本地 v1.14.0 CSS 中直接讀到引用。

---

## 5. 佈局正規化

### 5.1 HUD 主容器：切角 + 深色漸變背景

**來源**：r5 第 49–70 行 ｜ **置信度**：high [執行時原始碼]

```css
.hud-container {
  width: 100%;
  max-width: var(--hud-base-width);
  margin: 0 auto;
  box-sizing: border-box;
  padding: 4px;
  position: relative;
  background: linear-gradient(180deg, var(--hud-bg-1) 0%, var(--hud-bg-2) 100%);
  border: 1px solid var(--hud-border);
  border-radius: 0;
  --cut: 14px;
  clip-path: polygon(
    var(--cut) 0,
    100% 0,
    100% calc(100% - var(--cut)),
    calc(100% - var(--cut)) 100%,
    0 100%,
    0 var(--cut)
  ); /* 左上+右下切角 */
  transition: max-width 0.25s ease;
  font-size: var(--hud-base-font);
}

/* 掃描線背景裝飾 */
.hud-container::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background-image: linear-gradient(0deg, var(--hud-grid-line) 1px, transparent 1px);
  background-size: 100% 12px;
  opacity: 0.28;
  pointer-events: none; z-index: 1;
}
```

### 5.2 響應式網格系統

**來源**：r5 第 1008–1053 行 ｜ **置信度**：high [執行時原始碼]

```css
/* 自適應卡片網格 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 4px;
}
.stat-grid.dense {
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 6px;
}

/* 瀑布流佈局（用於事件/道具列表） */
.card-grid.reusable-masonry {
  display: block;
  column-width: 320px;
  column-gap: 6px;
}
.card-grid.reusable-masonry > .char-block {
  display: inline-block;
  width: 100%;
  margin: 0 0 6px;
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
}

/* 移動端適配 */
@media (max-width: 480px) {
  .stat-grid { grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); }
  .card-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .tab-btn { flex-basis: calc(25% - 6px); }
}
```

---

## 6. 動畫正規化

**來源**：r5 第 110–130、946–1005 行 ｜ **置信度**：high [執行時原始碼]

```css
/* 狀態指示燈閃爍 */
@keyframes blink-status {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.85); }
}

/* 元素光暈閃爍 */
@keyframes blink-glow {
  0%, 100% { opacity: 1; text-shadow: 0 0 8px var(--hud-title-color); }
  50% { opacity: 0.3; text-shadow: none; }
}

/* Tab 切換入場 */
@keyframes tab-reveal {
  0%   { opacity: 0; transform: translateY(8px) scale(0.98); filter: blur(2px); }
  100% { opacity: 1; transform: none; filter: none; }
}

/* 模組橫向滑入（stagger 延遲） */
.tab-content.active .section-title:nth-of-type(1) { animation-delay: 0.02s; }
.tab-content.active .section-title:nth-of-type(2) { animation-delay: 0.05s; }
.tab-content.active .char-block:nth-of-type(1) { animation-delay: 0.05s; }

@keyframes block-pop {
  0%   { opacity: 0; transform: translateY(8px) rotateX(6deg); transform-origin: top center; }
  100% { opacity: 1; transform: none; }
}

/* 卡片淡入 */
@keyframes card-fade {
  0%   { opacity: 0; transform: scale(0.92); filter: brightness(0.6); }
  100% { opacity: 1; transform: none; filter: brightness(1); }
}
```

---

## 7. 毛玻璃浮層正規化

**來源**：r5 第 199–213 行（設定面板） ｜ **置信度**：high [執行時原始碼]

```css
.settings-surface {
  background: linear-gradient(180deg, var(--hud-bg-panel) 0%, var(--hud-bg-panel-2) 100%);
  border: 1px solid var(--hud-border);
  box-shadow: 0 12px 28px rgba(0,0,0,0.42),
              inset 0 1px 0 rgba(230,245,255,0.08),
              0 0 0 1px rgba(212,221,226,0.07);
  backdrop-filter: blur(7px) saturate(1.08) brightness(1.02);
  -webkit-backdrop-filter: blur(7px) saturate(1.08) brightness(1.02);
  /* 斜切角 */
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

/* 內部光澤疊層 */
.settings-surface::after {
  content: '';
  position: absolute; inset: 1px;
  z-index: -1;
  background: linear-gradient(135deg, rgba(190,230,255,0.12), transparent 34%,
              rgba(70,130,170,0.08) 68%, transparent);
  opacity: 0.34;
  pointer-events: none;
}
```

> 注意：`backdrop-filter` 在某些 ST 部署環境（Tauri / 舊版 Electron）可能不生效，見第 14 章懸案 D。

---

## 8. Tab 系統：純 CSS radio-hack

### 核心結論

本專案 Tab 切換使用純 CSS radio-hack，**不依賴 JS 控制顯示/隱藏**，JS 僅在 Tab 切換時觸發主題色更新（見第 9 章）。

**來源**：r5 第 750–789 行 ｜ **置信度**：high [執行時原始碼]

```css
/* 隱藏 radio 輸入 */
.tab-radio {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

/* radio 選中時顯示對應內容 */
#hud-tab-env:checked ~ .tab-content#tab-env,
#hud-tab-user:checked ~ .tab-content#tab-user {
  display: block;
  animation: tab-reveal 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

/* 所有未選中的 tab-content 預設隱藏 */
.tab-content { display: none; }

@keyframes tab-reveal {
  0%   { opacity: 0; transform: translateY(8px) scale(0.98); filter: blur(2px); }
  100% { opacity: 1; transform: none; filter: none; }
}
```

---

## 9. 動態主題色切換（JS 寫入 CSS 變數）

### 核心結論

按 Tab ID 切換時，JS 動態修改 6 個 `--theme-*` CSS 變數，隻影響 `.hud-body` 內部視覺，不影響結構色。  
每個 `tab-btn` 在初始化時透過內聯 CSS 變數儲存自身顏色，供 hover/active 狀態使用。

**來源**：r5 第 1885–1910 行 ｜ **置信度**：high [執行時原始碼]

```js
// 按 Tab ID 動態切換主題色
function applyTheme(tabId) {
  var primary = getTabAccentColor(tabId || 'tab-env');
  var rgb = hexToRgb(primary);
  var [r, g, b] = rgb;
  var root = document.documentElement;
  root.style.setProperty('--theme-primary', primary);
  root.style.setProperty('--theme-glow',   `rgba(${r},${g},${b},0.55)`);
  root.style.setProperty('--theme-accent', `rgba(${r},${g},${b},0.35)`);
  root.style.setProperty('--theme-soft',   `rgba(${r},${g},${b},0.06)`);
  root.style.setProperty('--theme-mid',    `rgba(${r},${g},${b},0.7)`);
  root.style.setProperty('--theme-low',    `rgba(${r},${g},${b},0.15)`);
}

// 初始化時為每個 tab-btn 寫入自身顏色變數（供 hover/active 使用）
$('.tab-btn').each(function(){
  var target = $(this).data('target') || 'tab-env';
  var primary = getTabAccentColor(target);
  var [r, g, b] = hexToRgb(primary);
  this.style.setProperty('--tab-color',    primary);
  this.style.setProperty('--tab-glow',     `rgba(${r},${g},${b},0.62)`);
  this.style.setProperty('--tab-hover-bg', `rgba(${r},${g},${b},0.14)`);
  this.style.setProperty('--tab-active-bg',`rgba(${r},${g},${b},0.26)`);
});
```

---

## 10. iframe 內 JS 變數讀取鏈路

### 全域性 API 彙總表

| API | 注入來源 | 用途 | 置信度 |
|---|---|---|---|
| `getVariables({ type: 'message' })` | Tavern Helper | 讀當前樓層 JSON 變數（主鏈路） | high [執行時原始碼] |
| `Mvu.getMvuData({ type, message_id })` | Tavern Helper | 讀 MVU 資料（備用鏈路） | high [執行時原始碼] |
| `Mvu.events.VARIABLE_UPDATE_ENDED` | Tavern Helper | 變數更新完畢事件 | high [執行時原始碼] |
| `updateVariablesWith(fn, { type, message_id })` | Tavern Helper | 寫入樓層變數（如批次刪除） | high [執行時原始碼] |
| `waitGlobalInitialized('Mvu')` | Tavern Helper | 等待 MVU 全域性就緒 | high [執行時原始碼] |
| `eventOn(event, callback)` | Tavern Helper | 訂閱 ST 事件 | high [執行時原始碼] |
| `SillyTavern.getContext()` | ST 核心 | 訪問 chat/characters/chatMetadata（擴充套件 JS 中用） | high [文件·多源] |
| `SillyTavern.libs.DOMPurify` | ST 核心 | 擴充套件內手動淨化 HTML | high [文件·多源] |

### 歷史 r5 讀取摘錄（不是通用快取介面卡）

**來源**：r5 第 4673–4683 行。摘錄存在本身為 high [執行時原始碼]；快取的跨聊天正確性和移植安全性未由這段程式碼證明。下面保留歷史原文供辨認，不能直接複製為新卡的完整讀取函式。當前狀態列設計以 [MVU 狀態列規範](../../../sillytavern-embedded-ui/references/mvu-statusbar-design.md) 為準。

```js
function readCurrentHudVariables() {
  var current = null;
  try {
    // 主鏈路：Tavern Helper getVariables
    current = getVariables({ type: 'message' }) || null;
    if (hasStatData(current)) return current;
  } catch (e) {}
  try {
    // 備用鏈路：MVU API
    current = Mvu.getMvuData({ type: 'message', message_id: getCurrentMessageId() }) || null;
    if (hasStatData(current)) return current;
  } catch (e) {}
  // 最終降級：返回上次已知良好資料
  return lastGoodHudData || { stat_data: {} };
}
```

**移植時必須補齊的邊界：**

- 快取鍵至少綁定當前聊天標識、訊息樓層及 swipe 分支，並繫結狀態版本或更新序號。先捕獲讀取目標，再核對回撥返回時目標仍一致；遲到的舊結果丟棄。
- 只在同一目標的有效讀取失敗時，按介面已經約定的策略展示舊值，並明確標記“舊資料/未重新整理”。切換目標不能把上一目標的快取當成當前值；清理舊訂閱並切到當前目標的快取或缺失狀態。
- `ready`（當前有效值）、`stale`（同目標舊值）、`uninitialized`（已確認未初始化）、`unavailable`（讀取失敗或來源未就緒）分別處理。讀取失敗本身不能證明未初始化；也不能將 `{stat_data:{}}` 當成成功結果。
- 0、false 和已定義的空集合可以是有效值；先按實際 Schema 判斷，不能靠真值檢查把它們當缺失。缺欄位或非法值須保留問題狀態。
- 兩條讀取鏈只有在作用域、結構和版本語義一致時才可互為備用。備用鏈不負責初始化、自動修存檔或傳送訊息；顯示重新整理保持只讀。

新實現須分別檢查新聊天未初始化、同目標讀取失敗、聊天/樓層/swipe 切換、遲到回撥和重新載入。以上是當前實現要求，未據此宣稱歷史 r5 已發生串聊天，也不代表目標酒館已經透過實測。

---

## 11. iframe 工程輔助函式

### 11.1 找宿主 `.mes` 容器

**來源**：r5 執行時原始碼 ｜ **置信度**：high [執行時原始碼]

```js
function currentMessageContainer() {
  try {
    var frame = window.frameElement;
    // frame 是宿主頁面中的 <iframe> 元素，可向上找 .mes 樓層
    return frame && frame.closest ? frame.closest('.mes') : null;
  } catch (e) {
    return null;
  }
}
```

### 11.2 防重複 iframe 自清理

本專案生產驗證的關鍵機制。ST 重新渲染歷史訊息時，同一樓層可能出現多個 HUD iframe，此函式在 init 時執行多次，保留最新一個並移除其餘。

**來源**：r5 第 1930–1961 行 ｜ **置信度**：high [執行時原始碼]

```js
function normalizeDuplicateHudInMessage() {
  try {
    var frame = window.frameElement;
    var message = currentMessageContainer();
    if (!frame || !message) return 0;
    // 找到所有包含 HUD 標誌元素的 iframe
    var frames = Array.from(message.querySelectorAll('iframe'));
    var hudFrames = frames.filter(item => {
      try {
        var doc = item.contentDocument;
        return !!(doc && doc.querySelector('.hud-container .hud-title'));
      } catch (e) { return false; }
    });
    if (hudFrames.length <= 1) return 0;
    // 保留最後一個（最新），移除其餘
    var keep = frame;
    hudFrames.forEach(item => {
      if (item !== keep) item.remove();
    });
  } catch (e) {}
}

// 在 init 時多次呼叫（應對非同步渲染時序）
normalizeDuplicateHudInMessage();
setTimeout(normalizeDuplicateHudInMessage, 120);
setTimeout(normalizeDuplicateHudInMessage, 500);
```

### 11.3 安全屬性輸出轉義工具（防 XSS）

**來源**：r5 執行時原始碼 ｜ **置信度**：high [執行時原始碼]

```js
// HTML 屬性轉義（用於動態拼接 HTML 字串）
function attrValue(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// CSS 變數值淨化（防注入）
function cssValue(value) {
  return String(value == null ? '' : value).replace(/[;"'<>]/g, '');
}

// 用法示例（內聯 style 透過 CSS 變數傳色，繞開 custom-style 轉換問題）：
// '<span style="--cz-media-fallback-color:' + cssValue(stableMediaColor(name)) + '">'
```

---

## 12. ST 內建 CSS 變數與 Custom CSS 慣例

### 12.1 Custom CSS 的 custom- 類名慣例

ST 對角色卡注入內容的**所有** class 名加 `custom-` 字首，在 Custom CSS 中必須寫 `custom-` 字首版本才能匹配。

**核心實現**：`chats.js` `addDOMPurifyHooks()` 函式內 `uponSanitizeAttribute` hook（第1927–1935行），逐詞替換：`'custom-' + v`。
**豁免規則（執行時原始碼確認）**：以 `fa-` 開頭（FontAwesome）、以 `note-` 開頭、或恰好等於 `monospace` 的 class 詞不加字首。  
**來源**：chats.js 第1927–1935行直讀 ｜ **置信度**：high [執行時原始碼]

已記錄在案的 `custom-` 字首用例（示例，非 ST 內建 class，僅說明規則適用範圍）：

| 原類名 | Custom CSS 中需寫 |
|---|---|
| `choices` | `.custom-choices` |
| `roll_result` | `.custom-roll_result` |
| `player_status` | `.custom-player_status` |

### 12.2 規避 custom- 字首的方法

| 方法 | 適用場景 | 置信度 |
|---|---|---|
| 在 Custom CSS 中寫 `custom-` 字首版本類名 | 訊息樓層直接注入的內容（字首規則已確認） | high [執行時原始碼] |
| 用 `[class*="player_status"]` 子串匹配選擇器 | 作為兜底：因 `custom-player_status` 包含 `player_status` 子串，子串匹配器仍可命中；邏輯成立但未真機測試 | medium·推導未驗證 |
| 在 iframe 內完全自控類名（本專案選擇此路） | iframe 渲染的完整 HTML 文件（DOMPurify hook 不作用於 iframe 內部） | high [執行時原始碼] |

---

## 13. 高頻避坑清單

### 坑 1：`custom-` 字首導致動態注入內容丟樣式

**現象**：角色卡正則注入 HTML，內容上的 class 名在 Custom CSS 中用原類名寫樣式，實際無效。

**根因**：ST `addDOMPurifyHooks()` 在 DOMPurify `uponSanitizeAttribute` hook 中將 `class` 屬性的**所有詞**加 `custom-` 字首（如 `player_status` → `custom-player_status`）。豁免規則：以 `fa-`/`note-` 開頭或等於 `monospace` 的詞不加字首。

**解法**：Custom CSS 中使用 `custom-` 字首版本；或在 iframe 內完全自控類名，徹底繞開此問題（本專案選擇後者）。

**來源**：chats.js 第1927–1935行直讀 ｜ **置信度**：high [執行時原始碼]

---

### 坑 2：`<style>` 塊被轉換為 `<custom-style>` 標籤（v1.14.0 實際機制）

> **糾錯**：原描述"style="" 屬性被轉 custom-style="" 屬性"**有誤**。執行時原始碼確認機制是：`<style>...</style>` **標籤整體**被替換為 `<custom-style>URL編碼內容</custom-style>`，與內聯 `style=""` 屬性無關。

**現象 A（`<style>` 塊）**：訊息中注入 `<style>.foo{color:red}</style>`，樣式可能被作用域字首化（`.mes_text .custom-foo{color:red}`），導致原類名 `.foo` 失效。  
**根因**：`encodeStyleTags()` → DOMPurify → `decodeStyleTags(prefix: '.mes_text ')` 三步管線。

**現象 B（內聯 `style=""`）**：內聯 `style="color:red"` 在訊息樓層中**可能正常生效**——DOMPurify 白名單允許 `style` 屬性（purify.js 第200行）。但如果不生效，可能是 Custom CSS 優先順序或其他原因，而非 `custom-style` 轉換。

**解法**（按場景）：
1. 用 CSS 類名替代內聯 style，在 iframe 內的 `<style>` 或 Custom CSS（加 `custom-` 字首）中定義。
2. 透過 CSS 變數傳遞動態值：`style="--my-color: red"` + 在 CSS 中 `color: var(--my-color)` — 此方案能否在訊息樓層內生效見懸案 A。
3. 在 iframe 內使用內聯 style（完全繞開訊息樓層限制，本專案選擇此路）。

**來源**：chats.js `encodeStyleTags/decodeStyleTags` + purify.js 直讀 ｜ **置信度**：high [執行時原始碼]

---

### 坑 3：`<script>` 在訊息樓層不執行

**現象**：正則注入 `<script>alert(1)</script>`，無任何反應。

**根因**：DOMPurify 預設移除 `<script>` 標籤。

**解法**：唯一可靠路徑是 iframe（iframe 內的 `<script type="module">` 可執行）。

**來源**：DOMPurify 預設行為 + 本專案實戰 ｜ **置信度**：high [文件·多源]

---

### 坑 4：自定義非標準標籤被過濾

**現象**：`<thought>` `<action>` 等非標準標籤直接丟失或變為純文字。

**根因**：DOMPurify 預設白名單僅含標準 HTML 元素。

**解法**：用帶語義化 class 的標準標籤替代（`<div class="thought-block">` 等）。

**來源**：issue #4688 ｜ **置信度**：high [社群]

---

### 坑 5：訊息樓層內 `body {}` 樣式不生效

**現象**：注入帶 `body { color: red }` 的 `<style>` 塊，容器內 body 樣式不生效。

**根因（v1.14.0 原始碼補充）**：`decodeStyleTags()` 對訊息樓層內的 `<style>` 塊加 `.mes_text ` 字首，`body {}` 變成 `.mes_text body {}`——此選擇器試圖匹配 `.mes_text` 內部的 `<body>` 子孫元素，而訊息樓層內不存在 `<body>` 元素，因此選擇器無法命中任何元素；同時也不會意外汙染 ST 主頁面 body（字首有效隔離了作用域）。  
**來源**：chats.js `decodeStyleTags()` 直讀 + issue #4688 [社群] ｜ **置信度**：high [執行時原始碼]

**解法**：所有樣式寫在具體容器類名下（注意類名加 `custom-` 字首），或在 iframe 內定義（iframe 內有真正的 body）。

---

### 坑 6：多樓層重新整理導致狀態列重複渲染

**現象**：ST 重新渲染歷史訊息時，同一樓層內出現多個 HUD iframe。

**根因**：每次正則注入觸發時重新插入 iframe，已有 iframe 不被自動清理。

**解法**：在 iframe 內 JS 的 `init()` 階段呼叫 `normalizeDuplicateHudInMessage()`（見 11.2），檢測並移除同樓層內多餘的同類 iframe。

**來源**：r5 第 1930–1961 行 ｜ **置信度**：high [執行時原始碼]

---

### 坑 7：iframe 高度塌陷

**現象**：iframe 內容高於預設高度時被截斷，或 iframe 高度為 0。

**根因**：正則注入的 `<iframe>` 標籤通常沒有指定高度，或高度在內容變化後未更新。

**解法**：
- 由 Tavern Helper 擴充套件自動處理（本專案採用，需確認擴充套件版本支援）。
- 通用備選：iframe 內用 `ResizeObserver` 監聽高度變化，透過 `postMessage({ type: 'frameHeight', height: H })` 通知父頁面調整。

**來源**：推斷 + 本專案執行時觀察 ｜ **置信度**：medium·推導未驗證

---

### 坑 8：`prefers-color-scheme` 媒體查詢無效

**現象**：用媒體查詢做深淺色適配，ST 主題切換時不觸發。

**根因**：ST 用 JS + CSS 變數做主題切換，不依賴 OS 級深淺色模式，`prefers-color-scheme` 不會因 ST 主題切換而改變。

**解法**：監聽 ST 主題切換事件（透過擴充套件 API）並用 JS 動態修改 CSS 變數；或完全用內部變數系統（如本專案），不依賴媒體查詢。

**來源**：推斷 ｜ **置信度**：medium·推導未驗證

---

## 14. 懸而未決：需真機驗證的問題

以下問題尚無足夠證據定論，施工前須真機驗證。矛盾觀點兩派並列，不強行統一。

---

### 懸案 A：內聯 `style="--var:val"` 在訊息樓層直接注入時 CSS 變數是否可讀

> **糾錯（與原問題描述有偏差）**：`style=""` 屬性**不會**被轉為 `custom-style=""` 屬性（見第2章糾錯）。原懸案問題描述前提有誤，真正的問題如下重述。

**修正後的具體問題**：訊息樓層直接注入 `<span style="--cz-color:red;color:var(--cz-color)">X</span>` 時：
1. `style` 屬性本身被 DOMPurify 允許透過（purify.js 第200行已確認）。
2. 真正未驗證的是：該元素的 CSS 變數是否能被 **同樓層內的 `<style>` 規則**或 **Custom CSS** 讀取？即 `.mes_text .custom-foo { color: var(--cz-color); }` 能否從該元素的內聯 style 中繼承 `--cz-color`？

**當前處理**：本專案在 iframe 外注入時不依賴此機制；iframe 內 r5 大量使用此方案（第2056行可見），在 iframe 內完全正常。

**驗證路徑**：在 ST 訊息樓層（**非** iframe 內）注入 `<span style="--test:red;background:var(--test)">X</span>`，檢查背景是否顯示紅色。

---

### 懸案 B：`class` 屬性是否被 DOMPurify 過濾 ✅ 已解決（v1.14.0 執行時原始碼確認）

**結論**：`class` 屬性在 DOMPurify 預設 html 屬性白名單內（purify.js 第200行 `html` 陣列中含 `'class'`），**不會被過濾**；但會被 ST 的 `uponSanitizeAttribute` hook 改寫——所有詞加 `custom-` 字首，豁免 `fa-*`、`note-*`、`monospace`（chats.js 第1927–1935行）。

**因此**：注入 `<div class="test-cls">` 後 DOM 中實際為 `<div class="custom-test-cls">`。Custom CSS 須用 `.custom-test-cls` 選擇器。

**原置信度**：medium·推導未驗證 → 已升級為 **high [執行時原始碼]**

---

### 懸案 C：正則注入的 `<iframe>` 標籤是否被 DOMPurify 過濾 （部分解答）

**執行時原始碼新證據**：DOMPurify purify.js 第482行 `DEFAULT_FORBID_CONTENTS` 明確包含 `'iframe'`——即 `iframe` 不在預設允許標籤列表內且內容被忽略。這意味著**原生正則 → DOMPurify 路徑下 `<iframe>` 會被剝除**。 [執行時原始碼]

**具體問題（縮小範圍）**：既然 DOMPurify 預設過濾 `iframe`，本專案 iframe 能工作的唯一可能解釋是：Tavern Helper 在 DOMPurify 之前（或之後用獨立注入）處理 iframe，繞開了 DOMPurify 管線。此推斷**尚未真機驗證**。

**當前處理**：本專案實戰驗證 iframe 在 Tavern Helper 環境下可工作。 [執行時原始碼] → **high**（有擴充套件）/ medium·推導未驗證（無擴充套件路徑）

**驗證路徑**：在不安裝 Tavern Helper 的環境中，用正則注入 `<iframe srcdoc="<h1>test</h1>">` 觀察 test 標題是否渲染；對照組同時注入 `<div>direct div</div>` 確認普通標籤正常。

---

### 懸案 D：`backdrop-filter` 在非標準 ST 部署環境的相容性

**具體問題**：`backdrop-filter: blur()` 在 Tauri 包裝的 ST 或舊版 Electron 中可能不生效。

**影響範圍**：第 7 章毛玻璃浮層正規化（`.settings-surface`）的視覺效果。

**驗證路徑**：在目標執行環境（Tauri / Electron / 瀏覽器）中開啟包含毛玻璃效果的 iframe，確認 backdrop-filter 是否渲染；準備降級方案：移除 backdrop-filter，改用純色半透明背景（`background: rgba(7,19,29,0.85)`）。

---

## 參考來源

- SillyTavern 正則擴充套件文件：<https://docs.sillytavern.app/extensions/regex/>
- SillyTavern UI 擴充套件開發文件：<https://docs.sillytavern.app/for-contributors/writing-extensions/>
- SillyTavern UI 自定義文件：<https://docs.sillytavern.app/usage/core-concepts/uicustomization/>
- GitHub issue #3844（**注意**：issue 描述的是 `style=""` 屬性行為，但 v1.14.0 執行時原始碼確認 `custom-style` 是 `<style>` 標籤的替身，非屬性替換；`class` 字首實現在 chats.js addDOMPurifyHooks 中）：<https://github.com/SillyTavern/SillyTavern/issues/3844>
- GitHub issue #4688（自定義標籤 / body 樣式不生效）：<https://github.com/SillyTavern/SillyTavern/issues/4688>
- DeepWiki SillyTavern 使用者介面分析：<https://deepwiki.com/SillyTavern/SillyTavern/4-user-interface>
- DOMPurify 預設白名單文件：<https://github.com/cure53/DOMPurify/wiki/Default-TAGs-ATTRIBUTEs-allow-list-&-blocklist>
- **本地實戰最高可信**：`<local-user-path>/<local-drive>\<local-workspace>\卡A\卡A 2.5.0\components\status_bar_regex_beauty_r5.html`（262 KB，v2.5.0 生產狀態列）
- 本地實戰：`<local-user-path>/<local-drive>\<local-workspace>\卡A\卡A 2.5.0\components\status_bar_regex.html`（269 KB，status_bar_regex 元件）
- **本次回源關鍵原始碼**（v1.14.0 直讀）：
  - `public/scripts/chats.js`（`encodeStyleTags`/`decodeStyleTags`/`addDOMPurifyHooks` 實現，第532–1939行）
  - `public/script.js`（`messageFormatting` + DOMPurify 配置，第1763–1776行）
  - `node_modules/dompurify/dist/purify.js`（預設白名單 html/svg/attrs，第186–204、422、482行）
  - `public/css/backgrounds.css`、`file-form.css`、`character-group-overlay.css`（ST 內建 CSS 變數引用驗證）
