# ST 群聊與多角色機制

> 文件版本：v1.0.0 ｜ 最後更新：2026-07-14

> SillyTavern Group Chat 的完整機制參考——發言策略、角色卡注入、世界書疊加、STscript 控制與實戰正規化。

---

## 置信度分級體系

- **high**：官方文件多源交叉確認，或已知合併的執行時原始碼分析，可直接施工。
- **medium**：文件單源、原始碼推斷、社群討論，或有歷史 Bug 懸案；可參考但須真機確認關鍵路徑。
- **low**：孤證無源，禁止據此施工。

依據型別軸：`[執行時原始碼]` / `[真機]` / `[文件·多源]` / `[文件·單源]` / `[社群]` / `[推斷]`

收集日期：2026-06-28
回源基於：SillyTavern v1.14.0 + 本地成熟卡（卡A 2.5.0 / 卡B 2.6.0）

---

## 目錄

1. 機制總覽
2. 成員管理
3. 發言順序策略
   - 3.1 策略總覽
   - 3.2 Natural Order 三步演算法
4. Character Info 處理模式
   - 4.1 Swap Character Cards（預設）
   - 4.2 Join Character Cards（合併模式）
   - 4.3 Join Prefix/Suffix 自定義分隔符
5. 關鍵 API 欄位參考
   - 5.1 群聊專用宏
   - 5.2 核心 STscript 命令
   - 5.3 原始碼層關鍵函式
6. 自動模式（Auto-mode）
7. 群聊與單聊差異對比
   - 7.1 世界書（World Info / Lorebook）
   - 7.2 Author's Note
   - 7.3 STscript 變數
   - 7.4 正則表示式（Regex Extension）
   - 7.5 Persona（使用者人格）
   - 7.6 Regenerate（重新生成）
   - 7.7 Scenario Override（場景覆蓋）
8. 實戰正規化程式碼
9. 高頻避坑
10. 懸案（需真機驗證）
11. 來源彙總

---

## 1. 機制總覽

SillyTavern 群聊（Group Chat）是在普通單聊基礎上擴充套件的多角色協同框架。

**核心特徵：**

- **共享聊天曆史**：所有成員共用同一條訊息流，無私有上下文。
- **按輪次啟用單一角色**：每輪 generation 由"發言順序策略"決定誰發言，generation 型別固定為 `Normal`（等價於點擊發送鍵的標準推理流程）。
- **Character Info 按模式切換**：預設每輪僅注入當前發言者的卡片資訊（Swap 模式），或合併所有成員（Join 模式）。
- **1.15.0 重大破壞性變更（2025-12）**：群聊 metadata 格式與普通聊天統一，舊版群聊檔案自動遷移但不向後相容。

來源：docs.sillytavern.app/usage/core-concepts/groupchats、DeepWiki、ST Discussion #4926
適用版本：v1.14.0+（1.15.0 注意破壞性變更）
置信度：**high** `[文件·多源]`

---

## 2. 成員管理

| 操作 | 說明 |
|------|------|
| 新增成員 | 任何現有角色卡都可加入；新成員預設插入列表頂部 |
| 重排序 | 使用列表中的上下箭頭調整順序 |
| 靜音（Mute） | 停用該成員自動發言；仍可被 Force Talk 強制觸發 |
| Force Talk | 強制指定成員發言，繞過所有啟用策略 |
| 刪除成員 | 從群組移除，不刪除角色卡本身 |
| Peek Definitions | 快速預覽/編輯成員角色卡，無需離開群聊 |

來源：docs.sillytavern.app/usage/core-concepts/groupchats
適用版本：v1.12.0+
置信度：**high** `[文件·多源]`

---

## 3. 發言順序策略

### 3.1 策略總覽

| 策略 | 機制 | 適用場景 |
|------|------|---------|
| **Manual（手動）** | 使用者從選單選擇或 `/trigger <名字>` 命令 | 完全人工控制 |
| **Natural Order（自然順序）** | 三步演算法：@提及 → Talkativeness → 隨機兜底 | 模擬真實對話 |
| **List Order（列表順序）** | 按成員列表從上到下依次輪換 | 有序輪轉 |
| **Pooled Order（池化順序）** | 從本輪未發言成員中隨機選一；全員發言後重置 | 確保每輪不重複 |

