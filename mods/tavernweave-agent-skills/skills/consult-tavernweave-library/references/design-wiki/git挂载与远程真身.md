---
title: git 掛載與遠端真身
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
  - <local-workspace>/<local-guide-db>/D1_git掛載與資源載入.md
  - raw/workshop-cards-2026-08-13/status_bar-mount_shell_remote-README.txt
  - <local-workspace>/卡A/卡A 4.0.0/components/mvu_zod_cn.js
knowledge_class: factual
---

# git 掛載與遠端真身

卡內只留薄殼，真身從 GitHub/jsDelivr 拉。push runtime 就能熱修，不必每次重發卡。指南：`D1_git掛載與資源載入.md`。狀態列殼樣本：`status_bar-mount_shell_remote`。

## 誰在用

| 東西 | 卡A | 卡B | 怪談 |
|---|---|---|---|
| 狀態列/開局/控制中心 runtime | 3.9.6+ git-mount | 控制中心本地為主 | HUD 內嵌指令碼，不靠遠端 HTML |
| MVU bundle | 兩邊 CDN 都用過 | 同 | 同 |
| 遠端 Git loader 政策 | 要 | 可用 | 卡內 |

卡C設計檔**禁止**遠端 Git loader。

## 狀態列殼四段

```text
1. 雙源：cdn.jsdelivr.net → testingcf.jsdelivr.net
2. 基址：window.XY_RT_BASE，否則內聯 BASE / BASE_CF
3. Blob URL 賦給內層 iframe（跨源 document.write 會被攔）
4. injectBridge：給 blob 自載 jQuery/lodash，映象 TH 全域性，getVariables 走頂層 Mvu
```

出卡必改：`BASE` / `BASE_CF` 裡的 `runtime/xingyue/<ver>`。換倉庫改 `LiarMTTT/rolecard-diy-workshop@main/runtime/<family>/<ver>`。

隔離：CC 的 script-iframe 和狀態列 message-iframe 不是同一 `window`，`XY_RT_BASE` 經常到不了殼，殼恆走內聯。版本寫錯就拉錯真身。

高度：`syncHeight` + ResizeObserver，把內層高度同步到外層 iframe。

版本檢測（可休眠）：真身註釋 `<!-- XY-SB-VERSION -->` 對 GitHub raw `VERSION.txt`。缺一處就靜默跳過。

## 和全量本地版互斥

同名輸出 `status_bar_regex.html`：要麼薄殼，要麼卡內整頁。卡B 2.6.2 走整頁。卡A 3.9.6 起不再生成完整本地 HUD HTML。

## 其它遠端

Zod 指令碼動態 `import` MagVarUpdate `bundle.js`，同樣雙 CDN。世界書 Ready 訊號後再 import，見 [[concepts/MVU變數閉環]]。

D1 還覆蓋 npm `/+esm`、離線 vendor、CSP。穩定卡主路徑是 jsDelivr git 路徑，不是把整個 node_modules 塞進卡。

## 相關內容

- [[concepts/控制中心與狀態列]]
- [[concepts/角色卡DOM與掛載點]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/角色卡技術路徑總圖]]
