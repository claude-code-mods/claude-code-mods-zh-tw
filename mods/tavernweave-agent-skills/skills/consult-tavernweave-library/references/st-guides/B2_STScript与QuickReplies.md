# STScript 與 QuickReplies 參考手冊

> 文件版本：v1.0.0 ｜ 最後更新：2026-07-14

SillyTavern 內建指令碼引擎與快速回復系統的完整參考——命令體系、變數系統、QR 機制、WI 整合、正規化程式碼、避坑清單。

---

## 置信度分級體系

**三級置信度**：

- **[high]** 多源交叉驗證，可直接用於生產
- **[medium]** 單源或含推斷成分，可用但建議真機驗證
- **[low]** 孤證無源或純推斷，**禁止直接施工**，須先驗證

**依據型別軸**：`[執行時原始碼]` / `[文件·多源]` / `[文件·單源]` / `[社群]` / `[推斷]`

收集日期：**2026-06-28**
回源基準：**SillyTavern v1.14.0** + 本地成熟卡（卡A 2.5.0 / 卡B 2.6.0）

---

## 目錄

1. 機制總覽
   1.1 STScript 定位與架構
   1.2 Quick Replies 機制
   1.3 WI automationId 聯動原理
2. 核心命令參考
   2.1 變數命令
   2.2 生成命令
   2.3 管道與流控
   2.4 控制流
   2.5 UI 互動
   2.6 訊息操作
   2.7 提示注入
   2.8 世界書命令
   2.9 數學運算
3. QR 命令與欄位參考
   3.1 QR 管理命令
   3.2 QR Set 配置欄位
   3.3 QR 條目欄位
   3.4 自動執行事件型別
4. 宏（Macro）完整參考
5. 世界書聯動欄位參考
6. 完整正規化程式碼庫
7. 高頻避坑
8. 懸案與驗證路徑
9. 來源索引

---

## 1. 機制總覽

### 1.1 STScript 定位與架構

**[high][文件·多源]**
STScript 是 SillyTavern 內建的指令碼語言，基於斜槓命令引擎構建，核心能力包括：命令批處理、資料管道（pipe）、宏替換（macro）、變數系統（三層作用域）、閉包（closure）和控制流。

指令碼的基本單元是以 `|` 分隔的命令序列，命令順序執行並透過管道傳遞資料。指令碼入口：

- Quick Reply 按鈕（手動點選或事件自動觸發）
- WI automationId 聯動（條目啟用時自動觸發）
- 聊天輸入框直接輸入
- `/run` 跨套組呼叫

基本語法格式：

```stscript
/command named_arg=value unnamed_arg | /next_command
```

| 元件 | 說明 |
|---|---|
| `/command` | 以斜槓開頭的命令名 |
| `named_arg=value` | 具名引數，`=` 後接值 |
| `unnamed_arg` | 無名引數，接在具名引數之後 |
| `\|` | 管道符，傳遞前一命令的輸出作為下一命令的隱式無名引數 |
| `\|\|` | 雙管道（阻斷符），阻止上一命令輸出傳遞 |
| `{: ... :}` | 閉包（inline closure），用於控制流命令的程式碼塊 |

來源：STScript 官方語言參考 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 1.2 Quick Replies 機制

**[high][文件·多源]**
Quick Replies（QR）是 ST 內建擴充套件（非第三方），提供按鈕 UI，每個按鈕繫結一段 STScript（或普通文字）。

**套組（Set）的三層作用域**：

| 作用域 | 位置 | 說明 |
|---|---|---|
| 全域性套組 | QR 擴充套件設定頁 | 任何聊天中均可見 |
| 聊天級套組 | 聊天本地繫結 | 僅當前聊天可見 |
| 角色級套組 | 角色卡資料 | 隨角色卡攜帶（需擴充套件支援儲存） |

**QR 核心用途**：

1. 手動觸發指令碼（玩家點選按鈕）
2. 事件驅動自動執行（startup / user / bot / load 等觸發器）
3. 透過 `automationId` 與世界書聯動

來源：DeepWiki QR System + ST Docs | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 1.3 WI automationId 聯動原理

**[high][文件·多源]**

聯動觸發鏈：

```
WI 條目 keyword 命中（或 constant=true）
  → 條目啟用
  → 查詢 automationId 欄位值
  → 匹配同值的 QR 按鈕
  → 在 AI 訊息生成之前執行 QR 指令碼
```

關鍵約束：

- 每個 `automationId` 值**每次只觸發一次的說法需修正**：v1.14.0 `AutoExecuteHandler.js` 中 `handleWIActivation` 將 WI 啟用條目的 automationId 集合去重（`filter(Boolean)` 後用 `includes`），並按 QR 側匹配——若**同一 QR 套組內**多個 QR 按鈕持有相同 automationId，則**全部執行**；但**同一 automationId 從多條 WI 條目傳入**時，由於已收集為陣列 `includes` 查詢，匹配到的 QR 按鈕會全部執行，不額外限制（見懸案 5，需真機驗證）。**[medium·推導未驗證][執行時原始碼]**
- 指令碼在 AI **訊息生成之前**執行（無法在生成後讀取 AI 回覆內容後再處理）**[high][執行時原始碼]**（`WORLD_INFO_ACTIVATED` 事件在 WI 條目啟用時發出，此時尚未進入生成流程）
- automationId 匹配**區分大小寫**（WI 條目與 QR 按鈕的值必須完全一致）**[medium·單源孤證][文件·單源]**

來源：World Info 官方文件 + Issue #3419 + v1.14.0 AutoExecuteHandler.js | 適用版本：v1.14.0+ | **[high（執行時機）/ medium（去重行為）][執行時原始碼+文件]**

---

## 2. 核心命令參考

### 2.1 變數命令

**三層變數作用域**：