來源：docs.sillytavern.app/usage/core-concepts/groupchats
適用版本：v1.12.0+
置信度：**high** `[文件·多源]`

### 3.2 Natural Order 三步演算法

**Step 1 — @提及檢測（Mention Detection）**

- 從最後一條訊息中提取群成員名字。
- **僅識別完整詞（whole word match）**：名字為 "Misaka Mikoto" 時，"Misaka" 和 "Mikoto" 均觸發，"Misa" 不觸發。
- 提到名字的成員被加入「啟用候選列表」。
- **除非啟用 "Allow Self Responses"，否則角色不會響應自己訊息中的自我提及。**

**Step 2 — Talkativeness 機率啟用**

- 每個未被提及的成員按其 Talkativeness 值獨立判斷是否發言。
- 範圍 0%–100%，線性機率：
  - 0% = 完全害羞（僅響應提及）
  - 100% = 總是發言
  - 預設 50%
- 配置路徑：角色卡 Advanced Definitions 面板。

**Step 3 — 隨機兜底**

- 若 Step 1 和 Step 2 均未啟用任何成員，優先從 talkativeness > 0 的成員中隨機選一位；若所有成員 talkativeness 均為 0，則從全部成員中隨機選一位。
- 注意：Natural Order 還有"防連續"機制：無論哪一步，上一條訊息的發言者（bannedUser）均被排除，除非啟用 "Allow Self Responses"（原始碼 `allowSelfResponses` 標誌）。

來源：docs.sillytavern.app/usage/core-concepts/groupchats + v1.14.0 原始碼 `activateNaturalOrder()`
適用版本：v1.12.0+
置信度：**high** `[文件·多源]` （兜底細節及 bannedUser 邏輯由 v1.14.0 執行時原始碼 `[執行時原始碼]` 補充確認）

---

## 4. Character Info 處理模式

群聊中每次 generation 時，角色卡資訊（description / personality / scenario / example messages / character note）的注入方式由此設定控制。

### 4.1 Swap Character Cards（預設）

**核心結論：**

- 每輪 generation 僅注入當前發言者的完整角色卡。
- 其他成員的卡完全不進 context。
- Character Note（角色筆記）正常注入。

來源：docs.sillytavern.app/usage/core-concepts/groupchats
適用版本：v1.12.0+
置信度：**high** `[文件·多源]`

### 4.2 Join Character Cards（合併模式）

**核心結論：**

- 將所有啟用成員的角色卡合併為一個 joint prompt，按成員列表順序。
- 合併欄位：description、personality、scenario、example messages、character note。
- 子選項（原始碼層對應 `group_generation_mode`）：
  - `Include muted`（`APPEND` 模式）：所有成員（含被靜音/停用成員）均包含在合併中。
  - `Exclude muted`（`APPEND_DISABLED` 模式）：停用/靜音成員被跳過，**但當前發言者（active speaker）無論是否被標記為 disabled 均強制包含**（原始碼條件：`characterId !== index`）。
- **官方文件警告**：可能導致角色個性混淆、特徵融合等異常，不建議用於強調獨立角色個性的場景。

**原始碼分析（v1.14.0）與 Bug 更新：**

`getGroupCharacterCards()` 原始碼直讀確認：該函式**根本不處理 character_note**，返回結構只含 `{description, personality, scenario, mesExamples}`。character_note 在 Join 模式下是否透過其他 context 注入路徑（如 Author's Note 機制）送入 prompt，尚未完整溯源（見第 10 章 U1 懸案）。

Issue #3550（2025-02-24，狀態：Open/Not Reproducible）：原報告人描述 character note 缺失，與原始碼行為一致；Issue 標"Not Reproducible"可能因維護者測試版本或配置差異。v1.14.0 實際行為需真機確認 character_note 的注入路徑。

來源：docs.sillytavern.app + v1.14.0 原始碼（`getGroupCharacterCards()` 直讀）+ Issue #3550
適用版本：v1.12.0+（Bug 報告於 v1.12.12）
置信度：**high** `[執行時原始碼]`（Join 模式合併欄位已由原始碼直讀確認；character_note 不在合併範圍同樣由原始碼證實；U1 懸案僅針對 character_note 透過其他注入路徑的可能性）

