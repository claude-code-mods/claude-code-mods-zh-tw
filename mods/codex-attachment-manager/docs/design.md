# 技術方案

> 目標、約束和驗收標準以 [spec.md](spec.md) 為準。本檔案說明現在是怎麼實現的、為什麼這樣做。
> 文中“已查證”的 Codex 行為，都針對桌面版 26.924（自帶命令列 0.158），標著 v0.3 的針對 26.930（自帶命令列 0.160）；Codex 更新後可能變化。第 12 節的 Claude 行為（v0.4）針對 Claude 桌面應用 2.31226，自帶 Claude Code 2.1.293；思考記錄部分和壓縮之後（v0.5）在 Claude Code 2.1.295 上查證。
> v0.1 開發過程中的調研和排錯經過，歸檔在 [history/v0.1/](history/v0.1/)，其中 plan.md 是當時逐步寫成的完整方案。

## 1. 總體結構

在客戶端和它原本使用的模型服務之間放一個只在本機監聽的代理（引擎）：

1. Codex 照常把完整請求發給引擎；
2. 引擎按這個任務的勾選，把取消的圖換成佔位符，再轉發給對應的官方或自定義服務；
3. 回覆原路返回，由 Codex 照常記進同一個任務。

任務不換，歷史和介面都不動，勾選和取消從下一次請求起生效。v0.4 起，Claude Code 的請求也經過同一個引擎，見第 12 節。v0.9 把平臺協議和上游地址分開：中轉線路繫結平臺和原服務地址，按平臺選擇圖片改寫器，再發往繫結的服務，不靠域名判斷是否執行 Claude 改寫。

另一條路線是在新任務裡重建歷史（階段 0 驗證過，技術上可行）。沒有采用，因為使用者要在同一個任務裡看到連續的對話，見 [history/v0.1/phase0-report.md](history/v0.1/phase0-report.md)。

v0.11 起程式碼分成三層（[v0.11/plan.md](v0.11/plan.md)）：`core/` 是不認識任何平臺的核心，`panel/` 是面板，`adapters/<平臺>/` 是各平臺的接入；`plugin/src` 頂層只放入口（`plugin-server.ts`、`proxy.ts`、`cam.ts`）、引擎的生命週期（`engine.ts`）和平臺登記表（`platforms.ts`）。分層規則由 `spike/src/layers.test.ts` 檢查。Codex 和 Claude Code 帶面板，接入層讀它們自己的本地記錄；其餘平臺只接核心，不帶面板，見 [v0.11/plan.md](v0.11/plan.md) 第 3.8、3.9 節和對外的 [ADAPTERS.md](../ADAPTERS.md)。

| 部分 | 程式碼（`plugin/src`） | 作用 |
|---|---|---|
| 引擎 | `proxy.ts`（入口）、`core/engine/transport.ts`、`adapters/codex/engine.ts`、`adapters/claude/engine.ts`、`engine.ts`、`core/routes.ts` | 本機代理：按繫結線路轉發、改寫請求、記錄每個任務最近一次請求的統計；全機只有一個 |
| 外掛服務 | `plugin-server.ts` | Codex 為每個會話啟動的 MCP 服務：拉起並看守引擎，給面板提供資料；v0.3 起還給模型提供取圖工具 |
| 面板 | `panel/panel.html`、`panel/page.ts`、`panel/panel-state.ts`；Codex、Claude 各自的讀取在 `adapters/codex/panel.ts`、`adapters/claude/panel.ts` | 側邊面板裡的 MCP 應用，以及它要顯示的資料 |
| 任務索引 | `adapters/codex/thread-index.ts`、`adapters/codex/children.ts`、`adapters/protocols/openai-responses/images.ts`、`core/images.ts`、`core/session.ts`、`core/pixels.ts`、`core/thumbnail.ts`、`core/png.ts`、`adapters/codex/thread-names.ts` | 從 Codex 的任務記錄裡只讀地找出圖片和它的來源、編號、生成縮圖、讀任務名 |
| 改寫 | `core/plan.ts`、`core/words.ts`、`adapters/protocols/openai-responses/rewrite.ts`、`core/selection.ts`、`adapters/codex/selection.ts`、`adapters/claude/selection.ts`、`core/request-stats.ts`、`core/notes.ts` | 每張圖發不發、換成什麼字（兩個平臺共用）；發給模型的全部文字；把決定落進 Responses 請求；勾選狀態；請求統計；特徵行 |
| 接入和安裝 | `adapters/codex/`：`codexconfig.ts`、`setup.ts`、`install.ts`、`codexcli.ts`、`plugin-cache.ts`、`binding.ts`；`cam.ts` | 管理 Codex 配置裡帶標記的塊；用 Codex 的命令列裝卸外掛；保護升級中的舊執行檔案；新任務繫結；`cam` 命令列 |
| 其他 | `core/language.ts`、`adapters/codex/language.ts`、`core/messages.ts`、`core/paths.ts`、`core/migrate-data.ts`、`core/entry.ts` | 語言、文字表、資料目錄、舊資料遷移 |
| Claude 接入（v0.4） | `hooks/register.js`（Mod，不在 `plugin/src`） | 把會話的請求地址指向引擎；`/cam` 打開面板（v0.6 起有圖時自動開啟）；取圖工具免確認 |
| Claude 會話索引和改寫（v0.4） | `adapters/claude/claude-index.ts`、`adapters/claude/claude-rewrite.ts`、`adapters/protocols/anthropic-messages/rewrite.ts` | 從 Claude Code 的會話記錄找圖、編號，把請求裡的圖對上記錄；把決定落進 Anthropic Messages 請求 |
| Claude 思考記錄和提示快取（v0.4、v0.10） | `adapters/protocols/anthropic-messages/thinking.ts`、`adapters/protocols/anthropic-messages/cache.ts` | 賬號校驗思考記錄時，去掉和實際發出的歷史對不上的思考；改過歷史後，讓提示快取仍能讀到 |
| 面板頁（v0.4） | `panel/panel-web.js`、`panel/panel-language.ts`、`adapters/claude/panel-web.ts` | 引擎把 `panel.html` 作為網頁提供時，代替 MCP 應用的宿主 |
| 只接核心的平臺（v0.11） | `platforms.ts`、`core/platform.ts`、`core/request-index.ts`、`adapters/protocols/any.ts`、`adapters/protocols/openai-chat/rewrite.ts`、`adapters/protocols/gemini/rewrite.ts`、`adapters/{workbuddy,opencode,gemini-cli,pi,qwen-code,cline,kilo-code,goose,cherry-studio}/platform.ts`、`adapters/pi/extension.ts` | 平臺登記表和每個平臺的條目；按路徑認格式，從請求本身認圖、按內容編號、存原圖，自動選圖一直開著；`cam connect` 登記線路；pi 的擴充套件加會話頭、註冊取圖服務 |
| DeepSeek Harness（v0.11） | `adapters/dsh/index.js`、`adapters/dsh/offload.js`、`adapters/dsh/package.json`、`adapters/dsh/cordis.patch.yml` | dsh 外掛包：裝上時停掉官方的圖片解除安裝行，新一輪開始時解除安裝之前各輪的圖，圖片超預算時照舊解除安裝最舊的 |
| 安裝到其他平臺（v0.11） | `platforms.ts`（`detectPlatform`）、`core/config-edit.ts`、各平臺條目的 `detect` 和 `setup`、`cam.ts`（`detect`、`connect --apply`、`disconnect`） | 按環境變數認平臺；改平臺的設定檔案，記下改了哪幾項和原來的值（不復制檔案，裡面可能有 API key），撤回時只動還保持原樣的設定 |
| 換模型後接回 Codex（v0.11） | `adapters/codex/setup.ts`（`wantsEngine`、`keepRouted`）、`adapters/codex/codexconfig.ts`（`routedThroughEngine`）、`proxy.ts` | config.toml 被 cc-switch 之類改寫後，引擎重新接上，線路指向使用者新選的服務商 |

引擎和外掛服務之間只通過資料目錄裡的檔案共享狀態，任何一方不在，另一方都照常工作。

## 2. 接入 Codex

- **地址**：`config.toml` 頂層的 `openai_base_url = "http://localhost:17891/backend-api/codex"`。
  - 必須以 `/backend-api/codex` 結尾，否則 Codex 會關掉後端專用的介面；引擎把同樣的路徑轉發到 `https://chatgpt.com`。
  - API key 登入的 Codex 也用這個地址（2026-10-22 用假 key 對著本機假服務實測）：請求一樣發到 `…/backend-api/codex/responses`，帶 `Authorization: Bearer sk-…`，沒有 ChatGPT 登入才有的 `chatgpt-account-id`。chatgpt.com 不認 API key，所以引擎認出這種請求（`proxy.ts` 的 `routeOf`）後，轉給 `https://api.openai.com`，路徑裡的 `/backend-api/codex/` 換成 `/v1/`，正是沒裝工具時 Codex 的預設地址。請求體同樣是 Responses 請求，改寫照舊。WebSocket 升級也按同樣的規則轉發。v0.9 對舊入口先排除 Claude 身份和矛盾標識；不能因為 Claude 的訂閱令牌也以 `sk-` 開頭，就把它發往 OpenAI。
  - 寫 `localhost` 不寫 `127.0.0.1`：Windows 代理設定裡的 `<local>` 只讓不帶點的主機名直連。
