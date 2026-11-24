# 專案進度畫板：範圍、證據與反饋

本畫板幫助駕駛員看清當前範圍、實現證據、驗收缺口和待處理反饋。它是專案內 `progress/` 的本地能力，不建立跨專案工作臺，也不取代總設計案、活動藍圖和 `NEXT.md`。新專案依原有權威鏈初始化；舊專案先讀現有權威與驗收記錄，選定可核對的來原始檔，不要求遷移到新的藍圖格式。`NEXT.md` 始終負責“現在從哪裡繼續”。以下來源同步隨 **v1.8.0** 提供；具體專案的安裝、真實宿主與駕駛員驗收仍按各自的交付門核對。

## 專案檔案與工具

| 檔案或工具 | 職責 |
|---|---|
| `progress/index.html`、`board.css`、`board.js` | 本地畫板；展示計算結果、來源、證據、缺口和反饋。 |
| `progress/progress.json` | `tavernweave/progress-board/v1` 結構化投影；可重建，不是第二份進度正典。 |
| `progress/feedback.json` | `tavernweave/progress-feedback/v1` 專案反饋記錄與歷史，獨立於計劃和驗收結論。 |
| `scripts/project-board.mjs` | `init-sources`、`source-plan`、`sync-sources` 用於雙來源同步；`init`、`sync` 僅用於未啟用來源同步的手工投影；另有 `check`、`export`、`serve`。初次建立不得覆蓋現有檔案。 |
| `scripts/record-progress-feedback.mjs` | `add`、`update` 反饋；寫入前比對版本，寫後回讀並給出回執。 |

這些指令碼是本 Skill 內的相對路徑。靜態開啟或匯出的畫板只讀；如提供填寫表單而沒有可用的本地寫入通道，應把內容標為“待提交草稿”，提供匯出或 CLI 途徑，不能以瀏覽器快取、複製成功或按鈕點選聲稱已經落盤。`serve` 只為所選專案的本地使用服務，不產生部署、外部上傳或釋出授權。

## 雙來源同步：總設計案定範圍，NEXT 記現狀

啟用是專案選擇，不是安裝畫板時的預設遷移。在專案實際總設計案中放入唯一一對 `<!-- tw-progress-scope:begin -->` / `<!-- tw-progress-scope:end -->`，兩標記之間須是一個完整的 `json` 程式碼圍欄及其中的單個 JSON 物件；在實際當前續接檔案中放入唯一一對 `<!-- tw-progress-state:begin -->` / `<!-- tw-progress-state:end -->`，格式相同。新專案模板僅預留說明，不預填假範圍或假完成記錄。舊專案可指定現有設計案和續接檔名，不要求遷移到新的藍圖格式。只要出現標記卻缺另一端、重複、圍欄或 JSON 損壞、版本不支援，就應報結構衝突，不退回手工同步。

範圍塊使用 `tavernweave/progress-scope/v1`：`revision` 為非負整數；`project` 帶 `id/title/version`；`baseline` 帶 `id/label/confirmed/reference`，需要免除門時還帶對應的 `exemptions`；`items[]` 各有穩定 `id/title/module/weight/scope`，其中 `scope` 只能是 `current` 或 `parked`；每個檢查點有穩定 `id/title/weight/gateKinds[]`。`gateKinds` 只列這一檢查點適用的 `automated`、`browser`、`real-host`、`driver` 門。總設計案正文仍解釋目標、取捨與範圍確認依據，結構塊讓工具準確讀取已決定的定義。

狀態塊使用 `tavernweave/progress-state/v1`：`revision` 為非負整數；`projectId/designRevision/baselineId` 必須與範圍塊一致。`handoff` 記錄 `currentStep`、`nextGate`、`openRisks[]` 和 `feedbackRefs[]`，並與 `NEXT.md` 正文中的當前續接事實一致。`items[]` 按範圍塊的全部事項 ID 逐一列出 `activity: todo|doing|blocked`、`summary`，每個檢查點按定義逐一列出 `implemented`、專案內 `evidence[]` 和 `gates[]`。每道門沿用畫板原有的 `kind/status/evidence`，透過駕駛員門還需明確 `confirmationRef`，不適用門還需原因與基線免除依據。事項、檢查點和門必須精確覆蓋定義：遺漏、重複或額外 ID 都是衝突，不能由工具猜測補齊。