### 4.3 Join Prefix/Suffix 自定義分隔符

在 Join 模式下可為每個角色卡欄位自定義分隔符格式：

```
支援宏：
  {{char}}      替換為當前成員名
  <FIELDNAME>   替換為欄位名（如 description、personality）

示例格式："## {{char}}'s <FIELDNAME>:"
```

> [!NOTE] 原始碼補充（v1.14.0 `getGroupCharacterCards()`）：字首/字尾均經 `customBaseChatReplace()` 處理，`<FIELDNAME>` 的替換髮生在宏引擎之前；實際拼接欄位為 description / personality / scenario / mesExamples（`mes_example`），**不含 character_note（角色筆記）**——該欄位不在 Join 合併範圍內（見第 4.2 節 Bug 懸案 U1）。

來源：docs.sillytavern.app/usage/core-concepts/groupchats + v1.14.0 原始碼 `getGroupCharacterCards()`
置信度：**medium·單源孤證** `[文件·單源]`（文件僅單源；函式名及宏機制已由 `[執行時原始碼]` 交叉核實，但整體條目基於文件單一來源）

---

## 5. 關鍵 API 欄位參考

### 5.1 群聊專用宏

| 宏 | 含義 | 群聊行為 |
|----|------|---------|
| `{{char}}` | 當前角色名 | 返回當前發言者名字 |
| `{{user}}` | 使用者/Persona 名 | 正常工作 |
| `{{group}}` | 群成員名列表 | 逗號分隔，含靜音成員 |
| `{{groupNotMuted}}` | 未靜音成員列表 | 逗號分隔，排除靜音成員 |
| `{{charIfNotGroup}}` | 單聊時的角色名 | 群聊中返回空字串 |
| `{{notChar}}` | 除當前發言者外所有參與者 | 群聊中有效 |

來源：docs.sillytavern.app/usage/core-concepts/macros
適用版本：v1.12.0+
置信度：**medium·單源孤證** `[文件·單源]`（宏列表來自官方宏文件單一頁面；內容已與宏文件原文交叉確認，但未透過原始碼或真機驗證宏在群聊中的具體行為）

### 5.2 核心 STscript 命令

| 命令 | 語法 | 功能 |
|------|------|------|
| `/trigger` | `/trigger [角色名/1-based索引]` | 手動觸發指定成員發言（Normal generation） |
| `/trigger`（空） | `/trigger` | 空輸入時隨機選一名未靜音成員 |
| `/sendas` | `/sendas 角色名 訊息內容` | 以指定角色傳送訊息（無 generation） |

備註：`/trigger` 支援全名或成員列表中的 1-based 數字索引（如 `/trigger 2` 觸發列表第 2 位成員）。

來源：docs.sillytavern.app/usage/st-script
適用版本：v1.12.0+
置信度：**high** `[文件·多源]`

### 5.3 原始碼層關鍵函式（group-chats.js）

| 函式 | 作用 |
|------|------|
| `getGroupCharacterCards()` | 合併所有成員角色卡（Join/APPEND 模式）；返回 `{description, personality, scenario, mesExamples}`——**不含 character_note** |
| `getGroupDepthPrompts()` | 聚合所有成員的 depth prompts（APPEND / APPEND_DISABLED 模式；SWAP 模式直接返回 `[]`） |
| `regenerateGroup()` | 按 `gen_id` 回刪同批次所有訊息（非"回到最後使用者訊息"），然後調 `generateGroupWrapper(false, 'normal', ...)` 重觸發 generation |
| `validateGroup(group)` | 確保成員存在（按 avatar 或 name 匹配）、去重 |
| `setAutoModeWorker()` | 初始化自動模式計時器；間隔可配置（`auto_mode_delay`，預設 5 秒，常量 `DEFAULT_AUTO_MODE_DELAY = 5`） |
| `_save(group, reload)` | 持久化群組 metadata 到 `/api/groups/edit` |

> [!CAUTION] DeepWiki 記錄的函式名 `getGroupCharacterCardsLazy` 在 v1.14.0 原始碼中**不存在**，實際為 `getGroupCharacterCards()`。DeepWiki 系 AI 自動生成文件，存在函式名漂移風險，不可作為原始碼高可信引用。

