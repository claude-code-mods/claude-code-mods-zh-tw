---
title: Web效能與INP
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
  - https://web.dev/articles/vitals
  - https://web.dev/articles/inp
  - https://web.dev/articles/lcp
  - https://web.dev/articles/cls
  - https://web.dev/blog/inp-cwv-launch
  - https://web.dev/articles/optimize-long-tasks
  - https://html.spec.whatwg.org/multipage/speculative-loading.html
  - https://developer.chrome.com/docs/web-platform/prerender-pages
  - https://www.rfc-editor.org/rfc/rfc8297.html
  - https://developer.chrome.com/docs/web-platform/early-hints
  - https://chromium.googlesource.com/chromium/src/+/HEAD/docs/early-hints.md
  - https://developer.mozilla.org/en-US/docs/Web/API/Scheduling/isInputPending
  - queries/前端視覺與靈感站點蒸餾目標.md
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
  - concepts/前端架構名詞與取捨.md
---

# Web效能與INP

本頁蒸 **Core Web Vitals**（LCP / INP / CLS）以及預渲染、`103 Early Hints`。行業合同，不是本倉庫採納清單。第一批架構 A1 已鏈 [Web Vitals](https://web.dev/articles/vitals)；B2-Perf、B2-Otel-11 與它重疊，**不是新發現**。渲染位置名詞見 [[concepts/前端架構名詞與取捨]]，本頁不整頁複述。

## 一句話定義

Web 效能這裡指：用一組可場測的使用者中心指標，量「主內容何時可見、互動多久才畫出下一幀、佈局是否意外跳」，再用長任務讓出與推測載入去改這些數。現行互動 Core Web Vital 是 **INP**，不是 FID。

## 為什麼重要

站點主人生不必先當效能專家。Google 用 Web Vitals 把工具海里的訊號收成三面：載入、互動、視覺穩定。場資料按移動/桌面分開，看 **75 分位**；三指標都過線才算過。

Chrome 使用資料顯示，使用者 90% 的時間花在載入之後，所以只盯首包不夠。CrUX / PageSpeed / Search Console 能告訴你「有沒有問題」；要歸因到哪一次點選、哪一段長任務，還得自建 RUM。[web-vitals](https://github.com/GoogleChrome/web-vitals) 是官方包裝，儘量對齊 Google 工具的計算差異，但**框內條目仍要子框自己上報**。

B2-Otel 裡的 Web Vitals 儀表是同一套指標的匯出面，仍回 A1，不要當成第二套合同。實驗室（Lighthouse、無互動的 PSI 實驗室欄）先抓回歸；場資料才是合同。

## 如何運作

### INP

[INP](https://web.dev/articles/inp) 觀察整次訪問裡的點選、輕觸、鍵盤（含螢幕鍵盤）。**不**計滾動、懸停、縮放。一次互動是同一手勢下的一組處理器（如 `pointerdown` + `pointerup` + `click`）；延遲從使用者動手到瀏覽器**能畫出下一幀**，含輸入等待、處理、呈現。意圖不是量網路請求或後續非同步 UI 的全部收尾，而是下一幀被堵住多久。

頁面 INP 通常取最差一次；互動很多時每 50 次丟掉一個最差，再報 75 分位。閾值：≤200 ms 好，200–500 ms 待改進，>500 ms 差。無點選/輕觸/按鍵時可以沒有 INP。實驗室無互動時可用 TBT 作代理，**不能代替** INP。

2024-03-12 INP **正式取代 FID** 成為互動 Core Web Vital。FID 只量第一次互動的輸入等待；INP 從輸入等待一直量到下一幀，且覆蓋整頁生命週期。從後退/前進快取恢復應把 INP 歸零，當作新一次訪問。iframe 裡的互動計入指標（使用者分不清框），但頁面 JS API 看不到跨框內容，CrUX 與自建 RUM 會對不上。

### LCP

[LCP](https://web.dev/articles/lcp) 報視口內最大圖、文字塊或影片相對導航起點的繪製時刻。好線 ≤2.5 s（75 分位）。候選元素隨後續幀更新，分析只報最後一條。圖未解碼、字型阻塞期的文字都不算已繪。改尺寸或位置不產生新候選，只看初次視口尺寸。

FCP 是「任何內容」，LCP 是「主內容」。全視口底圖、低熵佔位常被啟發式丟掉，所以兩套「contentful」不是同一集合。跨源圖缺 `Timing-Allow-Origin` 時，舊實現只暴露載入時刻，可能假報 LCP 早於 FCP；Chrome 133 起即使無該頭也給粗化繪製時刻。預渲染頁應從 `activationStart` 起算，不是導航起點。後臺標籤的條目應忽略。iframe 內的 LCP 同樣計入指標、API 預設不報。

### CLS

[CLS](https://web.dev/articles/cls) 是整頁生命週期裡**最大一串**意外位移的累計分。位移 = 已有可見元素的起點在兩幀間變了；新插入或自身變大，只要不把別人推走，不算。視窗（session window）：相鄰位移間隔 <1 s，窗最長 5 s；取視窗累計最大者。

單次分 = 影響分數 × 距離分數。好線 ≤0.1，>0.25 差。使用者輸入後 500 ms 內帶 `hadRecentInput`，可排除。用 `transform: translate()` / `scale()` 做位移動畫，不要改 `top` / `left` / `width` / `height`。從 bfcache 恢復應歸零。iframe 位移計入指標、API 預設不報。

### 長任務

主執行緒一次只跑一件事。超過 **50 ms** 的是長任務；總時長減 50 ms 是阻塞段。拆函式不等於拆任務：五個同步呼叫仍是一條。讓出主執行緒，好讓輸入和下一幀插隊。

[web.dev 最佳化長任務](https://web.dev/articles/optimize-long-tasks) **不再推薦 `isInputPending()`**：它會假陰性、忽略動畫與常規 UI 重新整理，且已被 `scheduler.yield()` / `scheduler.postTask()` 替代。現行做法是按約 50 ms 預算讓出，而不是「探測到輸入再讓」。`scheduler.yield()` 的續體會優先於同類新任務；缺實現時退回 `setTimeout(0)`，續體落到隊尾，巢狀五層後瀏覽器還會加最少 5 ms 延遲。MDN 亦標 Avoid，指向 Scheduler。

### 預渲染與 103

兩套不同的「提前幹活」，不要併成一詞。

**推測載入**（[WHATWG](https://html.spec.whatwg.org/multipage/speculative-loading.html)）：用 Speculation Rules JSON（`type="speculationrules"` 或 `Speculation-Rules` 頭）宣告 `prefetch` / `prerender`。Chrome 已恢復整頁預渲染；舊 `<link rel=prerender>` 退化成 NoState Prefetch（只拉資源、不跑 JS）。規則可寫 URL 列表或文件謂詞（`href_matches` / `selector_matches`）。`eagerness` 控制何時猜：`immediate` / `eager` / `moderate` / `conservative`；列表規則預設 `immediate`，文件規則預設 `conservative`。猜中可把 LCP 壓到接近 0，載入期 CLS 發生在啟用前；錯猜耗記憶體和頻寬。規範裡 `prerender` 在解析時仍可被降成 `prefetch`，完整預渲染行為看實現與 Prerendering Revamped。

**103 Early Hints**（[RFC 8297](https://www.rfc-editor.org/rfc/rfc8297.html)）：伺服器在最終響應未定時，先發資訊性響應，讓客戶端按 `Link` 做準備。RFC **仍是 Experimental**，不是 Internet Standard。Chrome 自 103 起對**頂層導航**處理 103，且 **只認 `preload` 與 `preconnect`，不含 `prefetch` / `dns-prefetch`**。子資源請求、iframe 導航、HTTP/1.1 上的 103 會被忽略；第二條及之後的 103 也不處理。103 對首次落地頁最有用，站內第二跳收益下降。它不是 Speculation Rules，也不是已廢的 H2 Push（Push 常把瀏覽器已有的資源再推一遍）。

## 權威入口

下列為可點真源，8–16 條。A1 總覽重複列出，標明重疊。

1. [Web Vitals 總覽（第一批 A1，非新發現）](https://web.dev/articles/vitals)
2. [INP](https://web.dev/articles/inp)
3. [LCP](https://web.dev/articles/lcp)
4. [CLS](https://web.dev/articles/cls)
5. [INP 正式成為 Core Web Vital（取代 FID）](https://web.dev/blog/inp-cwv-launch)
6. [INP 升格預告（2024-03-12）](https://web.dev/blog/inp-cwv-march-12)
7. [最佳化 INP](https://web.dev/articles/optimize-inp)
8. [最佳化長任務（勿用 isInputPending）](https://web.dev/articles/optimize-long-tasks)
9. [scheduler.yield()](https://developer.chrome.com/blog/use-scheduler-yield)
10. [MDN isInputPending（Avoid）](https://developer.mozilla.org/en-US/docs/Web/API/Scheduling/isInputPending)
11. [WHATWG Speculative loading](https://html.spec.whatwg.org/multipage/speculative-loading.html)
12. [Chrome 預渲染 / Speculation Rules](https://developer.chrome.com/docs/web-platform/prerender-pages)
13. [RFC 8297 Early Hints（Experimental）](https://www.rfc-editor.org/rfc/rfc8297.html)
14. [Chrome Early Hints（103 不含 prefetch）](https://developer.chrome.com/docs/web-platform/early-hints)
15. [Chromium `early-hints.md`](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/early-hints.md)
16. [web-vitals JS 庫](https://github.com/GoogleChrome/web-vitals)

## 例子

- 正例：內容站 SSG 把 LCP 圖與字型穩定住；互動島用 `scheduler.yield()` 切開 >50 ms 的儲存/校驗；高置信下一頁用 Speculation Rules `prerender`，落地頁用 103 只 hint 穩定的 `preload`/`preconnect`。
- 正例：手風琴點選後立刻畫出展開，再非同步拉詳情。INP 量的是下一幀，不是網路收尾。
- 反例：用 FID 或 TBT 對外宣稱「互動 Core Web Vital 已過」。
- 反例：長迴圈裡只在 `isInputPending()` 為真時讓出；或把 103 的 `prefetch` 當成 Chrome 103 已實現。
- 反例：把「角色卡場景用不上」寫成行業指標不存在。

## 邊界與易混概念

- 不包括：離線合成、真機驗收聲稱、本倉庫「已採用」某庫或某 CDN。
- INP ≠ FID ≠ TBT。FID 已退出 Core Web Vitals；TBT 是實驗室代理。
- LCP ≠ FCP；全屏 splash 可以很快 FCP、很慢 LCP。
- 103 Early Hints ≠ Speculation Rules ≠ `<link rel=prefetch>` ≠ 已廢 H2 Push。
- 預渲染 ≠ NoState Prefetch；舊 `rel=prerender` 不再是整頁預渲染。
- 指標計入 iframe，頁面 API 預設看不到框內條目：CrUX 與自建 RUM 會分叉。
- 滾動/懸停不進 INP；使用者發起的位移在 500 ms 內可不進 CLS。

## 衝突

- **與第一批重疊**：A1 已是 Web Vitals 樞紐；B2-Perf、B2-Otel-11 再出現同一簇，記賬本續寫，不當新發現。
- **INP 取代 FID**：2024-03-12 起互動 Core Web Vital 是 INP。舊文、舊儀表仍寫 FID 的，以 vitals / inp-cwv-launch 為準。
- **長任務不再推薦 isInputPending**：web.dev 與 MDN 一致改口；新文若仍教「有輸入再讓出」，與現行指南衝突，採用 yield 無條件讓出。
- **RFC 8297 仍是 Experimental**；實現普及不等於 IETF 已升 Standard。
- **Chrome 103 的 103 不含 prefetch**（也不含 dns-prefetch）；只 preload / preconnect，且限頂層導航。RFC 舉例可以寫任意 `Link`，Chrome 實現更窄。兩邊都留。
- WHATWG 把 `prerender` 寫成解析期可降級為 `prefetch`；Chrome 文件寫整頁預渲染。寫「規範已保證整頁預渲染」會過讀。
- 實驗室 Lighthouse 對 INP 畫叉、改看 TBT：這是工具能力，不是指標降級。

## 對映到本倉庫

對映放最後，不當過濾器。行業指標對獨立站和嵌入 UI 都成立，**不是「卡不能談效能」**。卡 JSON/PNG、真機驗收、本倉是否接線，都不在本頁宣佈。

- **工坊 SSG**：獨立工坊站預設 SSG/ISR + islands（見 [[comparisons/工坊架構該上與不該上]]、[[concepts/前端架構名詞與取捨]]）。目錄/營銷頁按普通內容站讀 LCP/CLS（英雄圖、字型、島注水）。稽核臺若進島，INP 跟島內長任務走，不是「靜態站無互動指標」。103 與 Speculation Rules 只對**頂層導航**有意義，不是 Gateway 寫面合同，也不是「本倉已上 103」。
- **開局頁**：一次性初始化器，見 [[concepts/開局頁路徑]]。首屏大圖、網頁字型、表單後插入會直接打 LCP/CLS；提交若被同步校驗/寫變數堵住，就是 INP。樓內裸 `<script>` 不一定執行（開局頁路徑已記），重邏輯不該賭首樓主執行緒一口氣跑完。
- **iframe 與主執行緒**：TH 訊息框是獨立文件；宿主掛載的 HUD、選項橋、輸入框與 ST 主題變數**同頁事件迴圈**。Shadow DOM 同 JS 堆、同卡頓。框內長任務會進頂層 INP/LCP/CLS 的場資料，但卡內 `PerformanceObserver` 預設收不到跨框條目——這是指標與 API 的已知分叉，不是「嵌入就不用量」。iframe 導航上的 103，Chrome 忽略。跨文件 `backdrop-filter` 糊不到父頁，那是視覺邊界，見 [[concepts/酒館宿主與iframe分層]]，不要用它否定效能合同。

本頁不寫「已採用 web-vitals / Speculation Rules / 103」。蒸餾目標仍在 [[queries/第二批蒸餾目標]]、[[queries/第三批蒸餾目標]]。

## 相關內容

- [[concepts/前端架構名詞與取捨]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/開局頁路徑]]
- [[concepts/視覺CSS與設計token]]
- [[concepts/動畫庫與動效管線]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/嵌入三路徑對照]]
- [[queries/前端視覺與靈感站點蒸餾目標]]
- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
