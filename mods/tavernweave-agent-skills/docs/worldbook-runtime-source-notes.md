# 世界書執行合同：交付追溯記錄

2026-10-15。本檔案用於本次交付複核，不是 Skill 日常載入資料，也不是另一套 API 或執行規範。Skill 正文、入口和配套示例不保留本次預設或作品的來源說明；它們使用獨立組織的合同和自寫橋樑夾具。本檔案保留必要來源身份、靜態發現及採用邊界，便於審查遷移沒有丟掉證據。

## 輸入與證據等級

| 輸入 | 確定身份 | 此次用途 |
| --- | --- | --- |
| 珠璣預設 | 上傳檔名 `【珠磯預設化】V1.71 (1).json`；SHA-256 `f7c3a88836bda71f35353d2193d0db0ec0430d1af275d1e9957bdf6930936e4a` | 只作方法線索與去重複核；以《珠璣預設-逐條整合清單-v2.json》的零基 P 索引定位，P 索引不是世界書 UID |
| 斗羅大陸-KK | 上傳檔名 `斗羅大陸-KK (1).json`，來源版本 V3.0 Demo；SHA-256 `d2de21bc259711f984a4163a1f71812ea52460ea1e81e95398dc271ae4f8986d` | JSON 解析及程式碼字串閱讀，提出跨元件待驗問題 |
| 已完成的只讀報告 | 《斗羅大陸-KK-進階世界書配置拆解.md》，2026-10-15 | 複核目標對映、訊息視窗、狀態鏈、投影和預算；報告未作為可執行實現遷入 |

使用者未獲得預設作者許可，本次只允許方法啟發；不得搬入其獨特段落、模板、書摘或程式碼。新增合同按既有 TW 職責重新組織，橋樑、水位、外港、章節與預算資料均為自寫例。這裡的標題、標識和最小目標名稱只用於追溯，不主張第三方材料的許可或所有權，也不構成法律保證。沒有隨補丁附上完整預設、角色卡、原始報告或遠端指令碼。

只讀解析確認源卡內嵌 526 條：26 條啟用，其中 18 條常駐、8 條非恆定；啟用條目中 6 條含 EJS。四個選擇控制器與一項狀態投影提供了靜態研究線索。計數、啟用標記、指令碼存在及結構合理均不是執行證據。本次未匯入酒館、未執行卡內指令碼/模板/正則、未執行遠端依賴、未呼叫模型；真實執行與模型行為仍為 `not-run`。

## E03：從源卡疑問到官方固定原始碼

