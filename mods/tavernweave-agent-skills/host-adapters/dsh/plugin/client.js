/**
 * 神之手 · 瀏覽器半側（1.1.0）
 *
 * 部件全部掛在 DSH 已宣告的席位上：
 *   - shell.overlay                         ：Skill 輪盤（縮略態）+ 完整浮窗
 *       輪盤擺在左側欄和對話欄之間的空白裡，只露出一個巨大圓盤的一段弧；卡片沿弧線排布，
 *       滾輪 / 方向鍵 / 上下拖動旋轉，技能之後的下一輪是功能入口。呼叫中的 Skill 高亮並轉到中間。
 *       空白不夠寬時整個輪盤不顯示，不壓對話。幾何沿用沙盒 v22.1 定稿。
 *       完整浮窗可拖動、可縮放、不全屏，記住位置、尺寸和上次頁籤；收起後回到輪盤。
 *   - conversation.session.header.utilities ：會話頭的神之手按鈕（宿主原生 Button + Tooltip），開合完整浮窗
 *       旁邊還有一個輪盤開關：顯示/隱藏左側的 Skill 輪盤，狀態存本機；舊儲存沒有這個欄位時按顯示處理
 *   - conversation.input.dock               ：輸入欄上方的 Soul 小浮窗，右對齊，不佔佈局
 *
 * 資料都來自真實宿主：
 *   - Skill 目錄：ctx.remote.skills.list({ sessionId })，隨會話預設變化
 *   - 呼叫狀態與次數：螢幕上會話的事件流。模型呼叫 = tool/call(name=skill)；手動 /名字 = user/message(source.kind=skill-invocation)
 *     “呼叫中”指這次呼叫所在的輪次還沒結束（turn/start … turn/end）
 *   - Soul：傳送 `/activate-tavernweave-soul <TW 指令短語>`；當前模式從本會話最近一條 Soul 指令推斷
 *   - 世界書：ctx.remote.directoryPicker.pick() 選目錄；POST /godhand/worldbook/{select,read,save,versions}
 *     讀寫真實 .json，儲存前由宿主備份；頁面只顯示真實響應，讀/寫失敗直接顯示 code / message。
 *   - 世界書：ctx.remote.directoryPicker.pick() 選目錄；POST /godhand/worldbook/{select,read,save,versions}
 *     讀寫真實 .json，儲存前由宿主備份；頁面只顯示真實響應，讀/寫失敗直接顯示 code / message。
 *   - 持久工作區：GET/POST /godhand/workspace 記住專案/版本/卡檔案/世界書/MVU 選擇；
 *     /godhand/project/scan 遞迴返回版本 relative，自動最新會跳過沒有卡的最高版本；
 *     /godhand/card/{list,read} 列出版本目錄和卡檔案只讀元資訊。
 *     管理浮層可新增/刪除/切換專案、切版本、選卡、自動最新；只在完整浮窗開啟時輪詢。
 *   - 卡內內容：選中 PNG/JSON 卡後 POST /godhand/card/inspect，只讀接上卡內世界書和指令碼元資訊；
 *     不執行卡內 JS，不寫卡檔案/workspace。
 *   - 資料庫：完整浮窗“前端設計＆動效資料庫”頁籤直接顯示 TW Library 離線挑選頁 #design；
 *     openLibrary 遮罩保留給程式化入口。
 */
