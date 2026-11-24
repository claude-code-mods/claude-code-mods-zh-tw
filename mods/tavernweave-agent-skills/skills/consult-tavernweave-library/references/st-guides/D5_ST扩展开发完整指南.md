# ST 擴充套件開發完整指南

> 文件版本：v1.1.0 ｜ 最後更新：2026-07-14

> **定位**：SillyTavern UI Extension 與 Server Plugin 的開發參考，覆蓋 manifest 結構、入口正規化、事件系統、持久化、slash command、生成攔截、生命週期鉤子、釋出流程及打包方案。
>
> **職責邊界**：本冊是“酒館外掛/宿主擴充套件”唯一主冊。角色卡內 Tavern Helper `ScriptTree[]`、魔棒按鈕和創意工坊世界書事務見 **《E5_創意工坊與擴充套件生態.md》**；角色卡不得把“需要外掛”寫成靜默自動安裝授權。

---

## 置信度分級體系

三級體系：**high**（多源互證，可直接施工）／**medium**（單源或推斷，施工需留驗證餘量）／**low**（孤證無源，禁止施工，先驗證）。

依據型別軸：`[執行時原始碼]` / `[真機]` / `[文件·多源]` / `[文件·單源]` / `[社群]` / `[推斷]`

**首次收集日期**：2026-06-28
**2026-07-14 雙快照**：本地 SillyTavern v1.14.0 繼續作為歷史原始碼快照；官方 release 頁面當日核驗為 v1.18.0。精確 API 以目標安裝版本的原始碼/能力檢測為準，不把任何一版寫成永久基線。

---

## 目錄

1. 機制總覽
2. manifest.json 欄位完整參考
   - 2.1 欄位表
   - 2.2 典型示例
3. index.js 入口結構與正規化
   - 3.1 新式 getContext() 寫法（推薦）
   - 3.2 老式相對 import 寫法（可用，不推薦）
   - 3.3 settings.html 模板
4. extension_settings 持久化
5. UI 注入（Settings Panel）
6. eventSource 事件系統
   - 6.1 監聽與觸發 API
   - 6.2 event_types 完整常量表
7. 註冊 Slash Command
   - 7.1 新式 SlashCommandParser（推薦）
   - 7.2 老式 registerSlashCommand（deprecated）
8. generate_interceptor（提示詞攔截）
9. Lifecycle Hooks（manifest.hooks）
10. getContext() 完整 API 參考
11. 第三方擴充套件安裝結構與釋出
12. Webpack 打包（Bundled Extension）
13. Server Plugin（對比 UI Extension）
14. 高頻避坑
15. 懸案（未決項與驗證路徑）
16. 外掛術語、安裝渠道與作用域
17. 依賴、更新、解除安裝與安全審查
18. 角色卡依賴 UX、相容矩陣與回滾

---

## 1. 機制總覽

**來源**：官方文件 [文件·多源] + ST 原始碼 [執行時原始碼]
**置信度**：high

SillyTavern 擴充套件（UI Extension）是**純客戶端 JavaScript 模組**，以 ES Module 形式載入，執行在瀏覽器。載入入口：`manifest.json` → 指向 `index.js` → 自動注入 `css`。

**擴充套件存放路徑**（兩種，HTTP URL 路徑相同）：

| 作用域 | 檔案系統路徑 | 適用版本 |
|---|---|---|
| 使用者作用域（推薦） | `data/<user-handle>/extensions/<extension-name>/` | 1.12+ |
| 全域性作用域 | `public/scripts/extensions/third-party/<extension-name>/` | 所有版本 |

兩者對 HTTP 服務呈現的 URL 均為 `/scripts/extensions/third-party/<name>/`，程式碼內相對 import 路徑以此為基準。

**擴充套件與 ST 核心的互動主幹**：

| 方式 | 推薦度 | 說明 |
|---|---|---|
| `SillyTavern.getContext()` | **推薦** | 訪問應用狀態和核心方法，API 穩定 |
| `import {...} from "../../../../script.js"` | 不推薦 | 隨內部結構重構隨時 break |

---

## 2. manifest.json 欄位完整參考

### 2.1 欄位表

**來源**：官方文件 + 官方擴充套件原始碼 [文件·多源] [執行時原始碼]
**置信度**：high
**適用版本**：跨版本欄位表。除單獨標註項外，基礎欄位已在 ST v1.14.0 歷史快照核對；版本新增欄位必須同時滿足 `minimum_client_version` 並按目標版真機驗證。

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `display_name` | string | **必填** | 在"Manage Extensions"選單中顯示的名稱 |
| `js` | string | **必填** | 入口 JS 檔案路徑（相對擴充套件目錄） |
| `author` | string | **必填** | 作者名或聯絡方式 |
| `loading_order` | number | 可選 | 載入優先順序；數字越大越晚載入，預設約 10 |
| `css` | string | 可選 | 自動注入的樣式檔案路徑 |
| `version` | string | 可選 | 擴充套件版本號（semver） |
| `homePage` | string | 可選 | 擴充套件倉庫 URL |
| `auto_update` | boolean | 可選 | 是否隨 ST 包更新自動更新，預設 false |
| `minimum_client_version` | string | 可選 | 所需最低 ST 版本 |
| `requires` | array | 可選 | 需要的 Extras API 模組（Extras 專案已 OBSOLETE，新擴充套件勿用） |
| `optional` | array | 可選 | 可選的 Extras API 模組（同上，已基本無效） |
| `dependencies` | array | 可選 | 所依賴的其他擴充套件資料夾名；缺失則拒絕載入 |
| `generate_interceptor` | string | 可選 | 全域性函式名，在每次生成前被呼叫（可修改 chat 陣列） |
| `i18n` | object | 可選 | locale → 翻譯 JSON 檔案路徑的對映 |
| `hooks` | object | 可選 | **僅 ST v1.17+** 的生命週期鉤子函式名對映；`clean` 等完整集合按 v1.18+ 核對（見第 9 章）。v1.14.0 不讀取此欄位 |

### 2.2 典型示例

**帶 i18n 示例**（來源：Extension-TopInfoBar manifest [執行時原始碼]）：

```json
{
  "display_name": "Chat Top Bar",
  "loading_order": 100,
  "requires": [],
  "optional": [],
  "js": "index.js",
  "css": "style.css",
  "author": "Cohee1207",
  "version": "1.0.0",
  "homePage": "https://github.com/SillyTavern/Extension-TopInfoBar",
  "auto_update": true,
  "i18n": {
    "zh-cn": "i18n/zh-cn.json",
    "zh-tw": "i18n/zh-tw.json"
  }
}
```

**帶 generate_interceptor 示例**（來源：Extension-MessageLimit manifest [執行時原始碼]）：

```json
{
  "display_name": "Message Limit",
  "loading_order": 1000,
  "requires": [],
  "optional": [],
  "js": "index.js",
  "css": "",
  "author": "Cohee1207",
  "version": "1.0.0",
  "homePage": "https://github.com/SillyTavern/Extension-MessageLimit",
  "auto_update": true,
  "generate_interceptor": "MessageLimit_interceptGeneration"
}
```

---

## 3. index.js 入口結構與正規化

### 3.1 新式 getContext() + activate 寫法（ST v1.17+ 推薦）

**來源**：官方文件 [文件·多源]
**置信度**：high
**適用版本**：`getContext()` 與目錄結構在 v1.14.0 和 2026-07-14 當前文件中均成立；但本節主示例使用 `hooks.activate`，因此 manifest 的 `minimum_client_version` 至少應為 `1.17.0`。安裝 UI、使用者作用域與收錄流程仍屬於版本敏感項。

```json
{
  "minimum_client_version": "1.17.0",
  "hooks": {
    "activate": "onActivate"
  }
}
```