- **`features.respect_system_proxy = true`**：讓 Codex 先看 Windows 的代理設定。否則使用者環境裡有 `HTTP(S)_PROXY`、沒有 `NO_PROXY` 時，連本機的請求也會被交給系統代理，然後失敗。
- **`~/.codex/.env` 裡的 `NO_PROXY`**：生圖、改圖的客戶端只認環境變數。Codex 啟動時會讀 `.env`，所以在需要時寫一段 `NO_PROXY=localhost,127.0.0.1,::1`，合併使用者自己的條目。`.env` 可能含金鑰，工具不復制、不輸出它。
- **帶標記的塊**：上面三處都是工具自己管理、帶標記的塊。改之前先備份，整個檔案寫好再替換；恢復時只清理自己管理的塊，絕不用舊備份整體覆蓋（Codex 執行時自己也會寫 `config.toml`）。v0.9 使用者自設的 `openai_base_url` 和供應商地址按下面的線路方式接管；`respect_system_proxy = false` 仍報告衝突，不覆蓋。
- **自定義服務（v0.9）**：`codexconfig.ts` 只改可安全識別的單行 `openai_base_url` 和 `model_providers.<名稱>.base_url`，支援普通表和點分鍵。每條原地址在原位置包進 `managed upstream` 註釋塊，儲存原行和外掛寫入的行；停用時，當前地址仍等於外掛所寫的才還原，使用者後來改過的地址或增加的其他行保留。引號鍵、BOM、換行形式和原行可還原；三引號地址、內聯供應商表等未支援寫法在登記和寫配置之前拒絕。外部 profile 檔案和環境變數覆蓋不自動改寫。
  - `planEngine` 預檢時只驗證、生成計劃；`useEngine` 先登記目標，再寫配置，避免配置引用不存在的線路。供應商名稱、模型、`env_key`、其他認證設定、自定義頭和查詢引數不改。第三方工具改了地址後，重新啟用並重啟 Codex，重新登記當前配置。
  - `routes.ts` 把 `{platform, baseUrl}` 存進資料目錄的 `routes/`，用本機隨機共享金鑰的 HMAC 生成不暴露上游地址的穩定線路編號；同一配置重複登記冪等。記錄不復制客戶端認證頭，HTTP 請求本身也不能指定任意上游；未知編號本機拒絕。
  - 本機地址是 `http://localhost:17892/__cam/routes/<編號>`。轉發時去掉本機線路字首，把原上游的協議、埠、基礎路徑和查詢引數接回去；連線層支援 HTTP 和 HTTPS，按實際目標遵守 `NO_PROXY`。平臺和目標分離，已登記線路不看金鑰字首來猜平臺。
  - HTTP 和 WebSocket 都按相同線路選擇目標、過濾內部頭和另一平臺獨有的認證標識；中轉本身需要的 `Authorization`、`x-api-key` 由客戶端提供，不能因為域名不是官方域名就一律刪掉。明確的相反平臺身份會拒絕；舊入口裡既認不出客戶端、又不屬於已知 Codex 介面的請求不再預設轉給 ChatGPT。
- **經過引擎的介面**：對話走 `…/responses`（預設 WebSocket，失敗時回退到 HTTP），歷史壓縮走 `…/responses/compact`，生圖和改圖走 `…/images/generations`、`…/images/edits`。
- **認出任務**：每個請求的 `x-codex-turn-metadata` 請求頭裡有 `thread_id`、`turn_id`。
- **往外連**：引擎沿用系統代理：Windows 讀登錄檔；macOS 讀 `scutil --proxy`，只認 HTTP(S) 代理；Linux 只看環境變數。遵守 `NO_PROXY`。
- **副作用**：地址不是官方域名時，Codex 會去掉請求裡附帶的工具結果元資料（`tool_result_metadata`）。這是隨請求上報的內部元資料，模型看不到。

## 3. 找圖和編號（任務索引）

- **圖片在請求和記錄裡的樣子**：
  - 使用者上傳：使用者訊息裡依次是 `<image name=[Image #N] path="…">`、圖片、`</image>` 三段。`[Image #N]` 在每條訊息裡都從 1 開始。
  - 工具檢視和生成：Codex 的工具都經 `exec`（程式碼模式）呼叫，圖片在 `custom_tool_call_output` 裡。檢視的檔案路徑寫在呼叫程式碼裡；生成的圖後面跟著一段說明儲存路徑的文字。
  - 檢視的圖的名字（v0.10.1，`images.ts` 的 `viewName`）：只讀程式碼、不執行。每次 `view_image` 呼叫取引數裡 `path` 的最後一個字串，是圖片檔名才算（`p + "a.png"`、`` `${dir}/a.png` ``、`join(dir, "a.png")` 都是 a.png）；名字沒寫出來（`p + name`、只寫了 `".png"`）或是幾個裡挑一個（`?:`、`||`）的，留空。同一段程式碼裡用 `cam_view_image` 取回的副本（前面那行標籤認得出）不算；其餘的圖按呼叫順序對應，圖數和呼叫數對不上時都留空，寧缺不錯。原來只認寫死的路徑，拼出來的路徑沒有名字；一次呼叫看不出名字時，後面呼叫的名字還會挪到前一張圖上。
  - 託管生圖的結果（`image_generation_call.result`）是必填欄位，換不成文字，所以不能取消。
  - 桌面版的評論截圖：使用者在 Codex 裡給 PDF 或網頁加評論時，使用者訊息裡先是評論的文字（PDF 的評論帶 `PDF path: …`、`PDF page: 3/12` 兩行），然後每條評論一段說明、緊跟一張不帶標籤的圖。說明的原文見第 11 節。
- **編號**：從任務的本地記錄（rollout，只讀）裡按順序找出所有圖片出現記錄，依次編號 IMG-001、IMG-002……記錄只會追加，已有的編號不變。編號只由記錄決定，外掛服務和引擎各自計算，結果一致，不用共享狀態。
- **請求和記錄對得上**：請求裡的訊息和工具輸出帶著和本地記錄相同的 `id`，所以按“條目 `id` + 圖片在條目裡的序號”就能對上，不受壓縮和位置變化影響。沒有 `id` 時用 `call_id`，再沒有就用型別、輪次和內容雜湊。
- **內容相同**：先比較 base64 內容的雜湊，再比較 PNG 解碼後的畫素雜湊。畫素指紋存在資料目錄的 `cache/pixels/`，引擎和各個外掛服務共用，不存圖片內容。
- **來源**（v0.2，`images.ts`，面板按它篩選）：
  - 一般就是圖的型別：使用者上傳、檢視的圖片、工具返回、生成的圖片。
  - 使用者訊息裡的圖，前一段文字是 Codex 的評論說明（第 11 節），就算 PDF 頁面或網頁截圖。說明必須是自己單獨一段、緊挨在圖前面，別的文字裡出現同樣的話不算。
  - PDF 頁面從說明裡取頁碼。這條訊息裡的 `PDF path:` 只有一個路徑時，取它的檔名，面板用它當名稱。
  - 認不出的一律算使用者上傳，不會標錯。
  - 來源、頁碼、檔名是單獨的欄位，改寫請求不用它們，圖片的名稱和型別也不變，所以發給模型的文字和 v0.1 一樣。
- **取回的副本**（v0.3，`images.ts`、`thread-index.ts`）：取圖工具在每張圖前寫一行“[圖片 IMG-xxx 取回的原圖｜…]”（英文是 “[Image IMG-xxx fetched original | …]”）。工具輸出裡緊跟在這行後面、內容又和 IMG-xxx 相同（位元組或畫素）的圖，記成 IMG-xxx 的副本：
  - 不另編號，後面的編號照舊；面板不單列，只在原圖那一行標出。
  - 記下它在哪一輪，引擎據此只在那一輪發送它，面板據此列出“最近一輪模型取回”。
  - 只認工具輸出裡的這行字；使用者自己打出同樣的字不算。內容對不上的也不算，照常編號。
- **記錄行**（v0.8，`notes.ts`，讀法 Codex 和 Claude 相同）：模型回覆裡單獨一行、寫成 `[//]: # (cam IMG-015 …)` 的 Markdown 連結定義（行首最多 3 個空格，括號裡不能再有半形括號）。
  - 只讀模型自己的回覆：Codex 是 `role: "assistant"` 訊息的 `output_text`，Claude 是助手記錄的文字塊。使用者訊息和工具結果裡同樣的字不算，網頁內容就塞不進來。
  - 正文以“評價：”或“rated:”開頭的是評價，記下所在的輪次，按時間累積；其餘是特徵行，同一張圖只認第一行，以後不改。
  - 和編號一樣，引擎和外掛服務各自從記錄裡算，不另存檔案。場景是特徵行在“｜”（英文是“ | ”）之前的那一段（`sceneOf`）。
- **記錄的存放**：
  - `sessions/YYYY/MM/DD`，按建立那天的本地日期分目錄；長任務分成好幾段。
  - 分叉任務的前半段歷史在父任務的記錄裡，沿記錄開頭的 `history_base` 跨任務讀取。
  - 歸檔的任務挪到 `archived_sessions`，一樣要讀；新版 Codex 會把一週沒動的記錄壓縮成 `.jsonl.zst`，用 Node 自帶的 zstd 解開。
  - 前面某一段歷史找不到了（例如被刪掉），就跳過這一段，照常讀剩下的，面板上提示。
- **目錄遍歷**：完整遍歷只做一次，之後只重新列出今天和昨天的目錄，每分鐘再完整遍歷一次作為兜底；讀某一段找不到時立刻重新查詢，最多每 5 秒一次。
- **Codex 的壓縮**（v0.10，`thread-index.ts`）：記錄裡的 `compacted` 條目帶著 Codex 壓縮後保留的歷史（`replacement_history`：系統和開發者訊息、全部使用者訊息、一個加密的 `compaction` 項）。索引照舊讀全部條目，編號不受影響；最近一次壓縮之前、又不在保留的歷史裡的圖（工具檢視、生成或返回的）標上 `compacted`，引擎據此放回（第 4 節），面板標“壓縮前”。索引另外帶上歷史的全部條目（`items`），放回原圖時從這裡取資料。
- **被打斷的輪次**（v0.10，`thread-index.ts`、`claude-index.ts`）：Codex 記錄裡的 `turn_aborted`，或 Claude Code 在下一輪記下的“[Request interrupted by user…]”（這一條本身算一輪，記為跳過），標出模型沒來得及寫最後那條回覆的輪次。`awaitingLine`：圖在這樣一輪裡、還沒有特徵行，之後也沒有一輪正常結束，就在當前這一輪再發一次。

## 4. 改寫請求（引擎）

- **只改需要改寫的任務**：有取消項的，或者用過自動選圖的（v0.3：從第一次開啟起，歷史裡可能有取回的副本）。只處理這些任務的 `/responses` 和 `/responses/compact` 請求：解壓（zstd、gzip、br）、解析、替換、重新壓縮，然後轉發。沒有要替換的圖時，原樣轉發原始位元組。
- **替換規則**（`rewrite.ts`，措辭見 spec 的“佔位符”一節）：
  - 取消的圖換成一段文字。使用者上傳的圖連同前後兩段路徑標籤一起換掉，佔位符裡不寫本地路徑。
  - 本次請求裡還有內容相同、仍在傳送的圖時，用“重複”佔位符指向它；否則用普通佔位符。
  - 有普通佔位符時，在第一張被省略的圖所在那一輪的使用者訊息之前，插入一條開發者訊息（“上下文管理說明”）。放在開發者訊息裡，是因為佔位符屬於使用者內容，模型不把它當成證據。
  - 只要有圖被換掉，每張仍在傳送、有編號的圖前面加一行“已提供”標籤（v0.1-25）：重新勾選的圖回到原來的位置、夾在佔位符中間，沒有編號時模型對不上。
  - 文字跟隨介面語言（第 7 節）。勾選狀態不變時，改寫結果逐位元組相同，不影響快取。
  - PDF 頁面和網頁截圖按使用者上傳處理：佔位符裡的來源寫“使用者上傳”，Codex 寫在圖前面的說明不動，模型仍然知道是哪一頁。