| 層級 | 命令字首 | 儲存位置 | 生命週期 |
|---|---|---|---|
| 本地變數（聊天級） | `/setvar` / `/getvar` | `chat_metadata` | 隨聊天持久化 |
| 全域性變數 | `/setglobalvar` / `/getglobalvar` | `extension_settings` | 跨聊天持久化 |
| 作用域變數（閉包級） | `/let` / `/var` | 執行棧 | 閉包銷燬即消失 |

**本地變數命令**：

| 命令 | 語法 | 說明 |
|---|---|---|
| `/setvar` | `/setvar key=name [index=i] value` | 設定本地變數 |
| `/getvar` | `/getvar [index=i] name` | 獲取本地變數，寫入管道 |
| `/addvar` | `/addvar key=name increment` | 數值累加；對陣列則 push |
| `/incvar` | `/incvar name` | 整數 +1 |
| `/decvar` | `/decvar name` | 整數 -1 |
| `/flushvar` | `/flushvar name` | 刪除本地變數 |

**全域性變數命令**（語法與本地變數同構，字首 `global`）：

| 命令 | 說明 |
|---|---|
| `/setglobalvar key=name value` | 設定全域性變數 |
| `/getglobalvar name` | 獲取全域性變數 |
| `/addglobalvar key=name increment` | 全域性累加 |
| `/incglobalvar name` | 全域性 +1 |
| `/decglobalvar name` | 全域性 -1 |
| `/flushglobalvar name` | 刪除全域性變數 |

**作用域變數命令**：

| 命令 | 語法 | 說明 |
|---|---|---|
| `/let` | `/let name [value]` | 宣告作用域變數（閉包銷燬即消失） |
| `/var` | `/var name [value]` | 讀寫作用域變數 |

**`index=` 引數說明**：

- `index=數字` → 訪問/設定陣列的第 N 個元素（0-based）
- `index=字串` → 訪問/設定物件的指定鍵
- 變數不存在時自動建立空 `[]`（數字 index）或 `{}`（字串 index）
- `index=` 僅由 `/setvar`、`/getvar`、`/var` 及其全域性同構命令（`/setglobalvar`、`/getglobalvar`）接受；`/addvar` 不支援 `index=`。

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 2.2 生成命令

| 命令 | 語法 | 說明 |
|---|---|---|
| `/gen` | `/gen [lock=on/off] prompt` | 用當前角色 + 聊天曆史生成，注入完整上下文 |
| `/genraw` | `/genraw [lock=on/off] [stop=[]] [instruct=on/off] [as=system/char] prompt` | 僅用提示詞生成，忽略角色卡和聊天曆史 |
| `/trigger` | `/trigger` | 觸發正常對話生成（相當於使用者按下發送） |
| `/swipe` | `/swipe` | 觸發滑動生成 |
| `/regenerate` | `/regenerate` | 重新生成最後一條 AI 訊息 |
| `/continue` | `/continue` | 繼續上一條訊息（追加內容） |
| `/ask` | `/ask name=charName prompt` | 臨時切換角色生成，不覆蓋當前啟用角色 |

**`/gen` vs `/genraw` 區別**：

| 維度 | `/gen` | `/genraw` |
|---|---|---|
| 角色卡 | 包含 | 忽略 |
| 聊天曆史 | 包含 | 忽略 |
| 典型用途 | 角色扮演內容生成 | 旁白、系統操作、第三方視角生成 |

**`stop=` 引數（僅 `/genraw`）**：接受 JSON 陣列格式，如 `stop=["END","<stop>"]`；`/gen` 不支援 `stop=`。

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 2.3 管道與流控

| 命令 | 語法 | 說明 |
|---|---|---|
| `/pass` | `/pass value` | 將值顯式寫入管道 |
| `\|\|` | `cmd1 \|\| cmd2` | 雙管道阻斷符：阻止 cmd1 的輸出傳給 cmd2 |
| `/break` | `/break` | 跳出當前迴圈或閉包 |
| `/abort` | `/abort [reason]` | 中斷整個指令碼執行 |
| `/return` | `/return [value]` | 從閉包/函式返回值，可帶返回值 |
| `/delay` | `/delay ms` | 等待 N 毫秒 |

**管道（pipe）機制**：每條命令的輸出自動作為下一條命令的隱式無名引數；用 `{{pipe}}` 宏可在引數字串內顯式引用管道值。

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 2.4 控制流

| 命令 | 語法 | 說明 |
|---|---|---|
| `/if` | `/if left=A right=B rule=op [else={: ... :}] {: ... :}` | 條件分支 |
| `/while` | `/while left=A right=B rule=op [guard=on] {: ... :}` | 迴圈（MAX_LOOPS=100 硬限制） |
| `/times` | `/times N {: ... :}` | 重複 N 次 |
| `/foreach`（LALib 擴充套件） | `/foreach (list) (closure)` | LALib 擴充套件命令（非 ST 原生）：遍歷 list/dictionary，閉包內用 `{{var::item}}` / `{{var::index}}` 取當前元素與索引 |
| `/run` | `/run label` 或 `/run PresetName.Label` | 呼叫 QR 過程或執行閉包變數 |
| `/:varName` | `/:myVar` | 執行儲存在 `myVar` 變數裡的閉包 |

**`/if` 的 `rule` 列舉值**：

| rule 值 | 含義 |
|---|---|
| `eq` | 等於 |
| `neq` | 不等於 |
| `lt` | 小於 |
| `gt` | 大於 |
| `lte` | 小於等於 |
| `gte` | 大於等於 |
| `not` | 布林非（right 引數忽略） |
| `in` | 包含子串（不區分大小寫） |
| `nin` | 不包含子串 |

**`left=` / `right=` 值解析順序**：數字字面量 → 本地變數 → 全域性變數 → 字串字面量。

**`/while` 的 `guard=on`**：啟用防卡死守衛，超出 MAX_LOOPS=100 次時強制中斷。

**`/times` 內部宏**：`{{timesIndex}}` 返回當前迭代的 0-based 索引。

來源：STScript 官方文件 + GitHub Docs 貢獻者版 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 2.5 UI 互動

