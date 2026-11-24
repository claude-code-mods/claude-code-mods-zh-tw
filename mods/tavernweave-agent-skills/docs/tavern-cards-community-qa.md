# Tavern Cards 社群問答教程（供作者審閱）

這份整理稿寫給 [ai4rpg/tavern-cards][repo] 的使用者。問題來自 2026-05-22 到 2026-09-24 聯動帖裡能讀到的討論，約 7,350 條訊息；重複的提問和接連的追問已經合併，閒聊、短期的模型排名和服務商價格沒有寫進教程。

**答案以該倉庫 2026-09-18 的 [e28fb56][snapshot] 快照為準。** 文中沒有拿 Discord 訊息連結當答案，這份文件也還沒有經過作者審定。

## 先對幾個詞

| 原詞 | 大白話 |
| --- | --- |
| Coding Agent | 能讀寫專案檔案、跑命令的 AI 工作客戶端 |
| Skill | Agent 按任務讀取的工作說明 |
| 子代理 | 主 Agent 在特定步驟叫來幫忙的分工助手 |
| forge | 倉庫自帶的離線打包／解包命令列工具 |
| state | forge 的專案登記檔案，比如 `tavern-cards-state.json`，記著專案裡有哪些條目、開場、正則和配置 |
| 世界書 | 滿足條件時，把設定塞進提示詞的條目集合 |
| MVU | 一套讓模型在回覆裡順帶更新變數（好感、地點、進度等）的方案 |
| schema／Zod | 規定變數有哪些欄位、是什麼型別的格式定義 |
| EJS | 一種模板寫法，能按變數決定哪些世界書內容發給模型 |
| 正則 | 按規則找文字並替換，常用來掛狀態列或改顯示效果 |
| 樓層 | 聊天記錄裡的一條訊息 |
| 成品 | forge 打出來、可以匯入酒館的 JSON 或 PNG |

本文說“能匯出”，只表示離線檢查通過了。真的導進 SillyTavern（下稱 ST）玩起來有沒有問題，要另外在你的 ST 裡試。

## 一、先安裝，再完成第一張卡

### Q01. 這是“一句話自動出卡”的軟體嗎？我不會寫程式碼能用嗎？

**A：** 不是一句話就能出卡。它是給 Coding Agent 用的三套 Skill，外加一套離線工具。你負責定目標、給材料、做取捨；Agent 按“討論方向 → 規劃 → 分檔案創作 → 檢查 → 打包”一步步推進。中途可以改需求，也可以自己動手改檔案。

不會寫程式碼也能起步，但要用一個能讀寫本地檔案、能呼叫工具的 Agent，只開一個普通聊天視窗不夠。[倉庫概覽][readme]

### Q02. 三個 Skill 分別做什麼？第一次應該找誰？

**A：** 從零做一張完整的卡，按這個順序：

1. **tavern-design**：討論敘事方向，寫出 `design-spec.md`；
2. **tavern-cards**：建專案，寫 `創作規劃.yaml`、條目和變數，再用 forge 打包；
3. **tavern-ui**：需要複雜的訊息樓層介面時才用。

只改一個開場白或一條世界書條目，直接走 tavern-cards 的區域性任務就行，不用把整套流程重跑一遍。[設計入口][design] · [制卡入口][cards] · [前端入口][ui]

### Q03. 我已經開啟 Agent，安裝時該怎麼說？

**A：** 把 [倉庫地址][repo] 交給 Agent，然後這樣說：

> 請按當前 README 安裝 `tavern-design`、`tavern-cards`、`tavern-ui` 到這個客戶端實際掃描的 Skill 目錄；按需配置 `agents/` 子代理，執行 forge 的 `--help`，列出實際安裝位置、測試結果和未透過項。

另外注意三點：倉庫需要 Node.js；在 Windows 上，文件裡的 bash 命令建議用 Git for Windows 自帶的 Git Bash 來跑；裝三套 Skill 和裝子代理是兩個步驟，要分別完成。[安裝說明][readme]

### Q04. 為什麼檔案放進目錄了，Agent 還是說找不到 Skill？

**A：** 按順序查：

1. 放進去的是不是**當前客戶端會掃描的目錄**；
2. 三個 Skill 的資料夾裡，是不是各有一個 `SKILL.md`；
3. 重啟或重新載入客戶端，開一個新任務，讓 Agent 分別說出它實際讀取的 Skill 入口。

倉庫 README 裡有三條自測提問和 forge `--help` 檢查，可以照著做。要分清三件事：檔案在目錄裡、Agent 看得見、這一輪真的用上了。前一件成立，後一件不一定成立。[安裝自測][readme]

