---
title: JPEG XL與HDR靜圖
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
  - https://jpeg.org/jpegxl/
  - https://jpeg.org/jpegxl/documentation.html
  - https://jpeg.org/jpegxl/software.html
  - https://www.iana.org/assignments/media-types/image/jxl
  - https://www.iana.org/assignments/media-types/image/avif
  - https://caniuse.com/jpegxl
  - https://caniuse.com/avif
  - https://developer.chrome.com/release-notes/145
  - https://webkit.org/blog/14445/webkit-features-in-safari-17-0/
  - https://aomediacodec.github.io/av1-avif/
  - https://www.w3.org/TR/png-3/
  - https://www.w3.org/TR/css-images-4/
  - https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
  - queries/第五批蒸餾目標.md
  - concepts/媒體庫路徑.md
knowledge_class: factual
---

# JPEG XL與HDR靜圖

本頁不是已採用編碼棧，也不是成品相簿。檢索時間：2026-08-14。蒸餾 [[10-收件箱/寫回候選/第五批-B5-JXL]]，補靜圖編碼與瀏覽器裝載。不重抄 WebCodecs、Display P3、`css-color-hdr`。

## 一句話定義

JPEG XL、AVIF、PNG 第三版是三份靜圖合同：編碼與元資料各寫各的；瀏覽器裝載看 MIME 與預設解碼，不是「下一代圖」一詞。HDR 靜圖走碼流或 cICP，不是 CSS Display P3。

## 為什麼重要

同一句「投一張 HDR 圖」會落到三份編碼、兩套裝載選擇器，以及「檔案能帶 HDR ≠ 屏已是 HDR」。Safari 17 已裝 JPEG XL，Chrome Stable 預設仍不解 `image/jxl`。把 JXL 當現網首選，或把 AVIF 寫成 JXL 的替代品，都會在 Chromium 預設路徑裂圖。

## 權威入口

