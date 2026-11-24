---
title: OMNI 正則與 data 屬性選擇器
created: 2026-08-13
updated: 2026-08-13
type: concept
status: active
tags:
  - wiki
  - concept
  - sillytavern
  - tooling
sources:
  - raw/workshop-cards-2026-08-13/analysis_omni-README.txt
  - raw/workshop-cards-2026-08-13/卡B-v2.0.0-README.md
knowledge_class: factual
---

# OMNI 正則與 data 屬性選擇器

## 一句話定義

OMNI 是變數預分析 / 變數同步的訊息樓美化層。選擇器必須走 `data-*`，因為 SillyTavern 會給訊息 HTML 的 class 加 `custom-` 字首，class 選擇器會失配。

## 為什麼重要

用 class 寫樣式或查詢掛載點，在真機上會變成裸白或吞正文。這是同源卡顯示層的硬規則。

## 如何運作

兩塊面板：

| 中文 | 英文 / 程式碼 | 作用 |
|---|---|---|
| 預分析青框 | Panel A，`<analysis>`，`data-xy-omni="analysis"` | 只讀展示思維鏈預分析 |
| 變數同步綠框 | Panel B，變數更新完成 | 展示同步結果；進度另有琥珀框 |

正則只做顯示：`markdownOnly: true`，`promptOnly: false`。框出現在聊天裡不等於洩漏進模型上下文。

匹配不能用裸 `[\s\S]*?` 跨標籤。預分析用「不跨同名標籤」的惰性匹配，防止模型在規劃裡裸寫 `<analysis>` 時把整段正文吞進框。

掛載示例：

```html
<div data-xy-omni="analysis">
  <div data-xy-omni-raw><!-- 原文 --></div>
</div>
```

```css
[data-xy-omni="analysis"] summary::-webkit-details-marker {
  display: none;
}
```

`class="omni-analysis"` 只當可讀裝飾，不參與任何選擇器。媒體庫與控制中心提取掛載點同樣走 data 屬性。

視覺主體用內聯 `style=`（clip-path、漸變、徽章）。`<style>` 塊只隱藏 details marker。

## 例子

- 正例：卡B OMNI 在生成結束後一次性 DOM 後處理，不改訊息原文、不寫變數、不監聽流式 token。
- 反例：progress 版用 `[\s\S]*$` 吞正文；已從模組中刪除。

## 邊界與易混概念

- 編輯預分析、整樓重算 `rerollFromAnalysis` 屬於控制中心 handler，不屬於正則模組。
- 思維鏈裡若出現完整 `<analysis>…</analysis>` 對，頁面會多一個青框；功能無損害，正則層無法消掉。
- 指南庫曾推斷 DOMPurify 會剝內聯 style；生產 OMNI 靠內聯且真機可用，該推斷按誤報處理，仍以真機為準。

## 來源與證據

- `raw/workshop-cards-2026-08-13/analysis_omni-README.txt`
- `raw/workshop-cards-2026-08-13/卡B-v2.0.0-README.md`

## 相關內容

- [[concepts/訊息渲染與正則管線]]
- [[concepts/媒體庫路徑]]
- [[concepts/控制中心與狀態列]]
- [[concepts/角色卡DOM與掛載點]]
- [[concepts/角色卡前端名詞中英對照]]
