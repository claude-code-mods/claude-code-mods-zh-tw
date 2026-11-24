---
title: WebXR與glTF
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
  - https://www.w3.org/TR/webxr/
  - https://www.w3.org/TR/webxr-ar-module-1/
  - https://www.w3.org/TR/webxr-gamepads-module-1/
  - https://www.w3.org/TR/webxr-hit-test-1/
  - https://www.w3.org/TR/webxr-dom-overlays-1/
  - https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
  - https://developer.mozilla.org/en-US/docs/Web/API/WebVR_API
  - https://www.khronos.org/gltf/
  - https://registry.khronos.org/glTF/
  - https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
  - https://github.khronos.org/glTF-Validator/
  - https://modelviewer.dev/
  - https://modelviewer.dev/examples/augmentedreality/index.html
  - https://aframe.io/
  - https://aframe.io/docs/1.8.0/introduction/
  - https://developer.apple.com/augmented-reality/quick-look/
  - https://developers.google.com/ar/develop/java/scene-viewer
  - queries/第三批蒸餾目標.md
  - queries/第二批蒸餾目標.md
  - queries/第四批蒸餾目標.md
  - queries/第七批蒸餾目標.md
  - concepts/酒館宿主與iframe分層.md
  - concepts/媒體庫路徑.md
  - concepts/CSP與Trusted Types.md
knowledge_class: factual
---

# WebXR與glTF

本頁不是已採用技術，也不是工坊或角色卡必須上 XR / glTF 的工單。檢索時間：2026-08-14。蒸餾 [[queries/第三批蒸餾目標]] **B3-XR**。引擎與著色只引用 [[queries/第二批蒸餾目標]] **B2-3D**、[[queries/第四批蒸餾目標]] **B4-3D**，不重抄。只談公開會話合同與資產格式，不寫攻擊、指紋、盜版模型包或 ISO 付費全文。

## 一句話定義

WebXR 是瀏覽器裡開 VR/AR 會話的合同：查能力、要會話、跑幀、交姿態。glTF 是執行時 3D 資產投遞格式：JSON 描述場景，可打成單個 `.glb`。會話合同 ≠ 資產格式 ≠ 原生預覽殼 ≠ Three/Babylon 引擎。

## 為什麼重要

「頁裡轉一個模型」和「進頭顯」不是同一條 API。資產走 glTF 或 USDZ；進會話走 `navigator.xr`；Android 還可能甩給 Scene Viewer，iOS 甩給 AR Quick Look。混成一詞，就會把已廢的 WebVR、付費 ISO 12113、或引擎手冊當成 WebXR 正文。

卡 iframe 要安全上下文、瞬時啟用，以及 Permissions-Policy `xr-spatial-tracking`，見 [[concepts/酒館宿主與iframe分層]] 與 [[concepts/CSP與Trusted Types]]。無策略時不要假裝能進頭顯。

## 權威入口