| 命令 | 語法 | 說明 |
|---|---|---|
| `/input` | `/input prompt` | 顯示輸入框，使用者輸入寫入管道 |
| `/echo` | `/echo [title=標題] [severity=info/warning/error] text` | Toast 提示 |
| `/popup` | `/popup text` | 彈窗（支援 HTML） |
| `/buttons` | `/buttons labels=["A","B"] text` | 帶按鈕彈窗，返回使用者點選的標籤文字 |
| `/setinput` | `/setinput text` | 替換聊天輸入框內容 |

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 2.6 訊息操作

| 命令 | 語法 | 說明 |
|---|---|---|
| `/messages` | `/messages [names=on/off] start-finish` | 讀取訊息範圍內容，寫入管道 |
| `/send` | `/send text` | 以當前使用者身份傳送訊息（不觸發生成） |
| `/sendas` | `/sendas name=charName text` | 以指定角色名傳送訊息 |
| `/sys` | `/sys text` | 系統敘述訊息（橙色樣式） |
| `/comment` | `/comment text` | 隱藏評論（AI 看不到，僅在 UI 可見） |
| `/hide` | `/hide start-finish` | 隱藏指定範圍訊息（AI 不讀取） |
| `/unhide` | `/unhide start-finish` | 顯示被隱藏的訊息 |
| `/cut` | `/cut (number\|range)` | 刪除訊息或連續區間（區間含端點，如 `/cut 0-10`） |
| `/del` | `/del (number)?` | 進入訊息刪除模式；帶數字引數時自動刪除最後 N 條訊息（按樓層刪除用 `/cut`） |
| `/delswipe` | `/delswipe index` | 刪除訊息的指定滑動選項 |
| `/addswipe` | `/addswipe text` | 為最後一條訊息新增滑動選項 |

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 2.7 提示注入

| 命令 | 語法 | 說明 |
|---|---|---|
| `/inject` | `/inject id=ID [position=before\|after\|chat\|none] [depth=N] [scan=true\|false] [role=system\|assistant\|user] [ephemeral=true\|false] [filter=closure] text` | 注入提示內容到上下文（詳見下方引數詳解） |
| `/note` | `/note text` | 設定 Author's Note |
| `/listinjects` | `/listinjects` | 列出所有當前注入 |
| `/flushinjects` | `/flushinjects` | 清除所有注入 |

**`/inject` 引數詳解**：

| 引數 | 值 | 說明 |
|---|---|---|
| `id=` | 字串 | 注入 ID；相同 ID 重複呼叫會**覆蓋**而非追加 |
| `position=` | `before`（主提示詞前）/ `after`（主提示詞後，預設）/ `chat`（聊天曆史內）/ `none`（不插入提示詞，但可觸發世界書） | 注入位置 |
| `depth=` | 整數 | 注入深度，預設 `4`；`position=chat` 時有效（`0` = 最後一條訊息後，`N` = 倒數第 N 條訊息處） |
| `scan=` | `true`/`false`（預設 `false`） | 注入內容是否參與世界書掃描 |
| `role=` | `system`（預設）/ `assistant` / `user` | in-chat 注入的訊息角色 |
| `ephemeral=` | `true`/`false`（預設 `false`） | 是否臨時注入 |
| `filter=` | closure | 注入過濾閉包 |

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 2.8 世界書命令

| 命令 | 語法 | 說明 |
|---|---|---|
| `/getchatbook` | `/getchatbook` | 返回當前聊天繫結的世界書名稱 |
| `/findentry` | `/findentry file=book field=fieldName text` | 按欄位值查詢條目，返回 UID |
| `/getentryfield` | `/getentryfield file=book field=field UID` | 獲取條目指定欄位的值 |
| `/setentryfield` | `/setentryfield file=book uid=UID field=field text` | 設定條目欄位值 |
| `/createentry` | `/createentry file=book key=keyword content` | 新建條目 |

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 2.9 數學運算

支援多引數批次運算（`/add 1 2 3 4` 返回 `10`）：

| 命令 | 說明 |
|---|---|
| `/add` | 加法 |
| `/sub` | 減法 |
| `/mul` | 乘法 |
| `/div` | 除法 |
| `/mod` | 取餘 |
| `/pow` | 冪運算 |
| `/sin` / `/cos` | 三角函式 |
| `/log` | 對數 |
| `/abs` | 絕對值 |
| `/sqrt` | 平方根 |
| `/round` | 四捨五入 |
| `/rand` | `/rand [from=N] [to=M] [round=round\|ceil\|floor]` 隨機數（預設 `from=0`、`to=1`，含端點） |
| `/len` | 獲取字串或陣列長度 |

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

## 3. QR 命令與欄位參考

### 3.1 QR 管理命令

**建立與更新**：

```stscript
/qr-create set=SetName label=ButtonLabel
           [hidden=true/false] [startup=true/false]
           [user=true/false] [bot=true/false] [load=true/false]
           [title=tooltip文字] [automationId=ID]
           script_content

/qr-update set=SetName label=OldLabel [newlabel=NewLabel]
           [hidden=...] [startup=...] [user=...] [bot=...] [load=...]
           [title=...] [automationId=...]
           new_script_content

/qr-delete set=SetName label=ButtonLabel
```

**套組（Preset）管理**：

```stscript
/qr-presetadd [enabled=bool] [nosend=bool] [before=bool] [slots=N] [inject=bool] PresetName
/qr-presetupdate [同上引數] PresetName
```

**右鍵上下文選單管理**：

```stscript
/qr-contextadd set=SetName label=ButtonLabel contextSet=ContextSetName
/qr-contextdel set=SetName label=ButtonLabel contextSet=ContextSetName
/qr-contextclear set=SetName label=ButtonLabel
```

**套組啟用/停用**：

```stscript
/qr-set-on SetName
/qr-set-off SetName
```

來源：STScript 官方文件 + DeepWiki QR System | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 3.2 QR Set 配置欄位