```javascript
// 不再有相對 import，直接用全域性 SillyTavern 物件
const MODULE_NAME = 'my_extension';

const defaultSettings = Object.freeze({
  enabled: false,
  threshold: 5,
  mode: 'auto',
});

function getSettings() {
  const { extensionSettings } = SillyTavern.getContext();
  if (!extensionSettings[MODULE_NAME]) {
    extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
  }
  // 版本升級時補全新增欄位
  for (const key of Object.keys(defaultSettings)) {
    if (!Object.hasOwn(extensionSettings[MODULE_NAME], key)) {
      extensionSettings[MODULE_NAME][key] = defaultSettings[key];
    }
  }
  return extensionSettings[MODULE_NAME];
}

async function init() {
  const {
    eventSource,
    event_types,
    extensionSettings,
    saveSettingsDebounced,
    renderExtensionTemplateAsync,
  } = SillyTavern.getContext();

  // 1. 注入 Settings Panel HTML（Handlebars 模板）
  const settingsHtml = await renderExtensionTemplateAsync(
    'third-party/my-extension',  // 相對 /scripts/extensions/ 的目錄名
    'settings',                   // 模板檔名（不含字尾）
    { title: 'My Extension', defaultThreshold: 5 }
  );
  $('#extensions_settings2').append(settingsHtml);

  // 2. 繫結控制元件事件
  const settings = getSettings();
  $('#my_ext_enabled').prop('checked', settings.enabled).on('change', function() {
    settings.enabled = $(this).prop('checked');
    saveSettingsDebounced();
  });

  // 3. 監聽 ST 事件
  eventSource.on(event_types.MESSAGE_RECEIVED, onMessageReceived);
  eventSource.on(event_types.CHAT_CHANGED, onChatChanged);
}

function onMessageReceived(messageId) {
  const { chat } = SillyTavern.getContext();
  const message = chat[messageId];
  console.log('New message:', message.mes);
}

function onChatChanged() {
  const settings = getSettings();
  // 切換聊天時重置狀態...
}

// 掛載 activate 鉤子（manifest hooks.activate 指向此函式名）
export async function onActivate() {
  await init();
}
```

**避坑**：`init()` 若可能被多次觸發，對 `$.on()` 需先 `.off()` 再 `.on()`，防止重複繫結事件。

若明確相容 **v1.14.0**，不得照抄上面的 hook manifest。保留無 hooks 的模組載入路徑，並把初始化做成冪等：

```javascript
let initialized = false;

async function initOnce() {
  if (initialized) return;
  initialized = true;
  await init();
}

// v1.14.0 歷史路徑：模組載入後由 DOM ready 啟動；APP_READY 只作兜底且不能重複初始化。
jQuery(initOnce);
const { eventSource, event_types } = SillyTavern.getContext();
eventSource.once(event_types.APP_READY, initOnce);
```

這條相容支線沒有 `onDisable` hook；需要停用即停的擴充套件應提高最低版本，不能聲稱在 v1.14.0 支援熱停用清理。

### 3.2 老式相對 import 寫法（可用，不推薦）

**來源**：city-unit/st-extension-example [執行時原始碼]
**置信度**：high（可用），但路徑脆弱性為 medium（重構即 break）
**適用版本**：當前可用，不保證未來相容

```javascript
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "st-extension-example";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const defaultSettings = {};

async function loadSettings() {
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }
  $("#example_setting").prop("checked", extension_settings[extensionName].example_setting).trigger("input");
}

function onExampleInput(event) {
  const value = Boolean($(event.target).prop("checked"));
  extension_settings[extensionName].example_setting = value;
  saveSettingsDebounced();
}

function onButtonClick() {
  toastr.info(
    `The checkbox is ${extension_settings[extensionName].example_setting ? "checked" : "not checked"}`,
    "A popup appeared because you clicked the button!"
  );
}

jQuery(async () => {
  const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
  $("#extensions_settings").append(settingsHtml);
  $("#my_button").on("click", onButtonClick);
  $("#example_setting").on("input", onExampleInput);
  loadSettings();
});
```

**避坑**：`import` 相對路徑依賴 ST 內部檔案結構，內部重構後立刻 break 且無錯誤提示。新擴充套件一律用 `getContext()`。

### 3.3 settings.html 模板（使用 ST inline-drawer 元件）

**來源**：city-unit/st-extension-example [執行時原始碼]
**置信度**：high

```html
<div class="example-extension-settings">
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>Extension Example</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
            <div class="example-extension_block flex-container">
                <input id="my_button" class="menu_button" type="submit" value="Example Button" />
            </div>
            <div class="example-extension_block flex-container">
                <input id="example_setting" type="checkbox" />
                <label for="example_setting">This is an example</label>
            </div>
            <hr class="sysHR" />
        </div>
    </div>
</div>
```

**Handlebars 模板內 i18n 屬性用法**：

```html
<b data-i18n="{{title}}">{{title}}</b>
```

---

## 4. extension_settings 持久化

**來源**：官方文件 [文件·多源] + ST 原始碼 [執行時原始碼]
**置信度**：high
**適用版本**：ST v1.14.0

**核心規則**：

- `extension_settings` 是全域性物件，掛在 ST 設定 JSON 內
- 每個擴充套件用唯一 key（即擴充套件資料夾名）隔離名稱空間，避免衝突
- `saveSettingsDebounced()` 內部做了防抖，批次寫入伺服器；**禁止用 `saveSettings()`** 替代（會淹沒伺服器請求）
- **大資料（超過幾十 KB 的快取）不要放 `extension_settings`**，改用 `SillyTavern.libs.localforage`

**IndexedDB 大資料儲存**（via localforage）：

```javascript
const { localforage } = SillyTavern.libs;

// 寫入
await localforage.setItem(`${MODULE_NAME}_cache`, largeData);

// 讀取
const cached = await localforage.getItem(`${MODULE_NAME}_cache`);

// 清理（配合 onClean 鉤子）
await localforage.removeItem(`${MODULE_NAME}_cache`);
```

**設定合併推薦正規化**（lodash deep merge，新欄位自動補全）：

```javascript
const { extensionSettings } = SillyTavern.getContext();
const { lodash } = SillyTavern.libs;

extensionSettings[MODULE_NAME] = lodash.merge(
  structuredClone(defaultSettings),
  extensionSettings[MODULE_NAME]
);
```

**已知限制**：`saveSettingsDebounced` 有防抖延遲，修改後立即重新整理頁面可能丟失最後一次修改。ST 目前無官方同步持久化 API。

---

## 5. UI 注入（Settings Panel）

**來源**：官方文件 [文件·多源] + ST 原始碼 [執行時原始碼]
**置信度**：high
**適用版本**：ST v1.14.0

**兩個主要注入點**：

| jQuery 選擇器 | 用途 |
|---|---|
| `$('#extensions_settings')` | 擴充套件設定面板（主區域，老式寫法常用） |
| `$('#extensions_settings2')` | 擴充套件設定面板（副區域，新式模板推薦） |

**兩種注入方式**：

```javascript
// 方式 A：$.get 直接拉 HTML（老式，仍可用）
const html = await $.get(`scripts/extensions/third-party/${extensionName}/settings.html`);
$('#extensions_settings').append(html);

// 方式 B：renderExtensionTemplateAsync（新式，含 Handlebars + i18n + DOMPurify 淨化）
const html = await renderExtensionTemplateAsync(
  'third-party/my-extension',  // 第一引數：相對 /scripts/extensions/ 的目錄名
  'settings',                   // 第二引數：模板檔名（不含字尾）
  { key: 'value' }              // 第三引數：模板資料物件
);
$('#extensions_settings2').append(html);
```

**避坑**：`renderExtensionTemplateAsync` 第一引數是目錄名（如 `'third-party/my-extension'`），不是檔案路徑也不是絕對路徑。路徑寫錯不報錯，只是靜默渲染空字串。

---

## 6. eventSource 事件系統

### 6.1 監聽與觸發 API

**來源**：events.js 原始碼（staging branch）[執行時原始碼]
**置信度**：high
**適用版本**：ST v1.14.0

