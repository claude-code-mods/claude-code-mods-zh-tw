---
title: COLRv1與增量字型
created: 2026-08-14
updated: 2026-08-15
type: concept
status: active
tags:
  - wiki
  - concept
  - tooling
  - research
sources:
  - https://www.w3.org/TR/css-fonts-4/
  - https://developer.mozilla.org/en-US/docs/Web/CSS/font-palette
  - https://developer.mozilla.org/en-US/docs/Web/CSS/@font-palette-values
  - https://learn.microsoft.com/en-us/typography/opentype/spec/colr
  - https://learn.microsoft.com/en-us/typography/opentype/spec/cpal
  - https://caniuse.com/colr-v1
  - https://caniuse.com/colr
  - https://www.w3.org/TR/IFT/
  - https://www.w3.org/TR/PFE-evaluation/
  - https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_fonts/Variable_fonts_guide
  - https://developer.mozilla.org/en-US/docs/Web/CSS/font-variation-settings
  - https://developer.chrome.com/blog/colrv1-fonts
  - queries/第五批蒸餾目標.md
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
  - concepts/CJK排印與豎排.md
  - concepts/Web效能與INP.md
  - concepts/視覺CSS與設計token.md
knowledge_class: factual
---

# COLRv1與增量字型

本頁不是已採用字棧，也不是工坊必須改嵌字方案的工單。檢索日 2026-08-14。相容摘自各頁正文，不是本機實測。拒盜字型檔，不收字檔案。

對照 [[concepts/CJK排印與豎排]]（CLREQ / `vert`）、[[queries/第三批蒸餾目標]] B3-Img（fonttools / glyphhanger）、[[10-收件箱/寫回候選/第四批-B4-TypeFoundry]]（許可）。本頁只收彩色表、palette、可變軸 CSS、IFT。

## 一句話定義

彩色字與增量字是三層合同：OpenType COLR/CPAL 規定怎麼塗；CSS `font-palette` / 可變軸規定怎麼選槽和軸；Incremental Font Transfer 規定怎麼按補丁增量傳。不要併成「網頁字型」。

## 為什麼重要

同一句「嵌一張彩色可變字」會落到完全不同的合同：檔案有沒有 CPAL、UA 認不認 COLRv1、作者色會不會被夾回 sRGB、投遞是靜態 `unicode-range` 還是 IFT 補丁。混成一詞，就會把 Safari 的 COLRv0、Chrome 的 COLRv1、B3 靜態子集和尚未落地的 IFT 寫成同一條能力。

## 權威入口

