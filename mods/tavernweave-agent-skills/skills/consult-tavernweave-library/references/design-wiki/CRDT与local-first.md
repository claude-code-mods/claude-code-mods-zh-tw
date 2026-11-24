---
title: CRDT與local-first
created: 2026-08-14
updated: 2026-08-14
type: concept
status: active
tags:
  - wiki
  - concept
  - tooling
  - research
sources:
  - https://docs.yjs.dev/
  - https://docs.yjs.dev/getting-started/adding-awareness
  - https://github.com/yjs/y-protocols
  - https://automerge.org/docs/hello/
  - https://automerge.org/blog/rich-text/
  - https://automerge.org/docs/reference/documents/rich-text/
  - https://automerge.org/docs/reference/under-the-hood/merge-rules/
  - https://loro.dev/docs
  - https://www.inkandswitch.com/peritext/
  - https://www.inkandswitch.com/essay/local-first/
  - https://arxiv.org/abs/2409.14252
  - https://fluidframework.com/docs/build/presence
  - https://www.inkandswitch.com/upwelling/
  - https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
knowledge_class: factual
---

# CRDT與local-first

本頁不是已採用技術，也不改工坊或角色卡棧。

## 一句話定義

CRDT 是一份可以在多臺裝置上獨立改、事後交換更新就能收斂到同一結果的資料結構；local-first 是把本機副本當主本、雲只當副本的軟體取向。二者常一起出現，但不是同一層：一個管合併，一個管所有權。

## 為什麼重要

雲應用把伺服器當真相，離線或分叉就變成「沒發生」。local-first 反過來：本機先寫，網路好了再同步。CRDT 讓這份同步不必找中心裁判，也不必像 Git 那樣讓人手工解富文字衝突。行業用它做協作編輯、離線多端、分支後合併。本倉庫的角色卡變數和獨立工坊站**現在都不因此改棧**；行業正當性仍保留，見文末對映。

## 如何運作

CRDT 的合同是：各副本可並行更新；只要最終見到同一組更新，狀態相同，與到達順序無關。Yjs、Automerge、Loro 都把內部模型暴露成可併發改的共享型別（Map / Array / Text 等），再把增量編碼成位元組交給**任意**通道。文件層不假定 WebSocket、WebRTC 或郵件附件；通道怎麼接，不在本頁寫。

先分三層，避免把房間服務和游標寫進同一份檔案：

| 層 | 活多久 | 典型入口 | 不負責 |
|---|---|---|---|
| 文件 CRDT | 進檔案、可離線、可分支後再合 | Yjs / Automerge / Loro | 誰線上、游標、房間定址 |
| 在場 | 隨會話；人走即沒 | Yjs Awareness、Fluid Presence | 正文歷史、撤銷棧 |
| 即時通道 | 連線在才有 | [[concepts/即時基建與Durable Objects]] | 兩份富文字如何合併 |