| 欄位 | 型別 | 說明 |
|---|---|---|
| `name` | string | 套組唯一名稱 |
| `disableSend` | bool | true → 指令碼輸出插入輸入框而非直接傳送 |
| `placeBeforeInput` | bool | true → 輸出置於當前輸入內容之前 |
| `injectInput` | bool | true → 自動追加當前輸入框內容到 QR 指令碼 |
| `color` | CSS 顏色值 | 該套組按鈕的顏色主題 |

來源：DeepWiki QR System | 適用版本：v1.14.0+ | **[medium·單源孤證][文件·單源]**

---

### 3.3 QR 條目欄位

| 欄位 | 型別 | 說明 |
|---|---|---|
| `label` | string | 按鈕顯示文字 |
| `message` | string | STScript 內容（`/` 開頭）或普通訊息文字 |
| `automationId` | string | 與 WI 條目 `automationId` 欄位匹配後自動觸發（原始碼 QuickReply.js 直讀此欄位） |
| `preventAutoExecute` | bool | 防止事件觸發時無限遞迴執行 |
| `contextList` | array | 右鍵上下文選單中額外顯示的 QR 套組列表 |
| `hidden` | bool | 隱藏按鈕（在 UI 不顯示，仍可被指令碼呼叫） |

來源：DeepWiki QR System + 本地 v1.14.0 原始碼 AutoExecuteHandler.js 行 91–96 | 適用版本：v1.14.0+ | **[medium·單源孤證][文件·單源]**（欄位存在由原始碼直讀確認，但描述細節仍單一文件源）

---

### 3.4 自動執行事件型別

**`/qr-create` 的布林觸發引數與對應事件**：

> **[執行時原始碼]** 依據：v1.14.0 `extensions/quick-reply/src/SlashCommandHandler.js` 行 265–271（namedArgumentList）、`index.js` 行 282–324（事件監聽繫結）、`AutoExecuteHandler.js`（handler 方法名）。

| 引數 | 內部屬性名 | 監聽事件（event_types） | 觸發時機 |
|---|---|---|---|
| `startup=true` | `executeOnStartup` | `APP_READY` | ST 應用啟動完成時 |
| `user=true` | `executeOnUser` | `USER_MESSAGE_RENDERED` | 使用者訊息渲染完成後 |
| `bot=true` | `executeOnAi` | `CHARACTER_MESSAGE_RENDERED` | AI 訊息渲染完成後 |
| `load=true` | `executeOnChatChange` | `CHAT_CHANGED` | **聊天切換**時（不含新建聊天） |
| `new=true` | `executeOnNewChat` | `CHAT_CREATED` | **新建聊天**時（與 `load` 獨立） |
| `group=true` | `executeOnGroupMemberDraft` | `GROUP_MEMBER_DRAFTED` | 群組成員訊息草稿生成時 |
| `generation=true` | `executeBeforeGeneration` | `GENERATION_AFTER_COMMANDS` | 命令處理完成後、生成 API 請求發出前 |

**說明**：

- `load=true` 與 `new=true` 是兩個**獨立引數**，分別對應 `CHAT_CHANGED`（切換已有聊天）和 `CHAT_CREATED`（新建聊天）；舊版草稿將二者合併為一個引數是錯誤的。
- `generation=true` 的內部 handler 名為 `handleBeforeGeneration`，監聽 `GENERATION_AFTER_COMMANDS` 事件——事件名含義是"命令管線執行完成後"，實際效果是"在 LLM API 請求發出之前"。
- `automationId` 聯動（WI 啟用觸發）不是 `/qr-create` 的布林引數，而是 QR 物件的字串欄位（見懸案 3 / 3.3 節）。
- 官方文件列出 6 個自動執行條件（startup/user/bot/load/group/WI），`new` 和 `generation` 為額外引數；來源索引中 DeepWiki 可能未完整覆蓋。

來源：v1.14.0 執行時原始碼（SlashCommandHandler.js / AutoExecuteHandler.js / index.js / events.js）+ ST 官方文件 | 適用版本：v1.14.0+ | **[high][執行時原始碼]**

---

## 4. 宏（Macro）完整參考

宏在命令引數字串內（`{{...}}`）解析，可巢狀使用：

| 宏 | 說明 | 是否有返回值 |
|---|---|---|
| `{{pipe}}` | 當前管道值（顯式引用） | 是 |
| `{{getvar::name}}` | 獲取本地變數值 | 是 |
| `{{setvar::name::value}}` | 設定本地變數（替換為**空字串**） | 否 |
| `{{incvar::name}}` | 本地變數 +1，返回新值 | 是 |
| `{{decvar::name}}` | 本地變數 -1，返回新值 | 是 |
| `{{addvar::name::value}}` | 本地變數累加（替換為空字串） | 否 |
| `{{getglobalvar::name}}` | 獲取全域性變數值 | 是 |
| `{{var::name}}` | 讀取作用域變數（`/let` 宣告的） | 是 |
| `{{var::}}` | 從父閉包讀取管道值 | 是 |
| `{{timesIndex}}` | `/times` 迴圈的當前迭代索引（0-based） | 是 |
| `.varName` | `{{var::varName}}` 的簡寫 | 是 |
| `$varName` | `{{getglobalvar::varName}}` 的簡寫 | 是 |

**注意**：`{{setvar::}}` 和 `{{addvar::}}` 執行後替換為空字串，不可用於讀取。讀取設定後的值須用 `{{getvar::name}}`。

來源：STScript 官方文件 + GitHub Docs 貢獻者版 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

## 5. 世界書聯動欄位參考

與 automationId 整合相關的 WI 條目關鍵欄位：