檢索日 2026-08-14。下表 **12** 條與 [[10-收件箱/寫回候選/第五批-B5-Font]] 同號。B4-TF-08/09 已點過軸登記與 Fonts 4 URL，本頁展開彩色與 `tech()`，不當新發現。B5-Font 的採集行不在本頁映象。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [CSS Fonts 4](https://www.w3.org/TR/css-fonts-4/) | 樞紐。WD **2026-08-11**。`font-palette` / `@font-palette-values` / `palette-mix()`；`src` 的 `tech()`：`color-COLRv0` `color-COLRv1` `variations` `palettes` `incremental`。Fonts 3 已是 Rec；4 仍是 WD |
| 2 | [MDN `font-palette`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-palette) | Baseline Widely，跨引擎自 **2022-11**。`normal` / `light` / `dark` / `--ident` / `palette-mix()`。調色盤優先於 `color`，即使 `!important` |
| 3 | [MDN `@font-palette-values`](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-palette-values) | 同檔 Baseline。`font-family` 必填；`base-palette`；`override-colors`。dashed-ident **不是** `var()` |
| 4 | [OpenType COLR 1.9.1](https://learn.microsoft.com/en-us/typography/opentype/spec/colr) | 頁標 **2024-05-30**。v0：底向上圖層 + 純色。v1：Paint DAG；漸變、仿射、合成；`PaintVar*` 可隨軸變色停。無 CPAL 則忽略整張 COLR。`0xFFFF` = 前景色 |
| 5 | [OpenType CPAL 1.9.1](https://learn.microsoft.com/en-us/typography/opentype/spec/cpal) | 頁標 **2024-05-29**。sRGB **BGRA**。調色盤 0 為預設。v1 頭帶 `USABLE_WITH_LIGHT/DARK_BACKGROUND`。COLR 必須有 CPAL |
| 6 | [Can I Use COLRv1](https://caniuse.com/colr-v1) | 2026-08-14：Chrome **98+**、Firefox **107+**、Edge 98+。**Safari 至 26.5 / TP 均無** |
| 7 | [Can I Use COLRv0](https://caniuse.com/colr) | Chrome 71+、Firefox 32+。Safari **11+**，**17.0–17.1 空窗**，17.2 起恢復。v0 ≠ v1 |
| 8 | [W3C IFT](https://www.w3.org/TR/IFT/) | CR Draft **2025-11-18**。不是 Rec。無 implementation report。初始子集 + `IFT `/`IFTX` 補丁圖；`iftk` 表鍵 Brotli 差、`ifgk` 字形鍵。`tech(incremental)` 選擇加入 |
| 9 | [PFE Evaluation](https://www.w3.org/TR/PFE-evaluation/) | WG Note **2020-10-15**。IFT 前評測，不是現行編碼。靜態 `unicode-range` 會拆壞 kerning / 塑形（§2.8） |
| 10 | [MDN 可變字型指南](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_fonts/Variable_fonts_guide) | 登記軸：`wght` `wdth` `slnt` `ital` `opsz`。登記軸小寫、自定義軸大寫 |
| 11 | [MDN `font-variation-settings`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variation-settings) | Baseline Widely **2018-09**。有對應高層屬性時勿用；一旦寫出就蓋住 `font-weight` 等。`slnt` 正角與 CSS `oblique` 方向相反 |
| 12 | [Chrome 98 COLRv1](https://developer.chrome.com/blog/colrv1-fonts) | 2022 裝載公告。無 COLRv1 的 UA 可回退同文件單色輪廓。當時 `font-palette` 仍「計劃中」；現以 02 的 Baseline 為準 |

OpenType Variations 總覽是 B4-TF-08，不升編號。

## 如何運作

### 檔案層：COLR 塗，CPAL 給槽

v0 是圖層棧，只能純色；在可變字型裡只能變輪廓。v1 是 Paint 有向無環圖，才能漸變、合成、隨軸變色停。無 CPAL 則整張 COLR 作廢。`0xFFFF` 不是調色盤下標，是前景色。CPAL 槽是 sRGB BGRA；COLR 漸變插值必須線性光 + 預乘 alpha，與 SVG 表預設非線性 sRGB 兩邊留。

### 樣式層：palette 選槽，登記軸走高層

`font-palette` 的 `light` / `dark` 對的是**背景**元資料（CPAL 的 `USABLE_WITH_*`），不是調色盤自己的明暗。`@font-palette-values` 可寫任意 CSS 色；Fonts 4 寫明實現可先映回 sRGB，作者勿依賴寬色一定進字形。登記軸走 `font-weight` 等；自定義軸才走 `font-variation-settings`。

`tech()` 是選擇加入，不是預設能力。同一 `src` 列表可寫 `tech(incremental, color-COLRv1)` 再寫 `tech(incremental, color-COLRv0)`；不支援的 UA 跳過該項。無 COLRv1 時畫同文件單色輪廓，是字形回退，不是調色盤回退。

`font-palette` 可動畫；仍按 discrete 實現的瀏覽器會在兩套調色盤間硬切。`palette-mix()` 是規範插值，不與 02 的 Baseline 句自動對齊。

### 傳輸層：IFT 是補丁，不是第二份子集器

IFT 客戶端：讀當前子集裡的補丁圖 → 按碼位/特性/設計空間選補丁 → 下載並應用 → 補丁可能改掉補丁圖，再讀。`iftk` 是整表 Brotli 差；`ifgk` 按 glyph ID 替換 `glyf`/`loca`/`gvar`/`CFF`/`CFF2`。不要併成「Brotli 分包」。可與 `unicode-range` 並用，range 應等於完全展開後的覆蓋。離線儲存須先 Fully Expand。

Fonts 4 回退例：不支援 incremental 時給 WOFF2，支援時給未壓縮 OT。這與 B2「預設 WOFF2」不是同一條投遞合同。PFE §6：字母文現網靜態子集夠用；塑形文子集會壞讀；CJK 在 4G+ 才第一次談 Patch Subset。2020 的 Range Request / Patch Subset ≠ 08 的 `IFT `/`IFTX` 表。多數內容會用到整份字時，增量往往更慢。

## 必須保留的衝突

- **Safari 無 COLRv1，Chrome/Firefox 有。** 06：Safari 至 26.5/TP 仍無；Chrome 98+、Firefox 107+ 有。07：COLRv0 Safari 現網有（17.0–17.1 除外）。`tech(color-COLRv1)` 必須帶輪廓或 COLRv0 回退。兩邊都留。
- **IFT CRD ≠ 已落地 CJK 方案。** 08 無實現報告。09 是 2020 評測，當時編碼不是 08 的表。B3-Img 仍是現網工具，但 09 §2.8 寫靜態子集會壞塑形。不要寫成「IFT 已取代子集」。
- **Fonts 4 仍是 WD ≠ palette 未實現。** 01 2026-08-11 仍 WD；02/03 自 2022-11 Baseline Widely。
- **CPAL sRGB ≠ `@font-palette-values` 任意 CSS 色。** 檔案槽是 sRGB BGRA；作者色可先被夾到 sRGB。
- **`font-palette` vs `color`。** 調色盤贏，`!important` 也改不了已上色層。
- **`font-variation-settings` vs 高層屬性。** 登記軸應走高層；11 一旦寫出就蓋住。`slnt` 方向與 CSS 相反。
- 本頁對映嵌字時的**彩色表 / palette / 投遞合同**；**不是**「本倉庫已採用 COLRv1 / IFT」。

## 例子

- 正例：彩色圖示字用 `tech(color-COLRv1)` 一項，再寫 COLRv0 或同文件輪廓回退；Safari 落到 v0。
- 正例：換品牌色用 `@font-palette-values` 的 `override-colors`，不要給已上色層加 `color: … !important`。
- 正例：字重走 `font-weight`；只有自定義四字軸才寫 `font-variation-settings`。
- 正例：CJK 大字現網先合法靜態子集（B3-Img）並核許可（B4），不把 IFT CRD 當預設投遞。
- 反例：寫成「彩色向量字已全引擎」或「IFT 已取代 glyphhanger」。
- 反例：從字型天下 / 求字型 / 破解方正·漢儀打包嵌卡。

## 邊界與易混概念

- 不包括：CLREQ / `vert` / UAX #50（[[concepts/CJK排印與豎排]]）；fonttools / glyphhanger（B3-Img）；思源/OFL/字廠通道（B4）；盜版站、破解包、字檔案。
- COLRv0 ≠ COLRv1。v0 是圖層純色；v1 才是 Paint 圖。
- `font-palette` ≠ `color`。已上色層調色盤贏；`0xFFFF` 層才吃前景。
- `light`/`dark` palette ≠ `color-scheme` / `light-dark()`。後者是頁面色方案，見 [[concepts/視覺CSS與設計token]]。
- IFT ≠ 靜態 `unicode-range` ≠ WOFF2。補丁增量保留段間 GPOS/GSUB；靜態切會在共享標點上拆壞版式。
- Fonts 4 WD ≠ `font-palette` 未實現。
- 本頁不是「本倉庫已採用 COLRv1 / IFT」。

## 拒盜與拒破解

不進頁：字型天下 / 求字型 / 字客網 / 「免費商用打包」映象；破解方正·漢儀·華康；把 FFL/訂閱字當 OFL 再分發；付費 OpenType 全文盜貼。許可真身仍看 [[10-收件箱/寫回候選/第四批-B4-TypeFoundry]]。本頁不收字檔案。

## 對映到本倉庫

對映，不是「某張卡已經嵌彩色字」。

- **排印**回 [[concepts/CJK排印與豎排]]；**投遞效能**回 [[concepts/Web效能與INP]] 與 B2-Type-12 font-best-practices。本頁不重寫 WOFF2 預設句。
- **許可**回 [[10-收件箱/寫回候選/第四批-B4-TypeFoundry]]。嵌卡前先核該族是否允許子集/自託管；OFL 一般允許，FFL / 訂閱通道不行或未核。
- **現網預設**：可變軸用高層 CSS；彩色字按 06/07 分 v0/v1 回退；CJK 大字仍先合法子集。IFT 未當現網預設。
- 開局頁 / 訊息樓若嵌 `@font-face`，仍走既有嵌入 UI 與宿主分層，見 [[concepts/開局頁路徑]]、[[concepts/酒館宿主與iframe分層]]。本頁不宣佈已接線。

## 來源與證據

- 彩色表與 palette：CSS Fonts 4；MDN `font-palette` / `@font-palette-values`；OpenType COLR / CPAL 1.9.1。
- 裝載分叉：Can I Use `colr-v1` / `colr`；Chrome 98 公告（當時 palette 仍「計劃中」，現以 02 的 Baseline 為準）。
- 增量傳輸：W3C IFT CR Draft 2025-11-18（無實現報告）；PFE Evaluation 2020-10-15（不是現行編碼）。
- 可變軸：MDN 可變字型指南與 `font-variation-settings`。
- 查詢賬本：[[queries/第五批蒸餾目標]] B5-Font；重疊見 [[queries/第二批蒸餾目標]] B2-Type、[[queries/第三批蒸餾目標]] B3-Img；許可見 [[10-收件箱/寫回候選/第四批-B4-TypeFoundry]]。

已知衝突見上節，不靜默覆蓋。IFT 會否出現實現報告、Safari 會否裝 COLRv1：檢索日之後標未知。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] 三層合同分開寫；入口 12 條與 B5-Font 對齊
- [x] Safari/Chromium COLRv1 分叉、IFT≠靜態子集，兩邊都留
- [x] 未收盜字型檔、破解包、字檔案
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[concepts/CJK排印與豎排]]
- [[concepts/視覺CSS與設計token]]
- [[concepts/Web效能與INP]]
- [[concepts/開局頁路徑]]
- [[concepts/酒館宿主與iframe分層]]
- [[10-收件箱/寫回候選/第五批-B5-Font]]
- [[10-收件箱/寫回候選/第四批-B4-TypeFoundry]]
- [[queries/第五批蒸餾目標]]
- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
