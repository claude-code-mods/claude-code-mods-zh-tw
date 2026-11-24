# 多模型 API 適配差異參考手冊

> 文件版本：v1.0.0 ｜ 最後更新：2026-07-14

## SillyTavern 多後端接入 · 引數支援矩陣 · 避坑速查

> **適用物件**：在 SillyTavern 中對接 Anthropic / Google Gemini / OpenAI / Mistral 等雲端 API 的卡作者與整合者。
>
> **置信度說明**：本手冊採用「三級 + 依據型別」雙軸標註，完整規則見下方〈0 置信度分級體系〉。

---

## 目錄

0. [置信度分級體系（全手冊適用）](#0-置信度分級體系全手冊適用)
1. [兩大正規化：Chat Completion vs Text Completion](#1-兩大正規化chat-completion-vs-text-completion)
2. [ST 請求流架構與關鍵檔案](#2-st-請求流架構與關鍵檔案)
3. [Chat Completion 核心引數支援矩陣](#3-chat-completion-核心引數支援矩陣)
4. [Claude (Anthropic) 專有引數與行為](#4-claude-anthropic-專有引數與行為)
5. [Google Gemini 專有引數與行為](#5-google-gemini-專有引數與行為)
6. [OpenAI (GPT-4o / o 系列) 專有引數](#6-openai-gpt-4o--o-系列專有引數)
7. [Prompt Post-Processing 五種模式](#7-prompt-post-processing-五種模式)
8. [System Prompt 與 Prefill 處理差異](#8-system-prompt-與-prefill-處理差異)
9. [Claude 當前模型 ID 完整表](#9-claude-當前模型-id-完整表)
10. [Anthropic Prompt Caching 完整配置](#10-anthropic-prompt-caching-完整配置)
11. [高頻避坑清單（TOP 10）](#11-高頻避坑清單top-10)
12. [完整可用正規化程式碼](#12-完整可用正規化程式碼)
13. [懸而未決：需真機驗證的問題](#13-懸而未決需真機驗證的問題)

---

## 0 置信度分級體系（全手冊適用）

> **收集日期統一宣告**：本手冊全部條目收集於 **2026-06-28**，交叉驗證跨 8 個獨立來源。原始碼級斷言的回源核實基於 SillyTavern **v1.14.0**（`chat-completions.js`、`prompt-converters.js` 等）；Anthropic API 狀態對齊至 **2026-06 最新**；本地成熟卡驗證基於 **卡A 2.5.0 / 卡B 2.6.0**。

每條結論採用 **置信度等級 + 依據型別** 雙軸標註。

### 0.1 置信度三級

| 級別 | 含義 | 判定標準 |
|---|---|---|
| **high** | 已坐實，可直接施工 | 有執行時證據（真機實測 / 讀到執行時實現原始碼 / 生產卡驗證）；結論是原始碼/文件的直接事實而非下游推導；不在懸案清單 |
| **medium** | 待驗證，施工前須實測 | 強制二選一子標籤：`medium·單源孤證`（單一來源、無第二源、無實測）/ `medium·推導未驗證`（原始碼或邏輯推導成立但未跑通，須隨附真機驗證路徑）|
| **low** | 孤證無源，禁止據此施工 | 零來源猜測 / 純歷史快照（須標年份 + 窄縮適用範圍）|

### 0.2 依據型別標籤（與置信度正交，強制標註）

`[執行時原始碼]`、`[真機]`、`[文件·多源]`、`[文件·單源]`、`[社群]`、`[推斷]`、`[歷史孤證:年份]`、`[無源·待考]`

### 0.3 兩條鐵規

1. **「從原始碼事實再推一步」的下游推導，即使原始碼本身已直讀，該推導結論最高只能 `medium·推導未驗證`**——除非已真機驗證；原始碼內部事實仍標 `high [執行時原始碼]`。
2. **節級標註 = 節內條目下確界**——禁止整節標 high 卻內含懸案條目；衝突即在節內區域性降級。正文斷言凡命中懸案章（本手冊第13章 U 系列）的，置信度不得高於該懸案對應級別，並交叉引用。

---

## 1 兩大正規化：Chat Completion vs Text Completion

### 核心結論

ST 接入 AI 後端的兩條根本路徑，決定 prompt 構建、引數可用集、tokenizer 選擇方式均不同。所有云 API（Anthropic、Google、OpenAI、Mistral）走 Chat Completion；本地後端（KoboldCpp、llama.cpp、Oobabooga、TabbyAPI）通常走 Text Completion。

來源：docs.sillytavern.app Advanced Formatting ｜ 適用版本：ST v1.12.x+ ｜ 置信度：high `[文件·多源]`

| 維度 | Chat Completion | Text Completion |
|---|---|---|
| 資料結構 | Role-based 訊息陣列 `[{role, content}, ...]` | 單一連續字串 |
| Prompt 構建 | Prompt Manager（ST 介面拖拽） | Advanced Formatting + Context Template + Instruct Mode |
| Tokenizer | 自動匹配（由後端返回） | 需手動選擇或自動派生（僅 llama.cpp/KoboldCpp 支援 hash 匹配） |
| 主要適用 | OpenAI / Claude / Gemini / Mistral 等雲 API | KoboldCpp / Oobabooga / llama.cpp / TabbyAPI 等本地後端 |
| System Prompt | 由 provider 原生支援（Claude/Gemini），或合併進 user 訊息 | 手動構建 story string + system sequence |
| Stop Strings | `stop_sequences`（Claude）/ `stop`（OAI）等 | 模板字首序列自動充當 stop |

### 避坑

- Text Completion 的 Instruct Mode 模板與 Chat Completion 的 Prompt Manager **互斥**，切換後端時須確認激活了正確的 prompt 構建路徑。
- 同一角色卡在兩種模式下格式體驗差異極大，勿混用。

---

## 2 ST 請求流架構與關鍵檔案

### 核心結論

ST Chat Completion 請求的完整鏈路（高層概覽）：

```
使用者訊息
  → public/scripts/openai.js           前端請求構建、引數收集
  → POST /api/backends/chat-completions
  → src/endpoints/backends/chat-completions.js   後端路由 + 各 provider 分發
  → src/prompt-converters.js           格式轉換（Claude / Google / Cohere 等）
  → 各 provider API（Anthropic / Google / OpenAI 等）
```

來源：ST staging 原始碼 `chat-completions.js` ｜ 適用版本：ST 1.14.x–1.16.x ｜ 置信度：high `[執行時原始碼]`

### 關鍵函式速查

| 檔案 | 函式 | 職責 |
|---|---|---|
| `chat-completions.js` | `sendClaudeRequest()` | Anthropic API 請求傳送、引數組裝 |
| `chat-completions.js` | `sendGoogleRequest()` | Gemini API 請求傳送 |
| `prompt-converters.js` | `convertClaudeMessages()` | 訊息陣列 → Claude `system` + `messages` 格式 |
| `prompt-converters.js` | `convertGooglePrompt()` | 訊息陣列 → Gemini `contents` + `systemInstruction` 格式 |
| `prompt-converters.js` | `convertCohereMessages()` | 訊息陣列 → Cohere 格式 |

---

## 3 Chat Completion 核心引數支援矩陣

### 核心結論

各 provider 對 Chat Completion 通用引數的實際支援差異顯著，不可假定引數可跨 provider 通用。

來源：ST v1.14.0 原始碼 + Anthropic/Google/OpenAI 文件 ｜ 適用版本：ST 1.14.x / API 2026-06 ｜ 置信度：`medium·單源孤證`（矩陣整體；各單元格獨立標註見下）`[執行時原始碼 + 文件·多源]`

> **注意**：本矩陣基於 ST v1.14.0 原始碼驗證；高版本（1.15/1.16）行為以 staging 原始碼為準。Claude Sonnet 4.6 的 temperature 狀態詳見第13章 U3（懸案）。

| 引數 | OpenAI (GPT-4o/o3) | Claude (Anthropic) | Gemini (Google) | Mistral |
|---|---|---|---|---|
| `temperature` | ✅ 0.0-2.0 | ⚠️ 0.0-1.0，Opus 4.7+ 停用；Sonnet 4.6 詳見第13章 U3 | ✅ 0.0-2.0 | ✅ |
| `top_p` | ✅ | ⚠️ 與 temperature 互斥，Opus 4.7+ 停用；Sonnet 4.6 詳見第13章 U3 | ✅（欄位名 `topP`） | ✅ |
| `top_k` | ❌ | ⚠️ 支援（舊模型）但 Opus 4.7+ 停用；Sonnet 4.6 支援情況詳見第13章 U3 | ✅（欄位名 `topK`，最大 500） | ❌ |
| `frequency_penalty` | ✅ | ❌ | ❌ | ✅ |
| `presence_penalty` | ✅ | ❌ | ❌ | ✅ |
| `max_tokens` | ✅（欄位名 `max_completion_tokens`） | ✅（**必填**，無預設值） | ✅（欄位名 `maxOutputTokens`） | ✅ |
| `stop` / `stop_sequences` | `stop`（陣列） | `stop_sequences`（陣列） | 無直接等價 | `stop` |
| `stream` | ✅ SSE | ✅ SSE | ✅ SSE | ✅ |
| `seed` | ✅（確定性輸出） | ❌ | ✅ | ✅ |
| `logit_bias` | ✅ | ❌ | ❌ | ❌ |
| `safe_prompt` | ❌ | ❌ | `safetySettings`（獨立欄位） | ✅（Mistral 特有） |
| `systemInstruction` | ❌ | ❌（用獨立 `system` 欄位） | ✅ | ❌ |
| Thinking 控制 | `reasoning_effort`（o 系列） | `thinking` + `output_config.effort` | `thinkingBudget` / `thinkingLevel` | ❌ |

### 避坑

- Claude Opus 4.7+ 傳送 `temperature`/`top_p`/`top_k` 將直接返回 **400 錯誤**（不是忽略，是拒絕）。置信度：high `[文件·多源]`
- `top_p` 與 `temperature` 在 Sonnet 4.5 / Haiku 4.5 上互斥，只能二選一發送（ST v1.14.0 原始碼 `isLimitedSampling` 正則覆蓋這兩款，邏輯已驗證）。置信度：high `[執行時原始碼]`
- **Sonnet 4.6 的 sampling 狀態**：官方遷移文件明確 Sonnet 4.6 可用 temperature 或 top_p（二選一），但 ST v1.14.0 的 `isLimitedSampling` 正則不覆蓋 `sonnet-4-6`，意味著該 ST 版本會無條件向 Sonnet 4.6 傳送全部引數——是否導致 400 需真機驗證，詳見第13章 U3。置信度：medium·推導未驗證 `[執行時原始碼 + 文件·單源]`

---

## 4 Claude (Anthropic) 專有引數與行為

### 4.1 請求體標準結構

**核心結論**：Claude Messages API 請求體格式，`system` 是陣列（非字串），最後一條 `assistant` 訊息充當 prefill。

來源：Anthropic 官方 API 文件 + ST `chat-completions.js` 原始碼 ｜ 適用版本：Anthropic API 2026-06 ｜ 置信度：high `[執行時原始碼 + 文件·多源]`

```json
{
  "model": "claude-opus-4-8",
  "max_tokens": 4096,
  "system": [
    {
      "type": "text",
      "text": "你是一個角色扮演助手...",
      "cache_control": {"type": "ephemeral"}
    }
  ],
  "messages": [
    {"role": "user", "content": "你好"},
    {"role": "assistant", "content": "你好！我是"}
  ],
  "stop_sequences": ["Human:", "\n\nHuman:"],
  "stream": true
}
```

**注意事項**：
- `system` 欄位為**陣列**（支援多個 text block），不是字串——直接傳字串 API 能接受，但不支援 `cache_control`。
- 最後一條 `assistant` 訊息作為 **prefill**（ST 的 `assistant_prefill` 功能），Claude 從該文字繼續生成。
- `max_tokens` 是**必填欄位**，無預設值，漏填直接報錯。

---

### 4.2 Sampling 引數廢棄時間線（重大坑）

**核心結論**：Anthropic 在 Opus 4.7 及以上型號徹底廢棄 sampling 引數，傳送非預設值即 400。

來源：Anthropic 遷移文件 + narracomm 報道 + ST GitHub issue #4929 ｜ 適用版本：Anthropic API 2026-Q2 ｜ 置信度：high `[文件·多源 + 社群]`

| 模型 | temperature | top_p | top_k | 處理方式 |
|---|---|---|---|---|
| Claude 3.x / Opus 4.5 及以前 | ✅ 0.0-1.0 | ✅ | ✅ | 正常傳送 |
| Claude Sonnet 4.5 / Haiku 4.5 | ⚠️ | ⚠️ 與 temp 二選一 | ❌（top_k 單獨無限制，但 isLimitedSampling 不刪它） | 只能發 temp 或 top_p 其中一個 |
| Claude Sonnet 4.6 | ⚠️ temp 或 top_p 二選一 | ⚠️ 與 temp 二選一 | ❓（官方未明確，詳見第13章 U3） | **置信度：medium·單源孤證 `[文件·單源]`**，需真機驗證 |
| Claude Opus 4.7 / Opus 4.8 | ❌ | ❌ | ❌ | **傳送即 400 錯誤** |
| Claude Fable 5 / Mythos 5 | ❌ | ❌ | ❌ | **傳送即 400 錯誤** |

**ST 現狀（v1.14.0 實測）**：`isLimitedSampling` 正則 `/^claude-(opus-4-1|sonnet-4-5|haiku-4-5)/` 只覆蓋舊模型，Sonnet 4.6 / Opus 4.7+ 均不在此正則內，意味著 ST v1.14.0 對這些新模型會無條件發 temperature + top_p + top_k（僅 thinking 啟用時才自動刪除）。用 Opus 4.7+ 必須透過引數過濾代理中轉或等待 ST 修復。置信度：high `[執行時原始碼]`

**Anthropic 官方替代控制方案**：
- 用 prompt engineering 控制風格（sampling 引數不再生效）
- 對推理深度使用 `output_config.effort`

---

### 4.3 Thinking / Adaptive Thinking 引數

**重要區分**：API 層面（Anthropic 官方）已遷移至 `adaptive` 模式；但 ST v1.14.0 服務端原始碼仍用舊 `budget_tokens` 格式。以下分兩層說明。

來源：Anthropic Adaptive Thinking 文件（API 層）+ ST v1.14.0 `chat-completions.js` 原始碼（ST 行為層）｜ 適用版本：Anthropic API 2026-06 / ST v1.14.0 ｜

#### Anthropic API 官方現狀（high `[文件·多源]`）

| 模型代 | 舊 API（狀態） | 新 API |
|---|---|---|
| Opus 4.6 / Sonnet 4.6 | `thinking: {type:"enabled", budget_tokens: N}`（已棄用，仍可用） | `thinking: {type:"adaptive"}` 推薦 |
| Opus 4.7 / Opus 4.8 | `thinking: {type:"enabled", ...}` → **400 錯誤** | `thinking: {type:"adaptive"}` 唯一方式 |
| Fable 5 / Mythos 5 | 無法停用 | always on，`{type:"disabled"}` 不支援 |

#### Effort 引數（控制思考深度，與 adaptive 配合使用）

```json
{
  "thinking": {"type": "adaptive", "display": "summarized"},
  "output_config": {"effort": "medium"}
}
```

| effort 值 | 行為 |
|---|---|
| `max` | 無約束深度思考，始終思考 |
| `xhigh` | 深度探索（僅 Fable 5 / Mythos 5 / Opus 4.8 / 4.7） |
| `high`（預設） | 幾乎始終思考 |
| `medium` | 中等思考，簡單問題可能跳過 |
| `low` | 最小化思考 |

#### ST v1.14.0 實際傳送格式（medium·推導未驗證 `[執行時原始碼]`）

**⚠️ 草稿原宣告需要修正**：ST v1.14.0 原始碼（`chat-completions.js` 第256-259行）用的是舊 `budget_tokens` 格式：

```js
// ST v1.14.0 實際程式碼
requestBody.thinking = {
    type: 'enabled',
    budget_tokens: budgetTokens,
};
```

**ST v1.14.0 不傳送** `reasoning_effort` 或 `include_reasoning` 至 Anthropic 端點（這些欄位僅用於 OpenAI/OpenRouter 端點）。issue #5558 的 "ST 發 reasoning_effort 到 Claude" 報告適用於更高版本（若有此 issue），v1.14.0 原始碼中 Claude 路徑未見此格式。建議在使用高版本 ST（1.15+）時自行抓包驗證實際請求體。置信度：medium·推導未驗證

**避坑**：若啟用 thinking 且出現結構衝突（末尾 assistant prefill + thinking 塊），ST 會觸發 `fixThinkingPrefill` 邏輯將末尾 assistant 訊息轉為 user 訊息，行為變化須注意。置信度：high `[執行時原始碼]`（v1.14.0 第267-269行可直讀）

---

### 4.4 Prompt Caching 引數（ST 配置）

**核心結論**：ST 透過 `config.yaml` 控制 Anthropic Prompt Caching 行為，啟用後對 `system` 陣列末尾項追加 `cache_control`。

來源：ST 社群文件 + 原始碼 ｜ 適用版本：ST 1.14.x+ ｜ 置信度：high `[社群 + 執行時原始碼]`

ST `config.yaml` 相關鍵：
```yaml
claude:
  enableSystemPromptCache: true    # 系統提示啟用 cache_control
  cachingAtDepth: 2                # 從倒數第 2 條訊息開始快取（偶數值，避免 0）
  enableChatHistoryCaching: true
```

當 `enableSystemPromptCache: true` 時，ST 對 `system` 陣列最後一項追加 `"cache_control": {"type": "ephemeral"}`。

**避坑**：ST v1.14.0 原始碼（第141-145行）對 `cachingAtDepth` 的處理：若值為**負數或非整數**則停用深度快取（設為 -1）；**設為 0** 會觸發 `cachingAtDepthForClaude` 對所有訊息追加 cache_control（非"不快取"，而是"全部快取"）。避免設為 0 的原因是命中率極差而非無效。建議設為 2 或 4。置信度：high `[執行時原始碼]`

---

## 5 Google Gemini 專有引數與行為

### 5.1 請求體標準結構

**核心結論**：Gemini 的訊息格式與 OpenAI 不同，角色名為 `user`/`model`，所有生成引數集中在 `generationConfig` 子物件內，系統提示走 `systemInstruction` 獨立欄位。

來源：ST v1.14.0 `chat-completions.js` `sendMakerSuiteRequest()` 函式（注：草稿原稱 `sendGoogleRequest()`，v1.14.0 實際函式名為 `sendMakerSuiteRequest()`）｜ 適用版本：ST 1.14.x / Gemini API 2026-06 ｜ 置信度：high `[執行時原始碼]`（`thinkingBudget` 直讀；`thinkingLevel` 為推斷，詳見第13章 U2）

```json
{
  "contents": [
    {"role": "user", "parts": [{"text": "你好"}]},
    {"role": "model", "parts": [{"text": "你好！"}]}
  ],
  "systemInstruction": {
    "parts": [{"text": "你是一個角色扮演助手"}]
  },
  "generationConfig": {
    "temperature": 1.5,
    "topP": 0.9,
    "topK": 500,
    "maxOutputTokens": 2048,
    "responseMimeType": "text/plain",
    "seed": 42
  },
  "safetySettings": [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "OFF"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "OFF"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "OFF"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "OFF"},
    {"category": "HARM_CATEGORY_CIVIC_INTEGRITY", "threshold": "BLOCK_NONE"}
  ],
  "thinkingConfig": {
    "thinkingBudget": 8192
  }
}
```

### 5.2 關鍵差異速查

| 差異點 | Gemini 特有行為 |
|---|---|
| 角色名 | `user` / `model`（不是 `assistant`） |
| 生成引數位置 | 均在 `generationConfig` 子物件內（camelCase） |
| 系統提示 | `systemInstruction.parts[].text`（獨立欄位） |
| Safety Settings | ST 預設全關（RP 場景特意配置） |
| Thinking（2.5 系列 + gemini-3-pro） | `thinkingConfig.thinkingBudget`（整數）置信度：high `[執行時原始碼]`（v1.14.0 直讀） |
| Thinking（3.0/3.1 系列） | `thinkingConfig.thinkingLevel: "low"\|"high"` 置信度：medium·推導未驗證 `[推斷]`（v1.14.0 原始碼未覆蓋此係列，詳見第13章 U2） |

**避坑**：Gemini Safety Settings 預設全關是 ST 針對 RP 場景的特意配置，生產環境非 RP 場景需手動恢復安全過濾。

**懸案（→ 第13章 U2）**：Gemini `thinkingLevel` vs `thinkingBudget` 的精確適用模型邊界（3.0/3.1 vs 2.5 系列）待官方文件確認。另：ST v1.14.0 原始碼使用 `thinkingBudget`（整數），覆蓋正則為 `gemini-2.5-(flash|pro)` 和 `gemini-3-pro`，不覆蓋 3.1 系列。

---

## 6 OpenAI (GPT-4o / o 系列) 專有引數

### 核心結論

OpenAI Chat Completion 格式是 ST 其他 provider 對齊的"基準格式"。o 系列推理模型新增 `reasoning_effort` 引數，移除 `temperature`。

來源：OpenAI 官方文件 + ST 原始碼 ｜ 適用版本：ST 1.16.x / OpenAI API 2026-06 ｜ 置信度：high `[文件·多源]`

#### 標準 GPT-4o 請求

```json
{
  "model": "gpt-4o",
  "messages": [
    {"role": "system", "content": "你是助手"},
    {"role": "user", "content": "你好"},
    {"role": "assistant", "content": "你好！"}
  ],
  "temperature": 0.8,
  "top_p": 0.9,
  "frequency_penalty": 0.5,
  "presence_penalty": 0.3,
  "max_completion_tokens": 2048,
  "stop": ["Human:"],
  "seed": 42,
  "stream": true
}
```

#### o3 / o4-mini 推理模型請求

```json
{
  "model": "o3",
  "reasoning_effort": "high",
  "messages": [
    {"role": "user", "content": "..."}
  ],
  "max_completion_tokens": 4096
}
```

**避坑**：o 系列不接受 `temperature`；`max_tokens` 欄位名已變更為 `max_completion_tokens`（舊欄位 ST 可能仍發舊名，需驗證）。

---

## 7 Prompt Post-Processing 五種模式

### 核心結論

ST Chat Completion 後端的 `postProcessPrompt()` 提供 5 種模式，控制訊息陣列在傳送前如何整理格式。不同 provider 對訊息格式有不同要求，選錯模式會導致格式錯誤或內容丟失。

來源：ST API Connections 文件 + `prompt-converters.js` 原始碼 ｜ 適用版本：ST 1.14.x+ ｜ 置信度：high `[文件·多源 + 執行時原始碼]`

| 模式 | 行為 | 推薦場景 |
|---|---|---|
| **None** | 最小處理，訊息按原樣傳送 | 所有 API 相容時 |
| **Merge consecutive** | 合併連續同角色訊息（同 role 相鄰訊息合為一條） | 通用推薦 |
| **Semi-strict** | 合併同角色 + 只允許一條 system 訊息 | Claude / Gemini |
| **Strict** | 嚴格交替角色（user→assistant→user），用佔位符填充 | 要求嚴格格式的 API |
| **Single user message** | 將全部歷史壓平為一條使用者訊息 | 極簡場景 |

**重要**：Merge / Semi-strict / Strict 額外**移除 tool calls**（除非選 "with tools" 變體）。

### Claude 推薦配置組合

在 ST UI 中選擇以下組合：

| 設定項 | 推薦值 |
|---|---|
| API Type | Chat Completion |
| Source | Claude (Anthropic) |
| Use system prompt | ✅（僅 Claude/Gemini 有效） |
| Squash system messages | ✅ |
| Prompt post-processing | Semi-strict 或 Strict |
| Assistant prefill | `{{char}}:` 字首（僅 Claude 有真正 prefill 效果） |
| Enable system prompt cache | ✅（config.yaml 中設定，cachingAtDepth: 2） |

---

## 8 System Prompt 與 Prefill 處理差異

### 8.1 System Prompt 合併策略

**核心結論**：各 provider 的 system prompt 傳遞路徑不同，不可假定 system 訊息處理一致。

來源：ST 文件 + 原始碼 ｜ 適用版本：ST 1.14.x+ ｜ 置信度：high `[文件·多源 + 執行時原始碼]`

| API 型別 | system prompt 處理 |
|---|---|
| **Claude** | `claude_use_sysprompt: true` → 所有 system 訊息（到第一條 user/assistant 前）合併為 `system` 陣列欄位獨立傳送 |
| **Gemini** | 合併為 `systemInstruction` 欄位 |
| **OpenAI** | system 訊息保留在 `messages` 陣列中（`role: "system"`），隨其他訊息一起傳送 |
| **Mistral** | 類似 OpenAI，支援 `safe_prompt` 布林值 |

**`squash_system_messages` 設定**（ST 全域性選項）：將 messages 陣列中多個連續 system 訊息合併為單條，減少格式錯誤。

---

### 8.2 Prefill（assistant_prefill）機制

#### Claude（原生支援）

**核心結論**：Claude 原生支援 prefill，ST 將 `assistant_prefill` 文字作為最後一條 `role: "assistant"` 訊息注入，Claude 從該文字繼續生成。

來源：Anthropic 文件 + ST 原始碼 ｜ 置信度：high `[文件·多源 + 執行時原始碼]`

- 效果：強制角色字首、角色名、特定格式
- 注意：若啟用 thinking 且出現結構衝突，ST 會將末尾 assistant 訊息轉為 user 訊息（`fixThinkingPrefill` 邏輯）

#### OpenAI Chat Completion（不原生支援 prefill）

**結論**：OpenAI 不支援真正的 prefill，末尾 assistant 訊息只是上下文歷史，不是續寫起點。

來源：ST GitHub issue #4429 + 社群實測 ｜ 置信度：medium·單源孤證 `[社群]`（單一 issue 來源，行為理解合理但無真機系統性驗證，不符合 high 標準）

- ST 新增的末尾 assistant 訊息會被 OpenAI 當作"已生成的上文"而非 prefill
- `add_generation_prompt: false` 方案已被 ST 標記為 not planned（issue #4429）
- **建議**：需要 prefill 效果必須用 Claude 直連或 Text Completion 模式，或透過 OpenRouter 中轉 Claude 模型

**懸案（→ 第13章 U5）**：Prefill 在 Fable 5 / Mythos 5（always-on thinking）上的行為待真機驗證。

---

## 9 Claude 當前模型 ID 完整表

### 9.1 當前推薦模型（2026-06-28）

**核心結論**：以下模型 ID 和引數限制來自 Anthropic 官方模型文件。

來源：platform.claude.com/docs/en/about-claude/models/overview ｜ 置信度：high `[文件·多源]`

| 模型 | API ID | 上下文 | 最大輸出 | Temperature | Thinking |
|---|---|---|---|---|---|
| Claude Fable 5 | `claude-fable-5` | 1M token | 128k | ❌ | 強制自適應 |
| Claude Opus 4.8 | `claude-opus-4-8` | 1M token | 128k | ❌ | 自適應（唯一方式） |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 1M token | 128k | ⚠️ 可用但只能 temp 或 top_p 二選一（→ 第13章 U3） | 自適應/擴充套件 |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | 200k | 64k | ✅（0-1.0） | ❌ |

### 9.2 歷史模型（仍可用）

| 模型 | API ID | temperature | 備註 |
|---|---|---|---|
| Claude Opus 4.7 | `claude-opus-4-7` | ❌ | 自適應 thinking 唯一方式；新 tokenizer（多產約 30% tokens） |
| Claude Opus 4.6 | `claude-opus-4-6` | ✅（謹慎） | extended thinking 仍支援但已廢棄路徑 |
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | ⚠️ temp 或 top_p 二選一 | 200k 上下文 |
| Claude Opus 4.1 | `claude-opus-4-1-20250805` | ✅ | **2026-08-05 退役** |

**重要**：Opus 4.7+ 引入新 tokenizer，同量文字多產約 **30% tokens**，計費和 context 計算需同步更新。置信度：high `[文件·多源]`（Anthropic 官方模型總覽和遷移文件均明確）

---

## 10 Anthropic Prompt Caching 完整配置

### 10.1 最小快取 Token 門檻

**核心結論**：各模型的最小可快取 token 數不同，低於門檻的內容無法寫入快取（不報錯，直接不快取）。

來源：Anthropic Prompt Caching 文件（2026-06-28 核實） ｜ 置信度：high `[文件·多源]`

| 模型 | 最小 token 數（Claude API） |
|---|---|
| Claude Fable 5 / Mythos 5 | 512（Bedrock 上為 1,024） |
| Claude Mythos Preview | 2,048 |
| Claude Opus 4.8 | 1,024 |
| Claude Opus 4.7 | 2,048 |
| Claude Opus 4.6 / 4.5 | 4,096 |
| Claude Sonnet 4.6 / 4.5 | 1,024 |
| Claude Haiku 4.5 | 4,096 |

### 10.2 計費倍率

| 型別 | 倍率（相對基礎輸入價） |
|---|---|
| 基礎輸入 | 1.0x |
| 5 分鐘 cache write | 1.25x |
| 1 小時 cache write | 2.0x |
| cache read | **0.1x**（節省 90%） |

### 10.3 快取失效場景

**避坑**：以下操作會使 Prompt Cache 失效：
- 在 `adaptive`、`enabled`、`disabled` 之間切換 thinking 模式：**訊息快取失效**；**system prompt 和 tools 快取保留**（Anthropic 文件原文："System prompts and tools remain cached despite thinking parameter changes"）。置信度：high `[文件·多源]`
- 修改 system prompt 內容（任何字元變化）：system 快取失效。置信度：high `[文件·多源]`
- 更改 `cachingAtDepth` 值：已快取的訊息深度位置改變，等效內容變化。置信度：medium·推導未驗證 `[推斷]`

---

## 11 高頻避坑清單（TOP 10）

**置信度：各條目獨立標註**

1. **Claude Opus 4.7+ 發 temperature/top_p/top_k → 400 錯誤**  
   ST 當前未修復（issue #4929 not planned）。用這些模型時需透過支援引數過濾的代理（如 LiteLLM）中轉。  
   置信度：high `[文件·多源 + 社群]`

2. **ST Thinking 引數格式與 Anthropic 新 API 不匹配**  
   ST v1.14.0 向 Claude 傳送舊格式 `thinking: {type:"enabled", budget_tokens: N}`，但 Opus 4.7/4.8 要求 `thinking: {type:"adaptive"}`，舊格式對這些模型會返回 **400 錯誤**。建議使用 ST 1.15+ 並自行抓包驗證，或透過 OpenRouter 中轉。  
   注：草稿原聲稱 ST 發 `reasoning_effort + include_reasoning` 到 Claude 端——v1.14.0 原始碼中 Claude 路徑不使用此格式（該欄位僅用於 OpenAI 系），原宣告系版本混淆，已修正。  
   置信度：high `[執行時原始碼]`（v1.14.0 直讀；issue #5558 記錄的問題行為需核實具體 ST 版本）

3. **Prefill 在 OpenAI Chat Completion 下無效**  
   末尾 assistant 訊息只是上下文，不是真正 prefill。需要 prefill 效果必須用 Claude 直連或 Text Completion 模式。  
   置信度：medium·單源孤證 `[社群]`（僅社群 issue 支撐，無真機實測資料；結論本身合理但支撐等級不足 high）

4. **Gemini 角色名是 `model` 不是 `assistant`**  
   ST 的 `convertGooglePrompt()` 負責轉換，自行寫程式碼時注意，直接發 `assistant` 會被 Gemini API 拒絕。  
   置信度：high `[執行時原始碼]`

5. **Gemini Safety Settings 預設全關（ST 特意配置）**  
   生產環境非 RP 場景需手動恢復安全過濾，否則可能產出有害內容。  
   置信度：high `[執行時原始碼]`

6. **Claude system 欄位是陣列不是字串**  
   直接傳字串 API 會接受，但不支援 `cache_control`；需要 Prompt Caching 必須用陣列格式。  
   置信度：high `[文件·多源]`

7. **squash_system_messages 在 OpenRouter + Claude 路由下不一定生效**  
   OpenRouter 可能將 system 訊息獨立傳遞，需結合 "Semi-strict" 後處理模式。  
   置信度：medium·推導未驗證 `[社群]`  
   驗證路徑：用 OpenRouter 發請求 + 檢視 OpenRouter dashboard 的實際 payload

8. **Opus 4.7+ 新 tokenizer 導致 token 數多出約 30%**  
   同樣內容在 Opus 4.7+ 比舊模型消耗更多 token，需調低 `openai_max_context` 或提高預算。  
   置信度：high `[文件·多源]`

9. **Prompt Caching 與 thinking 模式切換會破壞訊息快取**  
   在 `adaptive` 和 `enabled`/`disabled` 之間切換會使**訊息快取**失效；**system prompt 和 tools 快取保留**。（原草稿描述正確，置信度標註不變。）  
   置信度：high `[文件·多源]`

10. **`claude_max_temp = 1.0`（ST 前端內建上限）**  
    ST 前端 `openai.js`（第139行）硬編碼 `claude_max_temp = 1.0`，UI slider 上限受此約束；Claude API 本身上限也是 1.0（Sonnet 4.5 及以前）；Opus 4.7+ 已完全廢棄 temperature，此上限對新模型無實際意義。  
    置信度：high `[執行時原始碼]`（v1.14.0 `public/scripts/openai.js` 第139行直讀）

---

## 12 完整可用正規化程式碼

### 12.1 Claude Opus 4.8 直連（無 thinking，純文字生成）

**注意**：不發 temperature/top_p/top_k，這些在 Opus 4.7+ 會 400。

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=4096,
    system=[
        {
            "type": "text",
            "text": "你是示例學園的AI助手。",
            "cache_control": {"type": "ephemeral"}
        }
    ],
    messages=[
        {"role": "user", "content": "請介紹一下學院"},
        # prefill：強制回覆從特定文字開始
        {"role": "assistant", "content": "示例學園是"}
    ],
    stop_sequences=["Human:", "\n\nHuman:"],
    stream=False
)
print(response.content[0].text)
```

### 12.2 Claude Opus 4.8 + Adaptive Thinking

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-opus-4-8",
    max_tokens=16000,
    thinking={"type": "adaptive", "display": "summarized"},
    output_config={"effort": "medium"},
    messages=[{"role": "user", "content": "分析這段劇情的邏輯漏洞..."}]
)
for block in response.content:
    if block.type == "thinking":
        print(f"思考過程：{block.thinking}")
    elif block.type == "text":
        print(f"回覆：{block.text}")
```

### 12.3 Gemini 2.5 Pro（無安全過濾，適合 RP）

```python
import google.generativeai as genai

genai.configure(api_key=<redacted-at-snapshot>)
model = genai.GenerativeModel(
    model_name="gemini-2.5-pro",
    system_instruction="你是角色扮演助手",
    generation_config=genai.types.GenerationConfig(
        temperature=1.5,
        top_p=0.9,
        top_k=40,
        max_output_tokens=2048,
    ),
    safety_settings={
        "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
        "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
        "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
        "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
    }
)
response = model.generate_content("角色扮演開始")
print(response.text)
```

### 12.4 直接構建 Gemini API 請求（手動格式）

```python
import requests

payload = {
    "contents": [
        {"role": "user", "parts": [{"text": "你好"}]},
        {"role": "model", "parts": [{"text": "你好！"}]},
        {"role": "user", "parts": [{"text": "繼續..."}]}
    ],
    "systemInstruction": {
        "parts": [{"text": "你是一個角色扮演助手"}]
    },
    "generationConfig": {
        "temperature": 1.5,
        "topP": 0.9,
        "topK": 40,
        "maxOutputTokens": 2048
    },
    "safetySettings": [
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "OFF"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "OFF"}
    ]
}
# 注意：角色名用 "model" 不是 "assistant"
```

---

## 13 懸而未決：需真機驗證的問題

> 本章記錄當前置信度不足以據此施工的開放問題。驗證前不得將這些條目的結論用於生產。

| 編號 | 懸案 | 不確定度 | 驗證路徑 |
|---|---|---|---|
| **U1** | ST 1.15.x / 1.16.x 是否已修復 Opus 4.7/4.8 的 thinking 引數格式（v1.14.0 仍用舊 budget_tokens，高版本原始碼未直讀） | medium | 讀 ST staging 分支最新 chat-completions.js 的 sendClaudeRequest()；或抓 ST 1.15+ 發出的實際請求體 |
| **U2** | Gemini Thinking `thinkingLevel` vs `thinkingBudget` 適用模型邊界（3.0/3.1 vs 2.5 系列）的精確劃分 | medium | 參考 Google AI Studio 官方文件 + ST release notes 1.15-1.16 |
| **U3** | Claude Sonnet 4.6 的 temperature 在 ST 中的實際行為（官方文件確認 Sonnet 4.6 可用 temp 或 top_p 二選一；但 ST v1.14.0 的 isLimitedSampling 不覆蓋 sonnet-4-6，會無條件發全部引數——是否導致 400 未經真機驗證） | medium（API 規格已知，ST 行為待驗） | 在 ST v1.14.0 對 Sonnet 4.6 發請求，觀察是否因同時傳送 temp+top_p 導致 400 |
| **U4** | ST `squash_system_messages` 在 OpenRouter + Claude 路由下實際行為（OpenRouter 是否透傳 system 陣列） | medium | 用 OpenRouter 發請求 + 檢視 OpenRouter dashboard 的實際 payload |
| **U5** | Prefill 在 Fable 5 / Mythos 5 上的行為（always-on thinking 與舊 prefill 機制的衝突結果） | medium（原標 high 已降級：無真機證據，僅邏輯推斷） | 真機測試：發末尾 assistant 訊息，觀察生成是否從 prefill 文字續寫還是重新開始 |
| **U6** | Anthropic `cachingAtDepth` 與 adaptive thinking 共存的快取命中率（兩種機制疊加效果） | medium | 觀察 API 響應的 `usage.cache_read_input_tokens` 欄位，統計多輪對話的快取命中情況 |

### 矛盾點記錄（兩派並列，不強統一）

**矛盾 A：Claude system 欄位——字串 vs 陣列**

- 派別 1（Anthropic 官方示例）：`system` 應為陣列格式 `[{type, text, cache_control?}]`，支援 `cache_control`
- 派別 2（社群簡化實踐）：直接傳字串也被 API 接受，簡化程式碼
- 現狀：兩者均可用，但字串格式**不支援 Prompt Caching**；建議統一用陣列格式

**矛盾 B：ST Prompt Post-Processing 與 Claude 的最優模式**

- 派別 1（ST 文件）：推薦 Semi-strict（合併同角色 + 限單條 system）
- 派別 2（社群 RP 實踐）：Strict 模式減少格式錯誤，尤其長對話時
- 現狀：兩者都能工作，差異在於對 tool calls 和長對話的處理；建議短對話 Semi-strict，長 RP 敘事 Strict

---

## 參考來源

| 來源 | 型別 | 可信度 |
|---|---|---|
| [ST API Connections 文件](https://docs.sillytavern.app/usage/api-connections/) | 文件·官方 | high |
| [ST Chat Completions 文件](https://docs.sillytavern.app/usage/api-connections/openai/) | 文件·官方 | high |
| [ST Reasoning 文件](https://docs.sillytavern.app/usage/prompts/reasoning/) | 文件·官方 | high |
| [ST Advanced Formatting 文件](https://docs.sillytavern.app/usage/core-concepts/advancedformatting/) | 文件·官方 | high |
| [ST GitHub chat-completions.js (staging)](https://github.com/SillyTavern/SillyTavern/blob/staging/src/endpoints/backends/chat-completions.js) | 執行時原始碼 | high |
| [ST DeepWiki AI Integration](https://deepwiki.com/SillyTavern/SillyTavern/3-ai-integration) | 文件·多源 | high |
| [Anthropic Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview) | 文件·官方 | high |
| [Anthropic Adaptive Thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking) | 文件·官方 | high |
| [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) | 文件·官方 | high |
| [ST Issue #4929 - temperature/top_p 互斥](https://github.com/SillyTavern/SillyTavern/issues/4929) | 社群 | medium（單一 issue，結論需與原始碼交叉印證） |
| [ST Issue #5558 - Claude Opus 4.7 reasoning 引數錯誤](https://github.com/SillyTavern/SillyTavern/issues/5558) | 社群 | medium（ST 版本未確認；v1.14.0 原始碼不能印證此 issue 描述的行為） |
| [Narracomm: Anthropic 廢棄 sampling 引數](https://www.narracomm.com/anthropic-deprecates-temperature-top_p-and-top_k-on-newer-opus-models/) | 文件·單源 | medium（單源，需與 Anthropic 官方遷移文件交叉印證後方為 high） |
| [ST 1.16.0 release notes](https://github.com/SillyTavern/SillyTavern/discussions/5155) | 文件·官方 | high |
| [ST 1.15.0 release notes](https://github.com/SillyTavern/SillyTavern/discussions/4926) | 文件·官方 | high |