```javascript
const { eventSource, event_types } = SillyTavern.getContext();

// 訂閱（持續監聽）
eventSource.on(event_types.MESSAGE_RECEIVED, handler);

// 一次性訂閱（觸發後自動移除）
eventSource.once(event_types.APP_READY, handler);

// 取消訂閱（防記憶體洩漏，onDisable 鉤子內必須呼叫）
eventSource.removeListener(event_types.MESSAGE_RECEIVED, handler);

// 觸發事件（也可觸發自定義事件）
await eventSource.emit('my_custom_event', { data: 'payload' });
```

**避坑**：動態註冊的 listener 必須在 `onDisable` 鉤子裡 `removeListener` 清理，否則擴充套件停用後仍會觸發回撥，造成記憶體洩漏和行為異常。

### 6.2 event_types 完整常量表

**來源**：https://github.com/SillyTavern/SillyTavern/blob/staging/public/scripts/events.js [執行時原始碼]
**置信度**：medium·版本漂移（來源為 staging branch，實測 v1.14.0 僅 89 個事件，staging 已達 150 個；下表含 staging 新增事件，在 v1.14.0 中不存在的條目已標註）
**適用版本**：ST staging branch（v1.14.0 子集見注意事項）

> **版本注意**：以下事件中，`APP_INITIALIZED`、`CHAT_LOADED`、`CHAT_RENAMED`、`PERSONA_*`（5個）、`ITEMIZED_PROMPTS_*`（3個）、`TTS_*`（3個）、`WORLDINFO_SCAN_DONE` 在本地 v1.14.0 原始碼（`public/scripts/events.js`）中**均不存在**，屬於 staging 新增。施工於 v1.14.0 時勿用這些事件常量，執行時會得到 `undefined`。v1.14.0 實有事件清單以本地 `public/scripts/events.js` 為準。

**應用生命週期**

| 常量名 | v1.14.0 | 說明 |
|---|---|---|
| `APP_INITIALIZED` | staging 新增 | 應用初始化完成，loader 仍在；同步安裝 UI 用這個時機 |
| `APP_READY` | ✅ | 應用完全就緒，loader 已移除；非同步後續初始化用這個 |
| `EXTENSIONS_FIRST_LOAD` | ✅ | 擴充套件首次載入 |
| `EXTENSION_SETTINGS_LOADED` | ✅ | 擴充套件設定載入完畢 |
| `SETTINGS_LOADED_BEFORE` | ✅ | 設定載入前 |
| `SETTINGS_LOADED` | ✅ | 設定載入完成 |
| `SETTINGS_LOADED_AFTER` | ✅ | 設定載入後 |
| `SETTINGS_UPDATED` | ✅ | 設定有更新 |

**訊息事件**

| 常量名 | v1.14.0 | 說明 |
|---|---|---|
| `MESSAGE_SENT` | ✅ | 使用者訊息已記入 chat 物件（未渲染） |
| `MESSAGE_RECEIVED` | ✅ | LLM 訊息已記入 chat 物件（未渲染） |
| `USER_MESSAGE_RENDERED` | ✅ | 使用者訊息已渲染到 DOM |
| `CHARACTER_MESSAGE_RENDERED` | ✅ | LLM 訊息已渲染到 DOM |
| `MESSAGE_EDITED` | ✅ | 訊息被編輯 |
| `MESSAGE_DELETED` | ✅ | 訊息被刪除 |
| `MESSAGE_UPDATED` | ✅ | 訊息有更新 |
| `MESSAGE_SWIPED` | ✅ | swipe 操作 |
| `MESSAGE_SWIPE_DELETED` | ✅ | swipe 被刪除 |
| `MESSAGE_FILE_EMBEDDED` | ✅ | 檔案嵌入訊息 |
| `MESSAGE_REASONING_EDITED` | ✅ | 推理內容被編輯 |
| `MESSAGE_REASONING_DELETED` | ✅ | 推理內容被刪除 |
| `MORE_MESSAGES_LOADED` | ✅ | 更多歷史訊息載入 |
| `IMPERSONATE_READY` | ✅ | impersonate 生成完畢 |

**生成事件**

| 常量名 | v1.14.0 | 說明 |
|---|---|---|
| `GENERATION_AFTER_COMMANDS` | ✅ | slash commands 處理後，生成開始前 |
| `GENERATION_STARTED` | ✅ | 生成開始 |
| `GENERATION_STOPPED` | ✅ | 生成被中斷 |
| `GENERATION_ENDED` | ✅ | 生成完成 |
| `GENERATE_BEFORE_COMBINE_PROMPTS` | ✅ | 合併 prompt 前 |
| `GENERATE_AFTER_COMBINE_PROMPTS` | ✅ | 合併 prompt 後 |
| `GENERATE_AFTER_DATA` | ✅ | 資料組裝後 |
| `STREAM_TOKEN_RECEIVED` | ✅ | 流式 token 到來 |
| `SMOOTH_STREAM_TOKEN_RECEIVED` | ✅（@deprecated）| 已廢棄別名，與 `STREAM_TOKEN_RECEIVED` 值相同（均為 `'stream_token_received'`）；原始碼已註釋 `@deprecated The event is aliased to STREAM_TOKEN_RECEIVED.`；見第 15 章 U15.1 |
| `STREAM_REASONING_DONE` | ✅ | 推理階段結束 |
| `SD_PROMPT_PROCESSING` | ✅ | SD 影像提示處理 |

**聊天事件**

| 常量名 | v1.14.0 | 說明 |
|---|---|---|
| `CHAT_CHANGED`（`'chat_id_changed'`） | ✅ | 切換到另一個聊天 |
| `CHAT_LOADED` | staging 新增 | 聊天載入完成 |
| `CHAT_CREATED` | ✅ | 聊天被建立 |
| `CHAT_DELETED` | ✅ | 聊天被刪除 |
| `CHAT_RENAMED` | staging 新增 | 聊天被重新命名 |
| `GROUP_CHAT_CREATED` | ✅ | 群組聊天被建立 |
| `GROUP_CHAT_DELETED` | ✅ | 群組聊天被刪除 |

**角色事件**

| 常量名 | v1.14.0 | 說明 |
|---|---|---|
| `CHARACTER_EDITOR_OPENED` | ✅ | 角色編輯器開啟 |
| `CHARACTER_EDITED` | ✅ | 角色被編輯 |
| `CHARACTER_PAGE_LOADED` | ✅ | 角色頁面載入 |
| `CHARACTER_DELETED` | ✅（值為 `'characterDeleted'`，大小寫不一致，見原始碼註釋）| 角色被刪除 |
| `CHARACTER_DUPLICATED` | ✅ | 角色被複制 |
| `CHARACTER_RENAMED` | ✅ | 角色被重新命名 |
| `CHARACTER_RENAMED_IN_PAST_CHAT` | ✅ | 角色在歷史聊天中被重新命名 |
| `CHARACTER_FIRST_MESSAGE_SELECTED` | ✅ | 角色首條訊息被選中 |
| `CHARACTER_GROUP_OVERLAY_STATE_CHANGE_BEFORE` | ✅ | 群組疊加層狀態變更前 |
| `CHARACTER_GROUP_OVERLAY_STATE_CHANGE_AFTER` | ✅ | 群組疊加層狀態變更後 |
| `CHARACTER_MANAGEMENT_DROPDOWN` | ✅（值為 `'charManagementDropdown'`，命名不一致）| 角色管理下拉選單 |

**設定與預設事件**