| 欄位 | 型別 | 說明 |
|---|---|---|
| `automationId` | string | 與 QR 按鈕 automationId 完全匹配後觸發 QR 指令碼 |
| `constant` | bool（Blue Circle 圖示）| true → 無需關鍵詞，始終啟用 |
| `keys` | string[] | 關鍵詞列表，任一命中則啟用條目 |
| `position` | enum | 條目內容插入位置（before_char / after_char 等） |
| `insertion_order` | int | 優先順序，數字越高越靠近提示末尾 |
| `enabled` | bool | 是否啟用該條目 |
| `probability` | int (0–100) | 觸發機率百分比 |
| `comment` | string | 條目描述（不進入上下文，僅供開發者查閱） |

**automationId 觸發限制**：

- 執行時機：AI 訊息生成**之前**（無法在生成後讀取內容）**[high][執行時原始碼]**
- 關於"每次只執行一次"：原始碼 `AutoExecuteHandler.js` 並無 automationId 全域性去重——若 QR 套組中存在多個相同 automationId 的按鈕，均會被觸發；多條 WI 條目攜帶相同 automationId 時，最終匹配的是 QR 側的按鈕數量，而非 WI 條目數。確切去重行為見懸案 5，**[medium·推導未驗證][執行時原始碼]**
- 區分大小寫的匹配策略（WI 條目與 QR 按鈕 automationId 必須完全一致）**[medium·單源孤證][文件·單源]**

來源：World Info 官方文件 + Issue #3419 + v1.14.0 AutoExecuteHandler.js | 適用版本：v1.14.0+ | **[high（執行時機）/ medium（去重細節）][執行時原始碼+文件]**

---

## 6. 完整正規化程式碼庫

### 正規化 1：變數讀寫 + 條件分支

```stscript
/setvar key=hp 100 |
/setvar key=status alive |
/if left={{getvar::hp}} right=0 rule=lte
   else={: /echo HP剩餘{{getvar::hp}}，狀態：活著 :}
   {: /setvar key=status dead | /echo 角色已死亡 :}
```

`left=` 和 `right=` 先嚐試解析為變數名，無匹配則當字面量處理。

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 正規化 2：使用者輸入 → 變數 → 呼叫外部命令

```stscript
/input 你想生成什麼圖片？ |
/setvar key=SDinput |
/echo 正在生成：{{getvar::SDinput}} |
/getvar SDinput |
/imagine
```

管道值（pipe）自動作為下一條命令的未命名引數注入，`/setvar key=name`（無 value）時自動從管道讀取值。

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 正規化 3：/genraw 呼叫 + 結果處理

```stscript
/genraw lock=on stop=["END"]
   Write a short tavern rumor about {{char}}.
   Format: one sentence. END |
/setvar key=rumor |
/comment [旁白] {{getvar::rumor}}
```

`/genraw` 忽略角色上下文；`stop=["END"]` 用 JSON 陣列格式設定停止序列；生成結果寫入管道後可被後續命令接收。

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[medium][文件·單源]**

---

### 正規化 4：閉包作用域變數（/let + /var）

```stscript
/let counter 0 |
/while left={{var::counter}} right=5 rule=lt {:
    /var counter {{var::counter}} |
    /addvar key=counter 1 |
    /echo 第{{var::counter}}次迭代
:}
```

`/let` 宣告的變數只在當前閉包及其子閉包內有效；`{{var::name}}` 是 `/let` 變數專用宏，不能用 `{{getvar::}}` 訪問。

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 正規化 5：命名閉包（函式定義與複用）

```stscript
/let greet {: name=
    /echo 你好，{{var::name}}！
:} |
/:greet name=世界 |
/:greet name=玩家
```

閉包引數宣告格式：`paramName=預設值`；`paramName=`（等號後空值）表示必填無預設值。透過 `/:varName` 呼叫儲存在變數中的閉包。

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 正規化 6：遞迴階乘（高階閉包示例）

```stscript
/let fact {: n=
    /if left={{var::n}} rule=gt right=1
        else={: /return 1 :}
        {: /sub {{var::n}} 1 | /:fact n={{pipe}} | /mul {{var::n}} {{pipe}} :}
:} |
/let n 5 |
/:fact n={{var::n}} |
/echo 5的階乘是{{pipe}}
```

此為官方文件的標準遞迴示例，驗證可用。`/return` 將值寫入管道傳回呼叫者。

來源：STScript 官方文件（官方程式碼示例）| 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 正規化 7：/qr-create 動態建立 QR 並繫結自動執行

```stscript
/qr-create set=MyTools label=InitGame
   bot=true
   /setvar key=turn 1 | /setvar key=score 0 | /echo 遊戲初始化完成
```

`bot=true` 使此 QR 在每次 AI 訊息渲染後自動執行。若同時設定 `automationId=game_init`，則 WI 啟用 `game_init` 時也會觸發。

來源：STScript 官方文件 + DeepWiki QR System | 適用版本：v1.14.0+ | **[medium][文件·多源]**

---

### 正規化 8：世界書 automationId 聯動 QR

**世界書條目配置**（JSON 欄位示意）：

```json
{
  "comment": "場景切換檢測 - 進入市場",
  "key": ["進入市場", "來到市集", "走進集市"],
  "keysecondary": [],
  "content": "進入市場場景檢測條目。",
  "automationId": "enter_market",
  "position": 0,
  "disable": false,
  "probability": 100
}
```

**對應 QR 配置**（在 QR 擴充套件 UI 或透過命令設定）：

- Set: `GameEvents`
- Label: `EnterMarket`
- automationId: `enter_market`（與 WI 條目完全一致）
- Script:

```stscript
/setvar key=location 市場 |
/inject id=market_context position=chat depth=4
   [當前場景：市場。玩家已進入市集區域。]
```

**觸發鏈**：WI 關鍵詞命中 → 條目啟用 → automationId 匹配 → AI 生成前執行 QR 指令碼 → 注入內容進入上下文 → AI 生成時讀取注入內容。

來源：World Info 官方文件 + STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 正規化 9：提示注入（動態上下文管理）

```stscript
/inject id=status_inject position=chat depth=2
   當前狀態：HP={{getvar::hp}} | 位置={{getvar::location}} | 回合={{getvar::turn}} |
/trigger
```