- **特徵行**（v0.8，`rewrite.ts`、`proxy.ts`；措辭和規則見 spec 的“佔位符”一節）：
  - 只在本來就改寫的請求裡做，Codex 的改寫時機不變（手動模式要等第一次取消勾選）；子代理、旁聊和 Codex 的後臺任務不做（`writesNotes` 看會話記錄的 `source`，旁聊沒有記錄也不做）。
  - 請求裡有索引認得的圖時，在第一張圖所在那一輪的使用者訊息之前插一條開發者訊息“特徵行說明”；有“上下文管理說明”時，兩條都在，特徵行說明在前。
  - 每張傳送的圖都加“已提供”標籤，這一輪的新圖也加；新圖的標籤只在請求末尾，前面的歷史不變。
  - 佔位符的標題行下面加一行特徵和評價（`notesLine`）：特徵行加最近 3 條評價和它們的輪次；超長時在上限以內最後一個標點或空格處截斷，加“…”（`clip`：特徵和評價都是 30，按寬度算，中日韓文字一個算 1，其他字元算 0.3，即 30 個漢字或 100 個字母；v0.10 起和介面語言無關，原來中文介面按字元數截，英文特徵行只剩地點；評價原來是 15，使用者的原話會被截掉一半）。
  - 佔位符帶哪些評價（0.11.2，`adapters/codex/engine.ts` 的 `shownNotes`）：這張圖出現那一輪及以前記下的（`notesBy`，和 Claude 相同）；任務被 Codex 壓縮過時，壓縮之前的圖用壓縮那一刻的記錄（索引的 `compaction.notes`，`thread-index.ts` 讀到 `compacted` 條目時存一份），壓縮後放回的清單也用它。之後才記下的評價在模型自己的回覆裡，下一次壓縮再進佔位符和清單。原來佔位符和清單帶全部評價：使用者隔幾輪評價一張舊圖，那張圖的佔位符就變，快取從那裡起重寫。索引和麵板照舊有全部評價。
  - 改寫報告多三項，只記數字：`featureAt`（特徵行說明插在第幾條）、`labeled`（加了幾個標籤）、`unknown`（索引不認得的圖有幾張，這一輪取回的副本不算）。關卡 3 用 `unknown` 確認新圖在它那一輪的第一個請求裡就有編號。
- **自動選圖**（v0.3，`proxy.ts`、`rewrite.ts`）：
  - 這一輪是第幾輪，按請求頭裡的 `turn_id` 在索引裡查；記錄裡還沒有這一輪時，算最後一輪之後。
  - 之前各輪、沒有勾成每輪都發、能替換的圖，換成自動版佔位符；說明也換成自動版，位置規則不變。工具認不出的圖照常傳送。
  - “重複”佔位符只指向之前各輪仍在傳送的圖，也就是勾成每輪都發的；“已提供”標籤也只加在這些圖前面。這一輪的新圖和取回的副本都不算：它們是這一輪中途才出現的，算進去的話，前面的佔位符會在取圖前後變樣，快取就斷了。這樣取圖前後，這一輪前面的歷史逐位元組不變（有單元測試）。
  - 副本只在取回的那一輪發送；之後換成一句說明（“IMG-xxx 的原圖：模型當時用 cam_view_image 取回，只在那一輪提供，現在已省略”）。關掉自動以後也這樣，因為面板不單列副本，使用者沒法取消它。
  - 關著時，傳給改寫的引數和 v0.2 一樣，輸出逐位元組相同：對照 v0.2 的改寫程式碼，所有勾選組合（中英文、畫素相同與否）都比過。
  - v0.6 起新任務預設開著（`core/selection.ts`）：引擎和外掛服務啟動時，在勾選目錄裡寫下這個版本第一次執行的時間（`auto-default.json`，只寫一次，Codex 和 Claude 各一份）。任務沒有自己的開關時，開始時間（會話記錄第一條 `session_meta` 的時間，分叉的按來源任務算，`threadStartedAt`）不早於它，就當作開著，從開始時算起；還沒有會話記錄的算新的。預設值不寫進勾選檔案，面板裡一改就寫下來。讀勾選的地方都經過它：改寫、是否需要改寫（所以新任務從一開始就走 HTTP）、面板、取圖工具。
- **子代理和旁聊**（v0.7，`proxy.ts`、`adapters/codex/selection.ts`、`thread-index.ts`、`adapters/codex/children.ts`；Codex 的做法見第 11 節）：
  - 認出來源：`x-codex-turn-metadata` 裡除了 `thread_id`、`turn_id`，還讀 `forked_from_thread_id`、`parent_thread_id`（沒有時看請求頭 `x-codex-parent-thread-id`）、`subagent_kind`，一起記進日誌。
  - 開關：v0.7 是主任務勾選檔案裡的 `childrenAuto`；v0.8 起沒有開關，一律按自動選圖管，0.7 寫下的 `childrenAuto` 不再讀。
  - 旁聊：請求所屬的任務沒有會話記錄、請求裡又有 `forked_from_thread_id`，就是旁聊（`sideChatOrigin`；使用者自己分叉的任務有記錄，照舊按分叉規則）。用原任務的索引改寫：原任務的各輪都算之前的輪次，所以帶過來的圖都換成自動版佔位符，原任務裡每輪都發的照發（`sideChatSelection`）。
  - 子代理：會話記錄第一條 `session_meta` 裡有 `source.subagent.thread_spawn`、沒有 `forked_from_id` 的，是不帶歷史啟動的子代理（`spawnParent`），順著父任務一路找到最上面的主任務（`mainTaskOf`）。子代理自己沒有開關時就是自動選圖，從子代理開始時算起（`childSelection`）。帶歷史啟動的子代理是分叉，照舊。子代理的第一個請求可能早於它的會話記錄，這時按 v0.6 的預設算；它的第一個請求裡沒有之前各輪的圖。
  - 登記：引擎每次看到子代理或旁聊的請求（HTTP 和 WebSocket 都算），就把它記在主任務名下（資料目錄 `state/children/<主任務>.json`：型別、來自哪個任務、第一次請求的時間），每個只寫一次。旁聊沒有會話記錄，這是面板知道它的唯一來源。
- **Codex 壓縮之後**（v0.10，`proxy.ts`、`rewrite.ts` 的 `addCodexCompacted`）：請求裡有 `compaction` 項、索引裡有標著 `compacted` 又不在請求裡的圖時，在壓縮項後面插一條開發者訊息（說明加清單：一張一行，編號、名稱、來源、輪次、特徵和評價），每輪都發的（手動模式下是勾著的）再跟一條使用者訊息，放“已提供”標籤和原圖（資料從索引的 `items` 取）。只給任務自己的請求（`writesNotes`），旁聊和子代理不放。勾選和記錄不變時插入的內容逐位元組相同，快取接得上。日誌裡記 `compacted: { at, listed, resent }`。
- **提示快取**（2026-11-14 用本機的真實任務核對：引擎日誌裡每次請求的改寫，對上會話記錄裡 `token_count` 的 `cached_input_tokens`；ChatGPT 登入、`gpt-6.1-sol`）：
  - 後端從快取讀到請求裡第一處和之前不同的地方為止，按 128 個 token 一格。5 個任務裡 5 次換佔位都是這樣，其中一次改動點在 54 次請求之前，照樣接上；所以 Codex 這邊引擎不放快取斷點。會話記錄裡的 `cache_write_input_tokens` 一直是 0。
  - OpenAI 的 API 文件對 GPT-5.6 及以後寫的是另一套（只在斷點處讀寫，往回最多看 20 條訊息的末尾，寫入另外計價）。用 API key 登入的 Codex 是不是這樣，沒有條件驗證。
  - 兩條說明各有一次性的代價：特徵行說明在任務的第一張圖出現時、上下文管理說明在第一次有圖被換掉時，插在那一輪的使用者訊息之前，那一輪從開頭起重寫一次（實測一次多重寫約 2 萬 token，圖在一輪的中途才出現時才有）。位置是按模型的表現定的（第 4 節開頭），不為這一次改。
- **補寫特徵行**（v0.10）：自動選圖算“之前各輪不發”的圖時，跳過 `awaitingLine` 的圖（第 3 節）：它們照常傳送，標籤狀態寫“已提供，還沒有特徵行”（`Described.awaiting`），特徵行說明裡告訴模型補寫。Codex 和 Claude 相同。
- **切到 HTTP**：WebSocket 連線上 Codex 只發新增的條目，靠 `previous_response_id` 接上服務端儲存的歷史，已經發過的圖去不掉。所以：
  - 任務一需要改寫（有取消項，或者用過自動選圖），引擎就對它的 WebSocket 握手回 426，Codex 在這個會話裡改走 HTTP，每次都發完整歷史；
  - 它已有的 WebSocket 連線，空閒 1.5 秒後由引擎關掉；
  - 取消時這一輪還在 WebSocket 上進行，剩下的請求仍帶著原圖，引擎記下來，面板提示；
  - 不需要改寫的任務照常走 WebSocket。
  - 升級來的連線一進來就掛上錯誤監聽（v0.8 修，0.7.1 裡就有這個問題）：Node 在 `upgrade` 事件之後會去掉伺服器自己掛在這個連線上的錯誤監聽；引擎回完 426 後，Codex 如果直接重置連線，`ECONNRESET` 沒人接，整個引擎程序就退出了（2026-10-19 跑探針時 6 個測試引擎裡有 4 個這樣退出）。連線上游的過程中客戶端走了，連上後直接關掉，不留連線。
- **原樣放行**：請求解不開或解析失敗、含有 JavaScript 表示不了的大整數、找不到本地記錄、改寫出錯，都原樣轉發並記下原因，面板上提示。
- **統計**（`request-stats.ts`）：每個任務記最近一次事件和最近一次完整 HTTP 請求：大小、帶了哪些圖、各多大、替換了哪些。面板用它做傳送預覽的基準。
- **日誌**：只記元資料：方法、路徑、狀態、位元組數、耗時、任務編號、圖片編號和內容雜湊的前 16 位。不記認證資訊，不記對話內容。`--dump-requests` 只用於合成的測試任務，圖片只留雜湊和長度。
- **改寫不影響改圖**：改圖工具從 Codex 本地的歷史取最近的圖，不看引擎發出的內容。

## 5. 引擎的生命週期