### Q05. Codex、Claude Code、OpenCode、Pi 的安裝檔案能直接互抄嗎？

**A：** 不能原樣照抄。Skill 目錄要放到每個客戶端自己的掃描位置。

倉庫裡的 `agents/*.md`，有些客戶端可以直接複製使用；但 **Codex 的自定義 agent 要先轉換成 TOML**，把這些 Markdown 檔案原樣放進去不算裝好。Pi 還需要裝它的子代理擴充套件。具體路徑和格式，以你正在用的客戶端和當前倉庫 README 為準，裝完實際呼叫一次。[各客戶端安裝差異][readme]

### Q06. 子代理是什麼？必須裝嗎？會自動幫我審稿嗎？

**A：** 子代理是主 Agent 在特定步驟叫來幫忙的分工助手。倉庫裡有四個：

- `conversion-agent`：轉化長篇材料；
- `schema-agent`：設計變數結構；
- `first-message-agent`：寫敘事開場；
- `check-agent`：檢查文字。

它們在什麼時候被呼叫，寫在各個 Skill 的流程裡；審稿要等流程走到 `check-agent` 那一步，不是裝上就隨時自動審。想用它們，先確認你的客戶端支援子代理、已經配置好，用的時候看呼叫記錄。只在檔案裡看到名字，說明不了它執行過。[子代理安裝][readme] · [呼叫點][cards]

### Q07. 工作目錄和 `.cardrc.json` 到底放哪？能只做一張卡嗎？

**A：** 推薦這樣擺：

```text
寫卡工作區/              ← 根目錄
├─ .cardrc.json          ← 從 tavern-cards/assets/cardrc.json 複製過來
└─ cards/
   └─ {專案名}/          ← 每個專案一個資料夾
```

也就是：建一個寫卡工作區根目錄，把 `tavern-cards/assets/cardrc.json` 複製過來，改名為 `.cardrc.json`；每個專案放在 `cards/{專案名}/` 下。

forge 會從當前工作目錄開始，一級一級往上找配置。只做一張卡也可以：已經有獨立 `tavern-cards-state.json` 的臨時專案，能按手冊用 `--state` 直接指定它的路徑。

開工前讓 Agent 說清四個位置：當前目錄、配置檔案、專案 state、成品輸出路徑。把這四個說清楚，能少掉很多“找不到檔案”的問題。[工作區安裝][readme] · [forge 手冊][manual]

### Q08. 安裝好後，給 Agent 的第一句話怎麼寫？

**A：** 可以直接套用：

> 請使用本倉庫的 tavern-design 和 tavern-cards，做一張【題材】角色卡；材料在【路徑】，必須保留【設定】，第一版先實現【最小可玩目標】。先產出 `design-spec.md` 給我看，再建專案；每階段說清生成檔案和我該怎樣試。

還拿不準要不要 MVU、EJS 或前端，就加一句“請根據玩法提出最簡方案並說明代價”，不用先硬選一堆術語。[完整專案流程][cards]

### Q09. 手機端或 ChatGPT 網頁能直接執行這一套嗎？

**A：** 要看環境的能力，普通的手機聊天和 ChatGPT 網頁對話通常達不到。這套流程需要一個能裝 Skill、能讀寫專案檔案、能執行 Node.js 命令的 Coding Agent。手機能玩 ST、能開啟聊天，不說明手機上具備這些製作能力；ChatGPT 的普通對話也代替不了在本地跑 forge。

想換到別的環境裡用，先分別實測三樣：Skill 能不能載入、子代理能不能用、命令列工具能不能跑。[前置條件][readme]

### Q10. DSH 外掛和 GitHub 這三個 Skill 是同一個安裝包嗎？

**A：** 不是，兩邊是分開裝的。GitHub README 的正式安裝步驟，裝的是三套 Skill、`agents/` 和 forge；帖子裡討論的 DSH（DeepSeek Harness）外掛，要按它自己的版本和說明來裝。

所以，裝好了 DSH 外掛，不說明 Coding Agent 已經發現了三個 Skill；反過來，三個 Skill 裝好了，也不能推定外掛已經在 DSH 裡執行。[安裝範圍][readme]

## 二、設計、材料與世界書

### Q11. 從零做卡，第一階段到底要決定什麼？

**A：** 先說清這幾件事：專案定位、世界、核心角色、玩家怎樣互動、創作方向和開場。tavern-design 把確認過的內容寫進 `design-spec.md`，tavern-cards 再把它展開成具體條目的 `創作規劃.yaml`。

別隻在聊天裡說一句“這個設定以後記著”。確認過的決定要寫進專案檔案，任務一長、上下文被壓縮以後，才有東西可查。[敘事設計][design] · [創作規劃][requirements]

