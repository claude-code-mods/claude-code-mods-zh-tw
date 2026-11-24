# 表情立繪與 Live2D 參考手冊

> 文件版本：v1.0.0 ｜ 最後更新：2026-07-14

## Character Expressions · Live2D · VRM · Costume 系統完整參考

> **適用物件**：基於 SillyTavern 的角色卡立繪/動畫系統搭建與除錯參考；含靜態 Sprites、Live2D 骨骼動畫、VRM 3D 模型、服裝切換四大子系統。
>
> **置信度說明**：本手冊採用「三級 + 依據型別」雙軸標註，完整規則見下方〈0 置信度分級體系〉。

---

## 目錄

0. [置信度分級體系（全手冊適用）](#0-置信度分級體系全手冊適用)
1. [系統架構總覽](#1-系統架構總覽)
2. [靜態 Sprites 檔案系統](#2-靜態-sprites-檔案系統)
3. [28 個情緒標籤完整列表](#3-28-個情緒標籤完整列表)
4. [檔案命名解析演算法](#4-檔案命名解析演算法)
5. [ZIP 批次上傳規範](#5-zip-批次上傳規範)
6. [多影像隨機選擇機制](#6-多影像隨機選擇機制)
7. [分類（Classify）系統](#7-分類-classify-系統)
8. [LLM 分類 Prompt 與 Pipeline](#8-llm-分類-prompt-與-pipeline)
9. [extension_settings 配置欄位完整參考](#9-extension_settings-配置欄位完整參考)
10. [STscript / Slash Command API](#10-stscript--slash-command-api)
11. [Costume / 服裝切換系統](#11-costume--服裝切換系統)
12. [Live2D 擴充套件技術規格](#12-live2d-擴充套件技術規格)
13. [VRM 擴充套件技術規格](#13-vrm-擴充套件技術規格)
14. [Visual Novel 模式下的行為](#14-visual-novel-模式下的行為)
15. [服務端 API 端點參考](#15-服務端-api-端點參考)
16. [expressions-plus 第三方擴充套件](#16-expressions-plus-第三方擴充套件)
17. [talkinghead（歷史·已廢棄）](#17-talkinghead歷史已廢棄)
18. [高頻避坑](#18-高頻避坑)
19. [施工直用正規化程式碼](#19-施工直用正規化程式碼)
20. [懸案（未決項 + 真機驗證路徑）](#20-懸案未決項--真機驗證路徑)

---

## 0 置信度分級體系（全手冊適用）

> **收集日期統一宣告**：本手冊全部條目收集於 **2026-06-28**。回源核實基於本地 SillyTavern **v1.14.0** + 本地成熟卡（卡A2.5.0 / 卡B2.6.0）；Live2D / VRM 為獨立擴充套件倉（Extension-Live2d / Extension-VRM），相關條目已在標註處單獨說明。

每條結論採用 **置信度等級 + 依據型別** 雙軸標註。

### 置信度三級

| 級別 | 含義 | 判定標準 |
|---|---|---|
| **high** | 已坐實，可直接施工 | 有執行時證據（真機實測 / 讀到執行時實現原始碼 / 生產卡驗證）；非 beta 未合併特性；結論不含跨步推導；不在懸案清單 |
| **medium** | 待驗證，施工前須實測 | 強制二選一子標籤：`medium·單源孤證`（單一來源、無第二源、無實測）/ `medium·推導未驗證`（原始碼或邏輯推導成立但未跑通，**須隨附真機驗證路徑**）|
| **low** | 孤證無源，禁止據此施工 | 零來源猜測 / 純歷史快照（須標年份 + 窄縮適用範圍）|

### 依據型別標籤（與置信度正交，強制標註）

`[執行時原始碼]`、`[真機]`、`[文件·多源]`、`[文件·單源]`、`[型別宣告]`、`[歷史孤證:年份]`、`[無源·待考]`

### 兩條鐵規

1. **僅由 `[型別宣告]` 支撐的「執行時行為 / 可用性」結論，最高只能 `medium·推導未驗證`**——除非另有 `[執行時原始碼]` 或 `[真機]` 佐證才升 high。
2. **節級標註 = 節內條目下確界**——禁止整節標 high 卻內含懸案條目；衝突即拆節。

---

## 1 系統架構總覽

### 1.1 分層架構

```
[AI 輸出文字]
     │
     ▼
[classification 分類層]  ←── 可選：Local BERT / Main API LLM / WebLLM / Extras(廢棄)
     │  情緒標籤 (string)
     ▼
[sprite 匹配層]  ←── /data/<user>/characters/<CharName>/<label>.png
     │  檔案路徑
     ▼
[渲染層]  ←── 普通模式(側邊) / VN 模式(居中) / Live2D / VRM
```

來源：`SillyTavern/SillyTavern:staging/public/scripts/extensions/expressions/index.js` | 適用版本：ST 1.12.x–1.15.x | **high** `[執行時原始碼]`

### 1.2 三大渲染引擎對比

| 引擎 | 狀態 | 依賴 | 特性 |
|------|------|------|------|
| 靜態 Sprites | 原生內建，無需額外安裝 | 無 | PNG/WebP/GIF，全自動情緒切換 |
| Live2D | 獨立擴充套件，官方維護 | Extension-Live2d | 2D 骨骼動畫，口型同步，hitArea 互動 |
| VRM | 獨立擴充套件，官方維護 | Extension-VRM | 3D 模型，FBX/BVH 動畫，BlendShape 表情 |
| talkinghead | **1.12.13 已廢棄** | SillyTavern-Extras（OBSOLETE） | 單圖生成 Live2D 式運動，歷史參考 |

來源：`docs.sillytavern.app/extensions/live2d/`、`/extensions/vrm/`、`/extensions/talkinghead/` | 適用版本：ST 1.12.x–1.15.x | **high** `[文件·多源]`

---

## 2 靜態 Sprites 檔案系統

### 2.1 資料夾路徑結構

```
/data/<user-handle>/characters/
├── CharacterName.png              ← 角色卡頭像
└── CharacterName/                 ← 與角色卡檔名精確同名（不含副檔名）
    ├── joy.png                    ← 基礎命名
    ├── joy-1.png                  ← 多變體（破折號+數字字尾）
    ├── joy.expressive.png         ← 多變體（點+描述字尾）
    ├── admiration.png
    ├── ... (共 28 個標籤對應檔案)
    └── [subfolder]/               ← 服裝覆蓋子資料夾（見第 11 章）
        └── joy.png
```

本地真機驗證路徑：`<local-user-path>/<local-drive>\SillyTavern-1.14.0\data\default-user\characters\Seraphina\`（28 個檔案已全部驗證存在）

來源：真機驗證 + `src/endpoints/sprites.js` | 適用版本：ST 1.12.x–1.15.x | **high** `[真機]` + `[執行時原始碼]`

**關鍵規則：資料夾名必須與角色卡檔名精確一致**（Linux 區分大小寫，Windows 不區分；部署 Linux 伺服器後若大小寫不一致，立繪全部失效——見 18 節坑1）。

### 2.2 支援的圖片格式

- `image/*` 型別（由服務端 mime-types 校驗）
- 常用：PNG、WebP、GIF（GIF 支援動圖）
- 非圖片檔案上傳會被服務端拒絕

來源：`src/endpoints/sprites.js` | **high** `[執行時原始碼]`

---

## 3 28 個情緒標籤完整列表

來源：`staging/public/scripts/extensions/expressions/index.js` 中 `DEFAULT_EXPRESSIONS` 陣列 + 本地真機目錄二次確認（Seraphina 28 檔案吻合）。

```javascript
const DEFAULT_EXPRESSIONS = [
    'admiration',     // 欽佩
    'amusement',      // 娛樂/逗樂
    'anger',          // 憤怒
    'annoyance',      // 煩惱
    'approval',       // 認可
    'caring',         // 關愛
    'confusion',      // 困惑
    'curiosity',      // 好奇
    'desire',         // 渴望
    'disappointment', // 失望
    'disapproval',    // 不認可
    'disgust',        // 厭惡
    'embarrassment',  // 尷尬
    'excitement',     // 興奮
    'fear',           // 恐懼
    'gratitude',      // 感激
    'grief',          // 悲慟
    'joy',            // 喜悅
    'love',           // 愛
    'nervousness',    // 緊張
    'optimism',       // 樂觀
    'pride',          // 自豪
    'realization',    // 頓悟
    'relief',         // 釋然
    'remorse',        // 懊悔
    'sadness',        // 悲傷
    'surprise',       // 驚訝
    'neutral'         // 中性（fallback 首選）
];
```

共 **28 個標籤**，`neutral` 包含在內。`love` 是否屬於標準 GoEmotions 28 集存在輕微歧義，詳見第 20 章懸案 U1。

來源：執行時原始碼 `DEFAULT_EXPRESSIONS` + 真機目錄驗證 | 適用版本：ST 1.12.x–1.15.x | **high** `[執行時原始碼]` + `[真機]`

**最小可用子集建議**：`neutral`（必備）、`joy`、`sadness`、`anger`、`fear`、`surprise`、`disgust` 共 7 個覆蓋基礎情緒；其餘按需補充。

---

## 4 檔案命名解析演算法

來源：`src/endpoints/sprites.js`（服務端）。

```javascript
// ST 內部檔案命名解析邏輯
const fileName = path.parse(pathToSprite).name.toLowerCase();
const label = fileName.match(/^(.+?)(?:[-\.].*?)?$/)?.[1] ?? fileName;
```

**規則**：取檔名（去副檔名後）在第一個 `-` 或 `.` 之前的部分作為情緒標籤，全部轉小寫。

| 檔名 | 解析標籤 | 說明 |
|--------|----------|------|
| `joy.png` | `joy` | 基礎 |
| `joy-1.png` | `joy` | 數字變體 |
| `joy.expressive.png` | `joy` | 點後描述 |
| `joy-alt-1.png` | `joy` | 僅第一段 |
| `Joy.png` | `joy` | 自動轉小寫 |
| `schooluniform_joy.png` | `schooluniform_joy` | 下劃線不分割，整體是標籤名 |

來源：`src/endpoints/sprites.js` | 適用版本：ST 1.12.x–1.15.x | **high** `[執行時原始碼]`

---

## 5 ZIP 批次上傳規範

```
sprite_pack.zip
├── joy.png              ← 必須平鋪在根目錄（no subfolders）
├── joy-1.png
├── sadness.png
└── neutral.png
```

規則：
- ZIP 內所有圖片必須平鋪在根目錄，含子資料夾則上傳失敗或部分檔案丟失（見 18 節坑2）
- 服務端用 `mime-types` 校驗，只接受 `image/*` 型別
- 會與已有檔案對比去重後寫入（同名檔案覆蓋）

來源：`src/endpoints/sprites.js` + 官方文件 | **high** `[執行時原始碼]` + `[文件·多源]`

---

## 6 多影像隨機選擇機制

```javascript
// 當 allowMultiple 開啟且同一標籤有多個檔案時
let possibleFiles = sprite.files;
if (extension_settings.expressions.rerollIfSame) {
    possibleFiles = possibleFiles.filter(x =>
        !prevExpressionSrc || x.imageSrc !== prevExpressionSrc);
}
spriteFile = possibleFiles[Math.floor(Math.random() * possibleFiles.length)];
```

**關鍵配置**：
- `allowMultiple: true`（新安裝預設，見 migrateSettings）→ 同標籤多檔案隨機選；舊存檔若遷移前已存在該欄位則保留原值（見坑3）
- `allowMultiple: false` → 同標籤多檔案時只取第一個，不隨機
- `rerollIfSame: true` → 隨機時過濾掉上一次顯示的圖，避免重複

> ⚠️ 校準註記（2026-06-28）：草稿原寫"allowMultiple: false（預設）"與原始碼不符，migrateSettings() 對 undefined 寫入 true，已更正。

來源：`staging/public/scripts/extensions/expressions/index.js` | 適用版本：ST 1.12.x–1.15.x | **high** `[執行時原始碼]`

---

## 7 分類（Classify）系統

### 7.1 四種分類源對比

| `api` 值 | 模式名 | 技術實現 | 標籤數 | 需要外部服務 |
|----------|--------|----------|--------|-------------|
| `0`（local） | Local | 本地 ONNX BERT 模型 | 28 | 否（首次下載約 100MB） |
| `1`（extras） | Extras | SillyTavern-Extras API | 6 或 28 | 是（已廢棄，勿用） |
| `2`（llm） | Main API | 當前連線的 LLM | 自定義 | 是（已有 LLM 連線） |
| `3`（webllm） | WebLLM | 瀏覽器內 WebLLM | 自定義 | 否（需安裝 WebLLM 擴充套件） |
| `99`（none） | None | 停用分類 | — | — |

來源：`staging/public/scripts/extensions/expressions/index.js` `EXPRESSION_API` 列舉 | **high** `[執行時原始碼]`

### 7.2 本地模型配置（config.yaml）

```yaml
# 28 標籤模型（預設，精度高）：
extensions:
  models:
    classification: Cohee/distilbert-base-uncased-go-emotions-onnx

# 6 標籤模型（更快但精度低）：
extensions:
  models:
    classification: Cohee/bert-base-uncased-emotion-onnx
```

來源：ST 官方文件 | **high** `[文件·多源]`

### 7.3 流式輸出中的分類頻率變化

- 正常情況：moduleWorker 輪詢間隔 **2000ms**
- 流式輸出中：間隔降至 **10000ms**，表情切換變慢
- 這是預期行為，非 bug（見 18 節坑6）

來源：`staging/public/scripts/extensions/expressions/index.js` | **high** `[執行時原始碼]`

---

## 8 LLM 分類 Prompt 與 Pipeline

### 8.1 LLM 分類 Prompt 模板（原文）

```
Ignore previous instructions. Classify the emotion of the last message. 
Output just one word, e.g. "joy" or "anger". Choose only one of the 
following labels: {{labels}}
```

`{{labels}}` 在執行時替換為可用標籤的逗號分隔列表（含自定義標籤）。

**兩種 Prompt 上下文模式**：
- `promptType: 'raw'`（預設）：僅最後一條訊息 + 系統指令
- `promptType: 'full'`：完整聊天曆史 + 角色卡（token 消耗顯著增加）

來源：`staging/public/scripts/extensions/expressions/index.js` | **high** `[執行時原始碼]`

### 8.2 LLM 分類返回格式與容錯

期望格式：`{"emotion": "label_string"}`

容錯鏈路（按優先順序）：
1. 直接 JSON 解析 → 取 `emotion` 欄位（區分大小寫後轉小寫）
2. JSON 解析失敗 → 先統一去除 `<think>...</think>` 推理塊（`removeReasoningFromString`），再：
   a. Fuse.js 模糊搜尋
   b. 子串匹配（逐 label 查包含關係）
3. 全部失敗 → 丟擲錯誤，呼叫層回退到 `fallback_expression`

> ⚠️ 校準註記（2026-06-28）：草稿原寫"步驟4：去除 think 塊後再次匹配"為獨立步驟，有誤。實際原始碼（parseLlmResponse）是 JSON 失敗後先去 think 塊，再做 Fuse.js + 子串匹配，不是第4步。

來源：`staging/public/scripts/extensions/expressions/index.js` `parseLlmResponse()` | 適用版本：ST 1.14.0 | **high** `[執行時原始碼]`

### 8.3 文字預處理（sampleClassifyText）

分類前 ST 對文字進行以下預處理：
- 移除推理塊（`<think>...</think>`）
- 替換 ST 宏（`{{char}}`、`{{user}}` 等）
- 去星號 / 引號
- 非 LLM 模式：文字 ≥500 字元 → 取首 250 + 尾 250 字元，截到句子邊界
- LLM 模式：跳過長度截斷

來源：`staging/public/scripts/extensions/expressions/index.js` | **high** `[執行時原始碼]`

---

## 9 extension_settings 配置欄位完整參考

```javascript
extension_settings.expressions = {
    api: 0,                    // EXPRESSION_API 列舉值（0=Local，2=LLM，99=停用）
    fallback_expression: 'joy',// 預設 fallback 為 'joy'（DEFAULT_FALLBACK_EXPRESSION）；null=不顯示
    showDefault: true,         // 無對應 sprite 時顯示角色預設頭像（emoji）
    custom: [],                // 自定義情緒標籤陣列（追加到28個之後）
    translate: false,          // 分類前將文字翻譯到英文（非英文卡可考慮開啟）
    allowMultiple: true,       // ⚠️ 預設 true（migrateSettings 對未定義值寫入 true）
    rerollIfSame: false,       // 隨機選時禁止連續顯示相同 sprite
    filterAvailable: false,    // 僅對 LLM/WebLLM 有效；local 模式下此欄位不生效（見坑7）
    llmPrompt: DEFAULT_LLM_PROMPT,  // 可自定義 LLM 分類 prompt
    promptType: 'raw',         // 'raw'（僅末尾訊息）| 'full'（完整歷史）
};
```

> ⚠️ 校準註記（2026-06-28）：草稿原寫 `allowMultiple: false` 與 `fallback_expression: null` 均與原始碼不符。`migrateSettings()` 對 `allowMultiple === undefined` 寫入 `true`；`DEFAULT_FALLBACK_EXPRESSION = 'joy'`。`fallback_expression` 的實際初始值由 UI 初始化流程決定，新安裝時 `joy` 為預設。

來源：`staging/public/scripts/extensions/expressions/index.js` migrateSettings() + DEFAULT_FALLBACK_EXPRESSION 常量 | 適用版本：ST 1.12.x–1.15.x | **high** `[執行時原始碼]`

---

## 10 STscript / Slash Command API

### 10.1 Expressions 擴充套件命令

```stscript
# 設定表情（情緒標籤）；別名：/sprite /emote
/expression-set joy
/expression-set type=expression joy

# 從可用 sprite 檔案列表中按檔名選擇
/expression-set type=sprite joy-1.png

# ⚠️ /expression-fallback 命令不存在；fallback 只能透過擴充套件設定 UI 配置，無對應 STscript 命令

# 對文字分類並返回情緒標籤；正式名 expression-classify，別名 classify
/expression-classify 她的笑容充滿了陽光
/classify api=local filter=true 我感到非常憤怒

# 獲取當前角色可用表情列表；正式名 expression-list，別名 expressions（無 get-expressions）
/expression-list
/expressions filter=true

# 獲取當前角色最後一個顯示的 sprite；正式名 expression-last，別名 lastsprite
/expression-last
/lastsprite CharacterName
```

> ⚠️ 校準註記（2026-06-28）：草稿中 `/expression-fallback` 命令經原始碼全文檢索確認不存在；`/get-expressions` 命令不存在，實際命令為 `expression-list`（別名 `expressions`）；`/classify` 是 `expression-classify` 的別名（驗證有效）。

來源：`staging/public/scripts/extensions/expressions/index.js` SlashCommandParser.addCommandObject 註冊處 | 適用版本：ST 1.14.0 | **high** `[執行時原始碼]`

### 10.2 Live2D 擴充套件命令

```stscript
# 切換 Live2D 表情（expression 檔名，模型內定義）
/live2dexpression character="卡A" expression="happy"

# 播放動作（motion 組名 + ID）
/live2dmotion character="卡A" motion="Idle_01_1"
# 格式：motionGroup_motionId（如 Idle 組第1個：Idle_1）

# 隨機播放某組動作
/live2dmotion character="卡A" motion="Idle_random"

# 設定引數值（直接控制 Live2D 引數）
/live2dparameter character="卡A" id="PARAM_MOUTH_OPEN_Y" value="0.8"

# 重置所有引數
/live2dresetparameters character="卡A"
```

來源：`Extension-Live2d/index.js` | 適用版本：Extension-Live2d 當前版本 | **medium·單源孤證**（部分命令格式需真機驗證）

### 10.3 VRM 擴充套件命令

```stscript
# 指定角色使用的 VRM 模型檔案
/vrmmodel Seraphina.vrm
/vrmmodel character=卡A model=xingyue.vrm    # 群聊時指定角色

# 切換表情（BlendShape 預設名）
/vrmexpression happy
/vrmexpression character=卡A expression=angry

# 播放動作
/vrmmotion idle
/vrmmotion character=卡A motion=idle loop=true random=false

# 調整燈光
/vrmlightcolor white
/vrmlightcolor purple
/vrmlightintensity 80    # 0-100 百分比
```

來源：`docs.sillytavern.app/extensions/vrm/` | **high** `[文件·多源]`

---

## 11 Costume / 服裝切換系統

服裝切換是 Expressions 擴充套件內建的「覆蓋 sprite 資料夾路徑」機制，透過 `/costume`（或別名 `/spriteoverride`）命令實現。

### 11.1 三種路徑模式

```stscript
# 模式1 - 絕對覆蓋：使用 characters/ 下的獨立資料夾
/costume winter_character
# → /data/<user>/characters/winter_character/joy.png

# 模式2 - 子資料夾：在當前角色資料夾內的子目錄（注意反斜槓字首）
/costume \winter
# → /data/<user>/characters/CharName/winter/joy.png

# 模式3 - 恢復預設
/costume
# 無引數 = 清除覆蓋，回到角色預設路徑
```

**極易混淆**：`/costume winter` 是全域性覆蓋（找 `characters/winter/`），`/costume \winter` 或 `/costume /winter`（字首正斜槓或反斜槓均可，原始碼註釋："If the name starts with a slash or a backslash"）才是子資料夾（找 `characters/CharName/winter/`）。見 18 節坑8。

命令別名：`/costume` = `/spriteoverride` = `/expression-folder-override`

來源：`staging/public/scripts/extensions/expressions/index.js` + 官方文件 | **high** `[執行時原始碼]` + `[文件·多源]`

### 11.2 子資料夾佈局示例

```
characters/
├── 卡A.png
└── 卡A/
    ├── joy.png              ← 預設服裝
    ├── joy-1.png            ← 預設服裝變體2
    ├── 校服/               ← 服裝1子資料夾
    │   ├── joy.png
    │   └── sadness.png
    └── 泳裝/               ← 服裝2子資料夾
        └── joy.png
```

STscript 切換：
```stscript
/costume \校服              # 切換到校服立繪
/costume                   # 恢復預設
```

子資料夾只需提供需要覆蓋的標籤，未覆蓋的標籤 **不會** 自動 fallback 到父資料夾，而是顯示 `fallback_expression` 或無圖。

來源：`staging/public/scripts/extensions/expressions/index.js` | **high** `[執行時原始碼]`

---

## 12 Live2D 擴充套件技術規格

### 12.1 安裝路徑與檔案結構

```
/data/<user-handle>/assets/live2d/
└── ModelName/                          ← 模型資料夾
    ├── ModelName.model.json            ← Cubism 2/3 描述檔案（必須在根目錄）
    ├── ModelName.model3.json           ← Cubism 4/5 描述檔案（必須在根目錄）
    ├── ModelName.moc / ModelName.moc3  ← 網格資料
    ├── textures/                       ← 貼圖
    ├── expressions/                    ← 表情檔案（.exp.json / .exp3.json）
    └── motions/                        ← 動作檔案（.motion.json / .motion3.json）

# 角色專屬模型（優先順序更高，覆蓋全域性路徑）：
/data/<user-handle>/characters/CharacterName/live2d/
└── ModelName/
    └── ...（同上結構）
```

**關鍵**：ST 透過掃描根目錄下的 `*.model.json` 或 `*.model3.json` 來識別模型，檔案放錯層級將無法被檢測（見 18 節坑9）。

來源：`docs.sillytavern.app/extensions/live2d/` + `Extension-Live2d` GitHub README | **high** `[文件·多源]`

### 12.2 情緒-動作對映配置（extension_settings 結構）

配置儲存在 `extension_settings.live2d.characterModelsSettings`：

```javascript
extension_settings.live2d.characterModelsSettings = {
    "CharacterName": {
        "/path/to/model.model3.json": {
            // 進入聊天時的啟動動畫
            "animation_starter": {
                "expression": "happy",    // 表情檔名（不含副檔名）
                "motion": "Start_1",      // 格式：MotionGroup_MotionId
                "delay": 1000             // 毫秒
            },
            // 角色發訊息時的預設動畫
            "animation_default": {
                "expression": "neutral",
                "motion": "Talk_random"   // random = 從該組隨機選
            },
            // 使用者點選模型時觸發
            "animation_click": {
                "expression": "surprised",
                "motion": "Reaction_1",
                "message": "別這樣！"    // 可選：自動傳送訊息到聊天
            },
            // 情緒分類對映（28個GoEmotions標籤 → Live2D表情/動作）
            "classify_mapping": {
                "joy":       { "expression": "happy",    "motion": "Happy_1"    },
                "sadness":   { "expression": "sad",      "motion": "Sad_1"      },
                "anger":     { "expression": "angry",    "motion": "Angry_1"    },
                "neutral":   { "expression": "neutral",  "motion": "Idle_random" },
                // ... 其餘 24 個標籤按相似情緒歸併
            },
            // 口型同步引數
            "param_mouth_open_y_id": "PARAM_MOUTH_OPEN_Y",
            "mouth_open_speed": 15,
            "mouth_time_per_character": 50    // ms/字元
        }
    }
}
```

來源：`Extension-Live2d/index.js` + `live2d.js` | **medium·單源孤證** `[執行時原始碼]`（Extension-Live2d 為獨立擴充套件倉，本地無原始碼，未經本次回源驗證）

### 12.3 口型同步實現原理

```javascript
// 基於正弦波驅動嘴部引數，100ms 重新整理
while ((Date.now() - startTime) < duration) {
    mouth_y = Math.sin((Date.now() - startTime) / speed);
    model.internalModel.coreModel.addParameterValueById(
        param_mouth_open_y_id, mouth_y);
    await sleep(100);
}
```

- `duration` = 訊息字元數 × `mouth_time_per_character`（ms）
- `speed` 控制正弦波頻率（`mouth_open_speed`，值越小頻率越高）

來源：`Extension-Live2d/live2d.js` | **medium·單源孤證** `[執行時原始碼]`（擴充套件倉原始碼，本地無副本，未經本次回源驗證）

### 12.4 HitArea 優先順序系統

點選模型時，ST 按以下順序處理：

1. 遍歷所有命中的 hitArea
2. 按 `index`（優先順序數字，**越小越高**）排序
3. 執行優先順序最高的 hitArea 對應的 expression + motion + message（可選）
4. 無 hitArea 命中時執行 `animation_click` 預設配置

來源：`Extension-Live2d/index.js` | **medium·單源孤證** `[執行時原始碼]`（擴充套件倉原始碼，本地無副本，未經本次回源驗證）

---

## 13 VRM 擴充套件技術規格

### 13.1 檔案結構

```
/data/<user-handle>/assets/vrm/
├── model/
│   └── character.vrm          ← VRM 1.0 / 0.x 格式均支援
└── animation/
    ├── idle1.bvh              ← 同基名+數字 = 自動歸同一組
    ├── idle2.bvh              ← 與 idle1 同組，播放時隨機選
    └── dance.fbx              ← Mixamo / XR Animator 重定向匯出
```

來源：`docs.sillytavern.app/extensions/vrm/` | **high** `[文件·多源]`

### 13.2 情緒對映

VRM 使用與 Expressions 擴充套件相同的 28 個 GoEmotions 標籤，自動對映到 VRM BlendShape 預設名（`Happy`、`Angry`、`Sad` 等 VRM 標準預設）。精確對映表未在文件中公開，見第 20 章懸案 U4。

來源：`docs.sillytavern.app/extensions/vrm/` | **medium·單源孤證** `[文件·單源]`（精確 BlendShape 名稱對映表未驗證）

### 13.3 支援格式

- 模型：`.vrm`（VRM 0.x / 1.0）
- 動畫：`.fbx`、`.bvh`（需 Mixamo 或 XR Animator 針對 VRM 骨骼重定向，見 18 節坑10）
- 動畫分組規則：同一基名 + 數字字尾的檔案自動歸同一組，播放時隨機選

來源：`docs.sillytavern.app/extensions/vrm/` | **high** `[文件·多源]`

---

## 14 Visual Novel 模式下的行為

- **單角色**：sprite 居中顯示（而非側邊）
- **Group Chat**：多角色 sprite 自動橫向鋪開，相互「讓位」
- **位置持久化**：`power_user.movingUIState` 儲存使用者拖動後的位置（MovingUI 功能，僅桌面端）
- **Prome 擴充套件**：可新增 Letterbox 模式、傳統 VN 模式（僅顯示單條訊息）、Focus 模式（非發言角色 sprite 變暗）

淡入淡出動畫的具體持續時間引數，見第 20 章懸案 U3。

來源：`docs.sillytavern.app/usage/user-settings/visual-novel/` | **medium·單源孤證** `[文件·單源]`

---

## 15 服務端 API 端點參考

| Endpoint | Method | 用途 |
|----------|--------|------|
| `/api/sprites/get` | GET | 獲取角色 sprite 列表（`?name=CharName&subfolder=...`） |
| `/api/sprites/upload` | POST | 上傳單個 sprite 檔案 |
| `/api/sprites/upload-zip` | POST | 批次上傳 ZIP 包 |
| `/api/sprites/delete` | POST | 按標籤刪除 sprite |
| `/api/images/list` | POST | 列出圖片資產 |
| `/api/images/upload` | POST | 上傳通用圖片資產 |

來源：`SillyTavern/SillyTavern:staging/src/endpoints/sprites.js` | 適用版本：ST 1.12.x–1.15.x | **high** `[執行時原始碼]`

---

## 16 expressions-plus 第三方擴充套件

GitHub：`https://github.com/Tyranomaster/expressions-plus`

要求：ST >= 1.15.0；使用前**必須停用內建 Expressions 擴充套件**（見 18 節坑4）。

### 16.1 增強特性

- **Expression Rules（表情規則）**：基於情緒置信度閾值的自定義觸發
  - Range Rule：當某情緒置信度在 X%–Y% 之間時觸發指定 sprite
  - Combination Rule：當多個情緒同時出現、且置信度差 ≤Z% 時觸發（如「苦甜參半」= joy + sadness 差 ≤25%）
- **Profiles（配置集）**：可命名、匯入/匯出、按角色分配的規則集合
- **Folder Profile**：在 sprite 資料夾內放 `expressions-plus-profile.json`，隨 ZIP 包分發（JSON schema 見第 20 章懸案 U6）
- **即時 Insight Panel**：浮動面板，顯示 Top 5 情緒置信度條形圖 + 當前觸發表情 + 是否自定義規則觸發

### 16.2 分類器

使用 `distilbert-base-uncased-go-emotions`（~100MB），與官方 Local 模式相同模型族。

來源：GitHub README + WebFetch | **high** `[文件·多源]`

---

## 17 talkinghead（歷史·已廢棄）

> **廢棄版本：ST 1.12.13（2024 年）**。下方內容僅作歷史記錄，**禁止在新建卡中使用**。

- **原理**：從單張靜態圖生成 Live2D 式面部動畫 + TTS 口型同步
- **依賴**：SillyTavern-Extras（Python >= 3.8，PyTorch >= 1.11.0，`--enable-modules=classify,talkinghead`）+ SillyTavern-Extras 本身標註 `[OBSOLETE]`
- **整合方式**：在角色卡表情上傳區上傳 `talkinghead.png`，勾選 checkbox 後替換當前表情顯示
- **API**：`YOUR_EXT_URL:PORT/api/talkinghead/result_feed`（結果流）
- **官方替代方案**：文件**未提供**替代方案；事實上的替代是 Live2D 或 VRM 擴充套件

來源：`docs.sillytavern.app/extensions/talkinghead/` | **high** `[文件·多源]` `[歷史孤證:2024]`

---

## 18 高頻避坑

| 編號 | 坑名 | 說明 | 置信度 | 來源 |
|------|------|------|--------|------|
| 坑1 | 資料夾名大小寫敏感 | Linux 伺服器區分大小寫，sprite 資料夾名必須與角色卡名稱完全一致；Windows 開發時不會暴露此問題 | **high** | `[文件·多源]` |
| 坑2 | ZIP 包不能含子資料夾 | ZIP 內所有圖片必須平鋪在根目錄，有子資料夾則上傳失敗或部分檔案丟失 | **high** | `[執行時原始碼]` |
| 坑3 | `allowMultiple` 行為與舊文件描述不符 | migrateSettings() 對未設定的例項寫入 `true`，新安裝預設多變體隨機選。若歷史存檔已有該欄位且值為 `false` 則舊行為（只取第一個）仍生效。升級後若發現隨機失效，檢查存檔中該欄位值。 | **medium·單源孤證** `[執行時原始碼]`（未真機驗證新安裝初始值） |
| 坑4 | expressions-plus 與原生擴充套件衝突 | 兩個擴充套件同時啟用會導致行為衝突；必須在 ST 擴充套件面板停用內建 Expressions 擴充套件後再啟用 expressions-plus | **high** | `[GitHub README]` |
| 坑5 | talkinghead 已完全廢棄 | ST >= 1.12.13 不再支援，SillyTavern-Extras 也已標註 OBSOLETE；新卡勿用 | **high** | `[文件·多源]` |
| 坑6 | 流式輸出中表情更新頻率降低 | 流式生成時 moduleWorker 間隔從 2000ms 降到 10000ms，表情切換變慢；這是預期行為而非 bug | **high** | `[執行時原始碼]` |
| 坑7 | `filterAvailable` 僅對 LLM/WebLLM 有效 | 原始碼驗證：`filterAvailable` 在 local 模式下完全不生效（僅打 debug log，分類器仍返回全部28個標籤中最匹配的一個）；僅 LLM/WebLLM 模式下才會把可用標籤列表傳入 prompt 限制輸出範圍。若在 LLM 模式下開啟，只有少數 sprite 時確實存在語義錯位風險。 | **medium·推導未驗證** `[執行時原始碼]` + `[推斷]` | 已驗證 local 無效，LLM 模式語義錯位風險為推斷 |
| 坑8 | costume 子資料夾字首易混淆 | `/costume winter` 是全域性覆蓋（找 `characters/winter/`），`/costume \winter` 或 `/costume /winter`（正斜槓或反斜槓均可，原始碼註釋明文說明）才是子資料夾（找 `characters/CharName/winter/`）；多/少一個字首結果完全不同 | **high** `[執行時原始碼]` |
| 坑9 | Live2D model.json 必須在根目錄 | ST 透過掃描根目錄下 `*.model.json` / `*.model3.json` 識別模型；放錯層級將無法被檢測 | **high** | `[文件]` + `[GitHub]` |
| 坑10 | VRM 動畫需針對 VRM 骨骼重定向 | 通用 FBX/BVH 動畫不能直接用於 VRM，需經 Mixamo 或 XR Animator 針對 VRM 骨骼進行重定向處理 | **high** | `[文件·多源]` |

---

## 19 施工直用正規化程式碼

### 正規化1：最小可用 Sprites 包結構

```
角色名/                        ← 與角色卡檔名精確匹配（不含 .png 副檔名）
├── neutral.png               ← 必備（分類失敗/fallback 時顯示）
├── joy.png
├── sadness.png
├── anger.png
├── fear.png
├── surprise.png
└── disgust.png               ← 共 7 個覆蓋基礎情緒，按需補充到 28 個
```

未提供的標籤會 fallback 到 `fallback_expression`（建議設為 `neutral`）。

### 正規化2：多變體服裝系統完整佈局

```
characters/
├── 卡A.png                   ← 角色頭像
└── 卡A/
    ├── joy.png               ← 預設服裝
    ├── joy-1.png             ← 預設服裝 joy 的變體2（需 allowMultiple=true 才隨機選）
    ├── neutral.png
    ├── 校服/                 ← 服裝1子資料夾
    │   ├── joy.png
    │   ├── neutral.png
    │   └── sadness.png
    └── 泳裝/                 ← 服裝2子資料夾
        └── joy.png
```

STscript 切換：
```stscript
/costume \校服              # 切換到校服立繪
/costume \泳裝              # 切換到泳裝立繪
/costume                   # 恢復預設（反斜槓為 Windows 路徑分隔符）
```

### 正規化3：Live2D 情緒對映配置（28 標籤歸併參考）

```javascript
// classify_mapping 配置參考——按情緒簇歸併到常見 Live2D 表情
"classify_mapping": {
    // 正向情緒簇
    "joy":            { "expression": "happy",     "motion": "Happy_1"    },
    "excitement":     { "expression": "happy",     "motion": "Happy_2"    },
    "amusement":      { "expression": "smile",     "motion": "Idle_1"     },
    "love":           { "expression": "happy",     "motion": "Happy_1"    },
    "admiration":     { "expression": "smile",     "motion": "Idle_1"     },
    "approval":       { "expression": "smile",     "motion": "Idle_1"     },
    "gratitude":      { "expression": "happy",     "motion": "Happy_1"    },
    "pride":          { "expression": "smile",     "motion": "Idle_1"     },
    "optimism":       { "expression": "smile",     "motion": "Idle_1"     },
    "caring":         { "expression": "smile",     "motion": "Idle_1"     },
    "relief":         { "expression": "neutral",   "motion": "Idle_1"     },
    // 負向情緒簇
    "sadness":        { "expression": "sad",       "motion": "Sad_1"      },
    "grief":          { "expression": "sad",       "motion": "Sad_2"      },
    "disappointment": { "expression": "sad",       "motion": "Sad_1"      },
    "remorse":        { "expression": "sad",       "motion": "Sad_1"      },
    "anger":          { "expression": "angry",     "motion": "Angry_1"    },
    "annoyance":      { "expression": "annoyed",   "motion": "Angry_1"    },
    "disapproval":    { "expression": "annoyed",   "motion": "Angry_1"    },
    "disgust":        { "expression": "angry",     "motion": "Angry_1"    },
    // 緊張/恐懼簇
    "fear":           { "expression": "scared",    "motion": "Scared_1"   },
    "nervousness":    { "expression": "scared",    "motion": "Idle_1"     },
    // 認知/社交簇
    "surprise":       { "expression": "surprised", "motion": "React_1"    },
    "realization":    { "expression": "surprised", "motion": "React_1"    },
    "confusion":      { "expression": "confused",  "motion": "Idle_1"     },
    "curiosity":      { "expression": "curious",   "motion": "Idle_1"     },
    "desire":         { "expression": "happy",     "motion": "Idle_1"     },
    "embarrassment":  { "expression": "shy",       "motion": "Idle_1"     },
    // 中性
    "neutral":        { "expression": "neutral",   "motion": "Idle_random" }
}
```

### 正規化4：STscript 手動情緒驅動立繪（特殊場景覆蓋）

```stscript
{{#if (contains {{lastMessageContent}} "憤怒")}}
/expression-set anger
{{else if (contains {{lastMessageContent}} "開心")}}
/expression-set joy
{{else}}
/expression-set neutral
{{/if}}
```

注：通常直接依賴 classify 自動處理；手動覆蓋僅用於劇情關鍵節點或需要精確控制的特殊場景。

### 正規化5：ZIP 批次上傳最小有效結構

```bash
# 構建有效 ZIP（平鋪根目錄，無子資料夾）
cd /path/to/sprites/角色名/
zip -j sprite_pack.zip *.png    # -j 引數 = junk paths（去除路徑資訊）
```

---

## 20 懸案（未決項 + 真機驗證路徑）

**U1 懸案 — `love` 是否在 GoEmotions 標準 28 集內**
本地 Seraphina 資料夾存在 `love.png`，原始碼 `DEFAULT_EXPRESSIONS` 陣列計數為 28（含 love），與標準 GoEmotions 28 類標籤集（含 love）一致。但部分社群文件（DeepWiki MOD 版本）的列表缺少 `love`。

驗證路徑：在 ST 原始碼執行 `grep -n "DEFAULT_EXPRESSIONS" staging/public/scripts/extensions/expressions/index.js` 並數出陣列元素個數。

置信度：**medium·推導未驗證** — 原始碼陣列已經讀到，但「是否完全與標準 GoEmotions 28 類一致」這一語義問題未精確核對完整陣列。

---

**U2 懸案 — Live2D Cubism SDK 版本支援範圍**
文件和 README 均未明確說明支援 Cubism 2/3/4/5 的哪些版本；擴充套件使用外部 `live2d-widget` 庫，版本由該庫決定。

驗證路徑：檢視 `Extension-Live2d/package.json` 中的 `live2d-widget` 或類似依賴的版本號。

置信度：**low** — 無來源支撐，禁止據此施工。

---

**U3 懸案 — 淡入淡出動畫的持續時間引數**
文件提到表情切換有「cross-fade animation」，但具體時長（ms）、是否可配置均未文件化。

驗證路徑：在 ST 原始碼中 `grep "fade"` 或 `grep "transition"` in `staging/public/scripts/extensions/expressions/index.js`。

置信度：**low** — 無來源支撐。

---

**U4 懸案 — VRM BlendShape 名稱到 GoEmotions 標籤的精確對映表**
文件說「支援 28 個分類自動對映」，但未給出 GoEmotions 標籤 → VRM BlendShape 預設名的對照表（`Happy`、`Angry`、`Sad` 等實際名稱是否與 VRM 規範一致未驗證）。

驗證路徑：讀取 `Extension-VRM` 原始碼中的對映配置物件。

置信度：**medium·推導未驗證** `[文件·單源]`。

---

**U5 懸案 — 自定義標籤（custom 陣列）與 LLM 分類的 token 上限**
custom 標籤理論上無數量上限，但 LLM 分類 prompt 把所有標籤塞入時，過多標籤可能超過 LLM 上下文視窗或導致指令遵循能力下降。

驗證路徑：在 ST 中新增 50+ 自定義標籤後測試 LLM 分類是否正常工作、標籤列表是否被截斷。

置信度：**medium·推導未驗證** `[推斷]`。

---

**U6 懸案 — `expressions-plus-profile.json` 完整 JSON schema**
README 提到「Folder Profiles」可透過此檔案隨 sprite 包分發，但未公開完整 JSON schema。

驗證路徑：從已有的 expressions-plus 擴充套件匯出功能獲取 JSON 樣本，或檢視原始碼中的 schema 定義。

置信度：**low** — 無 schema 文件，禁止據此手寫 profile 檔案。

---

## 來源索引

| 來源 | 型別 | 適用章節 |
|------|------|---------|
| `https://docs.sillytavern.app/extensions/expression-images/` | `[文件·多源]` | 全部 |
| `https://docs.sillytavern.app/extensions/live2d/` | `[文件·多源]` | 第12章 |
| `https://docs.sillytavern.app/extensions/vrm/` | `[文件·多源]` | 第13章 |
| `https://docs.sillytavern.app/extensions/talkinghead/` | `[文件·多源]` | 第17章 |
| `https://docs.sillytavern.app/usage/user-settings/visual-novel/` | `[文件·單源]` | 第14章 |
| `SillyTavern/SillyTavern:staging/public/scripts/extensions/expressions/index.js` | `[執行時原始碼]` | 第1-10章 |
| `SillyTavern/SillyTavern:staging/src/endpoints/sprites.js` | `[執行時原始碼]` | 第4-5章，第15章 |
| `SillyTavern/Extension-Live2d:main/index.js` + `live2d.js` | `[執行時原始碼]` | 第12章 |
| `https://github.com/Tyranomaster/expressions-plus` | `[文件·多源]` | 第16章 |
| `https://deepwiki.com/zhaiiker/SillyTavernMOD/8.6-character-expressions` | `[文件·單源]`（MOD 版） | 第20章 U1 懸案 |
| `<local-user-path>/<local-drive>\SillyTavern-1.14.0\data\default-user\characters\Seraphina\` | `[真機]` | 第2章，第3章 |
