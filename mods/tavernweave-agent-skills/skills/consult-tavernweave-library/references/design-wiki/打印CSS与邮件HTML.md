---
title: 列印CSS與郵件HTML
created: 2026-08-14
updated: 2026-08-14
type: concept
status: active
tags:
  - wiki
  - concept
  - research
  - tooling
knowledge_class: factual
sources:
  - https://www.w3.org/TR/css-page-3/
  - https://www.w3.org/TR/css-gcpm-3/
  - https://www.w3.org/TR/CSS21/page.html
  - https://www.w3.org/TR/css-break-3/
  - https://documentation.mjml.io/
  - https://www.caniemail.com/
  - https://www.caniemail.com/features/
  - https://amp.dev/documentation/guides-and-tutorials/learn/email-spec/amp-email-structure/
  - https://www.rfc-editor.org/rfc/rfc2046.html
  - https://emailmarkup.org/
  - https://emailmarkup.org/en/docs/compliant-standards/
  - https://emailmarkup.org/en/docs/vision/
  - https://developer.chrome.com/docs/devtools/rendering/emulate-css
  - https://pagedjs.org/en/documentation/1-the-big-picture/
  - https://weasyprint.org/
  - https://github.com/mjmlio/mjml
  - queries/第三批蒸餾目標.md
---

# 列印CSS與郵件HTML

蒸餾自 [[queries/第三批蒸餾目標]] B3-Print / B3-Email。檢索日 2026-08-14。不是已採用皮膚或髮卡規範。

## 一句話定義

列印 CSS 把連續文件切成有限頁盒；郵件 HTML 是第三方 HTML，必須先被客戶端收成安全子集再嵌入。兩者都不是「瀏覽器裡那張完整網頁」。

## 為什麼重要

螢幕 CSS 預設連續視口。紙張、PDF、郵件窗格都把內容放進**有限、常被裁切的盒子**，而且渲染方會改你的標記。認清頁盒、填盒、MIME 備選和淨化子集，才能判斷「預覽對了」是不是真的印得出、寄得出。酒館訊息樓也只認 HTML 子集，機制類似、規範不同，見下方對映。

## 權威入口

檢索日 2026-08-14。下列為可點真源，不是映象。

