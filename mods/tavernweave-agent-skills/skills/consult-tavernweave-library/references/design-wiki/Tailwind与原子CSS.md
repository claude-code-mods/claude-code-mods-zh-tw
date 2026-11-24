---
title: Tailwind與原子CSS
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
  - https://tailwindcss.com/docs/upgrade-guide
  - https://tailwindcss.com/docs/functions-and-directives
  - https://tailwindcss.com/docs/theme
  - https://tailwindcss.com/docs/styling-with-utility-classes
  - https://unocss.dev/presets/
  - https://unocss.dev/presets/wind3
  - https://panda-css.com/docs/overview/why-panda
  - queries/第三批蒸餾目標.md
  - concepts/視覺CSS與設計token.md
  - concepts/前端架構名詞與取捨.md
knowledge_class: factual
---

# Tailwind與原子CSS

本頁不是已採用皮膚，也不是髮卡 `pack`，也不是工坊必須上 utility 的工單。檢索時間：2026-08-14。只談公開工具鏈入口與棄用合同。賬本樞紐是 [[queries/第三批蒸餾目標]] 的 **B3-TW**。

## 一句話定義

原子 CSS（utility-first）是在標記上疊單職責類，少寫選擇器戰爭。Tailwind v4、UnoCSS、Panda 都走這條路，但入口、主題合同和生成時機不同：v4 用 CSS `@theme` 變數；Uno 用預設包；Panda 是構建期 CSS-in-JS，吐原子 CSS。

## 為什麼重要

獨立站點可以 utility + token 並行。嵌入別人的文件時，utility 容易漏進宿主全域性。看文件時必須先分清三句：`theme()` 已棄；Uno 的 `preset-uno` 已改名 `wind3`；`wind3` 對標 Tailwind 3，`wind4` 是另一包。把相容示例寫成推薦，或把舊包名當現行入口，會配錯鏈。

## 權威入口