下面是**純結構示例**，沒有實際專案進度或驗收證據。複製到專案檔案時，複製每段四反引號 `text` 展示圍欄裡面的內容，也就是標記與其間完整的三反引號 `json` 程式碼塊；先換成已核對的專案事實，不能直接把示例裡的 `confirmed` 改成 `true`：

````text
<!-- tw-progress-scope:begin -->
```json
{
  "schema": "tavernweave/progress-scope/v1",
  "revision": 0,
  "project": { "id": "example", "title": "示例專案", "version": "候選" },
  "baseline": { "id": "scope-1", "label": "範圍待確認", "confirmed": false, "reference": "" },
  "items": [{
    "id": "entry", "title": "核心入口", "module": "核心流程", "weight": 1, "scope": "current",
    "checkpoints": [{ "id": "open", "title": "完成一次核心操作", "weight": 1, "gateKinds": ["automated", "driver"] }]
  }]
}
```
<!-- tw-progress-scope:end -->
````

````text
<!-- tw-progress-state:begin -->
```json
{
  "schema": "tavernweave/progress-state/v1",
  "revision": 0, "projectId": "example", "designRevision": 0, "baselineId": "scope-1",
  "handoff": { "currentStep": "等待確認範圍", "nextGate": "駕駛員確認設計", "openRisks": [], "feedbackRefs": [] },
  "items": [{
    "id": "entry", "activity": "todo", "summary": "尚未開始，不記錄已完成證據。",
    "checkpoints": [{
      "id": "open", "implemented": false, "evidence": [],
      "gates": [
        { "kind": "automated", "status": "pending", "evidence": [] },
        { "kind": "driver", "status": "pending", "evidence": [] }
      ]
    }]
  }]
}
```
<!-- tw-progress-state:end -->
````

兩個塊不改變原文職責：總設計案定義要做什麼及本輪分母，`NEXT.md` 記錄事實、證據和從哪裡繼續；`progress/progress.json` 由兩者生成，是可重建的展示投影。正文與塊若互相矛盾，先核對專案權威並修正文件，不能把“結構校驗透過”說成內容已經得到駕駛員認可。設計事實改變時遞增範圍塊 `revision`，同時把狀態塊 `designRevision` 對齊；範圍、權重或適用門變化還須登記新的 `baseline.id` 和實際確認依據，並保留舊畫板版本。當前步驟、風險、實現或門結果等現狀改變時遞增狀態塊 `revision`。兩個版本均不得回退；來源內容無變化時再次同步不增加畫板 `revision` 或歷史。`revision` 是文件塊的版本，不代替 Git、驗收或釋出版本。

### 從現有專案接入

1. 先讀專案的 `AGENTS.md`、真實總設計案、活動藍圖、當前續接入口和驗收記錄；核實每一項、檢查點、適用門、證據檔案及駕駛員已確認的範圍。缺檔案或只有舊頁面時先說明缺口，不憑示例製造完成率。
2. 將確認的定義寫入設計案範圍塊，將對應現狀寫入 `NEXT.md` 狀態塊。初次接入未確認範圍時保持 `baseline.confirmed: false`，畫板不顯示數字百分比。新增塊屬於原專案文件寫入門，不能由畫板初始化工具替使用者決定。
3. 尚無 `progress/` 時，狀態塊的 `handoff.feedbackRefs` 必須為空，再用 `init-sources --root <專案根> --design <設計案相對路徑> --next <續接檔案相對路徑>` 初始化；可選 `--driver-confirmation <明確確認依據>` 只用於已有真實駕駛員透過記錄。已有 `progress/` 的專案先核對原資料與來源，使用 `source-plan` 接入，不執行初始化覆蓋；啟用雙來源後，原 `init/sync` 不得繞開來源文件直接改投影。
4. 後續先用 `source-plan --root <專案根> --output <新的計劃.json>` 預覽來源差異；首次或非預設檔名可加 `--design`、`--next`。人工核對範圍、舊分母、證據、反饋和待驗收門後，用 `sync-sources --root <專案根> --plan <計劃.json>` 應用。若這次新增駕駛員透過記錄，同樣提供匹配的 `--driver-confirmation` 明確依據。