### Q12. 只有小說、漫畫、規則書或一堆零散材料，怎麼開始？

**A：** 先交代三點：材料從哪來、允許改編到什麼程度、你最想保留的體驗是什麼。然後按材料型別處理：

- **長篇敘事材料**：tavern-design 會先把它轉成能回頭查的故事大綱，再和你一起補上材料裡沒回答的問題。
- **圖片或漫畫**：模型讀圖得出的內容要逐項核對，不能把它的猜測寫成原作事實。
- **TRPG 規則書**：如果檢定要精確地自動執行，已經超出這個倉庫的通用寫作流程，需要另外設計指令碼和執行方案；敘事層面的規則，可以先規劃成階段指導或世界書條目。

[材料轉化][conversion] · [專案邊界][cards]

### Q13. 純文字卡、MVU、EJS 和前端，第一版該選哪些？

**A：** 按需要一層層加：

1. **純文字卡**：只需要人物、背景和對話規則。
2. **加 MVU**：要跨多條訊息追蹤好感、地點、進度這類狀態。
3. **加 EJS**：要根據狀態切換送給模型的條目。
4. **加 tavern-ui**：需要看得見的複雜互動，最後再考慮。

倉庫建專案時，也是按 MVU、EJS、前端這三層需求分開確認的。另外，獨立世界書不走這個倉庫的 MVU/EJS 路線。[專案屬性][setup]

### Q14. 已經有一張純文字卡，能改成 MVU 卡嗎？

**A：** 能，但不只是加一個狀態列。先把 PNG/JSON 解包成專案，讀清原卡的結構，再確認哪些狀態真的需要持續更新。

遷移要補的東西包括：`schema.ts`、初始變數、更新規則、`state.zod`、相關世界書和正則；還要讓開場和這些內容對得上，並檢查舊聊天還能不能接著用。

如果原卡本來就是舊版 MVU 卡，要不要升級，倉庫流程要求先問使用者、拿到明確的答覆。[已有卡修改][modify] · [MVU 流程][mvu]

### Q15. 世界書的藍燈、綠燈、插入位置和深度，能套一組萬能數字嗎？

**A：** 不能。藍燈是常駐、一直插入的條目，綠燈是關鍵詞命中才插入的條目。先判斷這個條目是一直都需要，還是隻在關鍵詞、階段或位置滿足條件時才需要；再決定 `typeLists`、觸發方式和它在提示詞裡的位置。

forge 的 `configure` 能按專案 state 裡的閾值推算配置，但它不會替你判斷劇情內容。在目標 ST 裡看實際插進去了什麼、試玩效果怎樣，比照抄別人的深度數值靠譜。[專案配置][setup] · [forge 配置][manual]

### Q16. 自定義 NPC、隨機出現的人物或原著劇情怎麼穩定觸發？

**A：** 先分清人物是哪種來源：

- **固定人物**：在規劃裡登記對應的條目。
- **不是事先寫好的人物**（玩家輸入的、執行中臨時生成的）：要寫清楚怎麼生成、怎麼記錄、什麼情況下再次出場，不能只掛一個模糊的關鍵詞。

原著主線如果可能被玩家的選擇繞開，先決定“允許偏離多少”，再設計階段指導、事件條件和把劇情拉回來的線索。

要記住：世界書命中，只保證設定進了提示詞，不保證模型會照著劇情走。[條目型別][entries] · [世界書機制][worldbook]

### Q17. AI 說查出幾十個世界書衝突，我應該全部按建議改嗎？

**A：** 不用全改。先把這些“衝突”分成三種：

- **硬矛盾**：兩處說法不可能同時成立；
- **能共存的差異**：時間或視角不同，放在一起並不衝突；
- **只是措辭相近的重複**。

讓 Agent 指出涉及的兩處檔案，以及對實際遊玩有什麼影響。會動到人物核心設定的建議，由作者拍板。檢查報告只是線索，最後還要在 ST 裡看條目插入和劇情表現；問題數清零了，不等於作品就合格了。[修改與質量修正][revision]

### Q18. 審稿越審越像模板文，甚至把我的人設改跑了，怎麼止損？

**A：** 三步：

1. **先立規矩**：在 `design-spec.md` 和 `創作規劃.yaml` 裡寫下不能改的人物動機、關係和語氣樣例。
2. **只改該改的**：讓 `check-agent` 報出具體原句、問題型別和修改建議，主 Agent 只改確實有問題的地方。修完發現人物寫偏了，就退回原設定，別為了過審繼續改。
3. **該停就停**：重複掃描已經沒有必須修改的地方，就停下來，把改動前後的差異交給作者看。