- **全機一個**：同一個程序在 `127.0.0.1` 和 `::1` 上監聽兩個埠。預設 17891 提供面板、登記和舊版官方接入，17892 只收已登記線路；自定義引擎埠時，線路埠是下一個。兩入口的線路請求不互相代轉。`/__cam/health` 報告程序、build（執行目錄裡 .ts 檔案的雜湊，換行統一成 LF）、版本，以及 `routingVersion: 1`、`routingPort`。先繫結線路埠，再在舊入口報就緒；兩埠都只監聽本機。
  - 獨立線路埠是升級隔離：舊副本只會拉起舊入口，不會收到新線路的 HTTP 或 WebSocket 請求。僅換路徑字首不夠，舊引擎的 WebSocket 仍可能預設向 OpenAI 轉發。繫結檔案跨引擎重啟保留，客戶端不需要拿新編號。
- **跟著 Codex**：外掛服務啟動時確保引擎在執行，之後每隔幾秒檢查一次，崩了就重新拉起。Codex 全部退出後，引擎自己退出；v0.4 起 Claude Code 也用這個引擎，要等 Codex 和 Claude 的程序都沒有了才退出。
- **Windows 的 Job**：外掛服務在一個“關閉即結束、不許脫離”的 Job 裡，它拉起的引擎隨它一起結束，其他會話的外掛服務會在幾秒內重新拉起。macOS、Linux 上引擎用 `setsid` 脫離程序組。
- **升級時替換**：外掛服務發現執行中的引擎版本比自己低，就請舊引擎退役（`/__cam/retire`）：舊引擎立刻停止監聽，把正在進行的請求和 WebSocket 這一輪做完再退出，新引擎馬上接手埠。版本相同、程式碼不同時不替換，只有安裝命令（`cam install`）強制替換：v0.4 起 Codex 和 Claude 各有一份外掛副本，否則兩份副本會來回讓對方的引擎退役。
- **外掛被移除、沒先停用**：引擎每 15 秒檢查一次，只認明確的跡象：外掛快取目錄不在了，或者 `config.toml` 寫著 `enabled = false`。連續兩次，或者引擎退出前再查一次，就把 Codex 恢復直連。Windows 上引擎通常隨外掛服務一起被結束，來不及做這一步，所以面板、外掛說明和安裝說明（INSTALL.md）都寫“先停用再移除”，解除安裝命令負責恢復。

## 6. 面板

