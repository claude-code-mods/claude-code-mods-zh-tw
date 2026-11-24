# 前端基礎 — TavernHelper 與 iframe

> 文件版本：v1.0.0 ｜ 最後更新：2026-07-14

> 原《前端TavernHelper與iframeAPI.md》與《iframe通訊與跨樓層同步.md》**重度合併去重版**（2026-06-28）。
>
> 回源環境：SillyTavern v1.14.0 + JS-Slash-Runner（TavernHelper）；生產卡來源：卡A 2.5.0 / 2.9.9 + 卡B 2.6.0。
>
> 應用場景（狀態列 HUD、控制中心面板、彈窗）見姐妹文件：**《C2_前端應用-狀態列與控制中心.md》**
>
> 2026-07-14 增補導航：MVU 之外的 **SP·資料庫表格變數方案**見 **《C4_資料庫表格模板.md》**；在正常多樓層角色卡中製作資料庫狀態列、控制中心和資料面板見 **《C7_資料庫二創前端.md》**；在首樓 / 0 號訊息內閉合輸入、生成、劇情閱讀、狀態、路由與回看等完整體驗見 **《C5_同層前端.md》**；資料庫相容同層的額外樓層橋只登記於 **《C8_資料庫相容同層前端-待驗證.md》**，當前禁止作為成熟方案引用；把單張角色卡直接產品化為 Web / App / PC 程式見 **《C6_獨立前端.md》**。C5 建立在本冊的訊息樓層 iframe 能力之上；C6 不以 TavernHelper 或 ST 宿主為執行前提，也不是供使用者繼續匯入角色卡的通用客戶端。

---

## 目錄

1. 置信度分級體系（全手冊適用）
2. 機制總覽：TavernHelper 與 iframe 沙盒
   - 2.1 兩種 iframe 形態
   - 2.2 跨樓層通訊的三條路徑
3. iframe 內可用全域性變數
4. 事件系統 API
   - 4.1 函式簽名總表
   - 4.2 IframeEventType 列舉（6 個）
   - 4.3 TavernEventType 關鍵列舉（80+ 個）
   - 4.4 自動解除安裝機制
5. 變數操作 API
   - 5.1 VariableOption 型別（含作用域說明）
   - 5.2 函式簽名總表
   - 5.3 Prompt 宏訪問變數
6. 聊天訊息 API
   - 6.1 getChatMessages
   - 6.2 setChatMessages
   - 6.3 其他訊息操作函式
7. 提示詞注入 API（injectPrompts）
8. 工具函式 API
9. 介面共享 API（跨 iframe）
10. iframe 與 window.parent 訪問模式
11. MVU 框架 API（Mvu 全域性物件）
12. window.SillyTavern 核心介面
13. 完整可用正規化程式碼
    - 13.1 正規化 A：生成時注入提示詞 + disposer 生命週期管理
    - 13.2 正規化 B：Script 變數讀寫
    - 13.3 正規化 C：全域性介面暴露與等待（降級相容模式）
    - 13.4 正規化 D：訪問宿主頁面 DOM
    - 13.5 正規化 E：chat 變數作為跨樓層狀態匯流排
    - 13.6 正規化 F：自定義跨樓層事件廣播
    - 13.7 正規化 G：iframe 渲染生命週期監聽
    - 13.8 正規化 H：自我過載前銷燬舊例項
14. 高頻避坑
15. 版本演進關鍵節點
16. 懸而未決：需真機驗證的問題

---

## 1. 置信度分級體系（全手冊適用）

> **收集日期統一宣告**：本手冊全部條目收集於 **2026-06-28**。

每條結論採用**置信度等級 + 依據型別**雙軸標註。

### 1.1 置信度三級

| 級別 | 含義 | 施工許可 |
|---|---|---|
| **high** | 已坐實，可直接施工 | 有執行時證據（真機實測 / 讀到執行時實現原始碼 / 生產卡驗證）；結論是原始碼/文件的直接事實而非下游推導；不在懸案清單 |
| **medium** | 待驗證，施工前須實測 | 強制二選一子標籤：`medium·單源孤證`（單一來源、無第二源、無實測）/ `medium·推導未驗證`（原始碼或邏輯推導成立但未跑通，須隨附真機驗證路徑） |
| **low** | 孤證無源，禁止據此施工 | 零來源猜測 / 純歷史快照 |

### 1.2 依據型別標籤（與置信度正交，強制標註）

`[執行時原始碼]`、`[真機]`、`[文件·多源]`、`[文件·單源]`、`[型別宣告]`、`[CHANGELOG·單源]`、`[推斷]`

### 1.3 兩條鐵規

1. **「從原始碼事實再推一步」的下游推導**，即使原始碼本身已直讀，該推導結論最高只能 `medium·推導未驗證`——除非已真機驗證。
2. **節級標註 = 節內條目下確界**——禁止整節標 high 卻內含懸案條目；衝突即區域性降級並交叉引用懸案章。

---

## 2. 機制總覽：TavernHelper 與 iframe 沙盒

### 2.1 兩種 iframe 形態

**核心結論**

JS-Slash-Runner（品牌名 TavernHelper / 酒館助手）是 SillyTavern 的擴充套件外掛。ST 本體不直接執行任意 JS；該擴充套件把角色卡內的 `<script>` 程式碼塊包裹進 `<iframe>` 沙盒執行，同時透過 postMessage shim 層把 TavernHelper API 注入為 iframe 內的全域性函式。

所有 API 函式以**全域性自由函式**形式注入（如 `declare function getVariables(...)`），無需 `import` 或 `TavernHelper.xxx()` 字首直接呼叫。

| 維度 | 樓層訊息 iframe（前端介面） | 指令碼 iframe |
|---|---|---|
| 生命週期 | 隨樓層渲染建立、隨樓層銷燬/重繪銷燬（確切時機見懸案 U7） | 隨角色卡或全域性指令碼執行，跨樓層存活 |
| iframe 名格式 | `TH-message-N` / `TH-message--{樓層號}--{index}` | `TH-script-X` / `TH-script--{name}--{id}` |
| 特有函式 | `getCurrentMessageId()` → 所在樓層號 | `getScriptId()` → 指令碼庫 ID |
| 變數作用域 | `type:'message'`（樓層變數）或訪問 chat/global | `type:'script'`（指令碼繫結變數） |
| parent 訪問 | `window.parent` = ST 主視窗 | 同左 |
| 事件監聽自動解除安裝 | 是，iframe 關閉時自動解除安裝（見懸案 U7 確切時機） | 是，指令碼關閉時自動解除安裝 |

