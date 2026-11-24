---
title: 視覺CSS與設計token
created: 2026-08-14
updated: 2026-08-14
type: concept
status: active
tags:
  - wiki
  - concept
  - tooling
  - research
knowledge_class: factual
sources:
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter
  - https://css-tricks.com/using-css-backdrop-filter-for-ui-effects/
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/CSSOM_view/Viewport_concepts
  - https://web.dev/blog/viewport-units
  - https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env
  - https://webkit.org/blog/7929/designing-websites-for-iphone-x/
  - https://web.dev/learn/css/z-index
  - https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/
  - https://www.designtokens.org/
  - https://spectrum.adobe.com/page/design-tokens/
  - https://www.nngroup.com/articles/design-systems-101/
  - https://bem.info/en/methodology/
  - https://tailwindcss.com/docs/styling-with-utility-classes
  - https://open-props.style/
  - https://www.radix-ui.com/colors
  - https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM
  - https://css-tricks.com/styling-in-the-shadow-dom-with-css-shadow-parts/
  - https://www.w3.org/WAI/standards-guidelines/wcag/
  - https://glassmorphism.com/
  - https://css.glass/
  - https://uiverse.io/
  - https://daisyui.com/
  - https://gsap.com/
  - https://motion.dev/
  - https://animista.net/
  - https://www.w3.org/TR/css-color-4/
  - https://www.w3.org/TR/css-color-5/
  - https://www.w3.org/TR/css-color-hdr-1/
  - https://www.designtokens.org/tr/2025.10/
  - https://www.w3.org/TR/mediaqueries-5/#prefers-contrast
  - https://www.w3.org/TR/css-grid-3/
  - https://www.w3.org/TR/css-cascade-6/
  - https://drafts.css-houdini.org/
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
---

# 視覺CSS與設計token

行業視覺層：瀏覽器怎麼畫半透明、配色、視口、層疊和設計決策值。本頁是機制蒸餾，不是某倉庫的皮膚規範，也不等於已經選定設計系統。

## 一句話定義

視覺 CSS 決定元素如何相對「它背後的畫素、當前視口、使用者配色和層疊上下文」呈現；設計 token 把這些決策值從元件實現裡抽出來，變成可替換的資料。

## 為什麼重要

同一套「毛玻璃 / 暗色控制元件 / 100vh 鋪滿 / 安全區」在獨立站點、巢狀 iframe、宿主頁掛載裡表現不同。先認清瀏覽器合同，再談皮膚。token 則避免把色值、間距、圓角寫死進每一個按鈕。

許可、營銷導流和靈感站點賬本不在本頁展開，見 [[queries/前端視覺與靈感站點蒸餾目標]]。

## 如何運作

### backdrop-filter：只糊同一瀏覽上下文

[`backdrop-filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter) 對**元素背後、已經畫出來的畫素**做模糊、變色等濾鏡。元素自己必須半透明或透明，否則看不見效果。取樣範圍停在最近的 backdrop root（根元素，或帶非 `none` 的 `filter` / `mask` / `clip-path`、`opacity < 1`、另一個 `backdrop-filter`、非 `normal` 的 `mix-blend-mode`、以及把上述屬性列入 `will-change` 的祖先）。父級一旦變成 backdrop root，子級只能糊「父級內部」，糊不到父級後面的頁面。

跨文件 iframe 是獨立瀏覽上下文。框內元素背後只有框內文件，**取樣不到父頁**。想糊父頁內容，濾鏡必須畫在與父頁同一份文件裡。

### 多層玻璃：半透明底 + 模糊 + 細邊

常見玻璃觀感不是單靠 `blur()`。[CSS-Tricks 的多層濾鏡文](https://css-tricks.com/using-css-backdrop-filter-for-ui-effects/) 寫的是：半透明底讓背後內容可見；`blur` 負責磨砂；細邊或高光把面板從背景裡勾出來。多層疊玻璃時，除最底層外上層要用半透明而不是全透明，否則濾鏡疊不起來。`backdrop-filter` 會參與建立層疊 / 合成層，和 `opacity`、`transform` 一樣容易把 `z-index` 鎖進新上下文。

### color-scheme：UA 控制元件，可傳入 iframe

[`color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme) 告訴使用者代理：這個元素能舒服地畫在 light / dark 方案裡。瀏覽器據此改**畫布預設色、捲軸、表單控制元件、拼寫下劃線**等 UA 控制元件，不自動改你自己寫的 `background` / `color`。作者色仍要用 `prefers-color-scheme` 或下面的 `light-dark()`。屬性可繼承；巢狀瀏覽上下文裡，父頁宣告的方案可以傳入 iframe，框內捲軸和原生控制元件會跟著走。