每次呼叫相同 `id=` 的 `/inject` 會**覆蓋**上一次注入（不追加）。`depth=2` 表示插在倒數第 2 條訊息處。此正規化適合在每輪生成前重新整理狀態快照。

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 正規化 10：陣列操作（庫存管理）

```stscript
/setvar key=inventory index=0 劍 |
/setvar key=inventory index=1 盾 |
/setvar key=inventory index=2 藥水x3 |
/len {{getvar::inventory}} |
/echo 揹包共{{pipe}}件物品：{{getvar::inventory}}
```

`index=數字` 運算元組元素；`index=字串` 操作物件鍵；`/len` 返回陣列長度（或字串字元數）。

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

### 正規化 11：LALib 擴充套件的錯誤處理（/try-/catch）

```stscript
/try {:
    /getvar nonexistent |
    /div {{pipe}} 0
:} |
/catch {:
    /echo 發生錯誤：{{pipe}}
:}
```

**需安裝 LALib 擴充套件**（https://github.com/LenAnderson/SillyTavern-LALib）。核心 STScript 無內建錯誤處理機制；`/try` 塊內的任何錯誤都會被 `/catch` 捕獲，錯誤資訊透過管道傳入。

來源：LALib 擴充套件文件 | 適用版本：LALib 當前版本 | **[medium][文件·單源]**

---

### 正規化 12：跨套組過程呼叫（模組化複用）

```stscript
// 在 QR 套組 "Utils" 中定義過程 "RollDice"
// label: RollDice
// script: /rand from=1 to=100

// 在任意其他指令碼中呼叫：
/run Utils.RollDice |
/echo 擲骰結果：{{pipe}}
```

`/run PresetName.LabelName` 實現跨套組呼叫。過程本身不直接接受命名引數傳遞，需透過變數間接共享狀態（見避坑 6）。

來源：STScript 官方文件 | 適用版本：v1.14.0+ | **[high][文件·多源]**

---

## 7. 高頻避坑

### 坑 1：子閉包不自動繼承父管道值

**[high][文件·多源]**

```stscript
// 錯誤：子閉包的第一個命令不自動接收父管道值
/echo foo | /times 2 {: /echo :}    // 子閉包裡 /echo 收不到 "foo"

// 正確：顯式引用
/echo foo | /times 2 {: /echo {{pipe}} :}
```

根因：管道值進入閉包後，閉包內部有自己獨立的管道上下文，不自動繼承外部管道值。`{{pipe}}` 宏是唯一可靠的引用方式。

---

### 坑 2：變數遮蔽（shadowing）導致祖先變數不可訪問

**[high][文件·多源]**

```stscript
/let x 外層 |
/times 1 {:
    /let x 內層 |
    /echo {{var::x}}    // "內層"，外層 x 已被遮蔽
    // 此處無法訪問外層 x
:}
```

子閉包內的 `/let x` 聲明後，父作用域的同名變數在該子閉包及其所有後代中**完全不可訪問**。命名時應避免跨層級重名。

---

### 坑 3：`||` 雙管道被誤用為邏輯"或"

**[high][文件·多源]**

`||` 在 STScript 中是**管道阻斷符**，不是邏輯 OR 運算子。其作用是阻止上一條命令的輸出傳給下一條命令：

```stscript
/echo 不傳遞這個 || /world
// /world 不會接收 "不傳遞這個" 作為引數
```

來自其他程式語言的 OR 語義直覺在此完全錯誤。

---

### 坑 4：/while 迴圈有 MAX_LOOPS=100 硬限制

**[high][文件·多源]**

超過 100 次迭代時迴圈被強制中斷，且**無任何錯誤提示或警告**，指令碼靜默繼續執行後續命令。對於需要超過 100 次迭代的場景，須改用分批執行或遞迴閉包方案。

---

### 坑 5：automationId 只在生成前觸發

**[high][文件·多源]**

WI automationId 觸發的 QR 指令碼**始終在 AI 訊息生成之前**執行，無例外。若需要讀取 AI 生成內容後再處理（如提取關鍵詞、根據 AI 回覆更新狀態），當前無原生支援。

已知變通方案：在下一次使用者訊息時，利用 `user=true` 觸發器的 QR 讀取上一條 AI 訊息內容（透過 `/messages` 命令），但這意味著狀態更新延遲一輪。

---

### 坑 6：/run 呼叫 QR 過程時命名引數無法在指令碼內透過 /let 變數讀取

**[medium·推導未驗證][執行時原始碼]**

> **原草稿結論"不接受 arg=value"有誤，需細化。**

v1.14.0 `slash-commands.js` `runCallback`（行 3446–3495）實際行為：

- **呼叫閉包變數**（`/:myVar name=value`）：**支援命名引數**——run callback 會遍歷閉包的 argumentList，將 args 中同名引數注入 providedArgumentList（行 3469–3476）
- **呼叫 QR 過程**（`/run PresetName.Label`）：整個 args 物件傳入 `executeQuickReplyByName`，但 QR 指令碼在**無閉包 scope 的上下文**中執行，無法透過 `{{var::name}}` 讀取——實際效果仍需變數中轉

```stscript
// ✅ 呼叫閉包變數時可直接傳參（引數需在閉包內宣告）
/let greet {: name= /echo 你好，{{var::name}}！ :} | /:greet name=世界

// ⚠️ 呼叫 QR 過程：args 傳入但內部能否讀取取決於實現，建議變數中轉
/setvar key=proc_input 123 | /run MyProc
// 在 MyProc 內透過 /getvar proc_input 讀取（保險做法）
```

仍需真機驗證：`/run PresetName.Label arg=value` 時 QR 指令碼內 `{{var::arg}}` 是否可讀。見懸案 1。

---

### 坑 7：宏 `{{setvar::}}` 和 `{{addvar::}}` 不返回值

**[high][文件·多源]**

