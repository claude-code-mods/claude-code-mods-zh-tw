# 雙任務升級與 2.0.0 發行說明

> 當前正式版為 2.4.0，含 23 個 Skill，發行資產見 [v2.4.0 釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.4.0)。上一版 1.9.1 含 22 個 Skill。下文保留 v1／v2／v3／v4 候選補丁的原始來源、應用方法及其當時的驗證邊界；歷史命令只用於核對原補丁，不能當作當前 2.4.0 的安裝或釋出步驟。

2026-10-15。適用固定基線：[`LiarMTTT/TavernWeave@9a8274f9b0a714256195845cab4e4f6ad73e2997`](https://github.com/LiarMTTT/TavernWeave/tree/9a8274f9b0a714256195845cab4e4f6ad73e2997)。

以下記錄的是 1.9.1 之後、正式合入之前的**本地候選原始碼補丁**，當時尚未釋出。原正式 1.9.1 的 22 個 Skill 記錄保留；候選增加一個獨立世界書入口，共 23 個。當時版本欄位尚未提升，安裝、外掛釋出與使用者酒館配置均未操作。

## 從哪裡用

- 寫通用提示規格、從樣例歸納可測試規則：[blueprint 的區域性提示規格入口](../skills/orchestrate-project-blueprint/SKILL.md#區域性提示規格與樣例歸納)。一段提示詞不需要啟動完整工程。
- 設計玩法、地圖或可選事件：[原創貫通例](../skills/tavern-card-builder/references/world-mechanics-and-scenarios.md)。適用於非世界書專案，不要求先做一張卡。
- 獨立規劃、審閱或精修世界書：[worldbook-design-and-writing](../skills/worldbook-design-and-writing/SKILL.md)。只改正文就讀寫作參考；改拆合/載入再讀規劃參考；整卡仍由 builder 負責。
- 需要理解酒館輸入與狀態鏈時：[共享執行基礎](../skills/consult-tavernweave-library/references/sillytavern-runtime-foundations.md)。先純文字回合，再按專案需要接模板、MVU 或 UI；不強迫普通世界書跑全套擴充套件矩陣。

## 實際改了什麼，什麼直接複用

| 範圍 | 基線已有 | 本輪增量 |
|---|---|---|
| 主動釐清 | 共享溝通、blueprint 四態決定、目標與約束 | 在共享溝通維護唯一規則；區分目標/限制/手段，關鍵缺項才問，小缺口可糾正地推進。blueprint 和世界書入口只接線。 |
| 提示規格與樣例 | 首版合同、來源庫、自然表達與驗收 | 消費者→固定/待填內容→輸出合同→凍結候選→未見輸入檢查；原創路線告示與故意改壞反例。 |
| 世界/玩法/地圖/事件 | 世界因果、資源、空間、玩家選擇、狀態所有權 | 石渡過河貫通例：代價、失敗/退出、有向邊、穩定 ID、可選節點；不新建總綱、排程器或狀態庫。 |
| 表達、標題和交付 | 原文風、敘述和去八股診斷 | 補證據到非人物表達約束的交接、保留否定/程度/條件的反例、準確標題與體驗簡介。已有維度不重寫。 |
| 世界書專門方法 | builder 已有事實/知曉程度、正文邊界、作者規則、載入與狀態交接 | 遷到獨立入口並保留舊錨點；補概念限定、自由區/未定項、機制比較、混合交界與具體正文反例。 |
| 技術方法 | API、變數、正則、UI、安全、元件與效能專職流程 | 不復制另一套 API/schema 教材；只補 E03/E05/E06/E07 的世界書合同與證據交接。 |

新 Skill 的必要性是“世界書單獨任務可呼叫”，不是源預設裡有同名模組。builder 仍擁有世界構建、角色創作、整卡 Content map、開場、CoT 和最終交付。舊 `worldbuilding-design.md` 與 `lorebook-and-prompts.md` 保留相容標題及導航，不保留兩份完整世界書教程。沒有刪除任何整個原始檔。

## 已批准取捨

- C01：保留有效否定、程度、條件和示例。不能把“通常”壓成保證，也不能把“未核實不得通行”壓成“核實即可通行”。
- C02：模板可選，無通用 XML/YAML、最低字數、板塊、候選或關鍵詞數量配額。真實解析格式仍嚴格保護。
- C03：授權範圍內可補普通細節；新增核心設定、玩法目標或重大劇情先提案。事件圖不替玩家決定路線。
- C04：繼續關閉原生遞迴的兩個方向；刪固定 order 數字配方和模型品牌繫結深度，保留宿主 `order` 欄位。插入深度僅作有理由的場景選擇；已有掃描深度 2 政策不變。六類 EJS 來源情境非獨佔、可調整；依賴原生遞迴的動態關鍵詞不採用，狀態列交 UI。
- 2026-10-15 另獲批准的 A0 最小修訂：仍檢查目標、限制、驗收；上下文明確就推進，只有關鍵缺項/衝突才問。同步移除開工與續接時機械三句/逐句確認門。透過 `guide-corrections.json` 維護，保留源 hash 並更新目標 hash，避免下次快照覆蓋修訂。
- P049/P050/P051 整組排除，沒有改名吸收；P052 等人物寫作、破限和預設人設不遷入。TW 原有獨立去八股及角色能力保留。P073 仍待核，沒有為它造方法或產物。

## E01–E07 逐項落點

| 包 | 實際權威與交付 | 本輪能證明的內容 / 下一步 |
|---|---|---|
| E01 機制選擇 | [planning §4](../skills/worldbook-design-and-writing/references/planning-and-loading.md#4-e01-choose-the-least-complex-sufficient-mechanism) | 原生、簡單條件、既有控制器+顯式讀取、區域性混合的能力/代價/升級退出理由。具體版本仍須 E03。 |
| E02 同需求比較 | [橋樑三方案](../skills/worldbook-design-and-writing/references/examples.md#1-e02-one-bridge-three-designs) | 真/假/缺值/入口不可達的期望。原生短規則會發送規則兩分支，不能冒稱滿足嚴格“只發送適用分支”。 |
| E03 版本核驗 | [固定原始碼記錄](../skills/sillytavern-api-reference/references/worldbook-version-verification.md) | 宿主、模板、助手、MVU 固定修訂；讀取、角色訊息視窗、作用域/快取、入口和預算的窄原始碼結論。使用者目標版本與執行行為未知。 |
| E04 優先順序 | [planning §5](../skills/worldbook-design-and-writing/references/planning-and-loading.md#5-e04-state-choice-and-mention-precedence)、[中性路由例](../skills/worldbook-design-and-writing/references/examples.md#5-neutral-routing-example) | 狀態、顯式選擇、普通提及、跨時代比較、否定、失敗寫入與歧義的選擇表及靜態反例。 |
| E05 完整性 | [型別目標與狀態合同](../skills/sillytavern-database-rolecards/references/worldbook-target-state-contract.md) | 型別/目標/別名/哨兵、時期章節一致性、合法 0/false、訊息/候選作用域；既有 field ledger 仍是唯一資料權威。 |
| E06 去重與預算 | [世界書輸出預算](../skills/sillytavern-rolecard-performance/references/worldbook-output-budget.md) | 跨原生/模板/控制器身份去重、必要項依賴、可選裁剪及硬超額失敗。靜態單位不是實際模型 token。 |
| E07 執行驗收 | [隔離執行檢查](../skills/sillytavern-runtime-debug/references/worldbook-isolated-runtime-checks.md)、自寫 JSON 夾具、空白觀察記錄及結構檢查器 | 已有可執行的離線合同檢查；真實宿主入口→最終請求、狀態前後→下輪消費與模型行為均 **not-run**。結構合格不等於證據真實或執行成功。 |

E03 的示例原始碼結論不等於最新發布或使用者安裝狀態。尤其原卡的 `getChatMessages(-1, 'user')` / `(-1, 'assistant')` 在所查模板修訂先過濾角色再 `slice(-1)`；不能沿註釋稱為最近三條，也不能套用助手同名 API。

## 來源與逐條覆蓋

按最新要求，Skill 正文、配套參考和夾具不含兩份素材的作品標識、原卡 UID 或來源索引；只保留通用方法、中性自寫例和必要官方技術依據。真實追溯儲存在本節、[方法遷移記錄](worldbook-source-migration-notes.md)與[執行反例來源記錄](worldbook-runtime-source-notes.md)，不作為 Skill 日常載入內容。通用概念、API 和標準格式不作機械改名；獨特長段、原書摘錄及原始碼模板不照搬。

完整機器可讀核對：[dual-task-adoption.json](dual-task-adoption.json)。151 項連續零基索引、原 identifier 和名稱均與原 JSON 對應；每項記錄採用/複用/排除/待核、範圍限制及方法組，方法組給實際基線章節、目標和驗證位置。任務 A 的方法另外保留逐項基線/實際缺口說明。

- 源預設 SHA-256：`f7c3a88836bda71f35353d2193d0db0ec0430d1af275d1e9957bdf6930936e4a`。原規劃分為 85 排除、29 部分候選、36 複用、1 待核；這是源分類，不表示 29 項都必須新增程式碼或整篇搬運。
- 真實卡 SHA-256：`d2de21bc259711f984a4163a1f71812ea52460ea1e81e95398dc271ae4f8986d`。只讀核對為 526 條、26 啟用、18 啟用常駐、8 啟用非恆定原生條目、6 含 EJS。4 控制器只證明靜態意圖，停用資料是否實際讀到由 E03/E07 驗證。
- P150 與 `extensions.SPreset` 的解析副本相等，四個 regex 配置副本相等；這是靜態比對，不是指令碼安全或執行結果。
- 長篇書籍和教程僅作方法結構/相關段落核對，不復制原書。長 HTML、正則、載入器沒有逐行完整安全審計；它們及原卡/預設均未執行。
- 補丁不附完整預設、原卡、使用者原始拆解全文或遠端指令碼。來源與改寫邊界只保留在交付文件 [worldbook source notes](worldbook-source-migration-notes.md)。原倉庫 [LICENSE](../LICENSE) 和附帶來源說明保留；本補丁不改變許可或主張第三方素材所有權。

## 應用方式

### v4：開場白的前端形式

核心元件仍是可用的開場白與世界書。開場白可以用正文、開場白前端或兩者結合實現；可用的前端形式不需要再附一份純文字開場白。這項澄清不決定後續是否使用前端，也不新增卡型別或要求 MVU。

共同核心定義是唯一規則出處；開場策略與 UI 實現負責真實 `first_mes`／分支載體、玩家入口和模型可見內容。場景展示、選項頁按其功能檢查，配置嚮導保留草稿、確認和真實提交約束。空欄位、空殼頁面或無法載入的佔位標記不能充當已完成開場。按鈕、狀態寫入或訊息傳送一旦採用，仍須驗證其實際行為。

v1、v2、v3 原包保留。v4 另交從固定原基線生成的全量補丁，以及適用於完整 v3 候選的增量補丁，兩者擇一。當前改動為規則澄清與靜態迴歸，未進行真實酒館或模型測試。

### v3：自然表達與統一教學例

本輪通讀全部 23 個 Skill 的自有指導、參考與文字模板，改寫真正妨礙理解的句子。清楚的說明和有用清單保留；程式碼、介面、引數、步驟次序、適用範圍與驗證狀態不因潤色而改義。

世界書、路線提示規格與玩法貫通例統一採用原創的榆冠王國石渡。守衛條目寫明維持通行和民事裁斷的區別，港規交代貨引及賑濟通道的緣由；秘密保留事實與知情範圍。三種橋樑載入方案、同名異義、等義措辭與位置比較繼續檢驗原來的技術問題。新增的守衛場景是作者定義的語義預期，不是模型實測。

兩項技術糾錯經過單獨確認，沒有當作等義潤色處理：沒有戰鬥時只跳過戰鬥判斷，其他系統判斷按需保留；角色心理、約定結算結果或簡短依據可以輸出，文風不能作為展示完整內部推理的理由。另糾正 CoT 定義中的主體筆誤。A0 的“30 秒”“一半返工”無測量依據，已透過原有更正記錄改為檢查目標、邊界的直接說明；源 hash 保留。

v1、v2 原包獨立保留。v3 提供從固定原基線生成的全量補丁，以及僅適用於完整 v2 候選內容的增量補丁。兩種應用方式擇一，不連續疊加。版本欄位仍為 1.9.1，Skill 數量與各自職責不變；沒有安裝、釋出或新增執行機制。

### v2：補齊研究落實的三項缺口

v2 在原候選上作窄範圍補充，不重寫既有方法，不增加新的 Skill 或技術執行權威：

1. [研究依據對映](../skills/worldbook-design-and-writing/references/research-sources.md)隨補丁提供 13 項原始資料的具體落點、支援範圍與限制。技術寫作、知識組織、廠商實踐和三篇論文分別標明用途；不把 TW 原有方法遷移說成論文新增成果。
2. [可選行為對照](../skills/worldbook-design-and-writing/references/behavioral-validation.md)補同義表述、本地定義/概念表述、上下文位置三類設計。控制條件、語義預期、長度/資訊量混雜、未見場景、實際輸入證據、失敗記錄和判斷邊界均有說明；不強制每條實驗，不增加模型呼叫授權。
3. [同名異義例](../skills/worldbook-design-and-writing/references/examples.md#6-one-label-two-local-meanings)區分“白塔”建築與救援組織；寫作參考補概念標籤、本地定義與穩定身份的區別。示例由本次自寫，不依賴 RDF，也不把標籤當成已實現的觸發條件。

新的 JSON 夾具僅儲存驗證設計與作者預期，`modelCallsMade: 0`、`actualResults: []`、`status: not-run`。靜態測試只核驗夾具與文件的一致性，未證明模型行為或長上下文效能。通用源素材排除、原生遞迴關閉、掃描深度 2、C01–C04、E03/E05/E06/E07 的職責不變。

v1 包獨立保留。v2 全量補丁從同一固定基線生成；另提供僅適用於完整 v1 候選內容的增量補丁，兩者擇一，不連續疊加。人讀中文閱讀材料獨立放在交付包中，不新增第二份 Skill 權威正文。

### 從固定基線應用全量補丁

在已有 TW **原始碼工作副本**中操作，先備份自己的未提交工作。以下是手動檢查步驟，不是安裝指令碼：

```sh
git rev-parse HEAD
git status --short
# HEAD 必須為 9a8274f9b0a714256195845cab4e4f6ad73e2997，工作樹/索引必須乾淨。
git apply --check /path/to/TavernWeave-dual-task-upgrade-v4.patch
git apply /path/to/TavernWeave-dual-task-upgrade-v4.patch
git diff --check
```

HEAD 不同、有本地修改、檔案缺失或任一檢查報衝突時停止，先審差異。不要自動 `reset --hard`、覆蓋整目錄、強制補丁或盲用三方合併。補丁包含新增檔案；應用只是改這份原始碼，不會安裝到 Codex/Claude/DSH、不改酒館、不自動執行指令碼。完整原始碼包可用於審閱，但其中 1.9.1 版本欄位不代表這是正式 1.9.1 釋出物。

## 驗證與未測邊界

具體執行命令、逐檔案結果、獨立審查與乾淨基線應用結果隨交付包提供。倉庫新增測試覆蓋路由/清單/定向糾正、通用方法、世界書設計、執行合同；v2 另加研究對映與三類驗證設計檢查。其他適用 Node 與 Python 檢查、庫校驗、同步與相對連結/錨點檢查結果以本次交付日誌為準。

可以單獨複查本輪主要靜態門：

```sh
node --test tests/greeting-frontend-contract.test.mjs tests/dual-task-integration.test.mjs tests/general-methods-integration.test.mjs tests/worldbook-design-writing.test.mjs tests/worldbook-runtime-contracts.test.mjs tests/worldbook-research-design.test.mjs
node skills/consult-tavernweave-library/scripts/validate-library.mjs
node scripts/sync-guidance.mjs --check
node skills/sillytavern-runtime-debug/scripts/validate-worldbook-observation.mjs skills/sillytavern-runtime-debug/tests/fixtures/worldbook-runtime-observation.pending.json
python -B tests/test_plugin_packages.py
```

原 v4 交付環境沒有 PowerShell，當時未執行 `validate-release.ps1`、安裝門及 host-front-door 的 PowerShell 整合測試。沒有真實 SillyTavern、擴充套件配置與模型呼叫授權，故未匯入使用者卡、未做外掛宿主載入、真實最終請求捕獲、狀態/分支執行或付費模型對照。教學夾具不是實際應用驗收。本機後續修訂見下節，不把歷史未測項改寫成當時已透過。

原 v4 包保留了歷史 `tests/replay` 案例、結果和目錄指紋，沒有偽造新增模型回放或僅重算指紋過門；當時受影響舊 Skill 的指紋需要複核，新世界書 Skill 缺主路由回放。打包器的數量回歸使用隔離測試倉庫，不是候選釋出包或使用者安裝。原交付停止點是可審閱、可應用的候選原始碼補丁。

## 2026-10-16：併入前修復適配

駕駛員在本機審查後明確允許併入前修復。沿用本包的 23 個技能及功能範圍，只修正藍圖技能描述中的 YAML 字串引用；實際路由已接入，不新增第二套路由。當前原始碼安裝說明改為按清單核對 23/23，已釋出 1.9.1 的 22 技能歷史保留。

本輪 [書面複核記錄](../tests/replay/runs/2026-10-16-v4-premerge/manifest.json) 對原 80 正向、90 對抗的有效完整答覆逐案複核，170 條仍與當前合同相容；其中一條沿用 1.9.1 已評審的修訂答覆，其原答覆和先前缺項記錄均保留。新世界書技能增加 6 正向與 6 對抗案例，獨立作答與評審分開：首評 11 條透過、1 條補齊未見樣例及比較控制後複評透過，首輪和修訂都隨記錄保留。當前案例總數為 88 正向、96 對抗（2026-10-18 評審修復新增 2 條路由歸屬案例，見 [review-fixes 記錄](../tests/replay/runs/2026-10-18-review-fixes/review.json)）；完成複核後才更新候選指紋。這是書面合同證據，不是 182 次既有模型試跑、也不是新增 2 條案例的模型試跑或真實宿主驗收。

併入前 Windows 完整檢查、官方 Skill 格式與打包迴歸的實際結果見外部回執。內部續接記錄不公開；本輪合入與回執以本頁及 Release 為準。當時版本欄位仍為 1.9.1，未製作正式發行身份；合入、正式版本收斂、提交、安裝、推送及釋出留待後續授權。

## 2026-10-16：本地合入 2.0.0（發行前記錄）

駕駛員授權將已審閱的 v4 修復併入升級，版本號定為 **2.0.0**。本地原始碼在原 22 個 Skill 上增加 `worldbook-design-and-writing`，共 23 個；原安裝標識 `tavernweave-agent-skills`、Codex／dots 共用外掛和相容流程保持。當時擬沿用 `TavernWeave-Codex-v2.0.0.zip` 命名，不另造 dots/cloud 包；本地合入階段尚無可下載的 2.0.0 Release 或校驗檔案。

上節是**併入前**修復記錄，其“版本欄位仍為 1.9.1”和“尚未合入”只描述當時的狀態。本次合入不改寫 v1／v2／v3／v4 的補丁來源、170 條舊答覆複核和 12 條新增書面案例；這些記錄不能算作 182 次既有模型試跑，也不能算作 2026-10-18 新增 2 條案例的模型試跑。靜態檢查、包內容核驗、客戶端真實發現、dots 雲端執行、真實 SillyTavern／模型行為、駕駛員驗收、提交和公開發布各有獨立證據門。當時完成的是本地原始碼合入與版本收斂；正式發行結果見下節和實際回執。

## 2026-10-16：2.0.0 正式交付

2.0.0 正式發行包從 [v2.0.0 釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v2.0.0)獲取，以同頁 `SHA256SUMS.txt` 核對下載檔案。Codex 與 dots 共用 `TavernWeave-Codex-v2.0.0.zip`；安裝標識仍為 `tavernweave-agent-skills`，共 23 個 Skill。歷史 [v1.9.1 釋出頁](https://github.com/LiarMTTT/TavernWeave/releases/tag/v1.9.1)保留原 22 技能包，不與本版安裝清單混用。

本輪原始碼提交、發行包構建、檔案大小和 SHA-256、簽名狀態、推送與公開發布的實際回執由維護者保留，不在公開倉庫分發。發行包內容校驗與真實 Codex／dots 發現、雲端長任務、SillyTavern／模型／裝置行為和駕駛員體驗是不同的檢查；本頁不把前者寫成後者已透過。
