---
title: 構建鏈與Vite
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
  - https://vite.dev/blog/announcing-vite8
  - https://vite.dev/guide/migration
  - https://vite.dev/guide/features
  - https://vite.dev/config/shared-options
  - https://v7.vite.dev/guide/rolldown
  - https://rolldown.rs/
  - https://oxc.rs/
  - https://lightningcss.dev/
  - https://postcss.org/
  - https://esbuild.github.io/
  - https://github.com/vitejs/vite/issues/22649
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
  - concepts/打包回封路徑.md
  - concepts/前端架構名詞與取捨.md
  - concepts/視覺CSS與設計token.md
knowledge_class: factual
---

# 構建鏈與Vite

本頁不是已採用構建器，也不是髮卡 `pack`。檢索時間：2026-08-14。賬本樞紐是 [[queries/第二批蒸餾目標]] 的 **B2-Build**。只談行業工具鏈預設，不宣佈本倉庫已換 Vite 8。

## 一句話定義

構建鏈是把原始碼變成瀏覽器能跑的產物：解析、轉譯、打包、壓縮。Vite 8（2026-03-12）把這條鏈收成 **Rolldown + Oxc + Lightning CSS**；**壓縮**預設 Lightning（CSS）和 Oxc（JS），**整鏈 CSS 處理仍預設 PostCSS**。

## 為什麼重要