倉庫有檢查流程，但“無限輪掃描”不是驗收標準。[寫作檢查][rules-check] · [修訂流程][revision]

### Q19. 為什麼同一個模型寫卡時好時壞？換模型就能解決嗎？

**A：** 不一定。模型、材料質量、任務範圍和專案約束都會影響結果。先查三樣：Agent 有沒有讀到已經確認的規劃、有沒有漏掉源材料、是不是一次攬了太多活。然後拿一小段條目，對比不同模型的效果。

通用的模型排名、某天某個套餐的體驗，寫進教程很快就會過時。敘事上的取捨還是要作者自己讀，程式碼和變數還要靠結構校驗和實際執行來確認。[創作流程][cards]

### Q20. 寫卡消耗大量 token，怎麼控制？

**A：** 幾個辦法：

- 把源材料和已確認的設定整理成專案檔案，按章節或條目分批處理；只有長材料才交給 `conversion-agent` 分片。
- 改了哪裡，就只重查受影響的範圍。
- 先做一個能玩的小版本。遇到報錯，把具體檔案、命令、控制檯資訊和復現步驟交給 Agent，別讓它一遍遍“全部重做”。

實際花費隨客戶端、模型、快取和材料量變化，倉庫沒有給出“一張卡要多少 token”的通用數字。[材料分片][conversion] · [斷點續接][resume]

## 三、MVU、EJS 與變數故障

### Q21. 選擇 MVU 後，Skill 會自動把全部指令碼裝進卡里嗎？

**A：** 不會憑一句“要 MVU”就全部裝好。工作流會一步步帶你做：建立三個核心檔案、複製模板、應用 JSON Patch、登記指令碼和正則；`pack` 打包時會檢查關鍵內容。這些步驟不能跳過。

打包前，確認這幾項都已登記：`state.mvu`、MVU 助手指令碼、`state.zod`、`[InitVar]` 條目，以及五條相關正則。[MVU 收尾][mvu] · [打包清單][packaging]

### Q22. `schema.ts`、`initvar.yaml`、`變數更新規則.yaml` 分別幹什麼？

**A：**

| 檔案 | 作用 |
| --- | --- |
| `schema.ts` | 定義有哪些欄位、什麼型別、怎樣校驗 |
| `initvar.yaml` | 新開聊天時的初始值 |
| `變數更新規則.yaml` | 告訴模型在什麼情況下改哪些值 |

順序是：先定 schema，再寫初始值和規則，最後用 `validate-mvu` 檢查初始值，並對照開場、世界書和 EJS 條件看是否一致。

另外，狀態列還得讀對路徑。這三個檔案都通過了，不代表前端已經接上。[MVU 三檔案][mvu]

### Q23. `validate-mvu` 報 `state.zod` 缺失或 `Cannot find module 'zod'` 怎麼辦？

**A：** 分情況處理：

- **`state.zod` 缺失**：查 `mvu-patch.json` 有沒有把 `/zod` 描述符寫進 state，`schemaPath` 是否指向真實存在的檔案。
- **`Cannot find module 'zod'`**：倉庫的校驗工具已經提供了全域性的 `z`／`_`，專案裡的 `schema.ts` 不應該自己 `import zod` 或 `lodash`。按報錯把這些 import 改掉就行，不要為了消掉報錯隨手給專案 `npm install`。
- **欄位名重複**：按報錯給出的行號去掉重複的鍵。

[MVU 排錯][errors] · [forge 手冊][manual]

### Q24. 變數管理器裡有新值，狀態列卻一直顯示舊值，查哪一層？

**A：** 先對照三條路徑，看是不是同一個：

1. 變數實際寫到了哪裡；
2. `schema.ts` 裡定義的路徑；
3. 前端 store 或文字狀態列讀取的路徑。

特別要查：是不是把 `人物.角色名.欄位` 錯寫成了頂層的 `角色名.欄位`。

路徑對上以後，再看當前是哪條訊息樓層、MVU 什麼時候初始化、介面在等哪個重新整理事件。用同一段聊天的變數快照、瀏覽器控制檯和介面顯示來定位，別隻盯著 CSS 改。[MVU 路徑][mvu] · [UI 變數讀取][ui-mvu]

### Q25. EJS 是不是狀態列必需品？它和 MVU 有什麼不同？

**A：** 不是必需品。三樣東西分工不同：

- **MVU**：儲存和更新狀態；
- **EJS**：根據狀態決定哪些世界書內容發給模型，或者在內容裡插入會變的文字；
- **狀態列**：把狀態顯示給玩家看。

