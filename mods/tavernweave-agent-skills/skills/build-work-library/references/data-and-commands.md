# 資料格式與命令

## 儲存權威與環境

Python 3.10+，使用標準庫及該 Python 發行版提供的 `sqlite3`；不安裝模型 SDK、向量服務或資料庫服務。若當前 Python 缺少 sqlite3，報告缺少該模組，換用已具備它的直譯器或按授權安排依賴。本工具讀寫 UTF-8；命令列 JSON 使用 Unicode 轉義以相容 Windows 預設內碼表，JSON 解析後的中文不變。

`records/*.md` 是可編輯整理正文；`sources/*.json` 與已凍結的 `.txt` 是來源定位材料；`index/records.jsonl` 和匯出的 SQLite 都可從當前資料重建。`.state/` 儲存批次、用量、編輯觀察日誌和中斷事務，其中 SQLite 小檔案僅用於本地寫入互斥，不作為資料事實的權威來源。一次命令檢查源指紋並快取該次讀取；不支援人和 Agent 同時改同一檔案。

專案目錄必須新建且在作品/測試區域，不能位於 Skill 安裝目錄。原文切分以規範化 LF 文字中的 Unicode 字元位置為準，不是 UTF-8 位元組數或 token。標題重號保留，穩定單元按出現順序編號；長段落有界切分，機器單元數量不代表精讀質量或原文章號。

## 初始化與來源

下面命令從本 Skill 目錄執行；命令中的檔案位置替換為當前已授權的實際路徑。

```text
python <skill-root>/scripts/work_library.py init --project <新專案目錄> --title <作品名稱>
python <skill-root>/scripts/work_library.py add-source --project <專案目錄> --input <source.json> --text <授權正文或網頁短摘錄.txt> --chunk-chars 6000
```

文字來源 JSON 示例：

```json
{
  "id": "novel-edition-a",
  "kind": "local-text",
  "title": "作品正文",
  "realm": "canon",
  "continuity": "novel-main",
  "edition": "使用者選定底本",
  "phase": 0,
  "provenance": "使用者提供的原文檔案及其版本說明",
  "rights": "僅在當前授權專案內整理，不包含再分發授權"
}
```

`web-text` 額外要求實際頁面 `url`、`retrieved_at`；`--text` 是執行者按允許範圍儲存的核驗摘錄，不是搜尋摘要。`image` 不傳 `--text`，額外要求頁面 URL、採集時間、`inspection: not-viewed|viewed`、`inspection_ref`、`use: reference-only`；可選記錄 `image_url`、作者、許可證、用途、關聯角色。實際圖片看不到可登記候選但不能提交視覺結論；不得透過偽造 viewed 跳過檢視。

`realm` 為 `canon / reference / fanon / unknown`；`continuity` 區分原作、改編線或具體同人分支，`edition` 區分底本/修訂。`phase` 是此來源最早可用於創作的知識階段，未知為 null；本地連續文字再疊加條目出現順序，所以後文證據不能進入開局。網頁/影像的階段需要實際核對，不按抓取時間猜劇情時間。

來源 ID 一經登記不覆蓋。原文、身份或版本變化使用新來源 ID，重新繫結取樣計劃；不要改凍結檔案來讓舊引用看似繼續成立。

## 樣本與計劃輸入

```text
python <skill-root>/scripts/work_library.py benchmark --project <專案目錄> --input <sample-report.json>
python <skill-root>/scripts/work_library.py plan --project <專案目錄> --input <batch-plan.json>
```

樣本報告包含 `samples`、`selected` 和 `reason`。每個 sample 包含 `id`、`strategy: sequential|native-subagents`、`source_ids`、`usage`、`unsupported_assertions` 和 `questions`。每個問題有 `question / answer / evidence / pass`；這些是執行者實際取樣/核驗的記錄，工具不自動判定語義真假。

`usage` 格式：

```json
{"calls": 2, "kind": "measured", "input_tokens": 1200, "output_tokens": 360, "provenance": "該樣本的真實宿主或 API 用量回執位置"}
```

示例數字只解釋格式，不能拿來當實際測量。估算用 `estimated`；不可見用 `unavailable` 且兩個 token 欄位為 null。真實呼叫與失敗重試都計入 calls。

`benchmark` 返回的 `benchmark_sha256` 必須原樣用於計劃。計劃欄位：

| 欄位 | 含義 |
|---|---|
| `goal`、`authorization_note` | 使用者實際目標與本輪明確授權原話/位置；不能由 Agent 編造授權 |
| `benchmark_sha256`、`strategy` | 精確樣本報告與選中策略 |
| `units` | 明確的來源單元，如 `novel-edition-a/u000001`；按登記清單選擇 |
| `roles` | 專案專用職責表，鍵為角色名，值為具體任務邊界 |
| `max_batches`、`max_calls` | 本庫批次計量的累計上限；更新計劃不清零 |
| `calls_per_batch`、`max_units_per_batch` | 單批分配，單批單元數 1–8；按上下文容量選擇 |
| `token_limit`、`tokens_per_batch` | 可見 token 時的累計啟動門與單批預留；未知則 token_limit 為 null |
| `allow_unmeasured` | 用量無法實測時，使用者是否已明確接受只按呼叫/批次數限制；預設不接受 |

## 批次、資料條目與接續