以前 Vite 用兩套打包器：開發靠 esbuild 快，生產靠 Rollup 出最佳化包。兩套管線要膠水對齊，外掛和模組語義會分叉。[Vite 8 公告](https://vite.dev/blog/announcing-vite8) 把這稱為自 Vite 2 以來最大的架構改動：改成一個 Rust 打包器 Rolldown。看文件時必須先分清三層——**打包、轉譯、壓縮**——再問 CSS 走哪條處理器。把「預設換了壓縮器」讀成「CSS 整鏈已換 Lightning」會寫錯配置。

## 權威入口

B2-Build 樞紐是 Vite 8 公告。下列 10 條是 2026-08-14 直讀過的官方頁，不是映象。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [Vite 8 公告](https://vite.dev/blog/announcing-vite8) | 2026-03-12 穩定；Rolldown 統一打包；Oxc 編譯器；lightningcss 從可選 peer 變成正式依賴 |
| 2 | [從 v7 遷移](https://vite.dev/guide/migration) | JS 轉譯/壓縮預設 Oxc；CSS **壓縮**預設 Lightning；`esbuild` / `rollupOptions` 相容層會棄 |
| 3 | [Features · CSS](https://vite.dev/guide/features) | 生產預設用 Lightning **壓縮** CSS；**其餘 CSS 處理仍走 PostCSS** |
| 4 | [共享配置 `css.transformer`](https://vite.dev/config/shared-options) | 預設 `'postcss'`；`'lightningcss'` 標 Experimental |
| 5 | [Vite 7 Rolldown 預覽](https://v7.vite.dev/guide/rolldown) | 漸進遷移：先 `rolldown-vite` 再升 8；當時已寫清壓縮預設換了、esbuild 變可選 |
| 6 | [Rolldown](https://rolldown.rs/) | Rust 打包器；自稱 Rollup 相容 API、對標 esbuild 能力；Vite 8+ 的統一打包器 |
| 7 | [Oxc](https://oxc.rs/) | 解析/轉譯/壓縮/lint 工具集；Vite 用的是 transformer 與 minifier，不是「裝了 Oxc 就等於 Oxlint」 |
| 8 | [Lightning CSS](https://lightningcss.dev/) | Rust CSS 工具：降語法、加字首、壓縮、CSS Modules；會去掉它認為多餘的字首 |
| 9 | [PostCSS](https://postcss.org/) | JS 外掛鏈轉 CSS；Vite 有 `postcss.config.*` 就自動套到匯入的 CSS |
| 10 | [esbuild](https://esbuild.github.io/) | Vite 8 **之前**的開發轉譯/依賴預打包/壓縮對照；現為可選依賴，不是預設引擎 |

VitePress 屬於 [[queries/第二批蒸餾目標]] **B2-Docs**，不進本表。token 流水線（Style Dictionary 等）屬 **B2-Token**，見 [[concepts/視覺CSS與設計token]]。

## 如何運作

### 一條鏈，三個預設

[公告](https://vite.dev/blog/announcing-vite8) 把 Vite 8 寫成端到端入口：構建工具 Vite、打包器 Rolldown、編譯器 Oxc。對照 [遷移指南](https://vite.dev/guide/migration)：

| 步驟 | Vite 7 及更早 | Vite 8 預設 | 退回舊器 |
|---|---|---|---|
| 生產打包 / 依賴預打包 | Rollup + esbuild | Rolldown | 無雙打包器；先用 `rolldown-vite` 隔離 |
| JS/TS/JSX 轉譯 | esbuild | Oxc | `esbuild` 選項會自動轉成 `oxc`，已棄用 |
| JS 壓縮 | esbuild | Oxc Minifier | `build.minify: 'esbuild'`（須自裝 esbuild） |
| CSS 壓縮 | esbuild | Lightning CSS | `build.cssMinify: 'esbuild'`（須自裝 esbuild） |
| CSS 處理（外掛、Modules、巢狀等） | PostCSS | **仍是 PostCSS** | `css.transformer: 'lightningcss'`（實驗） |

開發期預打包、TypeScript/JSX、配置打包，公告和 Features 都改口為 Rolldown / Oxc，不再寫「開發 esbuild、生產 Rollup」。

### 壓縮換了，整鏈 CSS 沒換

[Features](https://vite.dev/guide/features) 原話：生產構建預設用 Lightning CSS **minify**；**However, PostCSS is still used for other CSS processing.** 壓縮發生在 PostCSS **之後**，並看 `build.cssTarget`。

整鏈換 Lightning 要顯式 `css.transformer: 'lightningcss'`。[共享配置](https://vite.dev/config/shared-options) 寫預設 `'postcss'`，該項標 Experimental。開了之後，CSS Modules 改走 `css.lightningcss.cssModules`，不要再寫給 PostCSS 的 `css.modules`。

因此 B2-Build 採集要點成立：**壓縮已預設 Lightning/Oxc；整鏈 CSS 仍預設 PostCSS。**

### 相容層不是舊引擎還在

遷移指南有一層自動轉換：`optimizeDeps.esbuildOptions` → `rolldownOptions`，頂層 `esbuild` → `oxc`，`build.rollupOptions` 改名 `build.rolldownOptions`。能跑起來不等於 esbuild/Rollup 還在核心路徑。`transformWithEsbuild` 已棄，建議 `transformWithOxc`；外掛若仍調前者，要自己裝 esbuild。

Node 要求與 Vite 7 相同：20.19+ / 22.12+（`require(esm)` 不需旗標）。安裝體積約比 Vite 7 大 15 MB：公告寫約 10 MB 來自現已正式依賴的 lightningcss，約 5 MB 來自 Rolldown 二進位制。`@vitejs/plugin-react` v6 用 Oxc 做 React Refresh，預設不再依賴 Babel；要 React Compiler 須顯式走 `@rolldown/plugin-babel`。

## 必須保留的衝突

- **壓縮預設 ≠ 整鏈預設。** 公告強調 lightningcss 現為正式依賴、壓縮開箱更好；Features / `css.transformer` 明確整鏈仍預設 PostCSS，Lightning 整鏈是實驗開關。B2-Build 按後一句記賬，不把「裝了 lightningcss」寫成「CSS 已換引擎」。
- **Oxc Minifier 產品態。** [oxc.rs](https://oxc.rs/) 把 minifier 標 Alpha；Vite 8 遷移指南已把它當作 JS 壓縮預設。兩邊都留：站點成熟度標籤慢於 Vite 發版口徑。
- **esbuild 假設 ≠ Oxc 假設。** 遷移指南要求對照兩份 minify assumptions；屬性混淆（`mangleProps` 等）Oxc 尚未支援。懷疑壓縮破壞時先對照，不先改業務程式碼。
- **Lightning 壓縮可能改字首面。** Lightning 文件寫會去掉它認為多餘的 vendor prefix，並按 targets 降語法。社群 [vite#22649](https://github.com/vitejs/vite/issues/22649) 報過：預設 `cssMinify: 'lightningcss'` 丟掉未加字首的 `backdrop-filter`，只留 `-webkit-`，現 Chromium 上玻璃失效；`cssMinify: 'esbuild'` 則兩份都在。這是**已報告的壓縮器差異**，不是 Vite 官方保證「玻璃一定壞」。本倉 [[concepts/視覺CSS與設計token]] 已把 `backdrop-filter` 當視覺合同；升 8 時要核產物，不與跨 iframe 糊不到父頁併成一個因。
- **CJS `default` 互操作。** 遷移指南改了開發/生產一致規則；可用已棄的 `legacy.inconsistentCjsInterop` 臨時回退。不要把舊 Vite 7 的 default 語義寫成 Rolldown 現行合同。
- **VitePress ≠ 本頁。** 文件站生成器走 B2-Docs，不在本頁展開。
- **打包回封 ≠ Vite。** [[concepts/打包回封路徑]] 是卡源 → JSON/PNG。名字都叫「構建/打包」，合同不是同一條鏈。
- **對映 ≠ 採用。** 獨立工坊站或文件站若將來用 Vite，是產品決策；本頁不宣佈已換。

## 例子

- 正例：升 Vite 8 後不改 `css.transformer`，繼續用 `postcss.config.js` + Autoprefixer；只接受生產 CSS 由 Lightning 壓縮。
- 正例：要驗證「是 Rolldown 還是 Vite 8 其它改動」，先在 Vite 7 換 `rolldown-vite`，再升 8。
- 正例：玻璃面板同時寫標準 `backdrop-filter` 與 `-webkit-`；升 8 後對照壓縮產物，必要時 `build.cssMinify: 'esbuild'` 做對照，不把「糊不到」先怪跨文件。
- 反例：看見預設 Lightning 就刪 PostCSS 配置，或把 `css.transformer: 'lightningcss'` 寫成穩定預設。
- 反例：把本頁寫成「工坊/髮卡已改用 Vite 8」，或把 [[concepts/打包回封路徑]] 的 `workflow.mjs pack` 叫成 Vite 構建。
- 反例：把 Oxc 全家桶（Oxlint / Oxfmt）寫成 Vite 8 已預設啟用。

## 邊界與易混概念

- 不包括：本倉庫已採用哪條構建器、卡 JSON/PNG 回封步驟、成品皮膚。
- 不包括：VitePress / Starlight 文件站（B2-Docs）；token 構建（B2-Token）；Tailwind v4 / vanilla-extract（[[concepts/Tailwind與原子CSS]]；賬本 B3-TW / B3-CssT）；HTML import maps（B3-Imp）。
- 易混：壓縮器 ≠ 轉譯器 ≠ 打包器。Lightning 預設只接壓縮；Oxc 接 JS 轉譯+壓縮；Rolldown 接打包。
- 易混：Vite 開發服務 ≠ 生產 `build()`。預設換的是引擎，不是「開發也變成整包」；Full Bundle Mode 在公告裡仍標實驗。
- 易混：Rolldown 宣傳的 Module Federation 能力 ≠ [[concepts/前端架構名詞與取捨]] 裡 webpack 聯邦的「何時該上」。
- 區分：先問「改的是打包、轉譯還是壓縮」，再問 CSS 是 PostCSS 整鏈還是隻 minify。

## 對映到本倉庫

對映放最後，不當過濾器。

- **工坊獨立站 / 文件：** 行業預設可以是 Vite 族（含 VitePress），見 [[comparisons/工坊架構該上與不該上]]、[[concepts/前端架構名詞與取捨]]。本頁只提供 Vite 8 預設表，不寫「工坊必須升 8」。
- **髮卡回封：** 仍走 `card_workflow` compose/pack，見 [[concepts/打包回封路徑]]、[[concepts/元件庫registry與recipe]]。不要把 Rolldown 寫進 recipe。
- **遠端頁 / git-mount：** 真身在遠端倉構建，殼只掛 blob，見 [[concepts/git掛載與遠端真身]]。遠端若升 Vite 8，壓縮器差異會進產物 CSS；玻璃與 `backdrop-filter` 先對產物，再對跨文件濾鏡。
- **嵌入 UI：** 開局頁、HUD、控制中心今天多半是原始檔進卡或遠端頁，不是本 Vault 裡起 Vite dev server。本頁不因此否定行業構建鏈。

本頁不寫「已採用 Vite 8 / Rolldown / Oxc / Lightning」。蒸餾目標仍在 [[queries/第二批蒸餾目標]]；B3-CssT / B3-TW / B3-Imp 收回來另頁，不併進這裡。

## 來源與證據

- Vite 8 日期與 Rolldown 統一打包：公告 2026-03-12。
- 預設表（Oxc 轉譯/壓縮、Lightning 只接 CSS 壓縮、PostCSS 仍整鏈）：[遷移指南](https://vite.dev/guide/migration)、[Features · CSS](https://vite.dev/guide/features)、[共享配置 `css.transformer`](https://vite.dev/config/shared-options)。
- Oxc minifier 成熟度：oxc.rs 標 Alpha；Vite 8 已當 JS 壓縮預設。兩邊都留。
- Lightning 字首面：Lightning 文件；社群 [vite#22649](https://github.com/vitejs/vite/issues/22649) 為已報告差異，不是官方「玻璃必壞」。
- 查詢賬本：[[queries/第二批蒸餾目標]] B2-Build；[[queries/第三批蒸餾目標]] B3-CssT、B3-TW、B3-Imp 另頁。

已知衝突見上節，不靜默覆蓋。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區

## 相關內容

- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
- [[concepts/打包回封路徑]]
- [[concepts/前端架構名詞與取捨]]
- [[concepts/視覺CSS與設計token]]
- [[concepts/元件庫registry與recipe]]
- [[concepts/git掛載與遠端真身]]
- [[concepts/Tailwind與原子CSS]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
