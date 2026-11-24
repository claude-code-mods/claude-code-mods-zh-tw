# shunt

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

一個 **Claude Mod** —— 一個 Claude Code 外掛，其行為是一個[函式鉤子](https://github.com/anthropics/claude-code/issues/91870)模組 —— 在提示行上方的狀態帶中顯示用量：如果配置了 [shunt](https://github.com/pleaseai/shunt) 閘道器，則顯示該閘道器共享賬戶池的用量；否則顯示會話自身的 Claude 速率限制。它還以該池的完整明細回答 `/shunt:usage`。

```
shunt · 5H 5% ↻1h 41m · WK 46% ↻1d 7h · Fable 31% ↻1d 7h ⚠ anthropic degraded
```

```
> /shunt:usage

shunt: pool — degraded   http://127.0.0.1:3001

  5h    ▓▓▓▓▓▓░░░░  62% left   resets 04:11
  7d    ▓▓▓▓▓▓▓▓░░  81% left   resets Sun 01:11
  fable ▓▓░░░░░░░░  19% left   resets Sun 01:11

  claude  ok         5h  71%  7d  84%  fable  19%
  codex   exhausted  5h   0%  7d  40%  fable    —

  headroom left, averaged over the pool's accounts; a shared figure, not a promise about your next request
```

該 mod 讀取閘道器的 [`GET /usage`](https://shunt.sh/reference/endpoints/) 端點並打印出來。命令由它自己回答 —— 鉤子直接返回而不呼叫 `next`，因此不向模型傳送任何內容，回答不消耗 token。

## 狀態帶

在 shunt 閘道器上，狀態帶顯示該池，標記為 `shunt ·`。每個數字是視窗已被**使用**的比例 —— `1 - remaining`，即命令報告的餘量同一池級均值 —— 後跟到該視窗最早重置的時間。用“已用”而非“剩餘”，使其讀數與 Claude Code 自己的 `/usage` 以及 shunt 的狀態帶一致。數字從 70% 轉琥珀色，90% 轉紅色。每個狀態非 `ok` 的池化提供方在末尾被標記（`⚠ anthropic degraded`：`degraded` 為琥珀色，`exhausted` 或 `capped` 為紅色）；若無提供方被列出，則標記池本身。任何賬號都不報告的視窗會被省略。

不在 shunt 上時（未設定閘道器、閘道器對 `GET /usage` 返回 404、成功響應不是池報告，或報告不含任何提供方），狀態帶改為顯示會話自身的速率限制，不帶標記，如 `$.session.usage()` 和 `session.measure` 所報告：

```
5H 5% ↻1h 41m · WK 46% ↻1d 7h
```

在 shunt 上，它在會話啟動時讀取 `GET /usage`，之後每分鐘一次，並在每輪結束後讀取一次（即池剛被消耗的時刻），且忽略會話自身限制，因為那些限制來自最後一個應答的池賬號。被拒絕的令牌（401 或 403）、不可達的閘道器、其他錯誤狀態，或失敗的 `shunt gateway token` 輔助程式，都算 shunt 故障，因此會被標記而非替換：`shunt · ⚠ credential refused`，或輔助程式情形下的 `shunt · ⚠ gateway login unavailable`。若既無閘道器也無速率限制（API key 直連 Anthropic），狀態帶不繪製任何內容。其他外掛在狀態帶中繪製的內容保留在其左側。

用狀態帶的 `[-]`（ctrl+x ctrl+a）為會話摺疊它，或用下文的 `usageBand` 選項關閉它。

## 讀懂數字

`remaining` 是池中合計容量仍**可用**的比例，因此 `62%` 表示仍有 62% 的餘量，而非已用掉 62%。它是在報告該視窗的非停用賬號上 `mean(clamp(cap - utilization, 0, 1))`，其中 `cap` 是該賬號在該視窗的 `max_utilization` 硬上限（未設定時為 `100%`）：九個耗盡賬號加一個全新的無上限賬號讀作 `10%` 而非 `100%`，而 50% 上限下已用 44% 的賬號只計 `6%`。被上限已排除於該視窗請求之外的賬號計零；5h 或 7d 上限會把它從所有請求（含 Fable）中排除。

它是**池級彙總，不是預測** —— 路由還會權衡可用性、模型、會話親和性與優先順序，因此健康的數字不保證你的下一次請求會被受理。若要按路由考慮的最壞情況，請改用 `GET /api/oauth/usage`。

| 視窗 | 覆蓋範圍 |
| --- | --- |
| `5h` | 滾動 5 小時會話視窗 |
| `7d` | 共享每週視窗 |
| `fable` | Fable 範圍的每週視窗（`7d_oi`） |

當無未停用賬號報告某視窗時，它顯示 `—`。ChatGPT/Codex 賬號從 `x-codex-*` 響應頭填充 `5h` 和 `7d`，且沒有自己的 Fable 範圍訊號。

`pool` 是每個池化提供方之上的彙總；其下的各行是按提供方的同一彙總，因此被路由到一個提供方的會話可以讀取該提供方的餘量，而非混合數字。該端點從不攜帶賬號名、計數、優先順序或按賬號的數字 —— 那些細節留在僅限管理員的 `GET /admin/api/pool` 後面。

## 前置條件

1. **讓 Claude Code 指向你的閘道器**，如同你為經它路由已做的那樣：

   ```bash
   export ANTHROPIC_BASE_URL=http://127.0.0.1:3001
   export ANTHROPIC_AUTH_TOKEN=<你的客戶端 token>
   ```

2. **在閘道器上啟用該端點**。`GET /usage` 是選擇性加入，需要 `[server.auth]`（客戶端 token）或 `[server.gateway]`（閘道器登入），位於 `shunt.toml` 中 `[server.usage]` 表旁邊：

   ```toml
   [server.auth]

   # 僅存在即表示啟用；該表不帶鍵。
   [server.usage]
   ```

   若用 `[server.gateway]` 替代 `[server.auth]`，見下文 [`shunt gateway claude` 會話](#shunt-gateway-claude-會話)。`[server.auth]` 的 token 取自環境而非 TOML —— 預設為 `SHUNT_CLIENT_TOKENS`，以 `name:token` 對形式 —— 未設定時閘道器會啟動失敗。請在執行閘道器處匯出它，使用與上文 `ANTHROPIC_AUTH_TOKEN` 相同的 token：

   ```bash
   export SHUNT_CLIENT_TOKENS="claude-code:<你的客戶端 token>"
   ```

3. **以啟用函式鉤子的方式執行 Claude Code** —— 該功能為早期訪問：

   ```bash
   CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude
   ```

沒有步驟 3 就沒有狀態帶，命令仍存在但會回退到 `commands/usage.md`，它會要求模型用工具呼叫去讀取端點。

## 安裝

```
/plugin marketplace add pleaseai/shunt
/plugin install shunt@shunt
```

## 配置

一個選項，`/config` 中的一行（存於 settings.json 的 `pluginConfigs` 下）：

| 選項 | 預設 | 作用 |
| --- | --- | --- |
| `usageBand` | `true` | 在提示行上方顯示狀態帶。關閉後 mod 不註冊狀態帶也不輪詢任何內容；`/shunt:usage` 仍會回答 |

該 mod 讀取五個環境變數，不寫入任何變數。預設情況下，它把會話自身的憑據傳送給會話本就在向其傳送每條訊息的閘道器，因此不會觸達會話原本不使用的任何主機；`SHUNT_BASE_URL` 是有意的例外，會把請求指向你指定的閘道器。若完全未設定 base URL，它什麼都不問，而不是把憑據發給 Anthropic API。

| 變數 | 作用 |
| --- | --- |
| `SHUNT_BASE_URL` | 閘道器 base URL；覆蓋 `ANTHROPIC_BASE_URL` |
| `ANTHROPIC_BASE_URL` | 本會話已透過其路由的閘道器 |
| `SHUNT_TOKEN` | 客戶端 token；覆蓋以下兩者，以 `Authorization: Bearer` 傳送 |
| `ANTHROPIC_AUTH_TOKEN` | 以 `Authorization: Bearer` 傳送，如 Claude Code 所發 |
| `ANTHROPIC_API_KEY` | 以 `x-api-key` 傳送，如 Claude Code 所發 |

`SHUNT_BASE_URL` 讓你能在流量經另一個閘道器路由時，讀取某一個閘道器的池。

### `shunt gateway claude` 會話

`shunt gateway claude` 會從它交給 Claude Code 的環境中清除 `ANTHROPIC_AUTH_TOKEN` 和 `ANTHROPIC_API_KEY`，並把 `apiKeyHelper` 接到 `shunt gateway token`；Claude Code 自行使用輔助程式的輸出，且從不重新匯出它。因此，當上述變數都沒有憑據時，該 mod 會讀取合併後的設定（含 `--settings`），若 `apiKeyHelper` 是 shunt 自己的（按裸名或按路徑，如啟動器所寫 `shunt gateway token`），就直接執行它（不經 shell），並把其列印的閘道器登入 token 以 `Authorization: Bearer` 傳送。因為沒有 shell，未加引號的輔助程式路徑中以 `~/` 開頭的部分會由該 mod 自行展開為主目錄（`HOME`，否則 `USERPROFILE`）；加引號的 `'~/…'` 則保持字面值，如在 shell 中。該登入屬於會話所交談的閘道器（`ANTHROPIC_BASE_URL`），因此僅在 `SHUNT_BASE_URL` 未設定或拼寫同一 base URL 時才傳送（比較前會去除空白和尾部斜槓，因此 `localhost` 與 `127.0.0.1` 視為不同）—— 否則輔助程式甚至不會被執行；要讀取另一閘道器的池，請為其匯出 `SHUNT_TOKEN`。若該輔助程式失敗（非零退出、無輸出，或無法啟動），狀態帶會標記 `shunt · ⚠ gateway login unavailable`，且 `/shunt:usage` 會提示執行 `shunt gateway login`，而不是靜默顯示會話自身限制。

token 複用五分鐘，因此每分鐘一次輪詢不會每分鐘執行輔助程式。被閘道器拒絕的複用 token 會被丟棄，並再請求輔助程式一次，因為重新整理可能已輪換它。任何其他 `apiKeyHelper` —— 密碼管理器、會提示的指令碼 —— 絕不會被執行：否則該 mod 會為用量數字每幾分鐘執行它一次。在這類會話中，請改為為 `[server.auth]` 客戶端 token 匯出 `SHUNT_TOKEN`，否則狀態帶會回退到會話自身速率限制。

閘道器必須在 `GET /usage` 上接受閘道器登入，這需要一個在該處對 `[server.gateway]` 登入進行認證（authtenticate）的 shunt 構建；只配置 `[server.gateway]` 的 `[server.usage]` 即已足夠。

## 為什麼是 `/shunt:usage` 而不是 `/usage`

`/usage` 是 Claude Code 自己的內建命令，引擎不允許外掛佔用內建名稱：

```
$.command.register: "/usage" refused: it is the built-in /usage
```

`$.command.register` 只接受裸的、全域性的名稱。外掛的 **markdown** 命令則按外掛名稱空間，因此名為 `shunt` 的外掛中的 `commands/usage.md` 會顯示為 `shunt:usage`，不與任何內容衝突。hooks 模組隨後攔截該名稱的 `command.run` 並直接回答。

## 佈局

| 路徑 | 是什麼 |
| --- | --- |
| `hooks/register.tsx` | 鉤子：`shunt:usage` 上的 `command.run`，以及狀態帶在 `AbovePrompt` 上的 `session.start`、`session.measure`、`turn.complete` 與 `ui.render` |
| `hooks/endpoint.ts` | 解析閘道器 URL 與憑據頭 |
| `hooks/report.ts` | 防禦性地讀取 `GET /usage` 響應體 |
| `hooks/reading.ts` | 把一次往返變成完整或簡略的報告或問題 |
| `hooks/views.ts` | 渲染命令的條、百分比與重置時間 |
| `hooks/band.ts` | 狀態帶的單元格、告警、等級與倒計時，取自池或會話自身限制 |
| `hooks/names.ts` | 命令名與固定文字 |
| `types/index.d.ts` | `$.state` 契約：池快照、會話限制與狀態帶繪製所用的時鐘 |
| `commands/usage.md` | 命令本身，以及無函式鉤子時的回退 |
| `tests/*.spec.ts` | 純模組的 Vitest 套件 |
| `tests/mod/*.test.tsx` | 由 `claude plugin test` 執行的引擎套件 |

## 開發

```bash
# 靜態副作用分析：掛了哪些事件、呼叫了哪些 $ 與讀取了哪些環境變數。
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin validate plugins/shunt

# 純模組的套件與型別檢查（兩者均為 CI 關卡）。
cd plugins/shunt && npm ci && npm run typecheck && npm test

# 用引擎本身測試鉤子：狀態帶與命令，且閘道器、時鐘與環境均已模擬。
# 需要 Claude Code 二進位制，因此 CI 不執行它。
claude plugin test plugins/shunt

# 從原始碼針對真實閘道器執行。
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude --plugin-dir plugins/shunt
```

`hooks/register.tsx` 是唯一匯入 `claude-code` 的 hooks 檔案。型別檢查它需要引擎自身的 `claude-code.d.ts`，Claude Code 會透過 `/plugin-types` 寫入外掛作者的工程；其他模組不從引擎匯入任何東西，因此套件無需它即可覆蓋它們。同理，`tsconfig.json` 把 `hooks/register.tsx` 排除在 `npm run typecheck` 之外，連同引擎套件 `tests/mod` —— 該排除是有意的，而非疏忽；要對那個檔案做型別檢查，意味著先執行 `/plugin-types`。

> 函式鉤子是早期訪問。hooks 模組只在啟用處載入，而本 mod 所針對的 API 可能在 Claude Code 版本之間不經通知地變更。

## 出處與許可證

- 原作者：[pleaseai](https://github.com/pleaseai/shunt)
- 原倉庫：https://github.com/pleaseai/shunt
- 許可證：MIT 或 Apache-2.0（與 shunt 專案一致）
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