來源：v1.14.0 執行時原始碼（`public/scripts/group-chats.js` 直讀）
適用版本：v1.14.0
置信度：**high** `[執行時原始碼]`（本條已直接閱讀原始碼，降棄 DeepWiki 引用）

---

## 6. 自動模式（Auto-mode）

**核心結論：**

- 啟用後，按選定發言策略自動觸發 generation，無需使用者點選。
- **觸發間隔：上一條訊息傳送後延遲 5 秒**（`setAutoModeWorker()` 實現）。
- 使用者開始在輸入框打字時，Auto-mode 被停用，但已排隊的 generation 不會立即停止。
- 適合：掛機劇情推進、自動對話演示場景。

避坑：使用者一旦在輸入框打字，auto-mode 關閉，打字期間已排隊的 generation 不中斷，可能造成意外發言。

來源：docs.sillytavern.app/usage/core-concepts/groupchats + v1.14.0 原始碼（`DEFAULT_AUTO_MODE_DELAY = 5`、`setInterval(groupChatAutoModeWorker, autoModeDelay * 1000)`）
適用版本：v1.12.0+
置信度：**medium·單源孤證** `[文件·單源]`（5 秒間隔已由原始碼 `[執行時原始碼]` 交叉確認；但"打字即關閉 auto-mode"及"已排隊不中斷"行為僅文件單源，未在原始碼中直接驗證）

---

## 7. 群聊與單聊差異對比

### 7.1 世界書（World Info / Lorebook）

| 層級 | 群聊行為 |
|------|---------|
| **全域性 World Info** | 所有聊天（含群聊）均生效 |
| **Chat-bound Lorebook** | 僅在繫結的該聊天中生效 |
| **Character-bound Lorebook** | 每個群成員各自繫結的 Lorebook 都會啟用，條目按 Insertion Order 合併排序，如同一個大檔案 |
| **Persona-bound Lorebook** | 按 Chat Lore > Persona Lore > Character/Global Lore 優先順序疊加 |

**關鍵細節：**

- `getWorldInfoPrompt()` 時，系統從 Character World Info + auxiliary sources 收集條目，合併後統一按 Insertion Order 排序，Character World Info 的條目優先排序（先於 Global WI）。
- **"Include Names" 開關**：群聊中若要用成員名字作為 WI 觸發關鍵詞（例如發言字首 "Alice: hello" 觸發 Alice 的專屬條目），必須啟用此選項，否則字首不被掃描。

**矛盾點 / 懸案：**

- Character-bound Lorebook 是所有成員的都常駐掃描，還是僅 active speaker 的？文件未明確，DeepWiki 暗示"全部載入"（APPEND 邏輯），但 Swap 模式下的行為需真機驗證（詳見第 10 章 U2 懸案）。

來源：docs.sillytavern.app/usage/core-concepts/worldinfo、DeepWiki WI System
適用版本：v1.12.0+
置信度：**medium·推導未驗證** `[文件·多源 + 推斷]`（WI 基本行為有官方文件 + DeepWiki 多源支援；Character-bound Lorebook 常駐掃描範圍為未證實推斷，見 U2 懸案）

### 7.2 Author's Note

**核心結論：**

- **全域性 Author's Note**（使用者在聊天框設定的）：注入頻率/位置配置正常生效。
- **Character Note（角色卡內的 Character's Note 欄位）**：
  - Swap 模式：當前 active speaker 的 Character Note 正常注入。
  - Join 模式：可能缺失（Issue #3550，需真機驗證）。

**歷史 Bug：**

- Issue #456（已關閉）：Author's Note 在群聊超過 2 條訊息時被強制設為 `use_authors_note: false`。推斷已修復，但 Issue #3030（2024-10，狀態不明）仍報 AN 在某些群聊場景未注入，建議真機確認。
- 驗證方法：群聊 2+ 條訊息，設 AN 頻率=1，用 DevTools 攔截 API 請求檢查 `use_authors_note` 欄位值。

來源：docs.sillytavern.app、Issue #456、Issue #3030、Issue #3550
適用版本：v1.12.0+（Bug 已知於 v1.12.x 範圍）
置信度：**medium·推導未驗證** `[文件·單源 + 社群 Issue]`（Issue 歷史多源，但主要 Bug #456 已關閉、#3030 狀態不明；當前 v1.14.0 AN 實際行為未真機驗證）

