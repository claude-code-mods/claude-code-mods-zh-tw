# TW 專案進度畫板

**v1.8.0 開始提供專案進度畫板與總設計案／NEXT 同步。** 當前完整包見 [v2.0.0 正式釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.0.0)，共 23 個 Skill；畫板仍屬於 `orchestrate-project-blueprint`。上一版 [v1.9.1 釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v1.9.1)保留 22 個 Skill 的歷史包，首次釋出記錄保留在 [v1.8.0 釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v1.8.0)。畫板用於角色卡與普通軟體專案；各專案有自己的檔案、主題、範圍和記錄。

## 可以直接這樣說

```text
給這個專案建一個進度畫板。
先讀取已有設計、藍圖、NEXT 和驗收記錄，列出本輪範圍，複用已經確認的決定。
顯示整體與分模組的實現、驗收百分比；每項都能展開檢查點、證據和待核對的門。
我要能儲存新想法、Bug 回報和稽核意見，保留原話、處理歷史和版本衝突提示。
先給改動範圍和預覽；不要覆蓋原有畫板，不自動擴大第一版或標記駕駛員驗收。
```

使用已有畫板時，先檢查其實際儲存方式。只有靜態 JSON 展示的舊頁面不能聲稱支援寫入；需要新增能力時，先保留舊檔案再按該專案現有流程改造。初建工具發現 `progress/` 已存在就拒絕覆蓋。

## 看懂進度條

| 顯示項 | 計算與用途 |
|---|---|
| 實現進度 | 本輪範圍內，已經實現且有證據的檢查點佔比。 |
| 驗收進度 | 已實現檢查點中，所有適用驗收門均透過、有證據且無已確認阻斷 Bug 的部分；分母仍是本輪全部檢查點。 |
| 模組進度 | 對該模組用同樣規則計算，方便看出哪裡在拖進度。 |
| 待實測 / 阻斷 | 程式碼完成但操作、真實宿主或駕駛員還沒透過，分別顯示缺口。 |
| 暫存 | 本輪不做的內容；新想法也獨立記錄，不進入當前進度分母。 |

檢查點和事項的工作量權重預設 1；需要加權時寫明理由。P0/P1/P2 只決定處理順序。頁面可以展開檢視分母、各項權重、已完成檢查點和來源 SHA-256。沒有已確認範圍就顯示“待確認”，不會猜一個百分比；還差一點時不會四捨五入成 100%。

調整範圍、權重或免除驗收門必須登記新基線並保留舊記錄。來原始檔變化時顯示“舊記錄”。`check` 核對所有當前引用的證據檔案是否存在，並將**上次畫板已收錄**的實現、驗收及 Bug 複測證據與儲存的 SHA-256 比較；檔案缺失或已收錄內容變化時暫停有效百分比並保留缺口。新增加的證據路徑由 `source-plan` 列出雜湊差異，核對後同步納入。雜湊一致只證明已收錄檔案與上次記錄相同，不證明證據真實或驗收已發生。100% 只覆蓋已列出的範圍，不自動代替真實宿主、駕駛員、Git、封裝或釋出門。

## 想法、Bug、稽核怎麼處理

- **新想法**：新增 → 討論 → 採納／暫存／不採納。採納之後再按專案原有變更流程更新設計或藍圖。
- **Bug**：新增 → 確認 → 修復 → 待複測 → 關閉。原話、出現條件和處理理由都保留；關閉需要處理結果、複測結果和專案內的真實證據檔案。已確認阻斷 Bug 即使“本輪不修復”，仍保留驗收缺口。
- **稽核意見**：記錄駕駛員原話、關聯事項與來源版本；這條記錄本身不會自動改成 `driver-accepted`。

儲存成功會明確顯示寫入並回讀 `progress/feedback.json` 的回執。兩個標籤頁使用同一舊版本提交時，後者被拒絕覆蓋，草稿保留；重讀當前記錄、比較差異後，可主動繫結新版本再次提交。來源或畫板範圍變化也會使舊草稿的提交上下文失效。

當前標籤頁的新增與處理草稿可以暫存在瀏覽器會話中，以便重新整理恢復；這不是專案狀態或驗收證據。瀏覽器暫存不可用時會說明，離開前可以匯出。靜態預覽明確只讀，可填寫併發起草稿下載；瀏覽器下載與專案儲存分別顯示。

有反饋需要改變專案時，先核對原話、影響和證據，再由 Agent 按專案原有授權維護總設計案的範圍定義、活動藍圖及 `NEXT.md` 的實際狀態；可在 `NEXT.md` 的 `handoff.feedbackRefs[]` 記下對應反饋 ID，隨後重新生成來源計劃並同步畫板。這個引用只是交接線索：想法被標記“已採納”、Bug 被標記“已關閉”或稽核意見被儲存，都不會自動改範圍、確認真實宿主結果或標記駕駛員驗收。`feedback.json` 保持獨立，不加入來原始檔雜湊清單；計劃另核對反饋版本，避免期間新增阻斷 Bug 後仍套用舊百分比。

## 檔案與執行

專案權威仍是原有設計案、藍圖和當前續接入口。選擇來源同步後，總設計案中的 `tw-progress-scope` 塊定義專案版本、本輪範圍、事項、檢查點和適用驗收門；`NEXT.md` 中的 `tw-progress-state` 塊記當前步驟、下一道門、風險、實現與驗收結果。`progress/progress.json` 由這兩份檔案生成，只用於展示；反饋另存 `progress/feedback.json`。工具同步畫板不會替使用者改寫總設計案或 `NEXT.md`。兩個來源塊是專案自願啟用的，舊專案可使用原有檔名。

