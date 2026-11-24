---
title: CJK排印與豎排
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
  - https://www.w3.org/TR/clreq/
  - https://www.w3.org/TR/jlreq/
  - https://www.unicode.org/reports/tr50/
  - https://www.w3.org/TR/css-writing-modes-3/
  - https://www.w3.org/TR/css-ruby-1/
  - https://www.w3.org/International/articles/ruby/
  - https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-ruby-element
  - https://cldr.unicode.org/
  - https://cldr.unicode.org/index/downloads
  - https://www.unicode.org/reports/tr35/
  - https://www.unicode.org/reports/tr35/tr35-messageFormat.html
  - https://www.rfc-editor.org/info/bcp47
  - https://www.rfc-editor.org/rfc/rfc5646.html
  - https://std.samr.gov.cn/
  - https://projectfluent.org/fluent/guide/
  - https://tc39.es/ecma402/
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
---

# CJK排印與豎排

行業排印與 locale 合同：中日韓怎麼排、豎排字怎麼轉、注音/ruby 怎麼標、日期數字按哪套 locale 資料走。不是已採用皮膚，也不等於瀏覽器已經按需求文件畫完。檢索日：2026-08-14。國標全文不進 Vault。

## 一句話定義

CJK 排印是「漢字文化圈出版物要長什麼樣」的需求與實現合同；豎排是其中一條書寫方向；注音/ruby 是字旁標註；CLDR / BCP 47 是 locale 標籤和格式資料，不是排版引擎。

## 為什麼重要

同一段中文在大陸橫排、臺港直排、日文混排裡，標點落點、引號形態、西文是否側放都不一樣。網頁側要分清三層：需求文件說什麼、CSS/Unicode 規定怎麼算、引擎實際畫了什麼。角色卡訊息樓和開局頁若做豎排或注音，只能接到現有渲染管線，不能假裝自己是印刷引擎。

## 權威入口

檢索日 2026-08-14。下表 15 條均可點；CLREQ 與 B2-Type-01 / B2-I18n-13 是**同一份樞紐**，不是兩條新發現。

