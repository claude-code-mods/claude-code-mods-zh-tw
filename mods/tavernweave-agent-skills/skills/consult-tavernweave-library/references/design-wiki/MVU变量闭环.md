---
title: MVU 變數閉環
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
  - <local-workspace>/<local-guide-db>/B1_變數更新規則.md
  - <local-workspace>/卡A/卡A 4.0.0/components/mvu_update_output_format.txt
  - <local-workspace>/卡A/卡A 4.0.0/components/mvu_zod_cn.js
  - <local-workspace>/卡A/卡A 4.0.0/components/zod_schema.js
knowledge_class: factual
---

# MVU 變數閉環

穩定卡的狀態不靠模型「口頭記住」，靠 MVU 三層：世界書教模型怎麼改，bundle 真改，Zod 攔非法結構。指南真源是 `<local-guide-db>/B1_變數更新規則.md`。

## 三層

| 層 | 卡A 4.0.0 檔案 | 職責 |
|---|---|---|
| 規則進 prompt | `mvu_update_full.txt` / `_compact.txt` / `_output_format.txt`，世界書條目帶 `[mvu_update]` | 告訴模型輸出什麼塊 |
| bundle | `mvu_zod_cn.js` / `mvu_zod_global.js` 先等世界書 Ready，再 `import` MagVarUpdate `bundle.js` | 解析 `<UpdateVariable>`，打補丁，發事件 |
| schema | `zod_schema.js` | 結構約束；中英兩套註冊 |

`stat_data` 給下一輪模型和 HUD 讀。`display_data` 只給前端。VWD `[value, desc]` 二元組在實戰卡里已棄，路徑直接指值，如 `/環境/時間`。

## 事件名必須用列舉

MVU 原始碼把初始化事件拼成 `'mag_variable_initiailized'`（`initiailized`，雙 i）。這是庫的已知拼寫。**必須寫 `Mvu.events.VARIABLE_INITIALIZED`，禁止手寫字串。** 手寫正確英文會訂閱到一個不存在的事件，HUD 永遠不重新整理。

重新整理主掛點仍是 `Mvu.events.VARIABLE_UPDATE_ENDED`。

使用前 `await waitGlobalInitialized('Mvu')`（或生產卡的 Ready 訊號 + 輪詢降級）。

## 模型必須吐的塊

卡A 4.0.0 輸出格式（節選語義，不是整份規則）：

```text
正文
<UpdateVariable>
<analysis>…本輪事實…</analysis>
<JSONPatch>
[{"op":"replace","path":"/<頂層根>/…","value":…}]
</JSONPatch>
</UpdateVariable>
```

硬約束：塊在回覆末尾且只有一個；`<analysis>` 必須在塊內、在 JSONPatch 前；`op` 只用 `add` / `replace` / `remove` / `move`。頂層根白名單寫在輸出格式裡，卡A 4.0.0 包括：環境、user、天賦與技能、角色檔案、資產庫、配方、規則變化、任務、近期事件、雷達系統、居所、載具、莉莉絲的商店。

OMNI 青框展示的是這段 `<analysis>`，綠框展示同步結果。見 [[concepts/OMNI正則與data屬性選擇器]]。

## 指令碼怎麼掛上 bundle

`mvu_zod_cn.js` 先等 `XingyueWorldbookReady`（以及卡B/融合時代同名 Ready），再從 `testingcf.jsdelivr.net` 拉 `MagVarUpdate/artifact/bundle.js`。全球檔走 `cdn.jsdelivr.net`。兩套內容相同，按網路選。

## HUD 怎麼讀

C2 四層：正則把狀態列 HTML 變成 iframe → iframe 裡 `getVariables({type:'message'})` 或 `Mvu.getMvuData()` → 畫 DOM → 聽 `Mvu.events.VARIABLE_UPDATE_ENDED` 重新整理。

卡A git-mount 的 blob 真身沒有 TH 全域性，必須 `injectBridge`，否則全是 `--`。見 [[concepts/git掛載與遠端真身]]。

怪談小手機用提交去抖後的快照，不靠訊息樓 `<UpdateVariable>` 當掛載條件。見 [[concepts/小手機與宿主橋]]。

## 欄位鏈

一條能回落的鏈：變數根 → 更新規則 → Zod → 狀態列讀點。缺一截就不要做 HUD 花活。升格層序把變數放在最前，見 [[concepts/角色卡升格]]。

## 邊界

- 不在本頁展開 Zod 裡的私密身體欄位。
- 舊命令式更新規則見指南庫歸檔 `B1_變數更新規則_命令式時代_歸檔.md`，穩定卡不走。
- ST 原生 `{{getvar}}` 三層變數和 MVU `stat_data` 不是同一儲存，不要混寫。

## 相關內容

- [[concepts/角色卡技術路徑總圖]]
- [[concepts/世界書注入路徑]]
- [[concepts/控制中心與狀態列]]
- [[concepts/斜槓命令與宿主傳送鏈]]