(() => {
  'use strict';

  const PLUGIN_ID = 'liarmttt-tavernweave-dsh';
  const UI_KEY = 'godhand.ui.v2';
  const SOUL_SKILL = 'activate-tavernweave-soul';
  const SKILL_MIME = 'application/x-godhand-skill';
  const EDGE = 8;
  const FULL_MIN = { w: 440, h: 340 };
  // 輪盤幾何（沙盒 v22.1 定稿）：上 52 / 下 36 留白，卡間隙約為卡高 28%，最大傾角 9°。
  // 空白偏窄時先收窄卡片、再放平弧線（不低於 4°），還放不下就不顯示。
  const WHEEL = {
    topPad: 52, bottomPad: 36, gapRatio: 0.28, minGap: 14, minSlots: 3, maxSlots: 14,
    theta: 9, minTheta: 4, cardMax: 210, cardSoft: 120, cardMin: 104, left: 12, right: 6,
    minW: 132, minH: 300, ease: 0.24,
    // 卡片窄於這個寬度時名字折成兩行（在連字元處斷開），省掉“拖到輸入框插入”那行
    compactBelow: 180,
  };

  const TABS = [
    { id: 'skills', label: '技能' },
    { id: 'worldbook', label: '世界書' },
    { id: 'library', label: '前端設計＆動效資料庫' },
  ];
  // 輪盤裡技能之後的“下一輪”：功能入口，點開對應頁籤
  const FEATURES = [
    { tab: 'worldbook', name: '世界書', desc: '讀寫本機世界書 JSON · 真實檔案' },
  ];
  // 輪盤分組：先 TW 自帶的 23 個 Skill，再功能入口，最後是會話裡其他來源的 Skill
  //（當前是 DSH 自帶的 office / diagnose-windows-sandbox-acl）。
  // TW 的名單按 TavernWeave 2.2.0 的 skills/ 目錄維護；TW 新增 Skill 時這裡要一起加。
  const TW_SKILLS = new Set([
    'activate-tavernweave-soul', 'build-work-library', 'code-quality-workflow',
    'consult-tavernweave-library', 'orchestrate-project-blueprint', 'reflect-on-vibe-code-growth',
    'rewrite-natural-prose', 'rolecard-workshop-ops', 'shadcn-tailwind-ui',
    'sillytavern-api-reference', 'sillytavern-card-components', 'sillytavern-card-pipeline',
    'sillytavern-component-update', 'sillytavern-database-rolecards', 'sillytavern-embedded-ui',
    'sillytavern-extension-dev', 'sillytavern-media-live2d-runtime', 'sillytavern-render-regex-pipeline',
    'sillytavern-rolecard-performance', 'sillytavern-rolecard-security', 'sillytavern-runtime-debug',
    'tavern-card-builder', 'worldbook-design-and-writing',
  ]);
  // Skill 的標籤、卡片短說明和懸停詳情。
  // tag 是功能方向，顯示在輪盤卡片左上角；short 是一行卡片說明；detail 是懸停裡的完整介紹。
  // 名字保持英文，方便在輸入框裡直接呼叫；說明不依賴執行時翻譯。
  const SKILL_META = Object.freeze({
    'activate-tavernweave-soul': {
      tag: '人格模式',
      short: '開啟、切換或關閉四種 Soul 模式',
      detail: '把 Soul 作為當前任務的語氣和教學疊加層開啟、切換或關閉：阿瞳偏溫和引導，MTTT.sir 偏嚴格拷打，靈魂殺手偏直接的前端審查，三席聯席用於有邊界的腦暴。只改表達和審查鏡頭，不擴大檔案、網路、付費或釋出許可權。',
    },
    'build-work-library': {
      tag: '資料庫',
      short: '整理原作、同人與網圖資料',
      detail: '從小說、本地材料、網頁和圖片建立作品資料庫：區分原作、同人、改編、劇透階段和來源，支援人工編輯條目，匯出 Markdown、JSONL 和可選 SQLite。適合二創前收集設定、整理同人資料，或給後續寫卡留下可查的來源鏈。',
    },
    'code-quality-workflow': {
      tag: '質量審查',
      short: '全量/架構審查與最小修復',
      detail: '對軟體、角色卡或混合專案做全量審查或架構審查：記錄覆蓋範圍、保留所有發現、按門控做最小修復並回歸驗證。適合釋出前體檢、重構前評估，或需要把“哪裡有問題、證據是什麼、修了什麼”講清楚時。',
    },
    'consult-tavernweave-library': {
      tag: '指南庫',
      short: '按需查 TW 指南與設計資料',
      detail: '把 TW 工作路由到隨包指南、A0 工程檢查單、設計與動效目錄、概念/來源參考和離線挑選頁；也負責大白話引導擋位的查詢與修改。適合寫檔案前查 A0、做前端時找設計參考，或確認某個 TW 能力該由誰負責。',
    },
    'orchestrate-project-blueprint': {
      tag: '專案藍圖',
      short: '願望 → 總設計案 / 藍圖 / NEXT',
      detail: '把模糊的產品、角色卡、前端或 Vibe Code 願望收束成有邊界的總設計案、First Playable、分級藍圖、可續接的 NEXT 和證據門；也能生成專案進度畫板、記錄反饋和防止長任務遞迴膨脹。適合從零開專案、接手半成品，或需要先定範圍和驗收再動手時。',
    },
    'reflect-on-vibe-code-growth': {
      tag: '成長評估',
      short: '重估 Vibe Code 能力並留履歷',
      detail: '從當前宿主對話、工作區、專案狀態和交付證據重新評估完整的 Vibe Code 能力網路，輸出可獨立複製的文字評估表和七章互動報告；只與真正可比的歷史維度對照，並可儲存脫敏的追加式履歷。適合階段性覆盤、和上次履歷比較，或只想看文字評估時。',
    },
    'rewrite-natural-prose': {
      tag: '文字精修',
      short: '去 AI 味，保留原意與結構',
      detail: '去掉 AI 味、八股、空話和重複結構，保留原意、事實、技術語法與引用；支援單次修改、任務級持續模式和分別授權的工作區/客戶端持久模式。適合角色卡正文、對話、文件、計劃和報告寫得太像模板時。',
    },
    'rolecard-workshop-ops': {
      tag: '工坊運維',
      short: '角色卡工坊釋出鏈與許可權',
      detail: '面向由靜態目錄、包閘道器、物件儲存、OAuth 歸屬、稽核流和反向代理組成的角色卡工坊，做健康檢查、API 合同對齊、釋出/更新/下架流程、隱私審查、CORS 與回撥診斷、容器/代理規劃和明確授權後的部署。預設只讀；沒有明確授權不碰生產、憑據或訪問權。',
    },
    'shadcn-tailwind-ui': {
      tag: '前端 UI',
      short: 'React / shadcn / Tailwind 介面',
      detail: '構建、改造或審閱基於 React、shadcn/ui、Radix 和 Tailwind 的可訪問介面：元件組合、響應式佈局、語義化 token、深淺主題、表單、對話方塊、表格、鍵盤互動和安全配置。適合 React/Vite/Next 專案的產品介面，不適合畫布藝術、海報或非 React 框架。',
    },
    'sillytavern-api-reference': {
      tag: 'API 查證',
      short: 'ST / 助手 / MVU 版本 API',
      detail: '在實現或審查角色卡自動化前，查證 SillyTavern、Tavern Helper / JS-Slash-Runner、STScript、宏、提示詞注入、世界書、EJS、MVU 和執行時庫的確切能力與版本差異。適合不確定函式簽名、事件載荷、斜槓命令語法、變數作用域、樓層操作或擴充套件能力時。',
    },
    'sillytavern-card-components': {
      tag: '拆卡元件',
      short: '拆卡、元件庫與往返一致性',
      detail: '把 ST 角色卡從 JSON 或 PNG 安全拆成可審閱元件，設計或維護 registry 驅動的元件庫與 recipe，追蹤元件依賴和衝突，並做源卡到製品的往返一致性驗證。適合接手別人的卡、模組化維護，或把成熟版本回灌共享元件庫。',
    },
    'sillytavern-card-pipeline': {
      tag: '制卡流水線',
      short: '組裝、JSON/PNG 與釋出門',
      detail: '按專案現有工具編排角色卡的資料驅動開發、即時編輯、校驗、JSON 打包、PNG 載荷嵌入、世界書版本同步和釋出審計；根據改動範圍選擇驗證，並區分檢查點與公開發布。適合從開發到交付的整條制卡流水線。',
    },
    'sillytavern-component-update': {
      tag: '元件更新',
      short: '只改區域性元件，明確交付邊界',
      detail: '當只改角色卡內的正則、Tavern Helper 指令碼/指令碼資料夾或區域性元件時，構建並驗證最小更新，匯出可匯入的元件 JSON，明確“只交元件”還是“交整卡重封”。適合小範圍熱修，避免靜默重打整張卡。',
    },
    'sillytavern-database-rolecards': {
      tag: '卡內資料',
      short: '表結構、樓層儲存與遷移',
      detail: '設計並驗證角色卡里的結構化資料：表 schema、穩定記錄鍵、MVU 訊息樓層儲存、欄位繫結、確定性遷移，以及狀態列/控制中心等消費者。適合卡開始像小型資料庫應用，或需要跨樓層穩定讀寫時；不引入外部 SQL 服務。',
    },
    'sillytavern-embedded-ui': {
      tag: '卡內介面',
      short: '開局頁、狀態列與控制中心',
      detail: '設計、實現或審閱角色卡內的框架無關介面：訊息內容頁、開局頁、MVU 狀態列、控制中心、抽屜和彈窗；處理訊息到頁面的協議、狀態到顯示的對映、HTML/CSS/JS、互動狀態、響應式、無障礙、安全渲染和可選前端沙盒。真實酒館裡的行為驗收交給 runtime-debug。',
    },
    'sillytavern-extension-dev': {
      tag: 'ST 擴充套件',
      short: '擴充套件腳手架、manifest 與生命週期',
      detail: '建立或檢查瀏覽器側 SillyTavern UI 擴充套件：manifest、入口模組、生命週期鉤子、設定名稱空間、能力合同、版本預檢和安裝冒煙計劃，不直接裝進真實酒館。適合從零做擴充套件或審查已有擴充套件的結構。',
    },
    'sillytavern-media-live2d-runtime': {
      tag: '媒體',
      short: '音訊、圖片、影片與 Live2D',
      detail: '為角色卡規劃音訊、圖片、影片、多模態和 Live2D 資產：來源、預載入、繫結、能力檢測、fallback 和生命週期合同，並給出真實宿主驗收計劃。適合需要媒體清單、Tavern Helper 音訊接線或確定性預載入預算時。',
    },
    'sillytavern-render-regex-pipeline': {
      tag: '正則渲染',
      short: 'fixture 驗證正則渲染階段',
      detail: '用確定性 fixture 驗證 SillyTavern 正則行為：規則位置、顯示/提示詞或卡內原始階段、深度、啟用狀態和布林標誌；能對比卡內正則與 Tavern Helper 方言，復現替換，並解釋某條規則在哪個渲染階段被接受或跳過。離線 runner 不等於已安裝酒館引擎的證據。',
    },
    'sillytavern-rolecard-performance': {
      tag: '效能預算',
      short: '大卡體積、提示詞與執行時預算',
      detail: '用確定性的大小、提示詞、世界書、正則、助手指令碼、嵌入媒體和捕獲到的執行時預算來測量、比較和門控大角色卡；給出迴歸基線和最小最佳化方案，不靜默刪掉卡的行為。適合釋出前效能體檢或版本間迴歸比較。',
    },
    'sillytavern-rolecard-security': {
      tag: '安全審查',
      short: '注入、動態執行與遠端載入風險',
      detail: '對角色卡 JSON、嵌入 HTML、正則替換、Tavern Helper 指令碼、載入器和相關原始碼做只讀安全審查：注入、動態執行、遠端程式碼、通配訊息、憑據形狀和許可權風險。適合匯入前/釋出前安全門，或與已批准基線對比；不執行可疑程式碼、不洩露金鑰、不自動改。',
    },
    'sillytavern-runtime-debug': {
      tag: '真機除錯',
      short: '真實酒館復現、取證與驗收',
      detail: '用可用的瀏覽器驅動在真實 SillyTavern 裡復現、診斷和收集執行證據：匯入、必需正則/助手指令碼、宿主擴充套件、Git/CDN 或區域載入器、MVU/Zod、開局頁、狀態列、控制中心、iframe、即時過載、控制檯、響應式和互動。適合靜態預覽證明不了的行為；介面原始碼改動仍交回 embedded-ui。',
    },
    'tavern-card-builder': {
      tag: '卡創作',
      short: '文字 / MVU / 混合卡創作',
      detail: '規劃並創作 SillyTavern 文字卡、MVU Zod 卡和混合卡：識別卡型與依賴，設計角色、玩家檔案與能動性、可選角色階段、世界書、變數、CoT、開場和提示詞路由，維護創作權威與材料來源鏈。適合新卡、接手卡、獨立角色提示詞規則、開場風格診斷和欄位追蹤；獨立世界書、打包、精確 API、真機除錯和嵌入 UI 交給對應專職能力。',
    },
    'worldbook-design-and-writing': {
      tag: '世界書',
      short: '規劃、拆合、審閱與精修世界書',
      detail: '獨立於整卡創作來規劃、拆分、合併、審閱和撰寫 SillyTavern 世界書：場景資訊需求、原生/模板載入、條目正文、條件、例外、知識邊界和配套配置；支援保義改寫和原生/模板/區域性混合選擇。適合只要世界書、改寫條目或核對載入邊界時；人物設計、精確 API、狀態寫入、真機驗收和打包仍歸原負責人。',
    },
    'diagnose-windows-sandbox-acl': {
      tag: '沙箱診斷',
      short: '修復 Windows 沙箱 ACL 拒絕',
      detail: '診斷 Windows 下 DSH 沙箱的 ACL 訪問拒絕：工作區寫入或列目錄失敗，或普通可讀路徑讀不了。用隨包命令檢查路徑和每一級父目錄，並在同一次執行裡修復它證明的 ACL 問題；預期的沙箱攔截不需要修。',
    },
    'office': {
      tag: 'Office',
      short: '建立、檢查或轉換 Office 文件',
      detail: '建立、檢查或轉換 Office 文件、表格、演示和 PDF；按任務選擇合適的辦公工作流，不把不同格式的處理混在一起。適合要生成或核對辦公檔案，但不確定該用 Word、Excel、PPT 還是 PDF 時。',
    },
    'office-docx': {
      tag: 'Word',
      short: '建立、讀取、編輯 Word 文件',
      detail: '建立、讀取、編輯並校驗 Word 文件（.docx），保留標題、段落、表格等結構；完成後用校驗步驟檢查檔案能開啟、內容沒丟。',
    },
    'office-export-pdf': {
      tag: 'PDF',
      short: '把 Office 文件轉換成 PDF',
      detail: '把 Office 文件轉換成你要求的 PDF；用 LibreOffice Kit 渲染/匯出，並核對輸出檔案的分頁、字型和圖片。',
    },
    'office-pptx': {
      tag: 'PPT',
      short: '建立、讀取、編輯 PowerPoint',
      detail: '建立、讀取、編輯並校驗 PowerPoint 演示（.pptx），包括版式、文字和視覺檢查；適合做彙報、提案或需要逐頁核對時。',
    },
    'office-recalculate': {
      tag: '表格重算',
      short: '重新整理公式快取並校驗計算值',
      detail: '重新整理電子表格的公式快取，並用 LibreOffice Kit 校驗計算後的值；適合公式結果過期、跨表引用或需要確認計算結果時。',
    },
    'office-render': {
      tag: '文件渲染',
      short: '把文件渲染成圖片檢查版式',
      detail: '把文件渲染成圖片，檢查視覺版式；適合交付前確認真實排版、分頁、字型和樣式是否和預期一致。',
    },
    'office-xlsx': {
      tag: 'Excel',
      short: '讀取、建立、編輯 Excel 工作簿',
      detail: '讀取、建立、編輯並校驗 Excel 工作簿、資料和公式（.xlsx），包括工作表結構、格式和計算檢查；適合資料整理、報表和公式核對。',
    },
  });

  // 傳送用的短語取自 TW Soul 指令表（skills/activate-tavernweave-soul/SKILL.md）
  const SOULS = [
    { id: 'atong', name: '阿瞳', on: '阿瞳助我！', swap: '阿瞳接手' },
    { id: 'mttt', name: 'MTTT.sir', on: 'MTTT.sir，拷打我！', swap: 'MTTT.sir 上課' },
    { id: 'killer', name: '靈魂殺手', on: '靈魂殺手！', swap: '靈魂殺手接手' },
    { id: 'ensemble', name: '三席聯席', on: 'Soul 三席就位', swap: '三席接手' },
  ];
  const SOUL_OFF = 'Soul 歸位';
  // 與 resolve-soul-command.mjs 相同的規範化與短語表，只用來從會話訊息推斷當前模式
  const SOUL_PHRASES = new Map(Object.entries({
    '阿瞳助我': 'atong', 'mttt.sir,拷打我': 'mttt', '開啟soul模式': 'atong', '/soul on': 'atong',
    '/soul on atong': 'atong', '/soul on mttt-sir': 'mttt', '靈魂殺手': 'killer', '開啟靈魂殺手模式': 'killer',
    '強尼·銀手,接管': 'killer', '強尼,罵醒我': 'killer', '啟動relic故障檢測': 'killer', '/soul on soul-killer': 'killer',
    '腦暴模式,soul聯席': 'ensemble', '三人一起腦暴': 'ensemble', 'soul三席就位': 'ensemble', '/soul on ensemble': 'ensemble',
    '阿瞳接手': 'atong', 'mttt.sir上課': 'mttt', '/soul switch atong': 'atong', '/soul switch mttt-sir': 'mttt',
    '靈魂殺手接手': 'killer', '強尼接手': 'killer', '/soul switch soul-killer': 'killer', '三席接手': 'ensemble',
    '/soul switch ensemble': 'ensemble', 'soul歸位': 'off', '阿瞳歸位': 'off', 'mttt.sir下課': 'off',
    '結束soul模式': 'off', '強尼,下線': 'off', 'relic斷開': 'off', '/soul off': 'off',
  }));

  const G = (window.__GODHAND__ = { version: '1.1.0', loaded: false, applied: false, errors: [], wheel: { reason: 'init' } });
  const fail = (where, error) => {
    const msg = where + ': ' + (error && error.message ? error.message : String(error));
    G.errors.push(msg);
    try { console.warn('[godhand] ' + msg); } catch {}
  };

  /* ---------------- 純函式 ---------------- */

  function normalizeSoul(input) {
    const n = String(input).normalize('NFKC').trim().replace(/[！!。.]$/u, '').replace(/[，、]/gu, ',')
      .replace(/\s+/gu, ' ').replace(/\s*,\s*/gu, ',').toLowerCase();
    return n.startsWith('/') ? n : n.replace(/\s+/gu, '');
  }
  function soulFromText(text) {
    let t = String(text || '').trim();
    const prefix = '/' + SOUL_SKILL;
    if (t.startsWith(prefix)) t = t.slice(prefix.length).trim();
    if (!t || t.length > 40) return null;
    const n = normalizeSoul(t);
    if (SOUL_PHRASES.has(n)) return SOUL_PHRASES.get(n);
    if (/^(靈魂殺手|開啟靈魂殺手模式),/u.test(n)) return 'killer';
    return null;
  }
  function textOf(content) {
    if (!Array.isArray(content)) return '';
    return content.map((c) => (c && c.type === 'text' && typeof c.text === 'string' ? c.text : '')).join('');
  }
  function skillArg(args) {
    if (args && typeof args === 'object') return typeof args.name === 'string' ? args.name : null;
    if (typeof args !== 'string') return null;
    try {
      const v = JSON.parse(args);
      if (v && typeof v.name === 'string') return v.name;
    } catch {}
    const m = /"name"\s*:\s*"([^"]+)"/u.exec(args);
    return m ? m[1] : null;
  }
  function newAcc() {
    return { seen: new Set(), calls: [], counts: Object.create(null), inUse: Object.create(null), openTurn: null, soul: 'off', presetChanged: false };
  }
  function addCall(acc, name, source, ev) {
    const key = ev.seq !== undefined ? ev.seq : ev.time + ':' + name;
    if (acc.seen.has(key)) return false;
    acc.seen.add(key);
    acc.calls.push({ name, source, seq: ev.seq, time: ev.time });
    acc.counts[name] = (acc.counts[name] || 0) + 1;
    if (acc.openTurn !== null) acc.inUse[name] = { since: ev.time };
    return true;
  }
  /** 把一條會話事件摺疊進累加器；返回是否改變了可見狀態。 */
  function applyEntry(acc, entry) {
    const ev = entry && entry.event ? entry.event : entry;
    if (!ev || typeof ev.type !== 'string') return false;
    const data = ev.data || {};
    switch (ev.type) {
      case 'turn/start':
        acc.openTurn = data.turn !== undefined ? data.turn : true;
        acc.inUse = Object.create(null);
        return true;
      case 'turn/end':
        acc.openTurn = null;
        acc.inUse = Object.create(null);
        return true;
      case 'tool/call': {
        if (data.name !== 'skill') return false;
        const name = skillArg(data.arguments);
        return name ? addCall(acc, name, 'model', ev) : false;
      }
      case 'user/message': {
        const src = data.source || {};
        if (src.kind === 'skill-invocation' && typeof src.name === 'string') return addCall(acc, src.name, 'user', ev);
        if (src.kind === 'user') {
          const mode = soulFromText(textOf(data.content));
          if (mode) { acc.soul = mode; return true; }
        }
        return false;
      }
      case 'agent-preset/selected':
        acc.presetChanged = true;
        return true;
      default:
        return false;
    }
  }
  function ago(time, now) {
    if (!Number.isFinite(time)) return '';
    const s = Math.max(0, Math.round((now - time) / 1000));
    if (s < 45) return '剛剛';
    const m = Math.round(s / 60);
    if (m < 60) return m + ' 分鐘前';
    const hr = Math.round(m / 60);
    if (hr < 24) return hr + ' 小時前';
    const d = new Date(time);
    return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  }
  function clock(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  /** 相鄰兩個槽位的卡片外框最多重疊多少畫素（負數表示有間隙）。 */
  function slotOverlap(g) {
    const mid = (g.slots - 1) / 2;
    const half = (a) => (g.cardH * Math.cos(a) + g.cardW * Math.abs(Math.sin(a))) / 2;
    let worst = -Infinity;
    for (let k = 0; k < g.slots - 1; k++) worst = Math.max(worst, half((k - mid) * g.step) + half((k + 1 - mid) * g.step) - g.spacing);
    return worst;
  }
  /**
   * 輪盤幾何。W/H 是可用空白，cardH 是量出來的卡片高度。
   * 卡片中心落在圓心 (X0 - R, Cy)、半徑 R 的圓上，中間槽位最靠右，兩端各傾斜 theta。
   * 返回 null 表示放不下。
   */
  function wheelGeometry(W, H, cardH) {
    if (!(W >= WHEEL.minW) || !(H >= WHEEL.minH) || !(cardH > 0)) return null;
    const deg = Math.PI / 180;
    const av = Math.max(120, H - WHEEL.topPad - WHEEL.bottomPad);
    const gap = Math.max(WHEEL.minGap, Math.round(cardH * WHEEL.gapRatio));
    const margins = WHEEL.left + WHEEL.right;
    const build = (slots) => {
      const spacing = slots > 1 ? (av - cardH) / (slots - 1) : 0;
      const halfSpan = spacing * (slots - 1) / 2;
      const shiftFor = (t) => halfSpan * Math.tan(t / 2);
      let theta = WHEEL.theta * deg;
      let cardW = Math.min(WHEEL.cardMax, W - margins - shiftFor(theta));
      if (cardW < WHEEL.cardSoft) {
        const room = W - margins - WHEEL.cardSoft;
        theta = Math.min(WHEEL.theta * deg, Math.max(WHEEL.minTheta * deg, 2 * Math.atan(Math.max(0, room) / Math.max(1, halfSpan))));
        cardW = Math.min(WHEEL.cardMax, W - margins - shiftFor(theta));
      }
      cardW = Math.floor(cardW);
      const shift = shiftFor(theta);
      const step = slots > 1 ? (2 * theta) / (slots - 1) : 0;
      const R = halfSpan > 0 ? halfSpan / Math.sin(theta) : 4000;
      const X0 = cardW / 2 + WHEEL.left + shift;
      return {
        slots, spacing, halfSpan, theta, step, R, X0, Cy: WHEEL.topPad + av / 2, cardW, cardH, shift, av,
        width: Math.min(W, Math.ceil(cardW + WHEEL.left + shift + WHEEL.right + 2)),
      };
    };
    let g = build(Math.max(WHEEL.minSlots, Math.min(WHEEL.maxSlots, Math.round(av / (cardH + gap)))));
    while (g.slots > WHEEL.minSlots && slotOverlap(g) > 20) g = build(g.slots - 1);
    return g.cardW >= WHEEL.cardMin && slotOverlap(g) <= 20 ? g : null;
  }
  /**
   * 圓心 (cx, cy)、半徑 r 的圓在輪盤區高度 h 內的右側弧線（SVG 路徑）。
   * 不用超大的 CSS 圓角邊框畫圓：放進輪盤後它會被畫扁（實測最外側偏 15px），虛線就不再穿過卡片中心。
   */
  function ringPath(cx, cy, r, h) {
    if (!(r > 0)) return '';
    const y1 = Math.max(cy - r + 0.5, -20);
    const y2 = Math.min(cy + r - 0.5, h + 20);
    if (y2 <= y1) return '';
    const x = (y) => cx + Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    return 'M' + x(y1).toFixed(2) + ' ' + y1.toFixed(2) + 'A' + r.toFixed(2) + ' ' + r.toFixed(2) + ' 0 0 1 ' + x(y2).toFixed(2) + ' ' + y2.toFixed(2);
  }
  G.lib = { applyEntry, newAcc, soulFromText, skillArg, wheelGeometry, slotOverlap, ringPath };

  /* ---------------- 幾何（C13：明確畫素座標，夾在可視區內） ---------------- */

  function frameTop() {
    try {
      const cs = getComputedStyle(document.documentElement);
      for (const name of ['--dsh-frame-overlay-top', '--dsh-frame-top-clearance', '--dsh-frame-chrome-top']) {
        const v = parseFloat(cs.getPropertyValue(name));
        if (Number.isFinite(v) && v > 0) return v;
      }
    } catch {}
    return 0;
  }
  function viewport() {
    const top = frameTop();
    return { x: 0, y: top, w: window.innerWidth, h: Math.max(1, window.innerHeight - top) };
  }
  function clampFull(r) {
    const v = viewport();
    const availW = Math.max(1, v.w - EDGE * 2);
    const availH = Math.max(1, v.h - EDGE * 2);
    const w = Math.min(Math.max(r.w, Math.min(FULL_MIN.w, availW)), availW);
    const hh = Math.min(Math.max(r.h, Math.min(FULL_MIN.h, availH)), availH);
    const x = Math.min(Math.max(r.x, v.x + EDGE), v.x + v.w - w - EDGE);
    const y = Math.min(Math.max(r.y, v.y + EDGE), v.y + v.h - hh - EDGE);
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hh) };
  }
  function defaultFull() {
    const v = viewport();
    const w = Math.min(760, v.w - 96);
    const hh = Math.min(560, v.h - 96);
    // 第一次開啟時儘量放在輪盤右邊，兩者都看得見
    let x = (v.w - w) / 2;
    const wheelRight = G.wheel.zoneRight;
    if (Number.isFinite(wheelRight) && wheelRight + 12 > x && wheelRight + 12 + w <= v.w - EDGE) x = wheelRight + 12;
    return clampFull({ x, y: v.y + (v.h - hh) / 2, w, h: hh });
  }
  function placeElement(el, r) {
    el.style.left = r.x + 'px';
    el.style.top = r.y + 'px';
    if (r.w !== undefined) el.style.width = r.w + 'px';
    if (r.h !== undefined) el.style.height = r.h + 'px';
  }
  /** 統一的拖動/縮放：pointer capture，rAF 更新樣式，鬆手才提交儲存。 */
  function beginDrag(e, ref, compute, commit) {
    if (e.button !== 0) return;
    const handle = e.currentTarget;
    const isGrip = handle.classList.contains('gh2-grip');
    if (!isGrip && e.target.closest && e.target.closest('button, input, textarea, select, a, [role="tab"]')) return;
    const el = ref.current;
    if (!el) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let next = null;
    let raf = 0;
    try { handle.setPointerCapture(e.pointerId); } catch {}
    el.classList.add('gh2-busy');
    e.preventDefault();
    const move = (ev) => {
      next = compute(ev.clientX - sx, ev.clientY - sy);
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (next) placeElement(el, next); });
    };
    const end = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      if (raf) cancelAnimationFrame(raf);
      el.classList.remove('gh2-busy');
      if (next) { placeElement(el, next); commit(next); }
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  /* ---------------- 本機記憶（只存介面狀態） ---------------- */

  function readUi() {
    try {
      const raw = JSON.parse(localStorage.getItem(UI_KEY) || 'null');
      if (!raw || raw.version !== 2) return null;
      const f = raw.full;
      const migratedTab = raw.tab === 'design' || raw.tab === 'motion' ? 'library' : raw.tab;
      return {
        // 0.2.0 的“關閉”狀態已取消：縮略態就是輪盤
        mode: raw.mode === 'full' ? 'full' : 'compact',
        tab: TABS.some((t) => t.id === migratedTab) ? migratedTab : 'skills',
        full: f && ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(f[k])) ? f : null,
        wheel: Number.isFinite(raw.wheel) && raw.wheel >= 0 ? Math.floor(raw.wheel) : 0,
        // 輪盤顯示/隱藏：只有明確存了 false 才算隱藏，舊儲存沒有這個欄位時照舊顯示。
        wheelOn: raw.wheelOn !== false,
      };
    } catch {
      return null;
    }
  }
  function writeUi(ui) {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify({ version: 2, mode: ui.mode, tab: ui.tab, full: ui.full, wheel: ui.wheel, wheelOn: ui.wheelOn !== false }));
    } catch {}
  }

  /* ---------------- 共享狀態 ---------------- */

  function createStore(initial) {
    let state = initial;
    const listeners = new Set();
    return {
      get: () => state,
      set(patch) {
        const next = typeof patch === 'function' ? patch(state) : patch;
        if (!next) return;
        state = { ...state, ...next };
        for (const fn of [...listeners]) { try { fn(); } catch (error) { fail('listener', error); } }
      },
      subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    };
  }
  const EMPTY_ACTIVITY = Object.freeze({
    ready: false, calls: [], counts: {}, inUse: {}, openTurn: null, soul: 'off', total: 0, hasMore: false, running: false,
  });

  /* ---------------- M5：資料庫 / 真實世界書狀態切面 ---------------- */

  const M5 = Object.freeze({
    libPage: '/godhand/library/assets/picker/index.html',
    libTitles: Object.freeze({ design: '資料庫 · 設計篩選頁', motion: '資料庫 · 動效篩選頁' }),
    api: Object.freeze({
      select: '/godhand/worldbook/select',
      read: '/godhand/worldbook/read',
      save: '/godhand/worldbook/save',
      versions: '/godhand/worldbook/versions',
      mvuSelect: '/godhand/mvu/select',
      mvuInspect: '/godhand/mvu/inspect',
    }),
  });
  // 世界書頁的真實狀態：目錄、檔案、讀到的 JSON、編輯草稿、錯誤和版本。
  // raw 是上一次從磁碟讀到（或剛儲存成功）的完整 JSON；entries 是它的可編輯副本。
  const EMPTY_WB = Object.freeze({
    root: '', rootInput: '',
    files: [], filesState: 'idle', folderError: '', picking: false,
    selectedPath: '', loadingFile: false, kind: '', entries: [], raw: null, openIndex: -1,
    dirty: false, saving: false, error: '', pendingUnknown: false,
    saveNotice: '', backup: '',
    versions: [], versionsError: '', versionsState: 'idle', versionsAt: 0,
  });
  function freshWb() { return { ...EMPTY_WB, files: [], entries: [], versions: [] }; }
  // MVU 元件區：只讀選目錄、選指令碼、靜態解析結果。不是執行時 Zod 校驗，也沒有 PASS/FAIL。
  const EMPTY_MVU = Object.freeze({
    root: '', rootInput: '', files: [], filesState: 'idle', folderError: '', picking: false,
    selectedPath: '', loadingFile: false, file: null, meta: null, schema: null, reason: '',
    warnings: [], error: '', inspectedAt: 0,
  });
  function freshMvu() { return { ...EMPTY_MVU, files: [], warnings: [] }; }

  /* ---------------- M5：持久工作區 / 專案 / 卡目錄狀態 ---------------- */

  const WORKSPACE_KEY = 'godhand.workspace.v1';
  const WORKSPACE_ROUTES = Object.freeze({
    state: '/godhand/workspace',
    scan: '/godhand/project/scan',
    cardList: '/godhand/card/list',
    cardRead: '/godhand/card/read',
    cardInspect: '/godhand/card/inspect',
  });
  function workspaceString(value) { return typeof value === 'string' ? value : ''; }
  function normalizeProject(raw, index) {
    if (!raw || typeof raw !== 'object') return null;
    const root = workspaceString(raw.root);
    if (!root) return null;
    return {
      id: workspaceString(raw.id) || 'p-snapshot-' + index,
      root,
      label: workspaceString(raw.label) || basename(root),
      lastVersionDir: workspaceString(raw.lastVersionDir),
      lastCardPath: workspaceString(raw.lastCardPath),
      lastWorldbookRoot: workspaceString(raw.lastWorldbookRoot),
      lastWorldbookPath: workspaceString(raw.lastWorldbookPath),
      lastMvuRoot: workspaceString(raw.lastMvuRoot),
      lastMvuPath: workspaceString(raw.lastMvuPath),
      lastUsed: workspaceString(raw.lastUsed),
    };
  }
  function normalizeWorkspaceState(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const projects = (Array.isArray(source.projects) ? source.projects : []).map(normalizeProject).filter(Boolean);
    let activeProjectId = workspaceString(source.activeProjectId);
    if (!projects.some((project) => project.id === activeProjectId)) activeProjectId = projects.length ? projects[0].id : '';
    const fileState = (value) => ({ root: workspaceString(value && value.root), file: workspaceString(value && value.file) });
    return {
      version: Number(source.version) || 1,
      projects,
      activeProjectId,
      autoLatest: typeof source.autoLatest === 'boolean' ? source.autoLatest : true,
      worldbook: fileState(source.worldbook),
      mvu: fileState(source.mvu),
      ui: fileState(source.ui),
    };
  }
  function readWorkspaceSnapshot() {
    try {
      const raw = JSON.parse(localStorage.getItem(WORKSPACE_KEY) || 'null');
      return raw && typeof raw === 'object' ? normalizeWorkspaceState(raw) : null;
    } catch {
      return null;
    }
  }
  const EMPTY_WS = Object.freeze({
    loaded: false, hostAvailable: false, hostError: '', statePath: '', savedAt: '',
    projects: [], activeProjectId: '', autoLatest: true,
    rootInput: '', picking: false, addError: '',
    versions: [], versionsRoot: '', versionsLatest: '', scanBusy: false, scanError: '',
    cards: [], cardsRoot: '', cardsLatest: '', cardsBusy: false, cardError: '',
    cardMeta: {}, cardReadErrors: {}, activeCard: null,
    cardDetail: null, cardInspectBusy: false, cardInspectError: '',
    legacyFocus: 0, legacyTab: 'structure', varWork: null,
    managerOpen: false, busy: false, restoreNotice: '', cardMissing: '', newAvailable: null,
    persistError: '', restoring: false,
  });
  function freshWs() { return { ...EMPTY_WS, projects: [], versions: [], cards: [], cardMeta: {}, cardReadErrors: {} }; }
  const workspaceSnapshot = readWorkspaceSnapshot();
  // 資料庫遮罩：open 才渲染；status 為 loading / ready / error，絕不把失敗畫成空白 iframe。
  const EMPTY_LIB = Object.freeze({ open: false, tab: 'design', title: '', status: 'idle', url: '', error: '' });
  function freshLib() { return { ...EMPTY_LIB }; }

  const store = createStore({
    ui: readUi() || { mode: 'compact', tab: 'skills', full: null, wheel: 0, wheelOn: true },
    sessionId: undefined,
    catalog: { sessionId: undefined, state: 'none', skills: [], error: '' },
    activity: EMPTY_ACTIVITY,
    wb: freshWb(),
    mvu: freshMvu(),
    ws: workspaceSnapshot ? {
      ...freshWs(),
      projects: workspaceSnapshot.projects,
      activeProjectId: workspaceSnapshot.activeProjectId,
      autoLatest: workspaceSnapshot.autoLatest,
    } : freshWs(),
    lib: freshLib(),
    toast: null,
    focus: null,
    drop: null,
  });
  function setUi(patch) {
    store.set((s) => ({ ui: { ...s.ui, ...patch } }));
    writeUi(store.get().ui);
  }
  function setWb(patch) { store.set((s) => ({ wb: { ...s.wb, ...patch } })); }
  function setMvu(patch) { store.set((s) => ({ mvu: { ...s.mvu, ...patch } })); }
  function setWs(patch) { store.set((s) => ({ ws: { ...s.ws, ...patch } })); }
  function setLib(patch) { store.set((s) => ({ lib: { ...s.lib, ...patch } })); }
  let toastSeq = 0;
  function toast(text) {
    const id = ++toastSeq;
    store.set({ toast: { id, text } });
    setTimeout(() => { const t = store.get().toast; if (t && t.id === id) store.set({ toast: null }); }, 2600);
  }

  /* ---------------- 跟隨螢幕上的會話 ---------------- */

  let ctxRef = null;
  let tracked = null;
  const inputRegistry = new Map();

  function untrack() {
    if (!tracked) return;
    clearTimeout(tracked.retry);
    clearInterval(tracked.poll);
    for (const off of tracked.offs) { try { off(); } catch {} }
    tracked = null;
  }
  function track(sid) {
    if (tracked && tracked.sid === sid) return;
    untrack();
    store.set({
      sessionId: sid,
      activity: EMPTY_ACTIVITY,
      catalog: { sessionId: sid, state: sid ? 'loading' : 'none', skills: [], error: '' },
    });
    if (!sid) return;
    tracked = { sid, offs: [], retry: 0, poll: 0 };
    attach(sid, 0);
  }
  function bindingOf(sid) {
    try { return sid ? ctxRef.sessions.binding(sid) : undefined; } catch { return undefined; }
  }
  function isOpen(binding) {
    try { return binding.session.getSnapshot().openState === 'open'; } catch { return false; }
  }
  function attach(sid, attempt) {
    if (!tracked || tracked.sid !== sid) return;
    const binding = bindingOf(sid);
    const ready = binding && binding.eventSource && typeof binding.eventSource.subscribe === 'function' && binding.session;
    if (!ready || !isOpen(binding)) {
      if (attempt < 30) tracked.retry = setTimeout(() => attach(sid, attempt + 1), 400);
      else store.set({ catalog: { sessionId: sid, state: 'error', skills: [], error: '會話沒有開啟' } });
      return;
    }
    const es = binding.eventSource;
    const running = () => { try { return !!binding.session.getSnapshot().running; } catch { return false; } };
    let acc = newAcc();
    const publish = () => {
      if (!tracked || tracked.sid !== sid) return;
      const snap = es.getSnapshot();
      store.set({
        activity: {
          ready: true,
          calls: acc.calls.slice(-40),
          counts: { ...acc.counts },
          inUse: { ...acc.inUse },
          openTurn: acc.openTurn,
          soul: acc.soul,
          total: acc.calls.length,
          hasMore: !!(snap && snap.hasMore),
          running: running(),
        },
      });
    };
    const rescan = () => {
      acc = newAcc();
      const snap = es.getSnapshot();
      for (const entry of (snap && snap.entries) || []) applyEntry(acc, entry);
      acc.presetChanged = false;
      publish();
    };
    tracked.offs.push(es.subscribe(() => {
      const snap = es.getSnapshot();
      const change = snap && snap.change;
      if (change && change.kind === 'append') {
        let dirty = false;
        for (const entry of change.entries || []) dirty = applyEntry(acc, entry) || dirty;
        if (acc.presetChanged) { acc.presetChanged = false; loadCatalog(sid); }
        if (dirty) publish();
      } else {
        rescan();
      }
    }));
    rescan();
    let lastRunning = running();
    const onSession = () => { const r = running(); if (r !== lastRunning) { lastRunning = r; publish(); } };
    if (typeof binding.session.subscribe === 'function') tracked.offs.push(binding.session.subscribe(onSession));
    else tracked.poll = setInterval(onSession, 1000);
    loadCatalog(sid);
  }
  async function loadCatalog(sid) {
    store.set((s) => ({
      catalog: { sessionId: sid, state: 'loading', skills: s.catalog.sessionId === sid ? s.catalog.skills : [], error: '' },
    }));
    try {
      const result = await ctxRef.remote.skills.list({ sessionId: sid });
      if (store.get().sessionId !== sid) return;
      if (!result || !result.ok) {
        const e = result && result.error;
        throw new Error(e ? e.code + '：' + e.message : '讀取失敗');
      }
      const skills = ((result.value && result.value.skills) || []).map((k) => {
        const name = String(k.name);
        const meta = SKILL_META[name];
        return {
          name,
          description: String(k.description || ''),
          tag: meta ? meta.tag : '其他',
          zh: meta ? meta.short : '',
          detail: meta ? meta.detail : '',
          tw: TW_SKILLS.has(name),
        };
      });
      store.set({ catalog: { sessionId: sid, state: 'ready', skills, error: '' } });
    } catch (error) {
      if (store.get().sessionId !== sid) return;
      fail('catalog', error);
      store.set({ catalog: { sessionId: sid, state: 'error', skills: [], error: String(error && error.message || error) } });
    }
  }

  /* ---------------- 動作 ---------------- */

  function composerEditable() {
    const els = [...document.querySelectorAll('[contenteditable="true"]')].filter((el) => {
      if (el.closest('.gh2-root')) return false;
      const r = el.getBoundingClientRect();
      return r.width > 40 && r.height > 8;
    });
    els.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
    return els[0] || null;
  }
  /** 輸入框外面那張圓角卡片（拖放的落點）。 */
  function composerCard() {
    const ed = composerEditable();
    for (let el = ed, i = 0; el && el !== document.body && i < 10; el = el.parentElement, i++) {
      if (el.getBoundingClientRect().width >= 240 && parseFloat(getComputedStyle(el).borderTopLeftRadius) >= 12) return el;
    }
    return ed;
  }
  /** 把 `/名字 ` 插到當前會話輸入框的游標處；不覆蓋已經寫好的草稿。 */
  function insertSkill(name) {
    const sid = store.get().sessionId;
    const text = '/' + name + ' ';
    const actions = sid ? inputRegistry.get(sid) : undefined;
    if (actions && typeof actions.captureInsertion === 'function' && typeof actions.insertText === 'function') {
      try {
        if (actions.insertText(text, actions.captureInsertion()) !== false) {
          const el = composerEditable();
          if (el) { try { el.focus({ preventScroll: true }); } catch {} }
          toast('已插入 /' + name);
          return 'input-actions';
        }
      } catch (error) {
        fail('insert', error);
      }
    }
    const el = composerEditable();
    if (el) {
      el.focus();
      if (document.execCommand('insertText', false, text)) { toast('已插入 /' + name); return 'dom'; }
    }
    toast('沒有找到輸入框');
    return null;
  }
  let focusSeq = 0;
  /** 開啟完整浮窗的 Skill 頁籤，並展開這一項。 */
  function openSkill(name) {
    store.set({ focus: { name, seq: ++focusSeq } });
    setUi({ mode: 'full', tab: 'skills' });
  }
  function openTab(tab) {
    setUi({ mode: 'full', tab });
  }
  /** 執行 Skill：把 `/名字` 發給當前會話，和使用者在輸入框裡按回車是同一條路徑。 */
  async function runSkill(name) {
    const s = store.get();
    const binding = bindingOf(s.sessionId);
    if (!binding) { toast('先開啟一個會話'); return { ok: false, error: 'no-session' }; }
    if (s.activity.inUse[name]) return { ok: true, skipped: true };
    try {
      const result = await binding.session.prompt([{ type: 'text', text: '/' + name }], 'queue');
      if (result && result.ok === false) {
        const code = result.error && result.error.code;
        toast('傳送失敗' + (code ? '：' + code : ''));
        return { ok: false, error: code || 'failed' };
      }
      toast('已傳送 /' + name);
      return { ok: true, name };
    } catch (error) {
      fail('run', error);
      toast('傳送失敗');
      return { ok: false, error: String(error && error.message || error) };
    }
  }
  /** Soul 切換：發一條 `/activate-tavernweave-soul <短語>`，由 TW Soul 自己解析。 */
  async function sendSoul(id) {
    const s = store.get();
    const binding = bindingOf(s.sessionId);
    if (!binding) { toast('先開啟一個會話'); return { ok: false, error: 'no-session' }; }
    const current = s.activity.soul;
    let phrase;
    if (id === 'off') {
      if (current === 'off') return { ok: true, skipped: true };
      phrase = SOUL_OFF;
    } else {
      const soul = SOULS.find((x) => x.id === id);
      if (!soul || current === id) return { ok: true, skipped: true };
      phrase = current === 'off' ? soul.on : soul.swap;
    }
    try {
      const result = await binding.session.prompt([{ type: 'text', text: '/' + SOUL_SKILL + ' ' + phrase }], 'queue');
      if (result && result.ok === false) {
        const code = result.error && result.error.code;
        toast('傳送失敗' + (code ? '：' + code : ''));
        return { ok: false, error: code || 'failed' };
      }
      toast('已傳送：' + phrase);
      return { ok: true, phrase };
    } catch (error) {
      fail('soul', error);
      toast('傳送失敗');
      return { ok: false, error: String(error && error.message || error) };
    }
  }

  /* ---------------- M5：TW 資料庫遮罩 ---------------- */

  let libSeq = 0;
  function errorText(error) { return error && error.message ? error.message : String(error); }
  function basename(path) {
    const text = String(path == null ? '' : path);
    const parts = text.split(/[\\/]/u);
    return parts[parts.length - 1] || text;
  }
  async function responseBody(res) {
    let text = '';
    try { text = await res.text(); } catch {}
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    return { text, data };
  }
  /** HTTP 失敗的統一文案：優先用宿主 JSON 裡的 code / message，不把 HTML 當成功。 */
  function failureText(res, text, data) {
    const code = data && typeof data.code === 'string' ? data.code : '';
    const message = data && typeof data.message === 'string' ? data.message : '';
    const clean = String(text || '').replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, 180);
    const detail = [code, message].filter(Boolean).join('：') || clean || res.statusText || '沒有響應體';
    return 'HTTP ' + res.status + ' · ' + detail;
  }
  /** 同源 POST JSON；只有響應 ok === true 才當成功，失敗保留真實 code / message。 */
  async function postJson(url, body) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new Error('請求沒有發出去：' + errorText(error));
    }
    const { text, data } = await responseBody(res);
    if (!res.ok) throw new Error(failureText(res, text, data));
    if (!data || typeof data !== 'object') {
      throw new Error('HTTP ' + res.status + ' 的響應不是 JSON' + (text ? '：' + String(text).replace(/\s+/gu, ' ').slice(0, 120) : ''));
    }
    if (data.ok !== true) {
      const code = typeof data.code === 'string' ? data.code : 'failed';
      const message = typeof data.message === 'string' ? data.message : '宿主返回的 ok 不是 true';
      throw new Error(code + '：' + message);
    }
    return data;
  }
  /** 只讀 GET JSON；和 POST 一樣只接受 ok === true。 */
  async function getJson(url) {
    let res;
    try {
      res = await fetch(url, { method: 'GET', headers: { accept: 'application/json' } });
    } catch (error) {
      throw new Error('請求沒有發出去：' + errorText(error));
    }
    const { text, data } = await responseBody(res);
    if (!res.ok) throw new Error(failureText(res, text, data));
    if (!data || typeof data !== 'object') {
      throw new Error('HTTP ' + res.status + ' 的響應不是 JSON' + (text ? '：' + String(text).replace(/\s+/gu, ' ').slice(0, 120) : ''));
    }
    if (data.ok !== true) {
      const code = typeof data.code === 'string' ? data.code : 'failed';
      const message = typeof data.message === 'string' ? data.message : '宿主返回的 ok 不是 true';
      throw new Error(code + '：' + message);
    }
    return data;
  }
  /** 開啟 iframe 前先確認路由真的返回了 TW 挑選頁；503/404/別的靜態頁都當失敗。 */
  async function probeLibrary() {
    let res;
    try {
      res = await fetch(M5.libPage, { method: 'GET', headers: { accept: 'text/html' } });
    } catch (error) {
      throw new Error('路由請求失敗：' + errorText(error));
    }
    if (!res.ok) {
      const { text, data } = await responseBody(res);
      throw new Error(failureText(res, text, data));
    }
    const html = await res.text();
    if (!/TavernWeave Library/u.test(html) && !/picker\.js/u.test(html)) {
      throw new Error('HTTP ' + res.status + ' 返回的不是 TW 挑選頁（路由可能沒註冊，或命中了別的靜態頁）');
    }
  }
  async function openLibrary(tab) {
    if (tab !== 'design' && tab !== 'motion') return { ok: false, error: 'unknown-library-tab' };
    if (store.get().ws.managerOpen) setWs({ managerOpen: false });
    const seq = ++libSeq;
    const url = M5.libPage + '#' + tab;
    setLib({ open: true, tab, title: M5.libTitles[tab], status: 'loading', url: '', error: '' });
    try {
      await probeLibrary();
      if (seq !== libSeq || !store.get().lib.open) return { ok: false, error: 'closed' };
      setLib({ status: 'ready', url });
      return { ok: true, url };
    } catch (error) {
      if (seq !== libSeq) return { ok: false, error: 'superseded' };
      setLib({ status: 'error', url: '', error: '資料庫沒找到：' + errorText(error) });
      return { ok: false, error: errorText(error) };
    }
  }
  function closeLibrary() {
    libSeq += 1;
    setLib(freshLib());
  }

  /* ---------------- M5：世界書真實檔案（select / read / save / versions） ---------------- */

  let wbSeq = 0;
  let saveSeq = 0;
  let verSeq = 0;
  let mvuSeq = 0;
  function parseKeys(text) {
    return String(text == null ? '' : text).split(/[,，]/u).map((s) => s.trim()).filter(Boolean);
  }
  function asStringList(value) {
    if (Array.isArray(value)) return value.filter((x) => typeof x === 'string' || typeof x === 'number').map((x) => String(x));
    if (typeof value === 'string') return parseKeys(value);
    return [];
  }
  function wbKind(raw) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)
      && raw.entries && typeof raw.entries === 'object' && !Array.isArray(raw.entries)) return 'st-object';
    if (Array.isArray(raw)) return 'st-array';
    return 'unknown';
  }
  function normalizeWbEntry(source, slot, fallbackUid) {
    const e = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
    const keys = asStringList(e.key !== undefined ? e.key : e.keys);
    return {
      slot: String(slot),
      uid: e.uid !== undefined && e.uid !== null ? e.uid : fallbackUid,
      comment: String(e.comment !== undefined ? e.comment : e.title !== undefined ? e.title : ''),
      content: String(e.content !== undefined ? e.content : e.body !== undefined ? e.body : ''),
      keys,
      keysText: keys.join(', '),
      secondary: asStringList(e.keysecondary !== undefined ? e.keysecondary : e.secondary),
    };
  }
  /** 前端歸一化：st-object 取 json.entries 物件，st-array 取陣列；其他一律 unknown。 */
  function normalizeWb(raw) {
    const kind = wbKind(raw);
    if (kind === 'st-object') {
      const entries = raw.entries;
      return {
        kind,
        entries: Object.keys(entries).map((slot) => normalizeWbEntry(entries[slot], slot, /^\d+$/u.test(slot) ? Number(slot) : undefined)),
      };
    }
    if (kind === 'st-array') return { kind, entries: raw.map((entry, index) => normalizeWbEntry(entry, index, index)) };
    return { kind, entries: [] };
  }
  // 回寫時優先沿用條目原本用的欄位名（comment/title、content/body、key/keys…），沒有才建立 ST 標準欄位。
  const WB_WRITE_FIELDS = Object.freeze({
    comment: ['comment', 'title'],
    content: ['content', 'body'],
    key: ['key', 'keys'],
    keysecondary: ['keysecondary', 'secondary'],
  });
  function writeWbField(target, names, value) {
    const name = names.find((n) => Object.prototype.hasOwnProperty.call(target, n)) || names[0];
    target[name] = value;
  }
  function writeWbEntry(target, entry) {
    writeWbField(target, WB_WRITE_FIELDS.comment, String(entry.comment || ''));
    writeWbField(target, WB_WRITE_FIELDS.content, String(entry.content || ''));
    writeWbField(target, WB_WRITE_FIELDS.key, parseKeys(entry.keysText));
    writeWbField(target, WB_WRITE_FIELDS.keysecondary, asStringList(entry.secondary));
  }
  /** 基於原 raw 結構回寫編輯；保留未知欄位，不重排條目。 */
  function buildWbSaveJson(wb) {
    if (!wb.raw || typeof wb.raw !== 'object') throw new Error('沒有可儲存的 JSON（檔案沒讀到，或根節點不是物件/陣列）');
    if (wb.kind !== 'st-object' && wb.kind !== 'st-array') return wb.raw;
    const clone = JSON.parse(JSON.stringify(wb.raw));
    if (wb.kind === 'st-array') {
      wb.entries.forEach((entry, index) => {
        const target = clone[index];
        if (target && typeof target === 'object' && !Array.isArray(target)) writeWbEntry(target, entry);
      });
    } else {
      wb.entries.forEach((entry) => {
        const target = clone.entries[entry.slot];
        if (target && typeof target === 'object' && !Array.isArray(target)) writeWbEntry(target, entry);
      });
    }
    return clone;
  }
  function formatSize(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n < 0) return '';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KiB';
    return (n / 1024 / 1024).toFixed(1) + ' MiB';
  }
  function formatMtime(value) {
    if (value === undefined || value === null || value === '') return '時間未知';
    let d;
    if (typeof value === 'number' || /^\d+$/u.test(String(value))) {
      const n = Number(value);
      d = new Date(n < 1e12 ? n * 1000 : n);
    } else {
      d = new Date(value);
    }
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('zh-CN', { hour12: false });
  }
  function jsonPreview(value) {
    try {
      const text = JSON.stringify(value, null, 2);
      if (typeof text !== 'string') return String(value);
      return text.length > 20000 ? text.slice(0, 20000) + '\n…（已截斷，原始檔案更大）' : text;
    } catch (error) {
      return '無法顯示 JSON：' + errorText(error);
    }
  }
  function updateWbEntry(index, patch) {
    const wb = store.get().wb;
    if (!(index >= 0) || index >= wb.entries.length) return;
    const entries = wb.entries.slice();
    entries[index] = { ...entries[index], ...patch };
    setWb({ entries, dirty: true, saveNotice: '', pendingUnknown: false });
  }
  /** 統一呼叫宿主的原生目錄選擇器；取消返回 cancelled，服務缺失/異常保留真實原因。 */
  async function requestHostDirectory() {
    let rp;
    try { rp = ctxRef && ctxRef.remote ? ctxRef.remote.directoryPicker : undefined; } catch { rp = undefined; }
    if (!rp || typeof rp.pick !== 'function') return { ok: false, reason: 'unavailable' };
    let result;
    try {
      result = await rp.pick();
    } catch (error) {
      return { ok: false, reason: 'error', detail: errorText(error) };
    }
    if (!result || result.ok !== true) {
      const e = result && result.error;
      return { ok: false, reason: 'error', detail: e ? [e.code, e.message].filter(Boolean).join('：') : '未知錯誤' };
    }
    const path = result.value;
    if (path === null || path === undefined) return { ok: true, cancelled: true };
    if (typeof path !== 'string' || !path.trim()) return { ok: false, reason: 'empty' };
    return { ok: true, path };
  }
  function directoryPickMessage(pick) {
    if (pick.reason === 'unavailable') return '宿主沒有提供目錄選擇服務（remote.directoryPicker）。請用下面的“或輸入目錄路徑”開啟目錄。';
    if (pick.reason === 'empty') return '目錄選擇器返回了空路徑。請改用目錄路徑。';
    return '目錄選擇器呼叫失敗：' + (pick.detail || '未知錯誤') + '。請改用目錄路徑。';
  }
  async function pickWorldbookRoot() {
    if (store.get().wb.picking) return { ok: false, error: 'busy' };
    setWb({ picking: true, folderError: '' });
    try {
      const pick = await requestHostDirectory();
      if (pick.cancelled) {
        toast('已取消選擇目錄');
        return { ok: true, cancelled: true };
      }
      if (!pick.ok) {
        setWb({ folderError: directoryPickMessage(pick) });
        return { ok: false, error: pick.detail || pick.reason };
      }
      setWb({ rootInput: pick.path });
      return await openWorldbookRoot(pick.path);
    } finally {
      if (store.get().wb.picking) setWb({ picking: false });
    }
  }
  async function openWorldbookRoot(input) {
    const root = String(input == null ? '' : input).trim();
    const current = store.get().wb;
    if (!root) {
      setWb({ folderError: '先填世界書目錄的絕對路徑。' });
      return { ok: false, error: 'empty-root' };
    }
    if (current.dirty && typeof window.confirm === 'function'
      && !window.confirm('當前世界書還有未儲存修改。切換目錄會丟掉這些修改，繼續嗎？')) {
      return { ok: false, cancelled: true };
    }
    const seq = ++wbSeq;
    setWb({ ...freshWb(), rootInput: root, filesState: 'loading', picking: false });
    try {
      const data = await postJson(M5.api.select, { root });
      if (seq !== wbSeq) return { ok: false, error: 'superseded' };
      const files = (Array.isArray(data.files) ? data.files : []).map((file) => ({
        path: String(file && file.path ? file.path : ''),
        name: String(file && file.name ? file.name : basename(file && file.path)),
        size: Number(file && file.size),
        mtime: file && file.mtime !== undefined ? file.mtime : null,
      })).filter((file) => file.path);
      const shownRoot = typeof data.root === 'string' && data.root ? data.root : root;
      setWb({ root: shownRoot, files, filesState: 'ready', folderError: '', error: '' });
      clearRestoreNotice('世界書');
      // 元件目錄與世界書共用同一個根；同步宿主 selectedMvuRoot。
      const mvuSync = await openMvuRoot(shownRoot);
      patchActiveProject({ lastWorldbookRoot: shownRoot, lastMvuRoot: store.get().mvu.root || '' });
      scheduleWorkspaceSave();
      return { ok: true, root: shownRoot, files: files.length, mvuSync: mvuSync.ok };
    } catch (error) {
      if (seq !== wbSeq) return { ok: false, error: 'superseded' };
      setWb({ ...freshWb(), rootInput: root, filesState: 'error', folderError: errorText(error) });
      return { ok: false, error: errorText(error) };
    }
  }
  async function readWorldbookFile(path) {
    const target = String(path == null ? '' : path);
    if (!target) return { ok: false, error: 'empty-path' };
    const current = store.get().wb;
    if (current.dirty && typeof window.confirm === 'function'
      && !window.confirm('當前檔案還有未儲存修改。重新讀取會丟掉這些修改，繼續嗎？')) {
      return { ok: false, cancelled: true };
    }
    const seq = ++wbSeq;
    setWb({
      selectedPath: target, loadingFile: true, kind: '', entries: [], raw: null, openIndex: -1,
      dirty: false, error: '', saveNotice: '', backup: '', pendingUnknown: false,
      versions: [], versionsError: '', versionsState: 'idle', versionsAt: 0,
    });
    try {
      const data = await postJson(M5.api.read, { path: target });
      if (seq !== wbSeq) return { ok: false, error: 'superseded' };
      const raw = data.json === undefined ? null : data.json;
      const normalized = normalizeWb(raw);
      setWb({
        selectedPath: typeof data.path === 'string' && data.path ? data.path : target,
        loadingFile: false,
        kind: normalized.kind,
        raw,
        entries: normalized.entries,
        openIndex: normalized.entries.length ? 0 : -1,
        dirty: false,
        error: '',
      });
      const shownPath = store.get().wb.selectedPath;
      clearRestoreNotice('世界書');
      patchActiveProject({ lastWorldbookRoot: store.get().wb.root, lastWorldbookPath: shownPath });
      scheduleWorkspaceSave();
      refreshWbVersions(shownPath);
      return { ok: true, kind: normalized.kind, entries: normalized.entries.length };
    } catch (error) {
      if (seq !== wbSeq) return { ok: false, error: 'superseded' };
      setWb({ loadingFile: false, kind: '', raw: null, entries: [], openIndex: -1, error: errorText(error) });
      return { ok: false, error: errorText(error) };
    }
  }
  async function refreshWbVersions(path) {
    const target = String(path == null ? '' : path);
    if (!target) return { ok: false, error: 'empty-path' };
    if (store.get().wb.selectedPath !== target) return { ok: false, error: 'stale-file' };
    const seq = ++verSeq;
    setWb({ versionsState: 'loading', versionsError: '' });
    try {
      const data = await postJson(M5.api.versions, { path: target });
      if (seq !== verSeq || store.get().wb.selectedPath !== target) return { ok: false, error: 'superseded' };
      const versions = (Array.isArray(data.versions) ? data.versions : []).map((version) => ({
        path: String(version && version.path ? version.path : ''),
        name: String(version && version.name ? version.name : basename(version && version.path)),
        size: Number(version && version.size),
        mtime: version && version.mtime !== undefined ? version.mtime : null,
      })).filter((version) => version.path);
      setWb({ versions, versionsState: 'ready', versionsError: '', versionsAt: Date.now() });
      return { ok: true, versions: versions.length };
    } catch (error) {
      if (seq !== verSeq) return { ok: false, error: 'superseded' };
      setWb({ versions: [], versionsState: 'error', versionsError: errorText(error), versionsAt: Date.now() });
      return { ok: false, error: errorText(error) };
    }
  }
  async function saveWorldbook() {
    const wb = store.get().wb;
    if (wb.saving) return { ok: false, error: 'busy' };
    if (!wb.selectedPath) return { ok: false, error: 'no-file' };
    if (wb.kind === 'unknown' && !wb.pendingUnknown) {
      setWb({ pendingUnknown: true, saveNotice: '', error: '' });
      return { ok: false, confirm: true };
    }
    let json;
    try {
      json = wb.kind === 'st-object' || wb.kind === 'st-array' ? buildWbSaveJson(wb) : wb.raw;
    } catch (error) {
      setWb({ error: '無法生成儲存內容：' + errorText(error) });
      return { ok: false, error: errorText(error) };
    }
    if (json === null || json === undefined) {
      setWb({ error: '沒有可儲存的 JSON（檔案沒讀到，或根節點是 null）。' });
      return { ok: false, error: 'no-json' };
    }
    const seq = ++saveSeq;
    setWb({ saving: true, error: '', pendingUnknown: false });
    try {
      const data = await postJson(M5.api.save, { path: wb.selectedPath, json });
      if (seq !== saveSeq) return { ok: false, error: 'superseded' };
      const savedPath = typeof data.path === 'string' && data.path ? data.path : wb.selectedPath;
      const backup = typeof data.backup === 'string' ? data.backup : '';
      if (store.get().wb.selectedPath !== wb.selectedPath) {
        // 儲存過程中使用者切到了別的檔案：舊檔案已真實寫入，但不要把新檔案的頁面狀態覆蓋回去。
        setWb({ saving: false });
        toast('已儲存上一個檔案；當前檔案沒有被覆蓋');
        return { ok: true, path: savedPath, backup, switched: true };
      }
      setWb({
        saving: false, dirty: false, raw: json, selectedPath: savedPath, backup,
        saveNotice: '已儲存到磁碟：' + savedPath + (backup ? '；舊版備份：' + backup : '；宿主沒有返回備份路徑'),
      });
      patchActiveProject({ lastWorldbookRoot: store.get().wb.root, lastWorldbookPath: savedPath });
      scheduleWorkspaceSave();
      refreshWbVersions(savedPath);
      toast('已儲存世界書');
      return { ok: true, path: savedPath, backup };
    } catch (error) {
      if (seq !== saveSeq) return { ok: false, error: 'superseded' };
      if (store.get().wb.selectedPath !== wb.selectedPath) {
        setWb({ saving: false });
        toast('上一個檔案儲存失敗：' + errorText(error));
        return { ok: false, error: errorText(error), switched: true };
      }
      setWb({ saving: false, error: errorText(error) });
      return { ok: false, error: errorText(error) };
    }
  }

  /* ---------------- M5：MVU 元件目錄 / Zod Schema 靜態解析 ---------------- */

  function normalizeMvuFile(file) {
    return {
      path: String(file && file.path ? file.path : ''),
      name: String(file && file.name ? file.name : basename(file && file.path)),
      size: Number(file && file.size),
      mtime: file && file.mtime !== undefined ? file.mtime : null,
    };
  }
  function normalizeMvuSchema(schema) {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return null;
    return {
      parser: typeof schema.parser === 'string' ? schema.parser : '',
      roots: Array.isArray(schema.roots) ? schema.roots : [],
      nodeCount: Number(schema.nodeCount) || 0,
      warnings: Array.isArray(schema.warnings) ? schema.warnings.map((warning) => String(warning)) : [],
    };
  }
  async function pickMvuRoot() {
    if (store.get().mvu.picking) return { ok: false, error: 'busy' };
    setMvu({ picking: true, folderError: '' });
    try {
      const pick = await requestHostDirectory();
      if (pick.cancelled) {
        toast('已取消選擇目錄');
        return { ok: true, cancelled: true };
      }
      if (!pick.ok) {
        setMvu({ folderError: directoryPickMessage(pick) });
        return { ok: false, error: pick.detail || pick.reason };
      }
      setMvu({ rootInput: pick.path });
      return await openMvuRoot(pick.path);
    } finally {
      if (store.get().mvu.picking) setMvu({ picking: false });
    }
  }
  async function openMvuRoot(input) {
    const root = String(input == null ? '' : input).trim();
    if (!root) {
      setMvu({ folderError: '先填 MVU 元件目錄的絕對路徑。' });
      return { ok: false, error: 'empty-root' };
    }
    const seq = ++mvuSeq;
    setMvu({ ...freshMvu(), rootInput: root, filesState: 'loading', picking: false });
    try {
      const data = await postJson(M5.api.mvuSelect, { root });
      if (seq !== mvuSeq) return { ok: false, error: 'superseded' };
      const files = (Array.isArray(data.files) ? data.files : []).map(normalizeMvuFile).filter((file) => file.path);
      const shownRoot = typeof data.root === 'string' && data.root ? data.root : root;
      setMvu({ root: shownRoot, files, filesState: 'ready', folderError: '', error: '' });
      clearRestoreNotice('MVU');
      patchActiveProject({ lastMvuRoot: shownRoot });
      scheduleWorkspaceSave();
      return { ok: true, root: shownRoot, files: files.length };
    } catch (error) {
      if (seq !== mvuSeq) return { ok: false, error: 'superseded' };
      setMvu({ ...freshMvu(), rootInput: root, filesState: 'error', folderError: errorText(error) });
      return { ok: false, error: errorText(error) };
    }
  }
  async function inspectMvuFile(path) {
    const target = String(path == null ? '' : path);
    if (!target) return { ok: false, error: 'empty-path' };
    const seq = ++mvuSeq;
    setMvu({
      selectedPath: target, loadingFile: true, file: null, meta: null, schema: null,
      reason: '', warnings: [], error: '', inspectedAt: 0,
    });
    try {
      const data = await postJson(M5.api.mvuInspect, { path: target });
      if (seq !== mvuSeq) return { ok: false, error: 'superseded' };
      const file = data.file && typeof data.file === 'object' ? normalizeMvuFile(data.file) : null;
      const meta = data.meta && typeof data.meta === 'object' ? {
        type: data.meta.type,
        enabled: data.meta.enabled,
        name: data.meta.name,
        id: data.meta.id,
        contentLength: data.meta.contentLength,
      } : null;
      const schema = normalizeMvuSchema(data.schema);
      // 沒有 schema 時宿主把 warnings 放在頂層（parse-error / no-zod-object）；有 schema 時在 schema.warnings。
      const topWarnings = Array.isArray(data.warnings) ? data.warnings.map((warning) => String(warning)) : [];
      setMvu({
        loadingFile: false,
        selectedPath: file && file.path ? file.path : target,
        file,
        meta,
        schema,
        reason: !schema && typeof data.reason === 'string' ? data.reason : '',
        warnings: schema ? schema.warnings : topWarnings,
        error: '',
        inspectedAt: Date.now(),
      });
      clearRestoreNotice('MVU');
      patchActiveProject({ lastMvuRoot: store.get().mvu.root, lastMvuPath: store.get().mvu.selectedPath });
      scheduleWorkspaceSave();
      return { ok: true, schema: !!schema, reason: !schema && typeof data.reason === 'string' ? data.reason : '' };
    } catch (error) {
      if (seq !== mvuSeq) return { ok: false, error: 'superseded' };
      setMvu({ loadingFile: false, schema: null, reason: '', warnings: [], error: errorText(error) });
      return { ok: false, error: errorText(error) };
    }
  }

  /* ---------------- M5：工作區持久化 / 專案管理 / 卡目錄 ---------------- */

  let wsLoadSeq = 0;
  let wsRefreshInFlight = false;
  let wsRestoring = false;
  let cardSeq = 0;
  let cardInspectSeq = 0;
  const AUTO_VERSION_CARD_LIMIT = 8;
  let wsSaveTimer = 0;
  let wsPersistSeq = 0;
  let wsNoticeKey = '';

  function projectById(id) { return store.get().ws.projects.find((project) => project.id === id) || null; }
  function activeProject() { return projectById(store.get().ws.activeProjectId); }
  function patchActiveProject(patch) {
    const ws = store.get().ws;
    if (!ws.activeProjectId) return;
    setWs({ projects: ws.projects.map((project) => (project.id === ws.activeProjectId ? { ...project, ...patch } : project)) });
  }
  function workspaceStateFromStore() {
    const s = store.get();
    const ws = s.ws;
    const now = new Date().toISOString();
    const projects = ws.projects.map((project) => {
      if (project.id !== ws.activeProjectId) return { ...project };
      return {
        ...project,
        lastVersionDir: ws.versionsRoot || project.lastVersionDir || '',
        lastCardPath: (ws.activeCard && ws.activeCard.file && ws.activeCard.file.path) || project.lastCardPath || '',
        lastWorldbookRoot: s.wb.root || project.lastWorldbookRoot || '',
        lastWorldbookPath: s.wb.selectedPath || project.lastWorldbookPath || '',
        lastMvuRoot: s.mvu.root || project.lastMvuRoot || '',
        lastMvuPath: s.mvu.selectedPath || project.lastMvuPath || '',
        lastUsed: now,
      };
    });
    return {
      version: 1,
      projects,
      activeProjectId: ws.activeProjectId,
      autoLatest: ws.autoLatest,
      worldbook: { root: s.wb.root || '', file: s.wb.selectedPath || '' },
      mvu: { root: s.mvu.root || '', file: s.mvu.selectedPath || '' },
      ui: { root: '', file: '' },
    };
  }
  function writeWorkspaceSnapshot(state) {
    try {
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ ...state, savedAt: new Date().toISOString() }));
    } catch {}
  }
  async function saveWorkspaceState(state) {
    const seq = ++wsPersistSeq;
    try {
      const data = await postJson(WORKSPACE_ROUTES.state, { state });
      if (seq !== wsPersistSeq) return { ok: true, stale: true };
      setWs({ savedAt: typeof data.savedAt === 'string' ? data.savedAt : new Date().toISOString(), persistError: '' });
      return { ok: true };
    } catch (error) {
      if (seq !== wsPersistSeq) return { ok: false, stale: true };
      setWs({ persistError: errorText(error) });
      return { ok: false, error: errorText(error) };
    }
  }
  function scheduleWorkspaceSave() {
    const state = workspaceStateFromStore();
    writeWorkspaceSnapshot(state);
    if (!store.get().ws.hostAvailable || wsRestoring) return;
    if (wsSaveTimer) clearTimeout(wsSaveTimer);
    wsSaveTimer = setTimeout(() => {
      wsSaveTimer = 0;
      saveWorkspaceState(state);
    }, 300);
  }
  function addRestoreNotice(text) {
    if (!text) return;
    const current = store.get().ws.restoreNotice;
    if (current.includes(text)) return;
    setWs({ restoreNotice: current ? current + '\n' + text : text });
  }
  function clearRestoreNotice(part) {
    const current = store.get().ws.restoreNotice;
    if (!current) return;
    const lines = current.split('\n');
    const kept = lines.filter((line) => !line.includes(part));
    if (kept.length !== lines.length) setWs({ restoreNotice: kept.join('\n') });
  }
  function normalizeVersion(value) {
    return {
      path: workspaceString(value && value.path),
      name: workspaceString(value && value.name) || basename(value && value.path),
      relative: workspaceString(value && value.relative),
      version: workspaceString(value && value.version),
      mtime: value && value.mtime !== undefined ? value.mtime : null,
    };
  }
  function normalizeCardFile(value) {
    return {
      path: workspaceString(value && value.path),
      name: workspaceString(value && value.name) || basename(value && value.path),
      size: Number(value && value.size),
      mtime: value && value.mtime !== undefined ? value.mtime : null,
      version: workspaceString(value && value.version),
    };
  }
  function normalizeCardRead(data) {
    const file = normalizeCardFile(data && data.file);
    const meta = data && data.meta && typeof data.meta === 'object' ? data.meta : {};
    return {
      kind: workspaceString(data && data.kind) || 'unknown',
      file,
      meta: {
        name: workspaceString(meta.name),
        spec: workspaceString(meta.spec),
        specVersion: workspaceString(meta.specVersion),
        characterName: workspaceString(meta.characterName),
        characterVersion: workspaceString(meta.characterVersion),
        creator: workspaceString(meta.creator),
        createDate: workspaceString(meta.createDate),
      },
      hasWorldbook: !!(data && data.hasWorldbook),
      worldbookEntryCount: Number(data && data.worldbookEntryCount) || 0,
      scriptCount: Number(data && data.scriptCount) || 0,
      regexCount: Number(data && data.regexCount) || 0,
    };
  }
  function splitCardKeys(value) {
    const source = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(/[,，]/u) : []);
    return source.map((item) => workspaceString(item).trim()).filter(Boolean);
  }
  function normalizeCardWorldbookEntry(value, index) {
    const raw = value && typeof value === 'object' ? value : {};
    const keys = splitCardKeys(raw.keys).length ? splitCardKeys(raw.keys)
      : (typeof raw.key === 'string' ? splitCardKeys(raw.key) : []);
    const secondary = splitCardKeys(raw.secondary).length ? splitCardKeys(raw.secondary)
      : splitCardKeys(raw.keysecondary);
    return {
      key: workspaceString(raw.key) || keys.join(', '),
      uid: raw.uid !== undefined && raw.uid !== null ? raw.uid : index,
      comment: workspaceString(raw.comment) || workspaceString(raw.title),
      content: workspaceString(raw.content),
      keys,
      secondary,
    };
  }
  function normalizeCardScript(value, index) {
    const raw = value && typeof value === 'object' ? value : {};
    return {
      id: workspaceString(raw.id),
      name: workspaceString(raw.name) || workspaceString(raw.id) || ('指令碼 ' + (index + 1)),
      type: workspaceString(raw.type) || 'script',
      enabled: raw.enabled === true,
      contentLength: Number(raw.contentLength) || 0,
      hasSchema: raw.hasSchema === true,
    };
  }
  /** card/inspect 的 legacyVars 通常形如 { stat_data: {...} }；只取初始值物件，原樣只讀。 */
  function normalizeCardLegacys(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const candidate = value.stat_data !== undefined ? value.stat_data
      : (value.statData !== undefined ? value.statData : value);
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
    return { statData: candidate };
  }
  /** /card/inspect 只讀載荷：卡內世界書、靜態 Zod、指令碼元資訊；不儲存正文到 workspace。 */
  function normalizeCardInspect(data) {
    const base = normalizeCardRead(data);
    const wbRaw = data && data.worldbook && typeof data.worldbook === 'object' ? data.worldbook : {};
    const entries = (Array.isArray(wbRaw.entries) ? wbRaw.entries : []).map(normalizeCardWorldbookEntry);
    const worldbook = {
      name: workspaceString(wbRaw.name),
      count: Number.isFinite(Number(wbRaw.count)) && Number(wbRaw.count) >= 0 ? Number(wbRaw.count) : entries.length,
      entries,
    };
    let mvu = null;
    if (data && data.mvu && typeof data.mvu === 'object' && !Array.isArray(data.mvu)) {
      const source = data.mvu;
      const scriptRaw = source.script && typeof source.script === 'object' ? source.script : {};
      const schema = normalizeMvuSchema(source.schema);
      const schemaScriptRaw = source.schemaScript && typeof source.schemaScript === 'object' ? source.schemaScript : null;
      const ruleEntries = (Array.isArray(source.updateRuleEntries) ? source.updateRuleEntries : [])
        .map((entry, index) => {
          const raw = entry && typeof entry === 'object' ? entry : {};
          return {
            id: raw.id !== undefined && raw.id !== null ? String(raw.id) : 'rule-' + (index + 1),
            name: workspaceString(raw.name) || ('更新規則 ' + (index + 1)),
            content: workspaceString(raw.content),
          };
        })
        .filter((entry) => entry.content);
      if (!ruleEntries.length && source.updateRules) {
        ruleEntries.push({ id: 'rule-1', name: '更新規則', content: workspaceString(source.updateRules) });
      }
      const initVarRaw = source.initVar && typeof source.initVar === 'object' ? source.initVar : null;
      mvu = {
        script: normalizeCardScript(scriptRaw, 0),
        schema,
        schemaSource: workspaceString(source.schemaSource),
        schemaScript: schemaScriptRaw ? {
          id: workspaceString(schemaScriptRaw.id),
          name: workspaceString(schemaScriptRaw.name),
        } : null,
        updateRules: workspaceString(source.updateRules) || ruleEntries.map((entry) => entry.content).join('\n\n'),
        updateRuleEntries: ruleEntries,
        initVarSource: workspaceString(source.initVarSource),
        initVarName: workspaceString(source.initVarName),
        initVar: initVarRaw && typeof initVarRaw.kind === 'string' ? {
          kind: initVarRaw.kind,
          id: initVarRaw.id !== undefined && initVarRaw.id !== null ? String(initVarRaw.id) : '',
          name: workspaceString(initVarRaw.name),
        } : null,
        reason: workspaceString(source.reason),
        warnings: Array.isArray(source.warnings) ? source.warnings.map((warning) => String(warning)) : [],
      };
      mvu.script.hasSchema = !!schema;
    }
    const scripts = (Array.isArray(data && data.scripts) ? data.scripts : []).map(normalizeCardScript);
    return {
      ...base,
      hasWorldbook: entries.length > 0 || base.hasWorldbook,
      worldbookEntryCount: worldbook.count,
      scriptCount: scripts.length,
      worldbook,
      mvu,
      scripts,
      legacyVars: normalizeCardLegacys(data && data.legacyVars),
    };
  }
  async function scanProjectRoot(root) {
    const data = await postJson(WORKSPACE_ROUTES.scan, { root });
    const versions = (Array.isArray(data.versions) ? data.versions : []).map(normalizeVersion).filter((version) => version.path);
    const latest = typeof data.latest === 'string' && data.latest
      ? data.latest
      : (versions.length ? versions[0].path : workspaceString(data.root) || root);
    return { root: workspaceString(data.root) || root, versions, latest };
  }
  async function cardListRoot(root) {
    const data = await postJson(WORKSPACE_ROUTES.cardList, { root });
    const files = (Array.isArray(data.files) ? data.files : []).map(normalizeCardFile).filter((file) => file.path);
    return {
      root: workspaceString(data.root) || root,
      files,
      latest: typeof data.latest === 'string' && data.latest ? data.latest : (files.length ? files[0].path : ''),
    };
  }
  function isCardRead(info) {
    return !!info && (info.kind === 'card-png' || info.kind === 'card-json');
  }
  async function inspectCardDetail(root, path, options = {}) {
    const seq = ++cardInspectSeq;
    setWs({ cardDetail: null, cardInspectBusy: true, cardInspectError: '' });
    try {
      const data = await postJson(WORKSPACE_ROUTES.cardInspect, { root, path });
      if (seq !== cardInspectSeq) return { ok: false, error: 'superseded' };
      const detail = normalizeCardInspect(data);
      setWs({ cardDetail: detail, cardInspectBusy: false, cardInspectError: '' });
      return { ok: true, detail };
    } catch (error) {
      if (seq !== cardInspectSeq) return { ok: false, error: 'superseded' };
      const message = errorText(error);
      setWs({ cardDetail: null, cardInspectBusy: false, cardInspectError: message });
      if (!options.silent) toast('卡內內容讀取失敗：' + message);
      return { ok: false, error: message };
    }
  }
  async function selectCard(root, path, options = {}) {
    const target = workspaceString(path);
    if (!target) return { ok: false, error: 'empty-path' };
    let info = store.get().ws.cardMeta[target];
    if (!info) {
      try {
        info = normalizeCardRead(await postJson(WORKSPACE_ROUTES.cardRead, { root, path: target }));
      } catch (error) {
        setWs({
          cardError: errorText(error), activeCard: null, cardDetail: null,
          cardInspectBusy: false, cardInspectError: '',
        });
        if (!options.silent) toast('卡檔案讀取失敗：' + errorText(error));
        return { ok: false, error: errorText(error) };
      }
    }
    if (!isCardRead(info)) {
      const message = '這個檔案是 ' + (info.kind || 'unknown') + '，不是角色卡；請選 PNG/JSON 卡檔案。';
      setWs({ cardError: message });
      if (!options.silent) toast(message);
      return { ok: false, error: message };
    }
    setWs({ activeCard: info, cardError: '', cardMissing: '' });
    clearRestoreNotice('卡檔案');
    patchActiveProject({ lastCardPath: target });
    scheduleWorkspaceSave();
    const inspected = await inspectCardDetail(root, target, { silent: !!options.silent });
    return {
      ok: true,
      card: info,
      detail: inspected.ok ? inspected.detail : null,
      inspectError: inspected.ok ? '' : inspected.error,
    };
  }
  async function loadCards(root, options = {}) {
    const seq = ++cardSeq;
    cardInspectSeq += 1;
    setWs({
      cardsBusy: true, cards: [], cardsRoot: root, cardsLatest: '', cardError: '',
      cardMeta: {}, cardReadErrors: {}, activeCard: null, cardMissing: '',
      cardDetail: null, cardInspectBusy: false, cardInspectError: '',
    });
    let list;
    try {
      list = await cardListRoot(root);
    } catch (error) {
      if (seq === cardSeq) setWs({ cardsBusy: false, cardError: errorText(error) });
      return { ok: false, error: errorText(error) };
    }
    if (seq !== cardSeq) return { ok: false, error: 'superseded' };
    setWs({ cards: list.files, cardsRoot: list.root, cardsLatest: '', cardsBusy: false, cardError: '' });
    const meta = {};
    const errors = {};
    for (const file of list.files) {
      try {
        meta[file.path] = normalizeCardRead(await postJson(WORKSPACE_ROUTES.cardRead, { root: list.root, path: file.path }));
      } catch (error) {
        errors[file.path] = errorText(error);
      }
      if (seq !== cardSeq) return { ok: false, error: 'superseded' };
      setWs({ cardMeta: { ...meta }, cardReadErrors: { ...errors } });
    }
    const cardFiles = list.files.filter((file) => isCardRead(meta[file.path]));
    const latestCard = cardFiles.length ? cardFiles[0].path : '';
    setWs({ cardsLatest: latestCard });
    const wanted = options.selectLatest
      ? latestCard
      : (options.preferredPath && cardFiles.some((file) => file.path === options.preferredPath) ? options.preferredPath : '');
    let activePath = '';
    if (wanted) {
      const selected = await selectCard(list.root, wanted, { auto: !!options.auto, silent: true });
      if (selected.ok) activePath = wanted;
    } else if (options.selectLatest) {
      setWs({ cardMissing: '沒有識別到 PNG/JSON 卡檔案；世界書 JSON 不算卡。' });
    } else if (options.preferredPath) {
      setWs({ cardMissing: '上次卡檔案不在了，請重新選：' + options.preferredPath });
    }
    scheduleWorkspaceSave();
    return { ok: true, files: list.files, latest: latestCard, anyLatest: list.latest, activePath };
  }
  /**
   * 從 host card/list 的順序裡找第一個真正的角色卡（card-png/card-json）。
   * 世界書 JSON 可能語義版本更高、mtime 更新，但它不是卡，不能當成“最新卡”。
   */
  async function latestCardInFiles(root, files) {
    for (const file of files) {
      let info = store.get().ws.cardMeta[file.path];
      if (!info) {
        try {
          info = normalizeCardRead(await postJson(WORKSPACE_ROUTES.cardRead, { root, path: file.path }));
        } catch {
          continue;
        }
        setWs({ cardMeta: { ...store.get().ws.cardMeta, [file.path]: info } });
      }
      if (isCardRead(info)) return { path: file.path, info };
    }
    return null;
  }
  /**
   * 自動最新跳過沒有卡的最高版本；有界檢查最多 8 個版本。
   * host 的 versions 已按 semver/mtime 降序，返回第一個有 PNG/JSON 卡的版本。
   */
  async function pickVersionWithCards(versions, latestPath) {
    const source = Array.isArray(versions) && versions.length
      ? versions
      : (latestPath ? [{ path: latestPath, name: basename(latestPath), relative: '' }] : []);
    const candidates = source.slice(0, AUTO_VERSION_CARD_LIMIT);
    let checked = 0;
    for (const version of candidates) {
      if (!version || !version.path) continue;
      checked += 1;
      try {
        const list = await cardListRoot(version.path);
        const card = await latestCardInFiles(version.path, list.files);
        if (card) return { found: true, version, checked };
      } catch {
        // 單個候選卡目錄讀不到就繼續向下找；真正切過去時由 loadCards 顯示真實錯誤。
      }
    }
    return { found: false, version: candidates[0] || null, checked };
  }
  function noCardsMessage(pick, latestPath) {
    const checked = pick && pick.checked ? pick.checked : 0;
    return '沒有識別到卡：已檢查 ' + checked + ' 個版本'
      + (latestPath ? '，最高版本 ' + basename(latestPath) + '也沒有 PNG/JSON 卡' : '')
      + '。';
  }
  async function restoreWorldbookSelection(root, file) {
    if (!root) return { ok: true, skipped: true };
    const opened = await openWorldbookRoot(root);
    if (!opened.ok) {
      setWb({ root, rootInput: root, filesState: 'error', folderError: errorText(opened.error || '世界書目錄讀取失敗') });
      addRestoreNotice('上次世界書目錄不在了，請重新選：' + root);
      return { ok: false, error: opened.error };
    }
    const target = workspaceString(file);
    if (target) {
      const wb = store.get().wb;
      if (wb.files.some((entry) => entry.path === target)) {
        const read = await readWorldbookFile(target);
        if (!read.ok) addRestoreNotice('上次世界書檔案讀取失敗：' + errorText(read.error));
      } else {
        setWb({ selectedPath: '', loadingFile: false, kind: '', entries: [], raw: null, openIndex: -1, dirty: false, error: '' });
        addRestoreNotice('上次世界書檔案不在了，請重新選：' + target);
      }
    }
    patchActiveProject({ lastWorldbookRoot: store.get().wb.root, lastWorldbookPath: store.get().wb.selectedPath || '' });
    scheduleWorkspaceSave();
    return { ok: true };
  }
  async function restoreMvuSelection(root, file) {
    if (!root) return { ok: true, skipped: true };
    const current = store.get().mvu;
    const alreadyOpen = current.root === root && current.filesState === 'ready';
    const opened = alreadyOpen ? { ok: true } : await openMvuRoot(root);
    if (!opened.ok) {
      setMvu({ root, rootInput: root, filesState: 'error', folderError: errorText(opened.error || 'MVU 目錄讀取失敗') });
      addRestoreNotice('上次 MVU 目錄不在了，請重新選：' + root);
      return { ok: false, error: opened.error };
    }
    const target = workspaceString(file);
    if (target) {
      const mvu = store.get().mvu;
      if (mvu.files.some((entry) => entry.path === target)) {
        const read = await inspectMvuFile(target);
        if (!read.ok) addRestoreNotice('上次 MVU 檔案讀取失敗：' + errorText(read.error));
      } else {
        setMvu({ selectedPath: '', loadingFile: false, file: null, meta: null, schema: null, reason: '', warnings: [], error: '' });
        addRestoreNotice('上次 MVU 檔案不在了，請重新選：' + target);
      }
    }
    patchActiveProject({ lastMvuRoot: store.get().mvu.root, lastMvuPath: store.get().mvu.selectedPath || '' });
    scheduleWorkspaceSave();
    return { ok: true };
  }
  async function restoreWorkspaceState(state) {
    setWs({
      projects: state.projects, activeProjectId: state.activeProjectId, autoLatest: state.autoLatest,
      versions: [], versionsRoot: '', versionsLatest: '', scanError: '', cards: [], cardsRoot: '', cardsLatest: '',
      cardError: '', cardMissing: '', activeCard: null, restoreNotice: '',
      cardDetail: null, cardInspectBusy: false, cardInspectError: '',
    });
    const project = projectById(state.activeProjectId);
    if (project) {
      try {
        const scan = await scanProjectRoot(project.root);
        setWs({ versions: scan.versions, versionsLatest: scan.latest });
        const autoPick = state.autoLatest ? await pickVersionWithCards(scan.versions, scan.latest) : null;
        const preferred = autoPick && autoPick.version && autoPick.version.path
          ? autoPick.version.path
          : (state.autoLatest
            ? scan.latest
            : ((scan.versions.find((version) => version.path === project.lastVersionDir) || {}).path || scan.latest));
        setWs({ versionsRoot: preferred });
        await loadCards(preferred, {
          selectLatest: state.autoLatest,
          preferredPath: state.autoLatest ? '' : project.lastCardPath,
          auto: true,
        });
        if (autoPick && !autoPick.found) setWs({ cardMissing: noCardsMessage(autoPick, scan.latest) });
      } catch (error) {
        setWs({ scanError: errorText(error) });
      }
    }
    const wbRoot = state.worldbook.root || (project && project.lastWorldbookRoot) || '';
    const wbFile = wbRoot ? (state.worldbook.file || (project && project.lastWorldbookPath) || '') : '';
    const savedMvuRoot = state.mvu.root || (project && project.lastMvuRoot) || '';
    const sharedRoot = wbRoot || savedMvuRoot;
    if (sharedRoot) {
      await restoreWorldbookSelection(sharedRoot, wbFile);
      const alignedRoot = store.get().wb.root || sharedRoot;
      const sameRoot = !savedMvuRoot || savedMvuRoot === alignedRoot;
      const mvuFile = sameRoot ? (state.mvu.file || (project && project.lastMvuPath) || '') : '';
      if (!sameRoot) addRestoreNotice('上次變數目錄和世界書目錄不同，已按世界書目錄對齊：' + alignedRoot);
      await restoreMvuSelection(alignedRoot, mvuFile);
    }
  }
  async function loadWorkspace() {
    const seq = ++wsLoadSeq;
    const snapshot = readWorkspaceSnapshot();
    let state = null;
    let hostError = '';
    let hostAvailable = false;
    let statePath = '';
    let savedAt = '';
    try {
      const data = await getJson(WORKSPACE_ROUTES.state);
      state = normalizeWorkspaceState(data.state || {});
      hostAvailable = true;
      statePath = workspaceString(data.path);
      savedAt = workspaceString(data.savedAt);
    } catch (error) {
      hostError = '工作區讀取失敗：' + errorText(error);
      state = snapshot || normalizeWorkspaceState({});
    }
    if (seq !== wsLoadSeq) return { ok: false, error: 'superseded' };
    setWs({ hostAvailable, hostError, statePath, savedAt, busy: true, restoring: true, loaded: false });
    wsRestoring = true;
    try {
      await restoreWorkspaceState(state || normalizeWorkspaceState({}));
    } finally {
      wsRestoring = false;
      setWs({ loaded: true, busy: false, restoring: false });
      writeWorkspaceSnapshot(workspaceStateFromStore());
      if (hostAvailable) scheduleWorkspaceSave();
    }
    return { ok: true, hostAvailable };
  }
  function openProjectManager() {
    closeLibrary();
    setWs({ managerOpen: true });
    refreshLatest();
  }
  function closeProjectManager() { setWs({ managerOpen: false }); }
  async function pickProjectRoot() {
    if (store.get().ws.picking || store.get().ws.busy) return { ok: false, error: 'busy' };
    setWs({ picking: true, addError: '' });
    try {
      const pick = await requestHostDirectory();
      if (pick.cancelled) { toast('已取消選擇目錄'); return { ok: true, cancelled: true }; }
      if (!pick.ok) {
        setWs({ addError: directoryPickMessage(pick) });
        return { ok: false, error: pick.detail || pick.reason };
      }
      setWs({ rootInput: pick.path });
      return await addProject(pick.path);
    } finally {
      if (store.get().ws.picking) setWs({ picking: false });
    }
  }
  async function addProject(root) {
    if (store.get().ws.busy || store.get().ws.scanBusy) return { ok: false, error: 'busy' };
    const target = String(root == null ? '' : root).trim();
    if (!target) {
      setWs({ addError: '先填專案目錄的絕對路徑。' });
      return { ok: false, error: 'empty-root' };
    }
    setWs({ addError: '', scanBusy: true });
    let scan;
    try {
      scan = await scanProjectRoot(target);
    } catch (error) {
      setWs({ scanBusy: false, addError: errorText(error) });
      return { ok: false, error: errorText(error) };
    }
    const ws = store.get().ws;
    const existing = ws.projects.find((project) => project.root === scan.root);
    if (existing) {
      setWs({ scanBusy: false, rootInput: '' });
      await switchProject(existing.id);
      return { ok: true, existing: true, projectId: existing.id };
    }
    const auto = ws.autoLatest;
    const autoPick = auto ? await pickVersionWithCards(scan.versions, scan.latest) : null;
    const preferred = autoPick && autoPick.version && autoPick.version.path ? autoPick.version.path : scan.latest;
    const project = {
      id: 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      root: scan.root,
      label: basename(scan.root),
      lastVersionDir: preferred,
      lastCardPath: '',
      lastWorldbookRoot: '',
      lastWorldbookPath: '',
      lastMvuRoot: '',
      lastMvuPath: '',
      lastUsed: new Date().toISOString(),
    };
    // 新專案沒有自己的共享根，避免把上一個專案的世界書/元件 Schema 帶進來。
    setWb(freshWb());
    setMvu(freshMvu());
    setWs({
      projects: [...ws.projects, project],
      activeProjectId: project.id,
      versions: scan.versions,
      versionsLatest: scan.latest,
      versionsRoot: preferred,
      scanBusy: false,
      rootInput: '',
      addError: '',
      scanError: '',
      cardMissing: '',
      newAvailable: null,
      busy: true,
    });
    try {
      await loadCards(preferred, { selectLatest: auto, auto: true });
      if (autoPick && !autoPick.found) setWs({ cardMissing: noCardsMessage(autoPick, scan.latest) });
    } finally {
      setWs({ busy: false });
    }
    scheduleWorkspaceSave();
    toast('已新增專案：' + project.label);
    return { ok: true, projectId: project.id, root: project.root };
  }
  async function switchProject(id) {
    if (store.get().ws.busy) return { ok: false, error: 'busy' };
    const project = projectById(id);
    if (!project) return { ok: false, error: 'not-found' };
    setWs({
      activeProjectId: id, busy: true, versions: [], versionsRoot: '', versionsLatest: '',
      scanError: '', cards: [], cardsRoot: '', cardsLatest: '', cardError: '', cardMissing: '',
      activeCard: null, restoreNotice: '', newAvailable: null,
      cardDetail: null, cardInspectBusy: false, cardInspectError: '',
    });
    patchActiveProject({ lastUsed: new Date().toISOString() });
    try {
      const scan = await scanProjectRoot(project.root);
      const auto = store.get().ws.autoLatest;
      const autoPick = auto ? await pickVersionWithCards(scan.versions, scan.latest) : null;
      const preferred = autoPick && autoPick.version && autoPick.version.path
        ? autoPick.version.path
        : (auto
          ? scan.latest
          : ((scan.versions.find((version) => version.path === project.lastVersionDir) || {}).path || scan.latest));
      setWs({ versions: scan.versions, versionsLatest: scan.latest, versionsRoot: preferred, scanError: '' });
      await loadCards(preferred, { selectLatest: auto, preferredPath: auto ? '' : project.lastCardPath, auto });
      if (autoPick && !autoPick.found) setWs({ cardMissing: noCardsMessage(autoPick, scan.latest) });
    } catch (error) {
      setWs({ scanError: errorText(error) });
    }
    const sharedRoot = project.lastWorldbookRoot || project.lastMvuRoot;
    if (sharedRoot) {
      const wbFile = project.lastWorldbookRoot === sharedRoot ? project.lastWorldbookPath : '';
      await restoreWorldbookSelection(sharedRoot, wbFile);
      const alignedRoot = store.get().wb.root || sharedRoot;
      const mvuFile = project.lastMvuRoot === alignedRoot ? project.lastMvuPath : '';
      await restoreMvuSelection(alignedRoot, mvuFile);
    } else {
      setWb(freshWb());
      setMvu(freshMvu());
    }
    setWs({ busy: false });
    scheduleWorkspaceSave();
    toast('已切換專案：' + project.label);
    return { ok: true, projectId: id };
  }
  async function deleteProject(id) {
    if (store.get().ws.busy) return { ok: false, error: 'busy' };
    const ws = store.get().ws;
    const project = projectById(id);
    if (!project) return { ok: false, error: 'not-found' };
    const remaining = ws.projects.filter((item) => item.id !== id);
    const wasActive = ws.activeProjectId === id;
    setWs({
      projects: remaining,
      activeProjectId: wasActive ? (remaining.length ? remaining[0].id : '') : ws.activeProjectId,
      versions: wasActive ? [] : ws.versions,
      versionsRoot: wasActive ? '' : ws.versionsRoot,
      versionsLatest: wasActive ? '' : ws.versionsLatest,
      cards: wasActive ? [] : ws.cards,
      cardsRoot: wasActive ? '' : ws.cardsRoot,
      cardsLatest: wasActive ? '' : ws.cardsLatest,
      activeCard: wasActive ? null : ws.activeCard,
      cardDetail: wasActive ? null : ws.cardDetail,
      cardInspectBusy: wasActive ? false : ws.cardInspectBusy,
      cardInspectError: wasActive ? '' : ws.cardInspectError,
      scanError: '', cardError: '', cardMissing: '', newAvailable: null,
    });
    scheduleWorkspaceSave();
    toast('已刪除專案：' + project.label + '（不會刪除磁碟檔案）');
    if (wasActive && remaining.length) await switchProject(remaining[0].id);
    if (wasActive && !remaining.length) { setWb(freshWb()); setMvu(freshMvu()); }
    return { ok: true };
  }
  async function switchVersion(path) {
    if (store.get().ws.busy) return { ok: false, error: 'busy' };
    const ws = store.get().ws;
    const project = activeProject();
    const target = workspaceString(path);
    if (!project || !target) return { ok: false, error: 'no-project' };
    if (store.get().wb.dirty || store.get().wb.saving) {
      const message = '世界書還有未儲存修改，未切換版本：' + basename(target);
      setWs({ newAvailable: { kind: 'version', path: target, message }, restoreNotice: message });
      toast(message);
      return { ok: false, error: 'worldbook-dirty' };
    }
    setWs({ busy: true, versionsRoot: target, cardMissing: '', newAvailable: null });
    patchActiveProject({ lastVersionDir: target });
    await loadCards(target, {
      selectLatest: ws.autoLatest,
      preferredPath: ws.autoLatest ? '' : (ws.activeCard && ws.activeCard.file ? ws.activeCard.file.path : ''),
      auto: ws.autoLatest,
    });
    setWs({ busy: false, restoreNotice: '', newAvailable: null });
    scheduleWorkspaceSave();
    return { ok: true };
  }
  async function switchLatest() {
    return refreshLatest({ force: true, manual: true });
  }
  async function switchAutoVersion(target, latest, noCards, pick) {
    setWs({ busy: true, versionsRoot: target, newAvailable: null, restoreNotice: '', cardMissing: '' });
    wsNoticeKey = '';
    patchActiveProject({ lastVersionDir: target });
    await loadCards(target, { selectLatest: true, auto: true });
    setWs({ busy: false });
    scheduleWorkspaceSave();
    if (noCards) {
      const message = noCardsMessage(pick, latest);
      setWs({ cardMissing: message });
      toast(message);
      return { ok: true, switched: true, noCards: true };
    }
    toast(target === latest ? '已切到最新版本：' + basename(target) : '已切到有卡的最新版本：' + basename(target));
    return { ok: true, switched: true };
  }
  async function refreshLatest(options = {}) {
    if (wsRefreshInFlight) return { ok: false, error: 'busy' };
    const s = store.get();
    const ws = s.ws;
    const project = activeProject();
    if (!ws.loaded || ws.restoring || ws.busy || ws.scanBusy || !project) return { ok: false, error: 'not-ready' };
    wsRefreshInFlight = true;
    try {
      const scan = await scanProjectRoot(project.root);
      const latest = scan.latest;
      const current = ws.versionsRoot;
      const newerVersion = !!latest && latest !== current;
      const dirty = s.wb.dirty || s.wb.saving;
      const canAuto = ws.autoLatest || options.force;
      setWs({ versions: scan.versions, versionsLatest: latest, scanError: '' });
      if (newerVersion) {
        const message = '有新版本可用：' + basename(latest) + (dirty ? '（世界書有未儲存修改，未切換）' : '');
        if (dirty) {
          if (wsNoticeKey !== 'version:' + latest) {
            wsNoticeKey = 'version:' + latest;
            setWs({ newAvailable: { kind: 'version', path: latest, message }, restoreNotice: message });
            toast(message);
          }
          return { ok: true, newer: true, switched: false };
        }
        if (canAuto) {
          const pick = await pickVersionWithCards(scan.versions, latest);
          const target = pick.found && pick.version && pick.version.path ? pick.version.path : latest;
          if (pick.found && target === current) {
            const retained = '更高版本沒有識別到卡，保留當前有卡版本：' + basename(current);
            setWs({ cardMissing: retained, newAvailable: null });
            if (wsNoticeKey !== 'no-card:' + latest) {
              wsNoticeKey = 'no-card:' + latest;
              toast(retained);
            }
            return { ok: true, newer: true, switched: false, retained: true };
          }
          return await switchAutoVersion(target, latest, !pick.found, pick);
        }
        if (wsNoticeKey !== 'version:' + latest) {
          wsNoticeKey = 'version:' + latest;
          setWs({ newAvailable: { kind: 'version', path: latest, message } });
        }
        return { ok: true, newer: true, switched: false };
      }
      // 同版本但沒有卡：自動最新繼續向下找有卡的版本（有界）。
      if (canAuto && !dirty && !ws.activeCard) {
        const pick = await pickVersionWithCards(scan.versions, latest);
        if (pick.found && pick.version && pick.version.path && pick.version.path !== current) {
          return await switchAutoVersion(pick.version.path, latest, false, pick);
        }
        if (!pick.found) {
          const message = noCardsMessage(pick, latest);
          setWs({ cardMissing: message, newAvailable: null });
          if (wsNoticeKey !== 'no-card:' + latest) {
            wsNoticeKey = 'no-card:' + latest;
            toast(message);
          }
          return { ok: true, switched: false, noCards: true };
        }
      }
      if (current) {
        const list = await cardListRoot(current);
        const latestCardInfo = await latestCardInFiles(current, list.files);
        const latestCard = latestCardInfo ? latestCardInfo.path : '';
        const currentCard = ws.activeCard && ws.activeCard.file ? ws.activeCard.file.path : '';
        setWs({ cards: list.files, cardsRoot: list.root, cardsLatest: latestCard, cardError: '' });
        if (latestCard && latestCard !== currentCard) {
          if (s.wb.dirty || s.wb.saving) {
            const message = '有新檔案可用：' + basename(latestCard) + '（世界書有未儲存修改，未切換）';
            if (wsNoticeKey !== 'card:' + latestCard) {
              wsNoticeKey = 'card:' + latestCard;
              setWs({ newAvailable: { kind: 'card', path: latestCard, message }, restoreNotice: message });
              toast(message);
            }
            return { ok: true, newerCard: true, switched: false };
          }
          if (ws.autoLatest || options.force) {
            const loaded = await loadCards(current, { selectLatest: true, auto: true });
            scheduleWorkspaceSave();
            const switched = !!loaded.activePath && loaded.activePath !== currentCard;
            if (switched) toast('已切到最新卡檔案：' + basename(loaded.activePath));
            return { ok: true, newerCard: switched, switched, activePath: loaded.activePath };
          }
          if (wsNoticeKey !== 'card:' + latestCard) {
            wsNoticeKey = 'card:' + latestCard;
            setWs({ newAvailable: { kind: 'card', path: latestCard, message: '有新檔案可用：' + basename(latestCard) } });
          }
          return { ok: true, newerCard: true, switched: false };
        }
      }
      if (ws.newAvailable) setWs({ newAvailable: null });
      wsNoticeKey = '';
      return { ok: true };
    } catch (error) {
      setWs({ scanError: errorText(error) });
      if (options.manual) toast('檢查最新版本失敗：' + errorText(error));
      return { ok: false, error: errorText(error) };
    } finally {
      wsRefreshInFlight = false;
    }
  }
  async function toggleAutoLatest() {
    const next = !store.get().ws.autoLatest;
    setWs({ autoLatest: next });
    scheduleWorkspaceSave();
    if (next) await refreshLatest();
    return { ok: true, autoLatest: next };
  }
  async function useCurrentVersionRoot() {
    const ws = store.get().ws;
    const project = activeProject();
    if (ws.busy) return { ok: false, error: 'busy' };
    const root = ws.versionsRoot || (project && project.root) || '';
    if (!root) { setWs({ addError: '先選擇專案或版本目錄。' }); return { ok: false, error: 'no-project' }; }
    setWs({ restoreNotice: '' });
    // 世界書根和變數根是同一個當前版本目錄；openWorldbookRoot 會同步 /mvu/select。
    const result = await openWorldbookRoot(root);
    if (result.ok) {
      patchActiveProject({ lastWorldbookRoot: store.get().wb.root, lastMvuRoot: store.get().mvu.root || '' });
      scheduleWorkspaceSave();
    }
    return result;
  }
  async function useProjectRootForWorldbook() { return useCurrentVersionRoot(); }
  async function useProjectRootForMvu() { return useCurrentVersionRoot(); }

  /* ---------------- 拖 Skill 到輸入框 ---------------- */

  function startSkillDrag(e, name) {
    try {
      e.dataTransfer.setData(SKILL_MIME, name);
      e.dataTransfer.setData('text/plain', '/' + name + ' ');
      e.dataTransfer.effectAllowed = 'copy';
    } catch {}
  }
  function isSkillDrag(e) {
    const types = e.dataTransfer && e.dataTransfer.types;
    return !!types && Array.prototype.indexOf.call(types, SKILL_MIME) >= 0;
  }
  function dropTargetAt(x, y) {
    const card = composerCard();
    if (!card) return null;
    const r = card.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), radius: getComputedStyle(card).borderTopLeftRadius };
  }
  function setDrop(next) {
    const cur = store.get().drop;
    if (!next && !cur) return;
    if (next && cur && next.x === cur.x && next.y === cur.y && next.w === cur.w && next.h === cur.h) return;
    store.set({ drop: next });
  }
  /**
   * 文件級捕獲：拖著神之手的 Skill 卡經過輸入框時由這裡接住，插入 `/名字 `。
   * 輸入框自己的拖放處理收不到這次拖動，所以不會重複插入。
   */
  function installDropTarget() {
    const over = (e) => {
      if (!isSkillDrag(e)) return;
      const t = dropTargetAt(e.clientX, e.clientY);
      setDrop(t);
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      try { e.dataTransfer.dropEffect = 'copy'; } catch {}
    };
    const leave = (e) => { if (isSkillDrag(e) && !dropTargetAt(e.clientX, e.clientY)) setDrop(null); };
    const drop = (e) => {
      if (!isSkillDrag(e)) return;
      const t = dropTargetAt(e.clientX, e.clientY);
      setDrop(null);
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      let name = '';
      try { name = e.dataTransfer.getData(SKILL_MIME); } catch {}
      if (name) insertSkill(name);
    };
    const end = () => setDrop(null);
    document.addEventListener('dragenter', over, true);
    document.addEventListener('dragover', over, true);
    document.addEventListener('dragleave', leave, true);
    document.addEventListener('drop', drop, true);
    document.addEventListener('dragend', end, true);
    return () => {
      document.removeEventListener('dragenter', over, true);
      document.removeEventListener('dragover', over, true);
      document.removeEventListener('dragleave', leave, true);
      document.removeEventListener('drop', drop, true);
      document.removeEventListener('dragend', end, true);
    };
  }

  /* ---------------- 輪盤的位置：左側欄和對話欄之間的空白 ---------------- */

  /**
   * 左邊 = 會話檢視左緣（左側欄右緣），右邊 = 輸入框卡片左緣（對話正文列在它右側），
   * 上邊 = 會話頭底邊，下邊 = 會話檢視底邊。只按結構量，不依賴 DSH 的樣式類名。
   */
  function measureGutter() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let anchor = [...document.querySelectorAll('.gh2-souldock')].find((el) => el.getBoundingClientRect().width > 0) || null;
    if (!anchor) {
      const card = composerCard();
      if (card && card.getBoundingClientRect().width > 0) anchor = card;
    }
    if (!anchor) return { reason: 'no-composer' };
    const cardLeft = anchor.getBoundingClientRect().left;
    // 輸入框往上第一個佔半屏以上的容器就是會話檢視（對話滾動區）
    let root = null;
    let rr = null;
    for (let el = anchor.parentElement, i = 0; el && el !== document.body && i < 30; el = el.parentElement, i++) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > vh * 0.5) { root = el; rr = r; break; }
    }
    if (!root) return { reason: 'no-view' };
    let top = rr.top;
    const header = root.querySelector('header');
    if (header) {
      const hr = header.getBoundingClientRect();
      if (hr.height > 0 && hr.top - rr.top < 24 && hr.bottom - rr.top < vh * 0.3) top = hr.bottom;
    }
    const left = Math.max(0, rr.left) + EDGE;
    const right = Math.min(cardLeft, vw) - 12;
    const bottom = Math.min(rr.bottom, vh) - EDGE;
    top = Math.max(0, top) + EDGE;
    const g = { x: Math.round(left), y: Math.round(top), w: Math.round(right - left), h: Math.round(bottom - top), root, anchor };
    g.reason = g.w < WHEEL.minW ? 'narrow' : g.h < WHEEL.minH ? 'short' : 'ok';
    if (g.reason !== 'ok') return g;
    // 這塊空白裡不能有別的東西（例如“軌跡”頁籤的表格橫跨整個寬度、浮動面板蓋在這裡）：
    // 抽查的每個點，最上面的元素必須是會話檢視本身、它的外層，或橫跨到對話列、自身沒有文字的大容器
    const spans = (el, px) => {
      const r = el.getBoundingClientRect();
      return r.left <= px - 1 && r.right >= cardLeft + 100;
    };
    const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    for (const fx of [0.1, 0.5, 0.9]) {
      for (const fy of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const px = left + (right - left) * fx;
        const py = top + (bottom - top) * fy;
        const el = document.elementsFromPoint(px, py).find((e) => !(e.closest && e.closest('.gh2-root')));
        if (!el || el.contains(root)) continue;
        if (root.contains(el) && spans(el, px) && !ownText(el)) continue;
        g.reason = 'occupied';
        g.blocker = el.tagName.toLowerCase() + ':' + String(el.textContent || '').trim().slice(0, 16);
        return g;
      }
    }
    return g;
  }

  /* ---------------- 樣式 ---------------- */

  const LIVE = 'light-dark(#0f766e,#6fd8d2)';
  const GOLD = 'light-dark(#8a6420,#d8b36a)';
  const CSS = `
.gh2-root{box-sizing:border-box;font-family:var(--dsh-font-family-text,var(--dsw-font-family,system-ui,sans-serif));font-size:var(--dsh-content-font-size,14px);line-height:1.5;color:var(--dsw-alias-label-primary,#e9e9ec)}
.gh2-root *,.gh2-root *::before,.gh2-root *::after{box-sizing:border-box}
.gh2-win{position:fixed;z-index:60;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#1e1e22);border:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));border-radius:var(--dsw-radius-lg,12px);box-shadow:var(--dsw-elevation-prominent,0 18px 48px rgba(0,0,0,.4));overflow:hidden;outline:none}
.gh2-busy,.gh2-busy *{user-select:none!important}
.gh2-bar{flex:none;display:flex;align-items:center;gap:8px;height:42px;padding:0 6px 0 12px;cursor:grab;user-select:none;touch-action:none;border-bottom:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08))}
.gh2-busy .gh2-bar{cursor:grabbing}
.gh2-brand{display:inline-flex;flex:none;color:${GOLD}}
.gh2-title{font-size:.93em;font-weight:600;color:var(--dsw-alias-label-primary,#e9e9ec);white-space:nowrap}
.gh2-spacer{flex:1}
.gh2-iconbtn{width:28px;padding:0;flex:none;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-iconbtn svg{width:15px;height:15px}
.gh2-hbtn{position:relative}
.gh2-hbtn[aria-pressed="true"]{background:var(--dsw-alias-interactive-bg-active,rgba(255,255,255,.1));color:var(--dsw-alias-label-primary,#e9e9ec)}
.gh2-hbtn.is-live{color:${LIVE}}
.gh2-wheelbtn[aria-pressed="false"]{color:var(--dsw-alias-label-caption,rgba(255,255,255,.35))}
.gh2-wheelbtn.is-off .gh2-wheelico{opacity:.7}
.gh2-ping{position:absolute;top:4px;right:4px;width:6px;height:6px;border-radius:50%;background:${LIVE};box-shadow:0 0 0 2px var(--dsw-alias-bg-base,#151517)}
@media (prefers-reduced-motion:no-preference){.gh2-ping{animation:gh2-ping 1.6s ease-in-out infinite}}
@keyframes gh2-ping{50%{opacity:.35}}
.gh2-tabs{flex:none;padding:10px 12px 2px}
.gh2-seg{max-width:720px;width:100%}
.gh2-seg [role="tab"]{white-space:nowrap}
.gh2-body{flex:1;min-height:0;overflow:auto;padding:8px 12px 18px;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l2,rgba(255,255,255,.2)) transparent}
.gh2-grip{position:absolute;right:2px;bottom:2px;width:16px;height:16px;display:grid;place-items:center;cursor:nwse-resize;touch-action:none;color:var(--dsw-alias-label-caption,rgba(255,255,255,.35))}
@media (pointer:coarse){.gh2-grip{display:none}}
.gh2-tools{display:flex;align-items:center;gap:8px;margin:6px 0 8px;flex-wrap:wrap}
.gh2-search{flex:1 1 180px;min-width:150px}
.gh2-summary{margin:0 0 6px;font-size:.84em;color:var(--dsw-alias-label-tertiary,#8b8b92)}
.gh2-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.gh2-row{border-radius:var(--dsw-radius-md,10px)}
.gh2-row.is-open{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.04))}
.gh2-rowmain{all:unset;-webkit-user-drag:element;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;width:100%;padding:8px 10px;border-radius:var(--dsw-radius-md,10px);cursor:pointer}
.gh2-rowmain:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
.gh2-rowmain:focus-visible,.gh2-recent button:focus-visible,.gh2-soulpill:focus-visible,.gh2-wcard:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,#6aa0ff);outline-offset:-2px}
.gh2-rowtext{display:flex;flex-direction:column;min-width:0;gap:1px}
.gh2-nameline{display:flex;align-items:center;gap:6px;min-width:0}
.gh2-rowtag{flex:none;font-size:.72em;line-height:1;padding:3px 6px;border-radius:999px;border:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));color:var(--dsw-alias-label-secondary,#b5b5bb);white-space:nowrap}
.gh2-name{font-family:var(--dsh-font-family-code,ui-monospace,Consolas,monospace);font-size:.9em;color:var(--dsw-alias-label-primary,#e9e9ec);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.gh2-desc{font-size:.84em;color:var(--dsw-alias-label-tertiary,#8b8b92);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gh2-row.is-open .gh2-desc{white-space:normal}
.gh2-meta{font-size:.8em;color:var(--dsw-alias-label-tertiary,#8b8b92);white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
.gh2-row.is-live .gh2-meta{color:${LIVE}}
.gh2-rowmore{display:flex;flex-direction:column;gap:8px;padding:0 10px 10px}
.gh2-rowdetail{margin:0;font-size:.84em;line-height:1.65;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-rowactions{display:flex;gap:8px;flex-wrap:wrap}
.gh2-rowmore button:disabled{opacity:.5;cursor:default}
.gh2-recent{margin-top:16px;padding-top:12px;border-top:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08))}
.gh2-recent h4{margin:0 0 6px;padding:0 10px;font-size:.84em;font-weight:600;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-recent ul{list-style:none;margin:0;padding:0}
.gh2-recent button{all:unset;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;padding:5px 10px;border-radius:var(--dsw-radius-sm,8px);cursor:pointer}
.gh2-recent button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
.gh2-empty{padding:28px 6px;max-width:440px}
.gh2-empty h3{margin:0 0 6px;font-size:1em;font-weight:600;color:var(--dsw-alias-label-primary,#e9e9ec)}
.gh2-empty p{margin:0 0 12px;font-size:.9em;line-height:1.7;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-none{margin:12px 10px;font-size:.88em;color:var(--dsw-alias-label-tertiary,#8b8b92)}
.gh2-idle{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-caption,rgba(255,255,255,.35))}
.gh2-wheel{position:fixed;z-index:10;overflow:hidden;outline:none;touch-action:none;user-select:none;-webkit-user-select:none}
.gh2-wheel:focus-visible{outline:1px solid light-dark(rgba(138,100,32,.5),rgba(216,179,106,.45));outline-offset:-4px;border-radius:var(--dsw-radius-sm,8px)}
.gh2-wheel.is-spinning{cursor:grabbing}
.gh2-plate{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.gh2-ring{fill:none;stroke:light-dark(rgba(138,100,32,.38),rgba(216,179,106,.46));stroke-width:1;stroke-dasharray:3 3}
.gh2-ring.is-inner{stroke:light-dark(rgba(0,0,0,.07),rgba(239,232,218,.08));stroke-dasharray:none}
.gh2-ring.is-accent{stroke:light-dark(rgba(15,118,110,.26),rgba(111,216,210,.32));stroke-dasharray:none}
.gh2-whead{position:absolute;top:12px;left:${WHEEL.left}px;right:4px;z-index:40;display:flex;align-items:center;gap:6px;font-size:max(10px,.72em);letter-spacing:.06em;color:var(--dsw-alias-label-tertiary,#8b8b92);white-space:nowrap;overflow:hidden;pointer-events:none}
.gh2-whead b{font-weight:600;letter-spacing:.08em;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-whead[data-round="skills"] .gh2-wh-features,.gh2-whead[data-round="skills"] .gh2-wh-other,
.gh2-whead[data-round="features"] .gh2-wh-skills,.gh2-whead[data-round="features"] .gh2-wh-other,
.gh2-whead[data-round="other"] .gh2-wh-skills,.gh2-whead[data-round="other"] .gh2-wh-features{display:none}
.gh2-whint{color:${GOLD}}
.gh2-wnote{position:absolute;left:${WHEEL.left}px;right:6px;top:40px;z-index:40;font-size:.86em;line-height:1.6;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-wnote p{margin:0 0 8px}
.gh2-wcard{all:unset;-webkit-user-drag:element;box-sizing:border-box;position:absolute;left:0;top:0;display:block;width:var(--gh2-card-w,180px);padding:10px;border:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-layer-1,#232324);box-shadow:var(--dsw-elevation-panel,0 8px 24px rgba(0,0,0,.32));color:var(--dsw-alias-label-primary,#e9e9ec);text-align:left;cursor:pointer;visibility:hidden;transform-origin:center;will-change:transform,opacity;transition:border-color .15s,background-color .15s}
.gh2-wcard:hover{border-color:light-dark(rgba(138,100,32,.5),rgba(216,179,106,.42));background:var(--dsw-alias-bg-layer-2,#2a2a2c)}
.gh2-wcard:active{cursor:grabbing}
.gh2-wcard.is-live{border-color:light-dark(rgba(15,118,110,.55),rgba(111,216,210,.5));background:linear-gradient(160deg,light-dark(rgba(15,118,110,.09),rgba(111,216,210,.11)),var(--dsw-alias-bg-layer-1,#232324) 70%);box-shadow:var(--dsw-elevation-panel,0 8px 24px rgba(0,0,0,.32)),0 0 0 1px light-dark(rgba(15,118,110,.14),rgba(111,216,210,.14))}
.gh2-wcard.is-feature{border-style:dashed;background:var(--dsw-alias-bg-base,#1b1b1c);box-shadow:none}
.gh2-wtop{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:max(10px,.71em);line-height:1.3;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary,#8b8b92);white-space:nowrap}
.gh2-wcard.is-live .gh2-wtop{color:${LIVE}}
.gh2-wlabel{display:inline-flex;align-items:center;gap:5px;min-width:0;overflow:hidden;text-overflow:ellipsis}
.gh2-wdot{flex:none;width:5px;height:5px;border-radius:50%;background:currentColor;box-shadow:0 0 6px currentColor}
.gh2-wname{display:block;margin-top:5px;font-family:var(--dsh-font-family-code,ui-monospace,Consolas,monospace);font-size:.93em;font-weight:600;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gh2-wcard.is-feature .gh2-wname{font-family:inherit}
.gh2-wheel.is-compact .gh2-wname{white-space:normal;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;min-height:2.5em}
.gh2-wheel.is-compact .gh2-wmeta{display:none}
.gh2-wdesc{display:block;margin-top:3px;font-size:max(11px,.78em);line-height:1.4;color:var(--dsw-alias-label-tertiary,#8b8b92);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gh2-wmeta{display:block;margin-top:6px;font-size:max(10px,.71em);line-height:1.3;color:var(--dsw-alias-label-caption,rgba(255,255,255,.4));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gh2-whover{position:fixed;z-index:65;width:340px;max-width:calc(100vw - 24px);padding:12px 14px;border:.5px solid light-dark(rgba(138,100,32,.45),rgba(216,179,106,.38));border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1,#232324);box-shadow:var(--dsw-elevation-prominent,0 18px 48px rgba(0,0,0,.4));pointer-events:none;font-size:.86em;line-height:1.65}
.gh2-hk{display:flex;justify-content:space-between;gap:8px;font-size:max(10px,.84em);letter-spacing:.04em;color:var(--dsw-alias-label-tertiary,#8b8b92)}
.gh2-hk .is-live{color:${LIVE}}
.gh2-whover h4{margin:4px 0 0;font-family:var(--dsh-font-family-code,ui-monospace,Consolas,monospace);font-size:1.04em;font-weight:600;line-height:1.35;color:var(--dsw-alias-label-primary,#e9e9ec);word-break:break-all}
.gh2-whover p{margin:6px 0 0;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-hnote{margin-top:6px;font-size:.9em;color:var(--dsw-alias-label-tertiary,#8b8b92)}
.gh2-hlast{margin-top:8px;font-size:.92em;color:var(--dsw-alias-label-tertiary,#8b8b92)}
.gh2-hhint{margin-top:8px;padding-top:8px;border-top:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));font-size:.92em;color:${GOLD}}
.gh2-drophint{position:fixed;z-index:12;border:1.5px dashed light-dark(rgba(138,100,32,.7),rgba(216,179,106,.75));background:light-dark(rgba(138,100,32,.05),rgba(216,179,106,.05));pointer-events:none}
.gh2-souldock{position:relative;height:0;width:calc(100% - 2 * var(--dsh-composer-side-clearance,0px));max-width:var(--dsh-composer-card-max-width,100%);margin:0 auto;z-index:4}
.gh2-soul{position:absolute;right:0;bottom:8px;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.gh2-soulpill{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 9px 0 10px;border-radius:13px;border:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));background:var(--dsw-specific-menu,var(--dsw-alias-bg-layer-1,#1e1e22));backdrop-filter:var(--dsw-menu-backdrop-filter,none);box-shadow:var(--dsw-elevation-panel,0 4px 16px rgba(0,0,0,.25));color:var(--dsw-alias-label-secondary,#b5b5bb);font:inherit;font-size:12px;line-height:1;white-space:nowrap;cursor:pointer}
.gh2-soulpill:hover{color:var(--dsw-alias-label-primary,#e9e9ec)}
.gh2-soulpill:disabled{cursor:default;opacity:.6}
.gh2-soulpill.is-on{color:var(--dsw-alias-label-primary,#e9e9ec)}
.gh2-soulpill.is-off{color:var(--dsw-alias-label-tertiary,#8b8b92)}
.gh2-soulpill svg{width:12px;height:12px;opacity:.7}
.gh2-souldot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-caption,rgba(255,255,255,.35))}
.gh2-soulpill.is-on .gh2-souldot{background:light-dark(#b8862f,#d8b36a)}
.gh2-soulpop{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;width:max-content;max-width:min(440px,calc(100vw - 32px));padding:6px;border-radius:var(--dsw-radius-lg,12px);border:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));background:var(--dsw-specific-menu,var(--dsw-alias-bg-layer-1,#1e1e22));backdrop-filter:var(--dsw-menu-backdrop-filter,none);box-shadow:var(--dsw-elevation-prominent,0 18px 48px rgba(0,0,0,.4))}
.gh2-soulnote{margin:2px 4px;max-width:300px;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-fbtn{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:28px;padding:0 10px;border:0;border-radius:var(--dsw-radius-sm,8px);background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}
.gh2-fbtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
.gh2-fbtn.is-outline{border:.5px solid var(--dsw-alias-border-l3,rgba(255,255,255,.2))}
.gh2-fpill{height:26px;padding:0 10px;border-radius:13px;border:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));background:transparent;color:var(--dsw-alias-label-secondary,#b5b5bb);font:inherit;font-size:12px;cursor:pointer}
.gh2-fpill[aria-pressed="true"]{color:var(--dsw-alias-label-primary,#e9e9ec);background:var(--dsw-alias-interactive-bg-active,rgba(255,255,255,.1))}
.gh2-finput{flex:1 1 180px;min-width:150px;height:30px;padding:0 10px;border-radius:var(--dsw-radius-sm,8px);border:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));background:transparent;color:inherit;font:inherit;font-size:.9em}
.gh2-ftabs{display:flex;gap:4px}
.gh2-ftab{white-space:nowrap}
.gh2-ftab{height:28px;padding:0 12px;border:0;border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-secondary,#b5b5bb);font:inherit;font-size:.88em;cursor:pointer}
.gh2-ftab[aria-selected="true"]{background:var(--dsw-alias-interactive-bg-active,rgba(255,255,255,.1));color:var(--dsw-alias-label-primary,#e9e9ec)}
.gh2-m5{display:flex;flex-direction:column;gap:10px;min-width:0}
.gh2-m5-lead{margin:0;font-size:.9em;line-height:1.65;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-m5-note{margin:0;font-size:.82em;line-height:1.6;color:var(--dsw-alias-label-tertiary,#8b8b92)}
.gh2-m5-meta{font-size:.8em;color:var(--dsw-alias-label-tertiary,#8b8b92);min-width:0;overflow-wrap:anywhere}
.gh2-m5-warn{margin:0;padding:8px 10px;border-radius:var(--dsw-radius-sm,8px);border:.5px solid light-dark(rgba(138,100,32,.38),rgba(216,179,106,.42));background:light-dark(rgba(138,100,32,.06),rgba(216,179,106,.08));font-size:.84em;line-height:1.6;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-m5-error{margin:0;padding:8px 10px;border-radius:var(--dsw-radius-sm,8px);border:.5px solid light-dark(rgba(180,35,24,.4),rgba(255,138,128,.45));background:light-dark(rgba(180,35,24,.07),rgba(255,138,128,.09));font-size:.84em;line-height:1.6;color:light-dark(#a4261b,#ffaaa0);overflow-wrap:anywhere}
.gh2-m5-ok{margin:0;padding:8px 10px;border-radius:var(--dsw-radius-sm,8px);border:.5px solid light-dark(rgba(20,108,67,.35),rgba(125,219,163,.38));background:light-dark(rgba(20,108,67,.06),rgba(125,219,163,.08));font-size:.82em;line-height:1.6;color:light-dark(#146c43,#8de3b0);overflow-wrap:anywhere}
.gh2-m5-ok-inline{font-size:.82em;color:light-dark(#146c43,#8de3b0)}
.gh2-m5-dirty{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:11px;border:.5px solid light-dark(rgba(138,100,32,.45),rgba(216,179,106,.5));font-size:.78em;color:${GOLD};white-space:nowrap}
.gh2-m5-chip{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:11px;border:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));font-size:.78em;color:var(--dsw-alias-label-secondary,#b5b5bb);white-space:nowrap}
.gh2-m5-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.gh2-m5-actions .gh2-finput{flex:1 1 260px;min-width:170px}
.gh2-m5-rowhead{display:flex;align-items:center;gap:8px;font-size:.9em;min-width:0}
.gh2-mono{font-family:var(--dsh-font-family-code,ui-monospace,Consolas,monospace);font-size:.88em;overflow-wrap:anywhere}
.gh2-m5-field{display:flex;flex-direction:column;gap:4px;min-width:0;font-size:.86em;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-m5-field .gh2-finput{flex:0 0 auto;width:100%;min-width:0;height:30px}
.gh2-m5-ftextarea{width:100%;min-height:170px;resize:vertical;padding:8px 10px;border-radius:var(--dsw-radius-sm,8px);border:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));background:transparent;color:var(--dsw-alias-label-primary,#e9e9ec);font:inherit;font-size:.92em;line-height:1.6}
.gh2-m5-ftextarea:focus{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,#6aa0ff);outline-offset:-1px}
.gh2-m5-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.gh2-m5-version{display:flex;align-items:center;gap:10px;min-width:0;padding:5px 8px;border-radius:var(--dsw-radius-sm,8px);font-size:.82em;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-m5-version:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
.gh2-m5-version .gh2-mono{flex:1;min-width:0}
.gh2-m5-raw{margin:0;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px);padding:6px 8px}
.gh2-m5-raw summary{cursor:pointer;font-size:.84em;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-m5-pre{max-height:260px;overflow:auto;margin:6px 0 0;padding:8px;border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-base,#151517);font-family:var(--dsh-font-family-code,ui-monospace,Consolas,monospace);font-size:.76em;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-wb-files{display:flex;flex-wrap:wrap;gap:6px;max-height:150px;overflow:auto;padding:6px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px)}
.gh2-wb-file{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:8px;max-width:100%;padding:4px 8px;border-radius:var(--dsw-radius-sm,8px);border:.5px solid transparent;font-size:.82em;color:var(--dsw-alias-label-secondary,#b5b5bb);cursor:pointer}
.gh2-wb-file:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
.gh2-wb-file.is-active{border-color:light-dark(rgba(138,100,32,.5),rgba(216,179,106,.5));color:var(--dsw-alias-label-primary,#e9e9ec);background:light-dark(rgba(138,100,32,.06),rgba(216,179,106,.08))}
.gh2-wb-file:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,#6aa0ff);outline-offset:-2px}
.gh2-wb-fname{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gh2-wb-filehead{padding-top:2px}
.gh2-wb-grid{display:grid;grid-template-columns:minmax(150px,.8fr) minmax(0,2fr);gap:10px;min-height:260px}
.gh2-wb-listbox,.gh2-wb-editor{display:flex;flex-direction:column;gap:8px;min-width:0}
.gh2-wb-list{list-style:none;margin:0;padding:4px;display:flex;flex-direction:column;gap:2px;max-height:420px;overflow:auto;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px)}
.gh2-wb-entry{all:unset;box-sizing:border-box;display:flex;flex-direction:column;gap:1px;width:100%;padding:6px 8px;border-radius:var(--dsw-radius-sm,8px);cursor:pointer;font-size:.84em;color:var(--dsw-alias-label-primary,#e9e9ec)}
.gh2-wb-entry:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
.gh2-wb-entry.is-open{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.04));box-shadow:inset 2px 0 0 ${GOLD}}
.gh2-wb-entry:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,#6aa0ff);outline-offset:-2px}
.gh2-wb-entrytitle{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gh2-json-tree{font-family:var(--dsh-font-family-code,ui-monospace,Consolas,monospace);font-size:.8em;line-height:1.55;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px);padding:8px;max-height:420px;overflow:auto;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-json-tree details{margin-left:14px}
.gh2-json-tree summary{cursor:pointer}
.gh2-json-leaf{margin-left:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gh2-json-key{color:${GOLD}}
.gh2-json-type{color:var(--dsw-alias-label-caption,rgba(255,255,255,.4))}
.gh2-json-val{color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-mvu{display:flex;flex-direction:column;gap:10px;min-width:0;padding:10px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-bg-base,rgba(255,255,255,.02))}
.gh2-mvu-note{color:${GOLD}}
.gh2-mvu-meta{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:.84em;line-height:1.6;color:var(--dsw-alias-label-secondary,#b5b5bb);min-width:0;overflow-wrap:anywhere}
.gh2-mvu-meta b{font-weight:600;color:var(--dsw-alias-label-tertiary,#8b8b92)}
.gh2-mvu-tree{font-family:var(--dsh-font-family-code,ui-monospace,Consolas,monospace);font-size:.82em;line-height:1.6;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px);padding:8px;max-height:420px;overflow:auto;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-mvu-node{margin-left:14px}
.gh2-mvu-node > summary{cursor:pointer;list-style-position:outside}
.gh2-mvu-leaf{display:flex;flex-wrap:wrap;gap:2px 10px;margin-left:14px;min-width:0}
.gh2-mvu-key{color:${GOLD};overflow-wrap:anywhere}
.gh2-mvu-key.is-star{color:${LIVE}}
.gh2-mvu-type{padding:0 5px;border-radius:5px;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));font-size:.94em;color:var(--dsw-alias-label-secondary,#b5b5bb);white-space:nowrap}
.gh2-mvu-default{color:var(--dsw-alias-label-caption,rgba(255,255,255,.45));overflow-wrap:anywhere}
.gh2-mvu-warnings{margin:0;padding:6px 10px 6px 24px;border-radius:var(--dsw-radius-sm,8px);border:.5px solid light-dark(rgba(138,100,32,.35),rgba(216,179,106,.4));background:light-dark(rgba(138,100,32,.06),rgba(216,179,106,.08));font-size:.8em;line-height:1.6;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-mvu-warnings li{margin:0}
.gh2-mvu-sep{height:1px;margin:2px 0;background:var(--dsw-alias-border-l1,rgba(255,255,255,.08))}
.gh2-wb-json{display:flex;flex-direction:column;gap:8px;min-width:0}
.gh2-card-mvu{border-color:light-dark(rgba(138,100,32,.3),rgba(216,179,106,.36));background:light-dark(rgba(138,100,32,.035),rgba(216,179,106,.045))}
.gh2-card-mvu.is-focus{outline:2px solid var(--dsw-focus-ring-color,#6aa0ff);outline-offset:2px}
.gh2-card-wb{display:flex;flex-direction:column;gap:6px;min-width:0;padding:10px;border:.5px solid light-dark(rgba(138,100,32,.3),rgba(216,179,106,.36));border-left:2px solid ${GOLD};border-radius:var(--dsw-radius-md,10px);background:light-dark(rgba(138,100,32,.035),rgba(216,179,106,.045))}
.gh2-card-wb-fold > summary,.gh2-card-wb-summary{cursor:pointer;display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:.9em;list-style-position:outside}
.gh2-card-wb-list{display:flex;flex-direction:column;gap:4px;margin-top:8px;max-height:320px;overflow:auto}
.gh2-card-wb-entry{margin:0;padding:5px 8px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-base,rgba(255,255,255,.02))}
.gh2-card-wb-entry > summary{cursor:pointer;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;font-size:.84em}
.gh2-card-wb-entrytitle{font-weight:600;color:var(--dsw-alias-label-primary,#e9e9ec)}
.gh2-card-wb-key{color:${GOLD};font-size:.82em;overflow-wrap:anywhere}
.gh2-card-wb-content{margin:6px 0 0;padding:8px;border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-base,#151517);font-family:var(--dsh-font-family-code,ui-monospace,Consolas,monospace);font-size:.8em;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-card-scripts{display:flex;flex-direction:column;gap:6px;min-width:0;padding:8px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px)}
.gh2-card-script-list{display:flex;flex-direction:column;gap:4px;max-height:220px;overflow:auto}
.gh2-card-script{padding:6px 8px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-base,rgba(255,255,255,.02))}
.gh2-card-script-head{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:.86em;color:var(--dsw-alias-label-primary,#e9e9ec)}
.gh2-var-page{display:flex;flex-direction:column;gap:10px;min-width:0}
.gh2-var-manual{display:flex;flex-direction:column;gap:6px;min-width:0;padding:8px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-base,rgba(255,255,255,.02))}
.gh2-var-modebar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}
.gh2-var-modes{display:flex;flex-wrap:wrap;gap:4px}
.gh2-var-mode.is-active{border-color:light-dark(rgba(138,100,32,.45),rgba(216,179,106,.55));color:${GOLD};background:light-dark(rgba(138,100,32,.08),rgba(216,179,106,.1));font-weight:700}
.gh2-var-compare,.gh2-var-run{display:flex;flex-direction:column;gap:10px;min-width:0}
.gh2-var-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-width:0}
.gh2-var-textarea{width:100%;min-height:120px;resize:vertical;padding:8px 10px;border-radius:var(--dsw-radius-sm,8px);border:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));background:var(--dsw-alias-bg-base,#151517);color:var(--dsw-alias-label-primary,#e9e9ec);font-family:var(--dsh-font-family-code,ui-monospace,Consolas,monospace);font-size:.82em;line-height:1.55}
.gh2-var-textarea:focus{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,#6aa0ff);outline-offset:-1px}
.gh2-var-dialect{display:inline-flex;align-items:center;gap:6px;font-size:.84em;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-var-dialect select{height:30px;padding:0 8px;border-radius:var(--dsw-radius-sm,8px);border:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));background:transparent;color:var(--dsw-alias-label-primary,#e9e9ec);font:inherit;font-size:.9em}
.gh2-var-result{display:flex;flex-direction:column;gap:10px;min-width:0;padding:10px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-bg-base,rgba(255,255,255,.02))}
.gh2-var-resultblock{display:flex;flex-direction:column;gap:5px;min-width:0;padding:8px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px)}
.gh2-var-resultlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px;max-height:220px;overflow:auto;font-size:.8em;line-height:1.5;color:var(--dsw-alias-label-secondary,#b5b5bb);overflow-wrap:anywhere}
.gh2-var-resultlist li{padding:4px 6px;border-radius:5px;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.04))}
.gh2-var-summary{display:flex;flex-wrap:wrap;gap:6px}
.gh2-var-check-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;max-height:360px;overflow:auto}
.gh2-var-check{display:grid;grid-template-columns:auto minmax(120px,.28fr) minmax(0,1fr);align-items:start;gap:8px;padding:5px 7px;border-radius:6px;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.04));font-size:.8em;line-height:1.5;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-var-checkstatus{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));font-size:.9em;white-space:nowrap}
.gh2-var-check[data-status="pass"] .gh2-var-checkstatus{color:light-dark(#146c43,#8de3b0);border-color:light-dark(rgba(20,108,67,.35),rgba(125,219,163,.38))}
.gh2-var-check[data-status="observed"] .gh2-var-checkstatus{color:${GOLD};border-color:light-dark(rgba(138,100,32,.45),rgba(216,179,106,.5))}
.gh2-var-check[data-status="not_triggered"] .gh2-var-checkstatus,.gh2-var-check[data-status="not_run"] .gh2-var-checkstatus{color:var(--dsw-alias-label-tertiary,#8b8b92)}
.gh2-var-raw{margin:0;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px);padding:6px 8px}
.gh2-var-raw summary{cursor:pointer;font-size:.84em;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-var-schema-tree-block{display:flex;flex-direction:column;gap:5px;min-width:0;padding:8px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px)}
.gh2-var-schema-tree{min-height:80px;max-height:300px;overflow:auto;padding:4px;border-radius:6px;background:var(--dsw-alias-bg-base,rgba(0,0,0,.14));scrollbar-width:thin}
.gh2-var-schema-tree-row{display:flex;align-items:center;gap:7px;min-height:30px;padding:4px 7px;border-radius:5px;font-size:.8em;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-var-schema-tree-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.05))}
.gh2-var-ruleentries{display:flex;flex-direction:column;gap:6px;max-height:380px;overflow:auto;padding-right:2px;scrollbar-width:thin}
.gh2-var-ruleentry{display:flex;flex-direction:column;gap:4px;padding:6px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:6px;background:var(--dsw-alias-bg-base,rgba(0,0,0,.1))}
.gh2-var-ruleentry > span{font-size:.78em;color:var(--dsw-alias-label-tertiary,#8b8b92);overflow-wrap:anywhere}
.gh2-var-ruleentry .gh2-var-textarea{min-height:88px}
.gh2-var-writebar{display:flex;flex-direction:column;gap:8px;min-width:0;padding:8px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-base,rgba(255,255,255,.02))}
.gh2-var-writehead{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.gh2-var-writeinfo{display:flex;align-items:baseline;flex-wrap:wrap;gap:7px;min-width:0}
.gh2-var-writeinfo > span{min-width:0;overflow-wrap:anywhere}
.gh2-var-writeconfirm{display:flex;flex-direction:column;gap:6px;padding:8px;border:.5px solid light-dark(rgba(138,100,32,.4),rgba(216,179,106,.45));border-radius:6px;background:light-dark(rgba(138,100,32,.05),rgba(216,179,106,.06))}
.gh2-var-writeconfirm p{margin:0;font-size:.82em;line-height:1.5;color:var(--dsw-alias-label-secondary,#b5b5bb);overflow-wrap:anywhere}
.gh2-var-writeresult{display:flex;flex-direction:column;gap:5px;padding:8px;border:.5px solid light-dark(rgba(20,108,67,.35),rgba(125,219,163,.35));border-radius:6px;background:light-dark(rgba(20,108,67,.04),rgba(125,219,163,.05))}
.gh2-var-writeresult p{display:flex;gap:6px;flex-wrap:wrap;margin:0;font-size:.82em;line-height:1.5;color:var(--dsw-alias-label-secondary,#b5b5bb);overflow-wrap:anywhere}
.gh2-var-writeresult code{white-space:pre-wrap;overflow-wrap:anywhere}
@media (max-width:760px){.gh2-var-two{grid-template-columns:1fr}.gh2-var-check{grid-template-columns:auto minmax(90px,.35fr) minmax(0,1fr)}}
.gh2-var-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.gh2-var-toolbar .gh2-finput{flex:1 1 250px;min-width:170px;height:30px}
.gh2-var-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(220px,.8fr);gap:10px;min-height:380px}
.gh2-var-tablewrap{min-width:0;max-height:520px;overflow:auto;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-bg-base,rgba(255,255,255,.02))}
.gh2-var-table{width:100%;border-collapse:collapse;font-size:.82em;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-var-table th{position:sticky;top:0;z-index:1;text-align:left;padding:7px 8px;background:var(--dsw-alias-bg-layer-1,#1e1e22);border-bottom:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));font-weight:600;color:var(--dsw-alias-label-tertiary,#8b8b92);white-space:nowrap}
.gh2-var-table td{padding:6px 8px;border-bottom:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));vertical-align:top;min-width:0;overflow-wrap:anywhere}
.gh2-var-row{cursor:pointer}
.gh2-var-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
.gh2-var-row.is-selected{background:light-dark(rgba(138,100,32,.08),rgba(216,179,106,.1));box-shadow:inset 2px 0 0 ${GOLD}}
.gh2-var-row.is-focus{outline:2px solid var(--dsw-focus-ring-color,#6aa0ff);outline-offset:-2px}
.gh2-var-path{min-width:210px}
.gh2-var-path > *{vertical-align:middle}
.gh2-var-chev{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:16px;height:20px;margin-right:2px;color:${GOLD};cursor:pointer;font-size:.9em}
.gh2-var-chev.is-empty{cursor:default;color:var(--dsw-alias-label-caption,rgba(255,255,255,.35))}
.gh2-var-chev:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#6aa0ff);outline-offset:-2px}
.gh2-var-indent{display:inline-block;min-width:0;overflow-wrap:anywhere}
.gh2-var-detail{display:flex;flex-direction:column;gap:8px;min-width:0;padding:10px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-bg-base,rgba(255,255,255,.02))}
.gh2-var-fields{display:flex;flex-direction:column;gap:7px}
.gh2-var-value{padding:5px 8px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px);font-size:.82em;color:var(--dsw-alias-label-secondary,#b5b5bb);overflow-wrap:anywhere}
.gh2-var-value.mono{font-family:var(--dsh-font-family-code,ui-monospace,Consolas,monospace)}
.gh2-var-visual{min-width:0;min-height:460px;display:grid;grid-template-columns:minmax(290px,.44fr) minmax(0,1fr);overflow:hidden;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-bg-base,rgba(255,255,255,.02))}
.gh2-var-tree-pane{min-width:0;min-height:0;display:grid;grid-template-rows:auto auto minmax(0,1fr);border-right:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08))}
.gh2-var-detail-pane{min-width:0;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr)}
.gh2-var-panehead{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;min-height:54px;padding:9px 12px;border-bottom:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08))}
.gh2-var-panehead > div{min-width:0}
.gh2-var-panehead > div > span{display:block;color:${GOLD};font-size:.72em;font-weight:800;letter-spacing:.06em}
.gh2-var-panehead h4{margin:2px 0 0;font-size:.94em;color:var(--dsw-alias-label-primary,#e9e9ec)}
.gh2-var-treetools{display:grid;grid-template-columns:minmax(120px,1fr) auto;gap:6px;padding:8px;border-bottom:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08))}
.gh2-var-treetools .gh2-finput{height:32px;min-width:0}
.gh2-var-tree{min-width:0;min-height:0;overflow:auto;padding:8px;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l2,rgba(255,255,255,.2)) transparent}
.gh2-var-treeitem{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:7px;width:100%;min-height:34px;padding:5px 7px;margin:0 0 2px;border:1px solid transparent;border-radius:7px;font-size:.84em;color:var(--dsw-alias-label-secondary,#b5b5bb);cursor:pointer}
.gh2-var-treeitem:hover{color:var(--dsw-alias-label-primary,#e9e9ec);background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
.gh2-var-treeitem.is-selected{border-color:light-dark(rgba(138,100,32,.45),rgba(216,179,106,.5));color:var(--dsw-alias-label-primary,#e9e9ec);background:light-dark(rgba(138,100,32,.07),rgba(216,179,106,.09))}
.gh2-var-treeitem.is-focus{outline:2px solid var(--dsw-focus-ring-color,#6aa0ff);outline-offset:-2px}
.gh2-var-treeitem:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#6aa0ff);outline-offset:-2px}
.gh2-var-disclosure{flex:0 0 12px;text-align:center;color:${GOLD};line-height:1;cursor:pointer}
.gh2-var-treekey{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${GOLD};font-family:var(--dsh-font-family-code,ui-monospace,Consolas,monospace);font-size:.94em}
.gh2-var-treemeta{margin-left:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary,#8b8b92);font-size:.82em}
.gh2-var-tree-empty,.gh2-var-detail-empty{min-height:100%;display:grid;place-content:center;justify-items:center;gap:5px;padding:24px;color:var(--dsw-alias-label-tertiary,#8b8b92);text-align:center}
.gh2-var-tree-empty strong,.gh2-var-detail-empty strong{color:var(--dsw-alias-label-secondary,#b5b5bb);font-size:.88em}
.gh2-var-tree-empty span,.gh2-var-detail-empty span{max-width:340px;font-size:.8em;line-height:1.55}
.gh2-var-pathcode{max-width:62%;overflow:auto hidden;padding:5px 7px;border-radius:5px;color:${GOLD};background:light-dark(rgba(138,100,32,.07),rgba(216,179,106,.09));font-family:var(--dsh-font-family-code,ui-monospace,Consolas,monospace);font-size:.78em;white-space:nowrap;scrollbar-width:thin}
.gh2-var-detailbody{min-width:0;min-height:0;display:flex;flex-direction:column;gap:11px;padding:12px;overflow:auto;scrollbar-width:thin}
.gh2-var-fieldgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.gh2-var-initial{margin:0;padding:8px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-base,#151517);font-family:var(--dsh-font-family-code,ui-monospace,Consolas,monospace);font-size:.8em;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;overflow:auto;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-var-initial.is-json{color:var(--dsw-alias-label-primary,#e9e9ec)}
@media (max-width:760px){.gh2-var-layout{grid-template-columns:1fr}.gh2-var-visual{grid-template-columns:1fr}.gh2-var-tree-pane{border-right:0;border-bottom:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08))}.gh2-var-fieldgrid{grid-template-columns:1fr 1fr}}
.gh2-m5-links{display:flex;flex-wrap:wrap;align-items:center;gap:4px 16px;padding:2px 0}
.gh2-m5-link{all:unset;box-sizing:border-box;cursor:pointer;padding:2px 0;border-radius:4px;font-size:.84em;color:${GOLD};text-decoration:underline;text-underline-offset:3px}
.gh2-m5-link:hover{color:var(--dsw-alias-label-primary,#e9e9ec)}
.gh2-m5-link:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,#6aa0ff);outline-offset:2px}
.gh2-m5-link:disabled{opacity:.45;cursor:not-allowed;text-decoration:none;color:var(--dsw-alias-label-tertiary,#8b8b92)}
.gh2-m5-ui-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr);gap:10px}
.gh2-m5-col{display:flex;flex-direction:column;gap:6px;min-width:0;padding:8px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-sm,8px)}
.gh2-ui-layer{padding:5px 8px;border-radius:var(--dsw-radius-sm,8px);font-size:.84em;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-ui-layer.is-open{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.04));box-shadow:inset 2px 0 0 ${GOLD};color:var(--dsw-alias-label-primary,#e9e9ec)}
.gh2-ui-canvas{display:flex;align-items:center;justify-content:center;min-height:150px;border:1px dashed var(--dsw-alias-border-l3,rgba(255,255,255,.2));border-radius:var(--dsw-radius-sm,8px);font-size:.84em;color:var(--dsw-alias-label-tertiary,#8b8b92);text-align:center;padding:12px}
.gh2-ui-ins{padding:5px 8px;border-radius:var(--dsw-radius-sm,8px);border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));font-size:.8em;color:var(--dsw-alias-label-tertiary,#8b8b92);overflow-wrap:anywhere}
.gh2-libmask{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:max(14px,2.5vh) max(14px,2.5vw);background:rgba(0,0,0,.62)}
.gh2-libpanel{display:flex;flex-direction:column;width:min(1280px,96vw);height:min(92vh,1000px);overflow:hidden;background:var(--dsw-alias-bg-layer-1,#1e1e22);border:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));border-radius:var(--dsw-radius-lg,12px);box-shadow:var(--dsw-elevation-prominent,0 18px 48px rgba(0,0,0,.4))}
.gh2-libbar{flex:none;display:flex;align-items:center;gap:10px;height:44px;padding:0 10px 0 14px;border-bottom:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));font-size:.9em}
.gh2-libframe{flex:1;min-height:80vh;width:100%;border:0;background:#fff}
.gh2-body-lib{padding:0;overflow:hidden;display:flex;flex-direction:column}
.gh2-library-tab{flex:1;min-height:0;display:flex;flex-direction:column;width:100%;background:#fff}
.gh2-library-tab .gh2-libstate{flex:1;min-height:0;background:var(--dsw-alias-bg-layer-1,#1e1e22)}
.gh2-libframe-tab{flex:1;min-height:0;height:100%;width:100%;border:0;background:#fff}
.gh2-libstate{flex:1;min-height:80vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;font-size:.9em;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-projectpanel{display:flex;flex-direction:column;width:min(1200px,96vw);height:min(90vh,980px);overflow:hidden;background:var(--dsw-alias-bg-layer-1,#1e1e22);border:.5px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));border-radius:var(--dsw-radius-lg,12px);box-shadow:var(--dsw-elevation-prominent,0 18px 48px rgba(0,0,0,.4))}
.gh2-projectmask{z-index:92}
.gh2-projectbar{flex:none;display:flex;align-items:center;gap:10px;min-height:44px;padding:0 10px 0 14px;border-bottom:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));font-size:.9em}
.gh2-projectbody{flex:1;min-height:0;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:14px}
.gh2-project-section{display:flex;flex-direction:column;gap:8px;min-width:0;padding:10px;border:.5px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-bg-base,rgba(255,255,255,.02))}
.gh2-project-columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;min-width:0}
.gh2-project-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;min-width:0}
.gh2-project-row{display:flex;align-items:center;gap:6px;min-width:0;border-radius:var(--dsw-radius-sm,8px)}
.gh2-project-row.is-active{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.04))}
.gh2-project-main{all:unset;box-sizing:border-box;flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;padding:6px 8px;border-radius:var(--dsw-radius-sm,8px);cursor:pointer;font-size:.84em;color:var(--dsw-alias-label-primary,#e9e9ec)}
.gh2-project-main:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
.gh2-project-main:focus-visible,.gh2-project-item:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,#6aa0ff);outline-offset:-2px}
.gh2-project-main .gh2-mono,.gh2-project-item .gh2-mono{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;min-width:0}
.gh2-project-meta{font-size:.94em;color:var(--dsw-alias-label-tertiary,#8b8b92);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gh2-project-delete{flex:none;height:26px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-tertiary,#8b8b92);font:inherit;font-size:.8em;cursor:pointer}
.gh2-project-delete:hover{background:light-dark(rgba(180,35,24,.08),rgba(255,138,128,.1));color:light-dark(#a4261b,#ffaaa0)}
.gh2-project-item{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;min-width:0;padding:5px 8px;border-radius:var(--dsw-radius-sm,8px);cursor:pointer;font-size:.82em;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-project-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
.gh2-project-item.is-active{box-shadow:inset 2px 0 0 ${GOLD};background:light-dark(rgba(138,100,32,.06),rgba(216,179,106,.08));color:var(--dsw-alias-label-primary,#e9e9ec)}
.gh2-project-itemtext{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}
.gh2-project-itemtitle{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gh2-project-carddetail{display:flex;flex-wrap:wrap;gap:4px 18px;font-size:.82em;line-height:1.6;color:var(--dsw-alias-label-secondary,#b5b5bb)}
.gh2-project-carddetail b{font-weight:600;color:var(--dsw-alias-label-tertiary,#8b8b92)}
.gh2-projectbtn{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gh2-project-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.gh2-project-actions .gh2-finput{flex:1 1 240px;min-width:160px}
@media (max-width:760px){.gh2-project-columns{grid-template-columns:1fr}}
@media (max-width:720px){.gh2-wb-grid{grid-template-columns:1fr}.gh2-m5-ui-grid{grid-template-columns:1fr}}
.gh2-toast{position:fixed;left:50%;bottom:112px;transform:translateX(-50%);z-index:70;padding:7px 14px;border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-label-primary,#eeeef0);color:var(--dsw-alias-label-primary-inverted,#141416);font-size:13px;line-height:1.4;pointer-events:none;box-shadow:var(--dsw-elevation-panel,0 4px 16px rgba(0,0,0,.25))}
`;
  function injectStyles() {
    let el = document.getElementById('gh2-style');
    if (!el) {
      el = document.createElement('style');
      el.id = 'gh2-style';
      el.setAttribute('data-plugin-css', PLUGIN_ID);
      document.head.appendChild(el);
    }
    el.textContent = CSS;
  }

  /* ---------------- 介面 ---------------- */

  function makeFactory() {
    return (require) => {
      const module = { exports: {} };
      const React = require('react');
      const { createElement: h, Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } = React;
      let P = null;
      try { P = require('@deepseek-ai/dsh-client-ui-primitives'); } catch (error) { fail('primitives', error); }
      const has = (name) => !!(P && P[name]);

      const useStoreState = () => useSyncExternalStore(store.subscribe, store.get);
      function useNow(fast) {
        const [now, setNow] = useState(() => Date.now());
        useEffect(() => {
          const timer = setInterval(() => setNow(Date.now()), fast ? 1000 : 30000);
          return () => clearInterval(timer);
        }, [fast]);
        return now;
      }
      function sessionOf(props) {
        return (props && (props.sessionId || (props.session && props.session.sessionId))) || undefined;
      }
      /** 會話作用域的部件把宿主給的 inputActions 登記下來，插入 /名字 時用。 */
      function usePublishInput(props) {
        const sid = sessionOf(props);
        const actions = props && props.inputActions;
        useEffect(() => {
          if (!sid || !actions) return undefined;
          inputRegistry.set(sid, actions);
          return () => { if (inputRegistry.get(sid) === actions) inputRegistry.delete(sid); };
        }, [sid, actions]);
      }
      function useDismiss(ref, open, setOpen) {
        useEffect(() => {
          if (!open) return undefined;
          const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
          const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
          document.addEventListener('pointerdown', onDown, true);
          document.addEventListener('keydown', onKey, true);
          return () => {
            document.removeEventListener('pointerdown', onDown, true);
            document.removeEventListener('keydown', onKey, true);
          };
        }, [open]);
      }

      /* 圖形 */
      function Logo({ size }) {
        return h('svg', { width: size, height: size, viewBox: '0 0 32 32', fill: 'currentColor', 'aria-hidden': 'true', focusable: 'false' },
          h('path', { d: 'M2 13 5.5 7 11 12 9 17Z' }),
          h('path', { d: 'M8.5 4.5 14.5 2 14.5 10.5 13 11.5Z' }),
          h('path', { d: 'M18 2.5 24 6 19.5 12.5 17 11Z' }),
          h('path', { d: 'M26.5 9 29.5 15.5 22.5 17.5 21.5 14.5Z' }),
          h('path', { d: 'M3 19.5 9.5 22.5 14.5 25 19 22.5 15.5 19 18.5 17 23 21.5 28 20.5 23 26.5 14.5 29.5 6 25Z' }));
      }
      const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false' };
      const IconMinimize = () => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', ...stroke }, h('path', { d: 'M4 8.5h8' }));
      const IconGrip = () => h('svg', { width: 12, height: 12, viewBox: '0 0 12 12', ...stroke }, h('path', { d: 'M10.5 4.5l-6 6M10.5 8l-2.5 2.5' }));
      const IconChevron = () => h('svg', { width: 12, height: 12, viewBox: '0 0 12 12', ...stroke }, h('path', { d: 'M3.5 7.5L6 5l2.5 2.5' }));
      const IconSearch = () => (has('IconSearchOutlineRegular') ? h(P.IconSearchOutlineRegular, { size: 16 }) : null);
      // 輪盤開關圖示：圓盤 + 輪輻（不復用品牌 Logo）；隱藏時多一道斜線。
      const IconWheel = ({ off }) => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', ...stroke, className: 'gh2-wheelico' },
        h('circle', { cx: 8, cy: 8, r: 5.4 }),
        h('circle', { cx: 8, cy: 8, r: 1.6 }),
        h('path', { d: 'M8 2.6v2.1M8 11.3v2.1M2.6 8h2.1M11.3 8h2.1' }),
        off ? h('path', { d: 'M3.8 12.2 12.2 3.8' }) : null);

      /* 宿主原生部件（缺失時退回同樣外觀的普通元素） */
      function IconButton({ label, onClick, pressed, className, children, ...rest }) {
        const cls = 'gh2-iconbtn' + (className ? ' ' + className : '');
        if (has('Button') && has('Tooltip')) {
          return h(P.Tooltip, {
            label, side: 'bottom', delayMs: 400,
            children: h(P.Button, { size: 'sm', className: cls, 'aria-label': label, 'aria-pressed': pressed, onClick, ...rest, children }),
          });
        }
        return h('button', { type: 'button', className: 'gh2-fbtn ' + cls, title: label, 'aria-label': label, 'aria-pressed': pressed, onClick, ...rest, children });
      }
      function TextButton({ onClick, children, variant, disabled, title, ...rest }) {
        if (has('Button')) return h(P.Button, { size: 'sm', variant: variant || 'outline', onClick, disabled, title, ...rest }, children);
        return h('button', { type: 'button', className: 'gh2-fbtn is-outline', onClick, disabled, title, ...rest }, children);
      }
      function Chip({ active, onClick, disabled, children }) {
        if (has('Pill')) return h(P.Pill, { active, onClick, disabled, 'aria-pressed': active }, children);
        return h('button', { type: 'button', className: 'gh2-fpill', 'aria-pressed': active, onClick, disabled }, children);
      }
      function SearchBox({ value, onChange }) {
        const props = { placeholder: '搜尋 Skill 名稱或說明', 'aria-label': '搜尋 Skill', value, onChange: (e) => onChange(e.target.value) };
        if (has('Input')) return h(P.Input, { ...props, icon: IconSearch(), className: 'gh2-search' });
        return h('input', { ...props, className: 'gh2-finput' });
      }
      function Dot({ live }) {
        if (live && has('StateDot')) return h(P.StateDot, { state: 'ongoing', size: 12 });
        return h('span', { className: live ? 'gh2-idle is-live' : 'gh2-idle', 'aria-hidden': 'true' });
      }
      function Tabs({ value, onChange }) {
        const items = TABS.map((t) => ({ value: t.id, label: t.label, id: 'gh2-tab-' + t.id, panelId: 'gh2-panel-' + t.id }));
        if (has('SegmentedTabs')) return h(P.SegmentedTabs, { items, value, onChange, label: '神之手頁籤', className: 'gh2-seg' });
        return h('div', { role: 'tablist', 'aria-label': '神之手頁籤', className: 'gh2-ftabs' }, items.map((it) => h('button', {
          key: it.value, id: it.id, role: 'tab', type: 'button', 'aria-selected': it.value === value, 'aria-controls': it.panelId,
          className: 'gh2-ftab', onClick: () => onChange(it.value),
        }, it.label)));
      }
      function Empty({ title, text, action }) {
        return h('div', { className: 'gh2-empty' }, h('h3', null, title), text ? h('p', null, text) : null, action || null);
      }

      /* 會話頭按鈕 */
      function HeaderButton(props) {
        usePublishInput(props);
        const s = useStoreState();
        const sid = sessionOf(props) || s.sessionId;
        const live = sid === s.sessionId && Object.keys(s.activity.inUse).length > 0;
        const full = s.ui.mode === 'full';
        return h(IconButton, {
          label: '神之手',
          pressed: full,
          className: 'gh2-hbtn' + (live ? ' is-live' : ''),
          // 從完整浮窗收起時順手把輪盤開啟，保證真的回到輪盤；開啟浮窗不改輪盤開關。
          onClick: () => setUi(full ? { mode: 'compact', wheelOn: true } : { mode: 'full' }),
        }, h(Logo, { size: 16 }), live ? h('span', { className: 'gh2-ping', 'aria-hidden': 'true' }) : null);
      }

      /* 會話頭輪盤開關：顯示/隱藏輪盤，狀態存本機 */
      function WheelToggleButton() {
        const s = useStoreState();
        const on = s.ui.wheelOn !== false;
        return h(IconButton, {
          label: on ? '隱藏輪盤' : '顯示輪盤',
          pressed: on,
          className: 'gh2-wheelbtn' + (on ? '' : ' is-off'),
          'data-gh': 'wheel-toggle',
          onClick: () => setUi({ wheelOn: !on }),
        }, h(IconWheel, { off: !on }));
      }

      /* Soul 小浮窗 */
      function SoulDock(props) {
        usePublishInput(props);
        const s = useStoreState();
        const [open, setOpen] = useState(false);
        const rootRef = useRef(null);
        useDismiss(rootRef, open, setOpen);
        const sid = sessionOf(props) || s.sessionId;
        if (!sid || sid !== s.sessionId) return null;
        const cat = s.catalog;
        const known = cat.state === 'ready';
        const available = known && cat.skills.some((k) => k.name === SOUL_SKILL);
        const current = SOULS.find((x) => x.id === s.activity.soul);
        const label = known && !available ? 'Soul 不可用' : current ? 'Soul · ' + current.name : 'Soul';
        const pick = (id) => { setOpen(false); sendSoul(id); };
        const pop = !open ? null : h('div', { className: 'gh2-soulpop', 'data-gh': 'soul-pop' }, available
          ? [
            ...SOULS.map((x) => h(Chip, { key: x.id, active: s.activity.soul === x.id, onClick: () => pick(x.id) }, x.name)),
            h(Chip, { key: 'off', active: false, disabled: s.activity.soul === 'off', onClick: () => pick('off') }, '關閉'),
          ]
          : h('p', { className: 'gh2-soulnote' }, '這個會話的預設沒有載入 TW Soul。新建任務時選“TavernWeave X DSH”預設，就能在這裡切換。'));
        return h('div', { className: 'gh2-root gh2-souldock' },
          h('div', { className: 'gh2-soul', ref: rootRef },
            pop,
            h('button', {
              type: 'button',
              className: 'gh2-soulpill' + (current ? ' is-on' : '') + (known && !available ? ' is-off' : ''),
              'data-gh': 'soul-pill',
              'aria-haspopup': 'true',
              'aria-expanded': open,
              disabled: !known,
              title: current ? '當前模式按本會話最近一條 Soul 指令推斷' : undefined,
              onClick: () => setOpen((v) => !v),
            }, h('span', { className: 'gh2-souldot', 'aria-hidden': 'true' }), label, h(IconChevron))));
      }

      /* 縮略態：Skill 輪盤 */
      function sameFrame(a, b) {
        return a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);
      }
      /** 跟蹤左側欄和對話欄之間的空白；放不下輪盤時返回 null。 */
      function useGutter(active) {
        const [frame, setFrame] = useState(null);
        useEffect(() => {
          if (!active) { G.wheel.reason = 'no-session'; setFrame(null); return undefined; }
          let raf = 0;
          let watched = [];
          const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => schedule()) : null;
          function run() {
            raf = 0;
            let g = null;
            try { g = measureGutter(); } catch (error) { fail('gutter', error); }
            G.wheel.reason = g ? g.reason : 'error';
            G.wheel.blocker = g && g.blocker ? g.blocker : null;
            G.wheel.gutter = g && g.w !== undefined ? { x: g.x, y: g.y, w: g.w, h: g.h } : null;
            const targets = g && g.root ? [g.root, g.anchor] : [];
            if (ro && (targets[0] !== watched[0] || targets[1] !== watched[1])) {
              ro.disconnect();
              for (const t of targets) ro.observe(t);
              watched = targets;
            }
            const next = g && g.reason === 'ok' ? { x: g.x, y: g.y, w: g.w, h: g.h } : null;
            setFrame((prev) => (sameFrame(prev, next) ? prev : next));
          }
          function schedule() { if (!raf) raf = requestAnimationFrame(run); }
          window.addEventListener('resize', schedule);
          const timer = setInterval(schedule, 1000);
          schedule();
          return () => {
            if (raf) cancelAnimationFrame(raf);
            clearInterval(timer);
            window.removeEventListener('resize', schedule);
            if (ro) ro.disconnect();
          };
        }, [active]);
        return active ? frame : null;
      }
      function wheelItems(skills) {
        const item = (k, section) => ({
          kind: 'skill', section, key: 'skill:' + k.name, name: k.name,
          desc: k.description, zh: k.zh, detail: k.detail, tag: k.tag,
        });
        return [
          ...skills.filter((k) => k.tw).map((k) => item(k, 'tw')),
          ...FEATURES.map((f) => ({ kind: 'feature', section: 'feature', key: 'feature:' + f.tab, name: f.name, desc: f.desc, tab: f.tab })),
          ...skills.filter((k) => !k.tw).map((k) => item(k, 'other')),
        ];
      }
      function WheelHover({ item, pos, s, now }) {
        const ref = useRef(null);
        useLayoutEffect(() => {
          const el = ref.current;
          if (!el) return;
          el.style.top = Math.max(EDGE, Math.min(window.innerHeight - el.offsetHeight - EDGE, pos.top)) + 'px';
          el.style.left = Math.max(EDGE, Math.min(window.innerWidth - el.offsetWidth - EDGE, pos.left)) + 'px';
        });
        const a = s.activity;
        const live = a.inUse[item.name];
        const count = a.counts[item.name] || 0;
        let last = null;
        for (let i = a.calls.length - 1; i >= 0; i--) if (a.calls[i].name === item.name) { last = a.calls[i]; break; }
        return h('div', { ref, className: 'gh2-root gh2-whover', role: 'tooltip', 'data-gh': 'wheel-hover', style: { left: pos.left, top: pos.top } },
          h('div', { className: 'gh2-hk' },
            h('span', null, item.tag || 'Skill'),
            h('span', { className: live ? 'is-live' : undefined }, live ? '呼叫中 ' + clock(now - live.since) : count ? '本會話呼叫 ' + count + ' 次' : '本會話還沒呼叫')),
          h('h4', null, item.name),
          h('p', null, item.detail || item.zh || item.desc || '沒有說明'),
          !item.detail && item.desc ? h('p', { className: 'gh2-hnote' }, '這個 Skill 不在中文介紹名單裡，說明保留原文。') : null,
          last ? h('div', { className: 'gh2-hlast' }, '最近一次：' + ago(last.time, now) + ' · ' + (last.source === 'model' ? '模型呼叫' : '手動呼叫')) : null,
          h('div', { className: 'gh2-hhint' }, '點選檢視詳情 · 拖到輸入框插入 /' + item.name));
      }
      function Wheel({ s }) {
        const sid = s.sessionId;
        const frame = useGutter(!!sid);
        const zoneRef = useRef(null);
        const plateRef = useRef(null);
        const headRef = useRef(null);
        const cardEls = useRef(new Map());
        const st = useRef(null);
        if (!st.current) {
          const start = store.get().ui.wheel || 0;
          st.current = { geo: null, cards: [], count: 0, featureStart: 0, otherStart: 0, current: start, target: start, raf: 0, acc: 0, spin: null, hovering: false, rotatedFor: '' };
        }
        const [hover, setHover] = useState(null);
        const cat = s.catalog;
        const skills = cat.sessionId === sid ? cat.skills : [];
        const items = useMemo(() => (cat.state === 'ready' || skills.length ? wheelItems(skills) : []), [skills, cat.state]);
        const itemsKey = items.map((it) => it.key).join('\n');
        const a = s.activity;
        const liveNames = Object.keys(a.inUse);
        const now = useNow(liveNames.length > 0);

        const api = useRef(null);
        if (!api.current) {
          const S = st.current;
          const maxScroll = () => Math.max(0, S.count - (S.geo ? S.geo.slots : 0));
          const clampScroll = (i) => Math.max(0, Math.min(maxScroll(), i));
          const layout = () => {
            const g = S.geo;
            if (!g) return;
            const mid = (g.slots - 1) / 2;
            const offset = S.count < g.slots ? (g.slots - S.count) / 2 : 0;
            S.cards.forEach((el, i) => {
              const f = i - S.current + offset;
              if (!(f > -0.6 && f < g.slots - 0.4)) {
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                return;
              }
              const slotPos = f - mid;
              const angle = slotPos * g.step;
              const x = g.X0 - g.R * (1 - Math.cos(angle));
              const y = g.Cy + slotPos * g.spacing;
              let op = 1;
              if (f < 0) op = Math.max(0, 1 + f / 0.6);
              else if (f > g.slots - 1) op = Math.max(0, 1 - (f - (g.slots - 1)) / 0.6);
              el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) rotate(' + (angle * 180 / Math.PI).toFixed(2) + 'deg)';
              el.style.visibility = 'visible';
              el.style.opacity = op.toFixed(2);
              el.style.zIndex = String(20 + Math.round(10 - Math.abs(slotPos)));
            });
            const head = headRef.current;
            if (head) {
              const last = Math.round(S.current) + g.slots - 1;
              const round = S.otherStart >= 0 && last >= S.otherStart ? 'other'
                : S.featureStart >= 0 && last >= S.featureStart ? 'features' : 'skills';
              if (head.dataset.round !== round) head.dataset.round = round;
            }
            G.wheel.current = S.current;
            G.wheel.target = S.target;
          };
          const reduce = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
          const tick = () => {
            S.raf = 0;
            const diff = S.target - S.current;
            if (Math.abs(diff) < 0.01 || reduce()) {
              S.current = S.target;
              layout();
              if (store.get().ui.wheel !== S.target) setUi({ wheel: S.target });
              return;
            }
            S.current += diff * WHEEL.ease;
            layout();
            S.raf = requestAnimationFrame(tick);
          };
          const go = (i) => {
            S.target = clampScroll(Math.round(i));
            if (!S.raf) S.raf = requestAnimationFrame(tick);
          };
          api.current = { layout, go, clampScroll, maxScroll };
        }
        const W = api.current;

        // 量卡高 → 算幾何 → 排布。空白、目錄或字號變了都重來。
        useLayoutEffect(() => {
          const S = st.current;
          const zone = zoneRef.current;
          if (!zone || !frame) { S.geo = null; G.wheel.geo = null; G.wheel.zoneRight = undefined; return undefined; }
          const cards = items.map((it) => cardEls.current.get(it.key)).filter(Boolean);
          const setup = () => {
            try {
              // 卡片文字不隨寬度換行（窄卡的名字固定佔兩行），高度只取決於字號和窄/寬兩種排法
              const measure = () => {
                let cardH = 0;
                for (const el of cards) cardH = Math.max(cardH, el.offsetHeight || 0);
                return cardH || 92;
              };
              let g = wheelGeometry(frame.w, frame.h, measure());
              const compact = zone.classList.contains('is-compact');
              // 留 6px 回差，避免卡寬正好在分界線附近時兩種排法來回切換
              if (g && (g.cardW < WHEEL.compactBelow + (compact ? 6 : 0)) !== compact) {
                zone.classList.toggle('is-compact', !compact);
                g = wheelGeometry(frame.w, frame.h, measure());
              }
              G.wheel.fit = !!g;
              G.wheel.zoneRight = g ? frame.x + g.width : undefined;
              if (!g) { zone.style.visibility = 'hidden'; S.geo = null; return; }
              zone.style.visibility = '';
              zone.style.width = g.width + 'px';
              zone.style.setProperty('--gh2-card-w', g.cardW + 'px');
              // 圓盤：主圈穿過每張卡片的中心，內側兩圈同心；只畫輪盤區裡看得見的那一段弧
              const plate = plateRef.current;
              if (plate) {
                const cx = g.X0 - g.R;
                const vh = window.innerHeight / 100;
                const [ring, inner, accent] = plate.querySelectorAll('path');
                ring.setAttribute('d', ringPath(cx, g.Cy, g.R, frame.h));
                inner.setAttribute('d', ringPath(cx, g.Cy, g.R - 7 * vh, frame.h));
                accent.setAttribute('d', ringPath(cx, g.Cy, g.R - 14 * vh, frame.h));
                plate.dataset.cx = cx.toFixed(2);
                plate.dataset.cy = g.Cy.toFixed(2);
                plate.dataset.r = g.R.toFixed(2);
              }
              S.geo = g;
              S.cards = cards;
              S.count = cards.length;
              S.featureStart = items.findIndex((it) => it.kind === 'feature');
              S.otherStart = items.findIndex((it) => it.section === 'other');
              // 目錄還沒讀到時不夾位置，免得把記住的位置夾成 0
              if (S.count) {
                S.target = W.clampScroll(S.target);
                S.current = W.clampScroll(S.current);
              }
              G.wheel.geo = { slots: g.slots, cardW: g.cardW, cardH: g.cardH, theta: +(g.theta * 180 / Math.PI).toFixed(2), R: Math.round(g.R), X0: +g.X0.toFixed(1), Cy: +g.Cy.toFixed(1), spacing: +g.spacing.toFixed(1), width: g.width };
              G.wheel.count = S.count;
              W.layout();
            } catch (error) {
              fail('wheel', error);
            }
          };
          setup();
          const ro = typeof ResizeObserver === 'function' && cards[0] ? new ResizeObserver(() => setup()) : null;
          if (ro) ro.observe(cards[0]);
          return () => { if (ro) ro.disconnect(); };
        }, [frame && frame.w, frame && frame.h, !!frame, itemsKey]);

        // 滾輪、上下拖動、懸停：原生監聽（滾輪要能阻止頁面滾動）
        useEffect(() => {
          const zone = zoneRef.current;
          if (!zone) return undefined;
          const S = st.current;
          const onWheel = (e) => {
            e.preventDefault();
            setHover(null);
            const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
            const dy = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit;
            if (Math.abs(dy) >= 50) { S.acc = 0; W.go(S.target + Math.sign(dy)); return; }
            S.acc += dy;
            if (Math.abs(S.acc) >= 60) {
              const n = Math.trunc(S.acc / 60);
              S.acc -= n * 60;
              W.go(S.target + n);
            }
          };
          const onDown = (e) => {
            if (e.button !== 0 || (e.target.closest && e.target.closest('.gh2-wcard'))) return;
            S.spin = { y: e.clientY, base: S.target };
            try { zone.setPointerCapture(e.pointerId); } catch {}
            zone.classList.add('is-spinning');
            setHover(null);
          };
          const onMove = (e) => {
            if (!S.spin) return;
            const stepPx = Math.max(40, S.geo ? S.geo.spacing : 100);
            W.go(S.spin.base + Math.trunc((S.spin.y - e.clientY) / stepPx));
          };
          const onUp = () => { S.spin = null; zone.classList.remove('is-spinning'); };
          const onOver = (e) => {
            S.hovering = true;
            if (S.spin) return;
            const card = e.target.closest && e.target.closest('.gh2-wcard');
            if (!card) return;
            if (card.dataset.kind !== 'skill') { setHover(null); return; }
            const r = card.getBoundingClientRect();
            const z = zone.getBoundingClientRect();
            setHover((prev) => (prev && prev.key === card.dataset.key ? prev : { key: card.dataset.key, pos: { left: Math.round(z.right + 8), top: Math.round(r.top) } }));
          };
          const onOut = (e) => {
            const to = e.relatedTarget;
            if (!to || !to.closest || !to.closest('.gh2-wcard')) setHover(null);
          };
          const onLeave = () => { S.hovering = false; setHover(null); };
          zone.addEventListener('wheel', onWheel, { passive: false });
          zone.addEventListener('pointerdown', onDown);
          zone.addEventListener('pointermove', onMove);
          zone.addEventListener('pointerup', onUp);
          zone.addEventListener('pointercancel', onUp);
          zone.addEventListener('pointerover', onOver);
          zone.addEventListener('pointerout', onOut);
          zone.addEventListener('pointerleave', onLeave);
          return () => {
            zone.removeEventListener('wheel', onWheel);
            zone.removeEventListener('pointerdown', onDown);
            zone.removeEventListener('pointermove', onMove);
            zone.removeEventListener('pointerup', onUp);
            zone.removeEventListener('pointercancel', onUp);
            zone.removeEventListener('pointerover', onOver);
            zone.removeEventListener('pointerout', onOut);
            zone.removeEventListener('pointerleave', onLeave);
          };
        }, [!!frame]);

        // 有 Skill 開始呼叫時轉到中間（滑鼠停在輪盤上時不搶）
        const newest = liveNames.length ? liveNames[liveNames.length - 1] : '';
        useEffect(() => {
          const S = st.current;
          if (!newest) { S.rotatedFor = ''; return; }
          if (S.rotatedFor === newest || S.hovering || S.spin || !S.geo) return;
          const idx = items.findIndex((it) => it.kind === 'skill' && it.name === newest);
          if (idx < 0) return;
          S.rotatedFor = newest;
          W.go(idx - Math.floor(S.geo.slots / 2));
        }, [newest, itemsKey, !!frame]);

        useEffect(() => () => { if (st.current.raf) cancelAnimationFrame(st.current.raf); }, []);

        if (!frame) return null;
        const onKeyDown = (e) => {
          const S = st.current;
          if (!S.geo || e.target !== e.currentTarget) return;
          const page = Math.max(1, S.geo.slots - 1);
          const next = { ArrowDown: S.target + 1, ArrowRight: S.target + 1, ArrowUp: S.target - 1, ArrowLeft: S.target - 1,
            PageDown: S.target + page, PageUp: S.target - page, Home: 0, End: W.maxScroll() }[e.key];
          if (next === undefined) return;
          e.preventDefault();
          e.stopPropagation();
          setHover(null);
          W.go(next);
        };
        const showFocus = (it, el) => {
          if (it.kind !== 'skill' || !el || !zoneRef.current) return;
          const r = el.getBoundingClientRect();
          const z = zoneRef.current.getBoundingClientRect();
          setHover({ key: it.key, pos: { left: Math.round(z.right + 8), top: Math.round(r.top) } });
        };
        const twCount = skills.filter((k) => k.tw).length;
        const otherCount = skills.length - twCount;
        let head;
        if (cat.state === 'error' && !skills.length) head = 'Skill 目錄讀取失敗';
        else if (!items.length) head = '正在讀取 Skill 目錄…';
        else if (!skills.length) head = '這個會話沒有 Skill';
        else head = [h('b', { key: 'b' }, 'TW 技能'), ' · ' + twCount + ' · 其他 ' + otherCount + ' · ', h('span', { key: 'h', className: 'gh2-whint' }, '滾輪旋轉')];
        const hoverItem = hover ? items.find((it) => it.key === hover.key) : null;
        return h(Fragment, null,
          h('section', {
            ref: zoneRef, className: 'gh2-root gh2-wheel', role: 'group', tabIndex: 0, 'data-gh': 'wheel',
            'aria-label': 'Skill 輪盤：滾輪、方向鍵或上下拖動旋轉；點卡片檢視詳情，拖到輸入框插入',
            style: { left: frame.x, top: frame.y, height: frame.h },
            onKeyDown,
          },
            h('svg', { ref: plateRef, className: 'gh2-plate', 'aria-hidden': 'true', focusable: 'false', 'data-gh': 'wheel-plate' },
              h('path', { className: 'gh2-ring' }),
              h('path', { className: 'gh2-ring is-inner' }),
              h('path', { className: 'gh2-ring is-accent' })),
            h('div', { ref: headRef, className: 'gh2-whead', 'data-gh': 'wheel-head', 'data-round': 'skills' },
              h('span', { className: 'gh2-brand' }, h(Logo, { size: 13 })),
              h('span', { className: 'gh2-wh-skills' }, head),
              h('span', { className: 'gh2-wh-features' }, h('b', null, '功能入口'), ' · 下一輪'),
              h('span', { className: 'gh2-wh-other' }, h('b', null, '其他 Skill'), ' · ' + otherCount + ' 個')),
            cat.state === 'error' && !skills.length ? h('div', { className: 'gh2-wnote' },
              h('p', null, cat.error), h(TextButton, { onClick: () => loadCatalog(sid) }, '重試')) : null,
            items.map((it) => {
              const live = it.kind === 'skill' ? a.inUse[it.name] : null;
              const count = it.kind === 'skill' ? a.counts[it.name] || 0 : 0;
              const label = live ? [h('i', { key: 'd', className: 'gh2-wdot' }), it.tag || 'Skill']
                : it.kind === 'feature' ? '功能入口' : it.tag || '其他';
              return h('button', {
                key: it.key,
                ref: (el) => { if (el) cardEls.current.set(it.key, el); else cardEls.current.delete(it.key); },
                type: 'button',
                className: 'gh2-wcard' + (it.kind === 'feature' ? ' is-feature' : '') + (live ? ' is-live' : ''),
                'data-gh': 'wheel-card', 'data-key': it.key, 'data-kind': it.kind,
                'data-skill': it.kind === 'skill' ? it.name : undefined,
                'data-tab': it.kind === 'feature' ? it.tab : undefined,
                draggable: it.kind === 'skill',
                onClick: () => (it.kind === 'skill' ? openSkill(it.name) : openTab(it.tab)),
                onDragStart: (e) => { setHover(null); startSkillDrag(e, it.name); },
                onFocus: (e) => showFocus(it, e.currentTarget),
                onBlur: () => setHover(null),
              },
                h('span', { className: 'gh2-wtop' },
                  h('span', { className: 'gh2-wlabel' }, label),
                  h('span', null, live ? '呼叫中 ' + clock(now - live.since) : count ? '本會話 ' + count + ' 次' : '')),
                h('span', { className: 'gh2-wname' }, it.name),
                h('span', { className: 'gh2-wdesc' }, it.zh || it.desc || '沒有說明'),
                h('span', { className: 'gh2-wmeta' }, it.kind === 'feature' ? '點選開啟' : live ? '點選開啟 · 呼叫中' : '拖到輸入框插入'));
            })),
          hoverItem ? h(WheelHover, { item: hoverItem, pos: hover.pos, s, now }) : null);
      }

      /* 完整態 */
      function SkillsPane({ s }) {
        const [query, setQuery] = useState('');
        const [usedOnly, setUsedOnly] = useState(false);
        const [scope, setScope] = useState('all');
        const [openName, setOpenName] = useState(null);
        const [sending, setSending] = useState(null);
        const sendingRef = useRef(false);
        const listRef = useRef(null);
        const a = s.activity;
        const cat = s.catalog;
        const now = useNow(Object.keys(a.inUse).length > 0);
        const focus = s.focus;
        // 從輪盤點進來：清掉篩選、展開那一項並滾到可見
        useEffect(() => {
          if (!focus) return undefined;
          setQuery('');
          setUsedOnly(false);
          setScope('all');
          setOpenName(focus.name);
          const raf = requestAnimationFrame(() => {
            const row = listRef.current && [...listRef.current.querySelectorAll('li')].find((li) => li.dataset.skill === focus.name);
            if (row) { try { row.scrollIntoView({ block: 'nearest' }); } catch {} }
          });
          return () => cancelAnimationFrame(raf);
        }, [focus && focus.seq]);
        if (!s.sessionId) return h(Empty, { title: '沒有開啟的會話', text: '開啟一個會話後，這裡會列出它能用的 Skill。' });
        if (cat.sessionId !== s.sessionId) {
          return h(Empty, { title: '正在讀取這個會話的 Skill…', text: '等目錄讀完再操作，避免把上一個會話的 Skill 發到新會話。' });
        }
        if (cat.state === 'error') {
          return h(Empty, {
            title: '讀取 Skill 目錄失敗', text: cat.error,
            action: h(TextButton, { onClick: () => loadCatalog(s.sessionId) }, '重試'),
          });
        }
        if (!cat.skills.length) {
          return cat.state === 'ready'
            ? h(Empty, { title: '這個會話沒有可用的 Skill', text: '載入哪些 Skill 由會話的預設決定。' })
            : h(Empty, { title: '正在讀取 Skill 目錄…' });
        }
        const q = query.trim().toLowerCase();
        const twCount = cat.skills.filter((k) => k.tw).length;
        const otherCount = cat.skills.length - twCount;
        const rows = cat.skills.filter((k) => (scope === 'all' || (scope === 'tw' ? k.tw : !k.tw))
          && (!usedOnly || a.counts[k.name])
          && (!q || k.name.toLowerCase().includes(q) || k.description.toLowerCase().includes(q)
            || (k.zh || '').toLowerCase().includes(q) || (k.tag || '').toLowerCase().includes(q)
            || (k.detail || '').toLowerCase().includes(q)));
        const liveNames = Object.keys(a.inUse);
        const summary = '本會話呼叫 ' + a.total + ' 次' + (a.hasMore ? '（更早的記錄未載入）' : '')
          + ' · TW ' + twCount + ' / 其他 ' + otherCount
          + (liveNames.length ? ' · 呼叫中：' + liveNames.join('、') : '');
        return h(Fragment, null,
          h('div', { className: 'gh2-tools' },
            h(SearchBox, { value: query, onChange: setQuery }),
            h(Chip, { active: scope === 'all', onClick: () => setScope('all') }, '全部 ' + cat.skills.length),
            h(Chip, { active: scope === 'tw', onClick: () => setScope('tw') }, 'TW ' + twCount),
            h(Chip, { active: scope === 'other', onClick: () => setScope('other') }, '其他 ' + otherCount),
            h(Chip, { active: usedOnly, onClick: () => setUsedOnly(!usedOnly) }, '本會話用過')),
          h('p', { className: 'gh2-summary', 'data-gh': 'summary' }, summary),
          rows.length
            ? h('ul', { className: 'gh2-list', 'data-gh': 'skill-list', ref: listRef }, rows.map((k) => {
              const live = !!a.inUse[k.name];
              const count = a.counts[k.name] || 0;
              const isOpen = openName === k.name;
              return h('li', { key: k.name, className: 'gh2-row' + (live ? ' is-live' : '') + (isOpen ? ' is-open' : ''), 'data-skill': k.name },
                h('button', {
                  type: 'button', className: 'gh2-rowmain', 'aria-expanded': isOpen, draggable: true,
                  onClick: () => setOpenName(isOpen ? null : k.name),
                  onDoubleClick: () => insertSkill(k.name),
                  onDragStart: (e) => startSkillDrag(e, k.name),
                },
                  h('span', { className: 'gh2-rowtext' },
                    h('span', { className: 'gh2-nameline' },
                      h('span', { className: 'gh2-rowtag' }, k.tag || '其他'),
                      h('span', { className: 'gh2-name' }, k.name)),
                    h('span', { className: 'gh2-desc' }, k.zh || k.description || '沒有說明')),
                  h('span', { className: 'gh2-meta' }, live ? [h(Dot, { key: 'd', live: true }), '呼叫中'] : count ? count + ' 次' : '')),
                isOpen ? h('div', { className: 'gh2-rowmore' },
                  h('p', { className: 'gh2-rowdetail', 'data-gh': 'row-detail' }, k.detail || k.zh || k.description || '沒有說明'),
                  h('div', { className: 'gh2-rowactions' },
                    h(TextButton, { onClick: () => insertSkill(k.name) }, '插入到輸入框'),
                    h(TextButton, {
                      disabled: live || !!sending,
                      title: live ? '這個 Skill 正在呼叫' : sending ? '正在傳送上一條指令' : '把 /' + k.name + ' 發給當前會話',
                      onClick: async () => {
                        if (sendingRef.current) return;
                        sendingRef.current = true;
                        setSending(k.name);
                        try { await runSkill(k.name); }
                        finally {
                          // 指令被宿主接受後，按鈕再鎖 1.5 秒；雙擊或連點不會發出第二條。
                          setTimeout(() => { sendingRef.current = false; setSending(null); }, 1500);
                        }
                      },
                    }, live ? '呼叫中' : sending === k.name ? '傳送中…' : '執行 Skill'))) : null);
            }))
            : h('p', { className: 'gh2-none' }, usedOnly
              ? '本會話還沒有呼叫過' + (scope === 'tw' ? ' TW Skill' : scope === 'other' ? '其他 Skill' : ' Skill')
              : scope === 'tw' ? '沒有匹配的 TW Skill' : scope === 'other' ? '這個會話沒有其他來源的 Skill' : '沒有匹配的 Skill'),
          a.calls.length ? h('section', { className: 'gh2-recent', 'data-gh': 'recent' },
            h('h4', null, '最近呼叫'),
            h('ul', null, a.calls.slice(-6).reverse().map((c, i) => h('li', { key: String(c.seq !== undefined ? c.seq : i) + c.name },
              h('button', { type: 'button', onClick: () => { setUsedOnly(false); setQuery(''); setOpenName(c.name); } },
                h('span', { className: 'gh2-name' }, c.name),
                h('span', { className: 'gh2-meta' }, (c.source === 'model' ? '模型呼叫' : '手動') + ' · ' + ago(c.time, now))))))) : null);
      }
      /* ---------- M5：資料庫篩選頁 / 真實世界書 / MVU / 介面 ---------- */

      function errorLine(text, dataName) {
        if (!text) return null;
        return h('p', { className: 'gh2-m5-error', role: 'alert', 'data-gh': dataName || undefined }, text);
      }

      function leafPreview(value) {
        if (typeof value === 'string') {
          const text = value.length > 100 ? value.slice(0, 100) + '…' : value;
          return JSON.stringify(text);
        }
        return String(value);
      }
      function uidText(uid) {
        return uid === undefined || uid === null ? '（無）' : String(uid);
      }

      /** 只讀 JSON 節點樹：物件/陣列可摺疊，字串截斷顯示；直接來自檔案 raw。 */
      function JsonValue({ name, value, depth, budget }) {
        if (budget) {
          budget.left -= 1;
          if (budget.left < 0) return null;
        }
        const isObject = value !== null && typeof value === 'object';
        if (!isObject) {
          return h('div', { className: 'gh2-json-leaf' },
            name !== undefined && name !== '' ? h('span', { className: 'gh2-json-key' }, name) : null,
            name !== undefined && name !== '' ? ' ' : null,
            h('span', { className: 'gh2-json-type' }, value === null ? 'null' : typeof value),
            ' ',
            h('span', { className: 'gh2-json-val' }, leafPreview(value)));
        }
        const isArray = Array.isArray(value);
        const rows = isArray ? value.map((item, index) => [String(index), item]) : Object.entries(value);
        const shown = rows.slice(0, 200);
        return h('details', { className: 'gh2-json-node', open: depth === 0 ? true : undefined },
          h('summary', null,
            name !== undefined && name !== '' ? h('span', { className: 'gh2-json-key' }, name) : null,
            name !== undefined && name !== '' ? ' ' : null,
            h('span', { className: 'gh2-json-type' }, (isArray ? '陣列 ' : '物件 ') + rows.length + ' 項')),
          shown.map(([key, item]) => h(JsonValue, { key, name: key, value: item, depth: (depth || 0) + 1, budget })),
          rows.length > shown.length ? h('p', { className: 'gh2-m5-meta' }, '…還有 ' + (rows.length - shown.length) + ' 項未展開') : null,
          budget && budget.left <= 0 ? h('p', { className: 'gh2-m5-meta' }, '…節點太多，已截斷；完整結構見原始 JSON。') : null);
      }

      function CardWorldbookSection({ s }) {
        const detail = s.ws.cardDetail;
        const wb = detail && detail.worldbook;
        const entries = wb && Array.isArray(wb.entries) ? wb.entries : [];
        if (!detail || !entries.length) return null;
        const cardName = detail.meta.name || detail.meta.characterName || basename(detail.file.path) || '當前卡';
        return h('section', { className: 'gh2-card-wb', 'data-gh': 'card-worldbook-section' },
          h('details', { className: 'gh2-card-wb-fold', open: true },
            h('summary', { className: 'gh2-card-wb-summary' },
              h('b', { 'data-gh': 'card-wb-title' }, '卡內世界書（只讀）'),
              h('span', { className: 'gh2-m5-meta' }, ' · ' + cardName + ' · ' + (wb.count || entries.length) + ' 條'),
              h('span', { className: 'gh2-m5-chip' }, '只讀')),
            h('p', { className: 'gh2-m5-note' }, '來自當前卡；只讀展示，不儲存卡檔案，不發寫請求。'),
            h('div', { className: 'gh2-card-wb-list', 'data-gh': 'card-wb-entries' },
              entries.map((entry, index) => h('details', {
                key: String(entry.uid) + ':' + index,
                className: 'gh2-card-wb-entry',
                'data-gh': 'card-wb-entry',
                'data-index': String(index),
              },
                h('summary', null,
                  h('span', { className: 'gh2-card-wb-entrytitle' }, entry.comment || '（沒有標題）'),
                  h('span', { className: 'gh2-card-wb-key' }, entry.keys.length ? entry.keys.join(' / ') : (entry.key || '無 key')),
                  h('span', { className: 'gh2-m5-meta' }, 'UID ' + metaText(entry.uid))),
                h('pre', { className: 'gh2-card-wb-content', 'data-gh': 'card-wb-content' }, entry.content || '（空正文）'))))));
      }

      function WorldbookPane() {
        const s = useStoreState();
        const wb = s.wb;
        const rawText = useMemo(() => jsonPreview(wb.raw), [wb.raw, wb.selectedPath]);
        const entry = wb.openIndex >= 0 ? wb.entries[wb.openIndex] : null;
        const cardWb = s.ws.cardDetail && s.ws.cardDetail.worldbook;
        const hasCardWb = !!(cardWb && Array.isArray(cardWb.entries) && cardWb.entries.length);
        const kindLabel = wb.kind === 'st-object' ? 'st-object（json.entries 物件）'
          : wb.kind === 'st-array' ? 'st-array（陣列）'
            : wb.kind === 'unknown' ? '結構未識別' : '';
        const openDir = () => openWorldbookRoot(wb.rootInput);
        return h('div', { className: 'gh2-m5', 'data-gh': 'worldbook-pane' },
          h('p', { className: 'gh2-m5-lead' }, '讀寫本機世界書 JSON。目錄和檔案都由宿主校驗；儲存前宿主會備份舊版，頁面只顯示真實響應。'),
          s.ws.restoreNotice ? h('p', { className: 'gh2-m5-warn', 'data-gh': 'ws-restore-notice' }, s.ws.restoreNotice) : null,
          errorLine(s.ws.cardInspectError, 'card-inspect-error-wb'),
          s.ws.cardInspectBusy ? h('p', { className: 'gh2-m5-meta', 'data-gh': 'card-inspect-busy-wb' }, '正在讀取卡內世界書 / MVU / 指令碼元資訊…') : null,
          h(CardWorldbookSection, { s }),
          hasCardWb ? h('div', { className: 'gh2-mvu-sep' }) : null,
          h('div', { className: 'gh2-m5-rowhead', 'data-gh': 'worldbook-file-heading' },
            h('b', null, '本機世界書檔案（可編輯）'),
            h('span', { className: 'gh2-m5-meta' }, '真實 .json · 獨立於卡內只讀內容')),
          h('div', { className: 'gh2-m5-actions' },
            h(TextButton, {
              onClick: pickWorldbookRoot,
              disabled: wb.picking,
              'data-gh': 'wb-pick-root',
            }, wb.picking ? '正在開啟目錄選擇器…' : '選擇世界書目錄'),
            h('input', {
              type: 'text',
              className: 'gh2-finput',
              'data-gh': 'wb-root-input',
              'aria-label': '世界書目錄路徑',
              placeholder: '或輸入目錄路徑（絕對路徑）',
              value: wb.rootInput,
              onChange: (e) => setWb({ rootInput: e.target.value }),
              onKeyDown: (e) => { if (e.key === 'Enter') { e.preventDefault(); openDir(); } },
            }),
            h(TextButton, { onClick: openDir, disabled: wb.filesState === 'loading', 'data-gh': 'wb-open-root' },
              wb.filesState === 'loading' ? '正在開啟…' : '開啟目錄')),
          h('p', { className: 'gh2-m5-note' }, '沒有原生目錄選擇器時用路徑框；這裡不會把目錄內容假裝成已經讀到。'),
          errorLine(wb.folderError, 'wb-error'),
          wb.root ? h('p', { className: 'gh2-m5-meta' },
            '當前目錄：', h('span', { className: 'gh2-mono', 'data-gh': 'wb-root' }, wb.root),
            ' · ', wb.filesState === 'loading' ? '正在讀取…' : wb.files.length + ' 個 .json') : null,
          wb.filesState === 'ready' && !wb.files.length
            ? h('p', { className: 'gh2-m5-warn', 'data-gh': 'wb-empty-files' }, '這個目錄下（最多三層）沒有 .json 檔案。換一個目錄，或確認副檔名。')
            : null,
          wb.files.length ? h('div', { className: 'gh2-wb-files', 'data-gh': 'wb-files' }, wb.files.map((file) => h('button', {
            key: file.path,
            type: 'button',
            title: file.path,
            className: 'gh2-wb-file' + (file.path === wb.selectedPath ? ' is-active' : ''),
            'data-gh': 'wb-file',
            'data-path': file.path,
            onClick: () => readWorldbookFile(file.path),
          },
            h('span', { className: 'gh2-wb-fname' }, file.name || basename(file.path)),
            h('span', { className: 'gh2-m5-meta' }, formatSize(file.size))))) : null,
          wb.selectedPath ? h(Fragment, null,
            h('div', { className: 'gh2-m5-actions gh2-wb-filehead' },
              h('span', { className: 'gh2-mono', 'data-gh': 'wb-path' }, wb.selectedPath),
              kindLabel ? h('span', { className: 'gh2-m5-chip', 'data-gh': 'wb-kind' }, kindLabel) : null,
              wb.dirty ? h('span', { className: 'gh2-m5-dirty', 'data-gh': 'wb-dirty' }, '未儲存') : h('span', { className: 'gh2-m5-meta' }, '沒有未儲存修改'),
              wb.saving ? h('span', { className: 'gh2-m5-meta' }, '儲存中…') : null,
              h('span', { className: 'gh2-spacer' }),
              h(TextButton, {
                onClick: saveWorldbook,
                disabled: wb.saving || (!wb.dirty && wb.kind !== 'unknown'),
                'data-gh': 'wb-save',
              }, wb.saving ? '儲存中…' : wb.pendingUnknown ? '再點一次確認儲存' : '儲存')),
            wb.loadingFile ? h('p', { className: 'gh2-m5-meta', 'data-gh': 'wb-loading' }, '正在讀取檔案…') : null,
            errorLine(wb.error, 'wb-file-error'),
            wb.saveNotice ? h('p', { className: 'gh2-m5-ok', 'data-gh': 'wb-backup' }, wb.saveNotice) : null,
            wb.kind === 'unknown' ? h('p', { className: 'gh2-m5-warn', 'data-gh': 'wb-unknown' }, '結構未識別：這個檔案不是 st-object（json.entries 物件）或 st-array（陣列）。可以檢視原始 JSON；儲存會把原 JSON 原樣寫回並先備份，需要點兩次儲存確認。') : null,
            wb.pendingUnknown ? h('p', { className: 'gh2-m5-warn', 'data-gh': 'wb-confirm' }, '再點一次“儲存”確認寫回結構未識別的檔案。') : null,
            wb.entries.length ? h('div', { className: 'gh2-wb-grid' },
              h('section', { className: 'gh2-wb-listbox' },
                h('div', { className: 'gh2-m5-rowhead' }, h('b', null, '條目'), h('span', { className: 'gh2-m5-meta' }, wb.entries.length + ' 條')),
                h('ul', { className: 'gh2-wb-list', 'data-gh': 'wb-entries' }, wb.entries.map((item, index) => h('li', { key: item.slot + ':' + index },
                  h('button', {
                    type: 'button',
                    className: 'gh2-wb-entry' + (index === wb.openIndex ? ' is-open' : ''),
                    'data-gh': 'wb-entry',
                    'data-index': String(index),
                    onClick: () => setWb({ openIndex: index, pendingUnknown: false }),
                  },
                    h('span', { className: 'gh2-wb-entrytitle' }, item.comment || '（沒有標題）'),
                    h('span', { className: 'gh2-m5-meta' }, 'UID ' + uidText(item.uid) + ' · ' + parseKeys(item.keysText).length + ' key')))))),
              entry ? h('section', { className: 'gh2-wb-editor', 'data-gh': 'wb-editor' },
                h('label', { className: 'gh2-m5-field' }, h('span', null, '標題 / comment'),
                  h('input', {
                    type: 'text',
                    className: 'gh2-finput',
                    'data-gh': 'wb-title',
                    value: entry.comment,
                    onChange: (e) => updateWbEntry(wb.openIndex, { comment: e.target.value }),
                  })),
                h('label', { className: 'gh2-m5-field' }, h('span', null, '主關鍵詞 / key（逗號或中文逗號分隔）'),
                  h('input', {
                    type: 'text',
                    className: 'gh2-finput',
                    'data-gh': 'wb-keys',
                    value: entry.keysText,
                    onChange: (e) => updateWbEntry(wb.openIndex, { keysText: e.target.value }),
                  })),
                h('label', { className: 'gh2-m5-field' }, h('span', null, '正文 / content'),
                  h('textarea', {
                    className: 'gh2-m5-ftextarea',
                    'data-gh': 'wb-body',
                    rows: 10,
                    spellCheck: false,
                    value: entry.content,
                    onChange: (e) => updateWbEntry(wb.openIndex, { content: e.target.value }),
                  })),
                h('p', { className: 'gh2-m5-meta' }, 'UID ' + uidText(entry.uid) + ' · 槽位 ' + entry.slot + ' · 儲存回寫 comment / content / key / keysecondary；未知欄位保留。'))
              : h('section', { className: 'gh2-wb-editor' }, h('p', { className: 'gh2-m5-note' }, wb.kind === 'unknown' ? '結構未識別，沒有可編輯條目；可以檢視下面的原始 JSON。' : '這個檔案沒有條目。'))) : null,
            h('details', { className: 'gh2-m5-raw', 'data-gh': 'wb-raw' },
              h('summary', null, '原始 JSON（只讀）'),
              h('pre', { className: 'gh2-m5-pre' }, rawText)),
            h('section', { className: 'gh2-wb-versions', 'data-gh': 'wb-versions' },
              h('div', { className: 'gh2-m5-rowhead' }, h('b', null, '版本備份'), h('span', { className: 'gh2-m5-meta' }, '儲存在 .godhand/versions'),
                h('span', { className: 'gh2-spacer' }),
                h(TextButton, {
                  onClick: () => refreshWbVersions(wb.selectedPath),
                  disabled: wb.versionsState === 'loading',
                  'data-gh': 'wb-versions-refresh',
                }, wb.versionsState === 'loading' ? '重新整理中…' : '重新整理版本')),
              errorLine(wb.versionsError, 'wb-versions-error'),
              wb.versions.length ? h('ul', { className: 'gh2-m5-list' }, wb.versions.map((version) => h('li', {
                key: version.path, className: 'gh2-m5-version', title: version.path, 'data-gh': 'wb-version',
              },
                h('span', null, formatMtime(version.mtime)),
                h('span', { className: 'gh2-mono' }, version.name || basename(version.path)),
                h('span', { className: 'gh2-m5-meta' }, formatSize(version.size)))))
                : h('p', { className: 'gh2-m5-meta' }, wb.versionsAt ? '還沒有備份。' : '還沒讀取版本列表。'))
          ) : h('p', { className: 'gh2-m5-note' }, '先選目錄，再點一個 .json 檔案讀取。'));
      }

      function metaText(value) {
        if (value === undefined || value === null || value === '') return '（空）';
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'object') {
          try { return JSON.stringify(value); } catch { return String(value); }
        }
        return String(value);
      }

      function mvuDefaultText(value) {
        if (value === undefined || value === null) return '';
        if (typeof value === 'string') return JSON.stringify(value);
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        try {
          const text = JSON.stringify(value);
          return text.length > 80 ? text.slice(0, 80) + '…' : text;
        } catch {
          return String(value);
        }
      }

      /** 一個 MVU MVU：key、type、default；record 的子欄位 key 統一顯示成 *。 */
      function MvuNode({ node, depth, star }) {
        const rawKey = node && node.key !== undefined && node.key !== null ? String(node.key) : '（未命名）';
        const key = star ? '*' : rawKey;
        const type = node && typeof node.type === 'string' && node.type ? node.type : 'unknown';
        const children = node && Array.isArray(node.children) ? node.children : [];
        const isRecord = /(^|\.)record$/u.test(type);
        const def = mvuDefaultText(node && node.default);
        const head = [
          h('span', { key: 'k', className: 'gh2-mvu-key' + (key === '*' ? ' is-star' : '') }, key),
          h('span', { key: 't', className: 'gh2-mvu-type' }, type),
          def ? h('span', { key: 'd', className: 'gh2-mvu-default' }, '預設：' + def) : null,
        ];
        if (!children.length) return h('div', { className: 'gh2-mvu-leaf' }, head);
        return h('details', { className: 'gh2-mvu-node', open: depth === 0 ? true : undefined },
          h('summary', null, head),
          children.map((child, index) => h(MvuNode, {
            key: index + ':' + (child && child.key !== undefined ? String(child.key) : ''),
            node: child,
            depth: (depth || 0) + 1,
            star: isRecord,
          })));
      }

      function MvuSection({ s }) {
        const m = s.mvu;
        const wbRoot = s.wb.root;
        const files = (Array.isArray(s.wb.files) ? s.wb.files : []).filter((file) => /\.json$/iu.test(file.name || file.path));
        const schema = m.schema;
        const roots = schema ? schema.roots : [];
        return h('section', { className: 'gh2-mvu', 'data-gh': 'mvu-section' },
          h('div', { className: 'gh2-m5-rowhead' },
            h('b', null, 'MVU 元件'),
            h('span', { className: 'gh2-m5-chip' }, '元件目錄與世界書相同')),
          h('p', { className: 'gh2-m5-warn gh2-mvu-note', 'data-gh': 'mvu-note' }, '靜態解析 Zod；未執行執行時校驗；不顯示 PASS/FAIL。'),
          h('p', { className: 'gh2-m5-note' }, '只讀：宿主只做字串掃描，不執行被檢查的指令碼，也不執行 Zod。'),
          h('p', { className: 'gh2-m5-meta', 'data-gh': 'mvu-shared-root' },
            wbRoot ? h(Fragment, null, '元件目錄與世界書相同：', h('span', { className: 'gh2-mono', 'data-gh': 'mvu-root' }, wbRoot))
              : '先在世界書頁開啟目錄。'),
          errorLine(m.folderError, 'mvu-folder-error'),
          !wbRoot ? h('p', { className: 'gh2-m5-warn', 'data-gh': 'mvu-shared-empty' }, '先在世界書頁開啟目錄；這裡不再單獨選元件目錄。')
            : s.wb.filesState === 'loading' ? h('p', { className: 'gh2-m5-meta', 'data-gh': 'mvu-loading-files' }, '正在讀取世界書目錄…')
              : files.length ? h('div', { className: 'gh2-wb-files', 'data-gh': 'mvu-files' }, files.map((file) => h('button', {
                key: file.path,
                type: 'button',
                title: file.path,
                className: 'gh2-wb-file' + (file.path === m.selectedPath ? ' is-active' : ''),
                'data-gh': 'mvu-file',
                'data-path': file.path,
                onClick: () => inspectMvuFile(file.path),
              },
                h('span', { className: 'gh2-wb-fname' }, file.name || basename(file.path)),
                h('span', { className: 'gh2-m5-meta' }, formatSize(file.size)))))
                : h('p', { className: 'gh2-m5-warn', 'data-gh': 'mvu-empty-files' }, '世界書目錄下沒有 .json 元件。'),
          m.selectedPath ? h(Fragment, null,
            m.loadingFile ? h('p', { className: 'gh2-m5-meta', 'data-gh': 'mvu-loading' }, '正在靜態解析…') : null,
            errorLine(m.error, 'mvu-error'),
            m.file ? h('div', { className: 'gh2-mvu-meta', 'data-gh': 'mvu-file-meta' },
              h('span', null, h('b', null, '檔案：'), m.file.name || basename(m.file.path), ' · ',
                h('span', { className: 'gh2-mono', 'data-gh': 'mvu-file-path' }, m.file.path), ' · ', formatSize(m.file.size))) : null,
            m.meta ? h('div', { className: 'gh2-mvu-meta', 'data-gh': 'mvu-meta' },
              h('span', null, h('b', null, 'type：'), metaText(m.meta.type)),
              h('span', null, h('b', null, 'enabled：'), metaText(m.meta.enabled)),
              h('span', { 'data-gh': 'mvu-meta-name' }, h('b', null, 'name：'), metaText(m.meta.name)),
              h('span', { 'data-gh': 'mvu-meta-id' }, h('b', null, 'id：'), metaText(m.meta.id)),
              h('span', { 'data-gh': 'mvu-meta-content' }, h('b', null, 'content 長度：'), metaText(m.meta.contentLength))) : null,
            m.warnings.length ? h('ul', { className: 'gh2-mvu-warnings', 'data-gh': 'mvu-warnings' },
              m.warnings.map((warning, index) => h('li', { key: index }, warning))) : null,
            schema ? h(Fragment, null,
              h('div', { className: 'gh2-mvu-meta', 'data-gh': 'mvu-schema-meta' },
                h('span', null, h('b', null, 'parser：'), schema.parser || '（宿主沒返回）'),
                h('span', null, h('b', null, '節點：'), String(schema.nodeCount)),
                h('span', null, h('b', null, '根欄位：'), String(roots.length))),
              roots.length ? h('div', { className: 'gh2-mvu-tree', 'data-gh': 'mvu-tree' },
                roots.map((node, index) => h(MvuNode, {
                  key: index + ':' + (node && node.key !== undefined ? String(node.key) : ''),
                  node,
                  depth: 0,
                })))
                : h('p', { className: 'gh2-m5-warn', 'data-gh': 'mvu-empty-roots' }, '宿主返回了 schema，但沒有根欄位。'))
              : (m.loadingFile ? null : (m.error ? null : h('p', { className: 'gh2-m5-warn', 'data-gh': 'mvu-reason' },
                m.reason === 'no-zod-object' ? '沒有找到 const Schema / z.object（reason：no-zod-object）。'
                  : m.reason ? '宿主沒有返回 schema（reason：' + m.reason + '）。'
                    : '宿主沒有返回 schema，也沒有給出 reason。'))))
            : h('p', { className: 'gh2-m5-note' }, wbRoot ? '點世界書目錄裡的 .json 指令碼進行靜態解析。' : '先在世界書頁開啟目錄，再點一個 .json 指令碼。'));
      }

      function CardMvuSection({ s }) {
        const detail = s.ws.cardDetail;
        const mvu = detail && detail.mvu;
        const schema = mvu && mvu.schema;
        if (!schema) return null;
        const script = mvu.script || {};
        const roots = Array.isArray(schema.roots) ? schema.roots : [];
        const scriptName = script.name || script.id || '未命名指令碼';
        return h('section', {
          className: 'gh2-mvu gh2-card-mvu', 'data-gh': 'card-mvu-section',
          tabIndex: -1, 'aria-label': '卡內 MVU',
        },
          h('div', { className: 'gh2-m5-rowhead' },
            h('b', { 'data-gh': 'card-mvu-title' }, '卡內 MVU · ' + scriptName),
            h('span', { className: 'gh2-m5-chip' }, '來自當前卡'),
            h('span', { className: 'gh2-m5-chip' }, 'Zod 靜態解析')),
          h('p', { className: 'gh2-m5-warn gh2-mvu-note', 'data-gh': 'card-mvu-note' },
            '來自當前卡；靜態解析 Zod；未執行執行時校驗；不顯示 PASS/FAIL'),
          h('p', { className: 'gh2-m5-note' }, '只讀：宿主只掃描指令碼字串，不執行卡內 JS，也不執行 Zod。'),
          h('div', { className: 'gh2-mvu-meta', 'data-gh': 'card-mvu-meta' },
            h('span', null, h('b', null, '指令碼：'), scriptName),
            h('span', null, h('b', null, 'type：'), script.type || 'script'),
            h('span', null, h('b', null, 'enabled：'), script.enabled ? 'true' : 'false'),
            h('span', null, h('b', null, 'content 長度：'), String(script.contentLength || 0)),
            h('span', null, h('b', null, 'parser：'), schema.parser || 'static-zod-object'),
            h('span', null, h('b', null, '節點：'), String(schema.nodeCount || 0)),
            h('span', null, h('b', null, '根欄位：'), String(roots.length))),
          mvu.warnings.length ? h('ul', { className: 'gh2-mvu-warnings', 'data-gh': 'card-mvu-warnings' },
            mvu.warnings.map((warning, index) => h('li', { key: index }, warning))) : null,
          roots.length ? h('div', { className: 'gh2-mvu-tree', 'data-gh': 'card-mvu-tree' },
            roots.map((node, index) => h(MvuNode, {
              key: index + ':' + (node && node.key !== undefined ? String(node.key) : ''),
              node,
              depth: 0,
            })))
            : h('p', { className: 'gh2-m5-warn', 'data-gh': 'card-mvu-empty-roots' }, '宿主返回了卡內 schema，但沒有根欄位。'));
      }

      function WorldbookJsonSection({ wb }) {
        if (!wb.selectedPath || wb.raw === null || wb.raw === undefined) {
          return h('section', { className: 'gh2-wb-json', 'data-gh': 'wb-json-section' },
            h('div', { className: 'gh2-m5-rowhead' }, h('b', null, '當前世界書 JSON'), h('span', { className: 'gh2-m5-meta' }, '只讀')),
            h('p', { className: 'gh2-m5-warn', 'data-gh': 'var-empty' }, '還沒有開啟世界書檔案。先去世界書頁選擇一個 .json。'),
            h(TextButton, { onClick: () => setUi({ mode: 'full', tab: 'worldbook' }) }, '去世界書選擇檔案'));
        }
        const kind = wb.kind === 'st-object' ? 'st-object' : wb.kind === 'st-array' ? 'st-array' : '結構未識別';
        return h('section', { className: 'gh2-wb-json', 'data-gh': 'wb-json-section' },
          h('div', { className: 'gh2-m5-rowhead' }, h('b', null, '當前世界書 JSON'), h('span', { className: 'gh2-m5-meta' }, '只讀')),
          h('p', { className: 'gh2-m5-warn', 'data-gh': 'var-note' }, '真實檔案結構；MVU 結構校驗還沒接入。這裡只顯示 JSON 節點，不做 PASS / FAIL 判斷。'),
          h('p', { className: 'gh2-m5-meta' },
            '檔案：', h('span', { className: 'gh2-mono', 'data-gh': 'var-path' }, wb.selectedPath),
            ' · ', kind, ' · ', String(wb.entries.length), ' 個條目'),
          wb.dirty ? h('p', { className: 'gh2-m5-note', 'data-gh': 'var-dirty-note' }, '世界書還有未儲存修改：這裡顯示的是檔案上一次讀到（或儲存成功）的真實 JSON，不是編輯器裡的草稿。') : null,
          h('div', { className: 'gh2-json-tree', 'data-gh': 'var-tree' },
            h(JsonValue, { name: basename(wb.selectedPath), value: wb.raw, depth: 0, budget: { left: 2000 } })),
          h('p', { className: 'gh2-m5-note' }, '只讀：節點直接來自檔案；沒有執行 MVU / Zod 校驗，所以不顯示透過或失敗。'));
      }

      function legacyInitialDisplay(value, wildcard) {
        if (wildcard || value === undefined) return { text: '—', json: false };
        if (value === null) return { text: 'null', json: false };
        if (typeof value === 'string') return { text: value === '' ? '（空字串）' : value, json: false };
        if (typeof value === 'number' || typeof value === 'boolean') return { text: String(value), json: false };
        return { text: JSON.stringify(value, null, 2), json: true };
      }
      function lookupLegacyInitial(statData, path) {
        if (!statData || typeof statData !== 'object') return undefined;
        let current = statData;
        for (const part of String(path).split('.')) {
          if (Array.isArray(current)) {
            const index = Number(part);
            if (!Number.isInteger(index) || index < 0 || index >= current.length) return undefined;
            current = current[index];
            continue;
          }
          if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, part)) return undefined;
          current = current[part];
        }
        return current;
      }
      /** 把 Schema roots 扁平成節點列表；初始值保留 JSON，record 的 * 才不硬猜。 */
      function flattenLegacyNodes(roots, statData) {
        const out = [];
        const visit = (node, parentPath, depth, parentType, ancestorWildcard) => {
          const raw = node && typeof node === 'object' ? node : {};
          const key = raw.key !== undefined && raw.key !== null ? String(raw.key) : '（未命名）';
          const declaredType = typeof raw.type === 'string' && raw.type ? raw.type : 'unknown';
          const children = Array.isArray(raw.children) ? raw.children : [];
          const type = /^ref:/u.test(declaredType) && children.length ? 'object' : declaredType;
          const path = parentPath ? parentPath + '.' + key : key;
          const isWildcard = ancestorWildcard || key === '*' || /(^|\.)record$/u.test(parentType);
          const initial = legacyInitialDisplay(lookupLegacyInitial(statData, path), isWildcard);
          const defaultText = raw.default === undefined || raw.default === null ? '—' : mvuDefaultText(raw.default);
          out.push({
            path, key, type, defaultText,
            initialText: initial.text, initialJson: initial.json,
            depth, childCount: children.length, hasChildren: children.length > 0, parentPath,
          });
          for (const child of children) visit(child, path, depth + 1, type, isWildcard);
        };
        for (const root of Array.isArray(roots) ? roots : []) visit(root, '', 0, '', false);
        return out;
      }
      function workbenchActualType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
      }
      function workbenchSchemaType(type) {
        const raw = String(type || '');
        if (!raw || raw === 'any' || raw === 'unknown' || raw.startsWith('ref:')) return '';
        if (raw === 'integer') return 'number';
        if (raw === 'record') return 'object';
        return raw;
      }
      function collectInitialPaths(value, prefix, out) {
        if (prefix) out.push(prefix);
        if (Array.isArray(value)) {
          value.forEach((item, index) => collectInitialPaths(item, prefix ? prefix + '.' + index : String(index), out));
        } else if (value && typeof value === 'object') {
          Object.keys(value).sort().forEach((key) => collectInitialPaths(value[key], prefix ? prefix + '.' + key : key, out));
        }
      }
      function compareSchemaInitial(schemaNodes, initial) {
        const missing = [];
        const extra = [];
        const typeMismatch = [];
        const schemaByPath = new Map(schemaNodes.map((node) => [node.path, node]));
        const allowedPrefixes = schemaNodes
          .filter((node) => node.type === 'record' || node.type === 'array' || node.path.includes('*'))
          .map((node) => node.path);
        const missingPrefixes = [];
        for (const node of schemaNodes) {
          if (!node.path || node.path.includes('*')) continue;
          const schemaType = workbenchSchemaType(node.type);
          if (!schemaType) continue;
          if (missingPrefixes.some((prefix) => node.path === prefix || node.path.startsWith(prefix + '.'))) continue;
          const actual = lookupLegacyInitial(initial, node.path);
          if (actual === undefined) {
            missing.push({ path: node.path, schemaType });
            if (node.hasChildren || schemaType === 'array' || schemaType === 'object') missingPrefixes.push(node.path);
            continue;
          }
          const initialType = workbenchActualType(actual);
          if (initialType !== schemaType) typeMismatch.push({ path: node.path, schemaType, initialType });
        }
        const initialPaths = [];
        collectInitialPaths(initial, '', initialPaths);
        for (const path of initialPaths) {
          if (schemaByPath.has(path)) continue;
          if (allowedPrefixes.some((prefix) => path.startsWith(prefix + '.'))) continue;
          extra.push({ path });
        }
        return { missing, extra, typeMismatch, initialPaths };
      }
      function workbenchPath(path) {
        return String(path || '').replace(/^\//u, '').replace(/\//gu, '.');
      }
      function compareContractSchema(contract, schemaNodes, initialPaths) {
        const schemaByPath = new Map(schemaNodes.map((node) => [node.path, node]));
        const allowedPrefixes = schemaNodes
          .filter((node) => node.type === 'record' || node.type === 'array' || node.path.includes('*'))
          .map((node) => node.path);
        const initialSet = new Set(initialPaths);
        const ruleUnknown = [];
        const ruleTypeMismatch = [];
        const fields = contract && Array.isArray(contract.fields) ? contract.fields : [];
        for (const field of fields) {
          const path = workbenchPath(field && field.path);
          if (!path || path.includes('*') || initialSet.has(path)) continue;
          const node = schemaByPath.get(path);
          if (!node) {
            if (!allowedPrefixes.some((prefix) => path.startsWith(prefix + '.'))) {
              ruleUnknown.push({ path, type: workspaceString(field.type), label: workspaceString(field.label) });
            }
            continue;
          }
          const schemaType = workbenchSchemaType(node.type);
          const fieldType = workbenchSchemaType(field.type);
          if (schemaType && fieldType && fieldType !== 'any' && schemaType !== fieldType) {
            ruleTypeMismatch.push({ path, schemaType, ruleType: fieldType });
          }
        }
        return {
          ruleUnknown,
          ruleTypeMismatch,
          ruleChecks: contract && Array.isArray(contract.ruleChecks) ? contract.ruleChecks.map((check) => ({
            path: workbenchPath(check.path),
            label: workspaceString(check.label),
            detail: workspaceString(check.detail),
          })) : [],
        };
      }

      function LegacyNodesPane() {
        const s = useStoreState();
        const detail = s.ws.cardDetail;
        const cardMvu = detail && detail.mvu;
        const manualSchema = s.mvu && s.mvu.schema;
        const cardSchema = cardMvu && cardMvu.schema;
        const schema = cardSchema || manualSchema || null;
        const scriptName = cardMvu && cardMvu.script ? (cardMvu.script.name || cardMvu.script.id) : '';
        const sourceLabel = cardSchema ? '卡內 MVU · ' + (scriptName || '未命名指令碼')
          : manualSchema ? '元件目錄 · ' + (s.mvu.file && (s.mvu.file.name || basename(s.mvu.file.path)) || basename(s.mvu.selectedPath) || 'MVU 元件')
            : '';
        const sourceKey = cardSchema
          ? 'card:' + ((s.ws.activeCard && s.ws.activeCard.file && s.ws.activeCard.file.path) || '') + ':' + sourceLabel
          : manualSchema ? 'manual:' + (s.mvu.selectedPath || sourceLabel) : 'none';
        const statData = detail && detail.legacyVars ? detail.legacyVars.statData : null;
        const initVarSourceText = cardMvu && cardMvu.initVarSource ? cardMvu.initVarSource : '';
        const initialSourceLabel = initVarSourceText
          ? '真實變數書 · ' + (cardMvu.initVarName || '初始變數')
          : statData ? 'tavern_helper.legacyVars.stat_data' : '空物件';
        const [hostInitial, setHostInitial] = useState(null);
        const initialData = initVarSourceText ? hostInitial : statData;
        const nodes = useMemo(() => schema ? flattenLegacyNodes(schema.roots, initialData) : [], [schema, initialData]);
        const [search, setSearch] = useState('');
        const [selectedPath, setSelectedPath] = useState('');
        const [collapsed, setCollapsed] = useState(() => new Set());
        const focus = s.ws.legacyFocus;
        useEffect(() => {
          setSearch('');
          setCollapsed(new Set());
          setSelectedPath(nodes.length ? nodes[0].path : '');
        }, [sourceKey, nodes.length]);
        useEffect(() => {
          if (!focus) return;
          setSearch('');
          setCollapsed(new Set());
          const first = nodes[0];
          if (first) setSelectedPath(first.path);
          const timer = setTimeout(() => {
            const row = [...document.querySelectorAll('[data-gh="var-node-row"]')].find((el) => el.dataset.path === (first && first.path));
            if (!row) return;
            row.scrollIntoView({ block: 'center', behavior: 'smooth' });
            row.focus({ preventScroll: true });
            row.classList.add('is-focus');
            setTimeout(() => row.classList.remove('is-focus'), 1500);
          }, 80);
          return () => clearTimeout(timer);
        }, [focus, sourceKey]);
        useEffect(() => {
          setHostInitial(null);
          if (!initVarSourceText || !cardMvu || !cardMvu.schemaSource) return undefined;
          let cancelled = false;
          (async () => {
            try {
              const payload = await postJson(M5.api.mvuSimulate, {
                initialLegacys: initVarSourceText,
                operations: [],
                updateRules: '',
                schema: cardMvu.schemaSource,
                dialect: 'rfc6902',
              });
              const result = payload.result || payload;
              if (!cancelled && result && result.before && typeof result.before === 'object' && !Array.isArray(result.before)) {
                setHostInitial(result.before);
              }
            } catch {}
          })();
          return () => { cancelled = true; };
        }, [sourceKey, initVarSourceText]);
        const [compareBusy, setCompareBusy] = useState(false);
        const [compareError, setCompareError] = useState('');
        const [compareResult, setCompareResult] = useState(null);
        const [compareCollapsed, setCompareCollapsed] = useState(() => new Set());
        const [runBusy, setRunBusy] = useState(false);
        const [runError, setRunError] = useState('');
        const [runResult, setRunResult] = useState(null);
        const [writeConfirm, setWriteConfirm] = useState(false);
        const [writing, setWriting] = useState(false);
        const [writeError, setWriteError] = useState('');
        const [writeResult, setWriteResult] = useState(null);
        const writeResultSourceRef = useRef('');
        const initialJson = statData ? JSON.stringify(statData, null, 2) : '{}';
        const initialDefault = initVarSourceText || initialJson;
        const defaultRuleEntries = cardMvu && Array.isArray(cardMvu.updateRuleEntries) && cardMvu.updateRuleEntries.length
          ? cardMvu.updateRuleEntries.map((entry) => ({ ...entry }))
          : (cardMvu && cardMvu.updateRules ? [{ id: 'rule-1', name: '更新規則', content: cardMvu.updateRules }] : []);
        const makeWork = (notice = '') => ({
          sourceKey,
          schemaSource: cardMvu && cardMvu.schemaSource ? cardMvu.schemaSource : '',
          initialText: initialDefault,
          initialSource: initialSourceLabel,
          ruleEntries: defaultRuleEntries.map((entry) => ({ ...entry })),
          beforeText: initialDefault,
          operationsText: '[]',
          dialect: 'rfc6902',
          resetNotice: notice,
        });
        const work = s.ws.varWork && s.ws.varWork.sourceKey === sourceKey ? s.ws.varWork : makeWork('');
        const workRuleEntries = Array.isArray(work.ruleEntries) ? work.ruleEntries : defaultRuleEntries;
        const mergedRules = workRuleEntries.map((entry) => entry.content || '').join('\n\n');
        useEffect(() => {
          const current = store.get().ws.varWork;
          if (!current || current.sourceKey !== sourceKey) {
            setWs({ varWork: makeWork(current ? '當前卡/來源已切換，工作副本已重置。' : (sourceLabel ? '工作副本已從當前卡載入。' : '')) });
          }
          setCompareResult(null);
          setCompareError('');
          setCompareBusy(false);
          setCompareCollapsed(new Set());
          setRunResult(null);
          setRunError('');
          setRunBusy(false);
          setWriteConfirm(false);
          setWriteError('');
          if (writeResultSourceRef.current !== sourceKey) setWriteResult(null);
          setWriting(false);
        }, [sourceKey]);
        const updateWork = (patch) => {
          const current = store.get().ws.varWork;
          const base = current && current.sourceKey === sourceKey ? current : makeWork('');
          setWs({ varWork: { ...base, ...patch, sourceKey } });
        };
        const updateRuleEntry = (index, content) => {
          const next = workRuleEntries.map((entry, item) => item === index ? { ...entry, content } : entry);
          updateWork({ ruleEntries: next });
        };
        const reloadWork = () => {
          setWs({ varWork: makeWork('已從當前卡重新載入工作副本。') });
          setCompareResult(null);
          setCompareError('');
          setCompareCollapsed(new Set());
          setRunResult(null);
          setRunError('');
          setWriteConfirm(false);
          setWriteError('');
          writeResultSourceRef.current = '';
          setWriteResult(null);
        };
        const workTab = ['structure', 'compare', 'run'].includes(s.ws.legacyTab) ? s.ws.legacyTab : 'structure';
        const setWorkTab = (next) => setWs({ legacyTab: next });
        async function runCompare() {
          setCompareBusy(true);
          setCompareError('');
          setCompareResult(null);
          setCompareCollapsed(new Set());
          try {
            let schema = null;
            let schemaError = '';
            try {
              const parsed = await postJson(M5.api.mvuParse, { content: work.schemaSource });
              schema = normalizeMvuSchema(parsed.schema);
              if (!schema) schemaError = workspaceString(parsed.reason) || 'no-schema';
            } catch (error) {
              schemaError = errorText(error);
            }
            let initial = null;
            let initialError = '';
            try {
              const seedPayload = await postJson(M5.api.mvuSimulate, {
                initialLegacys: work.initialText,
                operations: [],
                updateRules: '',
                schema: work.schemaSource,
                dialect: 'rfc6902',
              });
              const seed = seedPayload.result || seedPayload;
              if (seed && seed.before && typeof seed.before === 'object' && !Array.isArray(seed.before)) {
                initial = seed.before;
              } else {
                initialError = '宿主沒有返回可對照的初始變數物件。';
              }
            } catch (error) {
              initialError = errorText(error);
            }
            let simulation = null;
            let simulateError = '';
            try {
              const payload = await postJson(M5.api.mvuSimulate, {
                initialLegacys: work.initialText,
                operations: [],
                updateRules: mergedRules,
                schema: work.schemaSource,
                dialect: 'rfc6902',
              });
              simulation = payload.result || payload;
            } catch (error) {
              simulateError = errorText(error);
            }
            const schemaNodes = schema ? flattenLegacyNodes(schema.roots, null) : [];
            const initialCompare = initial ? compareSchemaInitial(schemaNodes, initial) : { missing: [], extra: [], typeMismatch: [], initialPaths: [] };
            const ruleCompare = compareContractSchema(simulation && simulation.contract, schemaNodes, initialCompare.initialPaths);
            setCompareResult({
              schemaError,
              initialError,
              simulateError,
              schemaParsed: !!schema,
              schemaReason: schema ? '' : schemaError,
              schemaNodes,
              schemaNodeCount: schemaNodes.length,
              schemaFieldCount: schemaNodes.filter((node) => node.type !== 'object' && !node.path.includes('*') && !/^ref:/u.test(node.type)).length,
              fieldCount: simulation && simulation.contract && Array.isArray(simulation.contract.fields) ? simulation.contract.fields.length : 0,
              ruleEntryCount: workRuleEntries.length,
              initialSource: work.initialSource || initialSourceLabel,
              missing: initialCompare.missing,
              extra: initialCompare.extra,
              typeMismatch: initialCompare.typeMismatch,
              ruleUnknown: ruleCompare.ruleUnknown,
              ruleTypeMismatch: ruleCompare.ruleTypeMismatch,
              ruleChecks: ruleCompare.ruleChecks,
            });
          } catch (error) {
            setCompareError(errorText(error));
          } finally {
            setCompareBusy(false);
          }
        }
        async function runSimulation() {
          setRunBusy(true);
          setRunError('');
          setRunResult(null);
          try {
            const payload = await postJson(M5.api.mvuSimulate, {
              initialLegacys: work.beforeText,
              operations: work.operationsText,
              updateRules: mergedRules,
              schema: work.schemaSource,
              dialect: work.dialect || 'rfc6902',
            });
            const result = payload.result || payload;
            const operations = result && result.operation;
            const operationCount = Array.isArray(operations) ? operations.length
              : operations && Array.isArray(operations.operations) ? operations.operations.length : 0;
            setRunResult({
              result,
              checks: result && Array.isArray(result.checks) ? result.checks : [],
              diff: result && Array.isArray(result.diff) ? result.diff : [],
              after: result ? result.after : null,
              trace: result && result.trace ? result.trace : result,
              operationCount,
              fieldCount: result && result.contract && Array.isArray(result.contract.fields) ? result.contract.fields.length : 0,
              zodExecuted: !!(result && ((result.trace && result.trace.schema && result.trace.schema.zodExecuted)
                || (result.schema && result.schema.zodExecuted))),
            });
          } catch (error) {
            setRunError(errorText(error));
          } finally {
            setRunBusy(false);
          }
        }
        async function writeCardBack() {
          setWriting(true);
          setWriteError('');
          setWriteResult(null);
          try {
            const wsNow = store.get().ws;
            const card = wsNow.activeCard && wsNow.activeCard.file;
            if (!card || !card.path) throw new Error('沒有選中的卡，無法寫回');
            const project = activeProject();
            const root = (project && project.root) || wsNow.root || '';
            const body = { path: card.path };
            if (work.schemaSource) body.schemaContent = work.schemaSource;
            if (workRuleEntries.length) {
              body.updateRules = workRuleEntries.map((entry) => ({
                id: entry.id, name: entry.name, content: entry.content,
              }));
            }
            const initKind = cardMvu && cardMvu.initVar ? cardMvu.initVar.kind : '';
            if (initKind === 'worldbook' || (!initKind && cardMvu && cardMvu.initVarSource)) {
              body.initVarContent = work.initialText;
            } else if (initKind === 'tavern-helper' || (!initKind && statData)) {
              try {
                body.legacyVars = JSON.parse(work.initialText);
              } catch (error) {
                throw new Error('初始變數是 tavern_helper.legacyVars，需要 JSON 物件：' + error.message);
              }
            }
            const data = await postJson(M5.api.cardWrite, body);
            if (data && data.ok === false) throw new Error(data.error || data.message || '寫回失敗');
            setWriteResult(data);
            writeResultSourceRef.current = sourceKey;
            setWriteConfirm(false);
            setWs({ cardDetail: null });
            const inspected = await inspectCardDetail(root, card.path, { silent: true });
            setWriteResult(data);
            if (!inspected.ok) setWriteError('寫回成功，但重新 inspect 失敗：' + inspected.error);
          } catch (error) {
            setWriteError(errorText(error));
          } finally {
            setWriting(false);
          }
        }
        const query = search.trim().toLowerCase();
        const nodeByPath = useMemo(() => new Map(nodes.map((node) => [node.path, node])), [nodes]);
        const matchingPaths = new Set();
        if (query) {
          for (const node of nodes) {
            if (![node.path, node.key, node.type].some((value) => String(value).toLowerCase().includes(query))) continue;
            let parent = node.path;
            while (parent) {
              matchingPaths.add(parent);
              const parentNode = nodeByPath.get(parent);
              parent = parentNode ? parentNode.parentPath : '';
            }
          }
        }
        const isVisible = (node) => {
          let parent = node.parentPath;
          while (parent) {
            if (collapsed.has(parent)) return false;
            const parentNode = nodeByPath.get(parent);
            parent = parentNode ? parentNode.parentPath : '';
          }
          return true;
        };
        const visible = query ? nodes.filter((node) => matchingPaths.has(node.path)) : nodes.filter(isVisible);
        const selected = nodes.find((node) => node.path === selectedPath) || null;
        const toggle = (path) => {
          setCollapsed((current) => {
            const next = new Set(current);
            if (next.has(path)) next.delete(path); else next.add(path);
            return next;
          });
        };
        const parents = nodes.filter((node) => node.hasChildren);
        const allCollapsed = parents.length > 0 && parents.every((node) => collapsed.has(node.path));
        const toggleAll = () => {
          if (allCollapsed) setCollapsed(new Set());
          else setCollapsed(new Set(parents.map((node) => node.path)));
        };
        const treeRows = visible.map((node) => h('button', {
          key: node.path,
          type: 'button',
          role: 'treeitem',
          className: 'gh2-var-treeitem' + (node.path === selectedPath ? ' is-selected' : ''),
          'aria-level': node.depth + 1,
          'aria-selected': node.path === selectedPath,
          'aria-expanded': node.hasChildren ? !collapsed.has(node.path) : undefined,
          'data-gh': 'var-node-row',
          'data-path': node.path,
          title: node.path,
          style: { paddingLeft: (7 + node.depth * 14) + 'px' },
          onClick: () => setSelectedPath(node.path),
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPath(node.path); }
            if (node.hasChildren && e.key === 'ArrowLeft' && !collapsed.has(node.path)) toggle(node.path);
            if (node.hasChildren && e.key === 'ArrowRight' && collapsed.has(node.path)) toggle(node.path);
          },
        },
          h('span', {
            className: 'gh2-var-disclosure',
            'data-gh': 'var-toggle',
            'aria-hidden': node.hasChildren ? undefined : 'true',
            onClick: node.hasChildren ? (e) => { e.stopPropagation(); toggle(node.path); } : undefined,
          }, node.hasChildren ? (collapsed.has(node.path) ? '▸' : '▾') : '•'),
          h('code', { className: 'gh2-var-treekey' }, node.key),
          h('small', { className: 'gh2-var-treemeta' }, node.childCount ? node.type + ' · ' + node.childCount : node.type)));
        const treePane = h('div', { className: 'gh2-var-tree-pane' },
          h('div', { className: 'gh2-var-panehead' },
            h('div', null, h('span', null, '變數結構'), h('h4', null, '路徑樹')),
            h('span', { className: 'gh2-m5-meta' }, nodes.length + ' 個節點')),
          h('div', { className: 'gh2-var-treetools' },
            h('input', {
              type: 'search',
              className: 'gh2-finput',
              'data-gh': 'var-search',
              'aria-label': '搜尋MVU',
              placeholder: '搜尋路徑 / key / type',
              value: search,
              onChange: (e) => setSearch(e.target.value),
            }),
            h(TextButton, { onClick: toggleAll, 'data-gh': 'var-collapse-all' }, allCollapsed ? '全部展開' : '全部摺疊')),
          h('div', { className: 'gh2-var-tree', role: 'tree', 'aria-label': '變數路徑樹', 'data-gh': 'var-tree' },
            treeRows.length ? treeRows : h('div', { className: 'gh2-var-tree-empty', 'data-gh': 'var-tree-empty' },
              h('strong', null, query ? '沒有匹配的變數路徑' : '空變數樹'),
              h('span', null, query ? '換一個關鍵詞，或清空搜尋。' : 'Schema 沒有根欄位。'))));
        const field = (label, value, gh, mono) => h('div', { className: 'gh2-m5-field' },
          h('span', null, label),
          h('div', { className: 'gh2-var-value' + (mono ? ' mono' : ''), 'data-gh': gh }, value));
        const detailPane = h('div', { className: 'gh2-var-detail-pane', 'data-gh': 'var-detail' },
          h('div', { className: 'gh2-var-panehead' },
            h('div', null, h('span', null, '節點詳情'), h('h4', null, '只讀節點')),
            h('code', { className: 'gh2-var-pathcode', 'data-gh': 'var-detail-path', title: selected ? selected.path : '當前變數完整路徑' }, selected ? selected.path : '尚未選擇節點')),
          selected ? h('div', { className: 'gh2-var-detailbody' },
            h('div', { className: 'gh2-var-fieldgrid' },
              field('key', selected.key, 'var-detail-key', true),
              field('type', selected.type, 'var-detail-type'),
              field('default', selected.defaultText, 'var-detail-default', true)),
            h('div', { className: 'gh2-m5-field' },
              h('span', null, '初始值'),
              h('pre', { className: 'gh2-var-initial' + (selected.initialJson ? ' is-json' : ''), 'data-gh': 'var-detail-initial' }, selected.initialText)),
            h('p', { className: 'gh2-m5-meta', 'data-gh': 'var-detail-source' }, '來源：', sourceLabel, ' · 初始：', initialSourceLabel),
            h('p', { className: 'gh2-m5-note' }, '初始值優先真實變數書 [initvar]，沒有才用 stat_data；物件/陣列顯示 JSON；record 的 * 和缺失顯示 —。'))
            : h('div', { className: 'gh2-var-detail-empty', 'data-gh': 'var-detail-empty' },
              h('strong', null, '選擇一個MVU'),
              h('span', null, '左樹選擇節點後顯示完整路徑、型別、預設值和初始值。')));
        const sourceBar = h('div', { className: 'gh2-var-toolbar' },
          h('span', { className: 'gh2-m5-meta', 'data-gh': 'var-source' },
            '來源：', sourceLabel ? h('b', null, sourceLabel)
              : h('b', null, s.ws.activeCard ? '當前卡沒有 MVU Schema' : '（未選卡/元件）'),
            ' · 初始：', h('span', { 'data-gh': 'var-initial-source-label' }, initialSourceLabel),
            ' · ', String(nodes.length), ' 個節點'));
        const structureContent = schema ? h('div', { className: 'gh2-var-visual', 'data-gh': 'var-visual' }, treePane, detailPane)
          : h('p', { className: 'gh2-m5-warn', 'data-gh': 'var-nodes-empty' },
            s.mvu && s.mvu.folderError ? '元件目錄讀取失敗：' + s.mvu.folderError
              : '當前沒有卡內或元件目錄的 MVU Schema。先選中帶 Schema 的卡，或在世界書目錄裡開啟元件 JSON。');
        const resultBlock = (title, items, render, gh) => h('section', { className: 'gh2-var-resultblock', 'data-gh': gh },
          h('div', { className: 'gh2-m5-rowhead' }, h('b', null, title), h('span', { className: 'gh2-m5-meta' }, items.length + ' 項')),
          items.length
            ? h('ul', { className: 'gh2-var-resultlist' }, items.map((item, index) => h('li', { key: index }, render(item, index))))
            : h('p', { className: 'gh2-m5-note' }, '沒有發現'));
        const compareSchemaNodes = compareResult && Array.isArray(compareResult.schemaNodes) ? compareResult.schemaNodes : [];
        const compareNodeByPath = new Map(compareSchemaNodes.map((node) => [node.path, node]));
        const compareVisibleNodes = compareSchemaNodes.filter((node) => {
          let parent = node.parentPath;
          while (parent) {
            if (compareCollapsed.has(parent)) return false;
            const parentNode = compareNodeByPath.get(parent);
            parent = parentNode ? parentNode.parentPath : '';
          }
          return true;
        });
        const toggleCompareNode = (path) => {
          setCompareCollapsed((current) => {
            const next = new Set(current);
            if (next.has(path)) next.delete(path); else next.add(path);
            return next;
          });
        };
        const compareTree = compareResult ? h('section', { className: 'gh2-var-schema-tree-block', 'data-gh': 'var-schema-tree-block' },
          h('div', { className: 'gh2-m5-rowhead' }, h('b', null, 'Schema 樹'), h('span', { className: 'gh2-m5-meta' }, compareSchemaNodes.length + ' 節點')),
          h('div', { className: 'gh2-var-schema-tree', role: 'tree', 'aria-label': '解析後的 Schema 樹', 'data-gh': 'var-schema-tree' },
            compareVisibleNodes.length ? compareVisibleNodes.map((node) => h('div', {
              key: node.path, role: 'treeitem', className: 'gh2-var-schema-tree-row',
              'aria-level': node.depth + 1, 'aria-expanded': node.hasChildren ? !compareCollapsed.has(node.path) : undefined,
              'data-gh': 'var-schema-tree-row', 'data-path': node.path,
              style: { paddingLeft: (7 + node.depth * 14) + 'px' }, title: node.path,
            },
              h('span', {
                className: 'gh2-var-disclosure', 'data-gh': 'var-schema-tree-toggle',
                onClick: node.hasChildren ? () => toggleCompareNode(node.path) : undefined,
              }, node.hasChildren ? (compareCollapsed.has(node.path) ? '▸' : '▾') : '•'),
              h('code', { className: 'gh2-var-treekey' }, node.key),
              h('small', { className: 'gh2-var-treemeta' }, node.childCount ? node.type + ' · ' + node.childCount : node.type)))
              : h('p', { className: 'gh2-m5-note' }, '解析後顯示 Schema 樹。')))
          : null;
        const compareView = h('div', { className: 'gh2-var-compare', 'data-gh': 'var-compare' },
          h('p', { className: 'gh2-m5-note' }, 'Schema / 真實變數書 / 更新規則 三方對照；工作副本；寫回卡需確認並備份；不執行 Zod。修改隻影響本頁，切卡/過載會重置。'),
          h('label', { className: 'gh2-m5-field' },
            h('span', null, 'Schema 源稿'),
            h('textarea', {
              className: 'gh2-var-textarea', 'data-gh': 'var-schema-source', rows: 10, spellCheck: false,
              value: work.schemaSource, onChange: (e) => updateWork({ schemaSource: e.target.value }),
            })),
          h('div', { className: 'gh2-var-two' },
            h('label', { className: 'gh2-m5-field' },
              h('span', { 'data-gh': 'var-init-source' }, '初始變數（來源：' + (work.initialSource || initialSourceLabel) + '）'),
              h('textarea', {
                className: 'gh2-var-textarea', 'data-gh': 'var-initial-source', rows: 8, spellCheck: false,
                value: work.initialText, onChange: (e) => updateWork({ initialText: e.target.value }),
              })),
            h('div', { className: 'gh2-m5-field' },
              h('span', null, '更新規則（逐條，' + workRuleEntries.length + ' 條）'),
              workRuleEntries.length ? h('div', { className: 'gh2-var-ruleentries', 'data-gh': 'var-rule-entries' },
                workRuleEntries.map((entry, index) => h('label', {
                  key: entry.id || index, className: 'gh2-var-ruleentry', 'data-gh': 'var-rule-entry', 'data-id': entry.id,
                },
                  h('span', null, (entry.name || '更新規則') + ' · ' + (entry.id || 'rule-' + (index + 1))),
                  h('textarea', {
                    className: 'gh2-var-textarea', 'data-gh': 'var-rule-entry-content', rows: 5, spellCheck: false,
                    value: entry.content, onChange: (e) => updateRuleEntry(index, e.target.value),
                  }))))
                : h('p', { className: 'gh2-m5-note' }, '當前卡沒有更新規則條目。'))),
          h('div', { className: 'gh2-m5-actions' },
            h(TextButton, { onClick: runCompare, disabled: compareBusy, 'data-gh': 'var-compare-run' }, compareBusy ? '解析並對照中…' : '解析並對照'),
            h(TextButton, { onClick: reloadWork, disabled: compareBusy, 'data-gh': 'var-compare-reload' }, '從當前卡重新載入')),
          errorLine(compareError, 'var-compare-error'),
          compareResult ? h('div', { className: 'gh2-var-result', 'data-gh': 'var-compare-result' },
            h('div', { className: 'gh2-var-summary', 'data-gh': 'var-compare-summary' },
              h('span', { className: 'gh2-m5-chip' }, 'Schema 節點 ' + compareResult.schemaNodeCount),
              h('span', { className: 'gh2-m5-chip' }, 'Schema 欄位 ' + compareResult.schemaFieldCount),
              h('span', { className: 'gh2-m5-chip' }, '契約欄位 ' + compareResult.fieldCount),
              h('span', { className: 'gh2-m5-chip' }, '規則條目 ' + compareResult.ruleEntryCount)),
            errorLine(compareResult.schemaError, 'var-compare-schema-error'),
            errorLine(compareResult.initialError, 'var-compare-initial-error'),
            errorLine(compareResult.simulateError, 'var-compare-simulate-error'),
            compareTree,
            resultBlock('缺初始值', compareResult.missing, (item) => item.path + '（' + item.schemaType + '）', 'var-missing'),
            resultBlock('額外初始值', compareResult.extra, (item) => item.path, 'var-extra'),
            resultBlock('型別不一致', compareResult.typeMismatch, (item) => item.path + '：Schema ' + item.schemaType + ' / 初始 ' + item.initialType, 'var-type-mismatch'),
            resultBlock('規則欄位不在 Schema', compareResult.ruleUnknown, (item) => item.path + (item.type ? '（' + item.type + '）' : ''), 'var-rule-unknown'),
            resultBlock('規則欄位型別不一致', compareResult.ruleTypeMismatch, (item) => item.path + '：Schema ' + item.schemaType + ' / 規則 ' + item.ruleType, 'var-rule-type'),
            resultBlock('規則 check 條件', compareResult.ruleChecks, (item) => (item.path || '（無路徑）') + ' · ' + (item.label || '（無標籤）') + (item.detail ? ' · ' + item.detail : ''), 'var-rule-checks'))
            : h('p', { className: 'gh2-m5-note', 'data-gh': 'var-compare-empty' }, '點“解析並對照”後顯示差異。'));
        const checkStatusText = { pass: '透過', observed: '命中', not_triggered: '未觸發', not_run: '未執行' };
        const runView = h('div', { className: 'gh2-var-run', 'data-gh': 'var-run' },
          h('p', { className: 'gh2-m5-note' }, 'RPN 確定性安全子集：JSONPatch + safe contract；不執行 MVU 原生 JS/Zod。'),
          h('div', { className: 'gh2-var-two' },
            h('label', { className: 'gh2-m5-field' },
              h('span', null, '執行前狀態（預設 ' + (work.initialSource || initialSourceLabel) + '）'),
              h('textarea', {
                className: 'gh2-var-textarea', 'data-gh': 'var-before', rows: 10, spellCheck: false,
                value: work.beforeText, onChange: (e) => updateWork({ beforeText: e.target.value }),
              })),
            h('label', { className: 'gh2-m5-field' },
              h('span', null, '候選 JSONPatch 操作'),
              h('textarea', {
                className: 'gh2-var-textarea', 'data-gh': 'var-operations', rows: 10, spellCheck: false,
                value: work.operationsText, onChange: (e) => updateWork({ operationsText: e.target.value }),
              }))),
          h('div', { className: 'gh2-m5-actions' },
            h('label', { className: 'gh2-var-dialect' }, h('span', null, '方言'),
              h('select', {
                className: 'gh2-finput', 'data-gh': 'var-dialect', value: work.dialect,
                onChange: (e) => updateWork({ dialect: e.target.value }),
              }, h('option', { value: 'rfc6902' }, 'rfc6902'))),
            h(TextButton, { onClick: runSimulation, disabled: runBusy, 'data-gh': 'var-run-button' }, runBusy ? '執行中…' : '執行一次'),
            h(TextButton, { onClick: reloadWork, disabled: runBusy, 'data-gh': 'var-run-reload' }, '從當前卡重新載入')),
          errorLine(runError, 'var-run-error'),
          runResult ? h('div', { className: 'gh2-var-result', 'data-gh': 'var-run-result' },
            h('div', { className: 'gh2-var-summary', 'data-gh': 'var-run-summary' },
              h('span', { className: 'gh2-m5-chip' }, '操作 ' + runResult.operationCount),
              h('span', { className: 'gh2-m5-chip' }, '欄位 ' + runResult.fieldCount),
              h('span', { className: 'gh2-m5-chip' }, 'Checks ' + runResult.checks.length),
              h('span', { className: 'gh2-m5-chip' }, 'Diff ' + runResult.diff.length),
              h('span', { className: 'gh2-m5-chip' }, 'Zod 執行：' + (runResult.zodExecuted ? '是' : '否'))),
            h('section', { className: 'gh2-var-resultblock', 'data-gh': 'var-run-checks' },
              h('div', { className: 'gh2-m5-rowhead' }, h('b', null, 'Checks'), h('span', { className: 'gh2-m5-meta' }, runResult.checks.length + ' 項')),
              runResult.checks.length ? h('ul', { className: 'gh2-var-check-list' }, runResult.checks.map((check, index) => h('li', {
                key: (check && check.id) || index, className: 'gh2-var-check', 'data-status': check && check.status,
              },
                h('span', { className: 'gh2-var-checkstatus' }, checkStatusText[check && check.status] || (check && check.status) || '—'),
                h('b', null, (check && check.label) || (check && check.id) || 'check'),
                h('span', { className: 'gh2-m5-meta' }, (check && check.detail) || '')))) : h('p', { className: 'gh2-m5-note' }, '沒有 checks。')),
            resultBlock('Diff', runResult.diff, (item) => (item.kind || 'replace') + ' ' + (item.path || '/') + ' · ' + JSON.stringify(item.before) + ' → ' + JSON.stringify(item.after), 'var-diff'),
            h('section', { className: 'gh2-var-resultblock', 'data-gh': 'var-after-block' },
              h('div', { className: 'gh2-m5-rowhead' }, h('b', null, '執行後狀態'), h('span', { className: 'gh2-m5-meta' }, 'after')),
              h('pre', { className: 'gh2-var-initial', 'data-gh': 'var-after' }, JSON.stringify(runResult.after, null, 2))),
            h('details', { className: 'gh2-var-raw', 'data-gh': 'var-trace' },
              h('summary', null, '完整 Trace JSON'),
              h('pre', { className: 'gh2-var-initial' }, JSON.stringify(runResult.trace, null, 2))))
            : h('p', { className: 'gh2-m5-note', 'data-gh': 'var-run-empty' }, '點“執行一次”後顯示 checks / diff / after / trace。'));
        const modeButtons = h('div', { className: 'gh2-var-modes', 'data-gh': 'var-modes' },
          h(TextButton, { onClick: () => setWorkTab('structure'), className: 'gh2-var-mode' + (workTab === 'structure' ? ' is-active' : ''), 'data-gh': 'var-mode-structure' }, '結構'),
          h(TextButton, { onClick: () => setWorkTab('compare'), className: 'gh2-var-mode' + (workTab === 'compare' ? ' is-active' : ''), 'data-gh': 'var-mode-compare' }, '對照'),
          h(TextButton, { onClick: () => setWorkTab('run'), className: 'gh2-var-mode' + (workTab === 'run' ? ' is-active' : ''), 'data-gh': 'var-mode-run' }, '執行測試'));
        const manualFiles = (Array.isArray(s.wb.files) ? s.wb.files : []).filter((file) => /\.json$/iu.test(file.name || file.path));
        const manualSource = !cardSchema ? h('div', { className: 'gh2-var-manual', 'data-gh': 'var-manual-source' },
          h('p', { className: 'gh2-m5-meta' },
            s.wb.root ? h(Fragment, null, '元件目錄與世界書相同：', h('span', { className: 'gh2-mono' }, s.wb.root))
              : '先在世界書頁開啟目錄，才能讀取元件 JSON。'),
          manualFiles.length ? h('div', { className: 'gh2-wb-files', 'data-gh': 'var-manual-files' },
            manualFiles.map((file) => h('button', {
              key: file.path,
              type: 'button',
              title: file.path,
              className: 'gh2-wb-file' + (file.path === s.mvu.selectedPath ? ' is-active' : ''),
              'data-gh': 'var-manual-file',
              'data-path': file.path,
              onClick: () => inspectMvuFile(file.path),
            },
              h('span', { className: 'gh2-wb-fname' }, file.name || basename(file.path)),
              h('span', { className: 'gh2-m5-meta' }, formatSize(file.size)))))
            : h('p', { className: 'gh2-m5-note' }, '世界書目錄下沒有 .json 元件。'),
          h('p', { className: 'gh2-m5-note' }, '沒有卡內 Schema 時，點元件 .json 讓宿主靜態解析；這裡不執行指令碼。'))
          : null;
        const writeTarget = s.ws.activeCard && s.ws.activeCard.file ? s.ws.activeCard.file.path : '';
        const canWrite = !!(writeTarget && cardMvu && (cardMvu.schemaSource || cardMvu.updateRuleEntries.length || cardMvu.initVarSource || cardMvu.initVar));
        const writePayload = writeResult && writeResult.result ? writeResult.result : writeResult;
        const backupText = writePayload
          ? (typeof writePayload.backup === 'string' ? writePayload.backup
            : writePayload.backup && typeof writePayload.backup === 'object'
              ? (writePayload.backup.path || writePayload.backup.file || writePayload.backup.dir || '')
              : (writePayload.backupPath || writePayload.backupFile || writePayload.backupDir || ''))
          : '';
        const verifyRaw = writePayload
          ? (writePayload.verification !== undefined ? writePayload.verification
            : writePayload.verified !== undefined ? writePayload.verified
              : writePayload.readback !== undefined ? writePayload.readback : writePayload.validation)
          : undefined;
        const verifyText = verifyRaw === true ? '透過'
          : verifyRaw === false ? '失敗'
            : typeof verifyRaw === 'string' ? verifyRaw
              : verifyRaw && typeof verifyRaw === 'object' ? JSON.stringify(verifyRaw, null, 2) : '';
        const writeBar = h('div', { className: 'gh2-var-writebar', 'data-gh': 'var-writebar' },
          h('div', { className: 'gh2-var-writehead' },
            h('div', { className: 'gh2-var-writeinfo' },
              h('b', null, '寫回卡'),
              h('span', { className: 'gh2-m5-meta' }, writeTarget || '未選卡'),
              h('span', { className: 'gh2-m5-meta' }, '先備份；只改 Schema / 初始變數 / 更新規則選中欄位')),
            h(TextButton, {
              onClick: () => setWriteConfirm(true), disabled: !canWrite || writing,
              title: canWrite ? '確認後寫回當前卡，並顯示備份與讀回驗證' : '當前卡沒有可寫回的 MVU 來源',
              'data-gh': 'var-write-button',
            }, writing ? '寫回中…' : '寫回卡（備份）')),
          writeConfirm ? h('div', { className: 'gh2-var-writeconfirm', 'data-gh': 'var-write-confirm' },
            h('p', null, '目標：', h('code', { className: 'gh2-mono' }, writeTarget)),
            h('p', { className: 'gh2-m5-note' }, '宿主會先把原卡備份到卡目錄 .godhand/backups/<timestamp>/<filename>，再原子寫並讀回驗證。不會執行卡內指令碼或生成模型內容。'),
            h('div', { className: 'gh2-m5-actions' },
              h(TextButton, { onClick: writeCardBack, disabled: writing, 'data-gh': 'var-write-confirm-button' }, writing ? '寫回中…' : '確認寫回'),
              h(TextButton, { onClick: () => { setWriteConfirm(false); setWriteError(''); }, disabled: writing, 'data-gh': 'var-write-cancel' }, '取消')))
            : null,
          errorLine(writeError, 'var-write-error'),
          writeResult ? h('div', { className: 'gh2-var-writeresult', 'data-gh': 'var-write-result' },
            h('p', null, '備份：', h('code', { className: 'gh2-mono', 'data-gh': 'var-write-backup' }, backupText || '響應未提供備份路徑')),
            h('p', null, '讀回驗證：', h('code', { className: 'gh2-mono', 'data-gh': 'var-write-verify' }, verifyText || '響應未提供驗證欄位')),
            h('details', { className: 'gh2-var-raw' },
              h('summary', null, '完整寫回響應'),
              h('pre', { className: 'gh2-var-initial' }, JSON.stringify(writeResult, null, 2))))
            : null);
        return h('div', { className: 'gh2-m5', 'data-gh': 'legacyVars-pane' },
          s.ws.restoreNotice ? h('p', { className: 'gh2-m5-warn', 'data-gh': 'ws-restore-notice' }, s.ws.restoreNotice) : null,
          errorLine(s.ws.cardInspectError, 'card-inspect-error'),
          s.ws.cardInspectBusy ? h('p', { className: 'gh2-m5-meta', 'data-gh': 'card-inspect-busy' }, '正在讀取卡內變數與 MVU 元資訊…') : null,
          h('section', { className: 'gh2-var-page', 'data-gh': 'var-nodes-page' },
            h('div', { className: 'gh2-m5-rowhead' },
              h('b', null, 'MVU'),
              h('span', { className: 'gh2-m5-chip' }, '只讀結構'),
              h('span', { className: 'gh2-m5-chip' }, '工作副本')),
            h('p', { className: 'gh2-m5-warn', 'data-gh': 'var-nodes-note' },
              workTab === 'structure' ? '靜態結構；未執行 MVU/Zod；值只讀；不顯示 PASS/FAIL'
                : '工作副本；執行安全子集；寫回卡需手動確認並備份；不執行真實 MVU JS/Zod。'),
            sourceBar,
            h('div', { className: 'gh2-var-modebar' },
              modeButtons,
              work.resetNotice ? h('span', { className: 'gh2-m5-warn', 'data-gh': 'var-reset-notice' }, work.resetNotice) : null),
            writeBar,
            workTab === 'structure' ? manualSource : null,
            workTab === 'structure' ? structureContent : workTab === 'compare' ? compareView : runView),
          h('div', { className: 'gh2-mvu-sep' }),
          h(WorldbookJsonSection, { wb: s.wb }));
      }

      function jumpToLegacyNodes() {
        const s = store.get();
        const cardSchema = s.ws.cardDetail && s.ws.cardDetail.mvu && s.ws.cardDetail.mvu.schema;
        const manualSchema = s.mvu && s.mvu.schema;
        if (!cardSchema && !manualSchema) {
          toast('當前沒有可瀏覽的 MVU MVU');
          return false;
        }
        setUi({ mode: 'full', tab: 'legacyVars' });
        setWs({ legacyTab: 'run', legacyFocus: Date.now() });
        return true;
      }
      function jumpToCardMvu() { return jumpToLegacyNodes(); }

      function UiEditorPane() {
        const s = useStoreState();
        const detail = s.ws.cardDetail;
        const scripts = detail && Array.isArray(detail.scripts) ? detail.scripts : [];
        const hasCardMvu = !!(detail && detail.mvu && detail.mvu.schema);
        const hasMvuSource = hasCardMvu || !!(s.mvu && s.mvu.schema);
        const layers = ['應用外殼', '狀態列', '對話面板', '操作欄'];
        const inspector = [['佈局', 'flex · 100vw × 100vh'], ['樣式 token', '--surface / --ink'], ['資料繫結', 'ctx.app']];
        return h('div', { className: 'gh2-m5', 'data-gh': 'ui-editor-pane' },
          h('p', { className: 'gh2-m5-lead' }, '圖層/編譯佔位；資料庫已獨立為“前端設計＆動效資料庫”頁籤。'),
          h('div', { className: 'gh2-m5-actions' },
            h(TextButton, { disabled: true, title: '真實編譯鏈還沒接入', 'data-gh': 'ui-compile' }, '編譯（還沒接入）'),
            h('span', { className: 'gh2-m5-chip', 'data-gh': 'ui-compile-chip' }, '編譯鏈還沒接入')),
          h('div', { className: 'gh2-m5-links', 'data-gh': 'ui-links' },
            h('button', {
              type: 'button', className: 'gh2-m5-link', 'data-gh': 'ui-link-card-mvu',
              disabled: !hasMvuSource,
              title: hasMvuSource ? '跳到MVU頁並選中來源' : '當前沒有可瀏覽的 MVU Schema',
              onClick: jumpToCardMvu,
            }, '測試節點')),
          h('p', { className: 'gh2-m5-note', 'data-gh': 'ui-library-note' }, '資料庫已獨立為“前端設計＆動效資料庫”頁籤；這裡不再承載資料庫頁面。'),
          errorLine(s.ws.cardInspectError, 'card-inspect-error-ui'),
          s.ws.cardInspectBusy ? h('p', { className: 'gh2-m5-meta', 'data-gh': 'card-inspect-busy-ui' }, '正在讀取卡內指令碼元資訊…') : null,
          h('section', { className: 'gh2-card-scripts', 'data-gh': 'card-scripts-section' },
            h('div', { className: 'gh2-m5-rowhead' },
              h('b', null, '卡內助手指令碼（只讀）'),
              h('span', { className: 'gh2-m5-meta' }, scripts.length + ' 個')),
            scripts.length ? h('div', { className: 'gh2-card-script-list', 'data-gh': 'card-scripts' },
              scripts.map((script, index) => h('div', {
                key: (script.id || 'script') + ':' + index,
                className: 'gh2-card-script',
                'data-gh': 'card-script-row',
                'data-id': script.id || '',
              },
                h('div', { className: 'gh2-card-script-head' },
                  h('b', null, script.name || script.id || ('指令碼 ' + (index + 1))),
                  h('span', { className: 'gh2-m5-chip' }, script.type || '指令碼'),
                  h('span', { className: 'gh2-m5-chip' }, script.enabled ? '啟用' : '停用'),
                  h('span', { className: 'gh2-m5-chip' }, script.hasSchema ? '有 Schema' : '無 Schema')),
                h('p', { className: 'gh2-m5-meta' },
                  'id：' + (script.id || '（無）') + ' · content 長度：' + (script.contentLength || 0) + ' 字元'))))
              : h('p', { className: 'gh2-m5-note', 'data-gh': 'card-scripts-empty' }, '當前卡沒有助手指令碼元資訊，或還沒選卡。'),
            h('p', { className: 'gh2-m5-note' }, '只列元資訊；不執行指令碼，也不偽造編譯結果。')),
          h('p', { className: 'gh2-m5-warn', 'data-gh': 'ui-compile-note' }, '編譯按鈕只是佔位：這裡不會顯示編譯結果，也不會生成前端產物。'),
          h('div', { className: 'gh2-m5-ui-grid' },
            h('section', { className: 'gh2-m5-col', 'data-gh': 'ui-layers' },
              h('div', { className: 'gh2-m5-rowhead' }, h('b', null, '圖層'), h('span', { className: 'gh2-m5-meta' }, '元件樹')),
              layers.map((name) => h('div', { key: name, className: 'gh2-ui-layer' + (name === '應用外殼' ? ' is-open' : '') }, name)),
              h('p', { className: 'gh2-m5-note' }, '佔位：接入後顯示真實圖層、鎖定與選擇狀態。')),
            h('section', { className: 'gh2-m5-col', 'data-gh': 'ui-canvas' },
              h('div', { className: 'gh2-m5-rowhead' }, h('b', null, '畫布'), h('span', { className: 'gh2-m5-meta' }, '預覽 · 佔位')),
              h('div', { className: 'gh2-ui-canvas' }, h('span', null, '真實元件預覽區域（佔位）')),
              h('p', { className: 'gh2-m5-note' }, '不生成前端產物；編譯鏈還沒接入。')),
            h('section', { className: 'gh2-m5-col', 'data-gh': 'ui-inspector' },
              h('div', { className: 'gh2-m5-rowhead' }, h('b', null, '屬性'), h('span', { className: 'gh2-m5-meta' }, '檢查器')),
              inspector.map(([label, value]) => h('div', { key: label, className: 'gh2-m5-field' },
                h('span', null, label), h('div', { className: 'gh2-ui-ins' }, value))),
              h('p', { className: 'gh2-m5-note' }, '佔位：原始碼、編譯錯誤和草稿保留屬於下一階段。'))));
      }

      function ProjectOverlay({ s }) {
        const ws = s.ws;
        const active = ws.projects.find((project) => project.id === ws.activeProjectId) || null;
        const currentRoot = ws.versionsRoot || (active && active.root) || '';
        const activeCard = ws.activeCard;
        const activeMeta = activeCard && activeCard.meta ? activeCard.meta : {};
        useEffect(() => {
          const onKey = (event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            closeProjectManager();
          };
          document.addEventListener('keydown', onKey, true);
          return () => document.removeEventListener('keydown', onKey, true);
        }, []);
        const projectRows = ws.projects.length ? ws.projects.map((project) => h('li', {
          key: project.id,
          className: 'gh2-project-row' + (project.id === ws.activeProjectId ? ' is-active' : ''),
          'data-gh': 'project-row',
          'data-id': project.id,
        },
          h('button', {
            type: 'button', className: 'gh2-project-main', 'data-gh': 'project-switch',
            disabled: ws.busy,
            onClick: () => switchProject(project.id),
          },
            h('span', { className: 'gh2-project-itemtitle' },
              h('b', null, project.label),
              project.id === ws.activeProjectId ? h('span', { className: 'gh2-m5-chip' }, '當前') : null),
            h('span', { className: 'gh2-mono' }, project.root),
            h('span', { className: 'gh2-project-meta' },
              '最近版本：' + (project.lastVersionDir || '（無）') + ' · 最近卡：' + (project.lastCardPath || '（無）'))),
          h('button', {
            type: 'button', className: 'gh2-project-delete', 'data-gh': 'project-delete',
            'aria-label': '刪除專案 ' + project.label,
            disabled: ws.busy,
            onClick: () => deleteProject(project.id),
          }, '刪除')))
          : h('p', { className: 'gh2-m5-note', 'data-gh': 'project-empty' }, '還沒有專案。選擇目錄或輸入路徑新增。');
        const versionRows = ws.versions.length ? ws.versions.map((version) => h('li', { key: version.path },
          h('button', {
            type: 'button',
            className: 'gh2-project-item' + (version.path === ws.versionsRoot ? ' is-active' : ''),
            'data-gh': 'version-row',
            'data-path': version.path,
            'data-relative': version.relative || '',
            disabled: ws.busy,
            onClick: () => switchVersion(version.path),
          },
            h('span', { className: 'gh2-project-itemtext' },
              h('span', { className: 'gh2-project-itemtitle' }, version.name),
              h('span', { className: 'gh2-mono' }, version.relative || version.path)),
            version.version ? h('span', { className: 'gh2-m5-chip' }, version.version) : null,
            version.path === ws.versionsLatest ? h('span', { className: 'gh2-m5-chip' }, '最新') : null,
            h('span', { className: 'gh2-m5-meta' }, formatMtime(version.mtime)))))
          : h('p', { className: 'gh2-m5-note', 'data-gh': 'versions-empty' }, '宿主沒有返回版本子目錄；專案根會作為當前目錄。');
        const cardRows = ws.cards.length ? ws.cards.map((file) => {
          const info = ws.cardMeta[file.path];
          const cardMeta = info && info.meta ? info.meta : {};
          const readError = ws.cardReadErrors[file.path];
          const isActive = activeCard && activeCard.file && activeCard.file.path === file.path;
          const isLatest = ws.cardsLatest === file.path;
          const isCard = isCardRead(info);
          const notCard = !!info && !isCard;
          return h('li', { key: file.path },
            h('button', {
              type: 'button',
              className: 'gh2-project-item' + (isActive ? ' is-active' : ''),
              'data-gh': 'card-row',
              'data-path': file.path,
              disabled: ws.busy || notCard,
              title: notCard ? '這是 ' + (info.kind || 'unknown') + '，不是角色卡；請選 PNG/JSON 卡檔案' : undefined,
              onClick: () => selectCard(ws.cardsRoot, file.path),
            },
              h('span', { className: 'gh2-project-itemtext' },
                h('span', { className: 'gh2-project-itemtitle' },
                  file.name,
                  isLatest ? h('span', { className: 'gh2-m5-chip' }, '最新') : null,
                  info ? h('span', { className: 'gh2-m5-chip' }, info.kind + (notCard ? ' · 非卡' : '')) : null),
                h('span', { className: 'gh2-project-meta' },
                  '卡名：' + (cardMeta.name || (ws.cardsBusy ? '讀取中…' : '未知')),
                  ' · spec：' + (cardMeta.spec || '未知') + (cardMeta.specVersion ? ' ' + cardMeta.specVersion : ''),
                  file.version ? ' · 檔案版本：' + file.version : ''),
                readError ? h('span', { className: 'gh2-m5-error' }, '讀取失敗：' + readError) : null),
              h('span', { className: 'gh2-m5-meta' }, formatSize(file.size) + ' · ' + formatMtime(file.mtime))));
        }) : h('p', { className: 'gh2-m5-note', 'data-gh': 'cards-empty' }, ws.cardsBusy ? '正在讀取卡元資訊…' : '這個目錄沒有 PNG/JSON 卡檔案。');
        return h('div', {
          className: 'gh2-libmask gh2-projectmask', 'data-gh': 'project-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': '專案與角色卡',
        },
          h('div', { className: 'gh2-projectpanel' },
            h('header', { className: 'gh2-projectbar' },
              h('b', null, '專案與角色卡'),
              h('span', { className: 'gh2-m5-meta' }, active ? '當前：' + active.label : '當前：未選擇專案'),
              h('span', { className: 'gh2-spacer' }),
              h(TextButton, { onClick: closeProjectManager, 'data-gh': 'project-close' }, '關閉')),
            h('div', { className: 'gh2-projectbody' },
              errorLine(ws.hostError, 'ws-host-error'),
              errorLine(ws.persistError, 'ws-persist-error'),
              h('p', { className: 'gh2-m5-meta', 'data-gh': 'ws-state-info' },
                '工作區狀態：', h('span', { className: 'gh2-mono', 'data-gh': 'ws-state-path' }, ws.statePath || '（未知）'),
                ' · ', ws.savedAt ? '保存於 ' + formatMtime(ws.savedAt) : '還沒儲存',
                ws.hostAvailable ? '' : ' · 持久化不可用（本頁仍會寫 localStorage 快照）'),
              ws.restoreNotice ? h('p', { className: 'gh2-m5-warn', 'data-gh': 'ws-restore-notice' }, ws.restoreNotice) : null,
              ws.newAvailable ? h('p', { className: 'gh2-m5-warn', 'data-gh': 'ws-new-available' }, ws.newAvailable.message || '有新版本可用') : null,
              h('section', { className: 'gh2-project-section' },
                h('div', { className: 'gh2-m5-rowhead' }, h('b', null, '專案'), h('span', { className: 'gh2-m5-meta' }, ws.projects.length + ' 個')),
                h('div', { className: 'gh2-project-actions' },
                  h(TextButton, { onClick: pickProjectRoot, disabled: ws.picking || ws.busy, 'data-gh': 'project-pick' },
                    ws.picking ? '正在開啟目錄選擇器…' : '選擇專案目錄'),
                  h('input', {
                    type: 'text', className: 'gh2-finput', 'data-gh': 'project-root-input', 'aria-label': '專案目錄路徑',
                    placeholder: '或輸入專案目錄路徑（絕對路徑）', value: ws.rootInput,
                    onChange: (e) => setWs({ rootInput: e.target.value }),
                    onKeyDown: (e) => { if (e.key === 'Enter') { e.preventDefault(); addProject(ws.rootInput); } },
                  }),
                  h(TextButton, { onClick: () => addProject(ws.rootInput), disabled: ws.scanBusy || ws.busy, 'data-gh': 'project-add' },
                    ws.scanBusy ? '正在掃描…' : '新增專案')),
                errorLine(ws.addError, 'project-add-error'),
                h('ul', { className: 'gh2-project-list', 'data-gh': 'project-list' }, projectRows)),
              active ? h(Fragment, null,
                h('section', { className: 'gh2-project-section' },
                  h('div', { className: 'gh2-m5-rowhead' },
                    h('b', null, '當前專案'),
                    h('span', { className: 'gh2-mono' }, active.root),
                    h('span', { className: 'gh2-spacer' }),
                    h(TextButton, { onClick: toggleAutoLatest, 'data-gh': 'auto-latest' },
                      '自動最新：' + (ws.autoLatest ? '開' : '關'))),
                  h('div', { className: 'gh2-project-actions' },
                    h(TextButton, { onClick: switchLatest, disabled: ws.busy, 'data-gh': 'switch-latest' },
                      ws.busy ? '正在切換…' : '切到最新'),
                    h(TextButton, { onClick: useProjectRootForWorldbook, disabled: !currentRoot || ws.busy, 'data-gh': 'project-use-wb' }, '用當前目錄作為世界書根'),
                    h(TextButton, { onClick: useProjectRootForMvu, disabled: !currentRoot || ws.busy, 'data-gh': 'project-use-mvu' }, '用當前目錄作為變數根')),
                  h('p', { className: 'gh2-m5-note' }, '自動最新按檔名裡的語義版本優先，版本相同按修改時間；世界書有未儲存修改時不會切換。'),
                  errorLine(ws.scanError, 'project-scan-error'),
                  h('ul', { className: 'gh2-project-list', 'data-gh': 'version-list' }, versionRows)),
                h('section', { className: 'gh2-project-section' },
                  h('div', { className: 'gh2-m5-rowhead' },
                    h('b', null, '卡檔案'),
                    h('span', { className: 'gh2-m5-meta' }, ws.cardsBusy ? '正在讀取卡元資訊…' : ws.cards.length + ' 個 PNG/JSON'),
                    h('span', { className: 'gh2-spacer' }),
                    h('span', { className: 'gh2-mono' }, ws.cardsRoot || currentRoot)),
                  errorLine(ws.cardError, 'project-card-error'),
                  ws.cardMissing ? h('p', { className: 'gh2-m5-warn', 'data-gh': 'card-missing' }, ws.cardMissing) : null,
                  h('ul', { className: 'gh2-project-list', 'data-gh': 'card-list' }, cardRows),
                  h('p', { className: 'gh2-m5-note' }, '只讀卡檔案元資訊：不讀卡正文、不改卡、不把內容寫進工作區狀態。'),
                  activeCard ? h('div', { className: 'gh2-project-carddetail', 'data-gh': 'active-card' },
                    h('span', null, h('b', null, '當前卡：'), activeCard.file.name || basename(activeCard.file.path)),
                    h('span', null, h('b', null, 'kind：'), activeCard.kind || 'unknown'),
                    h('span', null, h('b', null, '卡名：'), metaText(activeMeta.name)),
                    h('span', null, h('b', null, 'spec：'), metaText(activeMeta.spec)),
                    h('span', null, h('b', null, 'specVersion：'), metaText(activeMeta.specVersion)),
                    h('span', null, h('b', null, '角色：'), metaText(activeMeta.characterName)),
                    h('span', null, h('b', null, '角色版本：'), metaText(activeMeta.characterVersion)),
                    h('span', null, h('b', null, 'creator：'), metaText(activeMeta.creator)),
                    h('span', null, h('b', null, 'createDate：'), metaText(activeMeta.createDate)),
                    h('span', null, h('b', null, '內嵌世界書：'), activeCard.hasWorldbook ? '有' : '無'),
                    h('span', null, h('b', null, '世界書條目：'), String(activeCard.worldbookEntryCount)),
                    h('span', null, h('b', null, '助手指令碼：'), String(activeCard.scriptCount)),
                    h('span', null, h('b', null, '正則：'), String(activeCard.regexCount))) : null))
                : h('p', { className: 'gh2-m5-note', 'data-gh': 'project-current-empty' }, '還沒有當前專案。新增或切換一個專案後，會在這裡列出版本目錄和卡檔案。'))));
      }

      function LibraryOverlay({ lib }) {
        const [note, setNote] = useState('');
        const onEsc = (event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          closeLibrary();
        };
        useEffect(() => {
          document.addEventListener('keydown', onEsc, true);
          return () => document.removeEventListener('keydown', onEsc, true);
        }, []);
        const onLoad = (event) => {
          const frame = event.currentTarget;
          try {
            const doc = frame.contentDocument;
            if (!doc) { setNote(''); return; }
            doc.addEventListener('keydown', onEsc);
            const text = String(doc.body && doc.body.textContent || '');
            setNote(/資料未載入/u.test(text) ? '挑選頁資料沒載入：' + text.trim().slice(0, 160) : '');
          } catch {
            setNote('');
          }
        };
        return h('div', { className: 'gh2-libmask', 'data-gh': 'lib-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': lib.title },
          h('div', { className: 'gh2-libpanel' },
            h('header', { className: 'gh2-libbar' },
              h('b', null, lib.title),
              h('span', { className: 'gh2-m5-meta' }, 'TW Library 離線快照 · 候選不等於已採用'),
              h('span', { className: 'gh2-spacer' }),
              h(TextButton, { onClick: closeLibrary, 'data-gh': 'lib-close' }, '關閉')),
            lib.status === 'loading' ? h('div', { className: 'gh2-libstate', 'data-gh': 'lib-loading' }, '正在檢查資料庫路由…') : null,
            lib.status === 'error' ? h('div', { className: 'gh2-libstate' },
              errorLine(lib.error, 'lib-error'),
              h(TextButton, { onClick: closeLibrary }, '關閉')) : null,
            lib.status === 'ready' ? h(Fragment, null,
              note ? h('p', { className: 'gh2-m5-error', 'data-gh': 'lib-note', style: { margin: '8px 12px 0' } }, note) : null,
              h('iframe', {
                className: 'gh2-libframe',
                'data-gh': 'lib-iframe',
                title: lib.title,
                src: lib.url,
                onLoad,
              })) : null));
      }

      function LibraryTab({ tab }) {
        const [status, setStatus] = useState('loading');
        const [error, setError] = useState('');
        const [nonce, setNonce] = useState(0);
        const seq = useRef(0);
        const url = M5.libPage + '#' + tab;
        useEffect(() => {
          const my = ++seq.current;
          setStatus('loading');
          setError('');
          probeLibrary().then(() => {
            if (my === seq.current) setStatus('ready');
          }).catch((err) => {
            if (my !== seq.current) return;
            setStatus('error');
            setError('資料庫沒找到：' + errorText(err));
          });
          return () => { seq.current += 1; };
        }, [tab, nonce]);
        return h('div', { className: 'gh2-library-tab', 'data-gh': 'library-tab', 'data-tab': tab },
          status === 'loading' ? h('div', { className: 'gh2-libstate', 'data-gh': 'lib-tab-loading' }, '正在檢查資料庫路由…') : null,
          status === 'error' ? h('div', { className: 'gh2-libstate', 'data-gh': 'lib-tab-error' },
            h('p', { className: 'gh2-m5-error' }, error),
            h(TextButton, { onClick: () => setNonce((n) => n + 1) }, '重新載入')) : null,
          status === 'ready' ? h('iframe', {
            className: 'gh2-libframe gh2-libframe-tab',
            'data-gh': 'lib-tab-frame',
            title: M5.libTitles[tab],
            src: url,
            onError: () => { setStatus('error'); setError('資料庫頁面載入失敗。'); },
          }) : null);
      }

      function FullWindow({ s }) {
        const ref = useRef(null);
        const rect = s.ui.full ? clampFull(s.ui.full) : defaultFull();
        const start = useRef(rect);
        start.current = rect;
        useEffect(() => {
          if (!store.get().ui.full) setUi({ full: rect });
          try { ref.current && ref.current.focus({ preventScroll: true }); } catch {}
        }, []);
        const onMove = (e) => beginDrag(e, ref, (dx, dy) => clampFull({ ...start.current, x: start.current.x + dx, y: start.current.y + dy }), (r) => setUi({ full: r }));
        const onResize = (e) => beginDrag(e, ref, (dx, dy) => clampFull({ ...start.current, w: start.current.w + dx, h: start.current.h + dy }), (r) => setUi({ full: r }));
        const tab = s.ui.tab;
        const isLibraryTab = tab === 'library';
        const activeWsProject = s.ws.projects.find((project) => project.id === s.ws.activeProjectId) || null;
        return h('section', {
          ref, className: 'gh2-root gh2-win', role: 'region', 'aria-label': '神之手', tabIndex: -1, 'data-gh': 'window',
          style: { left: rect.x, top: rect.y, width: rect.w, height: rect.h },
          onKeyDown: (e) => { if (e.key === 'Escape') { e.stopPropagation(); setUi({ mode: 'compact', wheelOn: true }); } },
        },
          h('header', { className: 'gh2-bar', onPointerDown: onMove, 'data-gh': 'window-bar' },
            h('span', { className: 'gh2-brand' }, h(Logo, { size: 18 })),
            h('span', { className: 'gh2-title' }, '神之手'),
            h(TextButton, {
              onClick: openProjectManager,
              className: 'gh2-projectbtn',
              'data-gh': 'project-button',
              title: activeWsProject ? activeWsProject.root : '專案與角色卡',
            }, '專案' + (activeWsProject ? ' · ' + activeWsProject.label : '')),
            h('span', { className: 'gh2-spacer' }),
            h(IconButton, { label: '收起到輪盤', onClick: () => setUi({ mode: 'compact', wheelOn: true }) }, h(IconMinimize))),
          h('div', { className: 'gh2-tabs' }, h(Tabs, { value: tab, onChange: (next) => setUi({ tab: next }) })),
          h('div', { className: 'gh2-body' + (isLibraryTab ? ' gh2-body-lib' : ''), id: 'gh2-panel-' + tab, role: 'tabpanel', 'aria-labelledby': 'gh2-tab-' + tab, 'data-gh': 'panel-' + tab },
            tab === 'skills' ? h(SkillsPane, { s })
              : tab === 'worldbook' ? h(WorldbookPane)
                : h(LibraryTab, { tab: 'design' })),
          h('div', { className: 'gh2-grip', onPointerDown: onResize, 'aria-hidden': 'true', 'data-gh': 'grip' }, h(IconGrip)));
      }

      function Overlay() {
        const s = useStoreState();
        useEffect(() => {
          let timer = 0;
          const onResize = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
              const ui = store.get().ui;
              if (ui.full) setUi({ full: clampFull(ui.full) });
            }, 150);
          };
          window.addEventListener('resize', onResize);
          return () => { window.removeEventListener('resize', onResize); clearTimeout(timer); };
        }, []);
        // 只在完整浮窗開啟時輪詢：切回完整浮窗 / 每 10 秒檢查一次專案版本與卡檔案。
        useEffect(() => {
          if (s.ui.mode !== 'full') {
            if (s.ws.managerOpen) closeProjectManager();
            return undefined;
          }
          if (!s.ws.loaded || !s.ws.activeProjectId) return undefined;
          let disposed = false;
          const tick = () => { if (!disposed) refreshLatest(); };
          tick();
          const timer = setInterval(tick, 10000);
          return () => { disposed = true; clearInterval(timer); };
        }, [s.ui.mode, s.ws.loaded, s.ws.activeProjectId, s.ws.autoLatest]);
        const d = s.drop;
        return h(Fragment, null,
          // 輪盤開關只決定掛不掛載輪盤，其餘部件（完整浮窗、專案浮層、資料庫、提示）照舊。
          s.ui.wheelOn !== false ? h(Wheel, { s }) : null,
          s.ui.mode === 'full' ? h(FullWindow, { s }) : null,
          s.ws.managerOpen ? h(ProjectOverlay, { s }) : null,
          s.lib.open ? h(LibraryOverlay, { lib: s.lib }) : null,
          d ? h('div', {
            className: 'gh2-drophint', 'data-gh': 'drop-hint', 'aria-hidden': 'true',
            style: { left: d.x - 3, top: d.y - 3, width: d.w + 6, height: d.h + 6, borderRadius: 'calc(' + (d.radius || '12px') + ' + 3px)' },
          }) : null,
          s.toast ? h('div', { className: 'gh2-toast', role: 'status', 'data-gh': 'toast' }, s.toast.text) : null);
      }

      /* ---------------- 裝配 ---------------- */
      const inject = ['slots', 'sidebarRight', 'sessions', 'remote', 'remote.skills', 'remote.directoryPicker'];
      function apply(ctx) {
        ctxRef = ctx;
        G.applied = true;
        injectStyles();
        ctx.effect(() => {
          const mounted = ctx.sidebarRight && ctx.sidebarRight.mounted;
          if (!mounted || typeof mounted.getSnapshot !== 'function' || typeof mounted.subscribe !== 'function') {
            fail('mounted', new Error('找不到“螢幕上的會話”來源'));
            return () => {};
          }
          const sync = () => track(mounted.getSnapshot());
          const off = mounted.subscribe(sync);
          sync();
          return () => { off(); untrack(); };
        }, 'godhand: on-screen session');
        ctx.effect(() => installDropTarget(), 'godhand: drop skill into composer');
        ctx.effect(() => { loadWorkspace(); return () => {}; }, 'godhand: restore workspace');
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: PLUGIN_ID, order: 850 }, Overlay));
        ctx.slots.inject('conversation.session.header.utilities', () => {
          const brands = [
            ctx.slots.register({ name: 'conversation.session.header.utilities', id: PLUGIN_ID, order: -30 }, HeaderButton),
            ctx.slots.register({ name: 'conversation.session.header.utilities', id: PLUGIN_ID + '-wheel', order: -29 }, WheelToggleButton),
          ].filter((off) => typeof off === 'function');
          return brands.length ? () => { for (const off of brands) { try { off(); } catch {} } } : undefined;
        });
        ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
          name: 'conversation.input.dock', id: PLUGIN_ID + '-soul', order: -10,
        }, SoulDock));
        G.api = {
          store, setUi, insertSkill, runSkill, sendSoul, soulFromText, loadCatalog, openSkill, measureGutter,
          inputSessions: () => [...inputRegistry.keys()],
          binding: () => bindingOf(store.get().sessionId),
          primitives: () => (P ? ['Button', 'Tooltip', 'Pill', 'Input', 'SegmentedTabs', 'StateDot'].filter(has) : []),
          m5: {
            openLibrary, closeLibrary, pickWorldbookRoot, openWorldbookRoot, readWorldbookFile,
            refreshWbVersions, saveWorldbook, updateWbEntry, setWb, setLib,
            pickMvuRoot, openMvuRoot, inspectMvuFile, setMvu,
            loadWorkspace, openProjectManager, closeProjectManager, pickProjectRoot, addProject,
            switchProject, deleteProject, switchVersion, switchLatest, refreshLatest, toggleAutoLatest,
            selectCard, useProjectRootForWorldbook, useProjectRootForMvu, setWs,
            inspectCardDetail,
          },
        };
      }

      module.exports = { name: 'tavernweave-ui', inject, apply };
      return module.exports;
    };
  }

  try {
    window.__ModuleLoader__.load({ id: PLUGIN_ID, factory: makeFactory() });
    G.loaded = true;
  } catch (error) {
    fail('load', error);
  }
})();