所有 iframe 的 `window.parent` 指向 SillyTavern 主視窗。不同樓層 iframe 之間無法直接訪問彼此的 `window`，必須透過 parent 做中繼，或透過 TavernHelper 提供的事件匯流排和介面分享機制通訊。

來源：JS-Slash-Runner 官方文件 + `@types/iframe/event.d.ts` + `control_center.js`（window.parent 使用、iframe name 解析模式）｜置信度：high `[文件·多源]` + `[執行時原始碼]`

### 2.2 跨樓層通訊的三條路徑

**核心結論**

| 路徑 | 適用場景 | 實現方式 |
|---|---|---|
| **路徑 A：變數讀寫** | 樓層間共享狀態資料（持久化） | `getVariables` + `replaceVariables`/`insertOrAssignVariables` 操作 chat/global 變數 |
| **路徑 B：事件匯流排** | 跨樓層觸發行為（通知、廣播） | `eventEmit` / `eventOn` 自定義字串事件 |
| **路徑 C：介面分享** | 指令碼暴露 API 給其他 iframe 呼叫 | `initializeGlobal` + `waitGlobalInitialized` |

三條路徑可以組合使用。典型模式：路徑 A 寫狀態 + 路徑 B 通知重新整理（見正規化 13.5）。

來源：官方文件 + `control_center.js` + `media_library.js` 生產驗證 ｜ 置信度：high `[執行時原始碼]`

---

## 3. iframe 內可用全域性變數

**核心結論**

以下全域性變數在任意 TavernHelper iframe 內均已預注入，無需 import。

| 全域性變數 | 型別 / 來源 | 說明 |
|---|---|---|
| `window.SillyTavern` | ST 本體物件 | 永遠指向最新 ST 上下文（TH 重新整理保證）；詳見第 12 章 |
| `window.TavernHelper` | TH 擴充套件物件 | F12 控制檯 `Object.keys(window.TavernHelper)` 可檢視完整介面列表 |
| `window.tavern_events` | 事件常量物件 | 約 80+ 個 Tavern 事件名稱常量（見第 4.3 節） |
| `window.iframe_events` | 事件常量物件 | 6 個 iframe 生命週期事件常量（見第 4.2 節） |
| `_` | lodash | 陣列/物件工具庫 |
| `z` | zod（含擴充套件） | 資料校驗庫，含 `.prefault()` 等擴充套件方法；經 `mvu_zod_cn.js` L1-13 直調無 import 確認 |
| `$` | jQuery + jQuery UI | DOM 操作 |
| `YAML` | js-yaml | YAML 解析/序列化 |
| `toastr` | toastr.js | 浮動通知（`toastr.success/error/warning/info`）；實際顯示在 ST 主介面（宿主頁面庫），medium·推導未驗證 |
| `Vue` / `VueRouter` | Vue 3 | UI 框架 ｜ medium·單源孤證（僅官方文件，未生產驗證） |
| `PIXI` | PixiJS | 2D 遊戲 / Live2D 渲染 ｜ medium·單源孤證（僅官方文件，未生產驗證） |
| `builtin` | TH 內建工具物件 | `builtin.renderMarkdown()`、`builtin.copyText()`、`builtin.uuidv4()`、`builtin.duringGenerating()` ｜ medium·單源孤證 |

來源：官方文件多源 + `mvu_zod_cn.js` L1-13（生產驗證 z 物件直調）｜適用版本：v1.14.0 ｜ 置信度（主體）：high `[文件·多源]` + `[執行時原始碼]`；（PIXI / builtin / Vue）：medium·單源孤證 `[文件·單源]`

---

## 4. 事件系統 API

### 4.1 函式簽名總表

**核心結論**

```typescript
// 持續監聽（返回 EventOnReturn，可呼叫 stop() 取消）
function eventOn<T extends EventType>(event_type: T, listener: ListenerType[T]): EventOnReturn
function eventMakeFirst<T>(event_type: T, listener: ListenerType[T]): EventOnReturn  // 插隊到最前
function eventMakeLast<T>(event_type: T, listener: ListenerType[T]): EventOnReturn   // 排到最後
function eventOnce<T>(event_type: T, listener: ListenerType[T]): EventOnReturn       // 僅觸發一次

// 傳送事件
function eventEmit<T>(event_type: T, ...data): Promise<void>       // 非同步廣播
function eventEmitAndWait<T>(event_type: T, ...data): void         // 同步函式內用，v3.2.5+

// 清理
function eventRemoveListener<T>(event_type: T, listener): void
function eventClearEvent(event_type): void    // 清除某事件所有監聽
function eventClearListener(listener: Function): void   // 從所有事件移除某 listener
function eventClearAll(): void

type EventOnReturn = { stop(): void }
type EventType = IframeEventType | TavernEventType | string  // string = 自定義事件
```

**來源說明**：`eventOn` / `eventMakeFirst` / `eventMakeLast` 均由 **JS-Slash-Runner** 擴充套件注入（非 TavernHelper）。`eventMakeFirst` 呼叫 `eventSource.makeFirst()`，把監聽器插入佇列頭部；`eventOn` 呼叫 `eventSource.on()`，尾部追加。`eventEmitAndWait` 由 CHANGELOG v3.2.5 確認（"便於在非非同步函式中監聽事件"）。

來源：`@types/iframe/event.d.ts`（型別宣告，GitHub 直讀確認）+ JS-Slash-Runner `src/function/event.ts`（執行時原始碼）+ `control_center.js` L333-346（生產驗證 stop() 呼叫模式）｜置信度：high `[型別宣告]` + `[執行時原始碼]`；（eventEmitAndWait 語義）：high·單源 `[CHANGELOG·單源]`

### 4.2 IframeEventType 列舉（6 個）

**核心結論**

```typescript
enum IframeEventType {
  MESSAGE_IFRAME_RENDER_STARTED           = 'message_iframe_render_started',
  MESSAGE_IFRAME_RENDER_ENDED             = 'message_iframe_render_ended',
  GENERATION_STARTED                      = 'js_generation_started',
  STREAM_TOKEN_RECEIVED_FULLY             = 'js_stream_token_received_fully',
  STREAM_TOKEN_RECEIVED_INCREMENTALLY     = 'js_stream_token_received_incrementally',
  GENERATION_ENDED                        = 'js_generation_ended',
}
```

**ListenerType 回撥引數**：

```typescript
[iframe_events.MESSAGE_IFRAME_RENDER_STARTED]: (iframe_name: string) => void;
[iframe_events.MESSAGE_IFRAME_RENDER_ENDED]:   (iframe_name: string) => void;
[iframe_events.GENERATION_STARTED]:            (generation_id: string) => void;
[iframe_events.GENERATION_ENDED]:              (text: string, generation_id: string) => void;
[iframe_events.STREAM_TOKEN_RECEIVED_FULLY]:   (full_text: string, generation_id: string) => void;
[iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY]: (incremental_text: string, generation_id: string) => void;
```

