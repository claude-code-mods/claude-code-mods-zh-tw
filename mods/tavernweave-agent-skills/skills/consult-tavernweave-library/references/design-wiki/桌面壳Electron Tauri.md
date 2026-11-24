---
title: 桌面殼Electron Tauri
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
  - https://www.electronjs.org/docs/latest/
  - https://www.electronjs.org/docs/latest/tutorial/process-model
  - https://www.electronjs.org/docs/latest/tutorial/ipc
  - https://www.electronjs.org/docs/latest/tutorial/security
  - https://v2.tauri.app/start/
  - https://v2.tauri.app/concept/architecture/
  - https://v2.tauri.app/security/
  - https://v2.tauri.app/reference/webview-versions/
  - https://v2.tauri.app/concept/inter-process-communication/
  - https://v3.wails.io/concepts/architecture/
  - https://v3.wails.io/quick-start/why-wails/
  - queries/第三批蒸餾目標.md
  - concepts/PWA與儲存配額.md
  - concepts/酒館宿主與iframe分層.md
knowledge_class: factual
---

# 桌面殼Electron Tauri

本頁不是已採用桌面殼，也不是工坊或角色卡必須換殼的工單。檢索時間：2026-08-14。賬本見 [[queries/第三批蒸餾目標]]（B3-Desk，約 9 條）。只收官方入口與架構合同，不收攻擊步驟、CVE 利用或打包繞過。

## 一句話定義

桌面殼是把 HTML/CSS/JS 介面裝進作業系統視窗的框架。Electron 把 **Chromium 和 Node.js 打進自己的二進位制**；Tauri 與 Wails 不捆瀏覽器，介面跑在**系統已有的 WebView** 裡，系統呼叫分別走 Rust / Go。

## 為什麼重要

「用網頁做桌面應用」不是一條技術。捆一份 Chromium，三臺機器上的畫素和 API 面更齊，但安裝包和補丁節奏跟你自己的發版走。借系統 WebView，包可以小到官方自稱的幾百 KB 到十幾 MB，但 Windows 是 WebView2（Edge/Chromium）、macOS 是 WKWebView、Linux 是 webkit2gtk，能力面跟 OS 補丁走。本倉庫角色卡跑在酒館 iframe 裡，**沒有 OS 安裝面**；本頁只蒸行業合同，不寫成要換殼。PWA 的安裝面見 [[concepts/PWA與儲存配額]]，不要和桌面殼併成一種「能裝到桌面」。

## 權威入口