它們可以配合著用，也可以只用需要的那部分。倉庫把 EJS 分成三級：整條條目的顯示／隱藏 → 控制條目裡的段落 → 動態文字。先用能表達你玩法的最簡單那一級。[EJS 流程][ejs]

### Q26. EJS 報 `xxx is not defined`，但有時生成又正常，是為什麼？

**A：** 一種原因是：`@@if` 直接用了另一個條目透過 `define()` 註冊的短名。條目在不同階段的處理順序不一樣，用到它的時候，那個短名可能還沒註冊上。

倉庫目前的建議：

- 條件裡直接寫帶預設值的 `getvar('stat_data.路徑', { defaults: 值 })`；
- 需要區域性短名，就在當前條目裡用 `@@private` 加 `const` 定義。

改完以後，分別檢查開啟聊天時和實際生成時是否正常。[EJS 執行時報錯][errors]

### Q27. EJS 報 `Identifier ... has already been declared` 怎麼修？

**A：** 如果條目內容裡用了 `const`／`let`，同一個條目被處理多次時，就可能在模板作用域裡重複宣告。

按倉庫指南，在條目第一行加上 `@@private`，讓區域性變數各管各的、互不衝突；然後在實際 ST 裡重新開啟聊天、重新生成來檢查。[EJS 作用域排錯][errors]

### Q28. `{{user}}` 寫進條目後，解包變成 `.txt`，是檔案壞了嗎？

**A：** 不一定壞了。倉庫說明，ST 宏 `{{user}}` 的雙花括號會讓 YAML 解析出錯，forge 解包時可能改用 `.txt` 儲存。

在這套工程裡寫條目，倉庫推薦用 `<user>` 代表玩家。已有的卡解包後，先核對原文和打包結果；別隻因為字尾變了，就批次重寫內容。[宏約定][cards] · [解包行為][manual]

### Q29. 舊卡的 MVU 不是 Zod 版，能直接用新版 forge 打包嗎？

**A：** 別直接打。先備份，再解包檢查 `mvu`、`state.zod`、變數格式和指令碼。

倉庫有舊 MVU 的遷移路線，但轉換變數值、初始值和更新規則，可能改變存檔的表現，所以要先徵得卡作者同意，並用舊聊天樣本測試。forge 能讀進來，只說明檔案能解析，不等於遷移已經完成。[舊卡遷移][modify]

## 四、狀態列與前端介面

### Q30. 只想顯示幾個數值，為什麼 Agent 要我建 Vue 專案和 CDN？

**A：** 先看 `ui_mode` 選的是哪個：

- **`text`**：文字狀態列，簡單顯示幾個數值用這個。
- **`frontend`**：需要元件和複雜互動才選，並走 tavern-ui。

前端路線要單獨的 `tavern_helper_template` 專案，還要構建、預覽和部署，工作量大得多，不是每張 MVU 卡都要上。[UI 模式][cards] · [文字狀態列][text-ui] · [前端路線][ui]

### Q31. 前端狀態列需要額外下載什麼？樣式只能用固定模板嗎？

**A：** 要下載第三方的 `tavern_helper_template` 作為開發底子，會用到 Vue 3 等工具。但模板只是工程骨架，不限定介面長什麼樣。

做法是：先把角色卡的 `schema.ts` 接進模板，再講清楚配色、佈局、哪些資訊優先、怎樣互動，讓 Agent 按 `design-spec.md` 設計元件。只複製一段 HTML、沒有模板專案和構建流程，通常接不完整。[前端開發][ui] · [介面構思][ui-design]

### Q32. 開場能看到文字，卻沒有狀態列佔位符，為什麼？

**A：** 先看開場檔案的字尾。這套 forge 打包 MVU 卡時，會給 `.txt` 開場白自動追加 `<StatusPlaceHolderImpl/>`（已經有了就跳過）；`.md` 開場白不會自動追加。

然後查最終成品裡的首條訊息、狀態列正則和助手指令碼齊不齊，再開一個新聊天看實際顯示。原始碼裡沒看到佔位符，不代表最終的卡里沒有。[打包規則][manual] · [已有卡開場][modify]

### Q33. 狀態列白屏或讀不到變數，最短排錯順序是什麼？

**A：** 按這個順序一項項查：

1. 變數有沒有更新；
2. 讀取路徑、訊息樓層對不對；
3. `schema.ts` 的兩份副本是否一致；
4. 構建是否成功輸出；
5. 佔位符和正則有沒有掛上；
6. 瀏覽器控制檯有沒有報錯。

Agent 如果能連上瀏覽器除錯工具，可以讓它直接讀目標 ST 的控制檯；連不上，就把報錯原文、成品版本和重現步驟交給它。先找出是哪一層壞了再改程式碼，別一遍遍重寫整個前端。[前端環境][ui-env] · [執行時排錯][ui-runtime]