來源：`@types/iframe/event.d.ts`（GitHub 直讀，6 個列舉字串值全部確認）｜置信度：high `[型別宣告]`；（觸發範圍見懸案 U8）

### 4.3 TavernEventType 關鍵列舉（80+ 個）

**核心結論（關鍵欄位）**

| 列舉欄位 | 字串值 | 回撥引數 | 典型用途 |
|---|---|---|---|
| `APP_READY` | `'app_ready'` | — | ST 完成初始化 |
| `MESSAGE_RECEIVED` | `'message_received'` | `(message_id, type)` | AI 訊息到達 |
| `MESSAGE_SENT` | `'message_sent'` | `(message_id)` | 使用者訊息傳送 |
| `MESSAGE_UPDATED` | `'message_updated'` | `(message_id)` | 訊息被修改 |
| `MESSAGE_EDITED` | `'message_edited'` | — | 訊息被編輯 |
| `MESSAGE_DELETED` | `'message_deleted'` | — | 訊息被刪除 |
| `MESSAGE_SWIPED` | `'message_swiped'` | — | 訊息 swipe |
| `USER_MESSAGE_RENDERED` | `'user_message_rendered'` | — | 使用者訊息渲染完成 |
| `CHARACTER_MESSAGE_RENDERED` | `'character_message_rendered'` | — | 角色訊息渲染完成 |
| `CHAT_CHANGED` | `'chat_id_changed'` | `(chat_file_name)` | 切換對話 |
| `GENERATION_STARTED` | `'generation_started'` | `(type, option, dry_run)` | 生成開始 |
| `GENERATION_ENDED` | `'generation_ended'` | — | 生成完成 |
| `GENERATION_STOPPED` | `'generation_stopped'` | — | 生成被停止 |
| `GENERATION_AFTER_COMMANDS` | `'GENERATION_AFTER_COMMANDS'`（全大寫） | — | 斜槓命令處理完、即將生成（注入時機 1） |
| `GENERATE_BEFORE_COMBINE_PROMPTS` | `'generate_before_combine_prompts'` | — | prompts 合併前（注入時機 2） |
| `GENERATE_AFTER_COMBINE_PROMPTS` | `'generate_after_combine_prompts'` | — | prompts 合併後 |
| `CHAT_COMPLETION_PROMPT_READY` | `'chat_completion_prompt_ready'` | — | ChatCompletion prompt 就緒（注入時機 3） |
| `WORLD_INFO_ACTIVATED` | `'world_info_activated'` | — | 世界書條目啟用 |
| `WORLDINFO_ENTRIES_LOADED` | `'worldinfo_entries_loaded'` | — | 世界書掃描完、啟用前（可修改條目，見懸案 U4） |
| `WORLDINFO_UPDATED` | `'worldinfo_updated'` | — | 世界書更新 |
| `CHARACTER_EDITED` | `'character_edited'` | — | 角色卡被編輯 |
| `SETTINGS_LOADED` | `'settings_loaded'` | — | ST 設定載入完成 |

**注意**：`WORLDINFO_SCAN_DONE` **不在 ST v1.14.0 核心**，由 JS-Slash-Runner 擴充套件額外注入到 `tavern_events`。`APP_INITIALIZED` 亦**不存在於 ST v1.14.0 核心**。

**注入提示詞最佳時機順序（high）**：`GENERATION_AFTER_COMMANDS` → `GENERATE_BEFORE_COMBINE_PROMPTS` → `CHAT_COMPLETION_PROMPT_READY`，優先用 `eventMakeFirst` 確保在其他監聽器前執行。

**避坑**：優先用 `window.tavern_events.XXX` 列舉欄位而非硬編碼字串——ST 版本升級可能修改字串值（`'GENERATION_AFTER_COMMANDS'` 是全大寫例外）。

來源：`@types/iframe/event.d.ts`（型別宣告）+ ST 本體 `public/scripts/events.js` L1-95（執行時原始碼交叉驗證列舉欄位字串值）+ `control_center.js` L333-341（生產驗證用法）｜置信度（列舉欄位+字串值）：high `[執行時原始碼]`；（回撥引數格式）：medium·單源孤證 `[型別宣告]`

### 4.4 自動解除安裝機制

**核心結論**

`eventOn` 系列註冊的監聽器在 **iframe 或指令碼關閉時自動解除安裝**。如需提前取消，使用返回值的 `stop()` 方法。

**生產模式（來自 `control_center.js` L333-346，最高可信）**：統一將所有 `eventOn` 返回值壓入 `disposers` 陣列，元件銷燬時批次呼叫。相容舊版（返回 void）的寫法：`disposers.pop()?.()` 用可選鏈防止 void 報錯。

⚠️ **降級說明**："自動解除安裝"論斷僅官方文件，未真機實測。持久執行的指令碼 iframe 不手動 stop 會累積洩漏，務必使用 disposers 模式（見正規化 13.1）。

來源：官方文件（自動解除安裝行為）+ `control_center.js` L333-346（stop() 呼叫模式，生產驗證）+ CHANGELOG v3.4.13（"eventOn 等監聽函式返回 stop 函式"，函式返回值 confirmed）｜置信度（stop() 返回值模式）：high `[執行時原始碼]`；（自動解除安裝行為）：medium·單源孤證 `[文件·單源]`

---

## 5. 變數操作 API

### 5.1 VariableOption 型別（含作用域說明）

**核心結論**

```typescript
type VariableOption = {
  type: 'chat' | 'global' | 'message' | 'script' | 'preset' | 'extension';
  message_id?: number | 'latest';   // type='message' 時必填；支援負數（-1=最新）
  script_id?: string;               // type='script' 時必填（v4.6+ 指令碼內部可省略）
}
```

| type | 資料位置 | 跨樓層可見 | 注意 |
|---|---|---|---|
| `'chat'` | 當前聊天檔案全域性變數 | 是 | **最常用的跨樓層同步載體** |
| `'global'` | 全域性（跨角色卡）變數 | 是 | 跨對話持久化 |
| `'message'` | 單條樓層訊息附帶變數 | 需指定 message_id | 負數索引支援 |
| `'script'` | 繫結到特定指令碼的變數 | 需知 script_id | v4.6+ 指令碼內可省略 script_id（見懸案 U9） |
| `'preset'` | 預設變數 | — | v4.6 新增，medium·推導未驗證 |
| `'extension'` | 第三方外掛變數 | — | v4.6 新增，medium·推導未驗證 |