- `/data/character_book/entries/363`（ID 692109）、`399`（ID 762363）、`417`（ID 796517）包含按角色讀取聊天的呼叫形態：`getChatMessages(-1, 'user')` 與 `getChatMessages(-1, 'assistant')`，後續對返回陣列再取末尾若干項。不能據後續切片或註釋把前面的 API 解釋成“最近三條”。
- 固定模板修訂 `ada54bb22e3dab0a07e473d383b4c2fe40bc6573` 的 [chat.ts L67–112](https://github.com/zonde306/ST-Prompt-Template/blob/ada54bb22e3dab0a07e473d383b4c2fe40bc6573/src/function/chat.ts#L67-L112)在第二引數為角色字串時先過濾角色，再 `slice(-1)`，最後處理文字；單參 `(-1)` 則對全部聊天切片。這隻解釋該模板修訂和這些引數，不解釋助手同名 API，也不證明源卡作者安裝了該修訂。
- 源卡 MVU 載入器位於 `/data/extensions/tavern_helper/scripts/0`（ID `c957f8b2-888a-40f9-b5d8-3204dc1023bf`）；schema 註冊器位於同陣列 `1`（ID `bcf4884f-325c-472e-a05b-1a333297ad26`）。二者使用未固定修訂的遠端依賴。具體框架、註冊器、Zod 版本和成功就緒均未核驗；不把固定官方快照追認成這些載入器的實際版本。
- 舊拆解報告讀取的 API 文件 blob SHA `cca1501847e15c4d609e4e570b5c8f3b40307784` 是檔案標識，不是倉庫提交。本次以可定位的固定原始碼補充窄結論，保留這個區別。

宿主、模板、助手、MVU 的官方來源及許可邊界繼續留在 [E03 版本核驗](../skills/sillytavern-api-reference/references/worldbook-version-verification.md)和 [core-facts](../skills/sillytavern-api-reference/references/core-facts.md)，作為技術核驗資料；它們不攜帶上述作品追溯。E03 的日常例子將角色引數稱為“本例選擇的呼叫形態”，並明確目標宿主尚未實測。

## E05：保留的靜態缺口與通用落點

以下索引均指源卡 `data.character_book.entries` 的零基位置；ID 是該條目的原始標識，只供複核，不用於自寫夾具。

| 位置 | 靜態發現與限制 | 通用合同落點 |
| --- | --- | --- |
| 399 / ID 762363 | 字面目標 `[鬥二]-設定-魂核凝聚規則` 在內嵌條目中無精確同名項；外部書能否補齊未確認 | 缺失、外部待核對與外部已核對分開 |
| 363 / ID 692109 | 地點/勢力路由包含“星斗戰網”等目標，而素材歸於設定類別；不等於素材完全不存在 | 類別、別名、穩定身份和目標位置分別校驗 |
| 113 / ID 232196；初值 119 / ID 237405 | 章節判斷排除“待初始化”，初值章節卻是“未開始”；特殊年表路徑後仍構造另一動態名稱 | 統一初始化哨兵；只允許有效時代/時期/章節組合 |
| 417 / ID 796517 | 人物別名路由與其他選擇器獨立執行，精確名稱展開存在不匹配；不能從文字提及推定實體在場 | 型別化別名、目標列舉和明確狀態優先順序 |

開局寫入位置 `/data/extensions/regex_scripts/13/replaceString`（ID `396330c2-0a28-419c-82e6-c88b071957f3`）只寫時代和章節，未同步時期；寫入失敗分支後呼叫方仍準備傳送/生成。世界書控制器 `/data/extensions/tavern_helper/scripts/2`（ID `5f43d13f-a087-41c0-89ec-da3d70595a2f`）寫 latest message，而開局可能寫當前訊息。靜態結構提示需檢查同一訊息/候選、寫入確認與後續消費，不能直接斷言目標環境已發生錯讀。

另有 UI 指令碼 `/data/extensions/tavern_helper/scripts/4`（ID `598b7be8-3205-48cb-9376-1edfe68b18b9`）使用 `玩家/女性NPC/男性NPC`，主 schema 與初值使用 `主角資訊/NPC列表`。沒有適配證據時，這是跨元件欄位合同缺口；不據此宣稱核心章節 EJS 全部失效。

[E05 目標與狀態合同](../skills/sillytavern-database-rolecards/references/worldbook-target-state-contract.md)用自寫橋樑/外港/章節反例表達這些通用檢查，不攜帶源作品人物、目標名或真實索引/ID。欄位賬本、初始化、遷移和唯一寫入者仍由原有技能負責。

## E06：投影與跨入口預算的邊界

源卡 452 / ID 862183 先讀取狀態並深複製，再對副本摺疊離場模組、輸出模型檢視。`delete` 在該路徑上操作副本，不能稱為刪除底層存檔。其空值判斷將 0/false 視作無實質資料，具體風險是模組已隱藏而摺疊提示也不出現；不能把空值判斷單獨解釋成存檔刪除條件。

四個控制器的區域性別名集合、多個獨立條件和 `ignore_budget=false` 不構成最終請求已統一去重或預算受控的證據。原生入口與模板讀取的交界、最終分詞與必要內容超額仍需實際請求驗證。

[E06 輸出預算](../skills/sillytavern-rolecard-performance/references/worldbook-output-budget.md)採用獨立的內容身份仲裁合同及 `archivedModule` 自寫資料，區分持久狀態與只讀投影，保留 0/false 的語義。沒有移植源卡演算法、條件表或指令碼。

## 預設線索與既有職責複用

下列僅是本組 E03/E05/E06/E07 的必要追溯子集，完整逐條狀態仍以[交付採用表](dual-task-adoption.json)為準。名稱不再寫入日常技能；identifier 與 P 索引用於識別同一輸入，不表示整段內容獲得採用。

| P 索引 | 原始 identifier | 本組處理 |
| --- | --- | --- |
| P058 | `3ceb57f1-8fc2-4620-a767-4f5dec313343` | 資訊選擇線索；E06 獨立定義預算邊界 |
| P059 | `d021d3b4-08cc-4f03-9533-652cda89f10b` | 複用正則處理 owner，不另寫教程 |
| P060 | `a0c7da7d-d719-4ab3-973a-36b0b07b2579` | 複用 API owner；E03 只補核驗鏈 |
| P061 | `64a559d6-1422-4297-9d9b-a17dbe2e8b49` | 僅作可調整、非獨佔場景線索；不搬模板 |
| P062 | `39a6ef9d-f4e4-4c3b-9b8b-87ed2a3209b0` | 複用 runtime-debug；E07 只補隔離合同 |
| P063 | `81c4a3bf-980d-4517-b4af-06e13f12e5fd` | 格式、匯出及 ID 保護複用 owner，預算交 E06 |
| P064 | `399f98bd-0bfb-4e72-881c-0086099f4a6b` | 只取資訊選擇問題，不採用固定位置配方 |
| P065 | `4bf7935c-04a5-4439-9c7a-60a32a8fee29` | 複用 variable-systems §1/5/6 |
| P066 | `97e54e0b-80f5-4c18-8838-1525faae8e2a` | 複用 variable-systems §1/5/6 |
| P067 | `baf12b8d-ba7d-4ea3-89e3-8d3a4efeb171` | 複用 variable-systems §3/4/6 與 API 交付邊界 |
| P068 | `52cf6da7-01e0-45ac-8b89-e567f46ac34a` | 複用 variable-systems §3/4/6 與 API 交付邊界 |
| P088 | `bb9bb9b7-3b3d-4b1a-8eb9-0a23ed3d799d` | 複用 variable-systems §2/3 |
| P089 | `54bb0739-c20b-4937-908c-13a58a02fda2` | 複用 variable-systems §4 |
| P090 | `4c520657-a4b7-460f-95cf-96c1931c4cdc` | 複用 variable-systems §1/5 |
| P091 | `ab3873d5-addb-4c35-bfc7-2930c328e4a4` | 複用 variable-systems §5/8 |
| P092 | `91aaf23e-caa0-4fbc-88c8-79d081dc6a09` | 複用卡型別 §5–8、variable-systems §6/7 |
| P093 | `781cb01d-bc3b-49e5-9a49-3f23414b85f2` | 複用 variable-systems §2–6 |
| P094 | `fb0a625b-afa6-4d27-abd3-f45a48cec61f` | 複用 variable-systems §1/3/6 |
| P095 | `8c14b5b6-e2b2-4d99-b31a-058a0df17fd8` | 複用 variable-systems §4/6 |
| P096 | `4c52e88d-7749-46c7-ad04-004068618beb` | 複用 variable-systems §5/8 |
| P099 | `4b26ee27-58af-458d-a698-7f88f2a40e5e` | 場景獨立改寫，實際函式以目標版本核驗 |
| P143 | `9f0c7363-3af8-4da6-9b12-693157b5a0e8` | 只作世界書輸出問題線索；E06 不搬原格式模板 |

上述章節見 [variable-systems](../skills/tavern-card-builder/references/variable-systems.md)與[卡型別/依賴](../skills/tavern-card-builder/references/card-types-and-runtime-dependencies.md)。本組不採用固定順序、品牌繫結深度、關鍵詞數量配額、六模板獨佔或原生遞迴方案；沒有從 P049–P051 提取內容。

## E07：驗收產物不升級為執行證明

[隔離檢查](../skills/sillytavern-runtime-debug/references/worldbook-isolated-runtime-checks.md)、自寫 JSON 夾具、空白觀察記錄和結構校驗器均不讀取或執行上述原始材料。Node 測試使用合成結構，只能驗證設計規則與記錄邊界。真實宿主、最終請求、狀態回寫、下一輪消費和模型行為仍分別待驗。

`runtimeBlockers` 與 `modelBlockers` 保持獨立：執行組裝透過而模型等待授權是合法記錄；不能刪除模型阻塞以換取結構透過。空白記錄繼續保留 `not-run` 和空觀察值。遷移來源說明未更改這一校驗邏輯。