| # | 入口 | 當時狀態 | 本頁用法 |
|---|---|---|---|
| 1 | [CLREQ](https://www.w3.org/TR/clreq/) | Group Note Draft，2026-08-04 | 中文排版需求。B2-Type-01 與 B2-I18n-13 同文 |
| 2 | [JLREQ](https://www.w3.org/TR/jlreq/) | WG Note，2020-08-11 | 日文組版需求；英文字為官方 |
| 3 | [UAX #50](https://www.unicode.org/reports/tr50/) | Unicode 17.0.0，2025-07-24，Rev. 33 | 豎排預設朝向 `vo` |
| 4 | [CSS Writing Modes 3](https://www.w3.org/TR/css-writing-modes-3/) | Rec，2019-12-10 | `writing-mode` / `text-orientation`；不用 `vrt2` |
| 5 | [CSS Ruby 1](https://www.w3.org/TR/css-ruby-1/) | WD，2022-12-31 | `ruby-position`，含 `inter-character` |
| 6 | [W3C Ruby Markup](https://www.w3.org/International/articles/ruby/) | 實現綜述 | 簡單 ruby 普遍可用；注音要 `inter-character` |
| 7 | [HTML `ruby`](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-ruby-element) | WHATWG 活標準 | 標註關係，不規定落點 |
| 8 | [CLDR](https://cldr.unicode.org/) | 資料現行 **48.2**（2026-03-17 釋出） | locale 資料樞紐。B3-CLDR |
| 9 | [CLDR Downloads](https://cldr.unicode.org/index/downloads) | 各版凍結、不改已釋出包 | 取數入口 |
| 10 | [UTS #35 LDML](https://www.unicode.org/reports/tr35/) | 與 CLDR 發行對齊 | 資料結構與演算法 |
| 11 | [LDML Part 9 MF2](https://www.unicode.org/reports/tr35/tr35-messageFormat.html) | 文頭 Version 48.2 | MessageFormat 2；**不相容 ICU1** |
| 12 | [BCP 47](https://www.rfc-editor.org/info/bcp47) | RFC 5646 + RFC 4647 | 語言標籤與匹配 |
| 13 | [RFC 5646](https://www.rfc-editor.org/rfc/rfc5646.html) | 2009-09 | 標籤語法真身 |
| 14 | [全國標準資訊公共服務平臺](https://std.samr.gov.cn/) | 國標官方入口。B3-GB | **只記入口，不搬全文、不繞登入** |
| 15 | [Fluent Syntax Guide](https://projectfluent.org/fluent/guide/) | 指南仍活 | 正式 spec 頁 `…/fluent/spec/` **404** |

[ECMA-402](https://tc39.es/ecma402/) 是 JS `Intl` 合同，常間接消費 CLDR，不另佔錶行。

## 如何運作

### 需求文件 ≠ 瀏覽器保證

[CLREQ](https://www.w3.org/TR/clreq/) 與 [JLREQ](https://www.w3.org/TR/jlreq/) 寫的是「實現應當滿足的組版需求」，狀態分別是 Group Note Draft 與 Working Group Note，**不是** CSS Rec，也不是「Chrome / Firefox / Safari 已經按全文做完」的保證。JLREQ 以英文字為權威，主要依據 JIS X 4051，並宣告不打算升 Recommendation。CLREQ 文頭寫明草稿、勿當已定稿引用。

CLREQ 的硬口徑：排版規則上**地區差大於繁簡差**。大陸少數直排/繁體書仍按大陸標點習慣；臺港直排按當地習慣。使用者代理應按**區域**（BCP 47 的 region），不要只看「簡體/繁體」開關。大陸點號多落字面一角，臺港多居中；大陸直排引號常換成直角引號。

### 豎排：UAX #50 + `vert`，不用 `vrt2`

CSS 豎排先改塊流向：[Writing Modes 3](https://www.w3.org/TR/css-writing-modes-3/) 的 `writing-mode: vertical-rl`（中日傳統直排，行從右往左）或 `vertical-lr`。預設 `text-orientation: mixed` 時，每個字的朝向跟 [UAX #50](https://www.unicode.org/reports/tr50/) 的 `Vertical_Orientation`（`vo`）：

| `vo` | 含義 |
|---|---|
| `U` | 正立，與碼錶相同 |
| `R` | 順時針轉 90° |
| `Tu` | 通常要換豎排字形；缺字形時可正立回退 |
| `Tr` | 通常要換豎排字形；缺字形時可側放回退 |

`vo` 在 UAX #50 裡是**資訊性**屬性：無標記時給可互換的預設朝向，高層協議（標記、排版軟體）可以覆蓋。漢字、假名、諺文預設正立；拉丁詞句預設側放。

字形替換走 OpenType **`vert`（Vertical Alternates）**。Writing Modes 3 寫明：面向混排朝向的 **`vrt2` 不被 CSS 使用**——`vrt2` 把朝向交給字型設計師；CSS 用 UAX #50 決定正立或側放，再對需要換形的字啟用 `vert`。不要在卡 CSS 或字型子集說明裡把 `vrt2` 寫成網頁豎排合同。

直排裡的西文/數字，CLREQ 列了正立、側放、當漢字全形三種；瀏覽器預設只保證 UAX #50 那套，其餘要作者用 `text-orientation` 或標記覆蓋。

### 注音 / ruby：`inter-character` 引擎未齊

HTML [`ruby`](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-ruby-element) 只建立「基文 ↔ 標註」關係。落點由 [CSS Ruby 1](https://www.w3.org/TR/css-ruby-1/) 的 `ruby-position` 管：`over` / `under` / `inter-character`。橫排時 `inter-character` 把注音插到字右側，並強制標註側 `writing-mode: vertical-rl`；豎排容器裡它等價於 `over`。

[W3C Ruby Markup](https://www.w3.org/International/articles/ruby/)：簡單單面 ruby 三大引擎都能畫（橫排在上、豎排在右）。注音（Bopomofo / 注音符號）**沒有**專用標記，寫法與 mono ruby 相同，但必須 `ruby-position: inter-character` 才會跑到字右。該文與 Can I Use（統計至 2026-06）一致的結論是：**`inter-character` 引擎未齊**——Safari 18.2+ 較完整；Chromium 偏部分；Firefox 解析層常拒。聲調移到注音右側更未齊。表格型 ruby（先全部 `rb` 再全部 `rt`）主要是 Gecko 能排；Blink/WebKit 能解析但常排錯。雙面 ruby 也不要當跨引擎基線。

### CLDR / BCP 47 / 訊息格式

[CLDR](https://cldr.unicode.org/) 提供日期、數字、複數、排序等 locale 資料。檢索日 2026-08-14：站點 News 寫 **2026-03-17 釋出 CLDR 48.2**；2026-07-07 關閉的是 **49** 決議期調查，**現行資料仍是 48.2**。[LDML Part 9](https://www.unicode.org/reports/tr35/tr35-messageFormat.html) 文頭 Version 也是 48.2。

語言標籤走 [BCP 47](https://www.rfc-editor.org/info/bcp47)（[RFC 5646](https://www.rfc-editor.org/rfc/rfc5646.html) 語法 + RFC 4647 匹配）。排印區域應用 `zh-CN` / `zh-TW` / `zh-HK` 這類帶 region 的標籤，不要只用 `zh-Hans` / `zh-Hant` 當標點規則開關。

MessageFormat 2 是 ICU MessageFormat 的繼任。LDML Part 9 設計限制寫明 **Non-Goal：與 ICU MessageFormat 1.0 語法向後相容**。舊 `{count, plural, …}` 不能當 MF2 原文喂。Fluent 是另一套 FTL；[指南](https://projectfluent.org/fluent/guide/) 仍可開，正式 spec 頁 `https://projectfluent.org/fluent/spec/` 在 2026-08-14 **404**。JS 側格式化常經 [ECMA-402](https://tc39.es/ecma402/) / `Intl`，那是 API，不是 CLDR 資料包本身。

### 國標：只記入口

CLREQ 引用 GB/T 15834—2011《標點符號用法》等。本 Vault **只記** [全國標準資訊公共服務平臺](https://std.samr.gov.cn/)。不搬條文、不貼預覽、不寫繞登入辦法。B2-Type 已記：該號預覽常要登入。需要條文時人去官方站，不把國標正文寫進概念頁。

## 與蒸餾賬本的重疊

| 賬本編號 | 關係 |
|---|---|
| B2-Type-01 | 樞紐就是 CLREQ；本頁展開，不是第二份 CLREQ |
| B2-I18n-13 | **與 B2-Type-01 同文**（第二批已標）。本頁合併書寫，不拆成兩條「新發現」 |
| B3-Vert | 豎排 / 注音 / ruby；樞紐 UAX #50 |
| B3-CLDR | CLDR / BCP 47 / MF2 |
| B3-GB | 國標入口四條量級；本頁只留門戶 |

## 例子

- 正例：直排容器寫 `writing-mode: vertical-rl`，混排朝向交給 UAX #50；需要換形的標點依賴帶 `vert` 的字型。
- 正例：日文讀音用 `<ruby><rb>漢</rb><rt>かん</rt></ruby>`，落點用 `over`；不要為注音另造元素。
- 正例：介面串的 locale 寫成 `zh-TW`，數字/日期走 CLDR 48.2 資料或 `Intl`，不手寫「民國年」分支當通用合同。
- 反例：把 CLREQ/JLREQ 某一節當成「瀏覽器已實現」的驗收標準。
- 反例：網頁豎排啟用 `vrt2`，或假定 `inter-character` 在 Chromium / Firefox 與 Safari 同形。
- 反例：把 ICU1 / Fluent / MF2 三種訊息串當成可互換原文。
- 反例：把 GB/T 全文或登入牆後的預覽貼進 Vault。

## 邊界與易混概念

- 本頁不是角色卡皮膚清單，也不是「本倉庫已採用豎排/注音」。
- CLREQ/JLREQ ≠ CSS Writing Modes ≠ 某引擎實現。
- `writing-mode` 改塊流向；`text-orientation` 改字在豎排行裡的朝向；`direction` / UBA 管雙向文，不是直排。
- `vert` ≠ `vrt2`。CSS 合同是前者加 UAX #50。
- ruby 標記 ≠ 注音落點。注音要 `inter-character`，而該值引擎未齊。
- BCP 47 標籤 ≠ 排印實現。`zh-Hant` 不自動換成臺港標點。
- CLDR 資料版本 ≠ LDML 章節號 ≠ ICU 庫版本 ≠ `Intl` 實現年。
- MF2 ≠ ICU1 ≠ Fluent。MF2 明文不相容 ICU1；Fluent 正式 spec 頁曾 404。
- 國標入口 ≠ 已授權全文。不進 Vault 正文。

## 來源與證據

- 需求：CLREQ 2026-08-04 DNOTE；JLREQ 2020-08-11 Note。
- 豎排：UAX #50（Unicode 17.0.0）；Writing Modes 3 Rec 明確不用 `vrt2`、改走 UAX #50 + 側放/正立。
- 注音：CSS Ruby 1 WD；W3C Ruby 文與 Can I Use 均顯示 `inter-character` 未齊。
- Locale：cldr.unicode.org 2026-08-14 仍列 48.2 為已釋出資料；LDML Part 9 文頭 48.2；BCP 47 = RFC 5646 + 4647。
- 訊息格式：Part 9 Non-Goal 不相容 ICU1；Fluent `…/fluent/spec/` 404，指南仍 200。
- 國標：只核到 https://std.samr.gov.cn/ 門戶可開。

### 已知衝突（必須保留，不得靜默合併）

1. CLREQ/JLREQ 是需求文件，**不是**瀏覽器保證實現。
2. 豎排用 UAX #50 + `vert`，**不用** `vrt2`（CSS 明文）。
3. `inter-character` **引擎未齊**；不可寫成跨引擎基線。
4. GB/T **只記** https://std.samr.gov.cn/ ，不搬全文、不繞登入。
5. CLDR 資料現行 **48.2**（檢索日 2026-08-14）；49 仍在後續週期，未替換 48.2。
6. Fluent 正式 spec 頁 **404**；MF2 **不相容** ICU1。
7. B2-I18n-13 與 B2-Type-01 **同文重疊**（都是 CLREQ），本頁只寫一次。
8. UAX #50 的 `vo` 是資訊性預設；與「字型裡有豎排替換」不是同一層。
9. 簡單 ruby 三引擎可用 ≠ 表格型 / 雙面 / 注音右側已齊。
10. CLREQ：地區差 > 繁簡差；與「按 Hans/Hant 切標點」的常見實現習慣衝突，兩邊都留。

## 對映到本倉庫

對映，不是「某張卡已經豎排」。

**訊息樓。** 玩家看見的樓是宏 → 正則 → Markdown → 淨化 → `.mes_text`，見 [[concepts/訊息渲染與正則管線]]。`writing-mode` 或 `<ruby>` 若要出現在樓裡，只能接這條管線（正則注入 HTML，或模型輸出被允許留下的標籤）。Showdown 不保證保留 `ruby`；淨化名單未核之前，不能假設注音標記能活過匯入。OMNI 選擇器必須走 `data-*`，見 [[concepts/OMNI正則與data屬性選擇器]]。給整列 `.mes_text` 套 `vertical-rl` 會連帶旋轉宿主氣泡、選項條和行動橋，三張穩定卡都沒有這條合同。

**開局頁。** 自定義開局是一次性向導，見 [[concepts/開局頁路徑]]。卡A遠端開局跑在獨立 HTML；怪談是樓內表。豎排/注音若做，優先放**開局頁自己的文件**（遠端頁或樓內片段的區域性容器），不要改宿主 `body` 的書寫方向。跨文件 iframe 的 `writing-mode` 不傳給父頁，見 [[concepts/酒館宿主與iframe分層]]。

**注音。** 橫排訊息樓裡做臺灣注音，規範路徑是 `<ruby>` + `ruby-position: inter-character`。因引擎未齊，不能當釋出驗收項；真機未驗之前只當實驗。

**Locale。** 工坊目錄、卡片語言欄位、`Intl` 格式化走 BCP 47 + CLDR 48.2 口徑。不要手寫一套與 CLDR 分叉的日期/數字規則當「中文標準」。

**國標。** 不進 Vault 正文，不進 `raw/` 映象。需要 GB/T 15834 等條文時，人從官方入口查；本頁不代替標準文字。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區，並同步 `index.md` 與 `log.md`

## 相關內容

- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
- [[concepts/視覺CSS與設計token]]
- [[concepts/訊息渲染與正則管線]]
- [[concepts/開局頁路徑]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/OMNI正則與data屬性選擇器]]
- [[comparisons/嵌入三路徑對照]]
