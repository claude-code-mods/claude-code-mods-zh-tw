---
title: Lit與自定義元素
created: 2026-08-14
updated: 2026-08-15
type: concept
status: active
tags:
  - wiki
  - concept
  - tooling
  - research
  - sillytavern
sources:
  - https://lit.dev/docs/
  - https://lit.dev/docs/components/defining/
  - https://html.spec.whatwg.org/multipage/custom-elements.html
  - https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals
  - https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/attachInternals
  - queries/第三批蒸餾目標.md
  - concepts/酒館宿主與iframe分層.md
  - concepts/視覺CSS與設計token.md
knowledge_class: factual
---

# Lit與自定義元素

本頁不是已採用技術，也不是髮卡依賴。蒸餾自 [[queries/第三批蒸餾目標]] **B3-Lit**。檢索日 2026-08-14。

## 一句話定義

Lit 是給**標準自定義元素**加響應式狀態、宣告模板和預設 Shadow DOM 的薄庫。每個 Lit 元件都是 `HTMLElement`。自定義元素要進 `<form>` 提交、校驗、恢復狀態，真源是 WHATWG 的 **`ElementInternals`**，不是 Lit 的響應式屬性，也不是 `@lit-labs/forms`。

## 為什麼重要

「已經是自定義元素 / 已經用了 Lit」不等於能當表單控制元件。影子樹裡的原生 `<input>` 預設不代表宿主提交。平臺合同是：`static formAssociated = true`，再 `attachInternals()`，再用 `setFormValue()` 把提交值交給使用者代理。Lit 只降低樣板；表單參與仍走這一條。

## 權威入口

