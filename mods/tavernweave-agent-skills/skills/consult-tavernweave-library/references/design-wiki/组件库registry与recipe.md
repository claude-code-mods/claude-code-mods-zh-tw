---
title: 元件庫 registry 與 recipe
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
  - raw/workshop-cards-2026-08-13/模組化元件-README.md
  - raw/workshop-cards-2026-08-13/卡A-README.md
knowledge_class: factual
---

# 元件庫 registry 與 recipe

## 一句話定義

`模組化元件/registry.json` 是同源卡可複用原始碼的機器真源；recipe 只選擇模組並宣告輸出，不儲存第二份構建邏輯。

## 為什麼重要

版本目錄裡的 `components/` 是釋出快照。長期結構改在元件庫，不在某一版快照裡改目錄形狀。

## 如何運作

三檔組裝：

| 檔 | 英文 | 做什麼 |
|---|---|---|
| 變數核心 | `variable_core` | 只生成變數鏈路 |
| 元件裝配 | `component_assembly` | 生成某張卡的裝配適配 |
| 釋出 | `release` | 必須生成 recipe 宣告的 `requiredOutputs` |

入口命令（工作區根）：

```powershell
node card_workflow/tools/workflow_components.mjs --mode check
node card_workflow/tools/workflow_components.mjs --mode compose --recipe 模組化元件/recipes/xingyue-academy-v3.9.6.json --out "卡A/卡A 3.9.6/components"
```

欄位整鏈必須同步：

```text
InitialVariables → Zod → full/compact 更新規則 → output_format
                 → cfMvuVarGroups → runtime / status bar
```

世界書、MVU、正則、Tavern Helper 是不同執行層，依賴寫進 registry，不靠隱式全域性。

## 例子

- 正例：卡A 3.9.6 recipe 宣告 25 項 `requiredOutputs`，因為狀態列真身改由 runtime 提供，不再本地生成完整 `status_bar_regex.html`。
- 反例：為湊舊門禁去啟用 2.5.0 元件，把已經卸掉的 EJS / 全量狀態列 HTML 又裝回來。

## 邊界與易混概念

- CSV / XLSX 元件索引是給人看的匯出，不參與構建。
- 普通版本迭代只動版本快照；只有明確「更新/回落元件庫」才改 `模組化元件/`。
- 替換公共元件必須雙向登記 `replaces` / `replacedBy`。

## 來源與證據

- 來源一：`raw/workshop-cards-2026-08-13/模組化元件-README.md`。攝入時元件庫版本寫 `0.4.0`，最新回落源是怪談筆記 `0.9.7`，卡A release recipe 仍是 `xingyue-academy-v3.9.6.json`。
- 來源二：`raw/workshop-cards-2026-08-13/卡A-README.md` 寫元件庫 `0.3.0`、源卡 `3.9.6`。
- 已知衝突：README 之間的 libraryVersion 與「當前穩定頭」不一致。暫採納：指標與卡A README 記錄 2026-07-18 的 3.9.6 關閉點；元件庫 README 記錄此後又納入怪談筆記並升到 0.4.0；`卡A 4.0.0/` 是更後的雲酒館競態修復快照，recipe 未必已切。見 [[entities/示例學園]]。

## 相關內容

- [[concepts/角色卡升格]]
- [[concepts/打包回封路徑]]
- [[concepts/角色卡前端名詞中英對照]]
- [[entities/示例學園]]