### 7.3 STscript 變數

| 變數型別 | 作用域 | 群聊行為 |
|---------|--------|---------|
| Local（`/getvar`、`{{getvar::}}`） | 當前聊天 metadata | 群聊作為整體共享，非各成員獨立 |
| Global（`/getglobalvar`、`{{getglobalvar::}}`） | 全應用 settings.json | 群聊/單聊通用 |
| Scoped（`/let`、`{{var::}}`） | 閉包塊內部 | 行為一致，無群聊特殊性 |
| 優先順序 | local > global（同名時） | 群聊中行為相同 |

**關鍵發現：**

官方文件未記錄群聊與單聊的變數作用域差異，推斷變數系統對群聊透明——群聊本質上是一個聊天，local 變數作用於整個群聊 metadata，不區分發言者。

實戰建議：若要給每個角色維護獨立變數，需用命名字首約定（如 `alice_hp`、`bob_hp`）或 global 變數名稱空間。

來源：docs.sillytavern.app/usage/st-script
適用版本：v1.12.0+
置信度：**medium·推導未驗證** `[文件·單源 + 推斷]`（文件未記錄群聊變數作用域；local 變數共享整個群聊 metadata 為邏輯推斷，未真機驗證）

### 7.4 正則表示式（Regex Extension）

| 正則型別 | 群聊行為 |
|---------|---------|
| **Global scripts** | 保存於 settings.json，所有角色/所有聊天均生效 |
| **Scoped scripts（角色卡專屬）** | 保存於角色卡 extension data，僅當該角色為 active speaker 時生效 |
| 處理順序（v1.14.0） | GLOBAL → PRESET → SCOPED（Object.values 插入順序） |

**執行順序原始碼確認（v1.14.0）：**

`engine.js` 中 `SCRIPT_TYPES = { GLOBAL: 0, PRESET: 2, SCOPED: 1 }`，註釋明確 "ORDER MATTERS: defines the regex script priority"；`getRegexScripts()` 按 `Object.values(SCRIPT_TYPES).flatMap(type => getScriptsByType(type))` 展平，插入順序即為 GLOBAL → PRESET → SCOPED，與文件一致。

**關鍵實戰意義：**

在群聊中給每個角色卡嵌入各自的 scoped regex，可實現每個角色發言時獨立觸發不同的狀態列更新/變數寫入邏輯，互不干擾。反之，需要每輪都執行的 regex（如通用狀態更新）應放全域性 regex，不能放進角色專屬 scoped regex。

來源：docs.sillytavern.app/extensions/regex + v1.14.0 原始碼（`public/scripts/extensions/regex/engine.js` 直讀）
適用版本：v1.14.0+（Preset 順序變更）
置信度：**high** `[執行時原始碼]`（原始碼直讀確認，文件僅輔助佐證）

### 7.5 Persona（使用者人格）

**核心結論：**

- 群聊中使用者只有一個當前活躍 Persona，對所有成員均可見。
- Persona 的 description 按其 Position 設定注入 context（不區分群聊/單聊）。
- Persona 繫結的 Lorebook 按 Persona Lore 層級生效。
- **無「每成員各自 Persona」機制**，這是已知設計侷限。

來源：docs.sillytavern.app/usage/core-concepts/groupchats
適用版本：v1.12.0+
置信度：**medium·推導未驗證** `[文件·單源 + 推斷]`（"無每成員獨立 Persona"屬已知設計侷限，文件提及但 Persona 注入細節為推斷，未真機驗證）

### 7.6 Regenerate（重新生成）

**核心結論：**

- **群聊中不可用標準 Regenerate**（Ctrl+Alt+R 等標準快捷鍵行為不同）。
- 替代機制（原始碼精確行為）：`regenerateGroup()` 獲取最後一條訊息的 `gen_id`，然後**倒序刪除所有 `gen_id` 相同的同批訊息**（新版路徑），或遇到 `is_user / is_system` 停止（舊版兜底）；刪完後調 `generateGroupWrapper(false, 'normal', ...)` 重排隊。
- 行為表現為"刪除同批並重排隊"，而非單聊的"直接替換最後一條訊息"。
- 草稿原描述"刪除回到最後使用者/系統訊息的所有回覆"在 gen_id 存在時不準確：只刪同批，若本批僅 1 條訊息則效果相同，若多角色同批次發言則所有同批次訊息均刪除。