來源：官方文件 + `@types/iframe/variable.d.ts` ｜ 置信度：high `[文件·多源]`

### 5.2 函式簽名總表

**核心結論**

```typescript
// 讀取
function getVariables(option: VariableOption): Record<string, any>
function getAllVariables(): Record<string, any>
// getAllVariables 合併順序（訊息樓層 iframe）：全域性 → 角色卡 → 聊天 → 0 號樓 → 當前樓層
// 同名鍵覆蓋優先順序見懸案 U6

// 寫入（完整替換）— 同步，無需 await（CHANGELOG v3.3.0 確認）
function replaceVariables(variables: Record<string, any>, option: VariableOption): Record<string, any>

// 寫入（函式式更新，支援 async，推薦用於避免競態）
function updateVariablesWith(
  updater: (vars: Record<string, any>) => Record<string, any> | Promise<Record<string, any>>,
  option: VariableOption
): void

// 寫入（插入/覆蓋：存在則覆蓋，不存在則插入，不影響其他鍵）— 推薦替代 replaceVariables
function insertOrAssignVariables(variables: Record<string, any>, option: VariableOption): Record<string, any>

// 寫入（僅插入：不覆蓋已有鍵）
function insertVariables(variables: Record<string, any>, option: VariableOption): Record<string, any>

// 刪除（支援 dot-notation 路徑，如 "角色.屬性.值"）
function deleteVariable(
  variable_path: string,
  option: VariableOption
): { variables: Record<string, any>; delete_occurred: boolean }
```

⚠️ **置信度分層**：`getVariables` / `replaceVariables` 經 `media_library.js` L64-87 生產驗證：high `[執行時原始碼]`。`updateVariablesWith` / `insertOrAssignVariables` / `insertVariables` / `deleteVariable` 函式名來自型別宣告，未生產驗證：medium·單源孤證 `[型別宣告]`。`getAllVariables` 合併順序/優先順序：medium·推導未驗證（見懸案 U6）。`replaceVariables` 同步化經 CHANGELOG v3.3.0 確認：high。

### 5.3 Prompt 宏訪問變數

**核心結論**

在世界書條目或 prompt 模板中，可直接用宏語法讀取變數值：

```
{{get_chat_variable::path.to.var}}       ← JSON 格式
{{format_chat_variable::path.to.var}}    ← YAML 格式（AI 更易讀）
{{get_global_variable::path.to.var}}
{{format_global_variable::path.to.var}}
```

**注意**：鍵名以 `$` 開頭的變數自動對 AI 不可見（隱藏元資料），medium·單源孤證，施工前真機確認。

來源：官方文件單源 ｜ 置信度：medium·單源孤證 `[文件·單源]`

---

## 6. 聊天訊息 API

### 6.1 getChatMessages

**核心結論**

```typescript
function getChatMessages(
  range: string | number,
  option?: GetChatMessagesOption
): ChatMessage[] | ChatMessageSwiped[]

type GetChatMessagesOption = {
  role?:           'all' | 'system' | 'assistant' | 'user';  // 預設 'all'
  hide_state?:     'all' | 'hidden' | 'unhidden';            // 預設 'all'
  include_swipes?: boolean;                                   // 預設 false
}
```

**range 語法**：

| 示例 | 含義 |
|---|---|
| `10` | 單樓層 message_id=10 |
| `"10-20"` | 樓層 10 到 20 |
| `"0-"` | 全部樓層 |
| `-1` | 最新樓層 |

來源：官方文件 + `@types/iframe/chat_message.d.ts` ｜ 置信度：medium·單源孤證 `[文件·單源]` + `[型別宣告]`（兩者同項目，非獨立源；無生產卡使用記錄）

### 6.2 setChatMessages

**核心結論**

```typescript
function setChatMessages(
  chat_messages: Array<{ message_id: number } & Partial<ChatMessage | ChatMessageSwiped>>,
  option?: SetChatMessagesOption
): Promise<void>

type SetChatMessagesOption = {
  refresh?: 'none' | 'affected' | 'all';
  // 'affected'（預設）：僅重新整理受影響樓層（觸發 MESSAGE_IFRAME_RENDER_ENDED）
  // 'all'：過載整個聊天（觸發 CHAT_CHANGED，慎用）
  // 'none'：不重新整理（適合批次寫後手動 refreshOneMessage）
}
```

來源：官方文件 + `@types/iframe/chat_message.d.ts` ｜ 置信度：medium·單源孤證 `[文件·單源]` + `[型別宣告]`

### 6.3 其他訊息操作函式

**核心結論**

```typescript
function createChatMessages(messages: ..., option?): Promise<void>     // 批次插入新訊息
function deleteChatMessages(message_ids: number[]): Promise<void>      // 批次刪除
function rotateChatMessages(begin, middle, end): Promise<void>         // 重排訊息段順序
function refreshOneMessage(message_id: number): Promise<void>          // 重新整理單條訊息渲染
```

來源：官方文件單源 ｜ 置信度：medium·單源孤證 `[文件·單源]`

---

## 7. 提示詞注入 API（injectPrompts）

**核心結論**

兩函式均由 **JS-Slash-Runner** 擴充套件注入到 `window`（非 TavernHelper，非 ST 內建）。回源 JS-Slash-Runner `src/function/inject.ts` 確認簽名：

```typescript
function injectPrompts(
  prompts: Array<{
    id: string;                                              // 唯一 ID，用於後續 uninject
    position: 'in_chat' | 'none';                          // ⚠️ 只有這兩個值
    depth: number;                                          // 0 = 最近樓層；數字越大越靠前
    role: 'system' | 'user' | 'assistant';
    content: string;
    should_scan?: boolean;                                  // 是否被世界書掃描；預設 false
    filter?: (() => boolean) | (() => Promise<boolean>);   // 可選：啟用過濾器
  }>,
  opts?: { once?: boolean }                                 // once:true = 單次注入，觸發後自動清除
): { uninject: () => void }                                 // ⚠️ 返回含 uninject 的物件

function uninjectPrompts(ids: string[]): void
```

**核心避坑**：同一 `id` 重複呼叫 `injectPrompts` **不會自動覆蓋**舊注入，必須先調 `uninjectPrompts([...ids])` 再重新注入。

**生產模式（`control_center.js` L218-229，最高可信）**：

```javascript
if (typeof uninjectPrompts === 'function') uninjectPrompts(injectionIds);
const prompts = [];
// ... 根據當前狀態構建 prompts 陣列 ...
if (prompts.length && typeof injectPrompts === 'function') {
  injectPrompts(prompts, { once: true });
}
```