計劃繫結讀取時的畫板版本、反饋版本、全部來原始檔 SHA-256 和實現／驗收／複測證據檔案 SHA-256。應用時在專案畫板寫入鎖內重讀比較；任一版本、來源或證據變化就拒絕舊計劃，保留計劃草稿，重新核對後再生成。同步把證據雜湊寫入畫板並留在歷史中；`check` 核對所有當前證據檔案存在，並對比上次畫板**已收錄路徑**的當前內容與儲存值，缺失或已收錄內容變化時暫停有效百分比。新路徑的雜湊差異由 `source-plan` 展示，核對後同步納入。雜湊一致只能證明已收錄檔案內容仍與上次記錄相同，不能證明測試確實執行、證據真實或駕駛員已經驗收。來原始檔的結構一致也不代替對正文含義的稽核。

## `progress.json`：只投影已確認的範圍

- `schema` 固定為 `tavernweave/progress-board/v1`；`revision` 是非負整數；`project` 至少有 `id`、`title`、`version`。
- `baseline` 有 `id`、`label`、`confirmed`、`reference`。`reference` 指向使用者確認的範圍依據；目標範圍尚未確認、當前範圍沒有可核對事項或檢查點時，顯示“範圍未確認/暫無可計算項”，不顯示數字百分比。
- `sources[]` 的每條記錄帶 `id`、專案內相對 `path` 和該檔案的 `sha256`，覆蓋實際採用的總設計、藍圖、`NEXT.md` 或舊專案已有權威。`id: next` 必須指向實際當前續接入口，舊專案可以使用原有檔名。`evidenceHashes` 儲存同步時實際引用的證據檔案內容指紋，舊值隨畫板歷史保留。顯示來源版本與最後核對結果。來源變動先標“過期”，審查變動事實後再按所用模式同步，不得靜默把舊證據套到新版計劃上。
- `items[]` 每項帶穩定 `id`、`title`、`module`、正數 `weight`、`scope: current|parked`、`activity: todo|doing|blocked`、`summary` 和 `checkpoints[]`。權重預設為 1；優先順序 `P0/P1/P2` 用於排隊，不充當權重。`parked` 與未採納的新想法不進當前分母。
- 檢查點帶穩定 `id`、`title`、正數 `weight`、`implemented`、專案內相對路徑的 `evidence[]` 和 `gates[]`。寫 `implemented: true` 必須有可核對的實現證據。每道門寫 `kind: automated|browser|real-host|driver`、`status: pending|passed|failed|not-applicable`、`evidence[]`，必要時寫 `reason`。`passed` 必須有對應證據；`not-applicable` 必須說明原因並在已確認基線中有依據，不能用它繞過真實宿主或駕駛員門。

計算只使用 `scope: current` 的事項，並分別按每項檢查點權重和事項權重加權：

```text
某項實現比例 = Σ(檢查點權重 × 已實現且有證據) / Σ檢查點權重
某項驗收比例 = Σ(檢查點權重 × 已實現且所有適用門已透過、有對應證據) / Σ檢查點權重
整體實現百分比 = 100 × Σ(事項權重 × 該項實現比例) / Σ事項權重
整體驗收百分比 = 100 × Σ(事項權重 × 該項驗收比例) / Σ事項權重
```

模組百分比按同一規則，只取該模組當前範圍事項。沒有可計算分母時不報數字。沒有適用門的檢查點只有在基線明確記載免除理由時才可計入驗收；否則保留待核對。檢查點沒有部分完成猜測值，不能憑“做了一半”填 50%。已確認範圍拆分、增加或移出事項時，更新 `baseline.id` 和 `reference`，保留舊版本可追溯資訊；不能靠刪掉未完成項提高百分比。百分比達到 100 也不自動關閉真實宿主、駕駛員、Git、封裝或釋出門。

## `feedback.json`：想法、Bug 與稽核原話

`schema` 固定為 `tavernweave/progress-feedback/v1`，含整數 `revision` 和 `records[]`。每條記錄至少有穩定 `id`、`type: idea|bug|review`、`title`、原文 `text`、可選 `itemId`、`priority: P0|P1|P2`、`state`、`createdAt`、`updatedAt`、`context` 和 `history[]`。`context` 記錄提交時的 `boardRevision`、`baselineId`、`sourceHashes`；`history` 保留每次狀態或文字變更的時間、原狀態、新狀態、操作來源與理由，不抹掉原始意見。

