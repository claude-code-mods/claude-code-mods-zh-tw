---
title: 表單與combobox
created: 2026-08-15
updated: 2026-08-15
type: concept
status: active
tags:
  - wiki
  - concept
  - tooling
  - research
  - safety
sources:
  - https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
  - https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
  - https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
  - https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid
  - https://developer.mozilla.org/en-US/docs/Web/CSS/:invalid
  - https://developer.mozilla.org/en-US/docs/Web/CSS/:user-valid
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation
  - https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#constraint-validation
  - https://html.spec.whatwg.org/multipage/semantics-other.html#selector-user-invalid
  - https://www.w3.org/TR/selectors-4/#user-invalid-pseudo
  - https://html.spec.whatwg.org/multipage/input.html
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete
  - https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist
  - queries/第二批蒸餾目標.md
knowledge_class: factual
---

# 表單與combobox

本頁不是已採用表單庫，也不是工坊必須換 Form 實現的工單。蒸餾自 [[queries/第二批蒸餾目標]] **B2-Form**。檢索日 2026-08-15。只談公開平臺合同與 APG 模式，不寫攻擊步驟、繞過或憑證。

## 一句話定義

表單是瀏覽器替作者收值、做客戶端約束、再提交的平臺合同。Constraint Validation 是其中的約束層。Combobox 是 [APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) 的一種**模式**：一個輸入面 + 預設收起的彈出層（listbox / grid / tree / dialog），用來從集合裡選值或給建議。APG 不是規範，見 [[concepts/無障礙與包容設計]]。

## 為什麼重要

空必填一進頁就全紅、把搜尋選擇做成無角色 `div`、把 HTML `autocomplete` 和 `aria-autocomplete` 併成一個詞，都會讓人填不下去或讀屏報錯。開局嚮導、設定項、篩選都是表單；看起來像「可搜下拉」的控制元件往往該對 combobox，卻不是獨立 listbox，也不是瀏覽器自動填充。本頁只蒸平臺與模式，不寫成「工坊已採用某 Form 庫」。

## 權威入口

