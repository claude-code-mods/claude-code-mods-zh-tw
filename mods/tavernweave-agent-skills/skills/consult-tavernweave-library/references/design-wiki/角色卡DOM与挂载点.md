---
title: 角色卡 DOM 與掛載點
created: 2026-08-13
updated: 2026-08-13
type: concept
status: active
tags:
  - wiki
  - concept
  - sillytavern
  - tooling
sources:
  - raw/workshop-cards-2026-08-13/analysis_omni-README.txt
  - raw/workshop-cards-2026-08-13/status_bar-mount_shell_remote-README.txt
  - <local-workspace>/卡A/卡A 4.0.0/components/options_render_regex.html
  - <local-workspace>/卡A/卡A 4.0.0/components/options_bridge.js
  - <local-workspace>/卡A/卡A 4.0.0/components/dialog_bubble_regex.html
  - <local-workspace>/卡A/卡A 4.0.0/components/update_variable_omni_done_regex.html
  - <local-workspace>/卡A/卡A 4.0.0/components/opening_expand_regex.html
  - <local-workspace>/卡A/卡A 4.0.0/components/media_library.js
  - <local-workspace>/怪談筆記/components/scripts/kdn_bridge.js
  - <local-workspace>/怪談筆記/components/statusbar.html
  - <local-workspace>/卡B/v2.6.2_20260721_174430/components/status_bar_regex.html
knowledge_class: factual
---

# 角色卡 DOM 與掛載點

卡前端不是一張網頁，而是幾層互相看不見的文件。名詞分三類：**宿主層**（SillyTavern / 酒館助手給的框）、**協議屬性**（`data-*`，指令碼靠它找節點）、**裝飾 class**（給人看，不能當選擇器）。

產品真源是三張已驗證穩定卡：[[entities/示例學園]]、[[entities/卡B]]、[[entities/怪談筆記綺羅世界]]。口語總表見 [[concepts/角色卡前端名詞中英對照]]。**誰造了哪個 iframe、宿主 chrome、淨化鉤子**見 [[concepts/酒館宿主與iframe分層]]。本頁只管卡側 `data-*` 協議。

## 為什麼重要

在訊息樓裡用 `.omni-analysis` 寫 CSS 或 `querySelector`，真機會變成裸白或點不動。SillyTavern 會給訊息 HTML 的 class 加 `custom-` 字首。協議必須寫在 `data-*` 上。

## 文件層（先認窗，再找節點）

分層全表、TH 官方名字、ST `chats.js` 淨化鉤子見 [[concepts/酒館宿主與iframe分層]]。本頁只留卡側要用的最短對照。

| 中文 | English / identifier | 卡側要點 |
|---|---|---|
| 宿主頁 | host document | 小手機掛 `body`；輸入框 `#send_textarea` |
| 指令碼框 | `TH-script--…` | 控制中心 |
| 訊息框 | `TH-message--樓號--序號` | 狀態列 ` ```html ` |
| 內層真身框 | blob iframe | git-mount；要 `injectBridge` |
| 樓層塊 | `.mes[mesid]` | ST 屬性名是 `mesid` |
| 正文槽 | `.mes_text` | OMNI/氣泡/選項在這裡，**不是** iframe |
| class 字首 | `custom-` | 只改寫進 `.mes_text` 的 class |

```text
宿主頁
 ├─ 指令碼框（控制中心）
 ├─ .mes_text 碎片 HTML（OMNI / 氣泡 / 選項）
 └─ 訊息框（狀態列）
      └─ blob 真身框（卡A git-mount）