這兩個宏執行後替換為**空字串**，不返回值，不能用於讀取。如需寫入後立即讀取，須單獨呼叫 `{{getvar::name}}`：

```stscript
// 錯誤：期望返回設定後的值
/echo {{setvar::score::100}}   // 輸出空字串

// 正確：先設定，再讀取
{{setvar::score::100}}/echo {{getvar::score}}
// 或：
/setvar key=score 100 | /echo {{getvar::score}}
```

只有 `{{getvar::}}` `{{incvar::}}` `{{decvar::}}` 三個變數宏有明確返回值。

---

### 坑 8：/gen 和 /genraw 預設靜默生成，不自動顯示在聊天介面

**[high][執行時原始碼+文件·多源]**

> **原草稿結論完全相反，已翻轉並修正。**

`/gen` 和 `/genraw` **預設為靜默（background/quiet）模式**，生成結果只寫入管道，**不會以訊息形式顯示在聊天 UI，也不進入對話歷史**。

依據：
- v1.14.0 `slash-commands.js`：`generateCallback` 中 `quietToLoud = (as === 'char')`，預設 `as='system'` → `quietToLoud=false`（靜默）。
- 官方文件示例明確用 `/sendas name={{char}} {{pipe}}` 才把生成結果插入聊天。

若要將生成結果傳送到聊天（讓 AI 能在後續讀取到），需**顯式追加** `/sendas` 或 `/send` 命令：

```stscript
/genraw 生成一段內心獨白 | /sendas name={{char}} {{pipe}}
```

僅當 `/gen as=char`（或 `/genraw as=char`）時，結果才以角色訊息形式追加到聊天曆史。

---

### 坑 9：世界書條目內容中無法有效使用 outlet 宏巢狀

**[medium·單源孤證][文件·單源]**

官方文件明確說明：在 WI 條目內容欄位中放置 `{{outlet::...}}` 宏無效，會導致評估順序衝突甚至無限迴圈。WI 與 STScript 的正確整合路徑是 **automationId + QR**，而非在 WI 內容中巢狀指令碼宏。

> 注：`{{outlet::name}}` 宏本身在 v1.14.0 `macros.js` 中有完整實現（用於將 WI outlet 條目內容注入到提示中），但"在 WI 條目正文內使用此宏"這一限制來自官方文件單一來源，未經真機複驗，故降為 medium·單源孤證。

---

### 坑 10：/let 作用域變數的 /run 繼承性因呼叫方式不同而有差異

**[medium·推導未驗證][執行時原始碼]**

透過 v1.14.0 原始碼（見懸案 1 已解結論）：

- **`/:閉包變數`**（`/:myVar`）：`runCallback` 第 3463 行 `closure.scope.parent = scope`，**可繼承**父 scope 的 `/let` 變數
- **`/run PresetName.Label`（QR 過程）**：走 `executeQuickReplyByName` 路徑，**不設定 scope.parent**，無法訪問呼叫方 `/let` 變數

原草稿"訪問性不確定"已有原始碼答案，但 QR 過程側具體行為仍需真機複驗（見懸案 1 末尾）。

---

## 8. 懸案與驗證路徑

### 懸案 1（部分解）：`/run` 閉包變數時繼承父 scope；呼叫 QR 過程時不繼承

**[medium·推導未驗證][執行時原始碼]**

> **透過原始碼部分解決；閉包變數已明確，QR 過程仍待驗證。**

v1.14.0 `slash-commands.js` `runCallback` 行 3463：`closure.scope.parent = scope`——當呼叫**儲存在變數中的閉包**（`/:varName`）時，閉包 scope 的 parent 被設為呼叫方當前 scope，因此**可以訪問父 scope 的 `/let` 變數**（透過作用域鏈向上查詢）。

當呼叫 **QR 過程**（`/run PresetName.Label`，行 3492）時，進入 `executeQuickReplyByName`，不經過上述 scope.parent 設定，因此**不繼承呼叫方的 `/let` 變數**。

```stscript
// ✅ /:閉包變數 繼承父 scope
/let x 父作用域值 |
/let fn {: /echo {{var::x}} :} |
/:fn    // 輸出 "父作用域值"（由原始碼 scope.parent 保證）

// ❌ /run QR.Label 不繼承父 scope /let 變數
/let x 父作用域值 | /run TestProc.CheckScope   // {{var::x}} 無法訪問
```

仍待真機驗證：QR 指令碼側能否透過 `{{var::}}` 讀取 args 傳入值。

---

### 懸案 2（部分解）：automationId 執行時機——在 WI prompt 組裝期間同步執行

**[medium·推導未驗證][執行時原始碼]**

> **透過原始碼部分解答，精確邊界已縮窄，仍需真機驗證 /inject 是否出現在請求中。**

v1.14.0 `world-info.js` 行 853–864：`getWorldInfoPrompt` 在 WI 條目內容計算完成後（`checkWorldInfo` 返回後），同步發出 `WORLD_INFO_ACTIVATED` 事件，然後 QR 的 `handleWIActivation` 被 `await` 觸發。

時序鏈：
```
LLM Generate() 呼叫
  → getWorldInfoPrompt()
    → checkWorldInfo()（計算啟用條目）
    → emit(WORLD_INFO_ACTIVATED) → await handleWIActivation() → QR 指令碼同步執行
  → 將 worldInfoString 注入 prompt 構造
  → 發出 API 請求
```

因此精確答案是：B（LLM API 請求構造期內，WI 內容已確定但 prompt 尚未最終發出）——**WI automationId 觸發的 QR 中 `/inject` 的內容理論上會進入當次 API 請求**，但需真機驗證。

**真機驗證路徑**：在 automationId 觸發的 QR 指令碼中執行 `/inject id=test_inject position=chat depth=0 測試注入內容`，然後檢視發出的 API 請求中是否包含該注入內容。

---

### 懸案 3（已解）：`/qr-create` 命令列支援 `automationId=` 引數，但未在官方引數列表中註冊

**[high][執行時原始碼]**