```text
python <skill-root>/scripts/work_library.py next --project <專案目錄>
python <skill-root>/scripts/work_library.py usage --project <專案目錄> --input <attempt-usage.json>
python <skill-root>/scripts/work_library.py commit --project <專案目錄> --input <candidate.json>
python <skill-root>/scripts/work_library.py status --project <專案目錄>
python <skill-root>/scripts/work_library.py pause --project <專案目錄>
python <skill-root>/scripts/work_library.py resume --project <專案目錄>
python <skill-root>/scripts/work_library.py recover --project <專案目錄>
```

`next` 返回 batch_id、確切單元、原文片段/圖片來源卡、來源雜湊、專案角色和已登記嘗試；不會發起模型呼叫。`usage` 在 usage 格式上增加 `batch_id` 與唯一 `attempt_id`。相同 attempt 原樣重複提交不加總；不同回執不能複用同一個 attempt ID。已知花費即使超過預算也照記，後續不繼續開新批次。

候選包含 `batch_id`、`records`、實際 `review_note`；確實無資料時提供非空 `empty_reason`。每條記錄包含：

| 欄位 | 含義 |
|---|---|
| `id` | 穩定小寫字母/數字/橫線/下劃線 ID，不用標題拼目錄路徑 |
| `kind` | character/event/place/faction/rule/relationship/visual/question |
| `name`、`aliases`、`body` | 名稱、別名列表、人能編輯的 Markdown 正文 |
| `realm`、`continuity`、`status` | 來源身份、改編/同人線、confirmed/inference/uncertain |
| `known_from` | 最早可以揭示此條資料的知識階段，未知為 null |
| `evidence` | 必填來源證據陣列；懸項也引用其問題上下文 |
| `base_sha256` | 新建時預設；修改既有條目時必須是當前 Markdown 位元組雜湊 |

文字證據為 `unit_id / source_sha256 / start / quote`：使用 next 的來源雜湊和定位範圍，start 是原文全文的 Unicode 字元位置，quote 必須逐字匹配且落在該單元內。視覺證據為 `unit_id / source_sha256 / locator / observation`：來源須已實際檢視並帶回執。視覺結論的語義真實性由實際檢視者核驗，本地工具只能檢查登記與範圍。

跨批次更新人物/專題檔案可以原樣保留舊條目的證據；例外按完整證據項逐條比較，不按整個舊單元放行。保留舊引文後再從同一舊單元增加引文，或修改舊引文、定位、附加說明，都需要該單元實際分配給當前批次。新增證據必須來自本批分配單元。重複 batch_id＋相同候選返回 already_committed；不同內容不能冒用已提交批次。引用透過只證明原文存在，review_note 不能代替真實核驗。

Markdown 記錄由工具生成，頂部是 `tw-work-record:v1` 標記與 JSON 元資料程式碼塊，其後全部是資料正文。人可直接改正文；改元資料時保持 JSON 有效與來源關係正確。人完成編輯後，Agent 讀當前正文再重建索引；不從舊索引回寫覆蓋。

中斷寫入會留下 `.state/pending.json`。`recover` 在所有待寫檔案仍匹配前態或目標態時補齊，遇到人的新修改就停止並保留賬本。它不是強制覆蓋命令；不要手刪 pending 來掩蓋半批狀態。正常執行者互斥自動隨程序釋放，無法替任意外部編輯器鎖住檔案。

## 重建、檢索與匯出

```text
python <skill-root>/scripts/work_library.py reindex --project <專案目錄>
python <skill-root>/scripts/work_library.py query --project <專案目錄> --query <人物或問題關鍵詞> --realm canon --continuity novel-main --as-of 3 --limit 20
python <skill-root>/scripts/work_library.py export-sqlite --project <專案目錄> --out <新匯出檔案.sqlite>
```

查詢讀取當前 Markdown，預設保留來源標籤；可用 realm、continuity、階段上限篩選。階段未知的記錄不會進入指定上限的結果。支援關鍵詞/別名匹配，不宣稱語義向量檢索；Agent 需要組合問題時多次有界查詢並回查證據。結果含條目 ID、來源與當前文件雜湊，便於二創資料包引用。

`reindex` 重建 JSONL，並記錄前後文檔雜湊；日誌標記“觀察到變化”，不捏造是誰改了內容。SQLite 匯出含 records 和 sources 兩表、完整記錄 JSON、正文與來源指標，可離線查詢；它是當次快照，不是新的編輯權威。目標已存在時拒絕覆蓋；無模型也能重建、查詢和匯出。[Python sqlite3 文件](https://docs.python.org/3/library/sqlite3.html)說明本工具使用的本地資料庫介面。

## 從資料到提示規格

本庫已有來源身份、階段、證據位置和衝突檢查；本節說明交接用途，不新增記錄格式或第二份事實庫。向提示詞作者提供相關條目 ID、來源/版本、必要條件和短摘錄，指出哪些是直接可見的表達特徵，哪些只是推斷。長書、完整段落庫或第三方詞表不因“學習方法”整體進入分發包。

例如資料 A 只說明“漲水時關閉舊橋”，資料 B 是未證實的“明早或許復開”：交接可以支援“保留條件和不確定來源”，不能歸納成“所有橋都在明早開放”。樣例的地點名不成為模板固定文字。用於歸納的樣例與留作新輸入驗證的材料分開，避免用已見答案冒充泛化證據。

候選提示規格與未見輸入檢查交給 [prompt-spec-contract.md](../../orchestrate-project-blueprint/references/prompt-spec-contract.md)。資料來源繼續由本庫維護；作者是否採納某條規則仍記在原專案決定中。沒有足夠樣例時給有限候選和缺口，不補造原作者意圖、隱藏提示或驗證結果。