小手機：掛宿主 body
```

指令碼框和訊息框不是同一個 `window`。blob 真身再隔一層。細則見 iframe 頁。

**硬規則適用範圍：** 寫進訊息樓、會被 ST 改 class 的那段 HTML（OMNI、對話氣泡、行動選項、開局遠端佔位）。卡自己完全控制的 iframe 文件內部，class 選擇器可以工作；但跨層查詢、以及任何可能落到訊息樓的模板，仍應走 `data-*`。

## 名稱空間（看見字首就知道哪張卡、哪一層）

| 字首 | 卡 | 管什麼 |
|---|---|---|
| `data-xy-*` | 卡A | OMNI、開局遠端、對話氣泡、媒體管理器 |
| `data-xyopt-*` | 卡A | 行動選項（正則掛載 + `options_bridge.js`） |
| `data-xyph-*` | 卡A | 小手機根（從怪談移植） |
| `data-kdn-*` | 怪談筆記 | 小手機 HUD 根、殼皮膚、結算卡 |
| `data-kdnopt-*` | 怪談筆記 | 行動選項，結構同 `data-xyopt-*` |
| `data-kdnopen-*` | 怪談筆記 | 開局授予者表單 |
| `data-cz-*` | 卡B | 狀態列媒體塊等卡族協議 |
| `id="xingyue-*"` | 卡A | 控制中心面板、魔棒按鈕、HUD 抽屜 |
| `id="xy-phone-root"` | 卡A | 小手機根 |
| `id="kdn-statusbar-root"` | 怪談筆記 | 小手機根 |

`class="xy-*"` / `omni-*` / `kdn-*` / `cz-*` 是裝飾或 iframe 內部樣式。訊息樓裡不要用它們當協議。

## 卡A：訊息樓掛載點

正則先吐佔位，JS 再掃 `data-*` 填真 UI。

### OMNI

| 屬性 | 含義 |
|---|---|
| `data-xy-omni="analysis"` | 預分析青框掛載點 |
| `data-xy-omni="done"` | 變數同步完成綠框 |
| `data-xy-omni="progress"` | 同步中琥珀框 |
| `data-xy-omni-raw` | 框裡的原文容器，給媒體庫/控制中心提取 |
| `data-xy-omni-fallback` | 真身模板還沒到時的佔位字 |
| `data-xy-omni-ready="1"` | 這格已經渲過，避免重複掛 |
| `data-xy-omni-rendering="1"` | 正在拉模板 |
| `data-xy-omni-state` | 同步結果狀態（如 `ok`） |
| `data-xy-analysis-edit` | 「預分析」按鈕，點了走控制中心 |
| `data-xy-analysis-reroll` | 從預分析整樓重算 |
| `data-xy-var-tune` | 「微調」按鈕 |

```html
<div class="xy-omni-mount" data-xy-omni="done">
  <div data-xy-omni-fallback>變數更新完成，正在讀取 JSONPatch…</div>
</div>
```

`class="xy-omni-mount"` 只是給人看。掃描用 `[data-xy-omni]:not([data-xy-omni-ready])`。

### 開局遠端殼

`first_message_opening.html` 在 4.0.0 只留標記行；樓裡真正佔位的是 `opening_expand_regex.html`。

| 屬性 | 含義 |
|---|---|
| `data-xy-opening-remote` | 遠端開局頁的樓內掛載根 |
| `data-xy-opening-phase` | `loading` 等階段 |
| `data-xy-remote-state` | `idle` / `loading` / `loaded` / `error` |
| `data-xy-remote-owner` | 誰佔著這次遠端載入 |
| `data-xy-opening-status` | 狀態文案節點 |
| `data-xy-opening-retry` | 失敗重試按鈕 |
| `data-xy-opening-shell` | 載入中的內層殼 |
| `data-xy-opening-page` | 真身開局頁根（值常是版本號） |
| `data-xy-opening-view` | 開局檢視名，如 `boot` |
| `data-xy-opening-step` | 嚮導步 |

CSS 用 `[data-xy-opening-remote]:not([data-xy-remote-state="loaded"])`，不用 class。

### 對話氣泡

| 屬性 | 含義 |
|---|---|
| `data-xy-dialog-render` | 成對對話氣泡掛載點 |
| `data-xy-dialog-speaker` | 說話人 |
| `data-xy-dialog-avatar` | 頭像槽 |
| `data-xy-dialog-content-source` | 隱藏 textarea，原文在這裡 |
| `data-xy-dialog-content-cache` | 已解析正文快取 |
| `data-xy-dialog-ready` | `1` 已渲 / `0` 空內容 |
| `data-xy-cot-dialog-render` | CoT 檔對話掛載點 |
| `data-xy-cot-dialog-source` | CoT 原文 |

媒體庫掃 `[data-xy-dialog-render]`，也相容 `.xy-dialog-render` 和 `.custom-xy-dialog-render`，因為 ST 可能已經加過字首。

### 行動選項

| 屬性 | 含義 |
|---|---|
| `data-xyopt-root` | 一組選項的根。橋掃這個。 |
| `data-xyopt-raw` | 隱藏原文 |
| `data-xyopt-list` | 按鈕被填進這裡 |
| `data-xyopt-choice` | 單個選項按鈕，值是序號 |
| `data-xyopt-direct` | 直髮開關 |
| `data-xyopt-collapse` | 收起/展開 |
| `data-xyopt-toggle` | 直髮開關的外層 label |
| `data-xyopt-tip` | 狀態提示 |
| `data-xyopt-head` | 標題行 |

根上有 `container-type: inline-size`，窄了從兩列變一列。樣式選擇器全是 `[data-xyopt-list]`，沒有 class 協議。

### 媒體管理器（控制中心裡）

`data-xy-media-manager-trigger` / `-status` / `-type` / `-name` / `-slot` / `-list` / `-filter`：工坊/媒體庫面板內部控制元件，不在訊息樓。

## 怪談筆記：小手機 + 樓內橋

| 屬性 | 含義 |
|---|---|
| `data-kdn-hud-root` | `#kdn-statusbar-root` 上，HUD 根標記 |
| `data-kdn-build` | 構建號，如 `1.0.9` |
| `data-kdn-shell` | 殼皮膚：`terminal` / `clear` 等 |
| `data-kdn-charm` | 掛飾皮膚：`seal` / `crystal` / `keycard` |
| `data-kdn="floatgrab"` | 拖動抓手 |
| `data-kdn-editing` | 主屏是否在編輯小元件 |
| `data-kdnopt-*` | 與卡A `data-xyopt-*` 同構的行動選項 |
| `data-kdnopen-root` | 開局表單根 |
| `data-kdnopen="欄位名"` | 開局欄位，如 `對怪談筆記的態度` |
| `data-kdnopen-go` / `-skip` | 提交 / 跳過 |
| `data-kdn-settlement` | 變數結算卡根 |
| `data-kdn-settlement-analysis` | 結算卡里的預分析段 |
| `data-kdn-settlement-patch` | 結算卡里的 JSONPatch 段 |