| 常量名 | v1.14.0 | 說明 |
|---|---|---|
| `CHATCOMPLETION_SOURCE_CHANGED` | ✅ | Chat Completion 來源變更 |
| `CHATCOMPLETION_MODEL_CHANGED` | ✅ | Chat Completion 模型變更 |
| `MAIN_API_CHANGED` | ✅ | 主 API 變更 |
| `PRESET_CHANGED` | ✅ | 預設變更 |
| `PRESET_DELETED` | ✅ | 預設刪除 |
| `PRESET_RENAMED` | ✅ | 預設重新命名 |
| `PRESET_RENAMED_BEFORE` | ✅ | 預設重新命名前 |
| `OAI_PRESET_CHANGED_BEFORE` | ✅ | OAI 預設變更前 |
| `OAI_PRESET_CHANGED_AFTER` | ✅ | OAI 預設變更後 |
| `OAI_PRESET_EXPORT_READY` | ✅ | OAI 預設匯出就緒 |
| `OAI_PRESET_IMPORT_READY` | ✅ | OAI 預設匯入就緒 |
| `TEXT_COMPLETION_SETTINGS_READY` | ✅ | 文字補全設定就緒 |
| `CHAT_COMPLETION_SETTINGS_READY` | ✅ | Chat Completion 設定就緒 |
| `CHAT_COMPLETION_PROMPT_READY` | ✅ | Chat Completion prompt 就緒 |
| `ITEMIZED_PROMPTS_LOADED` | staging 新增 | 條目化 prompt 載入完 |
| `ITEMIZED_PROMPTS_SAVED` | staging 新增 | 條目化 prompt 儲存 |
| `ITEMIZED_PROMPTS_DELETED` | staging 新增 | 條目化 prompt 刪除 |

**世界書事件**

| 常量名 | v1.14.0 | 說明 |
|---|---|---|
| `WORLDINFO_SETTINGS_UPDATED` | ✅ | 世界書設定更新 |
| `WORLDINFO_UPDATED` | ✅ | 世界書更新 |
| `WORLDINFO_FORCE_ACTIVATE` | ✅ | 世界書強制啟用 |
| `WORLDINFO_ENTRIES_LOADED` | ✅ | 世界書條目載入完 |
| `WORLDINFO_SCAN_DONE` | staging 新增 | 世界書掃描完成 |
| `WORLD_INFO_ACTIVATED` | ✅ | 世界書條目被啟用 |

**群組事件**

| 常量名 | v1.14.0 | 說明 |
|---|---|---|
| `GROUP_UPDATED` | ✅ | 群組更新 |
| `GROUP_MEMBER_DRAFTED` | ✅ | 群組成員被草擬（選中發言） |
| `GROUP_WRAPPER_STARTED` | ✅ | 群組包裝器開始 |
| `GROUP_WRAPPER_FINISHED` | ✅ | 群組包裝器完成 |

**Persona 事件**（均為 staging 新增，v1.14.0 不存在）

| 常量名 | v1.14.0 | 說明 |
|---|---|---|
| `PERSONA_CHANGED` | staging 新增 | Persona 切換 |
| `PERSONA_CREATED` | staging 新增 | Persona 建立 |
| `PERSONA_UPDATED` | staging 新增 | Persona 更新 |
| `PERSONA_RENAMED` | staging 新增 | Persona 重新命名 |
| `PERSONA_DELETED` | staging 新增 | Persona 刪除 |

**連線與金鑰事件**

| 常量名 | v1.14.0 | 說明 |
|---|---|---|
| `CONNECTION_PROFILE_LOADED` | ✅ | 連線配置檔案載入 |
| `CONNECTION_PROFILE_CREATED` | ✅ | 連線配置檔案建立 |
| `CONNECTION_PROFILE_DELETED` | ✅ | 連線配置檔案刪除 |
| `CONNECTION_PROFILE_UPDATED` | ✅ | 連線配置檔案更新 |
| `ONLINE_STATUS_CHANGED` | ✅ | 線上狀態變更 |
| `SECRET_WRITTEN` | ✅ | 金鑰寫入 |
| `SECRET_DELETED` | ✅ | 金鑰刪除 |
| `SECRET_ROTATED` | ✅ | 金鑰輪換 |
| `SECRET_EDITED` | ✅ | 金鑰編輯 |
| `EXTRAS_CONNECTED` | ✅ | Extras 連線成功（Extras 已 OBSOLETE，此事件仍存在但實際不會觸發）|

**工具呼叫事件**

| 常量名 | v1.14.0 | 說明 |
|---|---|---|
| `TOOL_CALLS_PERFORMED` | ✅ | 工具呼叫執行完畢 |
| `TOOL_CALLS_RENDERED` | ✅ | 工具呼叫結果渲染 |

**TTS 事件**（均為 staging 新增，v1.14.0 不存在）

| 常量名 | v1.14.0 | 說明 |
|---|---|---|
| `TTS_JOB_STARTED` | staging 新增 | TTS 任務開始 |
| `TTS_AUDIO_READY` | staging 新增 | TTS 音訊就緒 |
| `TTS_JOB_COMPLETE` | staging 新增 | TTS 任務完成 |

**其他**

| 常量名 | v1.14.0 | 說明 |
|---|---|---|
| `MOVABLE_PANELS_RESET` | ✅ | 面板位置重置 |
| `FORCE_SET_BACKGROUND` | ✅ | 強制設定背景 |
| `IMAGE_SWIPED` | ✅ | 圖片 swipe |
| `OPEN_CHARACTER_LIBRARY` | ✅ | 開啟角色庫 |
| `FILE_ATTACHMENT_DELETED` | ✅ | 檔案附件刪除 |
| `MEDIA_ATTACHMENT_DELETED` | ✅ | 媒體附件刪除 |

---

## 7. 註冊 Slash Command

### 7.1 新式 SlashCommandParser（推薦）

**來源**：官方文件 [文件·多源]
**置信度**：high
**適用版本**：ST v1.14.0

```javascript
const {
  SlashCommandParser,
  SlashCommand,
  SlashCommandNamedArgument,
  SlashCommandArgument,
  ARGUMENT_TYPE
} = SillyTavern.getContext();

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
  name: 'my-cmd',
  callback: (namedArgs, unnamedArgs) => {
    const count = namedArgs.count ?? 3;
    const text = unnamedArgs.toString();
    return Array(Number(count)).fill(text).join(' ');
  },
  aliases: ['mc', 'mycmd'],
  returns: 'repeated text',
  namedArgumentList: [
    SlashCommandNamedArgument.fromProps({
      name: 'count',
      description: 'number of repetitions',
      typeList: [ARGUMENT_TYPE.NUMBER],
      defaultValue: '3',
    }),
    SlashCommandNamedArgument.fromProps({
      name: 'upper',
      description: 'convert to uppercase',
      typeList: [ARGUMENT_TYPE.BOOLEAN],
      defaultValue: 'off',
      enumList: ['on', 'off'],
    }),
  ],
  unnamedArgumentList: [
    SlashCommandArgument.fromProps({
      description: 'text to repeat',
      typeList: [ARGUMENT_TYPE.STRING],
      isRequired: true,
    }),
  ],
  helpString: '<div>Repeats the provided text N times.</div>',
}));
```

**ARGUMENT_TYPE 完整列表**：

| 型別常量 | 說明 |
|---|---|
| `STRING` | 字串 |
| `NUMBER` | 數字 |
| `BOOLEAN` | 布林值 |
| `RANGE` | 範圍（如 `1-10`） |
| `CLOSURE` | 閉包（STScript 匿名函式） |
| `VARIABLE_NAME` | 變數名引用 |
| `LIST` | 列表 |
| `DICTIONARY` | 字典 |

### 7.2 老式 registerSlashCommand（deprecated）

**來源**：ST 內部原始碼 [執行時原始碼]
**置信度**：high（可用），穩定性 medium（隨時可能移除）

```javascript
import { registerSlashCommand } from "../../slash-commands.js";

registerSlashCommand(
  "name",                    // 命令名
  function(args) { /* callback */ },
  ["alias"],                 // 別名陣列
  "Help text",               // 幫助文字
  true,                      // 在 /help 中顯示
  true                       // 接受管道輸入
);
```

---

## 8. generate_interceptor（提示詞攔截）

**來源**：官方文件 [文件·多源] + 官方擴充套件原始碼（Extension-MessageLimit）[執行時原始碼]
**置信度**：high
**適用版本**：ST v1.14.0

在 manifest 中宣告攔截函式名（字串，不是 export 名）：

```json
{ "generate_interceptor": "MyExt_interceptGeneration" }
```

在 `index.js` 中將函式掛到 **globalThis**（必須，否則靜默失效）：