### Q34. 電腦上正常，手機上狀態列擠成一列怎麼辦？

**A：** 給 Agent 準備這些：同一個介面的電腦和手機截圖、手機上裝著介面的那個框有多寬、哪些內容最重要必須保留。讓它檢查寫死的寬度、換行、滾動和觸控。

介面實際嵌在訊息樓層／iframe（訊息裡的小網頁框）裡，判斷佈局要以這個框為準，而不是整個螢幕。離線預覽調好以後，還要在目標手機的 ST 裡實際開啟、操作一遍。[前端設計][ui] · [執行環境][ui-runtime]

### Q35. 本地預覽好看，就表示 ST 裡能用了嗎？

**A：** 不表示。本地 `pnpm watch` 和網頁預覽，只能證明開發輸出的一部分。在 ST 裡還要驗證：酒館助手、正則佔位符、iframe、MVU 初始化和互動。

釋出前，再拿正式構建和最終打包的卡複測一遍。否則開發伺服器還開著時看到的效果，容易被誤當成離線成品的效果。[本地預覽][ui] · [打包流程][packaging]

### Q36. 前端一定要上 GitHub／CDN 嗎？改了程式碼為什麼別人看不到？

**A：** 不一定要上。倉庫給了三條路：

- **CDN**：遠端載入，方便複用，但多層快取可能讓別人一直看到舊版；
- **自託管**；
- **全量內聯**：程式碼直接放進卡里，但卡里的程式碼體積會變大。

別人看不到更新，先查當前正則載入的是本地開發地址還是正式 URL，再查構建產物、上傳的版本、快取和玩家的瀏覽器。公開推送和部署，要按專案授權來做。[部署與快取][ui]

### Q37. Agent 直接開始畫前端，沒問風格和互動，怎麼補救？

**A：** 先補一小段介面約束：玩家第一眼看什麼、哪些資訊可以摺疊、視覺參考、手機上怎麼排、哪些互動必須保留。然後讓 Agent 更新 `design-spec.md` 裡的 UI 部分。

倉庫的 tavern-ui 規定，遇到雙線敘事、非標準互動、對風格有明確期待或有參考卡的情況，要先做設計構思。已經有介面的，就基於實際截圖和原始碼來改，不用推倒重來。[設計構思][ui-design]

## 五、打包、遷移與驗收

### Q38. forge 工具在哪？怎麼先確認命令能跑？

**A：** 指令碼在已安裝的 `tavern-cards/scripts/tavern-cards-forge.mjs`。

- **先試能不能跑**：在那個 Skill 目錄下執行 `node scripts/tavern-cards-forge.mjs --help`。
- **做真實專案**：從寫卡工作區的根目錄呼叫這個指令碼，並確認 forge 找到的是本專案的 `.cardrc.json`，或者用 `--state` 明確指定。

整理本文時，用當前倉庫快照跑過 `--help`，能列出 `init`、`configure`、`pack`、`unpack`、`validate-mvu`、`export` 等命令。這隻說明倉庫裡的指令碼能跑，不代表你的客戶端裡已經裝好了。[forge 手冊][manual]

### Q39. AI 說“打包完成”，成品在哪？為什麼我找不到？

**A：** 讓它把三樣東西貼出來：本次執行的完整命令、退出結果、成品的**完整絕對路徑**。

forge 決定輸出位置的順序是：先看 `--output`；沒給的話，看 `.cardrc.json` 裡專案的 `artifact`；再沒有，就用 state 同目錄下的預設檔名。格式回退時，字尾也會跟著變。只看到“成功”兩個字，可能會找錯檔案，或者拿到的是上一次的成品。[輸出路徑][manual] · [打包格式][packaging]

### Q40. 為什麼我想要 PNG，結果得到 JSON？

**A：** 有兩種情況會這樣：

- 角色卡專案沒設頭像，本來就輸出 JSON；
- 頭像路徑填了，但圖片不是合法的 PNG，forge 會給出警告，改為輸出 JSON。

查一下 `form`、`avatar`、打包警告和最終路徑。要 PNG，就準備一張合法的 PNG 頭像再重新打包。獨立世界書始終輸出 JSON。[格式規則][manual] · [打包警告][errors]

### Q41. 只有別人給的 PNG／JSON，可以直接修改嗎？

**A：** 先用 `unpack` 解包成專案，把結構、條目和特殊元件給使用者看過，再改內容。

- **普通合併模式**：會盡量保留已有的工程檔案。
- **`--fresh`**：全新解包，不能和 `--state` 一起用。用之前先確認輸出目錄，做好備份。

