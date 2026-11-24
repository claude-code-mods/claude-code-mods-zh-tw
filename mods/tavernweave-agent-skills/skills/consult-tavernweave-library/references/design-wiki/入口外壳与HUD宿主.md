---
title: 入口外殼與 HUD 宿主
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
  - <local-workspace>/<local-guide-db>/C11_懸浮球與功能入口.md
  - <local-workspace>/<local-guide-db>/C12_抽屜式狀態列-移動端方案.md
  - <local-workspace>/<local-guide-db>/C13_浮窗式狀態列.md
  - <local-workspace>/<local-guide-db>/C2_前端應用-狀態列與控制中心.md
  - <local-workspace>/卡A/卡A 4.0.0/components/control_center.js
knowledge_class: factual
---

# 入口外殼與 HUD 宿主

玩家從哪點開面板，和麵板裡讀什麼變數，是兩層。C11 / C12 / C13 管入口外殼；內容鏈仍歸 C2 和 [[concepts/控制中心與狀態列]]。

## 三件外殼

| 手冊 | 形態 | 穩定卡怎麼用 |
|---|---|---|
| C11 | 桌面懸浮球 | 只分發命令：開啟控制中心、狀態列、小手機。球自己不讀 `stat_data` |
| C12 | 移動端抽屜 | 安全區、軟鍵盤、`visualViewport`。小手機可以住在抽屜裡 |
| C13 | 浮窗 / 彈出層 | 確認、媒體管理、設定。不要再造第四套宿主 |

內容仍走：正則鋪殼 → TH ` ```html ` iframe → `getVariables` / `Mvu.getMvuData` → `VARIABLE_UPDATE_ENDED`。

## 宿主視窗

指令碼經常跑在訊息 iframe 或控制中心 script-iframe 裡。要摸 ST 輸入框、`document.body`、TH 全域性，必須 `hostWindow()` / `hostDocument()` 向上爬，不能假定當前 `window` 就是酒館主窗。認窗見 [[concepts/酒館宿主與iframe分層]]。卡側 `data-*` 見 [[concepts/角色卡DOM與掛載點]]。

## 誰掛在哪

| 表面 | 掛哪 | 幾份 |
|---|---|---|
| 正則狀態列 | 訊息樓 iframe / blob | 每樓可能一份，要去重 |
| git-mount 真身 | 薄殼 iframe 裡的 blob | 外層殼同步高度 |
| 小手機 | 宿主 `document.body` | 單例 |
| 控制中心 | TH 指令碼 iframe | 一份 runtime |
| 懸浮球 | 宿主層 | 一份，只發命令 |

卡B 2.6.2 把整頁 HUD 塞進狀態列正則，入口和內容疊在同一份 HTML。卡A 4.0.0 把入口、遠端真身、小手機拆開。

## 邊界

- C9 宿主美化（改 ST 自己的 CSS）不是這三張卡的主路徑。
- C6 獨立前端、C5 同層前端：未走。
- 懸浮球拖尾 / 玻璃手感屬於視覺項：先沙盤後實裝，本頁不記畫素值。

## 相關內容

- [[concepts/控制中心與狀態列]]
- [[concepts/小手機與宿主橋]]
- [[concepts/git掛載與遠端真身]]
- [[concepts/酒館宿主與iframe分層]]
- [[comparisons/三張穩定卡前端對照]]
- [[concepts/角色卡技術路徑總圖]]