本輪開啟過 [Electron docs/latest](https://www.electronjs.org/docs/latest/)。下列 **9** 條是本頁真源。`wails.io` 本輪撞 Cloudflare 人機驗證，可讀正文改走 `v3.wails.io`。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [Electron Introduction](https://www.electronjs.org/docs/latest/) | 用 JS/HTML/CSS 做桌面應用；**把 Chromium 和 Node.js 嵌進二進位制**，一份程式碼對 Windows / macOS / Linux。本輪 Fiddle 示例戳 43.4.0。 |
| 2 | [Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model) | 架構從 Chromium 繼承：一個 main（Node 環境）+ 每個視窗一個 renderer（按 Web 標準，預設無 Node）。preload + `contextBridge`；`contextIsolation` 預設開。 |
| 3 | [Security](https://www.electronjs.org/docs/latest/tutorial/security) | Electron **不是瀏覽器**。發產品等於同時發 Electron、Chromium 共享庫和 Node。清單隻作防禦合同入口，本頁不抄操作步驟。 |
| 4 | [What is Tauri](https://v2.tauri.app/start/) | 任意編到 HTML/JS/CSS 的前端；後端可用 Rust / Swift / Kotlin。三條優勢裡寫明：**用系統原生 webview 換更小包**；最小應用可小於 600KB。 |
| 5 | [Tauri Architecture](https://v2.tauri.app/concept/architecture/) | 不是核心包裝、不是 VM。TAO 管窗，WRY 管 WebView。最終二進位制由 Rust 編出，不另運一份 JS 執行時。MIT 或 Apache-2.0。 |
| 6 | [Tauri Security](https://v2.tauri.app/security/) | 明文：**依賴作業系統 WebView，不把 WebView 打進應用二進位制**。理由是 OS / WebView 維護者平均比「自己捆引擎的應用開發者」更快把補丁滾到使用者。 |
| 7 | [Webview Versions](https://v2.tauri.app/reference/webview-versions/) | Windows = WebView2（Edge / Chromium，可自更新）；macOS/iOS = 預裝 WKWebView；Linux = `webkit2gtk`；Android = 系統 WebView。系統 WebView **可以仍是 Chromium 系**，只是不捆。 |
| 8 | [How Wails Works](https://v3.wails.io/concepts/architecture/) | Go 後端 + Web 前端。原話：不像 Electron，**不捆瀏覽器，用作業系統原生 WebView**。對照表 Browser 列：OS-provided WebView vs Bundled Chromium。Windows 點名 WebView2。 |
| 9 | [Why Wails](https://v3.wails.io/quick-start/why-wails/) | 同一架構主張。體積 / 記憶體 / 啟動數字是 Wails 自己的對照，本頁不當作本倉庫實測。 |

上表 **9** 條。B3-Desk 的採集行不在本頁映象。IPC 專頁（Electron / Tauri）只作程序合同補充，不另佔入口位。

## 如何運作

### 兩條渲染合同

Electron 自己帶一份 Chromium，renderer 的行為「至少跟這份 Chromium 走」。Tauri / Wails 問 OS 要 WebView：Windows 上常常仍是 Chromium 家族（WebView2），macOS 是 WebKit，Linux 發行版的 webkit2gtk 版本散。衝突在「誰發引擎、誰補丁」，不在「一邊用 Chromium、一邊絕對不用」。

### 程序與語言

Electron：main 跑 Node，管 `BrowserWindow` / 生命週期 / 原生選單；renderer 寫普通網頁；兩邊用 IPC，preload 用 `contextBridge` 暴露白名單。歷史上 renderer 預設可開完整 Node，現已關。Tauri：Rust 核心擁有系統資源；WebView 裡的前端只經 IPC（Events 單向，Commands 像 `fetch` 的 `invoke`，引數要能 JSON 序列化）；能力面由 capabilities 收。Wails：Go 編成原生二進位制，前端經記憶體橋調已註冊的匯出方法，再 JSON 往返。這和 [[concepts/gRPC與Connect]] 的跨程序 RPC 不是同一條合同：桌面殼橋在本機窗與核心之間，不因此變成網路 API。

### 補丁節奏

Electron 安全頁把「跟上最新 Electron」寫成責任：你發的是框架 + Chromium + Node 的捆包。Tauri 安全頁把「不捆 WebView」寫成設計取捨：補丁跟 OS / WebView 包走，承認兩邊理論上都能同樣快，但捆引擎要更重的基礎設施。Wails 把 WebView2 寫成 Win10/11 預裝、跟 Windows Update。安裝包分層與清單格式見 [[concepts/SBOM與SLSA]]，本頁不把 SBOM 寫成換殼前提。

### 視窗庫

Tauri 的窗是 TAO（winit 分叉，補選單和托盤），WebView 抽象是 WRY。Wails v3 各平臺自己接 WebView2 / WKWebView / WebKitGTK。Electron 的窗就是 `BrowserWindow`，底下仍是那份自帶 Chromium。

## 行業何時該上

| 合同 | 何時該上 | 不該當成 |
|---|---|---|
| Electron 自帶 Chromium + Node | 要三平臺同一套 Blink / 同一套 DevTools / 現成 Node 生態 | 「網頁應用自動獲得瀏覽器沙箱」 |
| Tauri 系統 WebView + Rust | 要小包、要 Rust 核心與 capabilities，並能接受各 OS WebView 差 | 「不是 Chromium」；Windows 上 WebView2 仍是 Edge/Chromium |
| Wails 系統 WebView + Go | 後端已是 Go，要單檔案原生二進位制 | `wails.io` 現網樞紐；本輪可讀站是 `v3.wails.io` |
| PWA / 清單 / Service Worker | 頂層站點要安裝到瀏覽器/OS 的 Web 安裝面 | 桌面殼；酒館 iframe 無安裝面 |
| 酒館助手訊息 iframe | 卡 HUD 要整頁尾本隔離 | 桌面主程序、Node、Rust/Go 橋 |

十二因素把程序寫成無狀態、可丟可補的 dyno，見 [[concepts/十二因素與CAP]]；桌面殼是使用者機器上的長駐窗 + 原生選單，不要把「發一個 Electron 包」寫成已經滿足十二因素。叢集工作負載見 [[concepts/Kubernetes工作負載]]，也不是本機窗。

## 必須保留的衝突

- Electron 把 Chromium（以及 Node）打進二進位制；Tauri / Wails 用系統 WebView，不捆瀏覽器。這是賬本衝突，也是三家官方自己的對照軸。
- 系統 WebView 在 Windows 上仍是 Chromium 系（WebView2）。「不捆」≠「不用 Chromium」。
- `wails.io` 本輪不可讀；架構正文在 `v3.wails.io`。
- Wails 體積數字是自家對照，不是本倉庫基準。
- 「工坊和角色卡現在不上桌面殼」不是「這三條不是正當行業合同」。
- 桌面殼 ≠ PWA ≠ 酒館 iframe。三條安裝面 / 程序面不要併成一種「能跑網頁」。

## 例子

- 正例：要 VS Code 那種「每臺機器同一份 Chromium」再選 Electron，並按它的程序模型把特權留在 main。
- 正例：要小安裝包且能接受「Windows 跟 Edge 走、macOS 跟系統 WebKit 走」再選 Tauri / Wails。
- 正例：讀 Tauri Webview Versions 再寫 caniuse 預期，不要假設 Linux 發行版和 macOS 14 是同一個引擎。
- 反例：把「Tauri/Wails 不用 Chromium」寫成事實。Windows WebView2 官方就寫 based on Edge / Chromium。
- 反例：把角色卡 iframe 或工坊靜態站寫成「已經在用桌面殼」。
- 反例：把 Wails 對照表裡的 15MB / 150MB 寫成第三方基準，或把 `wails.io` 當 2026-08-14 的可讀樞紐。

## 邊界與易混概念

- 不包括：攻擊面清單操作、CVE 利用、關閉 `webSecurity` 的做法、憑證、本倉庫換殼工單。
- Electron 捆 Chromium ≠ Tauri/Wails 的系統 WebView。這是 B3-Desk 必須保留的衝突。
- 系統 WebView ≠ 「非 Chromium」。Windows WebView2 與 Android 系統 WebView 都是 Chromium 系，只是不隨應用二進位制走。
- 桌面殼 ≠ PWA。PWA 是頂層 Web 的安裝與離線合同；殼是 OS 程序 + 原生窗。角標 / 推送掛在已安裝頂層應用，見 [[concepts/Web Push與角標]]，不自動落到卡 iframe。
- 桌面殼 ≠ 酒館 iframe。卡沒有主程序，也沒有 OS 安裝面。見 [[concepts/酒館宿主與iframe分層]]、[[comparisons/嵌入三路徑對照]]。
- Electron 不是瀏覽器。官方安全頁原話。瀏覽器防禦頭見 [[concepts/CSP與Trusted Types]]；本頁不把 CSP 寫成 Electron 已自帶沙箱。
- Tauri 不是 VM，也不是輕量核心包裝。
- Wails v2 文件站與 v3 可讀站不是同一 URL；本輪 `wails.io` 停在 Cloudflare。
- 無頭元件在 Electron 裡仍要傳對 `getRootNode`。見 [[concepts/無頭元件與根節點]]。
- 前端構建鏈（Vite 等）編的是 Web 產物，見 [[concepts/構建鏈與Vite]]；打進桌面殼是另一步，不因此變成已採用殼。

## 對映到本倉庫

當前工坊是靜態目錄 + Gateway，角色卡 HUD 落在宿主掛載與酒館助手 iframe，見 [[comparisons/行業架構方案何時用]] 與 [[comparisons/工坊架構該上與不該上]]。桌面殼不因此變成已採用依賴，也不自動把清單 / 徽章 / 檔案處理落到卡上。卡 iframe 沒有 main 程序，也沒有 Node / Rust / Go 橋。這是產品落點，不是對三條行業合同的否定。

本頁只問「網頁裝進 OS 窗」的兩條渲染合同與補丁節奏，不是「工坊必須上 Electron / Tauri / Wails」。

## 來源與證據

- Electron 捆 Chromium + Node：本輪 [docs/latest](https://www.electronjs.org/docs/latest/)「By embedding Chromium and Node.js into its binary」。
- 程序模型從 Chromium 繼承：[process-model](https://www.electronjs.org/docs/latest/tutorial/process-model)。
- 發產品等於發捆包：[security](https://www.electronjs.org/docs/latest/tutorial/security)「shipping a bundle composed of Electron, Chromium shared library and Node.js」。
- Tauri 用系統 webview、最小可 <600KB：[start](https://v2.tauri.app/start/)。
- Tauri 明文不捆 WebView：[security](https://v2.tauri.app/security/)「(Not) Bundling WebViews」。
- Windows WebView2 仍是 Chromium：[webview-versions](https://v2.tauri.app/reference/webview-versions/)。
- Wails 不捆瀏覽器：[architecture](https://v3.wails.io/concepts/architecture/)。
- `wails.io` 本輪 Cloudflare：Ray ID `a2afd7bd580e7ae9`。
- 查詢賬本：[[queries/第三批蒸餾目標]] B3-Desk。

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
- [[concepts/PWA與儲存配額]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/前端架構名詞與取捨]]
- [[concepts/無頭元件與根節點]]
- [[concepts/CSP與Trusted Types]]
- [[concepts/構建鏈與Vite]]
- [[concepts/SBOM與SLSA]]
- [[concepts/十二因素與CAP]]
- [[concepts/Kubernetes工作負載]]
- [[concepts/Web Push與角標]]
- [[concepts/gRPC與Connect]]
- [[comparisons/嵌入三路徑對照]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/工坊架構該上與不該上]]