⚠️ **降級說明**：`{ once: true }` 自動清除觸發點是 `GENERATION_ENDED` / `GENERATION_STOPPED` 事件（非生成前）。`position: 'none'` 啟用世界書的實際效果未真機驗證（見懸案 U2）。

來源：JS-Slash-Runner `src/function/inject.ts`（執行時原始碼）+ `control_center.js` L218-229（生產驗證呼叫模式）｜置信度（函式存在 + 呼叫模式）：high `[執行時原始碼]`；（once 語義細節 / none position 效果）：medium·推導未驗證

---

## 8. 工具函式 API

**核心結論**

```typescript
function getCurrentMessageId(): number      // 當前樓層 ID（僅樓層訊息 iframe 有效）
function getScriptId(): string              // 當前指令碼庫 ID（僅指令碼 iframe；見懸案 U5）
function getLastMessageId(): number         // 最新樓層 ID（通用）
function getIframeName(): string            // iframe 名稱（TH-message-N 或 TH-script-X）
function getMessageId(iframe_name: string): number   // 從 iframe 名稱解析樓層號
function substitudeMacros(text: string): string      // 替換 ST 宏（{{char}} {{user}} 等）
function reloadIframe(): void               // 過載當前 iframe（注意：呼叫後 initializeGlobal 失效，見懸案 U10）
function errorCatched<T, U>(fn): (...args) => U      // 包裹函式，捕獲異常並自動顯示 toastr 通知
```

來源：`@types/iframe/util.d.ts`（GitHub raw 已確認 reloadIframe/getIframeName/getCurrentMessageId/getScriptId 四個函式存在）+ 官方文件 ｜ 置信度：medium·單源孤證 `[型別宣告]`（型別宣告非執行時原始碼；僅 getLastMessageId / getMessageId / substitudeMacros / errorCatched 無生產卡驗證）

---

## 9. 介面共享 API（跨 iframe）

**核心結論**

```typescript
function initializeGlobal(global: string, value: any): void     // v3.6.2+；v4.0.12+ 指令碼重啟後持久有效
function waitGlobalInitialized<T>(global: string): Promise<T>   // 等待某全域性介面初始化完畢
```

**兩者並存原因**：`initializeGlobal` 跨指令碼重啟持久化但有非同步延遲；`window[name]` 即時可用但不持久。同時寫兩個覆蓋所有情況（見正規化 13.3）。

⚠️ **降級說明**：v4.0.12 CHANGELOG"指令碼重啟後持久有效"僅單源，"呼叫 reloadIframe() 後失效"範圍未確認（見懸案 U10）。

來源：`@types/iframe/util.d.ts` + `media_library.js` L29-35 + `mvu_zod_cn.js` L27-34（生產驗證）｜置信度：high `[執行時原始碼]`；（持久化/失效細節）：medium·單源孤證 `[CHANGELOG·單源]`

---

## 10. iframe 與 window.parent 訪問模式

**核心結論**

樓層 iframe 內可用 `window.parent` 訪問 ST 宿主頁面（ST 內建訊息渲染通常同源），但跨域場景會拋 SecurityError，必須防禦性處理。

**生產模式（`control_center.js` L49-54、L67-71、L139、L164-168，最高可信）**：

```javascript
// 雙視窗穿透工具函式（必須保留 try/catch）
function hostWindow() {
  try {
    if (window.parent && window.parent !== window && window.parent.document) return window.parent;
  } catch (_) {}
  return window;
}
function hostDocument() {
  try { return hostWindow().document || document; } catch (_) { return document; }
}

// 將 UI 元件掛載到 ST 的 #extensionsMenu（wand 選單按鈕區）
const doc  = hostDocument();
const host = doc.querySelector('#extensionsMenu') || doc.body;
host.appendChild(myButtonElement);

// 跨 iframe 共享介面（同時寫到自身 window 和 parent）
window.CrossedZoneHudSettings = hudSettingsApi;
try {
  if (window.parent && window.parent !== window)
    window.parent.CrossedZoneHudSettings = hudSettingsApi;
} catch (_) {}

// 跨 iframe 傳送自定義事件到宿主頁面
window.parent.dispatchEvent(new CustomEvent('my-event', { detail: { foo: 'bar' } }));
```

來源：`control_center.js` L49-54、L67-71、L139、L164-168（卡A 2.5.0 / 2.9.9 生產驗證）｜置信度：high `[執行時原始碼]`

---

## 11. MVU 框架 API（Mvu 全域性物件）

**核心結論**

`Mvu` 是第三方 MVU 引擎（MagVarUpdate）透過 `initializeGlobal('Mvu', Mvu)` 注入的全域性物件，不是 TH 內建。角色卡需安裝對應世界書指令碼才可用；使用前必須 `await waitGlobalInitialized('Mvu')`（或降級輪詢，見正規化 13.3）。

```typescript
declare const Mvu: {
  // 資料讀寫
  getMvuData(options: VariableOption): MvuData
  replaceMvuData(mvu_data: MvuData, options: VariableOption): Promise<void>
  parseMessage(message: string, old_data: MvuData): Promise<MvuData>
  isDuringExtraAnalysis(): boolean

  // MVU 專屬事件常量（用於 eventOn 訂閱）
  events: {
    VARIABLE_INITIALIZED:    'mag_variable_initiailized'   // ⚠️ 原始碼拼寫 bug：initiailized（雙 i）
    VARIABLE_UPDATE_STARTED: 'mag_variable_update_started'
    COMMAND_PARSED:          'mag_command_parsed'
    VARIABLE_UPDATE_ENDED:   'mag_variable_update_ended'
    BEFORE_MESSAGE_UPDATE:   'mag_before_message_update'
  }
}

type MvuData = {
  initialized_lorebooks: Record<string, any[]>;
  stat_data:             Record<string, any>;
  [key: string]:         any;
}
```

**MVU 監聽器回撥引數**：

| 事件 | 回撥引數 | 說明 |
|---|---|---|
| `VARIABLE_INITIALIZED` | `(variables, swipe_id)` | 變數初始化完畢（**重新整理 HUD 掛點之一**） |
| `VARIABLE_UPDATE_ENDED` | `(variables, variables_before_update)` | 變數更新完成（**重新整理 HUD 主掛點**） |
| `COMMAND_PARSED` | `(variables, commands, message_content)` | 可在此修改解析出的命令 |

**重大避坑**：`VARIABLE_INITIALIZED` 的字串值是 `'mag_variable_initiailized'`（`initiailized` 含雙 i）。這是 MVU 庫的已知 bug。**必須用 `Mvu.events.VARIABLE_INITIALIZED` 列舉欄位，禁止手寫字串。**