```javascript
globalThis.MyExt_interceptGeneration = async function(
  chat,        // 訊息陣列（可變，直接修改生效）
  contextSize, // 已計算的 token 數
  abort,       // 函式：abort(true) 阻止後續攔截器；abort(false) 停止整次生成
  type         // 生成型別字串
) {
  // 常見 type 值：'quiet' | 'regenerate' | 'impersonate' | 'swipe' | 'normal'
  if (type === 'quiet') return;  // 跳過安靜模式生成

  // 示例：在最後一條使用者訊息前插入系統註釋
  const systemNote = {
    is_user: false,
    name: 'System',
    send_date: Date.now(),
    mes: '[Injected by extension]',
  };
  chat.splice(chat.length - 1, 0, systemNote);
};
```

**避坑**：函式必須掛 `globalThis`，不能只是模組作用域函式（ST 框架透過字串函式名在全域性查詢）。掛錯不報錯，靜默失效。

---

## 9. Lifecycle Hooks（manifest.hooks）

**來源**：當前官方 UI Extensions 文件 + v1.18.0 release notes + v1.14.0 本地原始碼歷史快照
**置信度**：high（兩個版本截面的結論已經分開）[官方文件·釋出記錄·執行時原始碼]
**適用版本**：當前釋出線支援；v1.14.0 歷史快照不可依賴。施工仍須用最低版本真機驗證。

> **版本裁決（2026-07-14）**：v1.14.0 無 manifest lifecycle hooks；v1.17.0 釋出線引入 lifecycle hooks；v1.18.0 release notes 記錄內建擴充套件遷移到 `activate` 並增加 `clean` hook。使用下方完整 hook 集時應把 `minimum_client_version` 至少寫到已核支援 `clean` 的版本，並對最低支援版與當前版各測一次。

manifest 中宣告函式名，函式須從 `index.js` export：

```json
{
  "minimum_client_version": "1.18.0",
  "hooks": {
    "install":  "onInstall",
    "activate": "onActivate",
    "enable":   "onEnable",
    "disable":  "onDisable",
    "update":   "onUpdate",
    "delete":   "onDelete",
    "clean":    "onClean"
  }
}
```

所有鉤子均可選，無引數，可返回 Promise（超時限制 5 秒）：

```javascript
// 首次安裝：初始化預設資料
export async function onInstall() {
  const { extensionSettings, saveSettingsDebounced } = SillyTavern.getContext();
  if (!extensionSettings[MODULE_NAME]) {
    extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    saveSettingsDebounced();
  }
}

// 擴充套件自身載入期的同步初始化；早於 APP_INITIALIZED
export async function onActivate() {
  await init();
}

// 擴充套件被啟用前（使用者在管理面板點選啟用）
export async function onEnable() {
  // 註冊事件監聽、初始化執行時狀態
}

// 擴充套件被停用前（使用者在管理面板點選停用）
export async function onDisable() {
  const { eventSource, event_types } = SillyTavern.getContext();
  // 必須清理事件監聽，否則停用後仍會觸發
  eventSource.removeListener(event_types.MESSAGE_RECEIVED, onMessageReceived);
}

// 成功更新後（reload toast 顯示前）
export async function onUpdate() {
  // 遷移舊設定格式到新格式
}

// 擴充套件被從伺服器刪除前
export async function onDelete() {
  // 清理遠端資料
}

// 使用者點選"Clean extension data"時
export async function onClean() {
  const { localforage } = SillyTavern.libs;
  await localforage.removeItem(`${MODULE_NAME}_cache`);
}
```

**三階段時序**：

| 時機 | 對應鉤子/事件 | loader 狀態 | 適用場景 |
|---|---|---|---|
| 擴充套件載入期 | `onActivate` | 仍在 | 只依賴本擴充套件的同步初始化；不要假定其他擴充套件/UI 已完成 |
| 全部擴充套件/UI 初始化後 | `APP_INITIALIZED` | 仍在 | 依賴其他擴充套件或完整宿主 UI 的初始化 |
| 應用完全就緒 | `APP_READY` | 已移除（使用者可互動） | 慢非同步後續工作、網路/API 呼叫 |

`onActivate` 不等於 `APP_INITIALIZED`。錯用時機會導致依賴物件或 DOM 尚未存在，也可能讓慢任務阻塞 loader。目標若必須相容 v1.14.0，不能依賴 hooks/APP_INITIALIZED；應保留該版本專用的模組頂層初始化 + `APP_READY` 路徑，或提高最低支援版本。

---

## 10. getContext() 完整 API 參考

**來源**：官方文件 [文件·多源] + v1.14.0 `public/scripts/st-context.js` [執行時原始碼]
**置信度**：high（已與 v1.14.0 st-context.js 原始碼交叉驗證）
**適用版本**：ST v1.14.0

```javascript
const context = SillyTavern.getContext();
```

**狀態屬性**

| 屬性 | 型別 | 說明 |
|---|---|---|
| `chat` | array | 當前聊天訊息陣列（可變） |
| `characters` | array | 所有角色列表 |
| `characterId` | number\|undefined | 當前角色索引（群組時為 undefined）；原始碼欄位名 `this_chid` 對映為此 |
| `groups` | array | 群組列表 |
| `groupId` | string\|null | 當前群組 ID |
| `chatId` | string\|undefined | 當前聊天檔名（原始碼新增，草稿遺漏） |
| `chatMetadata` | object | 聊天級元資料；原始碼欄位 `chat_metadata` |
| `extensionSettings` | object | 擴充套件設定儲存根物件；原始碼欄位 `extension_settings` |
| `onlineStatus` | string | 線上狀態；原始碼欄位 `online_status` |
| `maxContext` | number | 最大 token 上下文數 |

**事件**

| 屬性 | 型別 | 說明 |
|---|---|---|
| `eventSource` | EventEmitter | 事件匯流排 |
| `event_types` | object | 所有事件常量（見第 6.2 節）；原始碼中同時暴露新式 `eventTypes` 和相容 `event_types` 兩個欄位 |

**方法**

| 方法 | 返回值 | 說明 |
|---|---|---|
| `saveSettingsDebounced()` | void | 防抖儲存擴充套件設定 |
| `saveMetadata()` | Promise | 儲存 chatMetadata |
| `renderExtensionTemplateAsync(folder, name, data)` | Promise\<string\> | 渲染 Handlebars 模板 |
| `addLocaleData(locale, obj)` | void | 註冊 i18n 翻譯 |
| `writeExtensionField(charId, key, value)` | Promise | 寫角色卡 extensions 欄位 |
| `generateQuietPrompt(options)` | Promise\<string\> | 安靜模式生成（有聊天上下文） |
| `generateRaw(options)` | Promise\<string\> | 裸 LLM 呼叫（無角色上下文） |
| `getPresetManager()` | object | 獲取預設管理器 |
| `registerFunctionTool(config)` | Promise | 註冊 function calling 工具 |
| `registerDataBankScraper(config)` | Promise | 註冊資料銀行抓取器 |
| `registerDebugFunction(id, name, desc, fn)` | void | 註冊除錯函式（出現在 Power User 選單） |

**UI 類**

| 屬性 | 型別 | 說明 |
|---|---|---|
| `Popup` | class | Popup 對話方塊類 |
| `POPUP_TYPE` | enum | Popup 型別常量 |
| `POPUP_RESULT` | enum | Popup 結果常量 |
| `showLoader` / `hideLoader` | function | 載入遮罩控制（草稿誤寫為 `loader` 物件，實為兩個分離函式）[執行時原始碼] |
| `callGenericPopup` | function | 新式 Popup 呼叫（`callPopup` 已 @deprecated）|

**Slash Command 類**

| 屬性 | 型別 | 說明 |
|---|---|---|
| `SlashCommandParser` | class | slash command 註冊器 |
| `SlashCommand` | class | slash command 構建類 |
| `SlashCommandNamedArgument` | class | 具名引數構建類 |
| `SlashCommandArgument` | class | 位置引數構建類 |
| `ARGUMENT_TYPE` | enum | 引數型別常量 |

**其他**

