---
name: reflect-on-vibe-code-growth
description: Reassess a user's complete Vibe Code capability network from currently available host conversations, workspace, project-state, and delivery evidence; produce both a detailed standalone text assessment form and a seven-part interactive Vibe Code 成長曆程 report; compare only genuinely comparable dimensions with prior immutable mirror records; and optionally save an append-only local history. Use when the user says 照鏡子, 分析我的 Vibe Code 成長曆程, 再次核驗成長, 和上次履歷比較, 儲存照鏡子履歷, 從上一次履歷繼續分析, 只要文字評估, or 匯出文字評估表單. Keep exact measurements, user reports, estimates, behavior-evidence scores, and unverifiable claims separate.
---

# 照鏡子 · Vibe Code 成長曆程

<!-- tw-guidance-entry:begin -->
## Shared communication

Apply [TW plain-language and guidance rules](../consult-tavernweave-library/references/communication-and-guidance.md): explain terms on first use, keep the user-selected 新人/入門/熟練/老手 level, and still explain needed changes and bugs at every level. Soul and prose modes never disable this baseline.
<!-- tw-guidance-entry:end -->

<!-- tw-plugin-runtime-entry:begin -->
## Plugin runtime

When this Skill runs through a plugin, cloud host, or remote machine, read [the plugin execution contract](../consult-tavernweave-library/references/plugin-runtime.md) at entry and apply its host, tool, and persistence checks before host-specific commands. Keep this Skill's scope, authorization, and acceptance gates.
<!-- tw-plugin-runtime-entry:end -->

把當前可用證據整理成一次新的完整能力評估，並在使用者明確要求儲存時追加為不可改寫的本地履歷節點。上一次履歷只是一份歷史證據，不是本次評分錨點、能力上限、固定分母或永久量表。

## 恢復證據邊界

先讀取當前任務可訪問的專案權威、Git/工作樹、交付物、驗證回執和使用者授權的 Codex/Chat 記錄。記錄每個來源的實際觀察視窗與缺口，不虛構不可訪問的時間段。

預設只儲存脫敏摘要、指標、證據引用和判斷，不儲存完整原始聊天、私有日誌、憑據、金鑰、Cookie、會話材料或未脫敏內容。若使用者只要求分析，不要擅自建立本地履歷。

把每條證據明確標成以下一種：

- `exact`：由可復算匯出、檔案、雜湊或機器記錄直接得到；
- `user-reported`：使用者自報，保留原始口徑說明；
- `phase-estimate`：階段估算，寫明假設和誤差；
- `behavioral-evidence-score`：基於行為證據的評分，不冒充精確測量；
- `unverifiable`：當前證據無法核驗。

Chat 沒有統一精確 Token 匯出時，不得用可見字元換算 Token，不得把 Chat 與 Codex Token 直接相加。只有具名官方匯出且口徑一致時才能標為 `exact`。

## 重新評估完整能力網路

每次再次核驗都從當前證據重新評估，不從舊分數向上或向下“續算”。至少審查：

1. 決斷力；
2. 糾錯能力與反應速度；
3. 學習速度與跨域遷移；
4. 駕駛同步率與持續校準；
5. 產品定義與架構；
6. 驗收證據與交付；
7. Token 經濟性；
8. 專案組合與可持續性；
9. 深度思考能力：社會議題、未來展望、現實觀察反饋、專案結構、規劃與技術討論中的問題分層、因果鏈、反例和觀點修正；
10. 上游架構能力：自研架構、理解和運用外部架構、抽象穩定約束、決定下游介面與把架構落成權威或工作流；
11. 創新能力：改造既有專案、複用輪子、最佳化升級、跨域組合、吸收參考素材後形成新結構或新體驗。

不要重複計分：深度思考評價討論過程與現實反饋，不等同於學習速度；上游架構評價能否定義和約束下游，不等同於一般系統理解；創新評價素材的吸收轉化和可驗證改造，不以新奇命名、參考檔案數量或開坑數量代替真實創新。

允許發現新維度、合併或退役舊維度。為每個當前維度儲存穩定的 `dimensionId`、`confidence`、`scoringMethod`、證據引用和當前分數或不可評分原因。評分是當前視窗的行為證據判斷，不是未來能力上限。

對專案完成度分別報告：定義、實現、自動驗證、構建/封裝、人工驗收、釋出/線上回讀。不得以任一前置門冒充後續門。

## 執行再次核驗協議

讀取上一節點前，先執行歷史校驗：

```bash
node <skill-root>/scripts/validate-mirror-record.mjs --root <照鏡子履歷根目錄>
```

若雜湊不符、索引漂移、前序缺失、遊離節點或量表對映不完整，停止連續性結論並報告損壞；不得悄悄從零開始。

比較時遵守：

1. 舊節點保留當時分數、量表和證據視窗，不回寫歷史。
2. 先重新評估當前完整網路，再檢視差異。
3. 審查舊證據是否仍有效、是否需要重驗，但不讓歷史高分鎖死當前判斷。
4. `rubricVersion` 變化時必須提供維度對映。
5. 只有量表、含義和評分方法可比，且前後都有數值評分的維度才計算 `delta`。同維度同量表但任一端未評分時，使用 `unscored`，顯示“同維度，暫無可比數值”，保留當次判斷和不評分依據，不補分或寫成量表變化。
6. 合併、退役或量表變化項標記“量表變化，不直接比較”，不得強算。
7. 報告同時展示歷史軌跡、當前重新評估和可比變化。