外部卡的條目可能暫時歸到 `unknown`；只是改改文字的話，不一定要馬上重新分類。[修改外部卡][modify] · [解包選項][manual]

### Q42. 改了檔案，為什麼打包後沒變？`configure`、`patch`、`pack` 分別管什麼？

**A：**

| 命令 | 管什麼 |
| --- | --- |
| `patch` | 修改 state 裡的登記和配置 |
| `configure` | 根據 state 推算缺失的觸發方式、位置等欄位 |
| `pack` | 讀取已登記的檔案，生成 ST 成品 |

改了沒生效，先查兩點：改的檔案有沒有登記在 `entryManifest`、開場或正則裡；當前命令對著的是不是正確的專案。

已有的卡要覆蓋舊設定時，才謹慎使用 `configure --force`。路徑欄位改名可以交給 patch，它會自動重新命名磁碟上的檔案；自己手動挪檔案，反而可能讓 state 對不上。[forge 命令][manual] · [外部卡流程][modify]

### Q43. 打包報“檔案不存在”“非 UTF-8”“重複鍵”，應先做什麼？

**A：** 先把報錯對應到具體的 state 路徑和磁碟檔案，再查：條目有沒有登記、路徑對不對、文字是不是 UTF-8 編碼。重複鍵就按報錯給出的 `schema.ts` 行號去重。

修好這一處，重跑原來的命令。別為了讓報錯消失，刪掉一整類條目或變數。forge 能在離線時先查出這些問題，但代替不了在 ST 裡執行測試。[打包預檢][manual] · [錯誤處理][errors]

### Q44. 讓 Agent 自動把成品導進 ST、自己除錯，能算這個倉庫的預設功能嗎？

**A：** 不能。這個倉庫的 forge 負責離線的專案和成品，README 沒有把“自動操作真實 ST”列進預設交付。

如果你的客戶端另外接了瀏覽器驅動，可以單獨安排測試：固定成品版本、全新匯入、看控制檯和變數、試開場和切換聊天。驅動其實沒接上時，要寫明“沒做實機驗收”。[倉庫範圍][readme]

### Q45. 長任務被壓縮或換了會話，確認過的設定丟了怎麼辦？

**A：** 馬上把已確認的決定寫進 `design-spec.md`、`創作規劃.yaml` 或專案的續接檔案。改條目前先同步規劃；結束時記下當前的 state、成品、已經透過的檢查和下一步。

新會話先讀這些檔案，再從上次的階段接著做。只在聊天裡說一句“我記住了”，保護不了一個長期專案。[規劃同步][cards] · [斷點續接][resume]

### Q46. 什麼時候能說“做完了”？作者還要親自驗什麼？

**A：** 至少分清這五件事，不能拿其中一件代替另一件：

1. 原始檔寫完；
2. forge 離線檢查透過；
3. JSON／PNG 內容核對過；
4. 在目標 ST 裡匯入並玩過；
5. 作者本人認可。

變數卡要檢查：新聊天初始化、幾輪更新、不同開場、狀態列顯示。前端卡還要查窄屏、控制檯和互動。AI 的檢查建議可能誤傷人設，作品認不認可只能由作者決定，自動掃描替不了。[打包清單][packaging] · [修訂流程][revision]

## 六、與 TavernWeave 混搭

### Q47. Tavern Cards 和 TavernWeave 能同時安裝嗎？會互相覆蓋嗎？

**A：** 能同時裝。兩邊的 Skill 名字不一樣，不會同名覆蓋，按各自的 README 裝到同一個客戶端實際掃描的目錄就行。但這只是檔案放在一起，客戶端不一定會自動選對工作流。

開工時直接說明分工，比如：“本專案由 Tavern Cards 的 `design-spec.md`／`創作規劃.yaml`／forge 管主流程，TW 只處理【指定問題】”，並讓 Agent 報告實際用了哪些 Skill。別把兩個倉庫的模板檔案混進同一個說不清來源的目錄。[Tavern Cards 安裝][readme] · [TavernWeave 概覽][tw-readme]

### Q48. 兩邊都有制卡能力，應該讓誰管哪一步？

**A：** 專案用的是 Tavern Cards 的工程，就以它的 state、規劃和 forge 為準，作品內容以這邊的檔案為唯一依據。TW 按需補上更專門的檢查：API 核對、真實 ST 除錯、元件安全、效能或媒體。

要改同一張卡時，先定好誰改原始碼、誰負責打包、誰負責驗收，再讓第二套 Skill 讀取已經做出的決定。這樣兩邊才不會各自重寫同一個欄位。[Tavern Cards 流程][cards] · [TW 能力清單][tw-readme]