工具位於 [專案編排 Skill](../skills/orchestrate-project-blueprint/SKILL.md)。輸入格式與驗收規則見 [畫板合同](../skills/orchestrate-project-blueprint/references/progress-board.md)，初始輸入可參考 [JSON 示例](../skills/orchestrate-project-blueprint/assets/templates/progress/board-input.example.json)。讓 Agent 根據實際專案填寫；示例不是專案已完成證據。

下面命令從該 Skill 目錄執行，`<專案根>`、`<初始範圍.json>` 等佔位符換成實際路徑：

```bash
node scripts/project-board.mjs init --root "<專案根>" --input "<初始範圍.json>"
node scripts/project-board.mjs serve --root "<專案根>" --port 0
node scripts/project-board.mjs check --root "<專案根>"
node scripts/project-board.mjs export --root "<專案根>" --format md --output "<新檔案路徑>"
```

`serve` 使用 Node 標準庫，只監聽 `127.0.0.1`，終端會給出訪問地址。當前在 Node 22 上驗證，無需前端框架。它只提供該專案的畫板和反饋寫入，停止服務後不再接受寫入。複用專案已有服務時，按同一版本與上下文合同接入實際寫入通道；沒有寫入通道就保持只讀。

上面的 `init --input` 是尚未啟用來源塊的舊式手工投影入口。新專案和願意接入的舊專案，先讀現有設計、活動藍圖、當前續接入口與驗收資料，再經原專案寫入門將完整的 `tw-progress-scope`、`tw-progress-state` 來源塊放入實際設計案和當前續接檔案。每個塊都要用一對標記包住**完整的三反引號 `json` 程式碼塊**，格式及可複製示例見[畫板合同](../skills/orchestrate-project-blueprint/references/progress-board.md)。新專案模板只是預留位置，不自帶已啟用的空 JSON，也不憑示例生成百分比。兩塊必須是唯一、有效且相互對應的：專案 ID、設計修訂、範圍基線，以及所有事項、檢查點和適用驗收門都要對上；缺一項就先修源文件。

初次生成來源畫板，以及後續預覽和應用，用下面三條命令：

```bash
node scripts/project-board.mjs init-sources --root "<專案根>" --design "<設計案相對路徑>" --next "<續接檔案相對路徑>"
node scripts/project-board.mjs source-plan --root "<專案根>" --output "<新的計劃.json>"
node scripts/project-board.mjs sync-sources --root "<專案根>" --plan "<計劃.json>"
```

`init-sources` 拒絕覆蓋已有 `progress/`，首次建立時 `NEXT.md` 的 `handoff.feedbackRefs` 須為空；已有畫板用 `source-plan` 核對後接入。真實檔案不使用預設名時，在 `source-plan` 增加 `--design`、`--next`。計劃檔案要用未存在的新路徑，先看差異，再決定是否應用。計劃繫結畫板版本、反饋版本、全部來原始檔及證據檔案的 SHA-256（檔案內容指紋）；應用時在寫入鎖內重讀。版本或檔案內容變化會拒絕舊計劃，需重新核對再生成，不能只改計劃中的雜湊或版本號。新添駕駛員透過記錄時，在初始化或應用命令加 `--driver-confirmation "<明確確認依據>"`，並與門內的 `confirmationRef` 對齊；普通自動檢查不能填寫這項。

設計定義或專案版本改變時遞增設計案範圍塊 `revision`，並讓 `NEXT.md` 狀態塊的 `designRevision` 與它一致；改變本輪分母或適用門還需新範圍基線與確認依據。當前步驟、風險、實現情況或驗收結果改變時遞增狀態塊 `revision`。這兩個修訂號不能回退。若來源和證據沒有變化，再次同步不會增加畫板版本或歷史記錄。

未啟用兩個來源塊的舊畫板仍可沿用手工入口，先核查來源和範圍，再執行：

```bash
node scripts/project-board.mjs sync --root "<專案根>" --input "<完整畫板.json>" --expected-revision 0 --reviewed-sources
```

`--reviewed-sources` 表示已核查來源變動，不能機械新增。完整輸入可從該專案已有 `progress.json` 開始修改；啟用來源塊後，此手工命令不得繞開源文件直接改投影。新增駕駛員透過記錄還須提供與 `confirmationRef` 一致的 `--driver-confirmation` 明確依據；工具不會替使用者判斷已經驗收。

畫板只核對來源結構、版本、檔案存在與內容指紋；同步時把證據 SHA-256 儲存在畫板和歷史中，`check` 用當前檔案與上次已收錄的指紋對照，`source-plan` 展示新路徑或舊路徑的雜湊差異。證據內容是否足以證明自動檢查、瀏覽器操作、真實宿主行為或駕駛員確認，仍按各專案驗收門逐項判斷。若正文與 JSON 塊矛盾、來源塊缺失或重複、計劃過期、證據檔案變化，應先處理衝突再同步；不要為了顯示更高百分比移走未完成項或改寫證據。

CLI 反饋也使用讀取時的反饋版本與 `context`。可以用畫板匯出的草稿，或 `check` 返回的上下文構建輸入：

```bash
node scripts/record-progress-feedback.mjs add --root "<專案根>" --input "<反饋草稿.json>"
node scripts/record-progress-feedback.mjs update --root "<專案根>" --input "<處理草稿.json>"
```

儲存被拒絕時不能自動改成最新版本覆蓋。服務意外中止若留下 `.write-lock`，先確認原寫入已結束、核對 JSON 和草稿，再由維護者處理鎖檔案；工具不會擅自搶佔正在進行的寫入。