來源：docs.sillytavern.app/usage/core-concepts/groupchats + v1.14.0 原始碼 `regenerateGroup()`（直讀）
適用版本：v1.14.0+
置信度：**high** `[執行時原始碼]`（已直讀原始碼，行為比文件記錄更精確；原文件依據降為輔助）

### 7.7 Scenario Override（場景覆蓋）

**核心結論：**

- 群聊專有功能：設定一個全體共享的 Scenario 文字，覆蓋各角色卡各自的 scenario 欄位。
- 單聊無此功能。
- 原始碼補充（`getGroupCharacterCards()`）：Join 模式下 Scenario Override 儲存於 `chat_metadata['scenario']`，若非空則覆蓋所有成員的 scenario 合併結果（`baseChatReplace(scenarioOverride?.trim(), name1, name2) || scenarios.join('\n')`）。Swap 模式下的覆蓋邏輯在主 context 組裝函式中處理，機制一致。

來源：docs.sillytavern.app/usage/core-concepts/groupchats + v1.14.0 原始碼 `getGroupCharacterCards()`（直讀）
適用版本：v1.12.0+
置信度：**medium·單源孤證** `[文件·單源]`（文件僅單源；原始碼區域性邏輯 `[執行時原始碼]` 已核實 Join 模式行為，但 Swap 模式覆蓋路徑未直讀核實）

---

## 8. 實戰正規化程式碼

### 正規化 1：LLM 決策下一位發言者

```stscript
/gen length=20 as=system "當前群聊成員：{{groupNotMuted}}。根據對話歷史，誰最應該在此刻發言？僅返回一個角色的名字，不要其他內容。" | /trigger {{pipe}}
```

說明：用 LLM 根據上下文判斷誰該發言，結果透過管道傳入 `/trigger`。

來源：ST Discussion #4130（PyroDevil 實驗，維護者 Cohee1207 指導）
置信度：**medium·單源孤證** `[社群]`（僅單一社群討論帖；維護者參與提升可信度，但無文件或原始碼交叉確認；管道語法及 `/trigger` 接受 pipe 輸出的行為需真機驗證）

### 正規化 2：手動觸發指定成員

```stscript
/trigger Alice
/trigger 2
```

說明：可用角色全名或 1-based 列表索引（列表第 2 位成員）。

來源：docs.sillytavern.app/usage/st-script
置信度：**high** `[文件·多源]`

### 正規化 3：/sendas 傳送（無 generation）

```stscript
/sendas Alice 這是 Alice 直接說的一句話，不經過模型推理
```

說明：直接插入指定角色身份的訊息，不觸發 LLM generation。

來源：docs.sillytavern.app/usage/st-script
置信度：**high** `[文件·多源]`

### 正規化 4：條件式群聊/單聊分支

```stscript
/if left="{{charIfNotGroup}}" rule=neq right=""
  /then "單聊邏輯：當前角色為 {{char}}"
  /else "群聊邏輯：成員包括 {{groupNotMuted}}"
```

說明：`{{charIfNotGroup}}` 在群聊中返回空字串，可用於區分兩種場景執行不同邏輯。

來源：docs.sillytavern.app/usage/core-concepts/macros
置信度：**medium·單源孤證** `[文件·單源]`（`{{charIfNotGroup}}` 行為描述來自官方宏文件單頁，與 5.1 節宏列表同一來源；STscript `/if` 語法已由 STscript 參考文件佐證，整體邏輯為推導組合）

### 正規化 5：Scoped Regex 多角色獨立狀態更新

角色 A 的角色卡 Regex 中：

```
模式：(\[A的狀態變數:\s*)([^]]+)(\])
替換：<針對角色A的狀態更新邏輯>
觸發時機：僅當角色 A 為 active speaker 時執行
```

角色 B 的角色卡 Regex 中：

```
模式：(\[B的狀態變數:\s*)([^]]+)(\])
替換：<針對角色B的狀態更新邏輯>
觸發時機：僅當角色 B 為 active speaker 時執行
```

說明：兩套 scoped regex 完全獨立，互不干擾，適合多角色各自維護狀態列。