檢索日 2026-08-14。下表 **5** 條，對齊 B3-Lit 約條。採集行不在本頁映象。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [What is Lit](https://lit.dev/docs/) | 每個 Lit 元件都是標準 Web Component；互操作靠瀏覽器原生模型 |
| 2 | [Defining a component](https://lit.dev/docs/components/defining/) | `@customElement` = `customElements.define`；`LitElement` → `ReactiveElement` → `HTMLElement` |
| 3 | [WHATWG custom elements](https://html.spec.whatwg.org/multipage/custom-elements.html) | 自主元素、`formAssociated`、FACE 回撥、`attachInternals`、`ElementInternals` |
| 4 | [MDN ElementInternals](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals) | 表單參與 + AOM；無構造器，只由 `attachInternals()` 返回 |
| 5 | [MDN attachInternals](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/attachInternals) | 非自定義元素、internals 被關、同一元素呼叫兩次，均拋錯 |

影子樹預設行為另見 [Lit Shadow DOM](https://lit.dev/docs/components/shadow-dom/)，不算上表第 6 條。2019 的 [web.dev more-capable-form-controls](https://web.dev/articles/more-capable-form-controls) 是教程，不是規範真身。

## 如何運作

### Lit 是自定義元素，不是另一套元件模型

[What is Lit](https://lit.dev/docs/) 寫：每個 Lit 元件都是標準 Web Component，可在任何 HTML 環境、任何框架或無框架裡當內建元素用。站點開發者不必寫 Lit 程式碼。Lit 自稱大約 5 KB（壓縮後），更新只動動態部分，不重建整棵虛擬樹再 diff。

[Defining](https://lit.dev/docs/components/defining/)：定義 Lit 元件就是定義自定義 HTML 元素。`LitElement` 繼承 `HTMLElement` 的全部標準屬性與方法。註冊面是 `customElements.define`；裝飾器只是縮寫。

因此：**Lit ≠ 替代自定義元素的框架。** 它是 `HTMLElement` 上的響應式與模板層。生命週期仍是 WHATWG 那套 `connectedCallback` 等；Lit 另加響應式更新迴圈，覆蓋標準回撥時必須 `super`。

### 表單參與真源是 ElementInternals

WHATWG 非規範節「Creating a form-associated custom element」把兩步釘死：

1. 靜態 `formAssociated = true`，自主自定義元素才變成 **form-associated custom element（FACE）**。
2. 構造裡 `this._internals = this.attachInternals()`，用 `ElementInternals` 實現內建控制元件已有的能力。

提交值不靠影子裡有沒有 `<input>`，靠 `internals.setFormValue(value, state)`。規範例：日期控制元件介面顯示 `3/15/2019`，提交 `"2019-03-15"`——前者是 **state**（恢復/自動填充），後者是 **submission value**。`value` 可以是 `null`、字串、`File` 或 `FormData` 條目列表。元素不是 FACE 時，`setFormValue` 拋 `NotSupportedError`。

FACE 另有回撥：`formAssociatedCallback`、`formResetCallback`、`formDisabledCallback`、`formStateRestoreCallback`。`name` / `disabled` / `form` / `readonly` 在 FACE 上有平臺語義：`disabled` 阻止提交值；`readonly` 使元素退出約束校驗。

MDN：`ElementInternals` 沒有構造器；物件只由 `HTMLElement.attachInternals()` 返回。它同時暴露 AOM（預設 `role` / `aria*`）和 `states`（`:state()`）。表單參與與無障礙預設語義共用這一物件，但仍是**平臺介面**，不是 Lit API。

`@lit-labs/forms` 的 `FormAssociated` / `FormControl` 只是替你調 `attachInternals` 和 `setFormValue`。它是 labs 封裝，**不能**寫成表單參與真源，也不能寫成 Lit 核心已內建 FACE。

### attachInternals 只能一次

WHATWG：`attachInternals()` 在下列情況拋 `NotSupportedError`——不是自定義元素、定義關閉了 internals、**同一元素呼叫兩次**、元素狀態還不是 `precustomized` / `custom`。每個 `HTMLElement` 只有一份 attached internals，初值為 null。

衝突點：有人在基類裡為了 `:state()` 先調一次，子類或 `@lit-labs/forms` 再調一次，第二次必炸。真源仍是「一元素一份 internals」；誰先 `attach`，誰必須把同一物件往下傳。不要為了 labs mixin 再發明第二份。

### 影子樹裡的原生控制元件 ≠ 宿主表單控制元件

Lit 預設 `createRenderRoot` 建 **open** `shadowRoot`，模板畫在影子裡。[Lit Shadow DOM](https://lit.dev/docs/components/shadow-dom/) 給的好處是 DOM 作用域、樣式作用域、slot 組合。`document.querySelector` 預設進不去影子。

這與表單是兩件事。影子裡的 `<input name="x">` 通常**不會**進入外層 `<form>` 的控制元件集合，提交時也沒有宿主元素的名字。FACE + `setFormValue` 就是為了讓**宿主自定義元素本身**像內建控制元件一樣 listed / labelable / submittable / resettable。

舊做法「影子裡藏原生 input，靠它提交」不是現行合同。規範真源是 `ElementInternals`。隱藏 input 只是墊片，兩邊都留：能跑 ≠ 平臺語義。

Shadow DOM 抗的是樣式和選擇器誤傷，不是安全邊界，也不是表單邊界。同 JS 堆、同主執行緒。見 [[concepts/視覺CSS與設計token]]、[[concepts/酒館宿主與iframe分層]]。

## 例子

- 正例：`class X extends HTMLElement { static formAssociated = true; constructor(){ super(); this._i = this.attachInternals(); } }`，值變時 `this._i.setFormValue(...)`。
- 正例：Lit 元件同樣設 `static formAssociated`，在構造或首次更新裡 `attachInternals()` **一次**，響應式屬性變化時再 `setFormValue`。
- 正例：校驗走 `internals.setValidity(...)` / `checkValidity()`，不要只改影子裡 input 的 `required` 就以為外層表單知道。
- 反例：寫成「用了 Lit 就會自動參加 form submit」。
- 反例：把 `@lit-labs/forms` 或 web.dev 2019 文當成 FACE 規範真源。
- 反例：基類和 mixin 各調一次 `attachInternals()`。
- 反例：因本頁出現 Lit 就寫進 recipe / 髮卡依賴。

## 邊界與易混概念

- 不包括：本倉庫已採用 Lit、把 Lit 打進 PNG、選型工單、攻擊或憑證。
- Lit ≠ React / Vue 那種虛擬樹框架；官方對比的是「互操作、少鎖定」，不是「已經取代自定義元素」。
- 自定義元素 ≠ FACE。沒有 `formAssociated` 就不是表單控制元件。
- `ElementInternals` ≠ 只做表單。它還管預設 ARIA 與 `:state()`。
- `attachInternals` ≠ `attachShadow`。影子是渲染根；internals 是作者側內部能力。兩者獨立，都只能按規範各來一次。
- `@lit-labs/forms` ≠ Lit 核心。labs 封裝不能上抬成真源。
- 影子內原生 input ≠ 宿主提交值。
- 區分方法：先問元素有沒有 `formAssociated`；再問提交值是不是 `setFormValue` 交給使用者代理的；最後才問用沒用 Lit。

## 對映到本倉庫

穩定卡今天的殼是宿主掛載、TH iframe、正則 HTML 碎片，見 [[concepts/酒館宿主與iframe分層]]、[[concepts/角色卡DOM與掛載點]]。**對映 ≠ 本倉庫已採用 Lit。** 訊息樓裡的 class 還會被 ST 加 `custom-` 字首；協議在 `data-*`，不在自定義標籤名。

若某塊 HUD 自己定義了自定義元素：浮層 / 焦點的根仍按窗選，見 [[concepts/無頭元件與根節點]]；要進宿主頁上的 `<form>`，必須走 FACE + `ElementInternals`，不能假定影子裡的 input 會被 ST 或瀏覽器收走。跨 iframe 沒有這份表單合同——框內元素參加的是**框內** document 的 form。

## 來源與證據

權威入口上表 5 條。已知衝突（不得靜默覆蓋）：

- **ElementInternals 才是表單參與真源。** WHATWG 用 `formAssociated` + `attachInternals` + `setFormValue` 定義 FACE。Lit 文件教的是自定義元素與影子樹，不替代這條。`@lit-labs/forms` 是 labs 封裝，web.dev 2019 文是教程。
- Lit 元件 = 標準自定義元素；不是另一套與 CE 並列的模型。
- 影子內原生控制元件能「看起來像輸入」，不等於 listed / submittable。
- `attachInternals()` 一元素一次；基類先取 internals 與 mixin 再取，衝突保留，採用「同一物件下傳」。
- Shadow DOM 抗樣式 ≠ 安全邊界 ≠ 表單邊界。
- 工坊「現在不用 Lit」≠「自定義元素或 FACE 不正當」。

尚缺：未抓 `@lit-labs/forms` 釋出是否已出 labs；未跑瀏覽器或酒館真機。Wiki 門不要求真機。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區

## 相關內容

- [[queries/第三批蒸餾目標]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/角色卡DOM與掛載點]]
- [[concepts/無頭元件與根節點]]
- [[concepts/視覺CSS與設計token]]
- [[concepts/前端架構名詞與取捨]]
