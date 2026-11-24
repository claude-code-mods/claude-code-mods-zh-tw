---
title: WASI與元件模型
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
  - https://wasi.dev/
  - https://wasi.dev/releases
  - https://wasi.dev/releases/wasi-p3
  - https://wasi.dev/releases/wasi-p2
  - https://wasi.dev/roadmap
  - https://component-model.bytecodealliance.org/
  - queries/第三批蒸餾目標.md
  - concepts/後端架構名詞與工坊對照.md
knowledge_class: factual
---

# WASI與元件模型

本頁不是已採用技術，也不是工坊必須改用 Wasm 宿主的工單。檢索時間：2026-08-14。賬本見 [[queries/第三批蒸餾目標]]（B3-WASI）。只收介面與元件合同入口，不收攻擊、CVE 或沙箱繞過。

## 一句話定義

WASI（WebAssembly System Interface）是一組給編譯到 Wasm 的程式用的標準軌系統 API。元件模型（Component Model）規定這些程式怎麼用 WIT 做成可組合、可跨語言連結的**元件**，而不是隻跑一個核心模組。WASI 0.3 已於 2026-06-11 釋出；Bytecode Alliance 的元件模型手冊本輪仍寫「現行穩定是 0.2.0」。兩邊留。

## 為什麼重要

沒有這份合同，Wasm 只能靠各執行時私有匯入碰檔案、時鐘、套接字。WASI 把能力做成可引用的介面；元件模型再讓不同語言編出來的元件能直接組合，而不必先拆成 HTTP 微服務。版本釘錯會靜默裂開：有人按手冊釘 0.2 的 `wasi:io` / `proxy`，另一邊已按 0.3 的 `async func` / `service` 出貨。本倉庫工坊與角色卡棧**不因此換 Wasm 宿主**；行業正當性仍保留。

## 權威入口