1. [CSS Paged Media Module Level 3](https://www.w3.org/TR/css-page-3/) — 頁盒、`@page`、`size`。2023-09-14 WD。
2. [CSS Generated Content for Paged Media](https://www.w3.org/TR/css-gcpm-3/) — 填盒：`string-set`、running elements、腳註。2024-01-25 WD。
3. [CSS 2.1 Paged media](https://www.w3.org/TR/CSS21/page.html) — 有 `@page` 邊距，**不能指定頁尺寸**。
4. [CSS Fragmentation Level 3](https://www.w3.org/TR/css-break-3/) — 分頁斷裂；css-page 把分頁過程指向它。
5. [MJML 文件](https://documentation.mjml.io/) — 語義標籤編譯成響應式郵件 HTML。原始碼 [MIT](https://github.com/mjmlio/mjml)。
6. [Can I Email](https://www.caniemail.com/) — 郵件 HTML/CSS 支援表。2026-07-13 仍在更新（`popover`、`command`）。
7. [Can I Email 特性目錄](https://www.caniemail.com/features/) — 按特性查客戶端，不是單一「Outlook」。
8. [AMP 郵件結構](https://amp.dev/documentation/guides-and-tutorials/learn/email-spec/amp-email-structure/) — `text/x-amp-html` 必須放在 HTML **之前**。
9. [RFC 2046](https://www.rfc-editor.org/rfc/rfc2046.html) — `multipart/alternative`：**越後越豐富**。
10. [Email Markup Consortium](https://emailmarkup.org/) — 郵件標記社群組。
11. [EMC Compliant Standards](https://emailmarkup.org/en/docs/compliant-standards/) — 要語義 HTML、地標、語言；不是寫法教程。
12. [EMC Vision](https://emailmarkup.org/en/docs/vision/) — 各客戶端淨化與嵌入上下文不一致。
13. [Chrome DevTools：模擬 CSS media](https://developer.chrome.com/docs/devtools/rendering/emulate-css) — Rendering 裡選 `print`，不是系統列印對話方塊。
14. [Paged.js 現行文件](https://pagedjs.org/en/documentation/1-the-big-picture/) — 瀏覽器裡做分頁預覽的 polyfill。倉庫仍寫的 [`/documentation/`](https://pagedjs.org/documentation/) 於 2026-08-14 **404**。
15. [WeasyPrint](https://weasyprint.org/) — 專用印刷引擎示例；瀏覽器列印預覽不是它。

舊文 [Litmus Email Coding 101](https://www.litmus.com/blog/email-coding-101) 於同日 **404**，勿再當入口。

## 如何運作

### 列印：頁盒在 css-page，填盒在 css-gcpm

[css-page-3](https://www.w3.org/TR/css-page-3/) 把文件流進一塊有限矩形，叫 **page box（頁盒）**，大致對應視口。頁盒有邊距、邊框、內邊距；內容區叫 page area。頁邊距再切成 **16 個 page-margin boxes**，用來放頁首頁尾。`@page` 的 `size` 指定頁盒（以及通常的紙張）尺寸和方向，例如 `size: A4 landscape`。

[CSS 2.1 §13](https://www.w3.org/TR/CSS21/page.html) 寫明：*The size of a page box cannot be specified in CSS 2.1.* 只能設邊距和左右/首頁選擇器。要寫頁尺寸，必須用 css-page-3，不能假裝 2.1 已經能寫。

16 個頁邊距盒的**空位**在 css-page；往裡面填內容不在那份規範。[css-gcpm-3](https://www.w3.org/TR/css-gcpm-3/) 開篇寫：css-page 描述了這些盒子，但沒有插入機制。填盒靠兩類辦法：

- **Named strings**：`string-set` 把標題等抄進命名字串，頁邊距用 `content: string(name)` 取出。
- **Running elements**：把帶樣式的元素從正文移到頁邊距盒。

腳註、導點、交叉引用也在 gcpm，不在 css-page。分頁斷裂本身在 [css-break-3](https://www.w3.org/TR/css-break-3/)。

### 預覽三層，不要併成一層

| 層 | 做什麼 | 不是什麼 |
|---|---|---|
| DevTools「Emulate CSS media type: print」 | 在**連續視口**上套 `@media print`，方便改樣式 | 不是系統列印對話方塊，也不保證分頁、頁邊、頁首頁尾與真印一致 |
| 瀏覽器列印預覽 / 另存 PDF | 瀏覽器自己的列印管線 | 不是 Prince / WeasyPrint / Antenna House 這類印刷引擎 |
| 印刷引擎或 Paged.js | 按頁盒切流、填頁邊距、出 PDF | Paged.js 是 polyfill，把 `@page` 譯成瀏覽器能畫的 DOM |

Chrome 文件把 Rendering 選項叫 “Enable print preview”，實際只是強制 print 媒體型別。要看紙張、縮放、頁碼，仍須開啟列印對話方塊。瀏覽器預覽能「看起來像一頁」，不等於印刷引擎的分頁與字型。

Paged.js 實現 css-page、css-gcpm、css-break。GitHub README 仍鏈 `pagedjs.org/documentation/`；2026-08-14 該路徑 404，活頁在 `/en/documentation/…`。

### 郵件：先編譯或手寫子集，再過客戶端淨化

[MJML](https://documentation.mjml.io/)（MIT）用 `<mj-section>` / `<mj-column>` 等語義標籤，編譯成各客戶端更能吃的響應式 HTML，把套表和客戶端 CSS 差藏進引擎。輸出仍是 HTML 郵件，不是新傳輸協議。

[Can I Email](https://www.caniemail.com/) 按**具體客戶端**記支援，不把「Outlook」當成一種。Windows 桌面、Outlook.com、macOS、iOS/Android 分數不同。2026-07 仍在加特性。

[EMC](https://emailmarkup.org/) 要語義 HTML、地標、`lang`/`dir`、尊重使用者偏好，並標準化「不支援的特性怎麼剝」而不是強推一張特性清單。[Vision](https://emailmarkup.org/en/docs/vision/) 舉例：同樣不支援的 `rgb()` 空白語法，Yahoo 只刪 `color`，Gmail 整段 `style` 都剝。

**衝突保留：** EMC 要語義結構；**Classic Outlook（Word 排版引擎）仍常逼表佈局**。MJML 等工具繼續出表，是為了這臺引擎，不是 EMC 改了口徑。兩邊都留，不要寫成「現在可以只寫語義、不必再管表」。

### AMP 段序與 RFC 2046 對打

[RFC 2046](https://www.rfc-editor.org/rfc/rfc2046.html) 規定 `multipart/alternative` 按**保真度遞增**排列：最樸素在前，**最好的選擇是收件方能顯示的最後一段**。組包方必須「越後越豐富」。

[AMP 郵件](https://amp.dev/documentation/guides-and-tutorials/learn/email-spec/amp-email-structure/) 要求另加 `text/x-amp-html`，且必須有非 AMP 的 `text/plain` 或 `text/html`。有些客戶端**只渲染最後一段**，所以官方建議把 AMP 段放在 HTML **之前**。常見順序因此是：plain → AMP → HTML。這與 RFC「最豐富的放最後」衝突：AMP 更豐富，卻不能放在最後，否則只認末段的客戶端會丟掉 HTML 回退。回覆/轉發會剝掉 AMP；客戶端也可能在約 30 天后改顯示 HTML。

## 酒館對映（只互鏈，不抄管線）

酒館訊息樓淨化只認 HTML 子集，**類似**郵件客戶端：第三方標記先收成安全碎片，再嵌進宿主頁面。這不是同一份規範，也不是同一份白名單。

- 樓內碎片（OMNI / 氣泡 / 選項）走 ST 淨化，進 `.mes_text`。管線與正則位置見 [[concepts/訊息渲染與正則管線]]；淨化鉤子見 [[concepts/酒館宿主與iframe分層]]。
- 郵件客戶端各有自己的剝法（EMC Vision：Yahoo 與 Gmail 對同一不支援值處理不同）。ST 用 DOMPurify + `MESSAGE_SANITIZE`，規則另一套。
- 能類比的是「子集 + 嵌入上下文」：webmail 可能 iframe、可能同頁嵌入並做 CSS 作用域；訊息樓是同文檔淨化，不是郵件 MIME。
- **本頁不寫如何繞過淨化、不寫擴大白名單、不寫攻擊載荷。** 卡要插 UI，接到現有管線，不要假裝訊息樓是未淨化網頁。

列印 CSS 與酒館髮卡無直接執行時合同。`@page` / 印刷引擎不自動落到卡；瀏覽器列印預覽也不等於狀態列或開局頁。

## 例子

- 正例（列印）：`@page { size: A4; margin: 2cm; }` 定頁盒；`h1 { string-set: chapter content(); }` 加 `@top-center { content: string(chapter); }` 填頁首。頁盒在 css-page，填盒在 gcpm。
- 正例（郵件）：MJML 編譯出帶表的 HTML；同時保留 `text/plain`。若發 AMP，MIME 為 plain → `text/x-amp-html` → `text/html`。
- 反例（列印）：只在 DevTools 勾 print，就宣稱「分頁和頁碼已驗收」。那是媒體型別模擬，不是列印對話方塊，更不是印刷引擎。
- 反例（郵件）：按 RFC 把 AMP 放在最後。只渲染末段的客戶端會丟掉 HTML 回退。
- 反例（對映）：把郵件「能用的標籤」抄進訊息樓，或反過來，當作同一白名單。

## 邊界與易混概念

- 不包括：某張卡的列印樣式、工坊發信產品、繞過淨化的做法、付費印刷引擎操作手冊。
- 頁盒 ≠ 填盒。css-page 造 16 個頁邊距盒；gcpm 往裡填。
- CSS 2.1 `@page` ≠ css-page-3 `@page`。前者不能寫頁尺寸。
- 瀏覽器列印預覽 ≠ 印刷引擎。DevTools print ≠ 列印對話方塊。
- Paged.js 文件根路徑曾 404；不要引 `/documentation/` 當活入口。
- Litmus Coding 101 已 404；支援面看 Can I Email。
- EMC 語義目標 ≠ Classic Outlook 實現。表佈局仍在，因為引擎還在。
- RFC 2046 備選順序 ≠ AMP 實裝順序。衝突保留，不要選邊抹掉。
- 郵件淨化 ≠ ST 訊息樓淨化。只類似，不共用規範。
- Can I Email 的 Outlook 分多列，不是一種客戶端。

## 來源與證據

- 列印樞紐：css-page-3、css-gcpm-3、CSS 2.1 §13；對照 WeasyPrint、Paged.js。
- 郵件樞紐：MJML、Can I Email、AMP 結構、RFC 2046、EMC。
- 賬本：[[queries/第三批蒸餾目標]] B3-Print / B3-Email。
- 已知衝突（不得靜默覆蓋）：
  1. AMP 因「只渲染最後一段」要把 AMP 放在 HTML **之前**，與 RFC 2046「越後越豐富」衝突。
  2. EMC 要語義 HTML；Classic Outlook 仍逼表佈局。
  3. CSS 2.1 不能指定頁尺寸，css-page-3 可以。
  4. 頁盒在 css-page，填盒在 css-gcpm。
  5. 瀏覽器列印預覽 ≠ 印刷引擎；DevTools print ≠ 列印對話方塊。
  6. Paged.js `/documentation/` 曾 404；Litmus Coding 101 404。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 `SCHEMA.md` 的 Tag Taxonomy
- [x] 已釋出到正式區，並同步 `index.md` 與 `log.md`

## 相關內容

- [[queries/第三批蒸餾目標]]
- [[concepts/訊息渲染與正則管線]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/視覺CSS與設計token]]
- [[concepts/OMNI正則與data屬性選擇器]]