| 屬性 | 說明 |
|---|---|
| `messageFormatting` | 訊息格式化鉤子（草稿誤寫為 `messageFormatter`，原始碼實際欄位名為 `messageFormatting`）[執行時原始碼] |
| `registerMacro` / `unregisterMacro` | 宏註冊/登出（草稿誤寫為 `macros` 物件，實為兩個方法；新式 API 為 `macros.register()`，需確認版本）[執行時原始碼] |
| `swipe` | 物件，含 `left`/`right`/`show`/`hide`/`refresh`/`isAllowed` 方法（原始碼新增，草稿遺漏） |
| `variables` | 物件，含 `local.get`/`local.set`/`global.get`/`global.set`（原始碼新增，草稿遺漏） |

**SillyTavern.libs 內建第三方庫**（可直接使用，無需 import）：

`lodash` / `Fuse` / `DOMPurify` / `hljs` / `localforage` / `Handlebars` / `css` / `Bowser` / `DiffMatchPatch` / `Readability` / `isProbablyReaderable` / `SVGInject` / `showdown` / `moment` / `seedrandom` / `Popper` / `droll` / `morphdom` / `slideToggle` / `chalk` / `yaml`

> **v1.14.0 校準** [執行時原始碼]：以上列表經 `public/lib.js` 直讀確認，共 22 個庫。草稿原列的 `chevrotain`、`gzipSync`、`gzip` 在 v1.14.0 `lib.js` 中**不存在**，已移除；若需在 staging 版本使用，請先驗證。

---

## 11. 第三方擴充套件安裝結構與釋出

**來源**：官方文件 [文件·多源]
**置信度**：high
**適用版本**：ST v1.14.0

### 目錄結構

```
my-extension/
├── manifest.json         # 必須
├── index.js              # 入口（manifest.js 欄位指向的檔案）
├── style.css             # 可選
├── settings.html         # 可選（Settings Panel HTML/Handlebars 模板）
├── i18n/
│   ├── zh-cn.json
│   └── zh-tw.json
└── README.md
```

### 安裝方式

- **UI 安裝**：Extensions → Install Extension → 貼上 GitHub 倉庫 URL（可指定 branch）
- **本地開發**：將倉庫克隆到 `public/scripts/extensions/third-party/<name>/` 或 `data/<user>/extensions/<name>/`
- ST 伺服器透過 `createGitClient` + `simple-git` 克隆到使用者擴充套件目錄

多人例項還要區分 current-user 與 all-users/管理員安裝。不要只看到檔案在伺服器上，就假定每個使用者都已啟用。

### 釋出到官方內容索引

官方內容索引的登記欄位、檔案位置和稽核流程會變化。2026-07-14 當前官方寫法要求先聯絡維護者確認收錄，不應繼續把“直接改某個 `extensions.json` 並執行固定指令碼”當永久流程。

釋出前至少準備：

- 公共倉庫、清晰許可證與 README；
- manifest 的版本、最低客戶端版本與依賴；
- 安裝、更新、解除安裝和遷移說明；
- 網路、提示詞、DOM、金鑰與 Server Plugin 許可權說明；
- 當前 release 的 smoke 結果；
- 按當日官方文件/維護者要求提交。

當前官方收錄硬門還包括：開源/libre license、相容最新 release、完整 README；**必須依賴 Server Plugin 才能工作的 UI Extension 不接受官方內容索引收錄**。這不妨礙使用者自行安裝，但必須如實說明管理員許可權和服務端風險。

---

## 12. Webpack 打包（Bundled Extension）

**來源**：官方文件 [文件·單源]
**置信度**：medium

用於需要 npm 包的擴充套件。官方提供兩個模板：

| 模板 | 地址 |
|---|---|
| 無框架 Webpack | https://github.com/SillyTavern/Extension-WebpackTemplate |
| React + Webpack | https://github.com/SillyTavern/Extension-ReactTemplate |

打包擴充套件內若確需 import ST 內部模組，需讓 webpack 忽略目標 URL；但優先使用 `SillyTavern.getContext()`，內部檔案路徑不屬於穩定 API。當前官方示例的宿主入口是 `/script.js`，舊稿的 `/scripts/extensions.js?webpackIgnore=true` 不應繼續複製。

```javascript
// 通用輔助函式：從 URL 動態 import，繞過 webpack 打包
export async function importFromUrl(url, what, defaultValue = null) {
  try {
    const module = await import(/* webpackIgnore: true */ url);
    if (!Object.hasOwn(module, what)) throw new Error(`No ${what} in module`);
    return module[what];
  } catch (error) {
    console.error(`Failed to import ${what} from ${url}: ${error}`);
    return defaultValue;
  }
}

// 僅當目標匯出已在目標 ST 版本核驗時使用
const verifiedExport = await importFromUrl('/script.js', 'verifiedExport');
```

上例刻意不聲稱某個具名匯出永久存在。能從 `getContext()` 取得的能力一律不走內部動態 import。

---

## 13. Server Plugin（對比 UI Extension）

**來源**：官方文件 [文件·多源]
**置信度**：high
**適用版本**：ST v1.14.0

### 對比表

| 維度 | UI Extension | Server Plugin |
|---|---|---|
| 執行環境 | 瀏覽器 | Node.js 服務端 |
| 安全沙箱 | 瀏覽器同源許可權；**無 ST 級許可權隔離**，可訪問 DOM/context | **無**（完整檔案系統訪問） |
| 啟用條件 | 預設啟用 | `config.yaml` 需設 `enableServerPlugins: true` |
| 存放位置 | `data/<user>/extensions/` | `plugins/` |
| API 路由字首 | N/A | `/api/plugins/<id>/` |
| 適用場景 | UI 互動、事件監聽、prompt 修改 | 新 API endpoint、Node.js 包、檔案系統訪問 |

### Server Plugin 示例

```javascript
// plugins/my-plugin.js
async function init(router) {
  router.get('/status', (req, res) => {
    res.json({ status: 'ok' });
  });
  return Promise.resolve();
}

async function exit() {
  return Promise.resolve();
}

module.exports = {
  init,
  exit,
  info: {
    id: 'my-plugin',
    name: 'My Plugin',
    description: 'Does something server-side',
  },
};
```

### UI Extension 中呼叫 Server Plugin 介面

```javascript
const resp = await fetch('/api/plugins/my-plugin/status');
const data = await resp.json();
```

---

## 14. 高頻避坑

**來源**：官方文件 [文件·多源] + v1.14.0 執行時原始碼 [執行時原始碼] + 社群 [社群]
**置信度**：medium·單源孤證（條目 2/5/9 有社群來源介入，其餘已有原始碼印證；整體混入社群單源，不宜整體標 high）

1. **相對 import 路徑脆弱**：`import from "../../../../script.js"` 在 ST 內部重構後立刻 break 且無報錯。新擴充套件一律用 `SillyTavern.getContext()`，老擴充套件遇到問題優先排查此項。

2. **jQuery 重複綁事件**：初始化程式碼若在 `APP_READY` 後多次執行（如每次 chat 切換時重新呼叫 init），`$.on()` 會累積註冊同一回撥。修復：用 `.off(eventName).on(eventName, handler)` 模式，或設單次初始化 flag。

3. **extension_settings 命名衝突**：key 必須用擴充套件資料夾名（全域性唯一），不要用 `settings`/`config`/`data` 等通用詞，否則與其他擴充套件發生名稱空間碰撞。

4. **大資料放 extension_settings 導致膨脹**：超過幾十 KB 的快取資料放 `extension_settings` 會使 `settings.json` 膨脹、每次儲存變慢。超限資料改用 `SillyTavern.libs.localforage`（IndexedDB）。

5. **saveSettingsDebounced 防抖延遲**：修改 settings 後立即重新整理頁面可能丟失最後一次寫入。目前無官方同步持久化 API，這是已知限制，設計時需注意資料重要性分級。

6. **renderExtensionTemplateAsync 路徑引數**：第一引數是 `'third-party/my-extension'`（相對 `/scripts/extensions/` 的目錄名），不是絕對路徑也不是檔名。路徑寫錯不報錯，靜默返回空字串。