| 型別 | 允許狀態 | 處理邊界 |
|---|---|---|
| `idea` | `new`、`discussing`、`adopted`、`parked`、`rejected` | 記下想法不等於改 First Playable；採納後才按專案原有變更門更新總設計或藍圖。 |
| `bug` | `new`、`confirmed`、`fixing`、`retest`、`closed`、`wont-fix` | 未確認報告單列；已確認且關聯事項的阻斷 Bug 令相關驗收待複測，修程式碼不能直接關單，關閉需複測證據。阻斷與否要有明確稽核記錄，不憑 `P0` 自動推斷。 |
| `review` | `recorded` | 記錄駕駛員原話、關聯範圍和證據；“已記錄”不等於 `driver-accepted`。 |

已確認的阻斷 Bug 進入 `wont-fix` 或改回待處理狀態仍保留驗收缺口；取消阻斷須明確核對關聯影響並留下處理理由，不能只靠改狀態解除。關閉還須有 `resolution`、`verification` 和專案內實際存在的 `verificationEvidence[]` 檔案。服務重新核對已關閉 Bug 的複測檔案，檔案缺失仍暴露證據缺口。

明確的人類確認可作為後續維護專案權威的輸入，但須核對表達的物件、範圍和證據，並由原有流程更新總設計、藍圖、`NEXT.md` 或驗收賬本。不得由反饋記錄自動推斷駕駛員驗收，也不得擴張 Git、安裝、部署、釋出等許可權。

反饋迴流按“記錄 → 核對決定與證據 → 改權威 → 重新生成畫板”進行。`progress/feedback.json` 獨立儲存原話與處理歷史；`NEXT.md` 的 `handoff.feedbackRefs[]` 可以引用已經存在的反饋 ID，交代本輪待處理或已處理的意見，但引用本身不代表採納、修復或驗收。想法被採納、Bug 被修復或稽核意見改變下一步時，由 Agent 在駕駛員授權範圍內維護總設計案、活動藍圖和 `NEXT.md`，再跑來源計劃與同步；工具不從反饋文字自動推斷專案狀態。反饋檔案不放進畫板 `sources[]`，避免“反饋引用改變 NEXT → 來源雜湊改變 → 反饋上下文再改變”的迴圈；預覽計劃仍繫結反饋版本，以便識別同期阻斷 Bug 或意見變更。

## 寫入、衝突與讀回

寫入僅限所選專案根目錄內經核對的相對路徑。反饋 `add/update` 必須攜帶呼叫者讀到的 `revision`；併發標籤頁或其他寫入者已推進版本時，拒絕舊版本覆蓋，返回衝突與最新版本，保留未提交草稿供人工比較。成功時原子替換、遞增版本並回讀目標記錄；回讀不一致就報告失敗，不顯示“已儲存”。許可權拒絕、格式錯誤、磁碟或服務失敗也要保留草稿，說明沒有落盤。重開後應能從專案檔案讀到已儲存記錄與歷史。

若來源已變化，舊畫板仍可顯示帶“待複核”的記錄，原始反饋也可繼續保留；這些記錄不能據此推進設計範圍、透過驗收門或自動更新 `NEXT.md`。寫入衝突時先比較實際檔案和原草稿，不機械替換版本號或新增 `--reviewed-sources`。來源同步啟用後，完整手工 `sync` 僅供未啟用專案使用。

畫板重新整理和記錄回執應分別標明當前來源雜湊、基線 ID、畫板版本和反饋版本。頁面快取與本地草稿僅用於恢復輸入，不作為專案狀態或驗收證據。

## 驗收對齊

1. 初次初始化不覆蓋舊專案檔案；舊專案可選擇現有權威來源，生成的畫板與 `NEXT.md` 沒有衝突的當前指標。僅一份或無效標記必須報衝突。
2. 來源變更會標過期；重讀並做來源計劃、同步後來源雜湊、事項和證據可追溯。百分比有已確認分母，暫存項不參與；模組和整體計算一致。計劃過期或手工同步繞過須拒絕。
3. 自動、瀏覽器、真實宿主、駕駛員的狀態與證據分開顯示；100% 不冒充未透過的門。
4. 三類反饋可新增並讀回，狀態變更留歷史；確認 Bug 保留複測缺口，稽核意見不自動改權威或授權。反饋引用只在 `NEXT.md` 中交代關係；範圍或現狀發生實際變化後由 Agent 更新權威再同步。
5. 寫入失敗不報成功；兩個標籤頁基於同一舊版本提交時，後者得到衝突且前者記錄未丟。靜態頁面明確只讀，草稿匯出不顯示落盤迴執。