### Q49. 混搭後，TW 的檢查通過了，是否表示 Tavern Cards 已經打包成功、可以釋出？

**A：** 不表示。這是幾件不同的事：TW 的離線審查、瀏覽器檢查和真實 ST 測試結果；Tavern Cards 的 forge 輸出；Git 提交和公開發布。

報告裡要寫清楚：查的是哪份原始檔、哪個 JSON／PNG、哪個 ST 版本。如果要對外轉發或二次修改，也要先看對方倉庫 README 裡的許可說明。[打包與許可][readme] · [TW 的檢查與驗收範圍][tw-readme]

## 七、工具與服務邊界

### Q50. Agent 查不到原作資料，是換一個模型 API 就能聯網嗎？

**A：** 不一定。能不能聯網，要看當前的 Coding Agent 手上有沒有能呼叫的搜尋工具，這一輪有沒有呼叫記錄。模型能聊天、倉庫裡有 Skill、Agent 能上網搜，是三件不同的事。

要查資料，就把原檔案交給它，或者在客戶端裡配好它支援的搜尋工具，並逐條核對來源。模型“知道的故事”，不能直接當成查到的原作事實。[材料轉化][conversion]

### Q51. 裝了這些 Skill，模型就會接受所有題材和寫法嗎？

**A：** 不會。Skill 負責組織創作和製作的步驟，改不了模型或服務方的內容規則。

遇到拒答，先分清是題材內容、工具許可權，還是技術錯誤。允許範圍內的世界設定、資料結構、打包和排錯都可以繼續做；別把“裝了 Skill”理解成解除了限制。[倉庫範圍][readme]

## 給作者的校對點

1. [README 安裝自測][readme] 裡寫的是 tavern-design “大方向討論六個維度”，而當前的 [tavern-design Skill][design] 列了七項，第七項是 SFW／NSFW 邊界。建議兩邊統一，免得使用者照新版流程回答，卻被舊的自測文案判成不對。
2. 帖子裡常有人把 DSH 外掛、三套 Skill、子代理、酒館助手模板放在同一句“裝好了”裡。教程裡把這四處的安裝和執行分開檢查，會清楚很多。
3. 讀者反覆報告三類體驗問題：check-agent 一輪輪反覆、角色設定被審稿改偏、前端本地預覽和真實 ST 不一致。本文給了止損和核對辦法；要不要寫進上游 Skill，由作者決定。

## 主要依據

- [倉庫 README 與安裝說明][readme]
- [tavern-design 工作流程][design]、[tavern-cards 工作流程][cards]、[tavern-ui 工作流程][ui]
- [forge 完整命令手冊][manual]、[MVU 流程][mvu]、[EJS 流程][ejs]、[錯誤處理][errors]
- [TavernWeave 的能力與驗收範圍][tw-readme]

[repo]: https://github.com/ai4rpg/tavern-cards
[snapshot]: https://github.com/ai4rpg/tavern-cards/tree/e28fb561f114a4c0636921878c245e5fc181bf33
[readme]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/README.md
[design]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-design/SKILL.md
[cards]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-cards/SKILL.md
[ui]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-ui/SKILL.md
[requirements]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-cards/references/requirements.md
[conversion]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-design/references/conversion.md
[setup]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-cards/references/project-setup.md
[entries]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-cards/references/requirements/entry-types.md
[worldbook]: https://github.com/LiarMTTT/TavernWeave/blob/612c51980549e179bb73ead699aa1c37680db08e/skills/consult-tavernweave-library/references/st-guides/A3_%E4%B8%96%E7%95%8C%E4%B9%A6%E4%BC%98%E5%8C%96.md
[revision]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-cards/references/revision.md
[rules-check]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-cards/references/rules-check.md
[resume]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-cards/references/resume.md
[mvu]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-cards/references/mvu/guide.md
[ejs]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-cards/references/ejs/guide.md
[errors]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-cards/references/error-handling.md
[ui-mvu]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-ui/references/mvu-variables.md
[text-ui]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-cards/references/ui/text.md
[ui-design]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-ui/references/design-thinking.md
[ui-env]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-ui/references/environments/tavern-helper-template.md
[ui-runtime]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-ui/references/environments/tavern-helper-runtime.md
[manual]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-cards/references/manual.md
[packaging]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-cards/references/packaging.md
[modify]: https://github.com/ai4rpg/tavern-cards/blob/e28fb561f114a4c0636921878c245e5fc181bf33/tavern-cards/references/modify-existing.md
[tw-readme]: https://github.com/LiarMTTT/TavernWeave/blob/612c51980549e179bb73ead699aa1c37680db08e/README.md