### light-dark()：一對值隨方案切

[`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark) 收兩個顏色（較新實現也收一對影像）：當前用 light 或未設偏好時取第一個，dark 時取第二個。通常要在 `:root` 寫 `color-scheme: light dark` 才啟用。區域性再寫 `color-scheme: light` 或 `dark` 會強制該段只用其中一套——演示可以，覆蓋使用者偏好要謹慎。

### OKLCH：Color 4 已是 CR，Color 5 仍是 WD

[`oklch()`](https://www.w3.org/TR/css-color-4/) 是 CSS Color Module Level 4 的圓柱座標寫法。2026-08-06 的 TR 是 **W3C Candidate Recommendation Draft**，CR **不等於** Recommendation。Color 4 預定義的 `display-p3`、`rec2020` 按設計都是 **SDR**。[CSS Color 5](https://www.w3.org/TR/css-color-5/)（2026-07-31 WD）才加改色函式、`contrast-color()`、`light-dark()` 的規範真源。本頁不規定必須改用 OKLCH。

### Display P3 是 SDR 寬色，不是 HDR

[Color 4 §10.4](https://www.w3.org/TR/css-color-4/#predefined-display-p3) 把 `display-p3` 寫成 DCI-P3 三原色 + D65 + **與 sRGB 相同的傳遞曲線**，表裡 White luminance 是 **80.0 cd/m²**。[CSS Color HDR 1](https://www.w3.org/TR/css-color-hdr-1/) 仍是 WD，才補 HDR。不要把 `color(display-p3 …)` 或「P3 屏」寫成 HDR 支援。

### 視口：layout、visual、vh 與 svh/lvh/dvh

[MDN 視口概念](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/CSSOM_view/Viewport_concepts) 把兩層分開：

| 層 | 是什麼 | 誰會變 |
|---|---|---|
| layout viewport | 排版用的視口；`position: fixed` 貼它的邊 | 視窗改尺寸、縮放改 CSS 畫素；軟鍵盤 / 捏合縮放通常不改它 |
| visual viewport | 螢幕上實際看見的那一塊 | 捏合縮放、動態位址列、螢幕鍵盤可把它縮小 |

[`vh`](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/CSSOM_view/Viewport_concepts) 是 **layout viewport 高度的 1%**。巢狀瀏覽上下文（iframe / object / 外鏈 SVG）裡，視口是**框自己的內尺寸**：`1vh` = iframe 高的 1%，媒體查詢也相對這個框。只有頂層視窗的 visual viewport 才可能和 layout 不一致；iframe 裡兩者通常相同。[`VisualViewport`](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) 用來讀偏移、縮放，並聽 `resize` / `scroll`，好把控制元件釘在「眼睛看見的區域」。

移動端動態工具欄讓經典 `100vh` 在位址列展開時高出一截。[web.dev 視口單位](https://web.dev/blog/viewport-units) 補了三套穩定/動態單位：`svh` 按工具欄全展開，`lvh` 按全收起，`dvh` 在兩者之間隨工具欄變。注意：單位不算經典捲軸寬度；`dv*` 不按 60fps 更新；**螢幕鍵盤預設不算 UA 工具欄**，因而不改這些單位（Chrome 可另開選項讓鍵盤影響視口單位）。

### env()、安全區、鍵盤 inset

[`env()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env) 插入使用者代理提供的環境變數，不是作者自定義屬性。與視覺最相關的一組：