結構化履歷遵循 [mirror-record.schema.json](references/mirror-record.schema.json)。

## 生成報告與儲存履歷

預設提供兩種輸出：

1. 先在回覆正文給出一份可獨立閱讀、複製和儲存的完整 Markdown 文字評估表單；
2. 再以 [vibe-code-growth-report.html](assets/vibe-code-growth-report.html) 生成七章互動報告：精簡總表、能力網路、四項核心、Token 經濟、專案達成、歷程、結論。

互動報告沿用“Vibe Code 兩月能力駕駛艙”原始畫板的視覺組織方式：緊湊標題與口徑圖例、輕量章節按鈕、安靜表格、核心—能力簇—維度的層級網、選中節點詳情、橫向分配條、專案完成表、時間線和雙欄結論。不要套用 TavernWeave 新手教程、側欄課程、章節閱讀器或宣傳落地頁外殼。所有核心、能力簇和維度節點都必須是完整命中區域的原生按鈕，支援滑鼠與鍵盤選擇；不得用只有圓形區域性可命中的 SVG 分組偽裝成整顆可點選節點。

兩種輸出必須來自同一份結構化記錄，證據邊界、分數、專案門和結論必須一致。不得只給一組短卡片或一個 HTML 路徑來替代完整文字判斷。

記錄省略 `coreDimensionIds` 時，兩種輸出均採用決斷力、糾錯能力、學習速度和駕駛同步率的既有維度 ID；顯式指定時共同使用該列表。便攜 HTML 重開時重新生成自己的內容區，不能在已有表格後重復追加。能力網選中節點不銷燬按鈕，佈局重繪須保留原節點的鍵盤焦點。

使用者說“只要文字評估”“輸出單份文字評估表單”時，執行 [render-text-assessment.mjs](scripts/render-text-assessment.mjs) 或按同一格式直接輸出一份連續 Markdown；不強制生成畫板，也不要把文字拆成多份附件。使用者只要畫板時可以省略正文長表，但畫板仍要保留檢視、複製和匯出完整文字評估的入口。

文字評估至少包括：結論先行、證據邊界、完整能力網路、四項核心、Token 經濟、專案六道門、成長曆程、歷史可比變化、下一階段建議和最終判斷。每個主要能力都要呈現“當前判斷—證據—限制—下一步”，不能壓縮成只有分數和一句標籤。

互動模板必須由當前記錄資料驅動，不得把任何使用者的具體 Token、評分、專案或首份報告數字寫成預設值。畫板的資訊密度應與文字評估對齊：精簡總表之後仍需保留完整維度表、證據展開、六門專案狀態、歷史對映和行動協議，不能用裝飾性大卡片吞掉實質內容。

報告中的“匯出 HTML”“匯出 JSON”和“匯出文字評估”只產生便攜副本。權威本地儲存必須由指令碼完成：

```bash
node "<skill-root>/scripts/save-mirror-record.mjs" \
  --root "<照鏡子履歷根目錄>" \
  --record "<當前評估草稿.json>" \
  --template "<skill-root>/assets/vibe-code-growth-report.html"
```

指令碼在獨佔鎖內驗證現有鏈，確定性生成單份 `assessment.md`，計算 record/report/assessment SHA-256。完整新節點先寫入事務暫存區，持久記錄前後指標，再發布節點並分別原子替換 `index.json` 與 `latest.json`；兩個指標之間的中斷由同一事務恢復。它拒絕覆蓋既有節點、拒絕敏感欄位、拒絕斷鏈，並在量表變化時驗證對映。舊版節點沒有 `assessment.md` 時仍按原雜湊規則只讀驗證，不得回寫補檔。

遇到未完成事務，停止新儲存並按 [履歷恢復說明](references/history-recovery.md) 執行顯式恢復。恢復只完成已驗證的那次追加，或清理尚未釋出的不完整暫存，不刪除舊節點、不從零重開歷史。活動鎖不允許搶佔；程序異常退出留下的鎖需要核對同機程序狀態與鎖標識。檔案同步和故障測試不等於所有儲存裝置上的斷電保證。

儲存後再次執行校驗指令碼，並返回絕對路徑、record/report/assessment 雜湊和前序關係。不要把 `.private` 履歷、完整對話或使用者具體能力數字加入公開 Skill 原始碼。

## 交付

返回：

1. 當前證據視窗、來源類別和不可核驗缺口；
2. 完整能力網路與四項核心判斷；
3. 分層專案達成、Token 經濟與可持續性；
4. 歷史軌跡、當前重新評估、可比變化和量表變化項；
5. 單份文字評估、互動報告與結構化記錄路徑；
6. 自動驗證、未執行的真實宿主/新任務發現/安裝/人工驗收/提交/釋出門；
7. 下一條明確驗收或再次核驗指令。