⚠️ **置信度分層**：events 列舉欄位+拼寫 bug：high（型別宣告 GitHub 直讀 + 卡B生產卡多處 `Mvu.events.VARIABLE_INITIALIZED` 實際呼叫）。`getMvuData` / `replaceMvuData` / `parseMessage` 簽名：medium·單源孤證 `[型別宣告]`（卡A 2.9.9 生產驗證了實際呼叫但無官方文件）。`VARIABLE_UPDATE_STARTED` / `COMMAND_PARSED` / `BEFORE_MESSAGE_UPDATE`：medium·單源孤證（型別聲明確認字串，生產卡未實際監聽）。

來源：`@types/iframe/exported.mvu.d.ts`（型別宣告，GitHub 直讀）+ 卡B v2.6.0 `control_center.js` L1780 / `status_bar_regex*.html` 多處（生產卡實際使用 Mvu.events 列舉）+ 卡A 2.9.9 `control_center.js` 第 824-963 行（三段式寫入）｜置信度（events 列舉欄位+拼寫 bug）：high `[型別宣告]` + `[執行時原始碼]`

---

## 12. window.SillyTavern 核心介面

**核心結論**

`window.SillyTavern` 是 ST 本體暴露的物件，TH 保證 iframe 內始終指向最新上下文。ST 透過 `getContext()` 暴露以下介面（已回源 `public/scripts/st-context.js` L37-238 確認存在）：

| 分類 | 方法 / 屬性 | 說明 |
|---|---|---|
| 事件（原生） | `eventSource.on(type, fn)` / `.emit(type)` / `.once(type, fn)` | ST 原生事件發射器（優先用 TH 封裝的 eventOn） |
| 事件常量 | `eventTypes` | ST 原生事件名列舉（與 `window.tavern_events` 對應） |
| 聊天資料 | `chat[]`、`chatMetadata` | 原始聊天陣列與元資料 |
| 角色資料 | `characters[]`、`name1`、`name2`、`characterId` | 當前上下文 |
| Prompt 注入 | `setExtensionPrompt(id, text, position, depth, ...)` | 原生提示詞注入 |
| 宏替換 | `substituteParams(text)` | 替換 `{{char}}`、`{{user}}` 等宏 |
| 世界書 | `loadWorldInfo(name)` / `saveWorldInfo(name, data)` | 世界書讀寫 |
| 工具呼叫 | `registerFunctionTool(name, desc, schema, fn)` | 註冊 AI 工具 |
| 生成控制 | `sendGenerationRequest()` / `stopGeneration()` | 觸發/停止生成 |
| UI | `Popup`、`callGenericPopup()`、`showLoader()` | 彈窗與載入指示器 |

**避坑**：`window.SillyTavern` 的完整介面列表在 d.ts 裡極簡，無具體方法列表。卡內 JS 通常無法 `import` 這些 API，走 2.3 節 Tavern Helper 路徑。真機實測建議 F12 控制檯 `Object.keys(window.SillyTavern)` 檢視當前可用方法（見懸案 U1）。

來源：ST 本體 `public/scripts/st-context.js` L37-238（執行時原始碼直讀）｜置信度（介面在 ST 本體存在）：high `[執行時原始碼]`；（iframe 內透過 window.SillyTavern 可訪問性）：medium·推導未驗證 `[推斷]`（見懸案 U1）

---

## 13. 完整可用正規化程式碼

> 以下均來自本地生產卡，經卡A 2.5.0 / 2.9.9 / 卡B 2.6.0 驗證，置信度：high `[執行時原始碼]`

### 13.1 正規化 A：生成時注入提示詞 + disposer 生命週期管理

**來源：`control_center.js` L333-341（最高可信）**

```javascript
const disposers = [];

function bindEvents() {
  // 跨視窗發現 eventOn（先查 window，再查 parent）
  const eventOnHost = window.eventOn || hostWindow().eventOn;
  const onFirst = typeof eventMakeFirst === 'function'
    ? eventMakeFirst
    : (typeof eventOnHost === 'function' ? eventOnHost : null);
  const events = window.tavern_events || hostWindow().tavern_events || {};

  if (!onFirst || !eventOnHost) return;

  // 注入時機三選一（均訂閱，確保不同 API 相容性）
  [events.GENERATION_AFTER_COMMANDS, events.GENERATE_BEFORE_COMBINE_PROMPTS, events.CHAT_COMPLETION_PROMPT_READY]
    .filter(Boolean).forEach(name => {
      try {
        const d = onFirst(name, () => injectGenerationPrompts());
        if (d?.stop) disposers.push(() => d.stop());
      } catch (_) {}
    });

  // 切換對話時重建魔杖入口（延時 250ms 等 ST 完成 UI 重建）
  try {
    const d = eventOnHost(events.CHAT_CHANGED, () => setTimeout(ensureWandEntry, 250));
    if (d?.stop) disposers.push(() => d.stop());
  } catch (_) {}
}

function destroy() {
  while (disposers.length) {
    try { disposers.pop()?.(); } catch (_) {}
  }
}
```

### 13.2 正規化 B：Script 變數讀寫

**來源：`media_library.js` L64-87（生產驗證）**

```javascript
const SCRIPT_ID = 'crossed-zone-media-library';  // 硬編碼，確保指令碼過載後路徑不變

function scriptVariableOption() {
  return { type: 'script', script_id: SCRIPT_ID };
}

// 讀取
function readRawLibrary() {
  if (typeof getVariables !== 'function') return defaultLibrary();
  try {
    return getVariables(scriptVariableOption()) || {};
  } catch (e) {
    return defaultLibrary();
  }
}

// 寫入（同步呼叫，無需 await）
function writeRawLibrary(value) {
  if (typeof replaceVariables !== 'function') throw new Error('酒館助手變數介面不可用');
  replaceVariables(value, scriptVariableOption());
}
```

### 13.3 正規化 C：全域性介面暴露與等待（降級相容模式）

**來源：`media_library.js` L29-36 + `mvu_zod_cn.js` L27-34（多檔案驗證）**

```javascript
// 暴露（優先 initializeGlobal 持久化，同時 window[name] 即時可用）
function exposeGlobal(name, api) {
  try {
    if (typeof initializeGlobal === 'function') initializeGlobal(name, api);
    window[name] = api;   // 兩個都做，覆蓋所有情況
  } catch (_) { window[name] = api; }
}

// 等待（優先 waitGlobalInitialized，fallback 輪詢 8 秒）
const waitForApiReady = async (name) => {
  if (typeof waitGlobalInitialized === 'function') return waitGlobalInitialized(name);
  const started = Date.now();
  while (!window[name] && Date.now() - started < 8000)
    await new Promise(r => setTimeout(r, 50));
  return window[name];
};

// 用法：等待 Mvu 就緒（必須 await 後才能呼叫 Mvu.events 等）
await waitForApiReady('Mvu');
```