> **本懸案已透過原始碼回源解決，狀態：已閉合。**

v1.14.0 `SlashCommandHandler.js` 第 880 行：`automationId: args.automationId ?? ''`，回撥函式直接讀取 `args.automationId` 並寫入 QR 物件。

然而該引數**未在 `namedArgumentList`（第 237–273 行）中註冊**，因此：
- `/help qr-create` 不會列出 `automationId`
- 自動補全不提示此引數
- 但實際傳入 `automationId=xxx` 時**確實生效**（args 物件包含所有命名引數，未註冊的同樣可讀取）

結論：**可用，但屬於隱式/非文件化引數**。建議優先透過 QR UI 設定 automationId，指令碼方式使用時需自行測試當前版本是否仍有效。

---

### 懸案 4：`/genraw` 的 `as=char` 引數效果

**[low][文件·單源]**

文件提及 `as=system`（預設）或 `as=char` 兩個值，但未說明具體格式差異（角色名如何插入？使用哪種提示模板？）。

**真機驗證路徑**：分別用 `as=system` 和 `as=char` 生成，捕獲發出的原始 API 請求（透過 ST 的除錯模式或網路抓包），對比訊息結構差異。

---

### 懸案 5（部分解）：同一 automationId 多條 WI 條目同時啟用的行為

**[medium·推導未驗證][執行時原始碼]**

> **部分透過原始碼回源，機制已明確，仍需真機驗證執行次數。**

v1.14.0 `AutoExecuteHandler.js` `handleWIActivation` 邏輯（第 91–106 行）：

1. 將所有啟用 WI 條目的 `automationId` 欄位提取為陣列 `automationIds`（`map + filter(Boolean)`，**不做 Set 去重**）
2. 遍歷 QR 套組，找到 `qr.automationId && automationIds.includes(qr.automationId)` 的按鈕，**全部進入執行佇列**

因此：
- **多條 WI 條目攜帶相同 automationId**：`automationIds` 陣列中出現重複值，但 `includes` 只做成員檢查，最終執行的是 QR 側**所有匹配該 automationId 的按鈕**（通常只有一個），WI 條目數量不影響執行次數
- **同一 QR 套組中多個按鈕持有相同 automationId**：這些按鈕會**全部依次執行**（無去重）
- **A/B/C 問題**（文件中"只執行一次"的說法）：原始碼層面無此保證，"每個 automationId 只執行一次"是 WI 條目側的表述，不是 QR 側的保證

仍待真機驗證：多條 WI 同時啟用時 QR 執行次數。

---

### 懸案 6：`/foreach` 是否支援變數引用

**[medium][推斷]**

`/foreach` 由 LALib 擴充套件提供，採用 `(list) (closure)` 位置引數語法（https://github.com/LenAnderson/SillyTavern-LALib）；文件示例用 JSON 陣列字面量（`/foreach ["a","b","c"] {: ... :}`），但未說明第一個位置引數是否支援變數引用（`/foreach {{getvar::myArray}} {: ... :}`）。

**真機驗證路徑**：

```stscript
/setvar key=items ["劍","盾","藥水"] |
/foreach {{getvar::items}} {:
    /echo 物品：{{var::item}}
:}
// 若每個元素分別輸出 → 支援變數引用；若報錯或無輸出 → 只支援字面量
```

---

## 9. 來源索引

| 來源 | URL / 路徑 | 可信度 |
|---|---|---|
| STScript 官方語言參考（主可靠來源）| https://docs.sillytavern.app/usage/st-script/ | 文件·多源驗證 |
| ST Docs GitHub 貢獻者版（完整命令參考）| https://github.com/SillyTavern/SillyTavern-Docs/blob/main/For_Contributors/st-script.md | 文件·多源 |
| DeepWiki - Quick Reply System | https://deepwiki.com/SillyTavern/SillyTavern/7.2-quick-reply-system | 文件·單源 |
| DeepWiki - Slash Command System | https://deepwiki.com/SillyTavern/SillyTavern/7.1-slash-command-system | 文件·單源 |
| DeepWiki - Variables/Macros/Scripting | https://deepwiki.com/SillyTavern/SillyTavern/7.3-variables-macros-and-scripting | 文件·單源 |
| World Info 官方文件 | https://docs.sillytavern.app/usage/core-concepts/worldinfo/ | 文件·多源 |
| LALib 擴充套件 | https://github.com/LenAnderson/SillyTavern-LALib | 文件·單源 |
| Issue #3419 - automationId 觸發時機討論 | https://github.com/SillyTavern/SillyTavern/issues/3419 | 社群 |
| **本地 v1.14.0 執行時原始碼（本次校準新增）** | `public/scripts/extensions/quick-reply/src/AutoExecuteHandler.js` | **執行時原始碼** |
| **本地 v1.14.0 執行時原始碼** | `public/scripts/extensions/quick-reply/src/SlashCommandHandler.js` | **執行時原始碼** |
| **本地 v1.14.0 執行時原始碼** | `public/scripts/variables.js` | **執行時原始碼** |
| **本地 v1.14.0 執行時原始碼** | `public/scripts/slash-commands.js` | **執行時原始碼** |
| **本地 v1.14.0 執行時原始碼** | `public/scripts/world-info.js` | **執行時原始碼** |
| **本地 v1.14.0 執行時原始碼** | `public/scripts/events.js` | **執行時原始碼** |
| 本地生產卡：卡B v2.1.5 | `卡B/v2.1.5_20260530_194328/` | 執行時參照 |

**本地卡參照說明**：卡B v2.1.5 的世界書 28 條目均設定 `automationId: none`，該卡採用 mvu_context EJS 模板替代 STScript 狀態管理方案，**未使用 QR/automationId**。因此本手冊中的正規化程式碼均來自文件源，非本地卡實測結論。

**校準日期**：2026-06-28 | 校準者：Claude Sonnet 4.6 | 回源版本：v1.14.0 本地原始碼直讀
