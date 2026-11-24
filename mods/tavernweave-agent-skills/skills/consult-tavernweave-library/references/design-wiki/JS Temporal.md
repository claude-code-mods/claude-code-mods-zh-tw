---
title: JS Temporal
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
  - https://tc39.es/proposal-temporal/
  - https://github.com/tc39/proposal-temporal
  - https://github.com/tc39/proposals/blob/main/finished-proposals.md
  - https://github.com/tc39/ecma262/pull/3759
  - https://github.com/tc39/ecma402/pull/1044
  - https://tc39.es/ecma262/
  - https://tc39.es/ecma262/2026/
  - https://262.ecma-international.org/17.0/
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
  - https://caniuse.com/temporal
  - https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/139
  - https://developer.chrome.com/release-notes/144
  - https://nodejs.org/en/blog/release/v26.0.0
  - https://tc39.es/proposal-temporal/docs/
  - https://github.com/tc39/notes/blob/main/meetings/2026-03/march-11.md
  - queries/第三批蒸餾目標.md
  - concepts/後端架構名詞與工坊對照.md
knowledge_class: factual
---

# JS Temporal

本頁不是已採用技術，也不是工坊必須換掉 `Date` 的工單。檢索時間：2026-08-14。蒸餾自 [[queries/第三批蒸餾目標]] B3-Temp。WebFetch 核過 [proposal-temporal](https://tc39.es/proposal-temporal/) 與 [MDN Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal)、[MDN Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)。

## 一句話定義

JS `Temporal` 是 ECMAScript 的日期時間名稱空間（像 `Math`，不是構造器），用來替換遺留 `Date`。它已是 TC39 **Stage 4**，但**還沒有**寫進現行 ECMA-262 正文。這是語言 API，**不是** Temporal.io 工作流引擎。

## 為什麼重要

Stage 4 只證明委員會收口、有相容實現。外文「已經進 ES2026」把階段號當成已出版規範，不可信。Firefox / Chrome / Node 已開，Safari 穩版未開。卡內 iframe 若當「全瀏覽器都有」，會在 WebKit 上靜默沒有這個全域性物件。

## 權威入口

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [proposal-temporal 活稿](https://tc39.es/proposal-temporal/) | Stage 4 Draft / 2026-07-27；寫明擬加入 ECMA-262 |
| 2 | [提案倉 README](https://github.com/tc39/proposal-temporal) | 「將併入」262 / 402，倉隨後歸檔 |
| 3 | [finished-proposals](https://github.com/tc39/proposals/blob/main/finished-proposals.md) | 已 Stage 4；**預期出版年 2027** |
| 4 | [ECMA-262 PR #3759](https://github.com/tc39/ecma262/pull/3759) | 併入 PR，截至 2026-08-13 **仍開** |
| 5 | [ECMA-402 PR #1044](https://github.com/tc39/ecma402/pull/1044) | Intl / Era Month Code 併入，仍開 |
| 6 | [現行 ECMA-262 活稿](https://tc39.es/ecma262/) | Draft 2026-08-14，標題已是 ES2027；正文無 `Temporal` |
| 7 | [ES2026 快照](https://tc39.es/ecma262/2026/) | 年刊快照，無 `Temporal` |
| 8 | [ECMA-262 第 17 版](https://262.ecma-international.org/17.0/) | 2026-06 大會批准的正式 2026 版，無 `Temporal` |
| 9 | [MDN Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal) | Limited availability，不是 Baseline |
| 10 | [MDN Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) | 仍是 Baseline；文內稱 Date 為 legacy |
| 11 | [Can I use Temporal](https://caniuse.com/temporal) | Safari 穩版到 27 未開；TP 預設關 |
| 12 | [Firefox 139 說明](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/139) | 2025-05-27 已開 |
| 13 | [Chrome 144 說明](https://developer.chrome.com/release-notes/144) | 2026-01-13 已開；標題寫 “Temporal in ECMA262” |
| 14 | [Node 26 釋出](https://nodejs.org/en/blog/release/v26.0.0) | 2026-05-05 預設開 |
| 15 | [提案文件](https://tc39.es/proposal-temporal/docs/) | 型別與 cookbook，不是規範真身 |
| 16 | [TC39 2026-03-11 記錄](https://github.com/tc39/notes/blob/main/meetings/2026-03/march-11.md) | Conclusion：advances to stage 4 |

上表 **16** 條。B3-Temp 採集行不在本頁映象。

## 如何運作

### Stage 4 ≠ 已寫入現行 ECMA-262

兩邊都留：

- **已 Stage 4**：2026-03-11 全會無異議透過。活稿抬頭是 Stage 4 Draft。finished-proposals 已列 Temporal。Firefox 139、Chrome 144、Node 26 已出貨。
- **未進現行正文**：#3759 / #1044 仍開。2026-08-14 抓取的 [活稿](https://tc39.es/ecma262/) 與 [ES2026 快照](https://tc39.es/ecma262/2026/)、[第 17 版](https://262.ecma-international.org/17.0/) 均搜不到 `Temporal`。finished-proposals 的預期出版年是 **2027**，不是 2026。

外文「已經進 ES2026」把 Stage 4 或引擎出貨寫成已出版年刊。對照正式快照，這句話不可信。Chrome 144 說明標題寫 “Temporal in ECMA262”，那是實現發行詞，不能反過來證明 #3759 已合入。

活稿自我介紹說「含已 Stage 4、將進下一本快照的提案」。Temporal 已 Stage 4，卻還停在併入 PR。兩邊都留：目錄承諾 vs 正文尚未出現。

### 型別怎麼拆

`Temporal` 不可 `new`、不可當函式調。按提案文件與 MDN：

| 型別 | 表示什麼 |
|---|---|
| `Instant` | 歷史上唯一瞬間（Unix epoch 納秒），無時區、無曆法 |
| `ZonedDateTime` | 瞬間 + IANA 時區 + 曆法；DST 安全算術 |
| `PlainDate` / `PlainTime` / `PlainDateTime` | 日曆日、牆上鍾、日期+鍾；**不帶**時區 |
| `PlainYearMonth` / `PlainMonthDay` | 「2020-10 例會」「每年 7-14」 |
| `Duration` | 長短，用於加減 |
| `Now` | 取當前瞬間 / 系統時區 / ISO 日曆日 |

序列化走 RFC 9557（ISO 8601 / RFC 3339 的擴充套件，可帶時區與 `u-ca=`）。預設曆法是 ISO 8601。物件不可變：改欄位用 `with()` / `add()`，返回新例項。

### Date 的坑只點到為止

MDN：`Date` 同時冒充時間戳和「年月日時分秒」；元件只能按 UTC 或裝置本地時區讀，沒有任意 IANA 時區，也沒有「無時區的日曆日 / 牆上鍾」。setter 會就地改；`Date.parse` 字串不能穩定解析；月份從 0 起。MDN 因此把 Date 標成 legacy，並寫「新程式碼考慮 Temporal，先查相容」。Date 仍是 Baseline Widely available。兩邊都留：規範意圖替換 ≠ 今天可以當 Date 已死。

### Safari 穩版未開

[Can I use](https://caniuse.com/temporal)：Chrome / Edge 144+、Firefox 139+ 已開；Safari 3.1–27 與 iOS Safari 均未開；Safari TP **預設關**。提案 README 給 Firefox / Chrome / Node 標了 shipped，JavaScriptCore/Safari 只掛 bug，沒有 shipped。MDN 標 Limited availability，不是 Baseline。未跑真機；穩版結論轉引上表，不寫成「本機已驗」。

生產若要跨 Safari，提案 README 列 `@js-temporal/polyfill`（Alpha）與 `temporal-polyfill`（Stable）。倉內自帶 polyfill 只給文件 playground，README 寫明 **DO NOT** 用在專案裡。

## 必須保留的衝突

- Stage 4 ≠ 已寫入現行 ECMA-262。finished-proposals 預期年 **2027**；#3759 / #1044 仍開；ES2026 第 17 版與 2026-08-14 活稿均無 `Temporal`。外文「進 ES2026」不可信。
- 活稿自稱收錄已 Stage 4 提案，與正文尚未出現並存。
- Chrome 144「in ECMA262」是實現發行詞，不是 #3759 已合的證明。
- 引擎已開 ≠ 規範正文已合入 ≠ Baseline。
- MDN 稱 Date 為 legacy，Date 仍是 Baseline；Temporal 不是 Baseline。
- Safari 穩版未開，與 Firefox / Chrome / Node 已開並存。Safari TP 預設關 ≠ 穩版已開。
- JS Temporal ≠ Temporal.io。
- 工坊「現在不用」≠「API 不正當」。本頁**不是**「工坊必須換掉 Date」。

## 例子

- 正例：只要「日曆上的一天」、不要時區，用 `Temporal.PlainDate`，不要 `new Date(y, m, d)`。
- 正例：先 `typeof Temporal === "undefined"` 再決定墊片或退回 `Date`。
- 反例：因 Stage 4 或部落格標題，寫成「ES2026 已含 Temporal」。
- 反例：把本頁與 Temporal.io / B3-WF 併成一個「Temporal」。
- 反例：酒館 iframe 直接用 `Temporal.Now`，不查 Safari。
- 反例：把 MDN「Date 是 legacy」讀成「Date 已從語言刪除」。

## 邊界與易混概念

- 不包括：工坊已採用宣告、墊片選型工單、攻擊或憑證。
- JS Temporal ≠ Temporal.io。後者見 [[concepts/Saga三義與補償]]。
- Date 的坑點到為止，不在本頁重寫 Date 全書。
- 區分方法：先問是語言 API 還是工作流引擎；再問依據是全會記錄、併入 PR，還是年刊快照。

## 對映到本倉庫

短句已在 [[concepts/後端架構名詞與工坊對照]]「JS Temporal 未進現行 ECMA-262」。本頁是那一句的入口與衝突展開，不是釋出令。卡內時間、狀態列、開局頁今天仍用 `Date` 或宿主格式化即可，見 [[concepts/控制中心與狀態列]]、[[concepts/開局頁路徑]]。要試 `Temporal`，必須特性檢測，並接受 Safari 穩版沒有全域性物件。這是產品落點，不是對 Temporal 的行業否定。

## 來源與證據

權威入口上表 16 條。查詢賬本：[[queries/第三批蒸餾目標]] B3-Temp。

已知衝突見上節，不靜默覆蓋。尚缺：WebKit bug 頁本輪未抓；Safari 穩版轉引 Can I use 與提案 README。未跑瀏覽器或酒館真機。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區

## 相關內容

- [[concepts/後端架構名詞與工坊對照]]
- [[concepts/Saga三義與補償]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/控制中心與狀態列]]
- [[concepts/開局頁路徑]]
- [[queries/第三批蒸餾目標]]