- **形態**：側邊面板裡的 MCP 應用。工具 `cam_panel` 宣告 `thread` 入口（`_meta["openai/ui"].entrypoints`），出現在“新建標籤頁 → 外掛和 MCP”裡。頁面固定為 `ui://codex-attachment-manager/panel.html`，地址一變就可能白屏（上游 #47512）。
- **不經過模型**：面板的呼叫不寫進聊天記錄，不佔上下文。每次呼叫帶著面板開啟時所在任務的編號（`_meta.threadId`），之後不變。所有面板工具都只給面板用（`visibility: ["app"]`），改動狀態的工具拒絕模型呼叫。
- **工具**：`cam_panel`（面板資料）、`cam_set_selection`（勾選和取消，v0.3 起也開關自動選圖；v0.7 的 `childrenAuto` 引數 v0.8 去掉了）、`cam_image`（縮圖和預覽）、`cam_setup`（啟用和停用）、`cam_bind`（新任務繫結）；v0.3 加了給模型用的 `cam_view_image`，見下。
- **取圖工具 `cam_view_image`**（v0.3）：唯一一個模型能呼叫的工具（沒有 app-only 的設定，標著只讀）。
  - 只在開了自動選圖的任務裡工作，否則返回一句“這個任務沒有開自動選圖……需要時寫‘需要 IMG-xxx’”。
  - v0.7：子代理裡按它自己的索引取。旁聊沒有會話記錄，呼叫的 `_meta["x-codex-turn-metadata"]` 裡有 `forked_from_thread_id`，就去原任務的索引取（v0.8 起旁聊裡總能取）。
  - 按編號返回原圖（不縮小），每張前面一行“[圖片 IMG-xxx 取回的原圖｜名稱｜來源｜輪次｜尺寸]”，不帶 Codex 自己的“[Image #N]”：那個編號只在原來那條訊息裡有意義，GPT-6 Luna 曾把它當成要讀的數字。
  - 工具的標題、說明和返回的文字都是給模型看的，所以寫在 `rewrite.ts`，跟著介面語言。
- **拿資料**：頁面訪問不了 `localhost`（上游 #45913），所以一律經 Codex 回撥外掛服務；圖片放在工具結果的 `_meta` 裡，用 data URL。PNG 超過要求的尺寸就縮小；縮圖只快取在記憶體裡，不寫磁碟。
- **勾選**：點一下就呼叫 `cam_set_selection` 儲存。儲存進行中的點選合併到下一次呼叫；讀資料的過程中開始了儲存，這次讀到的結果就不用，免得舊狀態蓋掉剛點的。
- **重新整理**：每 3 秒讀一次，沒有變化就不重畫；頁面報告自己不可見時降到 15 秒；使用者移進、點選、滾動時立刻讀一次。
- **傳送預覽**：以引擎記錄的上一次完整請求為基準，按當前勾選估算下一次的大小。
- **“模型需要”提示條**：從模型最近一次回覆裡認出“需要 IMG-xxx / need IMG-xxx”，也認加粗、引號、reattach、restore 之類的說法；“已上傳”“取消勾選”這類描述不算。
- **面板資料裡的搜尋文字**（v0.8，`panel-state.ts`）：只用於搜尋和分組，頁面不顯示。
  - 每張圖多兩項：`scene`（特徵行的第一段）和 `search`（特徵行和全部評價的原文）。
  - 面板資料多一項 `turnTexts`：每一輪裡使用者說的話、模型的回覆（去掉記錄行）和工具呼叫的引數（生圖提示詞、檢視的路徑），每段截到 200 字，每輪截到 600 字；客戶端加的內容（以標籤或 AGENTS.md 標題開頭的段落）不算。同一輪的圖共用這一份，免得圖多時每 3 秒的輪詢都很大。Codex 從任務記錄裡算（`codexTurnTexts`），Claude 從會話記錄裡算（`claudeTurnTexts`），引擎不做這件事。
- **頁面**（v0.8，`panel.html`；樣子見 spec 的“介面”一節）：
  - 請求佔用卡片預設收起，展開狀態只在頁面裡記。展開後的“最近一輪模型取回”來自索引裡最後一輪的副本；子代理和旁聊那一行把 `children` 裡各自上次請求少發的加起來。
  - 搜尋把編號、名稱、來源、場景、`search` 和那一輪的 `turnTexts` 拼成一段小寫文字，按空格分詞，每個詞都要出現；拼好的文字按圖快取，內容或語言變了才重拼。篩選按鈕一次只選一個，按鈕只在內容、數量或語言變了時重建，輪詢和點選都不丟焦點。兩行的摺疊（0.8.1，`foldChips`）靠量：先全部顯示，篩選區高過兩行時，從末尾往前隱藏（跳過選中的那個），直到連同“更多 N”放得進兩行；只在按鈕、選中項、展開狀態或面板寬度變了時重量，寬度變化由 `ResizeObserver` 通知。搜尋和篩選只在頁面裡，不寫磁碟，換任務時清掉。
  - 縮圖按輪分組（最新一輪在上），格子用 CSS grid 的 `auto-fill`，列數跟著寬度變；每格只在狀態變了時重畫標記。縮圖按列表順序排隊載入，同時最多 3 張，滾進視野的先載入，只快取在記憶體裡。
  - 整輪勾選框只管這一輪正在顯示、能改的圖；預覽佔滿面板（固定定位的一層），點圖片、按鈕和勾選框以外的地方都退出。
  - 編號按鈕（`jumpTo`）：關掉預覽；圖被搜尋或篩選擋住時先清掉；把縮圖滾到列表正中，滾動停下後閃兩下，焦點落在縮圖上。
- **自動選圖**（v0.3）：
  - 開關在底欄右側，調 `cam_set_selection`（`auto`）。開著時勾選帶 `mode: "auto"`，改的是每輪都發；面板資料裡的 `checked` 跟著變成“是否每輪都發”，傳送預覽、整輪勾選、“由 IMG-xxx 代替”都沿用原來的演算法。
  - 切換前，先把還沒儲存的勾選按原來的模式存完；切換進行中不接受勾選，免得記錯地方。
  - 手動模式下不顯示“最近一輪模型取回”，提示條照舊是“模型需要”。
  - 預計請求只算每輪都發的圖，數字後面加“起”（英文是“+”），懸停說明模型取回的圖不算在內。
- **子代理和旁聊**（v0.7，`adapters/codex/panel.ts`）：面板資料裡的 `children` 是引擎登記的子代理和旁聊，按第一次請求的時間排，每個帶名字（子代理的 `agent_nickname`，沒有時用 `agent_path` 的最後一段）、最近一次完整請求帶了幾張圖，以及和主任務一樣算出的上次請求（替換幾張、前後大小）。v0.8 起沒有 `childrenAuto` 開關，每個也不再帶“管不管”。
- **任務名**：讀 `<CODEX_HOME>/session_index.jsonl`，同一個任務以最後一行為準。
- **新任務繫結**：在新任務頁開啟的面板，綁在 Codex 預先準備的任務上，發第一條訊息後可能換成另一個任務。
  - 頁面記下自己哪些時間段顯示在螢幕上，讀資料時帶給外掛服務。
  - 面板所在的任務還沒有記錄時，外掛服務找面板顯示期間開始的、使用者自己開的任務（不是子代理、分叉或後臺任務）。只提供最新的一個，以及和它相差 20 秒以內開始的；只有一個就自動切過去。
  - 繫結記在資料目錄的 `bindings/`，只接受面板的呼叫。
- **外觀和高度**：用 Codex 在握手時給的主題和樣式變數。26.924 給的 `containerDimensions` 只有 `maxHeight`，頁面按它設高度並用 `ui/notifications/size-changed` 報告。每輪標題行必須是定位容器（`position: relative`）：隱藏的勾選框掛到整個頁面上時，焦點一落上去整頁就會被滾走（v0.1-23）。
- **開發頁**：`spike/scripts/panel-dev.ts` 在瀏覽器裡扮演 Codex 的側邊面板，用合成測試圖調頁面，不用重啟 Codex。示例任務裡各類來源的圖都有。v0.8：`?thread=v08` 是一個角色兩個場景的關鍵幀（特徵行、評價、PDF 分鏡頁、網頁、手繪草圖、最近一輪取回兩張、子代理和旁聊，開著自動選圖），`?thread=v08m` 是同一個任務的手動模式；`?demo=details|search|scene|preview|jump` 直接擺出要截圖的狀態（`&q=` 搜尋詞，`&id=` 預覽哪張）。

## 7. 語言

- 以 `zh` 開頭的都算簡體中文，其他都算英文。
- **面板**：看 Codex 在 host context 裡給的 `locale`，沒有就看瀏覽器語言。
- **引擎和標籤頁標題**（`language.ts`），按順序：
  1. 面板報告的語言，只要 Codex 的語言設定還是面板報告時那個；
  2. Codex 的語言設定：桌面版把它寫在 `<CODEX_HOME>/computer-use/config.json` 的 `locale` 裡（不是公開介面）；
  3. 面板最後一次報告的語言；
  4. 系統語言。
- **標籤頁標題要重啟才換**：標題就是面板工具的 `title`。Codex 把工具定義快取在應用程序裡，最長 30 分鐘，收到“工具列表已變”的通知也只記一行日誌。
- **文字表**：外掛服務和命令列的在 `messages.ts`，面板的在 `panel.html` 裡一段 JSON，發給模型的在 `rewrite.ts`。單元測試檢查兩種語言的條目一一對應。
- **命令列**按系統語言；`CAM_LANG=zh|en` 可以固定語言，測試和開發用。
- **外掛清單隻能寫一種文字**：名稱和簡介用英文，詳細說明先英文、再附一段中文。

## 8. 資料目錄

- Windows 是 `%USERPROFILE%\.codex-attachment-manager`，macOS 是 `~/Library/Application Support/codex-attachment-manager`，Linux 按 XDG 是 `~/.local/share/codex-attachment-manager`；`CAM_DATA_DIR` 可以改（測試、開發用）。
- Windows 上不放在 AppData 下：Codex 是微軟商店應用，它啟動的程式在 AppData 裡新建的檔案會被轉存到應用的私有目錄，Codex 外面的命令列和引擎就看不到了。
- 裡面有：`selection/`（勾選狀態，每個任務一個檔案，只記取消的識別鍵；v0.3 起還記自動選圖的開關 `auto`、最近一次切換的時間 `autoAt`、第一次開啟的時間 `autoSince` 和每輪都發的圖的識別鍵 `pinned`；v0.6 起還有 `auto-default.json`，新任務預設開著自動選圖的起始時間；v0.7 的主任務檔案裡可能還有子代理和旁聊的開關 `childrenAuto`，v0.8 起不再讀）、`bindings/`、`routes/`（v0.9，平臺、原服務地址、穩定編號和本機共享金鑰）、`state/requests/`（請求統計）、`state/children/`（v0.7，每個主任務的子代理和旁聊）、`cache/pixels/`、`proxy/`（引擎日誌）、`plugin-server.jsonl`、`language.json`、`config-backup/`。
- 分叉任務沿用原任務在分叉那一刻的勾選，之後各管各的。v0.3：每輪都發的勾選一樣按時間繼承；開關在分叉前開啟、之後沒再切換過才繼承；分叉前用過自動選圖的，分叉也記下 `autoSince`，以便省略歷史裡的副本。
- `migrate-data.ts` 在第一次使用時，把舊位置（舊的 AppData 目錄和各應用私有目錄裡的副本）的資料複製過來，用鎖檔案保證只有一個程序在複製。

## 9. 打包、安裝和釋出

- **外掛市場**：倉庫根目錄就是外掛市場，`.agents/plugins/marketplace.json` 指向 `plugin/`。外掛清單在 `plugin/.codex-plugin/plugin.json`，`plugin/.mcp.json` 啟動外掛服務。
- **啟動**：`.mcp.json` 的命令是 `./scripts/launch`，Windows 上 Codex 按 PATHEXT 找到 `launch.cmd`，macOS、Linux 上運行同名的 POSIX 指令碼。兩者按同樣的順序找 Node：Codex 傳來的路徑、桌面版資源目錄裡的 `cua_node`、primary runtime、PATH 上 24 以上的 `node`。使用者不用另裝 Node。
- **安裝**（`cam install`，以及釋出附帶的 `install.ps1` / `install.sh`）：
  1. 檢查和使用者自己設定的衝突，備份 `config.toml`；
  2. 先保留已有外掛程式檔案，再用 Codex 的命令列登記市場、安裝目標版本，不先刪除可用副本；原生清理可能在 Windows 舊目錄仍被程序佔用時刪掉部分檔案，所以安裝後補回舊版本，失敗時也恢復目標版本的原檔案。`cam install` 用 `plugin-cache.ts` 保護；釋出指令碼做相同保護，並用原生安裝返回的版本選擇新副本，不再靠目錄修改時間猜；
  3. 自檢裝好的副本：用它自己的啟動指令碼起服務，問工具列表和麵板頁面；
  4. 寫帶標記的塊；
  5. 遷移舊的勾選記錄，確保引擎在執行。
- **不開終端的安裝**：Codex 的外掛頁面能新增外掛市場（`owner/repo`、Git 地址或本地資料夾），裝好後在面板裡點“啟用外掛”，由 `cam_setup` 寫帶標記的塊。啟用、停用都要重啟 Codex 才生效。
- **解除安裝**：先去掉帶標記的塊、恢復直連，再卸外掛和市場。`uninstall.ps1` / `uninstall.sh` 不需要 Node 和外掛檔案。
- **Windows PowerShell 5.1**：`irm … | iex` 按 Latin-1 解碼，所以兩個 `.ps1` 只用 ASCII。
- **釋出**：推送 `v<版本>` 標籤後，`release.yml` 先在三個平臺跑 CI，核對標籤和外掛版本一致，把標籤寫進四個指令碼，建一個草稿 Release，說明取自 CHANGELOG.md。人工看過再發布。`releases/latest/download/<指令碼>` 始終指向最新的釋出。

## 10. 測試

- **單元測試**：`spike/src/*.test.ts`，`cd spike && node --test`。
- **冒煙測試**：`plugin-smoke.ts` 用 Codex 自己的命令列裝外掛、用 app-server 開任務，確認外掛服務就緒、引擎啟動；`scripts-smoke.ts --upgrade` 真的跑安裝、升級和解除安裝指令碼，確認舊執行檔案仍在、新副本能啟動，`config.toml` 和 `.env` 恢復原樣；Windows 還保持舊目錄被執行程序佔用。CI 在 Windows、macOS、Linux 上跑這兩項和全部單元測試。
- **模型自測**（規矩見 AGENTS.md）：`v01-placeholder-selftest.ts` 和 `v01-needs-selftest.ts` 啟動自己的引擎（獨立的埠和資料目錄）和 app-server，用合成圖片跑多輪對話，檢查模型不收回之前的回答、按編號要圖、勾回後看圖作答。`CAM_TEST_MODEL`、`CAM_TEST_EFFORT` 換模型，`--lang en` 測英文。測完把建的任務歸檔；遺留的用 `spike/scripts/archive-test-threads.ts` 歸檔。
- **自動選圖自測**（v0.3，`v03-auto-selftest.ts`）：同樣起自己的引擎和 app-server，另把本倉庫的外掛服務掛成一個單獨的 MCP 服務，提供 `cam_view_image`；開關寫在測試自己的勾選檔案裡。測試圖角落各藏一個數字，描述時不提：
  - A 組明確要求取圖，檢查取到、副本不另編號、下一輪被省略；
  - B 組問需要看圖的（角落數字、按顏色找圖、兩個數字相加）和不需要看圖的（複述、翻譯）；
  - D 組（v0.6）不設開關，檢查新任務預設開著；一個問題同時要兩張沒取過的圖，檢查都取回、答對；
  - C 組只有一張圖，排除上下文的干擾。
  - 2026-10-06 的結果：sol、astra 中英文全部透過；luna 取不取的判斷基本都對（英文 C 組漏取一次），讀取回的圖偶爾讀錯數字（見第 11 節“模型的差別”）。
  - v0.8：模型上傳那一輪就給每張圖寫了特徵行，常把角落的數字也寫進去（“右下黑色7”），佔位帶著它，模型不取圖也答對了。所以 B、C 組改成“取了圖，或者特徵行裡有這個數字”都算對；`notes.fromNotes` 記下哪幾問是靠特徵行答的。D 組上傳時要求只說背景和形狀，特徵行裡沒有數字，照樣檢查兩張都取回。
- **子代理和旁聊自測**（v0.7，`v07-children-selftest.ts`）：同樣的引擎、app-server 和外掛服務，另開啟 Codex 的 `multi_agent_v2`（`spawn_agent` 的 `fork_turns`）。旁聊照 Codex 的做法開（`thread/fork`，`ephemeral: true`），帶一句和 Codex 給旁聊的類似的說明。測試圖和自動選圖自測一樣：
  - S 組：主任務描述兩張圖後開旁聊，先問文字問題（圖都換成佔位，不取圖），再問角落的數字（從原任務取回，答對）；
  - C 組：子代理第一輪用 `view_image` 看圖，主任務用 `followup_task` 給它第二輪，問角落的數字（前一輪的圖換成佔位，取回，答對）；
  - 每組最後看主任務面板列出的子代理和旁聊。結果見 [v0.7/plan.md](v0.7/plan.md) 第 5 節。v0.8 去掉了開關，也去掉了測“關掉後原樣發”的 O 組。
- **特徵行自測**（v0.8，`v08-features-selftest.ts`）：同樣的引擎（帶 `--dump-requests`，看發出的請求）、app-server 和外掛服務，不設開關（新任務預設開著自動選圖）：
  - F 組：上傳；上傳加看圖工具開啟的圖；使用者評價；三張都成了佔位後提問。檢查特徵行齊全、評價記在對的圖上、正文不提記錄、記錄不在回覆末尾、新圖在它那一輪的第一個請求裡就有編號、不調工具靠佔位裡的特徵回答；
  - K 組（使用者的案例）：角色中景、兩張別的素材、近景並說“這張最好”，用 app-server 的 `thread/compact/start` 壓縮，再問五官參考用哪張、壓縮前那兩張是什麼樣。檢查壓縮後的請求裡每張圖都是帶特徵行的佔位、選的是近景、答得出壓縮前的圖。
  - 關卡的探針、結果和釋出前的自測結果見 [v0.8/plan.md](v0.8/plan.md) 第 3、5 節。
- **評測**（2026-10-24，`eval-keyframes.ts`、`eval-summary.ts`）：一個短劇關鍵幀任務，9 張合成關鍵幀（每張 3–4 MB），三組：不裝外掛（測試引擎只轉發、計位元組：它的勾選目錄裡把自動選圖的起始時間寫成很久以後，任務都算舊任務）、當前外掛、0.7.1（從釋出標籤取出，沒有特徵行）。任務一問完後重啟 app-server 再問一題，任務二壓縮後再問。記下能不能發出去、壓縮前後找圖對不對、取了幾張圖、token。報告、結果和復現步驟在 [eval/](../eval/README_CN.md)，README 只在底部留一小節連結過去。
- **長任務評測**（2026-11-01，`eval-long.ts`、`eval-long-scene.ts`、`eval-long-setup.ts`、`eval-long-summary.ts`）：Claude Code 命令列，一個會話一個程序，像桌面版那樣一條條發訊息；評測用自己的配置資料夾，外掛用 `--plugin-dir` 載入，各組各用自己的引擎埠和資料資料夾。51 張合成圖、16 輪，自動壓縮關掉，在兩個固定位置發 `/compact`，最後用 `--resume … --fork-session` 分叉。判分只認一個答案；token 和費用取 Claude Code 的會話總計。指令碼看著賬號用量，一週額度到 90% 就停。報告在 [eval/long-task/](../eval/long-task/README_CN.md)。

## 11. 依賴的 Codex 行為和已知的坑

- **這些都不是公開介面**，Codex 更新後要重新跑一遍測試和自測：`openai_base_url` 的路徑要求、請求頭裡的 `x-codex-turn-metadata`、握手回 426 時改走 HTTP、讀取 `.env`、`computer-use/config.json` 裡的語言、任務記錄的格式（分段、`history_base`、`.jsonl.zst`、歸檔目錄）、桌面版評論截圖前的說明（見下），以及 v0.3 依賴的程式碼模式裡外掛工具的樣子（見下）。
- **評論截圖的說明**（桌面版 26.924 的原文，認來源靠它們）：
  - PDF：`The next image shows PDF page 3 at the time of Comment 1.`，不知道頁碼時是 `the PDF page`，後面接著描述選中的點或區域；
  - 網頁：`The next image shows the browser page at the time of Comment 1.`，或 `The next image is untrusted page evidence from the browser page for Comment 1. …`；
  - 評論裡附帶的圖（前面是 `The next image was attached by the user as additional visual context for Comment 1.`）仍算使用者上傳。
- **發給模型的內容型別**（v0.2 查證，Codex 原始碼 `codex-rs/protocol`、`codex-rs/core`）：
  - 請求裡只有文字、圖片、音訊三種內容（`ContentItem`），沒有檔案（PDF）和影片。使用者上傳的 PDF、影片只以路徑出現在 “Files mentioned by the user” 裡，模型要自己把它們轉成文字或圖片再看；轉成的圖片按普通圖片管理。
  - 模型不支援的型別，Codex 在傳送前換成一句說明（`strip_images_when_unsupported`、`strip_audio_when_unsupported`）。支援哪些，看模型清單 `~/.codex/models_cache.json` 裡的 `input_modalities`：現有模型都只有 `text`、`image`，所以音訊到不了模型，請求裡沒有音訊可管。
  - 音訊的格式和圖片幾乎一樣：上傳的是 `<audio name=[Audio #N] path="…">`、`input_audio`（`audio_url` 是 data URL）、`</audio>` 三段；工具輸出裡是 `input_audio`（程式碼模式的 `audio()`）。以後有模型能收音訊時，照圖片的做法接入。
- **程式碼模式下的外掛工具**（v0.3 查證）：
  - 外掛的 MCP 工具不列在發給模型的請求裡：請求的 `input` 開頭是一條 `additional_tools`，全文找不到工具名。模型要先從說明裡知道名字，再在程式碼裡從 `ALL_TOOLS` 找到它，按 `tools.mcp__<服務>__<工具>(…)` 呼叫。所以沒開自動選圖的任務，模型根本不知道有 `cam_view_image`，請求也和 v0.2 一樣。
  - 工具返回的 MCP 圖片，模型在程式碼裡用 `image()` 交給自己；記錄裡是 `custom_tool_call_output` 裡的 `input_image`，資料和原圖逐位元組相同，`detail` 是 `high`。
  - 模型呼叫外掛工具時，`_meta` 帶著 `threadId` 和 `x-codex-turn-metadata`（其中有 `thread_id`、`turn_id`）。外掛的 `.mcp.json` 設了 `default_tools_approval_mode = "approve"`，不用逐次批准。
  - 同一個任務裡第一次取圖時，模型常先查一次 `ALL_TOOLS` 確認工具名，多一來回。
- **子代理和旁聊**（v0.7 查證，Codex 0.162；原始碼 `codex-rs/core/src/responses_metadata.rs`、`turn_metadata.rs`、`mcp_tool_call.rs`）：
  - 旁聊是 app-server 的 `thread/fork`（`ephemeral: true`，這個版本要求同時 `excludeTurns: true`；終端版的 `/side` 也是這樣），不寫會話記錄。它的請求（包括 WebSocket 握手）和模型呼叫工具的 `_meta` 裡，`x-codex-turn-metadata` 的 `thread_id` 是旁聊自己，`forked_from_thread_id` 是原任務。
  - `spawn_agent` 開的子代理有自己的會話記錄，`session_meta` 有 `parent_thread_id` 和 `source.subagent.thread_spawn`（`depth`、`agent_path`、`agent_nickname`）。它的請求裡 `parent_thread_id` 是父任務，`subagent_kind` 是 `thread_spawn`，`session_id` 是主任務，另有請求頭 `x-codex-parent-thread-id`、`x-openai-subagent: collab_spawn`。請求裡有父任務時，Codex 不再寫 `forked_from_thread_id`，所以帶歷史的子代理只能從會話記錄認出。
  - 子代理的會話記錄檔案先建好，第一行稍後才寫，它的第一個請求可能落在中間（2026-10-13 自測裡早了約 40 毫秒）。所以讀到空檔案時不當結論、不快取（`spawnParent`、`forkOrigin`、`threadStartedAt`）。
  - 子代理之後的輪次由父任務用 `followup_task` 發起；app-server 拒絕直接給 multi_agent_v2 子代理開新的一輪。歸檔主任務時，子代理一起歸檔。
- **上游問題**：#47512（面板地址變化後白屏）、#45913（頁面訪問不了 `localhost`）。
- **桌面版會在使用者訊息裡附一段 “Files mentioned by the user”**，寫著上傳檔案的完整路徑。引擎不改使用者訊息的文字，靠說明裡“不要自己用工具去讀取”約束模型；模型偶爾仍會自己開啟檔案。
- **模型的差別**：小模型在低推理強度下（例如 GPT-6 Luna Light）偶爾會要錯圖，或者拿到錯圖時不說“這張裡沒有”，而是猜一個答案（v0.1-25 的錄屏裡遇到過）。
  - v0.3 查證：GPT-6 Luna（low）讀工具結果裡的圖，比讀使用者訊息裡的圖差。同一張圖放在訊息裡問，四次都讀對；經 `cam_view_image` 或 Codex 自帶的 `view_image` 送來，常把角落的小數字讀錯（5 讀成 3，7 讀成 2），有時說看不到數字。把取回的圖挪進緊跟著的一條使用者訊息也沒改善，問題在“先呼叫工具再看圖”這個過程，不在圖放在哪裡。Sol、Astra 沒有這個問題。釋出說明寫明瞭這一點。
- **桌面版的上下文比自測多**：桌面版每輪還帶著電腦操作、瀏覽器等外掛的工具說明（約 1 萬 token）。自測為了不讓測試模型操作使用者的電腦，沒開這些外掛，所以個別只在桌面版出現的模型行為，自測復現不出來。

## 12. Claude Code 接入（v0.4–v0.10）

方案、關卡和任務見 [v0.4/plan.md](v0.4/plan.md)。做法是把上面的機制逐塊移植，這裡寫對應的做法和平臺逼迫的改動。

- **接入**（`hooks/register.js`，Mod）：
  - Claude 桌面啟動 Code 會話時傳入 `ANTHROPIC_BASE_URL`，不認 settings 檔案裡的同名設定。所以由 Mod 在會話啟動（`session.start`）時切換：讀取原地址（沒有時用 `https://api.anthropic.com`），確認引擎健康檢查宣告 `routingVersion >= 1` 和獨立的 17892 線路埠，向 17891 的 `POST /__cam/routes` 登記 `{platform: "claude", baseUrl: 原地址}`。登記介面只接受本機 Host、無瀏覽器 Origin、帶 `x-cam-panel: 1` 的請求；不接受引擎自迴圈地址、含賬號密碼、片段標記或非 HTTP(S) 的目標。
  - Mod 核對返回地址確實是本機 17892 的對應編號，成功後才用 `$.env.set` 切換本程序的 `ANTHROPIC_BASE_URL`，並把本機地址加進 `NO_PROXY`。原值和外掛所寫的值都存在會話狀態裡，結束（`session.end`，`/clear`、`/resume` 除外）時只還原仍等於外掛所寫值的變數。儘量在首個請求前切好；引擎還在啟動時先等幾秒，其餘在後臺等。登記或切換失敗時保持或恢復原地址，並提示未接管。
  - 自定義 Anthropic Messages 相容地址也按同樣方式登記；`CLAUDE_CODE_USE_BEDROCK`、Vertex、Foundry 仍不接管。舊引擎不支援獨立線路時保持直連，小面板提示；舊 Mod 狀態中儲存的原地址可用於升級到新線路。
  - 訂閱登入和中轉認證仍由 Claude Code 提供，引擎只發往該線路的原目標，不把認證頭記入日誌或線路檔案。Claude 身份來自線路的平臺繫結；會話與子代理仍靠下面的請求頭區分。去掉本機線路字首後的 `/v1/messages` 才執行 Claude 改寫，不要求上游域名是 `api.anthropic.com`。
- **認出會話**：靠請求頭 `x-claude-code-session-id`。子代理的請求另帶 `x-claude-code-agent-id`，它們有自己的歷史，不按主會話改寫。
- **找圖和編號**（`claude-index.ts`）：
  - 會話記錄在 `~/.claude/projects/<專案>/<會話 id>.jsonl`（`CLAUDE_CONFIG_DIR` 可改），只讀、增量地讀。記錄用 `parentUuid` 串成鏈，從最新一條訊息往回走就是當前的對話，撤回、編輯留下的舊分支不算；壓縮分界的記錄用 `logicalParentUuid` 接上前面的歷史。
  - 並行呼叫工具時，每個結果掛在自己那條呼叫記錄下面，對話從最後一個結果接著往下走。所以呼叫在鏈上、鏈上又沒有它結果的那些結果，補回到呼叫後面。
  - 結果回來的順序亂了時（v0.10，Claude Code 2.1.309 實測），對話可能從前面某個呼叫的結果接著走，它後面的呼叫記錄也不在鏈上。同一次回覆的幾次呼叫記錄帶同一個 `message.id`：不在鏈上、但和鏈上記錄同一個 `message.id` 的呼叫，按記錄順序接在這次回覆在鏈上的最後一條記錄和它的結果後面，它們的結果再照上一條補回。這樣圖按呼叫順序編號。這些記錄記在 `offChain` 裡：修復之前的外掛看不到它們，換算老記錄行時，舊編號跳過它們（見下面的“換算老記錄行”）。
  - 後面的呼叫掛在前一個結果下面時（2026-11-12 修）：Claude Code 2.1.321 把同一次回覆的呼叫寫成“呼叫、結果、呼叫、結果”一串，2.1.317 還會在結果後面多寫一條圖片縮放說明（`isMeta` 的 `[Image: original …]`），下一個呼叫掛在這條說明下面。第一個呼叫的結果最後回來時，對話從它接著走，後面整串都不在鏈上，原來的補法只認“掛在呼叫下面的呼叫”，第二個以後的呼叫連同結果裡的圖全漏了：面板裡沒有，引擎當成不認識的圖每輪照發原圖。現在不在鏈上的呼叫往上隔著結果和這種說明（最多 8 層）找到鏈上或已補回的記錄，也算這次回覆的呼叫，按上一條接回去。這些記錄另記在 `behindResult` 裡。真實會話回放：本機 30 天內壓縮過的 44 個會話，7 個補回共 14 張圖，其餘編號不變。
  - 使用者貼的圖按“記錄 uuid + 序號”識別，工具結果裡的圖按 `tool:<tool_use_id>#序號` 識別。請求裡使用者訊息的圖沒有 id，按內容依次對齊。
  - 一輪從使用者的一條輸入開始：Claude Code 給這條記錄標了 `turnPosition`，別的會話發來的訊息也算一輪。
- **改寫**（`claude-rewrite.ts`、`proxy.ts`）：
  - 只改 `/v1/messages`：使用者訊息裡和工具結果裡的圖換成佔位符，文字和 Codex 版相同。
  - 說明是 `role: "system"` 訊息，放在第一張被省略的圖所在的那條訊息之後；那裡已經有系統訊息時，並進去。每條含被省略圖片的訊息後面都跟一條簡短說明（`rewrite.ts` 裡的 `here`），從後往前插，勾選不變時位置不變。
  - 面板的“上一次請求”只記帶工具的主對話請求。桌面版還會在會話裡發附帶請求（使用者離開時的狀態摘要、自動模式的安全檢查）：照樣改寫，但不記進這一行。
  - v0.8 的特徵行（`claude-index.ts` 從助手記錄的文字塊裡讀記錄行，`claude-rewrite.ts`、`proxy.ts`）：
    - 會話裡有圖就改寫（`claudeNeedsRewrite`），給每張傳送的圖加編號標籤，佔位符裡帶特徵和評價。Claude Code 本來每次都發完整的歷史，所以不像 Codex 手動模式那樣要等取消勾選。
    - 特徵行說明是系統訊息，放在第一張圖所在那一輪“使用者自己的訊息”之後（`promptOf`：往前找第一條不含工具結果的使用者訊息，也就是這一輪的輸入，壓縮後是摘要那條）；那裡已有系統訊息時並進去。不放在工具結果後面：Sonnet 5.5 和 Haiku 5.5 會把緊跟工具結果的系統訊息當成工具結果裡的文字，不信任（Anthropic 關於對話中途系統訊息的文件；2026-10-19 實測 Haiku 不照做，還告訴了使用者）。
    - 這樣改了這一輪裡更早的位置，那一輪工具呼叫前的思考在會核對思考記錄的賬號上對不上，按“思考記錄”的做法去掉一次；之後歷史不再變。
    - 從別的會話轉來的訊息（`<cross-session-message>`），Haiku 不當成使用者本人的評價，不記：測試會話裡的評價要使用者親手打，或者寫明是代發的使用者原話。
- **壓縮之後**（v0.5，`claude-index.ts`、`claude-rewrite.ts` 的 `addCompacted`、`proxy.ts`；實測見 [v0.5/plan.md](v0.5/plan.md)）：
  - Claude Code 2.1.295 壓縮後的請求：第一條是使用者訊息，內容是整段摘要（等於會話記錄裡 `isCompactSummary` 那條的文字），接著常有一條它自己的系統訊息（例如帶 `output_config` 的空訊息），然後是壓縮前的最後一條回覆，再往後是新的一輪；壓縮前的圖一張都沒有。寫摘要的那個請求和普通請求一樣帶著全部歷史和圖，照常改寫。
  - 索引照常跨分界編號，壓縮前的圖示著 `compacted`，還記下摘要的文字（`summary`）。請求裡找到這段摘要，才算壓縮後的請求；找不到就不補。
  - 補在摘要文字後面：要發的（勾著的，自動選圖時是勾成每輪都發的）是“已提供”標籤加原圖（`claudeImageData` 從會話記錄讀），其餘的 v0.10 起合成一個文字塊，一張一行（`compactList`；內容相同的圖，後面那行寫“同 IMG-xxx”，不再重複特徵），v0.5 到 v0.9 是每張一個佔位。說明並進摘要後面的系統訊息（沒有就插一條）：v0.10 起只寫壓縮前有幾張、編號從哪到哪，不再列一遍；有圖沒發時前面是完整說明，v0.4 的改寫在後面的訊息裡就只加短說明（`noted`）。全部發出時說明裡寫明勾回的圖回到這裡、不會出現在新訊息裡，以及之前說看不到是因為當時被省略。勾選不變時這兩條訊息逐位元組相同，提示快取照常命中。
  - 保留訊息的壓縮（v0.10，`claude-index.ts` 的 `relinked`）：Claude Code 2.1.304 起壓縮記錄帶 `compactMetadata.preservedSegment`（`headUuid`、`anchorUuid` 即摘要、`tailUuid`）或 `preservedMessages`（`anchorUuid`、`uuids`），原樣保留最後幾條訊息。它讀記錄時（2.1.309 程式裡的函式）對最後一個壓縮點：保留的訊息接在摘要後面；原來接在摘要上的記錄，以及接在被它刪掉的記錄（壓縮點之前、沒被保留的）上的訊息，接到最後一條保留訊息後面；然後刪掉那些記錄。檔案裡存的是改接之前的樣子：新訊息接在保留訊息上時，按檔案連對話鏈會繞過壓縮點。外掛照同樣的規則改接（只改 `activeChain` 用的父節點，不改記錄），但不刪歷史：壓縮點往前接到第一條保留訊息原來的前一條，壓縮前的圖照舊標 `compacted`。
  - 續接後的記錄（v0.10，`withHistory`、`originalOf`、`readHistoryTranscript`）：在桌面版裡改一條之前的訊息再發送（回退）時，桌面版從那裡分叉出新會話，新記錄檔案只有改接後剩下的記錄，從最近一個壓縮點開始；只是重啟程序的，還寫原來的記錄檔案。外掛找到壓縮發生的那個記錄檔案：先看摘要裡 Claude Code 寫的“read the full transcript at: …”（取最後一處，只認 `<home>/projects` 下、含同一個壓縮點且壓縮點前面還有記錄的檔案），找不到再在同一個專案資料夾裡、壓縮之後改動過的記錄裡按壓縮點的 uuid 找；它也可能是續接來的，逐層往回。舊記錄只取壓縮點之前、帶 uuid 的記錄，圖片只留指紋，原始資料用到時再按位置從檔案讀（`onDisk`）；檔案不變就不重讀。這樣編號和續接前一樣，壓縮前的圖照樣能放回、能取回。
  - 換算老記錄行（v0.10，`translator`、`oldNumbering`、`familyOf`）：修復之前，續接後的檔案從自己的起點編號，那段時間寫下的記錄行和取回副本前面那行字用的是這套編號。同一專案資料夾裡，第一條對話記錄是會話起點或某個壓縮點的記錄檔案，就是這個會話的全部記錄檔案，各自的建立時間是開頭第一條帶時間的記錄；一條記錄行是寫它時最近開的那個檔案的程序寫的。那個檔案從壓縮點開始的，就按“從那裡數起”的舊編號找到圖（key），再換成恢復後的編號；會話起點開始的不用換。只換算 `claude/selection/stable-ids.json` 記下的這個版本第一次執行之前寫的（和 v0.6 的 auto-default.json 一樣，引擎和外掛服務啟動時寫一次）。檔案裡還記著編號規則的版本（`rules`，2 是補上不在鏈上的並行呼叫）：規則變了，第一次執行的時間就重新記。補上掛在結果後面的呼叫（2026-11-12）不改 `rules`，它第一次執行的時間單獨寫進旁邊的 `chained-ids.json`（`chained`，只寫一次）：本機還在跑的 0.10、0.11 副本（比如還沒更新的 Claude 外掛）見到別的 `rules` 會把 `stable-ids.json` 重寫成自己的規則、起始時間重記。`since` 到 `chained` 之間寫的記錄行，編號從會話起點數、只跳過 `behindResult` 記錄，再經圖片換成現在的編號。那段時間模型看到沒編號的圖，會接著它見過的最後一個編號往下數（2026-11-12 實測）：記錄行裡舊編號當時還沒給出的號，按“舊編號的最後一張圖之後、掛在結果後面的圖”的順序找圖。有 `offChain` 記錄時，會話起點開始的檔案也要換：舊編號跳過這些記錄，再經圖片換成現在的編號。舊編號只數到那個時刻，算一次就快取。真實會話回放：兩組會話，分別 6 個和 3 個記錄檔案，同一張圖編號一致；掛錯的特徵行都回到對的圖（`local/` 裡的評估報告）。
  - 勾選沿用（v0.10，`adapters/claude/selection.ts` 的 `claudeOwnSelection`、`ClaudeIndex.previous`）：會話還沒有自己的勾選檔案時，按 `previous`（分叉時複製來的記錄裡留著的原會話 id 在前，然後是同一會話裡更早開的記錄檔案，近的在前）找第一個有勾選檔案的，沿用續接那一刻之前的標記和開關，寫成自己的檔案。
  - 代價（v0.10，使用者要先看再定）：最長的真實會話（9 個記錄檔案、210 張圖）堆記憶體 83 → 145 MB，第一次建索引約 1.8 秒；之後記錄有變化時重建約 10 毫秒，同一請求裡其餘幾次讀取用快取（按當前記錄陣列、記錄數和 `since` 判斷）。
  - 先算好要補哪些，再跑 v0.4 的改寫，最後補圖；面板統計裡 `compacted` 記下補了哪幾張（`resent`），面板的“上一次請求”寫“補回壓縮前的圖 N 張”。
  - 面板裡壓縮前的圖照常可勾，標“壓縮前”；請求預估把勾著的算作這次加上的。
  - 補圖改的是摘要之後的內容，之後產生的思考按上面“思考記錄”的做法處理；新賬號（模擬）上實測對話不中斷。
  - Claude Code 自己的上下文用量（輸入框旁的顯示）是它的估算，不含補回的圖；Anthropic 返回、Claude Code 記進會話記錄的用量含。
- **思考記錄**（`claude-thinking.ts`、`proxy.ts`）：
  - Anthropic 給每段思考記下它前面的內容（系統提示、工具、訊息），之後對不上就失效：2026-08-31 起註冊的賬號直接拒絕（400，`thinkingRejected`），更早的賬號放行。思考可以去掉，只要留下的每一段前面都和它產生時一樣。
  - 引擎第一次給一個會話發出改過的歷史後，記下每個請求“Claude Code 給的歷史”對應“實際發出的內容”（兩條雜湊鏈，存在資料目錄的 `claude/thinking/<會話 id>.json`，只有雜湊）。之後的請求裡，一段思考前面要發的內容和它產生時發出的一樣，才保留；查不到的算不知道，去掉。比較的是值，不看 JSON 寫法、鍵的順序和快取斷點，字串內容等於同樣文字的文字塊（Claude Code 把末尾的系統訊息在它是最後一條時寫成帶快取斷點的文字塊，之後寫成字串）。
  - 傳送順序：還不知道賬號校驗時，先發帶全部思考的改寫；被拒後，發去掉對不上的思考的改寫，並記下這個會話的賬號會校驗，之後直接這樣發；記錄說都對得上卻仍被拒，說明記錄不全，清空重記，改發不帶任何思考的改寫（總會被接受）；最後才是原始請求。全部勾回後也照這個順序：取消期間產生的思考對不上原樣的歷史。
  - 去掉了思考時，統計裡記下去掉了幾段，面板照實提示（Anthropic 文件要求代理不要藏起來）；改發原始請求時記下 `fallback`，面板提示這次沒能按勾選改寫。
  - `CAM_EXPERIMENT_BLOCK_BINDING=error` 讓老賬號也按新賬號的方式校驗，只用於實驗。
  - 沒用 Anthropic 的 `drop_block`（讓服務端丟掉對不上的思考，實測它也保留之後新產生的思考）：正式請求要帶 beta 請求頭，有些思考設定下不能用。使用者 2026-10-11 選定由引擎自己去掉。
- **提示快取**（v0.10，`claude-cache.ts`、`proxy.ts`）：
  - Claude Code 在每個請求的系統提示裡放兩個快取斷點，訊息裡放兩個：最後一條助手訊息，和它每輪結束後加的那條 `<total_tokens>` 系統訊息（一共 4 個，是上限）。快取只能讀在之前請求放過斷點的地方，而且從這次的斷點往回最多找 20 個位置。
  - 引擎把之前的圖換成佔位時，Claude Code 的兩個訊息斷點都在改動之後，讀不到；長任務評測裡每組有 7 到 9 次請求只命中系統提示，整段對話重寫快取。Anthropic 會從斷點往回找之前寫下的快取，但評測裡往回 6 個位置的都沒找到，斷點正好放在那個位置上的每次都讀到了。所以訊息裡的斷點由引擎來放：
    - **讀**：引擎在記憶體裡記下每個會話最近 4 次發出的對話請求，各條訊息的字首雜湊（和思考記錄一樣比較值、不看快取斷點）和斷點位置。這次要發的不只是在最近那次後面加了內容時，對每一次找出和它第一處不同的地方，取所有排在各自第一處不同之前的斷點裡最靠後的一個，在這次請求的同一位置放一個斷點。
    - **備**（自動選圖時）：在第一張還按原圖發、以後會換成佔位的圖（沒固定的）前面放一個斷點，下一次換掉它時就有現成的位置可讀。模型晚一輪才寫特徵行時，圖會多發一輪、在下一輪中間才換掉，那時之前每個請求的斷點都在改動之後，只有這個能用。
    - Claude Code 最末那個斷點留著，這次請求照樣寫下自己的結尾；讀和備都要用、又只剩兩個位置時，它讓出來，下一次請求讀備好的位置。空位多時，Claude Code 的其他斷點也留著。
    - 新放的斷點用它後面最近那個原有斷點的 TTL：TTL 長的必須排在前面。思考塊不能放斷點，往前找能放的塊。放了什麼記在日誌的 `cacheMarks`（`read`、`prepare`、`dropped`）。
  - 只記傳送成功的對話請求（有工具的；旁路請求不算），最近 50 個會話，不寫盤：引擎重啟後第一次只放“備”，之後照常。
  - 往前的內容一變，之前寫下的快取就全用不上。所以 Claude 會話裡，佔位符只帶這張圖出現那一輪及以前記下的評價（`notesBy`），壓縮後放回的清單用壓縮那一刻的特徵和評價（`compactedNotes`）：之後才記下的在模型自己的回覆裡，下一次壓縮再進清單。
- **面板**（`proxy.ts`、`panel-web.js`、Mod）：
  - Claude Code 不登記只給應用用的工具，所以使用者打不開外掛的 MCP 應用；Mod 面板只能畫 Claude 自帶的元素，也放不進網頁。於是由引擎在 `/__cam/panel?session=<id>` 提供 `panel.html`，前面加一段 `panel-web.js` 代替 MCP 應用的宿主：把面板的工具呼叫轉成引擎的本機介面 `/__cam/claude/panel`、`select`、`image`。
  - 頁面和介面只接受用本機名字（`localhost`、`127.0.0.1`、`[::1]`）訪問、不帶其他網站 Origin 的請求；介面還要帶 `x-cam-panel` 請求頭；頁面帶嚴格的 CSP。
  - `/cam` 用桌面版給每個 Code 會話的瀏覽器工具（`Claude_Browser` 的 `preview_start`），在自帶的瀏覽器裡開啟頁面。這個工具不是公開給外掛的介面，呼叫失敗或者沒有時，Mod 彈出小面板給連結。Mod 面板裡的連結，點開會交給系統瀏覽器。
  - 小面板上的圖片數，在開啟時、每輪結束後，以及 `/clear`、`/resume` 之後重新讀取。
  - v0.6 自動開啟（Mod）：桌面版的瀏覽器工具能用（終端和 VS Code 裡沒有）、請求經過引擎時，在程序啟動、每輪開始和結束時檢查：會話有圖（引擎的面板介面）、面板沒開（`tabs_context` 裡沒有引擎來源的標籤頁）、使用者沒在這個會話裡關過，就 `preview_start` 開啟。檢查一次只做一個，免得開出兩個標籤頁。
  - 誰關的按時間分：桌面版最早在一輪結束 30 分鐘後關會話的自帶瀏覽器（使用者看著這個會話時還要更晚），Claude Code 程序不停。這個程序開過的面板在那之前沒了，是使用者關的，記在外掛自己的儲存裡（`closedPanels`，按會話，留最近 200 個），之後不再自動開啟；停了 30 分鐘以上，下一輪開始時不在，就重新開啟。一輪結束 25 分鐘後再看一次，認出停頓裡被使用者關掉的。`/cam` 清掉這個記錄，開啟新標籤頁並關掉舊的；`/clear`、`/resume` 後，開著的面板換到新會話。
  - 頁面語言跟著引擎（`CAM_LANG` 或系統語言），不看瀏覽器。
- **取圖工具**：外掛服務以 `CAM_HOST=claude` 執行，只給模型 `cam_view_image`。Mod 把呼叫它的會話 id 補進引數（外掛服務可能比 `/clear`、`/resume` 活得久），並在 `classic.PreToolUse` 裡放行這一個工具：先讓下面的鉤子和設定判斷，它們拒絕或要求詢問時照舊。
- **資料目錄**：Claude 會話的勾選在 `claude/selection/`，請求統計在 `claude/requests/`，思考記錄的雜湊在 `claude/thinking/`，和 Codex 的分開。
- **安裝**：
  - 倉庫根目錄同時是 Claude 外掛市場（`.claude-plugin/marketplace.json` 指向倉庫根目錄），清單是 `.claude-plugin/plugin.json`：同一個 MCP 服務（`plugin/scripts/launch`，`CAM_HOST=claude`），另加 Mod（`hooks/hooks.json`）。
  - 使用者執行 `claude plugin marketplace add chipfighter/context-attachment-manager` 和 `claude plugin install codex-attachment-manager@codex-attachment-manager`。裝好的外掛按版本快取，程式碼改了要升版本才會重新安裝。
  - Claude 桌面不帶 Node。沒裝 Codex 時，啟動指令碼用 PATH 上 24 以上的 `node`，找不到就提示安裝 Node 24。
- **測試**：單元測試同第 10 節（`claude-*.test.ts`）。Mod 的介面和鉤子用 Claude Code 自帶的測試工具（`claude plugin test`）測。模型測試用真實的 Claude 桌面訂閱會話，按 v0.4/plan.md 的約定用 Haiku 5.5，中英文都測。
- **依賴的 Claude 行為**（都不是公開介面，Claude 更新後要重新驗證）：
  - 會話記錄的格式：`parentUuid`、`turnPosition`、壓縮分界、並行工具結果的掛法；請求頭 `x-claude-code-session-id`。v0.5：壓縮後的請求以摘要開頭，摘要文字和記錄裡 `isCompactSummary` 那條相同；會話記錄只追加，壓縮前的圖一直在裡面。
  - 桌面版啟動會話的方式：啟動時傳入 `ANTHROPIC_BASE_URL`；新會話要到第一條輸入才啟動程序，所以 `/cam` 在那之前不在輸入框的命令列表裡。
  - `Claude_Browser` 瀏覽器工具（v0.6 還用 `tabs_context`、`tabs_close`、`navigate`）；Mod 面板裡的連結交給系統瀏覽器；桌面版在會話裡發的附帶請求。
  - v0.6：使用者不在看這個會話、又 30 分鐘沒有新的一輪，桌面版就斷開會話的自帶瀏覽器、關掉它的標籤頁，Claude Code 程序照常執行（日誌：一輪結束或使用者離開會話時 `[WarmLifecycle:preview] Starting idle timeout … 1800s`，使用者回來看時重新計時，到時 `Idle timeout reached`）；記憶體緊張時停掉閒置很久的程序，用到時再啟動（`[CliGovernor] pressure evicting`）。時間變了，自動開啟分不清誰關的。
  - 思考記錄的字首校驗：替換歷史裡的一張圖，之後的思考塊就對不上了；2026-08-31 以後註冊的賬號直接拒絕。比較時不看 JSON 寫法和鍵的順序；去掉開頭或末尾的思考可以，去掉中間的會讓後面的失效，把去掉過的放回去，會讓它不在期間產生的失效。