| 變數 | 用途 |
|---|---|
| `safe-area-inset-*` | 劉海、圓角、Home 條等「不要把要點畫進去」的 inset |
| `safe-area-max-inset-*` | 動態 UI 全收起時的靜態最大值 |
| `keyboard-inset-*` | 螢幕鍵盤相對視口的 inset（VirtualKeyboard API） |
| `titlebar-area-*` | 桌面 PWA 視窗控制元件疊加區 |
| `viewport-segment-*` | 摺疊屏分段 |

[WebKit 為 iPhone X 引入](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) `viewport-fit=cover` 才會鋪滿異形屏；鋪滿後必須用 `env(safe-area-inset-*)` 把導航和按鈕墊回來。早期函式名是 `constant()`，後來改成 `env()`。`env()` 無效時整條宣告被丟，要先寫不含 `env()` 的回退。安全區不是邊距替代品：portrait 下左側 inset 常為 `0`，仍要 `max(常規 padding, env(...))`。

### 層疊與 z-index

[`z-index` 只在層疊上下文裡比大小](https://web.dev/learn/css/z-index)。普通流預設按原始碼先後疊；非 flex/grid 子項還要把 `position` 設成非 `static`，`z-index` 才生效。父級一旦因 `z-index` + 定位、`opacity`、`transform`、`will-change`、`backdrop-filter` 等建成新上下文，子級再大的正數也出不去，再小的負數也鑽不到父級背後。多層玻璃、固定 HUD、抽屜同時存在時，先數有幾個上下文，再調數字。

### 瀑布流佈局現稱 grid-lanes

[CSS Grid Layout Module Level 3](https://www.w3.org/TR/css-grid-3/)（WD）把舊稱 masonry 寫成 **grid lanes layout**，建立容器的值是 `display: grid-lanes`。跨引擎語法未齊。回退用普通 Grid，並用 `@supports (display: grid-lanes)` 探測，不要探測已廢棄的 `masonry` 關鍵字。

### Design tokens：決策值與元件解耦

[NN/g](https://www.nngroup.com/articles/design-systems-101/) 把設計系統說成「用可複用元件和模式、在規模上管設計的一套標準」。token 是其中把**決策寫成資料**的那一層：[Adobe Spectrum](https://spectrum.adobe.com/page/design-tokens/) 的說法是「設計決策翻譯成資料」，元件引用 token 名而不是 `#0265DC`。常見分層：全域性值 → 語義別名（「強調色」）→ 元件專用 token。只丟一份 token 檔案、元件裡仍寫死色值，系統是空的。

交換格式由 [Design Tokens Community Group](https://www.designtokens.org/) 維護。[2025-10-28 的 Format 終稿](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) 是 **W3C Community Group Final Report**，文件自己寫明：**不是 W3C Standard，也不在 W3C 標準軌道上**。它給工具互操作一份 JSON 形狀，不自動等於某產品已經採用該格式。社群 TR 入口是 [Design Tokens 2025.10](https://www.designtokens.org/tr/2025.10/)，與上面的 W3C 映象是同一份終稿。USWDS 等政務 token 不必是 DTCG JSON。

常見構建鏈（都不是本倉庫已採用工具）：[Style Dictionary](https://styledictionary.com/getting-started/installation/)、[Tokens Studio](https://tokens.studio/) + [sd-transforms](https://github.com/Tokens-studio/sd-transforms)、[Terrazzo](https://terrazzo.app/docs/)。Figma Variables REST 要 Enterprise。有 JSON、有 Figma 變數、有 CSS 自定義屬性，是三層東西。

### 樣式架構四路

四條路常一起用，不是四選一互斥：

| 路 | 做法 | 入口 |
|---|---|---|
| 元件驅動 | 可複用控制元件帶自己的樣式契約 | 設計系統裡的 component library（見 NN/g） |
| Utility | 在標記上疊原子類，少寫選擇器戰爭 | [Tailwind：用 utility class 寫樣式](https://tailwindcss.com/docs/styling-with-utility-classes) |
| BEM | Block / Element / Modifier 命名，特異性低、選擇器可審計 | [BEM methodology](https://bem.info/en/methodology/) |
| Tokens | 決策值進自定義屬性或 DTCG JSON，主題替換時改資料 | [Open Props](https://open-props.style/)（現成 CSS 自定義屬性集）；[Radix Colors](https://www.radix-ui.com/colors) 是**顏色階**，不必上 Radix 元件 |

嵌入別人的文件時，utility 容易漏進宿主全域性；BEM 或 `data-*` 選擇器更好審計。獨立站點可以 utility + token 並行。Tailwind v4 的 [`theme()`](https://tailwindcss.com/docs/functions-and-directives) **已棄**，官方建議改用 CSS 主題變數。

選擇器作用域的穩定層疊合同是 [CSS Cascade 5](https://www.w3.org/TR/css-cascade-5/)。[`@scope`](https://www.w3.org/TR/css-cascade-6/) 在 Level 6 **Exploratory Working Draft**；實現層疊仍以 Level 5 為參考。`@scope` 不是樣式隔離，也不是 Shadow DOM 的替代品。

### Shadow DOM 與 ::part：抗樣式不是安全邊界

[Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) 給宿主掛一棵對外預設不可見的樹：頁面選擇器進不去，影子裡的樣式也出不來。`mode: "closed"` 只讓 `shadowRoot` 變成 `null`，MDN 寫明**不要把它當強安全機制**——擴充套件等仍可能繞過。影子與宿主仍共享同一 JS 堆和同一條主執行緒；卡頓、原型汙染、拿到 host 引用後的指令碼，都不被這層擋住。可繼承屬性（`color`、`font`、`line-height`）仍會滲進影子。

作者用 `part` 屬性露出指定節點，頁面用 [`::part()`](https://css-tricks.com/styling-in-the-shadow-dom-with-css-shadow-parts/) 從外主題化，而不必為每個可調屬性各寫一個自定義屬性。未標 `part` 的內部節點保持鎖死。`::part` 預設只穿透一層影子；更深要靠 `exportparts`。

### Houdini：跨瀏覽器用的只有 @property

[CSS Houdini 草稿入口](https://drafts.css-houdini.org/) 不是已齊的一籃子能力。`@property` 是 **Baseline 2024**；CSS Paint API 基本是 Chromium；Animation Worklet **生產當死**。`houdini-hud.com` / `houdini.how` / `ishoudinireadyyet.com` 不當活源。

### 無障礙底線：對比度與動效

[WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/) 是 W3C 無障礙內容標準（2.0 / 2.1 / 2.2 均為現行 Recommendation；新版本加成功標準、不改舊條）。視覺層最常踩的兩條：

- **對比度**：半透明玻璃、細字、暗色主題上的灰字，很容易掉到可感知原則要求的對比度以下。
- **動效**：閃爍、自動播放、大位移緩動要可關、可停；尊重使用者的減少動效偏好。

玻璃生成器和動效庫不會替你做這兩條。WCAG 3 仍是早期草案，引用時寫明版本。

[APCA](https://git.apcacontrast.com/documentation/minimum_compliance.html) 是感知對比草案，**不是** W3C 標準，也**不是**現行 WCAG 3 符合性演算法。法規與採購仍指 WCAG 2.x。[`prefers-contrast`](https://www.w3.org/TR/mediaqueries-5/#prefers-contrast) 以 2026-02-19 WD 為準，離散值是 `no-preference` / `more` / `less` / `custom`。**不要引用 2020 稿的 `high` / `low`。** 更完整的軸見 [[concepts/無障礙與包容設計]]。

### 生成器只當配方入口

下列站點用來看滑塊、抄思路、估引數，**不是**本頁的配方正文，也不在這裡貼上它們生成的整段 CSS：

| 站點 | 角色 |
|---|---|
| [glassmorphism.com](https://glassmorphism.com/) | 毛玻璃滑塊 |
| [css.glass](https://css.glass/) | 更短的玻璃生成器 |
| [Uiverse](https://uiverse.io/) | 社群控制元件片段，質量參差 |
| [daisyUI](https://daisyui.com/) | 建立在 Tailwind 上的元件類 |

GSAP / Motion / Animista / 平臺動畫 API 整頁見 [[concepts/動畫庫與動效管線]]（GSAP 自 2025-04-30 Standard No Charge，舊「商用另買」口徑作廢）。許可、登入牆、營銷導流見 [[queries/前端視覺與靈感站點蒸餾目標]]。把生成器輸出當設計系統，等於沒有 token。

## 例子

- 正例：面板寫半透明底 + `backdrop-filter: blur(...)` + 1px 高光邊；顏色用 `light-dark()` 或 token 別名；移動端全屏高用 `100dvh` 或 `100svh`，關鍵按鈕加 `env(safe-area-inset-bottom)`。
- 正例：顏色階用 Radix Colors 這類階表，元件仍自己寫；或把 Open Props 的自定義屬性當 token 源。
- 反例：在 iframe 裡對面板做 `backdrop-filter`，指望糊到父頁聊天區。
- 反例：`height: 100vh` 當手機「永遠貼滿可視區」；或把 Shadow DOM 當成跨源沙箱。
- 反例：把 glassmorphism.com 匯出的整段 CSS 貼進倉庫，當作已採用的視覺系統。

## 邊界與易混概念

- 本頁不是角色卡皮膚清單，也不是「本倉庫已採用」的 token / 元件庫宣告。
- `filter` 濾的是元素自己；`backdrop-filter` 濾的是它背後的畫素。
- `color-scheme` 管 UA 控制元件；`prefers-color-scheme` 是媒體查詢；`light-dark()` 是取值函式。三者 complementary，不是同義詞。
- `vh` ≠ 眼睛看見的高度；`visualViewport` ≠ layout viewport；iframe 裡的 `1vh` ≠ 瀏覽器視窗高。
- `env()` 是 UA 環境變數；`var()` 是作者自定義屬性。
- token ≠ 元件庫 ≠ 設計系統。NN/g 的系統還包括人、文件和模式庫。
- DTCG 報告 ≠ W3C Recommendation。2025.10 與 W3C `CG-FINAL-format-20251028` 是同一份 CG 終稿的兩個入口。
- `oklch()` 在 Color 4 CR 軌道；`light-dark()` 規範真源在 Color 5 WD。
- `display-p3` 是 SDR 寬色（規範白 80 cd/m²），不是 HDR。
- APCA ≠ WCAG 3 符合性；`prefers-contrast` 現行值是 more / less / custom。
- masonry 正式名是 `grid-lanes`；跨引擎未齊。
- `@scope` 在 Cascade 6 探索稿；Houdini 裡只有 `@property` 是 Baseline 2024。
- Tailwind v4 的 `theme()` 已棄，改用 CSS 變數。
- Shadow DOM 抗的是樣式和選擇器誤傷，不是安全邊界；iframe 才是源隔離（見 [[comparisons/嵌入三路徑對照]]）。
- 不搬生成器整段 CSS，不寫憑證，不寫卡 JSON，本頁不聲稱任何真機驗收。

## 相關內容

- [[concepts/前端架構名詞與取捨]]
- [[concepts/動畫庫與動效管線]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/嵌入三路徑對照]]
- [[concepts/酒館宿主與iframe分層]]
- [[queries/前端視覺與靈感站點蒸餾目標]]
- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
- [[concepts/無障礙與包容設計]]
- [[concepts/CJK排印與豎排]]
- [[concepts/概念分級]]
- [[concepts/前端設計庫/README-前端設計庫]]

## 對映到本倉庫

跨文件 HUD 的 `backdrop-filter` 糊不到宿主聊天區；要磨砂就掛同一文件，或只糊框內。
框內 `1vh` = iframe 高，不是瀏覽器視口。
樓內碎片用 `data-*` 選擇器，別把 utility 洩進宿主訊息樓。
細則見上列相關頁，不在本頁展開。