7. **onActivate vs APP_READY 時機錯用**：在 `APP_READY` 才去注入關鍵 DOM 可能產生競態；在當前釋出線的 `onActivate` 中做慢網路請求又會阻塞 loader。若相容 v1.14.0，需使用模組頂層 + `APP_READY` 的歷史路徑，因為該快照未實現 hooks；不能把兩代初始化方式混寫成一條永久規則。

8. **event listener 記憶體洩漏**：`onDisable` 鉤子裡必須 `eventSource.removeListener(event_types.X, handler)` 清理所有監聽，否則擴充套件停用後仍會處理事件，且隨停用/啟用次數累積。

9. **DOMPurify 缺失導致 XSS**：將 LLM 輸出或使用者輸入插入 DOM 前必須用 `SillyTavern.libs.DOMPurify.sanitize()` 淨化，尤其是拼接 HTML 字串的場景。

10. **generate_interceptor 必須掛 globalThis**：函式只在模組作用域宣告不夠，ST 框架透過字串函式名在 `globalThis` 查詢。掛錯不報錯，靜默失效，極難排查。

11. **`requires` 欄位已基本無效**：SillyTavern-Extras 專案已標記為 OBSOLETE，新擴充套件不要在 `requires`/`optional` 填寫 Extras 模組名；留空陣列即可（`[]`）。

---

## 15. 懸案（未決項與驗證路徑）

以下條目置信度為 medium 或 low，施工前需真機驗證。**low 置信度項禁止直接施工。**

### U15.1 SMOOTH_STREAM_TOKEN_RECEIVED 與 STREAM_TOKEN_RECEIVED 是否同一事件

**置信度**：high [執行時原始碼]（已解決，從懸案升級）

v1.14.0 `public/scripts/events.js` 原始碼直讀確認（第 68-70 行）：

```javascript
/** @deprecated The event is aliased to STREAM_TOKEN_RECEIVED. */
SMOOTH_STREAM_TOKEN_RECEIVED: 'stream_token_received',
STREAM_TOKEN_RECEIVED: 'stream_token_received',
```

兩者 value 完全相同，均為 `'stream_token_received'`。`SMOOTH_STREAM_TOKEN_RECEIVED` 已被官方在原始碼中標記 `@deprecated`，**新程式碼應僅使用 `STREAM_TOKEN_RECEIVED`**。此項無需真機驗證，已有確定原始碼依據。

### U15.2 renderExtensionTemplateAsync 第二引數的檔案字尾

**置信度**：high [執行時原始碼]（已解決，從懸案升級）

v1.14.0 `public/scripts/extensions.js` 原始碼直讀確認（第 126 行）：

```javascript
return renderTemplateAsync(`scripts/extensions/${extensionName}/${templateId}.html`, ...);
```

函式內部固定拼接 `.html` 字尾，第二引數傳不帶字尾的檔名（如 `'settings'`）即可，實際查詢 `settings.html`。**`.handlebars` 字尾不會被識別**。此項無需真機驗證，已有確定原始碼依據。

### U15.3 extensions_settings 與 extensions_settings2 當前是否同時存在

**置信度**：high [執行時原始碼]（已解決，從懸案升級）

v1.14.0 `public/index.html` 原始碼直讀確認（第 5459、5477 行）：

```html
<div id="extensions_settings" class="flex1 wide50p">
<div id="extensions_settings2" class="flex1 wide50p">
```

兩者在同一容器內並排存在於 DOM。無需 F12 驗證，此項已確定。

### U15.4 onActivate / APP_INITIALIZED / APP_READY 時序（已裁決）

**置信度**：high [官方文件·釋出記錄]

三者不是等價入口：`onActivate` 屬於擴充套件自身載入期；`APP_INITIALIZED` 在所有擴充套件/UI 初始化後、loader 仍在；`APP_READY` 在應用可互動後。剩餘驗證只針對具體擴充套件的依賴和效能，不再把三者合併成同一時機。

### U15.5 老式相對 import 在 1.12+ 多使用者模式下的路徑是否需調整

**置信度**：low [推斷]（禁止施工）

1.12+ 多使用者模式下擴充套件路徑從 `public/scripts/extensions/third-party/` 遷移至 `data/<user>/extensions/`，但 HTTP URL 仍對映到 `/scripts/extensions/third-party/`。老式相對 import 的層級（`../../../extensions.js`）是基於 HTTP URL 還是檔案系統路徑計算，在多使用者模式下是否還有效，目前無實測資料。

**驗證路徑**：在 1.12+ 多使用者 ST 中，將使用老式 import 的擴充套件安裝到使用者作用域（`data/<user>/extensions/`），檢查瀏覽器 Network 面板中 import 解析的實際 URL 是否正確，觀察是否有 404 錯誤。

**此項為 low，禁止直接施工。**

### U15.7 manifest.hooks 的版本邊界（已裁決）

**置信度**：high [執行時原始碼·官方文件·釋出記錄]

v1.14.0 本地 `public/scripts/extensions.js` 逐行審查後，**未發現任何讀取 `manifest.hooks` 欄位並呼叫對應匯出函式的程式碼**：
- `addExtensionScript` 僅以 `<script type="module">` 動態注入 JS 檔案
- `enableExtension`/`disableExtension` 僅修改 `disabledExtensions` 陣列並重新整理頁面
- `installExtension`/`deleteExtension` 同樣無 hooks 派發邏輯

結論分代：**v1.14.0 無 hooks；v1.17.0 引入 lifecycle hooks；v1.18.0 已核 `clean` 與 `activate` 遷移記錄**。新擴充套件按實際使用的 hook 集設定最低客戶端版本；若宣稱相容 v1.14.0，必須另寫無 hooks 初始化/清理路徑。

### U15.6 localforage 儲存 key 名稱空間與 ST 核心 token cache 是否隔離

**置信度**：medium·推導未驗證 [推斷]

ST 核心自身也使用 localforage 快取 token 等資料，若 key 命名規範不一致可能發生碰撞。

**驗證路徑**：檢視 ST 原始碼中所有 `localforage.setItem` 呼叫，統計其 key 字首規律；確認擴充套件使用 `${MODULE_NAME}_xxx` 形式命名是否與核心 key 無衝突。

---

## 16. 外掛術語、安裝渠道與作用域

### 16.1 四種執行層不要混寫

| 名稱 | 執行位置 | 安裝/攜帶方式 | 主冊 |
|---|---|---|---|
| UI Extension | ST 瀏覽器宿主 | 使用者/管理員安裝擴充套件倉庫 | D5 |
| Server Plugin | ST Node.js 服務端 | 管理員放入 `plugins/` 並啟用 | D5 |
| Tavern Helper 卡內指令碼 | TH 管理的卡片指令碼 iframe | 隨卡資料/指令碼樹攜帶 | E5 |
| STScript / Quick Replies | ST 命令與快捷回覆執行時 | 使用者配置/匯入 | B2 |

它們都可能被口語稱為“外掛”，但許可權、生命週期、API 和分發完全不同。尤其不能把卡內指令碼的 `eventOn/getButtonEvent` 寫進 UI Extension，也不能把 `SillyTavern.getContext()` 當作 TH iframe 全域性能力。

### 16.2 三類安裝渠道

1. **內建功能**：隨 ST 安裝，由設定開關控制；
2. **官方內容索引/可安裝擴充套件**：從當前官方登記源發現，仍需使用者確認；
3. **第三方倉庫 URL**：使用者直接安裝，信任與相容審查責任更高。

“在官方索引出現”不等於安全審計擔保；“倉庫 star 多”也不等於適合當前版本。安裝前仍要檢查 manifest、入口、網路和許可權。

### 16.3 當前使用者與全體使用者

多人 ST 例項中要記錄：

- 誰發起安裝；
- 安裝在 current-user 還是管理員/全體使用者作用域；
- 設定是使用者獨立還是服務端共享；
- 更新/解除安裝是否會影響其他使用者；
- Server Plugin 是否由例項管理員批准。