本輪 WebFetch 核過 [wasi.dev](https://wasi.dev/)：W3C WebAssembly 社群組下的 WASI Subgroup；里程碑寫作 0.1 / 0.2 / 0.3（也叫 Preview 1/2/3 或 P1/P2/P3）。下列 **6** 條是本頁真源。

| # | 入口 | 釘什麼 |
|---|---|---|
| 1 | [wasi.dev](https://wasi.dev/) | 現行樞紐。WASI 是標準軌 API 組；能力沙箱、無環境許可權。正文已列三個里程碑，並指向 WASI 0.3。 |
| 2 | [Releases](https://wasi.dev/releases) | 表：0.3 **Stable**（原生 async）、0.2 **Stable**（元件模型 + WIT）、0.1 **Legacy**（類 POSIX 模組）。元件用 0.2 或 0.3；模組用 0.1。提案到 Phase 5 才出 1.0。 |
| 3 | [WASI 0.3](https://wasi.dev/releases/wasi-p3) | 0.3.0 釋出於 **2026-06-11**。`wasi:io` 整包刪除；async 下沉到元件模型 Canonical ABI。 |
| 4 | [WASI 0.2](https://wasi.dev/releases/wasi-p2) | 本輪開篇仍寫「**WASI 0.2 is the most recent stable WASI release**」。同時又提 0.3 刪掉 `wasi:io`。0.2.0 投票日寫 2024-01-24。 |
| 5 | [Roadmap](https://wasi.dev/roadmap) | 再次釘 0.3.0 = 2026-06-11；實現可並列跑 0.2，或用 0.3 虛擬化 0.2。 |
| 6 | [元件模型手冊](https://component-model.bytecodealliance.org/) | Bytecode Alliance 使用者手冊。Status 段本輪仍寫：「The current stable release of WASI is **WASI 0.2.0**」（2024-01-25）。 |

Bytecode Alliance 另有批准說明（Subgroup 已批准 0.3.0），不擠進上表六條。不收執行時安全通告或利用步驟。

## 如何運作

**模組 ≠ 元件。** 核心 Wasm 模組對接 WASI 0.1（WITX，類 POSIX）。0.2 起 API 用 WIT，消費面是元件：一份 WIT 世界（world）宣告匯入/匯出，繫結生成器再吐出各語言膠水。釋出表寫明：0.2 釋出後 0.1 在執行時裡仍更常見，並仍有生產在用。兩邊留：里程碑已過 ≠ 0.1 已死。

**0.2 能組合介面，不能組合喚醒。** 0.2 用 `wasi:io` 的 `pollable` / `input-stream` / `output-stream` / `poll` 表達非同步。`pollable` 綁在單個元件例項上。A→B→Host 時，B 沒法把宿主的就緒訊號轉給 A，喚醒鏈會斷。0.3 專頁稱 sandwich problem：0.2 能寫 async，卻不能跨元件邊界組合它。

**0.3 把排程交給執行時。** Canonical ABI 原生提供 `async func`、`stream<T>`、`future<T>`。繫結器按語言吐 `async fn` / `Promise` / 協程。讀側常見 `tuple<stream<T>, future<result<…>>>`：流給資料，future 獨立報告成敗。寫側方向翻轉：0.2 是拿 `output-stream` 往裡寫；0.3 是傳入 `stream<T>`，收回完成 future。`wasi:io` 沒有 0.3 版。

**世界改了名字。** 0.2：`wasi:cli/command`、`wasi:http/proxy`。0.3：CLI 的 `run` 變成 `async func`；HTTP 的 `proxy` 換成 `service`，並新增可再匯入 handler 的 `middleware`。時鐘把 `wall-clock` / `datetime` 改成 `system-clock` / `instant`。套接字從多介面收成 `types` + `ip-name-lookup`。這些是合同變更，不是皮膚。

**穩定里程碑 ≠ Phase 5 成標。** 釋出表把 0.2 / 0.3 標 Stable，同時又寫提案留在 0.x，直到 Phase 5 才出 1.0。Phase 3 表裡仍列 I/O、HTTP 等。不要把「0.3 Stable」讀成「已是 WASI 1.0 / W3C Rec」。

**能力模型只記原則。** 樞紐寫：模組或元件起步沒有環境許可權，只能做宿主顯式授予的事。本頁到此為止，不寫繞過。

## 行業何時該上

| 合同 | 何時該上 | 不該當成 |
|---|---|---|
| WASI 0.2 + WIT 世界 | 要跨語言組合、執行時已認證 0.2、還不需要跨元件原生 async | 「手冊寫 0.2 現行，所以 0.3 不存在」 |
| WASI 0.3 Canonical ABI | 元件鏈要傳 `stream` / `future`，或 HTTP 要 `service` / `middleware` | 「釋出了就必須立刻遷」；WASI 1.0 |
| WASI 0.1 模組 | 執行時只認 Preview 1，或存量模組還在生產 | 元件模型；WIT 世界 |
| 元件模型手冊 | 學 WIT、怎麼編第一個元件 | 2026-08-14 的版本真源 |
| 各執行時文件 | 該執行時實際支援哪一檔、預設開不開 async | WASI 符合性證書 |

## 必須保留的衝突

- 0.3 已批准/釋出 vs 手冊仍寫 0.2 最新。兩邊都留。
- 0.2 專頁一邊自稱最新，一邊已經解釋 0.3 如何刪除 `wasi:io`。
- 手冊日期 2024-01-25 與 0.2 專頁投票日 2024-01-24 差一天。
- 釋出表 Stable ≠ Phase 5 / 1.0。
- 「工坊現在不上 WASI」不是「WASI 不是正當行業合同」。
- 本頁對映工坊與角色卡的**宿主選擇**；**不是**「工坊必須上 WASI」。

## 例子

- 正例：新元件要跨語言連結，先看釋出表決定釘 0.2 還是 0.3，再開啟對應專頁對世界名。
- 正例：0.3 執行時上繼續跑 0.2 元件：按路線圖並列實現或把 0.2 進口虛擬化成 0.3 原語；`wasmtime serve` 可按元件分發。
- 反例：只打開元件模型手冊首頁，把「現行穩定 0.2.0」寫成 2026-08-14 的全站結論。
- 反例：把 0.2 專頁「most recent stable」覆蓋 0.3 專頁的 2026-06-11 釋出日。
- 反例：把「0.3 Stable」寫成 WASI 1.0，或把酒館 iframe 當成 WASI 宿主。

## 邊界與易混概念

- 不包括：攻擊面、CVE、沙箱繞過、工坊換棧工單、具體打分榜。
- WASI ≠ 元件模型。前者是系統 API 提案組；後者是二進位制與 ABI 架構。0.2 起 WASI 長在元件模型上，仍是兩份合同。
- WASI 0.1 模組 ≠ 0.2/0.3 元件。Preview 1「元件」常只是帶固定匯入的核心模組。
- 0.2 `wasi:io` ≠ 0.3 原語。0.3 沒有 `wasi:io`。
- 0.2 `wasi:http/proxy` ≠ 0.3 `wasi:http/service` / `middleware`。
- 手冊「現行 0.2.0」≠ wasi.dev 釋出表「0.3 Stable」。
- 里程碑 Stable ≠ Phase 5 成標 ≠ 1.0。
- 執行時列出 Wasmtime / jco / WAMR ≠ 該執行時已預設開 0.3。
- 酒館卡 iframe 不是 WASI 平臺；本頁不自動落到卡內宿主。見 [[concepts/酒館宿主與iframe分層]]。

## 對映到本倉庫

當前工坊與角色卡開發線都不因本頁改用 Wasmtime / jco，也不把 WASI 寫成已採用依賴。卡 iframe 沒有 OS 安裝面，更沒有 WASI 預開目錄。這是產品落點，不是對 Subgroup 的否定。行業對照仍見 [[comparisons/行業架構方案何時用]]、[[comparisons/工坊架構該上與不該上]] 與 [[concepts/後端架構名詞與工坊對照]]。這是「WASI 入口與衝突要釘住」，不是「工坊必須上 WASI」。

## 來源與證據

- 樞紐與三檔里程碑：本輪開啟 [wasi.dev](https://wasi.dev/)。
- 0.3 釋出日與刪 `wasi:io`：[WASI 0.3](https://wasi.dev/releases/wasi-p3)、[Roadmap](https://wasi.dev/roadmap)。
- 0.2 仍自稱最新穩定：[WASI 0.2](https://wasi.dev/releases/wasi-p2) 開篇句。
- 手冊仍釘 0.2.0：[元件模型手冊](https://component-model.bytecodealliance.org/) Status。
- 釋出表同時標 0.2 / 0.3 為 Stable、0.1 為 Legacy：[Releases](https://wasi.dev/releases)。
- 查詢賬本：[[queries/第三批蒸餾目標]] B3-WASI。

已知衝突見上節，不靜默覆蓋。

1. **0.3 已批准/釋出 vs 手冊仍寫 0.2 最新。** [WASI 0.3](https://wasi.dev/releases/wasi-p3) 與 [Roadmap](https://wasi.dev/roadmap) 釘 0.3.0 = 2026-06-11；[Releases](https://wasi.dev/releases) 把 0.3 標 Stable。同日 [元件模型手冊](https://component-model.bytecodealliance.org/) 仍寫現行穩定是 WASI 0.2.0（2024-01-25）；[WASI 0.2](https://wasi.dev/releases/wasi-p2) 開篇仍寫 0.2 是最近一次穩定釋出。
2. 0.2 專頁一邊自稱最新，一邊已經解釋 0.3 如何刪除 `wasi:io`。
3. 手冊日期 2024-01-25 與 0.2 專頁投票日 2024-01-24 差一天。
4. 釋出表 Stable ≠ Phase 5 / 1.0。
5. 「工坊現在不上 WASI」不是「WASI 不是正當行業合同」。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 `SCHEMA.md` 的 Tag Taxonomy
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[queries/第三批蒸餾目標]]
- [[concepts/後端架構名詞與工坊對照]]
- [[concepts/酒館宿主與iframe分層]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/工坊架構該上與不該上]]
- [[concepts/WinterTC與伺服器JS]]
- [[concepts/HTTP3與QUIC]]