檢索日 2026-08-15。下表 **14** 條對齊 B2-Form 約條。採集行不在本頁映象。APG 總論、符合性與命令面板疊法見 [[concepts/無障礙與包容設計]]，本表不重抄。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [APG Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | B2-Form 樞紐；輸入面 + 彈出層；可編輯與僅選擇分軌 |
| 2 | [APG Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) | 獨立選項列表；不是 combobox 的輸入面 |
| 3 | [APG Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | combobox 的 dialog 彈出層；命令面板疊法回指無障礙頁 |
| 4 | [MDN `:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid) | Baseline Widely（約 2023-11）；互動或提交後再標無效 |
| 5 | [MDN `:invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:invalid) | Baseline Widely（約 2015-07）；約束一失敗就匹配 |
| 6 | [MDN `:user-valid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-valid) | 與 `:user-invalid` 同檔；互動後再標有效 |
| 7 | [MDN Constraint validation](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) | 屬性約束、`checkValidity` / `reportValidity`、`setCustomValidity` |
| 8 | [WHATWG Constraints](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#constraint-validation) | 候選、受苦狀態、靜態/互動校驗、`user validity` |
| 9 | [WHATWG `:user-invalid`](https://html.spec.whatwg.org/multipage/semantics-other.html#selector-user-invalid) | HTML 選擇器：`input` / `textarea` / `select` 且 `user validity` 為真 |
| 10 | [Selectors 4 `:user-invalid`](https://www.w3.org/TR/selectors-4/#user-invalid-pseudo) | 下限：提交後、再次互動或 reset 前；其餘可 UA 定義 |
| 11 | [WHATWG `input`](https://html.spec.whatwg.org/multipage/input.html) | 使用者提交變更時把 `user validity` 置真；reset 置回假 |
| 12 | [MDN `autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete) | 瀏覽器自動填充令牌；≠ `aria-autocomplete` |
| 13 | [MDN `datalist`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist) | 建議列表；隱式 role 是 listbox；本波標 Limited |
| 14 | [WHATWG autocomplete](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill) | 自動填充令牌真源；本頁不映象令牌表 |

TanStack Form 入口不在本表。鄰接邊界見 [[concepts/TanStack查詢與路由]]。

## 如何運作

### 原生 Constraint Validation

HTML 先用語義 `type`（如 `email` / `url`）和屬性（`required`、`pattern`、`min` / `max`、`minlength` / `maxlength`、`step`）宣告約束，不必先寫指令碼。更復雜的跨欄位約束用 `setCustomValidity(message)`：空字串表示透過，非空字串是自定義錯誤文案。

WHATWG 把控制元件分成：是不是**約束校驗候選**、是否正**受苦**於某條效度狀態（缺值、型別不符、pattern、過長過短、越界、步進、壞輸入、自定義錯誤）。不在任何受苦狀態，才算滿足約束。`disabled` 的元素仍可在 DOM 裡帶效度狀態，但被排除出候選，提交時不會攔。

兩套觸發：

1. **靜態**：`checkValidity()`。只算過不過，通常用來決定 `:valid` / `:invalid`。
2. **互動**：`reportValidity()` 或使用者提交表單。會向用戶報告失敗。

`novalidate` / `formnovalidate` 關掉提交時的互動校驗。對 `HTMLFormElement` 調 `submit()` **不會**走互動校驗；要點提交按鈕，或走會走提交演算法的那條（如 `requestSubmit()`）。`minlength` / `maxlength` 只在使用者編輯過的值上檢查，指令碼賦值即使再調 `checkValidity()` 也不走這兩條——規範原文如此。

自定義元素要進 `<form>` 的提交與校驗，真源是 `formAssociated` + `ElementInternals`（`setFormValue` / `setValidity`），不是影子樹裡藏了一個 `<input>`。本頁不重抄，見 [[concepts/Lit與自定義元素]]。

客戶端約束改善體驗，**不是**安全機制。WHATWG 寫明伺服器不應依賴它。本頁到此為止，不寫繞過步驟。服務端失敗體若走 HTTP API，見 [[concepts/HTTP合同與問題詳情]]；那是響應信封，不是欄位旁的校驗文案。

### `:invalid` 與 `:user-invalid`

`:invalid` 匹配「候選但不滿足約束」的元素，以及擁有這類後代的 `form` / `fieldset`。空的必填框在進頁時就已經是 `:invalid`。用它畫紅框，會在使用者還沒碰表單時全紅。

HTML 給 `input` / `textarea` / `select` 一個 **`user validity` 布林**，初值為假。為真之後，不滿足約束的控制元件才匹配 `:user-invalid`；滿足約束的才匹配 `:user-valid`。規範裡能核到的置真時機：

- 使用者**提交**一次變更（與 `change` 一起；拖滑塊鬆手這類「先操作再提交」也算）；
- 表單進入提交事件流程時，該表所有可提交控制元件一併置真。

`reset` 演算法把 `user validity` 置回假。Gecko 預設給 `:user-invalid` 畫紅光，不給 `:invalid` 畫預設樣式——這是引擎預設，不是「`:invalid` 已廢」。

[Selectors 4](https://www.w3.org/TR/selectors-4/#user-invalid-pseudo) 只規定**下限**：提交過之後、使用者再次與該控制元件互動或 reset 之前，必須能匹配；也允許在「改過值並失焦」等其它合適時機匹配。精確規則交給宿主語言；HTML 用 `user validity` 落地。MDN `:user-invalid` 第一句按「互動之後」，第二句複述的是 Selectors 4 下限（提交後到再次互動前）。兩句不要併成「只在提交後的一個窗口裡亮」。`:user-invalid` 仍必須同時是 `:invalid`。

MDN：`:user-invalid` / `:user-valid` 為 Baseline Widely，約 2023-11 起跨引擎；`:invalid` 約 2015-07。HTML 選擇器條文只點名 `input` / `textarea` / `select`。FACE 自定義元素能否匹配 `:user-invalid`，本頁標**不確定**；它們仍可走約束校驗與 `:invalid`，校驗 API 回指 Lit 頁。

欄位錯要貼在欄位旁並保持到改對。Toast 與通知分層見無障礙頁，本頁不重開。

### APG combobox

APG：combobox 是帶關聯彈出層的輸入控制元件。彈出層可以是 listbox、grid、tree 或 dialog。預設**收起**。開啟條件由實現自定：下箭頭 / 開啟按鈕、獲焦即開、或可編輯時打到若干字元才開。

最能定互動的是能不能打字：

- **僅選擇（select-only）**：值只能從彈出層選。有的瀏覽器會把 `size="1"` 的 HTML `select` 對輔助技術報成 combobox。
- **可編輯（editable）**：可打任意值，或只允許離散集合（此時打字用來過濾建議）。

自動完成有四種形態，對應 `aria-autocomplete`：

| 形態 | `aria-autocomplete` | 要點 |
|---|---|---|
| 無自動完成 | `none` | 彈出層內容不隨已打字元變 |
| 列表 + 手選 | `list` | 建議隨輸入變；不選手動項則保留已打字串 |
| 列表 + 自動選 | `list` | 第一項自動高亮；失焦時除非改選或改字，否則吃掉該項 |
| 列表 + 行內補全 | `both` | 同上，且未打完的補全串出現在游標後並呈選中態 |

輸入面元素 `role="combobox"`，用 `aria-controls` 指向彈出層（可見時必須設；指向不可見元素也合法）。ARIA 1.0 曾用 `aria-owns`，APG **強烈建議**改 `aria-controls`。彈出層不是 listbox 時，還要設對應的 `aria-haspopup`（`grid` / `tree` / `dialog`）；listbox 是 combobox 的隱式 `aria-haspopup`。`aria-expanded` 隨開合。listbox / grid / tree 彈出層：DOM 焦點留在 combobox，輔助技術焦點走 `aria-activedescendant`。**dialog 彈出層相反**：DOM 焦點進入對話方塊，不走 `aria-activedescendant`。

本頁不搬整份鍵盤表。只留區分點：Tab 只進 combobox 本身，開啟按鈕和彈出層不進頁級 Tab 序；Escape 關層，可選擇再清空；在 listbox 彈出層裡選中跟隨焦點，且一次只選一個建議。

### listbox、autocomplete、datalist 易混

APG 自己把 combobox 和 **listbox / menu button** 分開：combobox 能把已選值呈現在可複製的輸入面裡；使用者可在彈出層裡逛一圈再 Escape，**不改**先前的值。單選 listbox 一移動焦點就改值，Escape 沒有這套撤銷。menu button 不能標 `aria-required`，收起時也沒有「當前值」。命令面板沒有 APG 專模，是 Dialog + Listbox 的疊用，見無障礙頁；不要把命令面板寫成 combobox 專模。

三套「自動完成」不是一個詞：

1. **HTML `autocomplete`**：給使用者代理的自動填充令牌（`email`、`current-password`、`shipping postal-code` 等）。有助於 WCAG 2.2 成功標準 1.3.5 Identify Input Purpose。`off` 常被密碼管理器忽略。這是填充，不是建議列表鍵盤模型。
2. **`aria-autocomplete`**：combobox 彈出層如何隨輸入給建議。
3. **`<datalist>`**：給關聯控制元件的建議 `<option>`。它本身不是輸入；控制元件仍可接受透過校驗的任意值。隱式 ARIA role 是 **listbox**。MDN 本波標 **Limited availability**，不是 Baseline；並記下縮放、高對比、部分讀屏組合不朗讀建議等缺口。`input` + `datalist` **不是** APG combobox 實現。

控制元件換皮（`appearance: base` / `base-select`）和 `field-sizing` 只回指 [[concepts/CSS平臺2026]]（該頁宣告不重抄 B2-Layout 的 `field-sizing`）。本頁不蒸換皮。

超媒體表單（宣告式 `hx-*` 提交、伺服器回 HTML 碎片）仍坐在原生 `<form>` 上，約束層不自動消失。見 [[concepts/HTMX與超媒體]]。

## 必須保留的衝突

- **APG 是模式指南，不是 Rec。** 跟了 combobox 示例 ≠ 符合 WCAG。符合性仍看無障礙頁的 WCAG 軸。
- **`:invalid` ≠ `:user-invalid`。** 前者進頁即可亮；後者看 HTML 的 `user validity`。
- **Selectors 4 下限 ≠ HTML 精確規則 ≠ MDN 兩句摘要。** Selectors 4 允許提交後以外的匹配；HTML 用 `user validity`；MDN 第二句不要當成「只在提交後亮」。
- **HTML `:user-invalid` 條文只點名 `input` / `textarea` / `select`。** FACE 能否匹配，不確定。
- **combobox ≠ listbox ≠ menu button ≠ 命令面板。** 命令面板疊 Dialog+Listbox。
- **`aria-autocomplete` ≠ HTML `autocomplete` ≠ `<datalist>`。** 建議行為、自動填充、原生建議列表是三份合同。
- **`datalist` 不是 Baseline（MDN 本波 Limited），也不是 APG combobox。**
- **ARIA 1.0 的 `aria-owns` 不是現行推薦。** APG 要 `aria-controls`。
- **`form.submit()` 跳過互動校驗**；點提交按鈕或 `requestSubmit()` 才會走。`novalidate` 再關一檔。
- **TanStack Form 只是鄰接。** 產品頁 v1 Latest 與 v2 alpha 並存，見 [[concepts/TanStack查詢與路由]]。B2-Form 蒸的是 APG / `:user-invalid`，不是「已採用 Form」。
- 客戶端約束 ≠ 服務端校驗 ≠ HTTP 問題詳情信封。

## 例子

- 正例：必填郵箱用原生 `type="email"` + 可見 `<label>`；紅框走 `:user-invalid`；錯誤文字寫在欄位旁並用 `aria-describedby` 掛上。
- 正例：可搜地點做成 APG combobox（可編輯 + list 彈出層），`aria-expanded` / `aria-controls` / `aria-activedescendant` 按開合更新。
- 正例：只允許列舉值、又不需要打字過濾時，優先原生 `<select>`，或 select-only combobox；不要先上無角色列表。
- 正例：姓名、地址欄位帶正確的 HTML `autocomplete` 令牌；建議下拉另走 combobox 或（知道缺口的前提下）`datalist`。
- 反例：用 `:invalid` 給空必填進頁全紅。
- 反例：把 combobox 做成「看起來像搜尋、讀屏卻是一堆無角色 div」。
- 反例：把 HTML `autocomplete="list"` 或 `datalist` 寫成已經實現了 `aria-autocomplete`。
- 反例：因本頁出現 Form / combobox，就寫進 recipe 或「已採用 TanStack Form」。

## 邊界與易混概念

- 不包括：已採用表單庫、髮卡依賴、成品皮膚、卡 JSON/PNG、攻擊或憑證。
- 不包括：整頁複述 APG 鍵盤表、WCAG 成功標準全文、ElementInternals 步驟、控制元件換皮語法。
- 不包括：把本頁蒸成 TanStack Form 版本面。
- 無障礙總論、Toast ≠ 欄位錯、命令面板疊法 → [[concepts/無障礙與包容設計]]。
- FACE / `setValidity` → [[concepts/Lit與自定義元素]]。
- `field-sizing`、`appearance: base` / `base-select` → [[concepts/CSS平臺2026]]。
- 超媒體提交 → [[concepts/HTMX與超媒體]]。
- API 錯誤信封 → [[concepts/HTTP合同與問題詳情]]。
- 無頭庫的 combobox 行為合同 → [[concepts/無頭元件與根節點]]；無頭 ≠ 已有皮膚。
- 易混：聽到「autocomplete」就以為只有一種。
- 易混：聽到「下拉」就以為是 combobox。原生 `select`、獨立 listbox、menu、`datalist`、dialog 日曆都可能長得像下拉。

## 對映到本倉庫

當前工坊沒有「已採用 Form 庫」。本頁只問平臺合同，不改髮卡依賴。

開局嚮導和授予者表是表單：可見標籤、原生約束、`:user-invalid`、欄位旁持久錯誤。控制中心設定同樣是表單。若做可搜選擇，按 combobox 模式，不要用無角色列表冒充。跨 iframe 沒有跨文件表單合同——框內控制元件參加的是**框內** document 的 `<form>`，見 [[concepts/酒館宿主與iframe分層]]。自定義元素要進宿主頁表單，回指 Lit 頁，不在本頁重寫 FACE。

服務端或 Gateway 的失敗體若已是 HTTP JSON，對齊 [[concepts/HTTP合同與問題詳情]] 的「選一種信封」；不要和欄位旁文案併成一種「標準錯誤」。HTMX 式碎片更新若出現，約束仍在原生表單上，除非作者顯式 `novalidate`。

## 來源與證據

- Combobox / listbox 分層與 `aria-controls`：APG Combobox、APG Listbox（2026-08-15 直讀）。
- `user validity` 與選擇器範圍：WHATWG form-control-infrastructure、semantics-other、input 的 change / reset。
- Selectors 4 下限與「可在其它合適時機匹配」：Selectors Level 4 § 12.3.4。
- Baseline 日期：MDN `:invalid`、`:user-invalid`、`:user-valid` 頁頭。
- `datalist` Limited 與隱式 listbox：MDN `datalist` 本波。
- 自動填充令牌與 1.3.5：MDN `autocomplete` Accessibility 節。
- 查詢賬本：[[queries/第二批蒸餾目標]] B2-Form。

已知衝突見上節，不靜默覆蓋。FACE 是否匹配 `:user-invalid`、各引擎把「提交變更」算到哪一次按鍵：未跑真機，標不確定。Wiki 門不要求真機。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞（含 `safety`：只談「客戶端校驗不是安全機制」）
- [x] 已釋出到正式區

## 相關內容

- [[concepts/無障礙與包容設計]]
- [[concepts/Lit與自定義元素]]
- [[concepts/CSS平臺2026]]
- [[concepts/TanStack查詢與路由]]
- [[concepts/HTMX與超媒體]]
- [[concepts/HTTP合同與問題詳情]]
- [[concepts/無頭元件與根節點]]
- [[concepts/開局頁路徑]]
- [[concepts/控制中心與狀態列]]
- [[concepts/酒館宿主與iframe分層]]
- [[queries/第二批蒸餾目標]]