角色卡作者通常無權替使用者或管理員作這些決定。

---

## 17. 依賴、更新、解除安裝與安全審查

### 17.1 `manifest.dependencies`

當前官方規則中，依賴使用擴充套件資料夾路徑標識。依賴缺失或被停用時，依賴它的擴充套件不應載入。示意：

```json
{
  "display_name": "My Extension",
  "version": "1.2.0",
  "dependencies": [
    "third-party/base-extension"
  ]
}
```

精確路徑和欄位行為隨目標版本核驗。不要把歷史 `requires/optional`（SillyTavern-Extras 模組）與當前擴充套件依賴混為一談。

### 17.2 安裝前審查清單

- 倉庫、作者、許可證、最近維護狀態；
- manifest 的入口、最低客戶端版本、依賴、`auto_update`；
- `index.js` 是否讀取聊天、角色、settings、金鑰或 Cookie；
- 是否修改 prompt、攔截 generation、註冊工具或命令；
- 是否訪問父視窗、注入未淨化 HTML、使用 `eval/new Function`；
- 網路請求目標、上傳資料和遙測；
- 是否包含/要求 Server Plugin；
- 是否靜默安裝其他擴充套件；
- 啟用/停用/刪除時能否清理監聽、DOM、timer 和持久資料。

UI Extension 處於瀏覽器同源環境，可訪問 ST DOM 和 context，不是“只能改顏色”的安全沙箱；Server Plugin 更無沙箱並可訪問檔案系統。二者都屬於主動程式碼信任邊界。

### 17.3 `auto_update` 的邊界

`auto_update` 的精確語義是隨 ST 包版本更新流程自動更新擴充套件，不等於任何時刻後臺自動追蹤最新 commit。指南、README 和 UI 不能把它描述成萬能自動更新器。

### 17.4 更新流程

```text
記錄當前 remote/branch/commit/version
→ 匯出重要設定
→ 閱讀 changelog 和最低 ST 版本
→ 檢查依賴與遷移
→ 更新
→ 過載
→ smoke：啟動/UI/事件/生成/設定/停用
→ 失敗則回到已核 commit
```

生產例項不建議永久跟隨未鎖定的開發分支。至少記錄最後已核 commit，才能真正回滾。

### 17.5 停用、解除安裝與清理

| 動作 | 預期 |
|---|---|
| 停用 | 停止監聽/攔截/DOM；預設保留設定 |
| 啟用 | 冪等恢復一次，不重複繫結 |
| 解除安裝 | 刪除擴充套件程式碼；是否刪資料要明確 |
| Clean | 按 hooks/當前版本契約清理擴充套件資料 |
| 重灌 | 保持或遷移設定的行為要寫入 README |

解除安裝 UI 不應留下全域性事件、prompt 注入、style 或選單按鈕。Server Plugin 解除安裝前必須停止路由、任務和檔案控制代碼。

---

## 18. 角色卡依賴 UX、相容矩陣與回滾

### 18.1 不虛構卡片級 dependencies 欄位

Character Card 規範沒有等價於 UI Extension manifest 的原生 `dependencies` 安裝語義。角色卡依賴外掛時應：

- 在 creator notes 清楚列出；
- 在開局頁/狀態列執行時做能力檢測；
- 給出缺失、停用、版本過低的區別；
- 提供安裝連結或手動步驟；
- 使用者明確確認後才呼叫任何安裝能力；
- 不讓卡片靜默安裝第三方程式碼。

### 18.2 能力檢測優先於版本字串

```javascript
function detectRequirements() {
  return {
    tavernHelper: typeof window.TavernHelper === 'object',
    requiredApi: typeof window.someRequiredApi === 'function',
    requiredEvent: Boolean(window.tavern_events?.CHAT_CHANGED),
  };
}
```

版本號用於診斷和最低門；真正啟動仍檢查所需函式、事件和 DOM。版本相同但安裝分支、停用狀態或構建差異都可能導致能力不同。

### 18.3 缺依賴時的產品狀態

至少選擇一種並明示：

- **阻斷**：核心玩法無法成立，停止並給安裝/重試；
- **只讀降級**：可看敘事和靜態狀態，禁止寫入；
- **功能降級**：隱藏依賴功能，正常聊天繼續；
- **開發預覽**：僅供作者檢查 UI，不偽裝已經持久化。

空白、按鈕無反應和控制檯報錯都不是降級方案。

### 18.4 相容矩陣

| ST 版本 | 外掛版本/commit | 關鍵 API | 已核日期 | 結果 | 降級/回滾 |
|---|---|---|---|---|---|
| 最低支援版 | 固定 | hooks / context / event | YYYY-MM-DD | 透過/限制 | 相容初始化 |
| 當前釋出版 | 固定 | 同上 + 新能力 | YYYY-MM-DD | 透過 | 已核 commit |

矩陣還應記錄瀏覽器、多人模式、移動端、其他關鍵擴充套件。不要寫“支援最新版”而沒有核驗日期。

### 18.5 最小 smoke

1. 冷啟動只初始化一次；
2. 設定 UI 可讀寫並重新整理保持；
3. 關鍵事件觸發一次；
4. 生成攔截可啟用/停用，不汙染 quiet/swipe；
5. 依賴停用時本擴充套件不載入或明確降級；
6. 停用後無 DOM、listener、prompt 殘留；
7. 更新遷移成功；
8. 回到已核 commit 後設置仍可恢復；
9. 若有 Server Plugin，鑑權、路徑、退出和檔案許可權單測；
10. 角色卡依賴門不會靜默自動安裝。

---

## 來源索引

| 來源 | 置信度等級 | 用途 |
|---|---|---|
| [UI Extensions 官方文件](https://docs.sillytavern.app/for-contributors/writing-extensions/) | high | 主力參考，多源驗證 |
| [Server Plugins 官方文件](https://docs.sillytavern.app/for-contributors/server-plugins/) | high | 第 13 章 |
| [SillyTavern Releases](https://github.com/SillyTavern/SillyTavern/releases) | high | 2026-07-14 當前釋出快照與 hooks 版本裁決 |
| [SillyTavern-Content](https://github.com/SillyTavern/SillyTavern-Content) | high | 當前內容索引；收錄流程仍以當日官方說明為準 |
| [events.js 原始碼（staging branch）](https://github.com/SillyTavern/SillyTavern/blob/staging/public/scripts/events.js) | medium·版本漂移 | staging 約 150 個事件，v1.14.0 僅 89 個；見第 6.2 節版本注意 |
| v1.14.0 本地原始碼（`public/scripts/events.js`、`st-context.js`、`extensions.js`、`lib.js`）| high [執行時原始碼] | 本次校準主力依據 |
| [city-unit/st-extension-example](https://github.com/city-unit/st-extension-example) | high | 最簡第三方示例（第 3.2、3.3 章） |
| [Extension-TopInfoBar manifest](https://github.com/SillyTavern/Extension-TopInfoBar/blob/main/manifest.json) | high | 帶 i18n 官方示例 |
| [Extension-MessageLimit manifest](https://github.com/SillyTavern/Extension-MessageLimit/blob/main/manifest.json) | high | 帶 generate_interceptor 官方示例 |
| [DeepWiki Extension Architecture](https://deepwiki.com/SillyTavern/SillyTavern/8.1-extension-architecture-and-apis) | medium·單源孤證 | AI 生成的文件索引，非第一手官方來源；第 10 章參考 |
| [DeepWiki Extension Development Guide](https://deepwiki.com/SillyTavern/SillyTavern/10.2-extension-development-guide) | medium·單源孤證 | AI 生成的文件索引，非第一手官方來源；綜合參考 |
| [Extension-ReactTemplate](https://github.com/SillyTavern/Extension-ReactTemplate) | medium | Webpack+React 打包模板（第 12 章） |
| [ST 1.12.0 Migration Guide](https://docs.sillytavern.app/installation/st-1.12.0-migration-guide/) | high | 多使用者路徑變化背景（懸案 U15.5） |