卡A小手機根是 `data-xyph-hud-root` + `data-xyph-build`，職責同 `data-kdn-hud-root`。

## 卡B：卡內狀態列動作

卡B 2.6.2 狀態列是卡內整頁 HTML，不走卡A git-mount。動作仍大量寫在 `data-*` 上，例如：

| 屬性 | 含義 |
|---|---|
| `data-cz-media-block` | 頭像/立繪塊 |
| `data-cz-media-action` | 媒體按鈕動作 |
| `data-cz-media-toggle` | 臨時切正常/赤裸立繪 |
| `data-cz-media-settings` | 開啟頭像立繪設定 |
| `data-batch-key` / `data-batch-action` | 批次選擇 |
| `data-detail` | 展開/摺疊一條詳情 |
| `data-block` | 展開某個角色/機體塊 |
| `data-group` / `data-char` | 刪除或遷移時的目標 |
| `data-kind` / `data-key` | 屬性/技能加點 |

這些是 HUD 內部協議。不要和訊息樓 OMNI 的 `data-xy-omni` 混用。

## 根節點 ID（不是 data，但常被當成「那個 DOM」）

| ID | 含義 |
|---|---|
| `xingyue-control-center-panel` | 控制中心面板 |
| `xingyue-control-center-wand-button` | 魔棒選單裡的入口按鈕 |
| `xingyue-hud-drawer` | 移動端 HUD 抽屜 |
| `xy-phone-root` | 卡A小手機 |
| `kdn-statusbar-root` | 怪談小手機 |

## 實現摘錄

```javascript
// 訊息樓：只掃 data，不要掃 class
document.querySelectorAll('[data-xy-omni]:not([data-xy-omni-ready])');
document.querySelectorAll('[data-xyopt-root]');
```

```css
/* 訊息樓樣式：屬性選擇器 */
[data-xy-omni="analysis"] summary::-webkit-details-marker { display: none; }
[data-xyopt-list] { display: grid; }

/* 會失配（ST 加了 custom-） */
.omni-analysis summary::marker { display: none; }
```

```javascript
// 氣泡：相容「還沒加字首 / 已經 custom-」兩種
node.querySelector(
  '[data-xy-dialog-content-source], .xy-dialog-content-source, .custom-xy-dialog-content-source'
);
```

## 邊界

- 本頁列的是**協議屬性**，不是把每張卡的皮膚 class 抄一遍。`data-kdn-charm="crystal"` 這類是皮膚開關，不是新的一層文件。
- 未展開 Zod 私密欄位，也未把 `control_center.js` 內嵌 fallback 整段搬進來。
- 卡C / 卡D的 DOM 名只當設計檔，不寫進本頁主表。
- 酒館助手官方 API 名仍以 ST / TH 文件為準；本頁是卡側 DOM 約定。

## 相關內容

- [[concepts/酒館宿主與iframe分層]]
- [[concepts/角色卡技術路徑總圖]]
- [[concepts/小手機與宿主橋]]
- [[concepts/行動選項橋]]
- [[concepts/OMNI正則與data屬性選擇器]]
- [[concepts/控制中心與狀態列]]
- [[concepts/角色卡前端名詞中英對照]]
- [[entities/示例學園]]
- [[entities/怪談筆記綺羅世界]]
- [[entities/卡B]]