來源：docs.sillytavern.app/extensions/regex + v1.14.0 原始碼（執行順序已由 engine.js 直讀確認）
置信度：**high** `[執行時原始碼]`（Scoped regex 僅 active speaker 觸發的機制已由原始碼 `getScriptsByType(SCRIPT_TYPES.SCOPED)` 路徑證實，並由成熟卡生產驗證）

### 正規化 6：Force Talk 等價觸發

```stscript
/trigger 角色名
```

等價於 UI 中的 "Force Talk" 按鈕，繞過所有啟用策略強制指定角色發言。

來源：docs.sillytavern.app/usage/st-script
置信度：**high** `[文件·多源]`

### 正規化 7：World Info Include Names 聯動群聊發言

在 World Info 條目的關鍵詞中加入角色名（如 "Alice"），同時啟用 WI 全域性設定中的 "Include Names" 選項。發言訊息字首（如 "Alice: 你好"）中的 "Alice" 將被掃描為關鍵詞觸發器。

來源：docs.sillytavern.app/usage/core-concepts/worldinfo
置信度：**medium·推導未驗證** `[文件·單源 + 推斷]`（"Include Names"開關與發言字首掃描的聯動為文件描述，但字首格式和掃描時機需真機確認）

---

## 9. 高頻避坑

**1. Natural Order @提及只認完整詞**

若角色名含空格，確認觸發詞是拆分後的任一分詞（"Misaka" 或 "Mikoto"），而非縮寫或綽號（"Misa" 不觸發）。

**2. Join 模式 Character Note 不在合併範圍內（原始碼確認）**

v1.14.0 原始碼 `getGroupCharacterCards()` 直讀：該函式返回結構僅含 `{description, personality, scenario, mesExamples}`，**完全不處理 character_note**，這不是 Bug 而是設計如此。character_note 是否透過其他路徑（如 Author's Note 注入層）在 Join 模式送入 prompt 仍需真機確認（U1 懸案）。若依賴 Character Note 注入關鍵 prompt，優先使用 Swap 模式，或在 description 欄位追加關鍵內容作為兜底。

**3. Author's Note 在群聊中的歷史 Bug**

舊版本存在 AN 被強制停用的問題，即使 Issue #456 已關閉，建議真機確認 AN 是否正常注入。驗證方法：DevTools 看 API 請求中 `use_authors_note` 欄位值。

**4. Join 模式警告——個性融合**

官方文件明確標註 Join 模式可能導致角色間個性混淆，不建議用於強調獨立角色個性的場景。

**5. Local 變數作用於整個群聊**

群聊中 local 變數不區分發言者。若要給每個角色維護獨立變數，需用命名字首約定（如 `alice_hp`、`bob_hp`）或 global 變數名稱空間。

**6. Scoped Regex 僅在 active speaker 時觸發**

不要把需要每輪都執行的 regex（如通用狀態更新）放進角色專屬 scoped regex，應放全域性 regex。

**7. Auto-mode 打字即關閉**

使用者一旦在輸入框打字，auto-mode 關閉，但已排隊的 generation 不會中斷，可能造成意外發言。

**8. 1.15.0 群聊 metadata 破壞性變更**

升級後的群聊檔案不相容舊版本，需確認目標使用者 ST 版本再發布依賴群聊特性的卡。

**9. Regenerate 不可用於群聊**

群聊的"重新生成"實際執行 `regenerateGroup()`——刪除所有回覆後重排隊，而非單聊的直接替換最後一條訊息。

**10. World Info Include Names 必須開啟**

群聊中若要用成員名字作為 WI 觸發關鍵詞（如發言字首 "Alice: hello" 觸發 Alice 專屬條目），必須啟用 Include Names 選項，否則字首不被掃描。

**11. Pooled Order 的重置邊界（原始碼校正）**

Pooled Order **不是**在所有成員均發言一輪後顯式重置"發言池"。實際行為（`activatePooledOrder()` 原始碼）：從最新一條訊息倒序掃描，**累計"自上次使用者訊息以來"已發言的成員列表**（`spokenSinceUser`），從中篩出尚未發言者（`haveNotSpoken`）隨機選一位。若所有成員均已發言（`haveNotSpoken` 為空），則從除最後發言者外的隨機池中再選——這等效於"隱式重置"但並非顯式重置。因此"重置邊界"是**每條使用者訊息**，而非"全員發言一輪"。

