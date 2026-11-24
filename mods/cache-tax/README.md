<picture>
  <source media="(prefers-color-scheme: dark)" srcset="site/assets/cache-tax-dark.svg">
  <img src="site/assets/cache-tax-light.svg" alt="Cache Tax" width="64" height="64">
</picture>

# Cache Tax for Claude Code（繁體中文版）

> 繁體中文版由 claude-code-mods-zh-tw 專案翻譯，原作者與許可證見文末。原版 README 見 [README.en.md](README.en.md)。

**在你離開時保持 Claude Code 的提示詞快取溫熱。**

Cache Tax 是一個 Claude Code mod：當你離開一會兒時重新整理你的提示詞快取，並在冷啟動傳送前顯示估算的重寫成本。休息前執行 `/keepwarm 90m`。探測（ping）會消耗 token，請選擇你預期會在視窗內返回的時長。

**[安裝](#安裝)** · [官網](https://cachetax.aidojo.si/) · [工作原理](#工作原理) · [成本與套餐限制](#成本與套餐限制) · [命令](#命令)

![真實錄屏：cache-tax 以 6.61 美元估算值攔截一次冷啟動傳送](https://github.com/karanb192/cache-tax/raw/main/site/assets/refusal.gif)

在一個 330k token 的會話中，一次兩行的回顧觸發了 **$6.61 的估算**。重新發送後，報告的實際快取寫入為 **$6.28**。錄製於 2.1.1；當前措辭為“最多”該估算 token 數。這些是與 API 等價的成本，不是額外的訂閱費用。

## 安裝

需要 [Claude Code 2.1.287 或更高版本](https://code.claude.com/docs/en/plugins/mods/overview#turn-mods-on-or-off)、一小時快取，且 Claude Code 保持執行。mod 預設開啟。探測會消耗 token，包括不封頂的輸出。

```sh
claude plugin marketplace add karanb192/claude-code-mods
claude plugin install cache-tax@claude-code-mods
```

重啟 Claude Code，或在開啟的會話中執行 `/reload-plugins`。不需要早期訪問標誌。如果你之前設定過 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS`，請將其移除；當前 Claude Code 會忽略它。

在溫熱的會話中，執行 `/keepwarm` 來武裝六小時。用 `/keepwarm 90m` 設定更短的視窗，或用 `/keepwarm off` 停止。

**確認主快取的生命週期。** 訂閱套餐的預設值是一小時。API key、用量額度和雲提供商的會話預設是五分鐘，請把這些計費路徑的 [`promptCacheTtl`](https://code.claude.com/docs/en/prompt-caching#choose-the-ttl-yourself) 設為 `"1h"`。50 分鐘的定時器無法保護五分鐘的主快取。關於分叉（fork）證據見[限制](#限制)。

**想用 settings hook 版本？** [hook 版](https://github.com/karanb192/claude-code-hooks/tree/main/plugins/cache-tax) 預設只警告，設定 `CACHE_TAX_BLOCK=1` 時會拒絕一次，並提供獨立的狀態行倒計時。預熱是本 mod 的一部分。

由 [Karan Bansal](https://karanbansal.in/) 構建。閱讀 [Cache Tax 的故事與實測快取成本](https://karanbansal.in/blog/cache-tax/)。

## 選項

在 `/config` 中，找到 cache-tax：

    Auto keepwarm:    on | off
    Display:          band | status
    Ping floor:       2 (一個數字，0 或以上)
    Headless prompts: guard | send

`on`（預設）保留當前行為：當你支付了一次冷快取寫入後，keepwarm 會自動武裝三小時。`off` 則在你用 `/keepwarm` 武裝前不會自動啟用；此時守衛的措辭會說 keepwarm 保持關閉，或會說明你已武裝的視窗還剩多少時間。無論哪種情況，`/keepwarm always` 都仍會武裝。

Ping floor（探測下限）把估算的冷重寫成本分攤成一個空閒休息預算：填 2 允許估算探測花費低於一次重寫的一半；填 0 則停用該限制。探測前，本次休息已觀察到的花費加上下一次探測的估算必須低於該預算。估算採用最近五次溫熱回執中最便宜的那次，並按當前模型和上下文重新定價（含其提示詞檔位）。新的主回合會重置花費；延長、停止或重新武裝視窗則不會。被跳過的探測會讓快取自然變冷。日誌和狀態會說明原因，且 `$.cacheTax.status()` 會暴露 `pingSkipped` 和 `idlePingUsd`。

第一次探測沒有回執，所以會發出。之後的回答可能比估算更貴，因此這是基於估算的限制，不是保證的最大賬單。如果沒有模型價格、上下文或已定價的回執，則無法比較。回執與花費都在記憶體中：重啟或新會話會清空它們。探測可能在請求的預熱視窗結束前就停止。

Display 選擇在 keepwarm 武裝時狀態顯示在哪裡。`band`（預設）是提示行上方的一行：終端中是文字圖示，桌面端是立方體圖示。`status` 把同樣的文字放到提示行下方的狀態條目中，不繪製任何一行——當另一個 mod 佔用了提示行上方區域時適用。沒有隱藏它的設定：探測會消耗 token，所以螢幕始終要說明它們何時執行。

## 工作原理

**休息前：** `/keepwarm` 武裝一個有界視窗。50 分鐘空閒後，Claude Code 內部的一個定時器會基於會話的轉錄傳送一次無工具的 fork。它每次探測後讀取用量，當讀取為 0 或寫入達到讀取的 10% 時停止。空閒花費限制可以在視窗結束前跳過後續探測。沒有後臺轉錄輪詢迴圈。

**當你冷啟動返回時：** 對於至少 50,000 token 的上下文，守衛會在其一小時時鐘判定為冷時，在你傳送普通訊息前詢問。問題會顯示估算的重寫成本和預熱建議。**仍然傳送**會發送該訊息；**不要傳送**則丟棄它。如果對話方塊被關閉或宿主無法回答，守衛會拒絕一次，而重發會順利透過。能回答對話方塊的 SDK 宿主會保留該選擇。`/cache-tax guard refuse 5` 表示在 5 美元及以上時詢問（包括沒有價格行的模型）；更便宜的傳送會記錄其價格並繼續。

`Headless prompts: send` 讓非互動的 `sdk` 來源提示在預設守衛設定下立即傳送。Claude Code 對 `claude -p` 和 Agent SDK 回合使用相同的欄位，因此該選項同時覆蓋兩者；它無法區分 CLI 與 SDK 宿主。預設值 `guard` 會繼續詢問，或在沒有人能回答時拒絕一次。顯式的 `/cache-tax guard refuse`（無論是否帶美元下限）在 `send` 下仍然生效；`/cache-tax guard default` 會清除該顯式偏好。遠端的人類訊息（`composer`、`bridge`、`unclassified` 及頻道來源）即使是非互動宿主也保留守衛。後臺通知和定時提示會帶價格記錄地傳送，因為沒有人能重發它們。

無頭（headless）拒絕會返回原因並記錄到轉錄/除錯日誌。排查指令碼時使用 Claude Code 的 `--debug-file`。mod API 無法設定程序退出碼或把拒絕寫入 stderr；拒絕不一定會產生非零退出碼或 stdout 上的原因。命中美元下限的顯式選擇執行仍需有意地重試。

預設情況下，檢測到冷寫入會自動武裝至少三小時的 keepwarm、始終視窗（預設六小時，除非你設定其他值）且 `always` 開啟，並列印其成本；Auto keepwarm 選項會關閉自動部分。`/cache-tax` 顯示當前快取估算、預熱視窗以及本會話的冷寫入累計。

累計跟隨快取回執。對每個請求，它估算舊上下文被重新寫入的量，取“報告的寫入”與“先前上下文減去報告的讀取”中較小者。小於讀取 10% 的缺失尾部視為快取命中。命中上的新內容不計入也不會武裝 keepwarm；但實質性的部分重寫仍可能計入。每次重寫使用該請求的模型與價格檔。

如果宿主只報告累計的回合用量，估算可能漏掉被後續快取讀取掩蓋的重寫；而未按請求提供回執的、經過壓縮的回合則不會被計分。

當守衛允許傳送但檢測到沒有重寫時，完成提示會說明沒有開啟自動冷寫入視窗，或說明已有的預熱狀態。這並不確認服務端的快取狀態（基於累計用量）。被 `/clear` 打斷的冷寫入完成無法在替換會話中開啟它的自動視窗。

準備或跳過壓縮不會改變預熱。已應用的壓縮會暫停預熱，直到某個主請求讀取或寫入新字首。武裝的視窗隨後可以在回合等待工具或使用者回答時恢復探測。摘要寫入不計入累計；壓縮前已支付的重寫保留其原始上下文與價格。

視窗屬於單個會話。已經變冷的會話會等待你的下一輪再探測；Claude Code 重啟後恢復的視窗也是如此，直到新程序有一輪可以 fork。如果一次探測發現沒有可 fork 的內容，會一次性用一行提示說明，隨後探測會在你的下一條訊息後開始。被繁忙的 API（429、529、5xx）拒絕的探測會在 1、2 和 4 分鐘後重試，前提是仍能趕在快取變冷之前到達。當 `always` 開啟時，你每一輪觸達快取的回合都會在預設週期內至少留下始終視窗（預設六小時），受空閒花費限制和成功溫熱回讀約束。`/keepwarm always 24h` 把該下限改為 24 小時（對每個會話；範圍 1h 到 168h；裸 `/keepwarm always` 回到六小時）。同一回合會恢復已停止的視窗、把較短的視窗拉長到始終視窗，並重置測試周期；你設定的更長視窗則保留。任何會話中的 `/keepwarm off` 都會從下一輪起停止每個會話的滾動。視窗在其截止時間結束；`/keepwarm off` 也會取消它並清除 always 設定。

### 一次實測的預熱探測

![真實 keepwarm 狀態顯示以 0.02 美元讀取 75k token](site/assets/keepwarm-receipt.png)

Sonnet 5，2026 年 9 月 16 日：狀態報告 **75k token，讀取花費 $0.02**。即時執行期間對話中沒有任何內容出現。該截圖使用的是 2.0.0 上的一分鐘測試間隔；其卡片的 $0.45 重寫估算使用了舊版 Sonnet 價格行，而當前價格行對相同上下文為 $0.30。兩美分的探測是該會話的回執，不是固定價格。

## 為什麼短訊息也可能很貴

當快取字首過期時，即使是“給我一個回顧”也可能在回答前觸發舊上下文的重寫。Cache Tax 的 Fable 5.1 價格行對比了每百萬 token $20 的一小時寫入與 $0.25 的快取讀取：每 token 相差 80 倍，而非總節省相差 80 倍。參見[定價假設](#成本與套餐限制)和 [Anthropic 價格表](https://platform.claude.com/docs/en/about-claude/pricing)。

[觀看 23 秒概覽](docs/assets/cache-cost-explainer.mp4)。其設計場景標註的是 Fable 5.1 的標價；每個終端與狀態行畫素都來自上文的真實拒絕錄屏與預熱回執。拒絕錄製於 2.1.1，預熱截圖截於 2.0.0。

不熟悉快取？[Anthropic 解釋了 Claude Code 如何使用它](https://code.claude.com/docs/en/prompt-caching)。

## 命令

    /keepwarm               保持溫熱六小時
    /keepwarm 90m           按你自己的視窗保持溫熱，1m 到 168h（也支援 2h30m、6h）
    /keepwarm always        讓每個會話在其最後一輪後六小時內保持溫熱，跨會話記住
    /keepwarm always 24h    同上，直到最後一輪後 24 小時（1h 到 168h）
    /keepwarm 6h every 2m   每兩分鐘探測一次；測試旋鈕，1m 到 59m，本視窗結束後忘記（always 開啟時於你的下一輪）
    /keepwarm status        預熱視窗、下次探測和最近回執
    /keepwarm off           停止、忘記視窗，並關閉 always
    /cache-tax              卡片
    /cache-tax guard warn   顯示價格併發送（hook 的預設）
    /cache-tax guard default
                            恢復預設守衛，並讓 Headless prompts 控制非互動 SDK 傳送
    /cache-tax guard refuse 冷啟動傳送前詢問，覆蓋 Headless prompts: send
    /cache-tax guard refuse 5
                            僅在 5 美元及以上時詢問；低於該值時顯示價格併發送
    /cache-tax guard test   在你傳送的下一條提示上像快取是冷的一樣詢問一次，按本會話上下文定價；測試不計分，真正冷快取中的傳送照常計分

`/keepwarm` 會拒絕多餘的詞、無效時長以及超出限制的視窗，且不改變當前預熱視窗。它啟動時也會丟棄無效或過長的已存截止時間。在其首次探測到期前結束的視窗會在回覆中說明這一點。

問題原文，其下為 **Send anyway ($4.01)** 與 **Don't send**：

    cache-tax: 提示詞快取在 2h00m 前變冷。傳送此訊息會重寫最多 200,502 個 token，按 $20/MTok = $4.01（溫熱回合的成本本應只有 $0.05）。不要傳送可省下 $4.01；傳送後 keepwarm 會武裝最多 3h00m。僅快取讀取每次探測約 $0.05。探測可能更早停在空閒花費限制，讓快取變冷。仍然傳送？

當問題被關閉、或有守衛的無頭執行無法展示它時，改為顯示拒絕文字，且重發會順利透過：

    cache-tax: 提示詞快取在 2h00m 前變冷。傳送此訊息會重寫最多 200,502 個 token，按 $20/MTok = $4.01（溫熱回合本應只花 $0.05）。重新發送一次即可支付它，keepwarm 隨後會武裝最多 3h00m，但可能更早停在空閒花費限制。或者 /clear 並從頭以一條筆記開始。

該數字是上限。引擎為恢復會話報告的上下文計數是最後一次響應的輸入、快取讀取、快取寫入和輸出之和，而恢復載荷沒有單獨的輸出計數可供扣除；在一個 15 天前的會話上，守衛說 330,316 token、$6.61，而隨後的寫入為 314k token、$6.28。

當 keepwarm 武裝時，終端和桌面 Code 標籤頁會在提示行上方顯示一行，除非 Display 為 `status`。終端使用加粗的 `[>]` 文字圖示並使用狀態色。桌面端顯示 Cache Tax 立方體，溫熱時蓋為綠色、冷時為橙色，首輪前或壓縮後為灰色。加粗的狀態標籤一致；計時器與回執文字使用常規字重。非空的 `NO_COLOR` 會在兩種介面上選擇加粗文字圖示並移除狀態色。兩種顯示選擇都會顯示 `warm`、`cold` 或 `unknown`，因此顏色永遠不會是唯一訊號。這些狀態使用與 `/cache-tax` 相同的一小時時鐘；它們是估算，不是對伺服器快取的即時檢查。

當 keepwarm 武裝時，該行和純狀態回退每分鐘重新整理一次，空閒時也重新整理。重新整理只更新顯示，不傳送模型請求。

該行包含預熱視窗、下次探測和最近回讀。已停止的迴圈顯示一箇中性符號及其原因。`/keepwarm off` 或視窗過期會移除該行。問卷會臨時優先，其他 mod 的內容仍留在狀態帶中。Display `status` 會在狀態條目中顯示同樣的帶標籤文字；沒有狀態帶的介面上若 Display 仍為 `band`，則保留純狀態文字。

桌面的立方體和終端的冷狀態色會跟隨 Claude 的淺色或深色主題。內嵌 SVG 來自官網的官方資源；維護者可用 `python3 tools/generate-status-icons.py` 重新生成。執行時不會讀取或獲取任何影像檔案。

mod 在會話啟動時讀取一次主題和 `NO_COLOR`。被接受的主題變更會立即更新圖示；普通重繪不會重新讀取任一設定。請在啟動會話前設定 `NO_COLOR`。

## 兩者都安裝了

hook 與 mod 共用一個名稱和一項工作，同時擁有兩者意味著每次冷啟動傳送都有兩道守衛。mod 會在會話啟動時檢查 hook 的 `/cache-tax:status` 命令是否存在，並一次性說明。只保留一個守衛。hook 仍是偏好 settings hook 的使用者可選方案。解除安裝它之前，檢查你的狀態行：接到 `cache-tax.js` 的 🧊 行來自 hook 的檔案。本 mod 在 keepwarm 武裝時在提示行上方繪製；它不會替換你的 shell 狀態行。

## 它能觸及什麼

已在 Claude Code 2.1.312 上驗證：

    ❯ ./register.ts hooks: config.set{key=theme}, ui.render{component=AbovePrompt}, session.start, session.end, classic.SessionStart, command.run{command=keepwarm}, command.run{command=cache-tax}, prompt.submit, turn.step, turn.complete, session.compact
    ❯ ./register.ts calls: $.clock.after (via arm, ping), $.clock.every (via updateStatus), $.clock.now, $.command.list, $.command.register, $.config.list, $.env.get, $.model.fork (via ping), $.session.id (via reseat, seat), $.session.model, $.session.usage, $.store.delete, $.store.get, $.store.set, $.ui.ask (via ask), $.ui.invalidate, $.ui.log, $.ui.resolve, $.ui.status
    ❯ ./register.ts env reads: NO_COLOR

Reach L2，驅動 Claude。看到你輸入的每個提示、每個模型請求的時機和每次回答的 token 數。

同一份掃描結果見 [cache-tax 在 Awesome Claude Code Mods 的頁面](https://mods.aidojo.si/mods/karanb192--cache-tax--cache-tax/)，其中記錄了數千個其他 mod 的可觸及範圍。

    cache-tax 威脅模型（reach L2，驅動 Claude）
    1. 讀取：每個提示是否以斜槓開頭且別無其他內容（文字原樣傳遞，從不保留、從不記錄）；時間；回合完成和 fork 回覆上引擎已持有的 token 計數與模型 id；Claude Code 為 settings hook 計算的恢復欄位；命令列表；本程序執行每個會話一次的 session id、會話模型以及引擎自身的上下文數字和開始時間，且在定價冷啟動傳送和每次探測前再次讀取模型；在 /clear 或程序內恢復下結束的會話的原因與 session id；每個主請求的訊息數；來自其自身 $.store 的、按 session id 鍵入的 keepwarm 截止時間與探測週期，以及全域性 always 開關（及其視窗）和帶美元下限的守衛模式；載入時讀取其 Auto keepwarm、Display、Ping floor 與 Headless prompts 選項；會話是否以互動方式啟動
    2. 執行：keepwarm 視窗內每段空閒一次的 $.model.fork，每個探測週期一次（除非測試旋鈕設定，否則 50 分鐘，下限 1 分鐘），絕不超出視窗，絕不落到 mod 已知為冷的快取上，在一次回讀什麼也未讀到或寫入達到讀取量的十分之一後絕不執行；在價格與回執已知時，僅在已觀察到的空閒花費加上下一次估算探測低於重寫成本除以 Ping floor（0 停用限制）時執行；在冷啟動傳送發出前於 Claude Code 自己的對話方塊中提問一次，或在 `/cache-tax guard test` 後於你的下一條提示上提問
    3. 傳送：除了 fork 之外沒有任何東西離開本機——fork 是基於會話自身轉錄的一次 API 請求，帶固定的單行提示
    4. 持久化：在 $.store 中，按本會話 id 存 keepwarm 截止時間與探測週期（always 開啟時每輪後重寫），以及對每個會話存 always 開關（true，或其毫秒視窗）和守衛模式（美元下限以其位置儲存）；拒絕後，按本會話 id 存最近一次響應的時間，使新程序的 resend（claude -p 每輪啟動一個）可以透過，由該 resend 或 /clear 刪除；已結束的視窗在停止時和本會話下次啟動時刪除，連同 2.1.0 store 的裸鍵一起；這裡絕不刪除其他會話的鍵，因為“讀取後刪除”無法與那個會話續期其視窗做成原子操作，所以武裝了 keepwarm 卻再未返回的會話會留下兩個小鍵；會話的冷寫入累計、最多五條溫熱探測回執和空閒探測花費都在記憶體中，隨程序消亡
    5. 敵意輸入：它解析的唯一文字是其兩個命令的引數，對照時長正則、美元金額和幾個字面量匹配；對話方塊的回答只與其自身兩個標籤比較；提示文字只檢查第一個非空白字元是否為斜槓；工具結果與檔案絕不會進入分支；fork 的提示是常量，因此無法借它傳送任何構造內容；守衛只會丟棄使用者自己的訊息：在“不要傳送”後會再次詢問 resend，在被關閉或無法回答的問題之後 resend 是無條件的；如果 hook 拋錯，引擎會跳過它，訊息無守衛地進入，並帶一行灰色提示

## 成本與套餐限制

價格採用標價表：Fable 5.1 讀取 $0.25、1h 檔寫入 $20、回答 $50（每百萬 token）；Fable 5.2（$0.20、$16、$40）與 Sonnet 5（$0.20、$4、$10）各有自己的行。只有列出的版本會定價：比表更新的模型會顯示 `n/a` 和一行“尚無價格行”的說明，且從不借用舊模型的費率。API key 上的算術很直接。一次探測按快取讀取、其自身少量未快取 token 按基礎費率、以及模型回覆按輸出費率計費；顯示的探測成本包含全部，因為 fork 沒有輸出上限，且高 effort 的模型可能先說 “warm” 再展開思考。失效後的迴歸是一次寫入。卡片會為你所選模型列印只讀上限（Fable 5.1 為 80 次探測），以及當前探測週期下能覆蓋的空閒時長；真實探測的成本略高於一次讀取，因此真正的回本點位於該數字之下。訂閱套餐上的美元是尺子而非賬單，而快取讀取如何計入 5 小時與每週限制，在我能找到的任何地方都沒有文件。請在第一個視窗期間留意狀態行的速率限制行。

## 限制

- mod 需要 Claude Code 2.1.287+。它們預設開啟，但本地設定、安全模式或組織策略可能阻止載入。參見 [mod 控制](https://code.claude.com/docs/en/plugins/mods/overview#turn-mods-on-or-off)。
- 50 分鐘的計劃需要一小時主快取。訂閱套餐預設具備。其他計費路徑需把 [`promptCacheTtl`](https://code.claude.com/docs/en/prompt-caching#choose-the-ttl-yourself) 設為 `"1h"`。
- 預設間隔下的一次轉錄驗證的返回，Fable 5.1 訂閱，2026 年 9 月 19 日：`/keepwarm` 在休息第 42 分鐘武裝，探測在第 50 分鐘觸發並讀取 157k，第 62 分鐘傳送的訊息從快取讀取 156,886 token 並寫入 2,255。Claude Code 自身的快取倒計時在探測後重置為 58 分鐘，因此 fork 攜帶了一小時的 TTL。一次執行、一種配置：它表明該探測使那個快取活過了一小時，而非每種配置都能淨省。Claude Code 在文件中把 fork 歸入非主請求桶，通常為五分鐘。在此執行中，fork 仍讀取了一小時會話字首並重置了原生倒計時。這是一次配置下的觀察行為，而非所有提供方對分桶處理相同的證明。
- 一次讀取溫熱的探測證明當時快取是溫熱的。字首變更無論時間如何都可能使快取失效。確切效果取決於模型以及 Claude Code 何時應用變更；參見 [Claude Code 的快取行為](https://code.claude.com/docs/en/prompt-caching)。
- 恢復欄位讓守衛能檢查恢復後的第一次普通傳送。若這些欄位缺失，第一輪會自行播種其時鐘與上下文。
- 在 Team 和 Enterprise 賬號上，一個託管外掛位於本 mod 之上，處理經典事件與壓縮並繼續在其下執行，因此它們永遠不會到達本 mod。它隨後從會話結束得知 `/clear`，使 keepwarm 停止，新會話得到自己的視窗；恢復轉錄的上下文取自引擎數字，但沒有其最後響應的時間，因此從該轉錄首次啟動起一小時後，第一條訊息會記錄冷啟動傳送的成本而非拒絕；壓縮從少於前一條請求一半訊息數量的請求識別（rewind 會減掉幾條，摘要會替換幾十條），因此壓縮與該請求之間的探測或傳送仍會看到舊上下文。壓縮後寫入的摘要永遠不會被計為冷寫入；同一回合在壓縮前已支付的冷寫入仍然計入（當宿主按請求報告用量時）。透過程序內恢復攜帶的視窗會遷移到新會話的鍵。
- 守衛的 token 計數是上限：它是引擎為最後一次響應報告的上下文，在恢復時包含該響應的輸出，而 mod 沒有單獨的輸出計數可減。
- 冷寫入累計按會話且僅在記憶體中；`/clear` 會清空它。
- 上下文大小是引擎的即時視窗數字。一輪自身的用量是其各次響應的總和，在十步回合上是十次上下文讀取，因此只在宿主沒有即時數字時作為回退。

## 本地開發

從本地檢出載入一個會話：

    claude --plugin-dir .

若要長期安裝，請使用[市場命令](#安裝)。

要提交改動？[CONTRIBUTING.md](CONTRIBUTING.md) 說明了 PR 需要哪些證據。

## 在你自己的會話上驗證

模擬時鐘測試證明定時器、守衛和計分，而非 fork 命中主快取。一次探測即可證明，其成本是一次快取讀取加回答。在任意溫熱會話中：

    > 用一句話回覆：ready
    > /keepwarm 1h every 1m

一分鐘後在提示行上方觀察，或在 Display 為 `status`、或介面沒有狀態帶時觀察狀態條目。`last ping read 20k $0.01` 報告 fork 的回讀。`keepwarm stopped: the ping read ... and wrote ...` 表示回讀未達到溫熱閾值，迴圈已停止。`API busy, ping retry 1 of 3` 表示正在重試 429、529 或 5xx；若三次重試後 API 仍繁忙或距快取變冷不足一分鐘，迴圈會停止。`nothing to fork yet` 表示程序沒有可 fork 的會話，如重啟後；視窗會等待你的下一條訊息。任何其他 API 錯誤、中斷或空回覆都會帶原因停止迴圈。返回 null 的舊引擎會顯示合併的冷快照或 API 失敗訊息。以 `/keepwarm off` 結束。這個簡短檢查證明了一次快取讀取，而非預設 50 分鐘間隔下的保留。

## 測試與型別檢查

從倉庫根目錄執行：

```sh
claude plugin validate .claude-plugin/plugin.json
claude plugin test .
```

[366 個測試](tests/register.test.ts) 使用模擬時鐘與引擎，覆蓋：

- **Auto keepwarm 選項：** off 對已支付的冷寫入計分但不武裝 keepwarm，並在拒絕與問題中說明；手動武裝的視窗會守約到其截止時間並持續探測；always 仍會續期六小時。
- **Ping floor 選項：** 累計花費會停止長時間休息，主回合會重置它，重新武裝不能重置，近期便宜回執在昂貴異常值後仍存在，模型切換會在下一次探測前定價，且在模型讀取期間的 off 命令會取消該探測。跨停止計費的探測仍計數，回合結束後完成的則不計入，出錯的回合會保留跳過。既有的跳過、壓縮、清除、未知上下文和停用限制的覆蓋仍然保留。
- **Headless prompts 選項：** 非互動 SDK 提示的選擇加入、SDK 對話方塊回答、互動 SDK 與遠端人類守衛、顯式拒絕與美元下限、恢復預設值，以及在已存偏好仍在載入時到達的提示。
- **守衛：** Send anyway / Don't send 問題、其關閉回退與守衛測試、拒絕一次並重發（包括新程序與無響應的 API 錯誤後）、warn 模式、美元下限（低於、等於、無定價模型、自上一回合起切換的模型）、斜槓命令、小上下文、無人輸入的提示、恢復播種和冷寫入計分。
- **預熱：** 命令預設值與拒絕的視窗和週期、always/off、always 及其自身視窗與它拒絕的視窗、`/clear` 後的 always、從最後一輪滾動的 always、空閒重置、基於用量的停止、冷視窗過期以及睡眠後的延遲定時器。
- **會話狀態：** 隔離的 store 鍵、恢復的視窗、舊版清理、clear/壓縮重置和子 agent 隔離。自動視窗的時鐘或 store 等待期間的 clear 不能武裝下一會話或抹去其手動視窗。
- **壓縮就緒：** 準備或跳過摘要不會改變預熱。已應用壓縮後，讀取或寫入快取的主響應會讓預熱在回合等待工具或使用者回答時恢復。摘要寫入不計入冷寫入累計；清除、停止或更新壓縮後的失敗請求與陳舊響應不能重新啟動探測。
- **位於 mod 之上的託管外掛：** 經典與壓縮事件繼續運行於使用者層之下的 `/clear`、恢復、恢復的視窗和壓縮；相同事件被重複或亂序送達而不會產生第二個視窗、警告或重置；視窗與模型變更透過程序內恢復攜帶；一個在恢復後變得足夠舊而變冷的轉錄；與壓縮區分開的 rewind；一條非冷寫入的摘要寫入與一條冷寫入並存（首次請求前被壓縮的有守衛傳送、一輪中兩次壓縮）；與經典恢復重疊或延續更久的舊會話結束；以及在宿主報告下一會話 id 之前執行的 `/keepwarm`。
- **定價與顯示：** 每個列出的模型在其日期化、提供方和顯示名拼寫下的行；表未列出的版本不借用行；無價格行的冷寫入與美元總計分開計數；Haiku 5.5 長提示檔按請求定價；請求合計寫入一半上下文的長溫熱回合與冷寫入分開；有守衛的快取命中和大段貼上不計分；部分重寫與新內容分開；後續讀取無法掩蓋按請求的未命中；已持有的請求期間或 clear 期間的上下文讀取中丟棄的舊回執；Opus 4 與 4.1 區別於 Opus 4.5；輸出與未快取輸入成本、上下文計數、時長格式化和只讀回本數字。
- **指示器：** 終端文字圖示不含影像元素、桌面 SVG、主題選擇、溫熱/冷轉換、恢復、壓縮、clear、過期、問卷、其他 mod 的內容以及 `NO_COLOR` 回退。
- **Display 選項：** `band` 繪製該行；`status` 把文字（含其 cache-tax 和狀態標籤）移到終端和桌面沒有行的介面上狀態條目中。任何其他值（如舊的 `off`）回退到該行。
- **偏好：** 每會話讀取一次、主題變更立即生效、被拒絕的變更和設定寫入器返回的有效主題。
- **Fork 失敗：** 繁忙的 API 在快取溫熱時重試、醒得太晚的重試被丟棄、無可 fork 時等待下一輪、同一時刻只有一個探測在途、在請求、`/clear` 或壓縮之後到達的回覆被丟棄，而其他失敗和舊版本返回的 null 結果則不重試地停止。

渲染測試檢查元素樹，而非原生終端或桌面畫素。它們不驗證服務端快取保留。參見[即時檢查](#在你自己的會話上驗證)。

### 型別檢查

用 `claude --plugin-dir .` 載入此檢出來在外掛旁生成宣告。然後從倉庫根目錄：

```sh
npx -p typescript tsc -p .
```

生成的宣告位於 `.claude-plugin/types/`。保持它們不被追蹤。

## 從其他 mod 讀取狀態

cache-tax 向 mod API 添加了只讀的 `$.cacheTax.status()`，因此狀態帶可以不解析 `/cache-tax` 就顯示 keepwarm。它在 3.0 前為實驗性：欄位可能在次版本中變更。`cold` 是 `/cache-tax` 顯示的同一小時估算，而非對伺服器快取的檢查。它解析為 `{ keepwarm: 'on' | 'off' | 'stopped', leftMs, always, alwaysMs, autoWarm, guard, guardFloorUsd, cold, stopped, coldWrites, pingSkipped, idlePingUsd }`；型別位於 `types/index.d.ts`。在 cache-tax 未安裝的地方沒有 `$.cacheTax`，因此呼叫方要把呼叫包在 `try`/`catch` 中。

## 更多 Claude Code mod

cache-tax 是 [Awesome Claude Code Mods](https://github.com/karanb192/awesome-claude-code-mods) 中列出的 [Claude Code 提示詞快取 mod](https://mods.aidojo.si/topics/prompt-cache/) 之一。瀏覽完整目錄 [mods.aidojo.si](https://mods.aidojo.si/) 按任務查詢 mod，並在安裝前檢視它能觸及什麼。

## 出處與許可證

- 原作者：[Karan Bansal](https://karanbansal.in/)（karanb192）
- 原倉庫：https://github.com/karanb192/cache-tax
- 許可證：MIT
- 繁體中文翻譯與介面本地化：claude-code-mods-zh-tw 專案
