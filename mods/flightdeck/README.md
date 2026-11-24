# Flightdeck

[![Release](https://img.shields.io/github/v/release/scasella/claude-flightdeck)](https://github.com/scasella/claude-flightdeck/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code 2.1.289+](https://img.shields.io/badge/Claude%20Code-2.1.289%2B%20mod-d97757.svg)](https://claude.com/blog/claude-code-mods)
[![Listed on statuslin.es](https://img.shields.io/badge/listed%20on-statuslin.es-c96442)](https://statuslin.es/mods/flightdeck)

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

**一個把即時 agent 儀表盤放進你終端的 Claude Code mod**：上下文與成本、架構師時間線、每一次許可權檢查，以及以卡片或泳道展示的子 agent。每個數字都來自真實的會話事件，且不會離開你的機器。

<p align="center">
  <img src="docs/media/demo.gif" alt="Flightdeck 在即時會話中：五個審計子 agent 以卡片展開、切換為泳道並完成，許可權閘門隨著檢查而填充" width="520">
</p>

<p align="center">
  <a href="#安裝">安裝</a> · <a href="#你會看到什麼">你會看到什麼</a> · <a href="#它能觸及什麼">它能觸及什麼</a> · <a href="#配置">配置</a> · <a href="#故障排查">故障排查</a> · <a href="CHANGELOG.md">更新日誌</a>
</p>

## 安裝

在 Claude Code 內（2.1.289 或更高）：

```
/plugin marketplace add scasella/claude-flightdeck
/plugin install flightdeck@claude-flightdeck
/reload-plugins
/flightdeck
```

<details>
<summary><strong>從終端或從克隆安裝</strong></summary>

```sh
claude plugin marketplace add scasella/claude-flightdeck
claude plugin install flightdeck@claude-flightdeck
```

或直接從克隆載入一個會話：

```sh
git clone https://github.com/scasella/claude-flightdeck
claude --plugin-dir ./claude-flightdeck
```

</details>

安裝器可能提示某些配置選項未設定；預設值即可，可在 [`/config`](#配置) 中修改。

Mod 是 Claude Code 的早期功能，其 API 可能隨版本變化。如果出問題，參見[故障排查](#故障排查)。

## 你會看到什麼

https://github.com/user-attachments/assets/9ad0fcc3-c81c-427a-a743-f7b6c49f5885

<p align="center">
  <img src="docs/media/docked-session.png" alt="全屏 Claude Code，Flightdeck 面板停靠在轉錄旁邊" width="820">
</p>

| 停靠在轉錄旁 | 在提示行上方內聯 |
| --- | --- |
| <img src="docs/media/docked-pane.png" alt="停靠面板：主模型體徵、架構師時間線、許可權閘門、五個 agent 泳道、上一輪迴執和會話日誌" width="380"> | <img src="docs/media/inline-mini.png" alt="內聯迷你佈局：模型、上下文儀表、會話成本和架構師諮詢；許可權閘門條和總計；上一輪的時長、agent、編輯、錯誤和成本" width="420"><br><br>在主螢幕上（非全屏）時，面板是最多 8 行的摘要；當會話有子 agent 時，最多 3 個 agent 會加入。 |

| 面板 | 顯示 | 來自 |
| --- | --- | --- |
| **main** | 模型、effort、許可權模式、請求數；帶壓縮標記的上下文儀表（⟲，或不固定時為 ⟲~），在會話以小於模型視窗的視窗壓縮時按該視窗度量；成本和前兩個速率限制視窗（當套餐報告時），以及各自的重置時間（↻，56 列起）；上一個主迴圈請求的首 token 時間 | `turn.step`、`session.measure`、`session.compact`、`$.session.usage()` |
| **architect** | 時間線上的諮詢、是否正在執行、上一次耗時；可選顯示每次諮詢的時刻；子 agent 架構師建議的首行 | 匹配型別的 agent 啟動，或助手行中匹配的服務端工具 |
| **gate** | 每次許可權檢查一格：綠色=無需詢問即允許，藍色=由自動模式分類器或你決定後執行，琥珀色=待定，紅色 ✗=拒絕，暗色=在子 agent 內做出；總計，以及按工具家族的下鑽（憑據已遮蔽） | `tool.check`，由其周圍的 `tool.call` 結算 |
| **agents** | 放得下時並排顯示卡片：任務、型別、即時上下文和輸出 token 數、步數、執行時鐘、紅色的 `max_tokens`；放不下時改為同一時間軸上的泳道 | `agent.spawn`、`turn.step`、`tool.call`、`turn.complete` |
| **loops** | 不匹配任何卡片的模型迴圈：工作流 agent、壓縮、記憶 fork | 無卡片認領的 `turn.step` id |
| **receipt** | 正在進行的回合或上一個回合：時長、agent、編輯、錯誤、新增成本 | `turn.start`、`turn.complete` |
| **log** | 提示、啟動、完成、諮詢、編輯、錯誤與拒絕；檢視某個 agent 的轉錄時只顯示它 | 以上全部 |

連線線僅在有工作流動時動畫：回合執行中、agent 執行中，或諮詢開啟時。無內容可顯示的面板不佔空間，因此沒有子 agent 的會話只顯示主框和日誌。

## 使用

| 命令 | 作用 |
| --- | --- |
| `/flightdeck` | 打開面板 |
| `/flightdeck close` | 關閉面板 |
| `/flightdeck reset` | 清空 agent、檢查、諮詢、日誌和回合（成本、速率限制和壓縮計數保留） |
| `/flightdeck layout auto\|compact\|wide\|mini` | 覆蓋本會話的佈局 |

用 `ctrl+x tab` 聚焦面板，然後：

| 按鍵 | 作用 |
| --- | --- |
| `1`、`2`、… | 展開某個 agent 卡片或泳道：完整任務、最後 3 次工具呼叫、回答開頭 |
| `f` `s` `o` | 開啟閘門的檔案 / shell / 其他下鑽：最後 5 次檢查及其結論 |

`/clear` 會隨對話一起重置面板。

## 執行位置

- **全屏終端：** 停靠在轉錄旁；寬度 110 列以上時為兩欄。
- **主螢幕終端：** 內聯在提示行上方，作為 8 行摘要。
- **桌面應用、VS Code、移動端：** 同樣的面板，另外 agent 會以 SVG 時間軸繪製。VS Code 和移動端無法播放動畫，因此那裡的連線線和時鐘是靜止的。

設定 `openOnStart` 後，會話啟動且終端至少 144 列寬時面板會自動開啟；更窄時由 `/flightdeck` 開啟。顏色來自你的 Claude Code 主題，因此淺色、深色和色盲主題都可辨識。

## 它能觸及什麼

Flightdeck 只做觀察。每個鉤子都原樣傳遞事件：它從不拒絕、重寫或延遲工具呼叫、提示或子 agent。

| 它看到 | 透過 |
| --- | --- |
| 每次工具呼叫的名稱與輸入，以及是否失敗 | `tool.call` |
| 每次許可權結論 | `tool.check` |
| 子 agent 啟動、其模型請求與 token 用量、其最終回答 | `agent.spawn`、`turn.step`、`turn.complete` |
| 你提示的前 70 個字元（用於日誌） | `turn.start` |
| 上下文、成本和速率限制讀數 | `session.measure`、`$.session.usage()` |
| `/context` 顯示的上下文明細（其類別、記憶檔案路徑、MCP 工具、agent 與技能），本地按模型估算一次；只保留其中的壓縮視窗 | `$.session.usage({ breakdown: 'summary' })` |
| 助手響應中的顧問工具呼叫（內容已加密） | `session.append` |

它保留什麼：會話狀態中的簡短摘要（工具名加路徑或命令、每個提示的開頭、agent 的任務與回答、架構師建議，全部遮蔽憑據），隨會話結束而結束。它**不**發起網路請求、不執行程序、不讀寫檔案、不跨會話儲存，也不呼叫模型。`claude plugin validate .` 會準確列印它掛了哪些鉤子、呼叫了什麼。

## 哪些是推斷而非實測

- **架構師時刻。**“計劃前”指本回合尚無編輯，“錯誤重複”指連續 2 個以上主迴圈錯誤，“完成前”指已發生編輯。它們標註為 `(inferred)`；可用 `moments: false` 關閉。
- **內建守衛下的壓縮。** 當 Claude Code 的守衛阻止 Flightdeck 收到 `session.compact` 時，計數為估算。Claude Code 在新會話、`/clear` 或壓縮後的首個響應前不報告上下文填充量。因此，若一個主迴圈請求在響應返回後找不到填充量，就計為一次壓縮。主框顯示 `⟲~1`，有餘地時帶 `(estimated)`，日誌說 `context compacted (estimated)`。回退到首個提示也會被同樣解讀，因此也計入。凡 `session.compact` 執行處，其計數會取代估算。
- **服務端建議是加密的。** 對 Claude Code 的 `advisor` 這類服務端工具，面板會計數並計時，但無法顯示其內容。
- **每個 agent 的上下文是最新請求的整個輸入**（未快取 + 快取讀 + 快取寫）。它標註為 `ctx` 而非成本：API 沒有按 agent 的成本。
- **其他迴圈**無法區分工作流 agent 與壓縮 fork；兩者都是沒有卡片認領的模型迴圈。
- **後臺 agent 的第一步**可能在其卡片存在之前到達，因此其用量可能晚一步顯示。
- **相對壓縮視窗的上下文。** 當會話以小於模型視窗的視窗壓縮時，儀表、`tokens/window` 和狀態行的 `ctx N%` 按該視窗度量，因此讀數會高於 Claude Code 自己的狀態行百分比（以及 claude-hud 的），後者按模型視窗度量。自動壓縮在 100% 前一點、按該視窗內的閾值執行。
- **首 token 時間。** `ttft` 在 Flightdeck 自己的 `turn.step` 鉤子處計時，因此包含其下的全部：其他外掛的鉤子、引擎、網路和任何重試。當模型的思考未流式輸出時，第一塊內容在其之後到達，因此 `ttft` 包含思考時間。它是實測而非推斷，但不是 API 自己的數字。沒有輸出速率：報告的 token 包含思考，因此按可見流計算的速率不是真實速度。

## 配置

在 `/config` 中，或使用者 `settings.json` 的 `pluginConfigs[<id>].options` 下，其中 `<id>` 是 Claude Code 載入外掛的方式：從市場安裝時為 `flightdeck@claude-flightdeck`，用 `--plugin-dir` 時為 `flightdeck`（或 `flightdeck@inline`）。其他鍵下的條目或專案設定（`.claude/settings.json`）中的條目會被無警告地忽略。在終端中，`claude plugin configure flightdeck@claude-flightdeck` 會列出選項及哪些未設定，並用 `--values-stdin` 儲存。

| 選項 | 預設 | 含義 |
| --- | --- | --- |
| `architectPattern` | `advisor\|architect` | 視為架構師的 agent 型別與服務端工具的不區分大小寫正則 |
| `matchDescriptions` | `false` | 同時匹配 agent 描述，而不只是型別名 |
| `architectLabel` | `ARCHITECT` | 面板中架構師的名字 |
| `gateLabel` | `GATE` | 許可權面板的名字 |
| `panels` | `main,architect,gate,agents,loops,receipt,log` | 顯示哪些面板及其順序 |
| `layout` | `auto` | `mini`、`compact`、`wide` 或 `auto`（內聯為 mini，停靠在 110 列起為 wide） |
| `maxCards` | `3` | 改用泳道前並排的卡片數（1–6）；面板過窄時更少 |
| `paneColumns` | `66` | 停靠面板請求的列數，40 或以上。Claude Code 將停靠寬度限制為終端的 45%，你在本會話或更早會話中拖出的寬度優先。wide 佈局從 110 開始，因此需要約 245 列的終端，或 `layout: wide` |
| `motion` | `while-active` | `off` 使連線線靜止 |
| `moments` | `true` | 顯示推斷的諮詢時刻 |
| `palette` | `theme` | `pastel` 使用為深色終端調好的固定配色 |
| `openOnStart` | `true` | 會話啟動時詢問是否打開面板 |
| `statusLine` | `true` | 在狀態行顯示上下文、執行中的 agent、諮詢與拒絕 |

## 故障排查

**面板沒有出現。**
- 檢查 `claude --version` 是否為 2.1.289 或更高，然後執行 `/reload-plugins` 和 `/flightdeck`。在更舊版本上，轉錄會顯示 `flightdeck: hooks module did not load: …`。
- 低於 144 列時，Claude Code 不會為沒人請求的面板留位置；`/flightdeck` 可在任意寬度開啟它。
- 在轉錄中尋找以 `flightdeck:` 開頭的暗色行。它會指出失敗的鉤子或面板被拒絕的原因。請帶著它[提 issue](https://github.com/scasella/claude-flightdeck/issues)。
- 如果面板只顯示 `draw failed (…)`，說明其繪製鉤子拋錯；請把該行也放進 issue。

**VS Code 擴充套件中什麼也不顯示。** 有一份報告稱其 2.1.296 構建運行了 Flightdeck 的鉤子但沒有顯示面板，其他 mod 也沒有（[#5](https://github.com/scasella/claude-flightdeck/issues/5)）。可改為在 VS Code 的整合終端中執行 `claude`，然後 `/flightdeck`：整合終端通常窄於面板自動開啟所需的 144 列。

**在 Team 或 Enterprise 登入下，許可權模式缺失或陳舊，壓縮為估算。** 在託管設定的機器上，或在 Team/Enterprise `/login` 的會話中，Claude Code 會載入內建守衛 `cc-plugin-sec-default`，它從不在 `classic.*` 事件或 `session.compact` 上執行使用者安裝外掛的鉤子。除子 agent 啟動外，使用者的外掛能掛鉤的其他事件都不攜帶許可權模式。因此主框在子 agent 啟動前不顯示模式，之後顯示該啟動時的模式。在此之前，自動模式下閘門會把分類器放行的呼叫記到 `you`。壓縮改按 Claude Code 在每個請求處報告的上下文計數，因此主框標 `⟲~`，日誌說 `context compacted (estimated)`。在 2.1.299 或更高版本，`/plugin` 會顯示一條指出這兩個鉤子的說明。面板其餘部分正常工作。管理員可以把 Flightdeck 安裝為組織自己的 mod 來讓這些鉤子執行（[#23](https://github.com/scasella/claude-flightdeck/issues/23)）。

**選項似乎被忽略。** 檢查使用者 `settings.json` 中的鍵：安裝時為 `pluginConfigs["flightdeck@claude-flightdeck"]`，用 `--plugin-dir` 時為 `pluginConfigs["flightdeck"]`。參見[配置](#配置)。

**顏色不對。** 在 `/config` 中把 `palette` 設為 `pastel`。

**動效太多。** 把 `motion` 設為 `off`。

**更新後計數器陳舊。** 執行 `/flightdeck reset`。

## 工作原理

| 檔案 | 內容 |
| --- | --- |
| [`hooks/register.tsx`](hooks/register.tsx) | 事件鉤子、狀態訪問，以及每個面板一個函式 |
| [`hooks/core.ts`](hooks/core.ts) | 每個 reducer、格式化器和佈局規則都是純函式，因此行為可直接測試 |
| [`hooks/rail.tsx`](hooks/rail.tsx)、[`hooks/elapsed.tsx`](hooks/elapsed.tsx) | 介面模組：動畫連線線與即時時鐘，只重繪自身，使用介面自己的幀時鐘 |
| [`types/index.d.ts`](types/index.d.ts) | 狀態契約 |
| [`tests/`](tests) | 65 個測試：純行為，以及在 24–120 列下掛載到每個介面的繪製 |

狀態存在於 `$.state` 原子中。每次讀取都會合並預設值，因此缺失或較舊的欄位絕不會破壞面板；改變狀態形狀的更新仍可能重置一次其計數器。

## 相關專案

Flightdeck 與這些專案協同工作，並從中獲得靈感：

- [claude-hud](https://github.com/jarrodwatts/claude-hud)：狀態行中的上下文、限制、工具與 agent。兩者可同用：那個是狀態行，這個是面板。
- [zoetrope](https://github.com/furkankly/zoetrope)：把 Claude Code 或 Codex 會話展示為即時流程圖。
- [ccusage](https://github.com/ccusage/ccusage)：從會話日誌報告成本。
- [awesome-claude-code-mods](https://github.com/karanb192/awesome-claude-code-mods)：Claude Code mod 索引。

## 開發

```sh
claude --plugin-dir .            # 載入；編輯後熱過載
claude plugin validate .
claude plugin test .
npx -p typescript tsc -p .       # 首次載入後執行，它會寫入 .claude-plugin/types/
```

參見 [CONTRIBUTING.md](CONTRIBUTING.md)。變更列於 [CHANGELOG.md](CHANGELOG.md)。

## 出處與許可證

- 原作者：[scasella](https://github.com/scasella/claude-flightdeck)
- 原倉庫：https://github.com/scasella/claude-flightdeck
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