---

## 10. 懸案（需真機驗證）

| 編號 | 懸案 | 問題描述 | 驗證路徑 |
|------|------|---------|---------|
| **U1** | **Join 模式 Character Note 是否合併** | 原始碼（`getGroupCharacterCards()`）直讀證實：該函式**不合並 character_note**，返回值只含 description/personality/scenario/mesExamples。但 character_note 在 Join 模式下是否透過其他路徑（如 Author's Note 層）注入，尚未完整溯源 | 開群聊 + Join 模式，DevTools 攔截 API 請求，檢查 prompt 中是否出現 character note 內容及注入位置 |
| **U2** | **Swap 模式下各成員的 Character-bound Lorebook 是否全部常駐掃描** | 文件只說"包含群聊"，未明確是否僅 active speaker 的 lorebook 被掃描 | 兩角色各繫結不同關鍵詞的 lorebook，只說角色 B 相關詞，看角色 A 發言時 B 的 lorebook 條目是否注入 |
| **U3** | **Author's Note 群聊當前狀態** | Issue #456 已關閉，但 Issue #3030（2024-10）仍報 AN 未注入，狀態不明確 | 群聊 2+ 條訊息，設 AN 頻率=1，檢查 API 請求 `use_authors_note` 欄位值 |
| **U4** | **Auto-mode + Natural Order 的 Talkativeness 分佈** | 每輪是真正獨立機率還是有歷史權重調整？原始碼顯示是獨立隨機，但打字中斷行為待驗證 | 設 3 個角色 talkativeness 各不同，auto-mode 跑 100 輪，統計發言次數分佈是否符合獨立機率 |
| **U5** | **/trigger 在非 Manual 策略下的行為** | 在 List/Natural 策略下 /trigger 是覆蓋當前策略還是追加發言？ | 切換為 Natural Order 策略，傳送 `/trigger 角色名`，觀察是否繞過當前策略佇列 |

---

## 11. 來源彙總

- [Group Chats | docs.sillytavern.app](https://docs.sillytavern.app/usage/core-concepts/groupchats/) — 官方文件主頁（首要參考）
- [SillyTavern-Docs/groupchats.md @ GitHub](https://github.com/SillyTavern/SillyTavern-Docs/blob/main/Usage/Characters/groupchats.md) — 文件原始碼
- [DeepWiki — Group Chats](https://deepwiki.com/SillyTavern/SillyTavern/9-group-chats-and-multi-character-interactions) — 執行時原始碼級分析
- [DeepWiki — World Info System](https://deepwiki.com/SillyTavern/SillyTavern/6.1-world-info-system) — 世界書原始碼層
- [Macros | docs.sillytavern.app](https://docs.sillytavern.app/usage/core-concepts/macros/) — 宏完整列表
- [STscript Reference | docs.sillytavern.app](https://docs.sillytavern.app/usage/st-script/) — 指令碼語言參考
- [Regex Extension | docs.sillytavern.app](https://docs.sillytavern.app/extensions/regex/) — 正則擴充套件文件
- [World Info | docs.sillytavern.app](https://docs.sillytavern.app/usage/core-concepts/worldinfo/) — 世界書完整文件
- [Issue #3550 — Character Notes not joined in group chat](https://github.com/SillyTavern/SillyTavern/issues/3550) — Bug report（狀態：Open/Not Reproducible）
- [Issue #456 — Author's Note disabled in group chat](https://github.com/SillyTavern/SillyTavern/issues/456) — Bug report（已關閉）
- [Discussion #4130 — LLM decide next speaker](https://github.com/SillyTavern/SillyTavern/discussions/4130) — 社群實戰正規化
- [Discussion #4795 — 1.14.0 changelog](https://github.com/SillyTavern/SillyTavern/discussions/4795) — Preset/Scoped regex 順序變更
- [Discussion #4926 — 1.15.0 changelog](https://github.com/SillyTavern/SillyTavern/discussions/4926) — metadata 格式破壞性變更
- [中文文件映象 — groupchats](https://docs.eigeen.cc/usage/core-concepts/groupchats/) — 中文參考