### 13.4 正規化 D：訪問宿主頁面 DOM

**來源：`control_center.js` L67-71（生產驗證）**

```javascript
function hostDocument() {
  try { return window.parent?.document || document; } catch (_) { return document; }
}

// 將 UI 掛載到 ST 的 #extensionsMenu（wand 選單按鈕區）
const doc  = hostDocument();
const host = doc.querySelector('#extensionsMenu') || doc.querySelector('.extensionsMenu') || doc.body;
host.appendChild(myButtonElement);

// 跨 iframe 廣播自定義事件
try {
  window.parent.dispatchEvent(new CustomEvent('my-event', { detail: { foo: 'bar' } }));
} catch (_) {}
```

### 13.5 正規化 E：chat 變數作為跨樓層狀態匯流排

```javascript
// 樓層 A：寫入共享狀態（推薦 insertOrAssignVariables 避免覆蓋其他鍵）
insertOrAssignVariables(
  { sharedState: { phase: 3, timestamp: Date.now() } },
  { type: 'chat' }
);

// 樓層 B：讀取共享狀態（同一聊天內所有樓層可訪問）
const vars = getVariables({ type: 'chat' });
const phase = vars?.sharedState?.phase;

// 聯動：寫完變數 + 發事件通知其他樓層重新整理
await replaceVariables(newVars, { type: 'chat' });
await eventEmit('狀態已更新');
```

### 13.6 正規化 F：自定義跨樓層事件廣播

```javascript
// 釋出方（任意樓層 iframe 或指令碼）
await eventEmit('角色階段更新完成', { phase: 3 });

// 訂閱方（另一樓層 iframe 或指令碼）
const handle = eventOn('角色階段更新完成', (data) => {
  console.log('收到:', data.phase);
});

// 明確清理
handle.stop();

// 在非 async 函式內強制等待（v3.2.5+）
function syncHandler() {
  eventEmitAndWait('存檔完成');
}
```

### 13.7 正規化 G：iframe 渲染生命週期監聽

**置信度：medium·推導未驗證**（型別定義確認事件列舉存在；指令碼 iframe 能否跨樓層監聽屬推斷，見懸案 U8）

```javascript
// 監聽某樓層 iframe 渲染完成
// iframe_name 格式："TH-message--{樓層號}--{index}"
eventOn(iframe_events.MESSAGE_IFRAME_RENDER_ENDED, (iframe_name) => {
  const match = iframe_name.match(/TH-message--(\d+)--\d+/);
  const floor = match ? parseInt(match[1]) : null;
  console.log(`樓層 ${floor} 渲染完成`);
});
```

### 13.8 正規化 H：自我過載前銷燬舊例項

**來源：`control_center.js` L53 + `media_library.js` L15-17（生產驗證）**

```javascript
// 指令碼頂部：防止多次注入造成事件監聽器疊加
if (window.CrossedZoneControlCenter?.destroy) {
  try { window.CrossedZoneControlCenter.destroy(); } catch (_) {}
}
// 或
if (window.CrossedZoneMediaLibrary?.destroy) {
  try { window.CrossedZoneMediaLibrary.destroy(); } catch (_) {}
}
```

---

## 14. 高頻避坑

1. **API 可用性防禦檢查（必做）**：TH 未安裝或版本不相容時，API 為 `undefined`。正式程式碼必須 `typeof getVariables === 'function'` 前置判斷，見正規化 13.2。high `[執行時原始碼]`

2. **injectPrompts 不自動去重**：同一 `id` 重複注入會累加，每次生成前必須先 `uninjectPrompts([...ids])` 再重新注入。high `[執行時原始碼]`

3. **window.parent 跨域陷阱**：ST 某些渲染模式下訪問 `window.parent` 會拋 SecurityError。必須 `try/catch` 包裹；參考 `control_center.js` L67-71 生產級防禦寫法。high `[執行時原始碼]`

4. **eventOn 返回值版本差異**：舊版返回 `void`，新版（v3.4.13+）返回 `{ stop() }` 物件。通用寫法：`disposers.pop()?.()` 用可選鏈同時相容兩種返回型別。high `[執行時原始碼]`

5. **tavern_events 列舉欄位優先於字串直接量**：用 `window.tavern_events.MESSAGE_RECEIVED` 而非硬編碼 `'message_received'`。`GENERATION_AFTER_COMMANDS` 是全大寫例外。high `[執行時原始碼]`

6. **MVU 事件名拼寫錯誤（原始碼 bug）**：`VARIABLE_INITIALIZED` 的字串值含雙 i（`initiailized`）。**必須用 `Mvu.events.VARIABLE_INITIALIZED` 列舉欄位。** high `[型別宣告]` + `[執行時原始碼]`

7. **replaceVariables 是同步函式（且是全量替換）**：舊版文件示例可能含 `await replaceVariables(...)`，現版本已確認為同步呼叫。**全量替換會覆蓋整個變量表**；推薦用 `insertOrAssignVariables` 做區域性更新。high

8. **eventEmitAndWait 用於非 async 函式**：不能 `await` 時用 `eventEmitAndWait`；async 函式內用 `await eventEmit`。high·單源 `[CHANGELOG·單源]`

9. **script_id 硬編碼優於 getScriptId()**：`getScriptId()` 依賴執行上下文，指令碼過載後 ID 可能變化。推薦硬編碼固定字串（須全域性唯一）。high `[執行時原始碼]`

10. **自我過載前必須 destroy 舊例項**：ST 在某些情況下會重新執行指令碼而不銷燬舊例項，導致 eventOn 監聽器疊加。初始化時檢測舊例項並 destroy（見正規化 13.8）。high `[執行時原始碼]`

11. **CHAT_CHANGED 事件防抖**：生產卡保留 `setTimeout(ensureWandEntry, 250)` 防抖，等待 ST 完成 UI 重建後再操作 DOM。medium·單源孤證（CHANGELOG v4.5.4 修復了額外觸發 bug，但防抖做法仍推薦）

12. **$ 開頭變數鍵對 AI 不可見**：鍵名以 `$` 開頭的變數自動對 AI 不可見（隱藏元資料）。medium·單源孤證 `[文件·單源]`，施工前真機確認。

13. **setChatMessages 多 swipe 層修復**：舊版有 bug（多 swipe 陣列處理不正確），依賴 swipe 資料時確認 TH 版本。medium·單源孤證

---

## 15. 版本演進關鍵節點