B3-TW 樞紐是 Tailwind v4 升級指南。下列 **7** 條是 2026-08-14 直讀過的官方頁，不是映象。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [Tailwind v4 升級指南](https://tailwindcss.com/docs/upgrade-guide) | 樞紐；CSS-first；`theme()` 建議改變數；JS 配置不再自動發現 |
| 2 | [Functions and directives](https://tailwindcss.com/docs/functions-and-directives) | `theme()` 官方標 deprecated；現行是 `@theme` / `--alpha()` / `--spacing()` |
| 3 | [Theme variables](https://tailwindcss.com/docs/theme) | `@theme` 既出 CSS 變數又生成 utility；`:root` 變數不自動出類 |
| 4 | [Styling with utility classes](https://tailwindcss.com/docs/styling-with-utility-classes) | utility-first 的官方說法 |
| 5 | [UnoCSS Official Packages](https://unocss.dev/presets/) | `preset-uno` / `preset-wind` 已棄，改名 `@unocss/preset-wind3` |
| 6 | [Wind3 preset](https://unocss.dev/presets/wind3) | Tailwind 3 / Windi 緊湊預設；不保證完全相容 |
| 7 | [Why Panda](https://panda-css.com/docs/overview/why-panda) | 構建期靜態分析 + PostCSS 吐原子 CSS；不是執行時 emotion |

vanilla-extract / CSS Modules 屬 **B3-CssT**，不進本表。daisyUI / Flowbite 是元件層，見 [[queries/前端視覺與靈感站點蒸餾目標]]。

## 如何運作

### Tailwind v4：CSS 當配置

v3 的 `tailwind.config.js` + `@tailwind base/components/utilities` 不再是預設。v4 入口是 `@import "tailwindcss"`，token 寫在 `@theme { --color-… }`。PostCSS 外掛改到 `@tailwindcss/postcss`；Vite 建議 `@tailwindcss/vite`；CLI 改到 `@tailwindcss/cli`。瀏覽器底線：Safari 16.4+、Chrome 111+、Firefox 128+；更老的瀏覽器官方讓留 v3.4。

`@theme` 不是普通 `:root`。它會指示框架生成對應 utility（`--color-mint-500` → `bg-mint-500`）。只想要變數、不要類，用 `:root`。

### theme() 已棄，相容示例不是推薦

[Functions](https://tailwindcss.com/docs/functions-and-directives) 把 `theme()` 放在 Compatibility，原話：This function is deprecated，建議用 CSS 主題變數。升級指南仍演示 `theme(colors.red.500)` → `var(--color-red-500)`，並寫媒體查詢裡變數不好用時仍可用 `theme(--breakpoint-xl)`（點號改成 CSS 變數名）。以「已棄、改用變數」為一句；不要把相容示例寫成現行寫法。

JS 配置仍可用 `@config` 顯式載入，但不再自動發現。`resolveConfig` 已刪，官方讓直接讀 CSS 變數或 `getComputedStyle`。`corePlugins` / `safelist` / `separator` 在 v4 JS 配置裡不支援。

### Uno：preset-uno 就是 wind3，不是 wind4

官方包表把 `@unocss/preset-uno` 和 `@unocss/preset-wind` 都標 deprecated，改名 `@unocss/preset-wind3`。npm 包 README 同一句。`unocss` 元包可 `import { presetWind3 } from 'unocss'`。

`wind3` 對標 Tailwind **3** / Windi，繼承 `preset-mini`，明文不保證完全相容（引號內容、任意 `bg-[…]` 會當顏色等）。`@unocss/preset-wind4` 是另一包，對標 Tailwind 4，主題鍵名有改（`fontFamily` → `font`，`breakpoints` → `breakpoint`）。舊文寫 `presetUno()` 時，現行入口是 `presetWind3()`，不要跳到 wind4。

### Panda：構建期 CSS-in-JS，產物是原子 CSS

Panda 自稱解決 RSC / 服務端時代的執行時 CSS-in-JS。靜態分析 + PostCSS 在構建期生成原子 CSS；codegen 出輕量 JS，不在瀏覽器裡注入 `<style>`。token 寫法受 W3C Design Tokens 影響，但 DTCG 2025.10 仍是 CG 終稿，不是 W3C Standard，見 [[concepts/視覺CSS與設計token]]。官方寫明：純 HTML/CSS、PHP 模板、要絕對零 JS 時不要用 Panda。

Panda 也出現在 **B3-CssT**（vanilla-extract 對照）。本頁只記它是原子 CSS 引擎；CSS Modules ≠ CSS module scripts 留給那條。

## 必須保留的衝突

- **`theme()` 已棄 ≠ 升級指南里還能寫。** Functions 頁標 deprecated；升級指南仍給媒體查詢相容寫法，且點號改成 `theme(--breakpoint-xl)`。以「已棄、改用變數」記賬，不把相容示例寫成推薦。
- **`preset-uno` 已改名 wind3。** 官方包表與 npm 都寫 deprecated → `@unocss/preset-wind3`。`preset-wind` 同一改名。`wind4` 是另包，不要並進這一句。
- **Uno 相容口號 ≠ 類名合同。** wind3 目標是 Tailwind/Windi 緊湊相容，文件同時列引號、`background-position`、動畫名衝突。
- **Panda「W3C token spec」≠ Standard。** 營銷句受 DTCG 影響；現行仍是 CG 終稿。兩邊都留。
- **對映 ≠ 採用。** 獨立站可用；嵌入宿主的卡不要當已採用。本頁不是已採用皮膚。

## 例子

- 正例：v4 專案用 `@theme` 定義 `--color-*`，自定義 CSS 寫 `var(--color-red-500)`，不寫 `theme(colors.red.500)`。
- 正例：Uno 新專案裝 `@unocss/preset-wind3` 或從 `unocss` 引 `presetWind3`；要對齊 Tailwind 4 再顯式換 `preset-wind4` 並改主題鍵。
- 正例：獨立工坊站可以 utility + token；嵌入宿主的卡 UI 用 BEM / `data-*`，見 [[concepts/前端架構名詞與取捨]]。
- 反例：把升級指南里的 `theme()` 示例當成 v4 推薦 API。
- 反例：把 `preset-uno` 寫成現行包名，或把改名讀成「已經變成 wind4」。
- 反例：把本頁寫成「本倉庫已採用 Tailwind v4 / Uno / Panda」，或把 daisyUI 當成引擎本身。

## 邊界與易混概念

- 不包括：本倉庫已採用哪套 utility、成品皮膚、卡 JSON/PNG、憑證。
- 不包括：vanilla-extract / CSS Modules（B3-CssT）；token 構建 Style Dictionary（B2-Token）；Vite 整鏈（B2-Build），見 [[concepts/構建鏈與Vite]]。
- 易混：原子 CSS ≠ 元件庫。daisyUI / Flowbite / shadcn 建立在 utility 之上，不是引擎。
- 易混：`@theme` 變數 ≠ 普通 `:root` 變數。前者出類，後者不出。
- 易混：`wind3` ≠ `wind4`。改名只把 uno/wind 收到 wind3。
- 易混：Panda 的 `token()` 是生成程式碼裡的查詢函式，不是 Tailwind 已棄的 `theme()`。
- 區分：先問「主題值從哪讀」，再問「類是掃描標記生成還是 codegen」。

## 對映到本倉庫

對映放最後，不當過濾器。

- **獨立工坊站 / 文件：** 行業可以選 Tailwind v4 或 Uno；本頁只提供現行入口，不寫「工坊必須上 utility」。
- **嵌入 UI / 同文檔掛載：** utility 容易漏進宿主，見 [[concepts/視覺CSS與設計token]]、[[concepts/前端架構名詞與取捨]]。卡側優先 `data-*` / BEM。
- **遠端頁 / git-mount：** 真身在遠端倉構建，殼只掛 blob，見 [[concepts/git掛載與遠端真身]]。遠端若用 v4，主題走 CSS 變數，不把 `theme()` 寫進新 CSS。
- **無頭元件：** Base UI / Radix 不捆 Tailwind，見 [[concepts/無頭元件與根節點]]。

本頁不寫「已採用 Tailwind v4 / Uno / Panda」。B3-CssT 收回來另頁，不併進這裡。

## 來源與證據

- Tailwind v4 入口與 `theme()` 棄用：升級指南、Functions and directives、Theme variables（2026-08-14 直讀）。
- Uno 改名：Official Packages 與 Wind3 preset；`preset-uno` / `preset-wind` → `@unocss/preset-wind3`；`wind4` 另包。
- Panda 構建期原子 CSS：Why Panda；DTCG 仍是 CG 終稿，見 [[concepts/視覺CSS與設計token]]。
- 查詢賬本：[[queries/第三批蒸餾目標]] B3-TW；元件層靈感見 [[queries/前端視覺與靈感站點蒸餾目標]]。

已知衝突見上節，不靜默覆蓋。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[queries/第三批蒸餾目標]]
- [[queries/前端視覺與靈感站點蒸餾目標]]
- [[concepts/視覺CSS與設計token]]
- [[concepts/前端架構名詞與取捨]]
- [[concepts/無頭元件與根節點]]
- [[concepts/git掛載與遠端真身]]
- [[concepts/概念分級]]
- [[concepts/CSS平臺2026]]
- [[concepts/構建鏈與Vite]]
- [[concepts/Lit與自定義元素]]
- [[concepts/COLRv1與增量字型]]
- [[concepts/HTMX與超媒體]]
- [[concepts/中文設計系統]]