三庫分工（B2-CRDT 樞紐仍是 [Yjs 文件](https://docs.yjs.dev/)）：

| 庫 | 官方怎麼說 | 本頁用法 |
|---|---|---|
| Yjs | 高效能共享型別；文件自稱 WIP，README 仍是更好的源；網路無關 | B2 樞紐。不升其它庫替代它 |
| Automerge | 本機可離線改，上線再同步；像 Git 但能自動合複雜結構 | local-first 主敘事。富文字另見 Peritext 併入 |
| Loro | 用 CRDT 解並行編輯；狀態可按 JSON 建模；自稱含 Event Graph Walker | 第三入口。官方「何時不用」：要強一致、大資料/媒體流、或包體敏感（WASM 約 970KB gzip）時另選 |

[Peritext](https://www.inkandswitch.com/peritext/)（B3-LF 樞紐）是富文字 CRDT：行內加粗、顏色、連結、評論按「跨兩個字元的區間」合併，而不是把 HTML 樹當真相。2022 文說原型掛在簡化版 Automerge 上、希望回並。後來 [Automerge 2.2](https://automerge.org/blog/rich-text/) 落地富文字（span + block marker），[合併規則](https://automerge.org/docs/reference/under-the-hood/merge-rules/) 的 marks 一節回指 Peritext。**併入不等於改樞紐**：B2-CRDT 仍指向 Yjs 文件，不把 Automerge 升成替代入口。

[Eg-walker](https://arxiv.org/abs/2409.14252)（EuroSys 2025，Gentle / Kleppmann）是文字協作演算法：穩態只持有純文字；合併時臨時建 CRDT，合完即丟，不落盤、不上網。權威在 arXiv；Ink & Switch **無專文**。Loro 對照表自稱實現了 Event Graph Walker，發明實現是 Diamond-types。這是實現宣告，不是 I&S 論文。

在場（游標、選區、誰線上）是**短暫態**，不入文件 CRDT。Yjs 明文：Awareness 不進 `Y.Doc`，離線即刪；[y-protocols](https://github.com/yjs/y-protocols) 用獨立 state-based CRDT，約 30 秒無重新整理則本地摘掉。Fluid [Presence](https://fluidframework.com/docs/build/presence)（B3-Pres 樞紐，2.42.0 起 beta）：會話裡每人一份別人只讀的 `Latest` / `LatestMap`；人走光，會話資料消失。它不是 Fluid DDS，也不保證文件那種最終一致（官方寫明走 signal，重連期可能丟）。通知是事件，不留會話狀態。

[local-first 七理想](https://www.inkandswitch.com/essay/local-first/)（Kleppmann 等，Onward! 2019）把「雲是主本」翻過來：

1. 本機先響應，不必等跨洋往返才出字。
2. 同一份工作能在手機 / 平板 / 電腦之間走，不被鎖在一臺機器。
3. 網路可選：飛機、隧道、關蜂窩也能寫，稍後同步。
4. 多人可同時改，不必排隊傳檔案。
5. 軟體和資料要活得過某家雲服務停機。
6. 預設少把全文交給別人的計算機。
7. 最終所有權在使用者：能備份、能匯出、能刪。

CRDT 主要托住第 3、4 條，不是七條的全部。沒有 CRDT 也可以做本機檔案；有 CRDT 也可以仍把伺服器當主本。Upwelling 用 Automerge 做「即時 + 草稿分支」的寫作原型，用來緩解「魚缸效應」（別人盯著你打字）。[概念文](https://www.inkandswitch.com/upwelling/)可引，[原始碼倉](https://github.com/inkandswitch/upwelling-code) **無 SPDX / 無 LICENSE**（#279 仍開），不可當可再分發實現。

即時基建見 [[concepts/即時基建與Durable Objects]]（B2-RT 樞紐：[Durable Objects 概念](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/)）：管房間、連線、會話壽命。它把更新送到人，不負責「兩份富文字怎麼合」。通道實現細節排除；本頁不寫接入步驟。

OT 與 CRDT 只點一句：OT（如 Google Docs 所用 Jupiter）假定一條由中心服務管理的線性時間線；CRDT 不需要這條中心線，任意兩版本最終見到同一組更新即可收斂。完整對照是第四批候選，本頁不展開。

## 權威入口

檢索 2026-08-14。下列 14 條是入口，不是教程，也不映象全文。

1. [Yjs 文件](https://docs.yjs.dev/) — B2-CRDT 樞紐；共享型別與網路無關。
2. [Yjs Awareness](https://docs.yjs.dev/getting-started/adding-awareness) — 在場不進文件。
3. [y-protocols](https://github.com/yjs/y-protocols) — Sync / Awareness 編碼合同。
4. [Automerge Hello](https://automerge.org/docs/hello/) — 本機主本、自動合併、網路無關。
5. [Automerge 2.2 富文字](https://automerge.org/blog/rich-text/) — Peritext 後併入的產品說明。
6. [Automerge Rich Text](https://automerge.org/docs/reference/documents/rich-text/) — marks / blocks API。
7. [Automerge 合併規則](https://automerge.org/docs/reference/under-the-hood/merge-rules/) — 文字 marks 回指 Peritext。
8. [Loro 文件](https://loro.dev/docs) — 第三庫入口與「何時不用」。
9. [Peritext](https://www.inkandswitch.com/peritext/) — B3-LF 樞紐；富文字意圖模型。
10. [local-first 長文](https://www.inkandswitch.com/essay/local-first/) — 七理想；活入口見衝突。
11. [Eg-walker arXiv:2409.14252](https://arxiv.org/abs/2409.14252) — 演算法權威；I&S 無專文。
12. [Fluid Presence](https://fluidframework.com/docs/build/presence) — B3-Pres 樞紐；短暫態。
13. [Upwelling 概念](https://www.inkandswitch.com/upwelling/) — 即時與草稿分支；程式碼無 SPDX。
14. [Durable Objects 概念](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/) — B2-RT 樞紐；只當通道概念。

## 例子

- 正例：兩臺裝置離線改同一 `Y.Map` / Automerge 文件 / `LoroDoc`，事後交換 update 位元組，鍵值都在，順序無關。
- 正例：Alice 給整句加粗、Bob 在句中插入詞；Peritext / Automerge 富文字讓新詞落在加粗區間內，而不是「樹節點二選一丟一半」。
- 正例：游標和「誰在打字」走 Awareness 或 Presence；關頁即消失，下次開啟文件裡沒有這些點。
- 反例：把角色卡 `stat_data` 當成要 Y.Map 同步的共享文件。卡變數是模型吐補丁、bundle 應用、Zod 攔結構，見 [[concepts/MVU變數閉環]]。
- 反例：獨立工坊目錄為「看起來像協作」上 Yjs。目錄是快取靜態讀，更新稀，見 [[comparisons/工坊架構該上與不該上]]。
- 反例：把在場寫進文件 CRDT，當永久歷史；或把 WebSocket 接入步驟當成本頁教程。

## 邊界與易混概念

- 不包括：即時通道接入、房間服務搭建、OT 專頁、把某庫寫成「本倉庫已採用」。
- CRDT ≠ local-first。可以在中心伺服器上只用 Automerge 做併發合併；也可以 local-first 卻用別的同步。
- 文件 CRDT ≠ 在場。一份進檔案、一份隨會話死。
- Peritext ≠ 新的 B2 樞紐。它解釋富文字意圖，實現已進 Automerge，入口表不改樞紐。
- Eg-walker ≠ 「又一個 Yjs」。它多數時間不當作常駐 CRDT 元資料來持有。
- Upwelling 概念可引，原始碼不可當已許可元件。
- 樂觀 UI 的單步回滾（[[concepts/前端架構名詞與取捨]]）不是多副本 CRDT，也不是撤銷棧。

## 對映到本倉庫

角色卡變數以 **MVU** 為心智，不是 CRDT。穩定卡是單會話、單模型寫手：世界書教格式，bundle 打 JSON Patch，Zod 攔非法結構，`stat_data` 給下一輪和 HUD。沒有「多玩家各持一份角色卡狀態、離線一週再交換 update」的合同。把 MVU 換成 Yjs 不會讓模型更聽話，只會把補丁協議和 Zod 門拆掉。

獨立工坊站也不因此要上 Yjs。已用模組化單體 + 同步 REST + SSG/ISR + islands；目錄不是共享編輯器。釋出 / 稽核要同步可見結果，不靠無中心合併。以後若做「多人同時改同一份卡源」，那是新產品面，再單獨立項，不從本頁自動推出。

兩邊都留行業正當性。協作編輯器、離線多端文件、在場游標，行業該看上表入口。本頁不按「卡用不上」刪 Yjs / Automerge / Loro / Presence。卡與工坊的「現不上」是產品對映，見 [[comparisons/行業架構方案何時用]]、[[comparisons/工坊架構該上與不該上]]。

## 來源與證據

- 三庫與網路無關：Yjs 引言、Automerge Hello、Loro 用任意方法送 bytes。
- 在場不入文件：Yjs Awareness 文；Fluid Presence Overview（會話結束即消失；與 DDS 不同）。
- Peritext → Automerge：2022 文「希望回並」；2.2 部落格與 merge-rules 已回指。
- Eg-walker：arXiv:2409.14252 / doi:10.1145/3689031.3696076。I&S 站點無同名專文。
- Upwelling：概念文可抓；`upwelling-code` 無 LICENSE，issue #279（2023-08-14）仍問許可。
- 賬本：[[queries/第二批蒸餾目標]] B2-CRDT / B2-RT；[[queries/第三批蒸餾目標]] B3-LF / B3-Pres。

### 已知衝突或版本差異

- B2-CRDT 樞紐是 `docs.yjs.dev`。Peritext 併入 Automerge **不**把樞紐改成 Automerge。
- `https://www.inkandswitch.com/local-first.html`（Yjs 文件仍鏈此）2026-08-14 抓取 500；活入口是 `/essay/local-first/`。
- Automerge 2.2 部落格用 yjs-prosemirror 結構衝突丟列表項當反例。這是 Automerge 方主張，本頁不裁定「Yjs 不能做富文字」。
- Loro 自稱有 Eg-walker；權威論文在 arXiv，I&S 無專文。兩句都留。
- Fluid Presence 官方：走 signal，不保證所有客戶端最終一致；Notifications 仍 alpha，`unicast` 實際仍廣播。
- Upwelling 程式碼無 SPDX，不能寫成 MIT/Apache。
- Yjs 文件站自稱 WIP；衝突時以 README / y-protocols 為準。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區，並同步 `index.md` 與 `log.md`

## 相關內容

- [[concepts/MVU變數閉環]]
- [[concepts/前端架構名詞與取捨]]
- [[concepts/後端架構名詞與工坊對照]]
- [[concepts/即時基建與Durable Objects]]
- [[comparisons/工坊架構該上與不該上]]
- [[comparisons/行業架構方案何時用]]
- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