| 版本 | 關鍵變更 |
|---|---|
| v3.0.2 | `getVariables` 支援角色卡繫結變數和樓層變數（負數索引） |
| v3.1.1 | `setChatMessages` 更靈活的訊息操作 |
| v3.2.5 | `eventEmitAndWait`（同步函式內可用）；指令碼按鈕 getVariables 支援 |
| v3.3.0 | `replaceVariables` 改為同步呼叫 |
| v3.4.13 | `eventOn` 等監聽函式返回 `stop()` 函式，便於取消監聽 |
| v3.6.2 | `waitGlobalInitialized` + `initializeGlobal` 新增 |
| v4.0.0 | Vue+Pinia 架構重寫；預設支援指令碼繫結；`eventOn` 引數變化 |
| v4.0.12 | 共享介面指令碼重啟後持久有效；`injectPrompts` 返回 `uninject` 物件 |
| v4.4.0 | `setChatMessages` 新增 `refresh: 'affected'`；新增 `refreshOneMessage` |
| v4.5.4 | 修復 CHAT_CHANGED 在切換角色卡時額外觸發的 bug |
| v4.6.0 | `getVariables`/`replaceVariables` 新增 `'preset'`/`'extension'` 型別；指令碼內呼叫 script 變數時 script_id 可省略 |

來源：CHANGELOG.md（各版本 GitHub 直讀）｜置信度：high·單源 `[CHANGELOG·單源]`

---

## 16. 懸而未決：需真機驗證的問題

以下問題已經研究但無法從現有證據坐實，施工前須真機驗證。

| 編號 | 問題 | 不確定原因 | 真機驗證路徑 |
|---|---|---|---|
| U1 | `window.SillyTavern` 與 `window.TavernHelper` 的完整方法邊界 | d.ts 宣告極簡，無具體方法列表 | F12 控制檯：`JSON.stringify(Object.keys(window.TavernHelper), null, 2)` 和 `Object.keys(window.SillyTavern)` |
| U2 | `injectPrompts` 的 `position: 'none'` 實際啟用世界書的效果 | ST 內部 `setExtensionPrompt` 傳 `-1` 時的行為未真機驗證 | 在 ST 瀏覽器控制檯執行 `typeof injectPrompts, injectPrompts.toString()` |
| U3 | `VariableOption.type = 'preset' / 'extension'` 的讀寫行為 | CHANGELOG 提及支援但無完整文件 | 真機 `getVariables({type:'preset'})` 執行，觀察返回值結構 |
| U4 | `WORLDINFO_ENTRIES_LOADED` 監聽器的引數結構與修改 API | CHANGELOG 說"可調整條目"，但未說明回撥引數格式和可寫欄位 | 真機斷點：`eventOn(tavern_events.WORLDINFO_ENTRIES_LOADED, (data) => { console.log(data) })` |
| U5 | `getScriptId()` 在樓層訊息 iframe 內的行為 | 文件僅說"指令碼庫 ID"，樓層 iframe 無 script 概念 | 樓層 iframe 內呼叫 `getScriptId()`，觀察返回 undefined / 報錯 / 空字串 |
| U6 | `getAllVariables()` 同名鍵合併時的覆蓋優先順序 | 文件說合並順序但未說明後者覆蓋前者還是反之 | 構造測試：在全域性層和聊天層設同名鍵不同值，`getAllVariables()` 觀察哪個值勝出 |
| U7 | 樓層 iframe 銷燬的確切時機 | 上下翻頁 / swipe 換層 / 發新訊息是否各自銷燬 iframe | 在樓層 iframe 內 `console.log('mount')` + 監聽 `window.beforeunload`，滾動/swipe/發訊息後觀察 console |
| U8 | `MESSAGE_IFRAME_RENDER_STARTED/ENDED` 的觸發 iframe 範圍 | 不清楚是父視窗發出（指令碼 iframe 可收到所有樓層），還是僅樓層 iframe 自身觸發 | 在全域性指令碼 iframe 內 `eventOn(iframe_events.MESSAGE_IFRAME_RENDER_ENDED, ...)` 然後讓 ST 渲染新訊息，看是否有輸出 |
| U9 | `script_id` 省略的完整條件（v4.6+） | CHANGELOG 提到"指令碼內可省略"，但前端介面 iframe 內能否也省略、省略後預設用什麼 ID 未說明 | 在指令碼樓層呼叫 `getVariables({ type: 'script' })` 不傳 script_id，觀察是否報錯及返回值 |
| U10 | `initializeGlobal` 持久化的邊界（v4.0.12+） | CHANGELOG 稱指令碼重啟後有效，但 ST 完全重啟 / 切換角色卡 / reloadIframe() 後是否仍有效，失效範圍不清 | 呼叫 `initializeGlobal('TestApi', {})` 後分別執行頁面重新整理、指令碼重啟、切換角色卡，在另一指令碼 `waitGlobalInitialized('TestApi')` 觀察是否超時 |

---

## 主要來源

- [N0VI028/JS-Slash-Runner GitHub](https://github.com/N0VI028/JS-Slash-Runner)
- [@types/iframe/event.d.ts](https://github.com/N0VI028/JS-Slash-Runner/blob/main/@types/iframe/event.d.ts)
- [@types/iframe/exported.mvu.d.ts](https://github.com/N0VI028/JS-Slash-Runner/blob/main/@types/iframe/exported.mvu.d.ts)
- [酒館助手官方文件](https://n0vi028.github.io/JS-Slash-Runner-Doc/)
- [CHANGELOG.md](https://github.com/N0VI028/JS-Slash-Runner/blob/main/CHANGELOG.md)
- 本地驗證源：`<local-user-path>/<local-drive>/<local-workspace>/卡A/卡A 2.5.0/components/control_center.js`
- 本地驗證源：`<local-user-path>/<local-drive>/<local-workspace>/卡A/卡A 2.5.0/components/media_library.js`
- 本地驗證源：`<local-user-path>/<local-drive>/<local-workspace>/卡A/卡A 2.5.0/components/mvu_zod_cn.js`
- 本地驗證源：`<local-guide-db>/本地證據/卡A歷史/2.9.9/components/control_center.js`
- 回源：ST 本體 `public/scripts/events.js` L1-95（v1.14.0 執行時原始碼，交叉驗證 TavernEventType 列舉欄位）
- 回源：ST 本體 `public/scripts/st-context.js` L37-238（執行時原始碼，確認 SillyTavern context 物件介面）
- 回源：ST 本體 `public/scripts/chats.js`（DOMPurify 鉤子，custom- 字首機制）
- 回源：`<local-user-path>/<local-drive>/<local-workspace>/卡B/v2.6.0_20260611_000000/components/`（驗證 Mvu.events 用法）