檢索日 2026-08-14。下表 **16** 條是本頁真源；規範極厚只鏈不搬。ISO/IEC 12113:2022 付費全文不收。盜版模型包與攻擊步驟不收。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [W3C WebXR Device API](https://www.w3.org/TR/webxr/) | B3-XR 樞紐；**CR Draft 2026-06-09**，不是 Rec。`navigator.xr.isSessionSupported()` / `requestSession()`；模式 `inline` / `immersive-vr`；`immersive-ar` 行為在 AR 模組。要安全上下文與瞬時啟用；沉浸會話要 Permissions-Policy `xr-spatial-tracking` |
| 2 | [WebXR AR Module L1](https://www.w3.org/TR/webxr-ar-module-1/) | **CR Draft 2025-04-25**。定義 `immersive-ar`：獨佔裝置且意圖與真實環境混合。顯示分 additive / pass-through / opaque |
| 3 | [WebXR Gamepads Module L1](https://www.w3.org/TR/webxr-gamepads-module-1/) | **WD 2025-07-07**。`XRInputSource.gamepad`；`xr-standard` 對映。此物件**不得**出現在 `navigator.getGamepads()` |
| 4 | [WebXR Hit Test](https://www.w3.org/TR/webxr-hit-test-1/) | **WD 2025-12-11**。對真實世界幾何打射線；對應用自己的虛物打點不在範圍。特性描述符 `hit-test` |
| 5 | [WebXR DOM Overlays](https://www.w3.org/TR/webxr-dom-overlays-1/) | **WD 2024-09-24**，頁頭自稱 Unstable。沉浸會話裡把**一個** DOM 元素畫成透明 2D 層 |
| 6 | [MDN WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API) | 實現面入口；標 Limited / Experimental。模組表含 Anchors / Depth / Hand / Layers / Lighting。AR 能力來自 AR 模組，不在核心 TR 寫完 |
| 7 | [MDN WebVR API](https://developer.mozilla.org/en-US/docs/Web/API/WebVR_API) | **已廢棄**；從未批准成標準；繼任是 WebXR。`getVRDisplays()` / `requestPresent()` 不是現行合同 |
| 8 | [Khronos glTF 總站](https://www.khronos.org/gltf/) | runtime 3D asset delivery；JSON + `.glb`。提到 ISO/IEC 12113:2022，**付費全文不收** |
| 9 | [Khronos glTF Registry](https://registry.khronos.org/glTF/) | 現行 **2.0**；可讀合同是 **2.0.1** HTML/PDF。補丁只做澄清與反向相容修復。擴充套件另冊 Markdown |
| 10 | [glTF 2.0.1 規範](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) | 頁頭 version **2.0.1**（2021-10-11）。API 中立的執行時投遞，不是引擎場景圖 |
| 11 | [glTF Validator](https://github.khronos.org/glTF-Validator/) | 對照 2.0 與擴充套件做校驗；瀏覽器本地跑，不上傳資產 |
| 12 | [`<model-viewer>`](https://modelviewer.dev/) | B3-XR-07；Apache-2.0。頁內 3D + AR。WebXR 模式要 Device API / Hit Test / DOM Overlay。重疊 B3-Bab / B4-3D，不當新引擎 |
| 13 | [model-viewer AR 示例](https://modelviewer.dev/examples/augmentedreality/index.html) | 三殼：`webxr`（現預設）、`scene-viewer`、`quick-look`。iframe 要 `xr-spatial-tracking`；HTTPS。DOM **流不進** Scene Viewer / Quick Look。無 `ios-src` 時現場生成 USDZ |
| 14 | [A-Frame 1.8.0 介紹](https://aframe.io/docs/1.8.0/introduction/) | HTML + ECS，底層 three.js。首頁仍標 **Make WebVR**，示例仍名 Hello WebVR；介紹仍寫「unlimited access to … WebVR」且「optimized from the ground up for WebVR」。`/docs/` 根路徑本輪 **500** |
| 15 | [Apple AR Quick Look 畫廊](https://developer.apple.com/augmented-reality/quick-look/) | 畫廊可讀：Safari / Messages 等用 **USDZ**。ARKit 程式設計頁 `documentation/arkit/previewing_a_model_with_ar_quick_look` 與連字元變體本輪 **超時**，不假裝讀過 |
| 16 | [Android Scene Viewer](https://developers.google.com/ar/develop/java/scene-viewer) | 原生 intent，不是頁內 WebXR。`file=` 指向託管 glTF；要 ARCore 裝置 + Play Services for AR + Google 應用 |

上表 **16** 條。同簇不佔名額：B2-3D 的 WebGPU TR；B4-3D 的 Three / R3F / Babylon；B3-Bab；B3-Canv（Canvas 2D）。編輯稿 `https://immersive-web.github.io/webxr/` 對齊 TR，不另開條。USD 組合場景見 [[queries/第七批蒸餾目標]] **B7-USD**，不佔本表。

## 如何運作

### 會話：查 → 點 → 要 → 幀

典型流：`isSessionSupported(mode)` → 頁面廣告 XR → 等瞬時啟用 → `requestSession(mode)` → 幀迴圈出圖直到會話結束。`inline` 必須支援，輸出在 HTML 裡；預設 inline 裝置不報姿態。`immersive-vr` 獨佔頭顯且不意圖混現實。`immersive-ar` 由 AR 模組定義，核心 TR 寫明未實現該模組就不得把該模式列入裝置。無 `xr-spatial-tracking` 時沉浸會話被拒；inline 仍可開，參考空間收成 `viewer`。

WebGL 上下文要 `xrCompatible` 才能交給會話。這是繫結，不是第二套渲染器。Three / Babylon 怎麼建場景歸 B2-3D / B4-3D。

手柄態在 Gamepads 模組：`XRInputSource.gamepad` 每幀原地更新，不能跨幀比物件引用。`id` 必須空串。

### 資產：glTF ≠ USDZ ≠ 引擎物件

glTF 2.0 用 JSON 描述 scenes / nodes / meshes / buffers / materials / textures / skins / animations，可打成 `.glb`。擴充套件（KHR_* 等）在 Registry 另冊。校驗用 Validator，不要用引擎「能開啟」當符合性。ISO 12113:2022 只是國際標準編號，不是可免費引用的正文；本頁以 Khronos 2.0.1 HTML 為準。

iOS Quick Look 主吃 USDZ（或 `.reality`）。model-viewer 可現場生成 USDZ，但示例寫明自動檔還不穩帶動畫。Android Scene Viewer 吃託管 glTF，走 intent，離開瀏覽器。

靜圖 / 影片容器與幀編解碼歸 [[concepts/媒體格式與編解碼]]，不是 glTF。USD 是組合場景，不是本頁的傳輸網格，見 [[queries/第七批蒸餾目標]] B7-USD。

### 三殼不要併成一詞

| 殼 | 還在哪 | 資產 | DOM 能否跟著進 AR |
|---|---|---|---|
| WebXR + model-viewer / 自繪 | 瀏覽器會話 | glTF | 可以（DOM Overlay 另模組，仍 Unstable） |
| Scene Viewer | Android 原生 | glTF URL | 否 |
| AR Quick Look | iOS / visionOS 系統預覽 | USDZ | 否 |

A-Frame 是 three.js 上的宣告式殼，不是 WebXR 規範實現，也不是 glTF 校驗器。

## 必須保留的衝突

- **A-Frame 仍寫已廢 WebVR。** MDN 寫 WebVR 已棄、從未批准、應遷 WebXR。A-Frame 1.8.0 首頁仍「Make WebVR」，介紹仍列 WebVR 並無條件寫「為 WebVR 最佳化」。兩邊都留：文件口徑過時；實現可能已坐在 Three / WebXR 上。不要靜默改寫成「A-Frame = WebXR」。
- **Apple AR Quick Look 文件超時。** 2026-08-14 直讀 `developer.apple.com/documentation/arkit/previewing_a_model_with_ar_quick_look`（及連字元變體）超時。活源只到畫廊頁。不補未讀到的 API 細節。
- **核心 CRD ≠ 模組 Rec。** Device API 是 2026-06-09 CRD；AR 是 2025-04-25 CRD；Gamepads / Hit Test / DOM Overlay 仍是 WD。MDN 模組表不是成熟度表。
- **頁內 WebXR ≠ 原生預覽。** Scene Viewer 與 Quick Look 帶走會話；頁面 DOM 不跟著走。
- **ISO 12113 ≠ 可引用正文。** 總站提到國際標準；本庫只鏈 Khronos 2.0.1。
- **A-Frame `/docs/` 根路徑本輪 500**；可讀介紹在 `/docs/1.8.0/introduction/`。
- 本頁對映 iframe 策略與資產槽位；**不是**「工坊已上 WebXR / glTF / model-viewer / A-Frame」。

## 例子

- 正例：先 `isSessionSupported('immersive-vr')`，使用者點選後再 `requestSession`；iframe 寫上 `allow="xr-spatial-tracking"`。
- 正例：商品模型發 glTF 2.0，用 Validator 過擴充套件；頁內用 model-viewer，Android 可回落 Scene Viewer，iOS 另備 USDZ。
- 反例：把 A-Frame 文件裡的 WebVR 寫成現行標準，或呼叫 `navigator.getVRDisplays()`。
- 反例：引用 ISO 12113 付費 PDF，或把新聞裡的「glTF 2.1」寫成 Registry 現行版本。
- 反例：在無策略的 TH iframe 裡申請 `immersive-ar`，或指望 Quick Look 裡還能點頁面按鈕。

## 邊界與易混概念

- 不包括：ISO 付費全文、盜版模型包、攻擊或指紋利用步驟、卡 JSON/PNG、選題成品。
- WebXR ≠ WebVR。後者已廢，從未成 Rec。
- WebXR ≠ OpenXR。OpenXR 是原生執行時，不在本頁。
- glTF ≠ USDZ ≠ FBX。投遞合同與系統預覽格式不是同一個。
- glTF ≠ Three / Babylon 場景圖。引擎入口見 B2-3D / B4-3D。
- glTF ≠ USD。傳輸網格 ≠ 組合場景；材質擴充套件也不等於 MaterialX。
- `<model-viewer>` ≠ 自建 `XRSession`。它是元件，預設可走三殼。
- Canvas 2D 歸 B3-Canv；三維規範歸 B2-3D。靜圖 / 影片編解碼歸 [[concepts/媒體格式與編解碼]]。
- DOM Overlay ≠ 宿主 HUD。後者見 [[concepts/入口外殼與HUD宿主]]。
- 本頁不是「工坊已上 XR」。

## 對映到本倉庫

對映放最後，不當過濾器。本倉是否接線、真機是否驗收，都不在本頁宣佈。

- **iframe**：[[concepts/酒館宿主與iframe分層]]。沉浸會話要框上的 `xr-spatial-tracking`，還要安全上下文與瞬時啟用。無策略時不要假裝能進頭顯。策略頭分層見 [[concepts/CSP與Trusted Types]]。
- **嵌入路徑**：[[comparisons/嵌入三路徑對照]]。原生預覽殼會離開宿主頁，不是 TH 訊息框 HUD。
- **資產**：[[concepts/媒體庫路徑]] 管槽位與來源，不是 glTF 符合性。靜圖 / 影片合同見 [[concepts/媒體格式與編解碼]]。
- **引擎**：Three / WebGPU / Babylon 不在本頁展開，見 [[queries/第二批蒸餾目標]] B2-3D、[[queries/第四批蒸餾目標]] B4-3D。
- **USD**：組合場景與 MaterialX 見 [[queries/第七批蒸餾目標]] B7-USD，不要並進本頁。
- **HUD**：[[concepts/入口外殼與HUD宿主]] 的抽屜 / 浮窗掛宿主 document，不是 WebXR DOM Overlay。
- **前端取捨**：行業殼與引擎選型不當過濾器，見 [[concepts/前端架構名詞與取捨]]。卡內 fail closed 仍歸 [[concepts/創意工坊與安全契約]]。

本頁不寫「已採用 WebXR / glTF / model-viewer / A-Frame」。賬本仍在 [[queries/第三批蒸餾目標]]。

## 來源與證據

- WebXR 核心與模組成熟度：Device API CR Draft 2026-06-09；AR Module CR Draft 2025-04-25；Gamepads WD 2025-07-07；Hit Test WD 2025-12-11；DOM Overlays WD 2024-09-24（頁頭 Unstable）。
- WebVR 已廢：MDN WebVR API（從未批准成標準；繼任 WebXR）。
- glTF 現行可讀合同：Khronos Registry 2.0 + 2.0.1 HTML（2021-10-11）。ISO/IEC 12113:2022 付費全文不收。
- 校驗：glTF Validator 對照 2.0 與擴充套件，本地跑、不上傳。
- 三殼：model-viewer AR 示例（`webxr` / `scene-viewer` / `quick-look`）；Scene Viewer 官方 intent 頁；Apple 畫廊頁（USDZ）。
- A-Frame 文件仍寫 WebVR：1.8.0 介紹；`/docs/` 根路徑本輪 500。
- Apple ARKit 程式設計頁本輪超時：活源只到畫廊，不補未讀 API。
- 查詢賬本：[[queries/第三批蒸餾目標]] B3-XR；鄰接 [[queries/第二批蒸餾目標]] B2-3D、[[queries/第四批蒸餾目標]] B4-3D、[[queries/第七批蒸餾目標]] B7-USD。
- 分路原稿仍在 [[10-收件箱/寫回候選/概念-WebXR與glTF]]。

已知衝突見上節，不靜默覆蓋。工坊或髮卡真機未核任何 XR 會話——本來就沒有已落地的 `XRSession` 可驗。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] 一句話定義；會話 / 資產 / 預覽殼分開
- [x] 權威入口 16 條；ISO 付費、盜版、攻擊已排除
- [x] Apple 文件超時與 A-Frame/WebVR 衝突未覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[queries/第三批蒸餾目標]]
- [[queries/第二批蒸餾目標]]
- [[queries/第四批蒸餾目標]]
- [[queries/第七批蒸餾目標]]
- [[10-收件箱/寫回候選/概念-WebXR與glTF]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/媒體庫路徑]]
- [[concepts/媒體格式與編解碼]]
- [[concepts/CSP與Trusted Types]]
- [[concepts/入口外殼與HUD宿主]]
- [[concepts/前端架構名詞與取捨]]
- [[concepts/創意工坊與安全契約]]
- [[concepts/概念分級]]
- [[comparisons/嵌入三路徑對照]]