檢索日 2026-08-14。下表 **12** 條是賬本樞紐，相容摘自各頁正文，不是本機實測。ISO 21496-1:2025 增益圖本輪未開啟付費全文，不升編號。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [jpeg.org JPEG XL](https://jpeg.org/jpegxl/) | ISO/IEC 18181 樞紐；無損轉碼既有 JPEG 並可還原同一份 JPEG；寫明寬色、HDR、高位深、動畫、alpha、無損與漸進 |
| 2 | [JPEG XL 文件](https://jpeg.org/jpegxl/documentation.html) | 白皮書 v2.0（2023）；綜述 arXiv:2506.05987；ISO 付費全文不搬 |
| 3 | [IANA `image/jxl`](https://www.iana.org/assignments/media-types/image/jxl) | **2024-03-04 正式登記**；規範 ISO/IEC 18181-2；裸碼流魔數 `FF 0A`，盒式 `00 00 00 0C 4A 58 4C 20 0D 0A 87 0A`；副檔名 `.jxl` |
| 4 | [Can I Use JPEG XL](https://caniuse.com/jpegxl) | Safari **17.0–26.5 Partial**；Chrome 91–109 預設關，**110–144 已撤**，145–154 再標 Disabled；Firefox 全程預設關 |
| 5 | [Chrome 145 發行說明](https://developer.chrome.com/release-notes/145) | 穩定日 **2026-02-10**；JXL 在 Origin trials；Blink 用 `jxl-rs`；門是 `enable-jxl-image-format` + `enable_jxl_decoder`；**不是 Stable 預設開** |
| 6 | [WebKit Safari 17.0](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/) | 2023-09：**Safari 17.0 裝 JPEG XL**（含 SVC / WKWebView）；示例 `<source type="image/jxl">` 與 `image-set(… type("image/jxl"))` |
| 7 | [AVIF v1.2.0](https://aomediacodec.github.io/av1-avif/) | AOM Final **2025-10-16**；AV1 進 HEIF/ISOBMFF；明文 HDR / WCG / SDR；Baseline `MA1B`、Advanced `MA1A`；HDR 盒 `clli` / `cclv` / `mdcv` |
| 8 | [IANA `image/avif`](https://www.iana.org/assignments/media-types/image/avif) | 2021-01-28；可選 `codecs` / `profile` / `itemtypes` |
| 9 | [Can I Use AVIF](https://caniuse.com/avif) | Chrome 85+、Firefox 93+、Safari **16.4+ 完整**、Edge 121+；四大引擎現網可投 |
| 10 | [PNG 第三版 Rec](https://www.w3.org/TR/png-3/) | W3C Rec **2025-06-24**；允許 HLG / PQ（BT.2100）；`cICP` 用 ITU-T H.273；處理優先順序 cICP 先於 iCCP |
| 11 | [CSS Images 4](https://www.w3.org/TR/css-images-4/) | WD **2025-09-30**；`image-set()` 的 `type()` 按 MIME 丟掉 UA 不支援的項 |
| 12 | [JPEG XL 軟體](https://jpeg.org/jpegxl/software.html) | Part 3 符合性與參考解碼圖在 [libjxl/conformance](https://github.com/libjxl/conformance) |

同簇不佔名額：B2-Media 的 [MDN 影像型別](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types)（本輪**無 JPEG XL 節**）、`<picture>` / `srcset`；B3-Codec WebCodecs；B3-Hdr Display P3 / `css-color-hdr`。[[concepts/媒體格式與編解碼]] 已蒸 B2/B3，本頁不重抄。

## 如何運作

### 編碼三份，不要併成「下一代圖」

**JPEG XL** 是 ISO/IEC 18181。無損轉碼舊 JPEG、再還原同一份 JPEG 是遷移合同，不是視覺近似。裸碼流與盒式兩種魔數都在 IANA；只認 `.jxl` 副檔名不夠。檔次在 18181-1 Annex M，接收端可以解到一半再失敗。

**AVIF** 是 AV1 靜圖進 HEIF。不是「一個 AV1 幀改字尾」：要 `av01` 項、`av1C`、與 MIAF 對齊的品牌。`MA1B` / `MA1A` 是互操作檔，不是畫質檔。單層常見投遞仍按 MDN：無漸進、須整檔案。分層漸進是規範能力，不是四大引擎都保證的 Web 預設。

**PNG-3** 是已 Rec 的 Web 靜圖/動圖容器。HDR 靠 cICP + HLG/PQ，不是另發明副檔名。它補「舊 PNG 也能帶影片碼點」，不是 AVIF/JXL 的替代品。

### 裝載：`<picture>` 與 `image-set()` 都只問 MIME

HTML：`<picture>` 的 `source type` 選格式（B2 已收）。CSS：`image-set()` + `type()`。兩套都是「UA 認不認這個 MIME」，不是 WebCodecs `isConfigSupported()`。`type()` 寫錯 MIME 只讓該項出局；位元組仍按 URL 真實格式解。背景圖沒有 `<picture>`，只能靠 `image-set()`。

`<img src="*.jxl">` 在 Chrome 預設路徑會裂；Safari 17+ 可解。投 JXL 必須帶 JPEG/AVIF/WebP 回退。AVIF 現網可作首選格式，仍按 MDN 留 JPEG/PNG 回退。不要用 B2 樞紐冒充 JXL 已寫入 MDN 總表。

### HDR 靜圖只記編碼面

三份官方說法都談靜圖 HDR，層不同：

1. **碼流自帶**：JXL 與 AVIF 寫支援 HDR；AVIF 用 `mdcv` / `clli` / `cclv`。
2. **Web 點陣圖容器**：PNG-3 把 HDR 寫成可存 HLG/PQ，用 cICP 點名傳遞函式。
3. **增益圖**：同一檔案裡一張 SDR 底圖 + 一張增益，按屏頭房合成。標準號 ISO 21496-1:2025，本輪未開啟付費全文，不當入口。

以上都不是 Display P3，也不是「這臺顯示器已是 HDR」。

## 必須保留的衝突

- **Safari 17 已裝 JPEG XL，Chrome Stable 預設無。** WebKit 寫 Safari 17.0 已裝（含 SVC / WKWebView）。Can I Use 把 Safari 標 Partial 至 26.5。Chrome 110–144 撤掉，145 只開 Origin Trial / 旗標，Stable 預設仍不解 `image/jxl`。Firefox 預設關。一邊「Safari 能投 JXL」，一邊「Chromium 預設不能」，兩邊都留。
- **AVIF vs JXL 不是替代關係。** AVIF 是現網能投的靜圖；JXL 是另一份 ISO 編碼（漸進 + 無損還原 JPEG）。Can I Use 兩頁都寫「競爭」，不是「誰取代誰」。
- **AVIF「無漸進」兩邊留。** MDN 寫無漸進、須整檔案；AVIF v1.2.0 寫可用分層做漸進。Web 常見單層仍按 MDN。
- **檔案裡能帶 HDR ≠ CSS Display P3，≠ 屏已是 HDR。** P3 是 SDR 寬色（B3-Hdr）。
- **`image/jxl` 已是 IANA 正式型別 ≠ 四大引擎預設解碼。**
- 本頁對映現網投遞與卡內配額邊界；**不是**「本倉庫已採用 JXL」。

## 例子

- 正例：現網首選 AVIF，`<picture>` 回退 JPEG/PNG；JXL 只當 Safari 增強層，且必須回退。
- 正例：背景圖用 `image-set(url(a.avif) type("image/avif"), url(a.jpg))`，不假裝 CSS 有 `<picture>`。
- 正例：PNG-3 用 cICP 標 HLG/PQ，不當成 `color(display-p3 …)`。
- 反例：給 Chrome Stable 只掛 `<img src="hero.jxl">`，指望預設解碼。
- 反例：把 AVIF 寫成「JXL 的現網替代」，或把 JXL 寫成「已取代 AVIF」。
- 反例：檔案帶了 HDR 元資料，就宣稱「這張圖是 HDR 屏」或「這就是 Display P3」。

## 邊界與易混概念

- 不包括：WebCodecs / 登記冊、Display P3 / `css-color-hdr`、HLS / MSE / PiP、卡內媒體庫槽位、盜版圖包、破解編碼器、解壓炸彈步驟。
- JPEG XL ≠ AVIF ≠ PNG-3。三份合同，不是一詞。
- IANA `image/jxl` 已正式登記 ≠ 四大引擎預設解碼。
- AVIF 規範可分層漸進 ≠ MDN 投遞句「無漸進、須整檔案」。
- 碼流 HDR ≠ 增益圖 ≠ CSS 寬色 ≠ 屏已是 HDR。
- 卡內 GIF / data URL 配額仍看 [[concepts/媒體庫路徑]]，不是本頁 MIME。

## 對映到本倉庫

對映放最後，不當過濾器。本倉是否接線、真機是否驗收，都不在本頁宣佈。

- **媒體庫**：[[concepts/媒體庫路徑]] 的槽位與 GIF/data URL 上限是產品配額，不是 JXL/AVIF/PNG-3 能力表。
- **投遞**：現網按 AVIF + 回退。JXL 只當 Safari 增強層。不要把本頁寫成「本倉庫已採用 JXL」。
- **色**：Display P3 / `css-color-hdr` 見 [[concepts/視覺CSS與設計token]] 與 B3-Hdr 賬本，不在本頁重抄。
- **幀合同**：WebCodecs 見 [[concepts/媒體格式與編解碼]]；本頁只談 `<img>` / `<picture>` / `image-set()`。

蒸餾賬本：[[10-收件箱/寫回候選/第五批-B5-JXL]]；鄰接 [[queries/第二批蒸餾目標]]、[[queries/第三批蒸餾目標]]、[[queries/第五批蒸餾目標]]。

## 來源與證據

- JXL 樞紐與無損轉碼：jpeg.org JPEG XL；文件頁白皮書 v2.0 / 綜述。
- IANA 登記與魔數：`image/jxl` 2024-03-04；`image/avif` 2021-01-28。
- Safari 已裝：WebKit Safari 17.0 公告（含 SVC / WKWebView）。
- Chrome 預設無：Chrome 145 發行說明（Origin trials / 旗標）；Can I Use 110–144 已撤、145–154 Disabled。
- AVIF 現網與 HDR 盒：Can I Use AVIF；AVIF v1.2.0（`mdcv` / `clli` / `cclv`）。
- PNG-3 HDR：W3C Rec 2025-06-24，cICP 先於 iCCP。
- 裝載選擇器：CSS Images 4 的 `image-set()` `type()`。
- MDN 影像型別本輪無 JPEG XL 節；B2 樞紐不當成 JXL 已入總表。
- 查詢賬本：[[queries/第五批蒸餾目標]] B5-JXL；鄰接 [[queries/第二批蒸餾目標]] B2-Media、[[queries/第三批蒸餾目標]] B3-Codec / B3-Hdr。
- 增益圖 ISO 21496-1:2025：本輪未開啟付費全文，不當入口，標未知。

已知衝突見上節，不靜默覆蓋。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] 一句話定義；三份編碼分開寫
- [x] 權威入口 12 條；WebCodecs / Display P3 不佔編號
- [x] Safari/Chrome JXL 分叉、AVIF≠JXL 替代，兩邊都留
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區

## 相關內容

- [[concepts/媒體庫路徑]]
- [[concepts/視覺CSS與設計token]]
- [[concepts/媒體格式與編解碼]]
- [[10-收件箱/寫回候選/第五批-B5-JXL]]
- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
- [[queries/第五批蒸餾目標]]
