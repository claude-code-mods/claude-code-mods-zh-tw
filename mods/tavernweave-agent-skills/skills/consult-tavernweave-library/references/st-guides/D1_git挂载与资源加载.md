# git 掛載與資源載入

> 文件版本：v1.0.0 ｜ 最後更新：2026-07-14

> 定位：覆蓋 jsdelivr/testingcf CDN 的 ESM import 機制、分支 vs 版本鎖定的快取差異、SillyTavern TavernHelper 指令碼執行上下文、多源 fallback 實戰正規化、離線 vendor 打包方案、Claude Code launch.json 掛載 ST 除錯的完整參考。

---

## 置信度分級體系

**三級**：
- **high**：雙源及以上交叉驗證，或生產卡實測可用，可直接施工
- **medium**：單源文件或可信推斷，施工前需小範圍驗證
- **low**：孤證無源或純推斷，**禁止直接施工**，需先取證

**依據型別軸**：
- `[執行時原始碼]`：從本地生產卡 JSON 直接提取的執行程式碼
- `[文件·多源]`：兩個及以上獨立文件/Issue 交叉確認
- `[文件·單源]`：僅一份官方或社群文件
- `[社群]`：論壇、Discord、Issue 討論（無官方確認）
- `[推斷]`：基於現象/命名/行為模式推斷，無直接文獻

**收集日期**：2026-06-28

**回源基準**：SillyTavern v1.14.0 + 本地成熟生產卡（示例學園 3.0.2）

---

## 目錄

1. [機制總覽](#1-機制總覽)
2. [jsdelivr CDN ESM Import 機制](#2-jsdelivr-cdn-esm-import-機制)
   - 2.1 [URL 結構與快取行為](#21-url-結構與快取行為)
   - 2.2 [testingcf.jsdelivr.net 子域名](#22-testingcfjsdelivrnet-子域名)
   - 2.3 [/+esm 端點行為](#23-esm-端點行為)
3. [SillyTavern 指令碼執行上下文](#3-sillytavern-指令碼執行上下文)
   - 3.1 [TavernHelper 指令碼型別與能力邊界](#31-tavernhelper-指令碼型別與能力邊界)
   - 3.2 [世界書 Ready 訊號模式](#32-世界書-ready-訊號模式)
   - 3.3 [ST 的 CSP 與域限制](#33-st-的-csp-與域限制)
4. [完整可用正規化程式碼](#4-完整可用正規化程式碼)
   - 4.1 [三源 fallback git 掛載 loader](#41-三源-fallback-git-掛載-loader)
   - 4.2 [雙源 CDN 帶 worldbook ready 等待](#42-雙源-cdn-帶-worldbook-ready-等待)
   - 4.3 [單檔案工具匯入帶 fallback](#43-單檔案工具匯入帶-fallback)
   - 4.4 [npm 包 ESM 離線 vendor 匯入](#44-npm-包-esm-離線-vendor-匯入)
   - 4.5 [Claude Code launch.json 掛載 ST](#45-claude-code-launchjson-掛載-st)
5. [關鍵欄位與 API 參考表](#5-關鍵欄位與-api-參考表)
6. [高頻避坑](#6-高頻避坑)
7. [懸案：未決項與驗證路徑](#7-懸案未決項與驗證路徑)

---

## 1. 機制總覽

本文件覆蓋「在 SillyTavern 卡片指令碼中從 GitHub/npm CDN 動態載入 JS 模組」這一完整技術鏈路，涵蓋：

- **CDN 層**：jsdelivr URL 格式、快取 TTL、ESM 轉換、testingcf 子域名含義
- **ST 層**：TavernHelper 指令碼執行模型、頂層 await、動態 import、全域性變數通訊
- **工程實踐層**：多源 fallback 設計、離線 vendor 打包、版本鎖定策略
- **除錯層**：Claude Code preview/launch.json 與已執行 ST 的對接現狀

核心實戰來源為**示例學園 3.0.2 生產卡**（本地路徑已驗證執行），為最高可信度參考。

---

## 2. jsdelivr CDN ESM Import 機制

### 2.1 URL 結構與快取行為

**核心結論**：jsdelivr 提供兩類 URL 體系——npm 包和 GitHub 倉庫檔案——快取行為因引用方式不同而差異極大。

**npm 包 URL**：
```
https://cdn.jsdelivr.net/npm/<package>@<version>/+esm    ← 鎖定版本，永久快取
https://cdn.jsdelivr.net/npm/<package>/+esm              ← 無版本，取最新，約 7 天更新
```

**GitHub 倉庫檔案 URL**：
```
https://cdn.jsdelivr.net/gh/<user>/<repo>@<version>/<path>       ← semver tag，永久不變
https://cdn.jsdelivr.net/gh/<user>/<repo>@<commit-hash>/<path>   ← commit hash，永久不變
https://cdn.jsdelivr.net/gh/<user>/<repo>@main/<path>            ← 分支，12 小時更新
```

**快取 TTL 參考表**：

| URL 模式 | 示例 | Cache TTL | 可更新 | 適用場景 |
|---|---|---|---|---|
| `@<semver-exact>` | `@3.1.0` | 永久（1 year header） | 不可（需 purge API） | 釋出正式版 |
| `@<commit-hash>` | `@32b003a` | 永久 | 不可 | 精確鎖定某次改動 |
| `@<version-alias>` | `@3` / `@latest` | 7 天 | 可（7 天后） | 大版本追蹤 |
| `@<branch>` | `@main` | **12 小時** | 自動更新 | 開發熱修 |
| 無版本 | `/npm/pinia/+esm` | ~7 天 | 發版後 7 天 | 原型階段 |

**來源**：[jsdelivr README](https://cdn.jsdelivr.net/gh/jsdelivr/jsdelivr@master/README.md) `[文件·單源]`、[Issue #18532](https://github.com/jsdelivr/jsdelivr/issues/18532) `[社群]`（GitHub Issue，非官方文件） | **適用版本**：現行 jsdelivr 服務 | **置信度**：high `[文件·單源]` + `[社群]`（README 明確列出三種 TTL 分級，Issue 為佐證；快取 TTL 數值直接來自官方 README，可信度高）

---

**避坑**：@main 分支 push 後最多 12 小時才生效於 CDN。版本 tag 一旦 push 即永久固化，連 purge API 都無法改內容（只能發新 tag）。

---

### 2.2 testingcf.jsdelivr.net 子域名

**核心結論**：`testingcf.jsdelivr.net` 是 jsdelivr 的 **Cloudflare 節點專用子域**，命名來自"testing Cloudflare"，為正式可用 CDN 端點，並非測試版。

與 `cdn.jsdelivr.net` 的區別：

| 子域名 | 排程方式 | 節點覆蓋 | 國內可達性 |
|---|---|---|---|
| `cdn.jsdelivr.net` | Cloudflare + Fastly + Bunny + Gcore 多 CDN 排程 | 全球多節點 | 國內走 Quantil/專線路由 |
| `testingcf.jsdelivr.net` | 僅 Cloudflare anycast（4 個 IP） | Cloudflare 全球節點 | 隨 Cloudflare 可達性 |

**在實戰 fallback 鏈中的位置**：
```
cdn.jsdelivr.net（主）→ testingcf.jsdelivr.net（次）→ VPS 自託管（兜底）
```

**來源**：卡A 3.0.2 生產卡執行時原始碼 + IP 解析推斷 | **適用版本**：2026-06 實測 | **置信度**：medium `[執行時原始碼]` + `[推斷]`（官方無文件明確區分兩者排程策略）

---

**避坑**：若使用者 ISP 遮蔽 Cloudflare，testingcf 與 cdn.jsdelivr.net 的 CF 節點會**同時失敗**。此時 VPS 自託管才是真正意義上的兜底源，三源設計的價值在此體現。

---

### 2.3 /+esm 端點行為

**核心結論**：`/+esm` 字尾告知 jsdelivr 對該 npm 包執行 Rollup 打包轉 ESM，輸出瀏覽器可直接 `import()` 的模組格式。

核心行為：
- 自動將 CommonJS 包轉換為 ESM（解決 `require is not defined` 問題）
- 依賴鏈遞迴打包，傳遞依賴版本由目標包的 `package.json` 鎖定（once built，永久儲存）——esm.run 頁面僅說"once built, stored in permanent storage"，依賴不隨時間漂移為推斷 `[推斷]`
- **不支援 SRI**（動態打包，雜湊不固定；所有打包檔案註釋頭有官方警告：`Do NOT use SRI with dynamically generated files`）——此條生產卡可直接觀察到
- 僅適用於 npm 包，GitHub 檔案 URL 不接受 `/+esm` 字尾（esm.run 文件未提及 GitHub URL）

**來源**：[esm.run 官方介紹](https://www.jsdelivr.com/esm) `[文件·單源]`、卡A 3.0.2 MVU bundle 註釋頭直接觀察（SRI 警告）`[執行時原始碼]` | **適用版本**：現行 jsdelivr esm.run 服務 | **置信度**：high `[文件·單源]` + `[執行時原始碼]`（SRI 不支援雙源印證；依賴鎖定為推斷，降為 medium·推導未驗證）

---

## 3. SillyTavern 指令碼執行上下文

### 3.1 TavernHelper 指令碼型別與能力邊界

**核心結論**：TavernHelper 擴充套件提供 `type: "script"` 型別指令碼容器，在 ST 卡片的 `data.extensions.tavern_helper.scripts` 陣列中定義，每項含 `type`、`enabled`、`name`、`id`、`content`（指令碼正文）、`info`、`button`、`data`、`export_with` 等欄位；核心執行欄位為 `content`，`enabled` 控制是否啟用。

**執行能力**：

| 能力 | 可用性 | 說明 |
|---|---|---|
| 頂層 `await` | 可用 | 指令碼執行在 async 上下文 |
| `import()` 動態匯入 | 可用 | 無需 `type="module"` 標籤 |
| `window.*` / `document.*` | 可用 | 完整 DOM 訪問 |
| `window.SillyTavern.*` | 可用 | 訪問 ST 上下文 |
| `window.parent.*` | 可用 | 若在 iframe 中執行則訪問父框架 |
| 指令碼間通訊 | 透過全域性變數 | `window.XingyueWorldbookReady` 等 |

**來源**：卡A 3.0.2 `data.extensions.tavern_helper.scripts[0-4].content` 直接提取 | **適用版本**：TavernHelper（ST v1.14.0 環境） | **置信度**：high `[執行時原始碼]`

---

### 3.2 世界書 Ready 訊號模式

**核心結論**：多個同源卡透過約定的全域性 Promise 變數協調世界書初始化順序，標準輪詢等待模式如下：

```javascript
// 跨同源卡通用：等待世界書初始化完成
const waitXingyueWorldbookReady = async () => {
  const started = Date.now();
  const getReadyPromise = () => (
    window.XingyueWorldbookReady ||
    window['卡AWorldbookReady'] ||
    window['示例工程AWorldbookReady'] ||
    window.CrossedZoneWorldbookReady ||
    window.FusionEraWorldbookReady
  );
  while (!getReadyPromise()?.then && Date.now() - started < 5000) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  const ready = getReadyPromise();
  if (ready?.then) await ready;
  else await new Promise(resolve => setTimeout(resolve, 1000));
};

await waitXingyueWorldbookReady();
await new Promise(resolve => setTimeout(resolve, 250)); // 額外 250ms 緩衝
```

**設計要點**：
- 5000ms 超時兜底，避免無限輪詢
- 50ms 輪詢間隔，平衡響應速度與 CPU 佔用
- `?.then` 檢測確認為真 Promise 物件，非 truthy 值即取 1000ms 降級等待
- 250ms 額外緩衝應對世界書寫入後的非同步狀態同步延遲

**來源**：`<local-guide-db>\本地證據\卡A歷史\3.0.2\示例學園 MVU 3.0.2.json` → `data.extensions.tavern_helper.scripts[1].content` | **適用版本**：卡A 3.0.2 / 卡B同源卡 | **置信度**：high `[執行時原始碼]`

---

### 3.3 ST 的 CSP 與域限制

**核心結論**：SillyTavern v1.14.0 主動將 CSP 停用（`server-main.js` 中 `app.use(helmet({ contentSecurityPolicy: false }))`），即服務端**不下發任何 Content-Security-Policy 響應頭**給前端頁面。因此 TavernHelper 指令碼中的 `import()` CDN 呼叫不受 CSP 限制，僅受瀏覽器正常 CORS 策略管控。

**`whitelistImportDomains`（config.yaml）**：
- 控制範圍：ST **服務端代理下載**卡片/資原始檔的來源域白名單（在 `content-manager.js` 中的 `downloadGenericPng` 等路徑執行）
- **不影響** TavernHelper 指令碼中的 `import()` CDN 呼叫（那是瀏覽器端行為，完全繞過服務端代理）
- 本地 v1.14.0 `default/config.yaml` 實測預設允許域：`localhost`、`cdn.discordapp.com`、`files.catbox.moe`、`raw.githubusercontent.com`、**`char-archive.evulid.cc`**（草稿原版漏列最後一項）

**對 `import()` 動態匯入的限制**：
- ST 服務端層面無額外限制（CSP 已停用）
- 由瀏覽器同源策略管控，jsdelivr 開放 CORS，故 `import('https://cdn.jsdelivr.net/...')` 在 ST 上下文中**預設可用，無需配置**

**兩類配置的區別**：

| 場景 | 相關配置 | 需要修改？ |
|---|---|---|
| `import('https://cdn.jsdelivr.net/...')` | 無，瀏覽器 CORS | 不需要 |
| 在 ST 介面下載 CDN 託管的卡檔案 | `whitelistImportDomains` | 需新增 cdn.jsdelivr.net |
| 訪問 ST API（本地開發/除錯） | `listen.whitelistDomains` | 需新增 localhost/開發 IP |

**來源**：`SillyTavern-1.14.0/src/server-main.js` 第 94-96 行（CSP 停用）`[執行時原始碼]`；`SillyTavern-1.14.0/src/endpoints/content-manager.js` 第 22/972 行（whitelistImportDomains 作用域）`[執行時原始碼]`；本地 `default/config.yaml` 預設值 `[執行時原始碼]` | **適用版本**：ST v1.14.0 | **置信度**：high `[執行時原始碼]`（三處原始碼交叉，CSP 停用為直接觀察）

---

## 4. 完整可用正規化程式碼

### 4.1 三源 fallback git 掛載 loader

**核心結論**：這是卡A 3.0.2 控制中心的生產實現，完整可施工。主體託管在 GitHub @main 分支，push 後 12 小時內熱修生效，不回封卡。三源 fallback 確保網路異常時降級可用。

```javascript
// [卡名] 控制中心 — git 掛載 loader
// 主體託管在 GitHub @main，改完 push 即熱修，不回封卡。
// 三源 fallback（cdn → testingcf → VPS）；都失敗留可見提示，不 brick。
(() => {
  const SOURCES = [
    'https://cdn.jsdelivr.net/gh/UserName/repo@main/runtime/cardname/version/control-center.js',
    'https://testingcf.jsdelivr.net/gh/UserName/repo@main/runtime/cardname/version/control-center.js',
    'https://your-vps-ip.sslip.io/runtime/cardname/version/control-center.js',
  ];
  const ok = () => !!(window.YourCardNamespace); // 檢查主體是否註冊成功
  (async () => {
    for (const url of SOURCES) {
      try { await import(url); if (ok()) return; } catch (e) { /* 下一個源 */ }
    }
    if (!ok()) {
      console.error('[卡名控制中心] 遠端主體載入失敗（cdn+testingcf+VPS 均失敗），請檢查網路後重新整理重試。');
    }
  })();
})();
```

**來源**：`<local-guide-db>\本地證據\卡A歷史\3.0.2\示例學園 MVU 3.0.2.json` → `data.extensions.tavern_helper.scripts[4].content` | **適用版本**：TavernHelper + 任意 GitHub 託管檔案 | **置信度**：high `[執行時原始碼]`

---

### 4.2 雙源 CDN 帶 worldbook ready 等待

**核心結論**：載入 MVU bundle 等依賴世界書初始化完成的模組時，必須先等待 Ready 訊號再發起 import，避免競態條件。

```javascript
// 1. 先等世界書初始化完成（輪詢 5s 超時，見 3.2 節完整實現）
await waitXingyueWorldbookReady();
await new Promise(resolve => setTimeout(resolve, 250)); // 額外緩衝

// 2. 雙源載入 bundle
try {
  await import('https://cdn.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate/artifact/bundle.js');
} catch {
  try {
    await import('https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate/artifact/bundle.js');
  } catch (e) {
    console.error('[mvu_zod_global] 雙源載入均失敗，MVU 將不可用', e);
  }
}
```

**來源**：`<local-guide-db>\本地證據\卡A歷史\3.0.2\示例學園 MVU 3.0.2.json` → `data.extensions.tavern_helper.scripts[1].content` | **適用版本**：卡A 3.0.2 MVU | **置信度**：high `[執行時原始碼]`

---

### 4.3 單檔案工具匯入帶 fallback

**核心結論**：當只需要匯入單個工具檔案（非整體 bundle）時，使用解構賦值直接提取所需匯出，fallback 結構更緊湊。

```javascript
let registerMvuSchema;
try {
  ({ registerMvuSchema } = await import(
    'https://cdn.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js'
  ));
} catch (error) {
  console.warn('[CardName] CDN primary import failed, fallback to testingcf:', error);
  ({ registerMvuSchema } = await import(
    'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js'
  ));
}
```

**來源**：`<local-guide-db>\本地證據\卡A歷史\3.0.2\示例學園 MVU 3.0.2.json` → `data.extensions.tavern_helper.scripts[0].content` | **適用版本**：TavernHelper | **置信度**：high `[執行時原始碼]`

---

### 4.4 npm 包 ESM 離線 vendor 匯入

**核心結論**：編譯後的 Webpack bundle 開頭透過 testingcf CDN 載入 npm vendor 庫，直接使用 `/+esm` 端點轉換 ESM 格式。

```javascript
// bundle 開頭的 ESM vendor imports（Webpack 編譯輸出）
import { klona as e } from 'https://testingcf.jsdelivr.net/npm/klona/+esm';
import { createPinia as t, defineStore as n, getActivePinia as a, setActivePinia as s }
  from 'https://testingcf.jsdelivr.net/npm/pinia/+esm';
import { compare as r } from 'https://testingcf.jsdelivr.net/npm/compare-versions/+esm';
import { default as o } from 'https://testingcf.jsdelivr.net/npm/json5/+esm';
import { jsonrepair as i } from 'https://testingcf.jsdelivr.net/npm/jsonrepair/+esm';
import * as l from 'https://testingcf.jsdelivr.net/npm/mathjs/+esm';
```

**注意**：上述 URL 無版本鎖定（取 latest），約 7 天快取後可能跳版本。生產環境應鎖版本（如 `/npm/pinia@2.3.0/+esm`），原型階段可接受無版本寫法。

**離線 vendor flat-no-blob 模式**：`MVU-Zod-offline-vendor-loader-r5.json` 將所有 vendor 庫內聯打包為單一 IIFE（content 欄位 166,439 字元），不使用 `URL.createObjectURL + Blob` 注入方式，規避部分瀏覽器對 blob: URL 的 CSP 限制，代價是檔案體積極大。

**來源**：`<local-guide-db>\本地證據\卡A歷史\3.0.2\MVU\manifest.json` line 1（Webpack bundle 編譯輸出） | **適用版本**：Webpack ESM bundle | **置信度**：high `[執行時原始碼]`

---

### 4.5 Claude Code launch.json 掛載 ST

**當前已知（medium）**：Claude Code Desktop 透過 `.claude/launch.json` 配置預覽伺服器，連線 ST 的參考配置如下（`cwd` 絕對路徑相容性未經真機驗證，見懸案 7.6）：

```json
{
  "version": "0.0.1",
  "autoVerify": false,
  "configurations": [
    {
      "name": "SillyTavern",
      "program": "server.js",
      "port": 8000,
      "cwd": "C:/path/to/SillyTavern",
      "autoPort": false
    }
  ]
}
```
<!-- ⚠️ 注意：官方文件說 cwd 為相對路徑（relative to project root），絕對路徑在 Windows 的實際相容性未經真機驗證——見懸案 7.6。
     runtimeExecutable:"node" + runtimeArgs:["server.js"] 已替換為官方推薦的 program:"server.js" 寫法。-->

**欄位說明**：
- `autoPort: false`：強制使用固定 8000 埠（OAuth/CORS 白名單依賴，ST 場景必須設為 false）
- `autoVerify: false`：關閉自動截圖驗證（ST 卡除錯無法自動驗證）
- `cwd`：官方文件明確說是"**相對路徑**（relative to your project root）"，不是絕對路徑；示例寫 Windows 絕對路徑可能無法按預期工作，建議用相對路徑或 `${workspaceFolder}` 佔位符

> **注意**：官方文件推薦用 `program: "server.js"` 來直接執行 Node.js 指令碼（而非 `runtimeExecutable: "node"` + `runtimeArgs: ["server.js"]`，後者是透過包管理器呼叫的形式）。兩種寫法均可能可用，但官方示例對應兩種不同語義，ST 場景建議改為 `"program": "server.js"`。

**重要限制**：當前 Claude Code **不支援 `url` 欄位**直連已執行的伺服器（[Issue #29315](https://github.com/anthropics/claude-code/issues/29315) 處於 open 狀態，無 PR）。變通方案：
- 透過 `program`/`runtimeExecutable` 讓 Claude preview 啟動新 ST 程序（會與已開啟的 ST 例項衝突埠）
- 或改用 Claude-in-Chrome 擴充套件直接操作已開啟的 ST 瀏覽器標籤頁

**來源**：[Claude Code Desktop docs](https://code.claude.com/docs/en/desktop)（Configure preview servers 節）`[文件·單源]`、[Issue #29315](https://github.com/anthropics/claude-code/issues/29315)（Issue，非文件）`[社群]` | **適用版本**：Claude Code Desktop 當前版本 | **置信度**：medium·單源孤證 `[文件·單源]`（launch.json schema 僅有一份官方文件，Issue 不算第二文件源；`cwd` 相對路徑要求、`program` vs `runtimeExecutable` 推薦用法為文件明確說明）

---

## 5. 關鍵欄位與 API 參考表

| 欄位/API | 位置 | 說明 | 置信度 |
|---|---|---|---|
| `type: "script"` | TavernHelper 指令碼 JSON | 指令碼型別，支援 async/await + dynamic import | high `[執行時原始碼]` |
| `data.extensions.tavern_helper.scripts` | card v3 JSON | TH 指令碼陣列，每項含 type/enabled/name/id/content/info/button 等欄位 | high `[執行時原始碼]` |
| `data.extensions.tavern_helper.variables` | card v3 JSON | TH 持久變數儲存（如 `stat_data` 等持久化資料） | high `[執行時原始碼]` |
| `window.XingyueWorldbookReady` | 全域性 Promise | 世界書初始化完成訊號，TH 指令碼間協調 | high `[執行時原始碼]` |
| `window.XingyueControlCenter` | 全域性 namespace | 控制中心主體載入成功的檢測標誌 | high `[執行時原始碼]` |
| `window.Mvu` / `window.parent?.Mvu` | 全域性 namespace | MVU bundle 載入成功後註冊的名稱空間 | high `[執行時原始碼]` |
| `whitelistImportDomains` | ST config.yaml | ST 服務端代理下載域白名單（不影響 import() CDN） | high `[執行時原始碼]` |
| `launch.json configurations[].port` | `.claude/launch.json` | Claude preview 對接 ST 埠（預設 3000，非 8000） | medium·單源孤證 `[文件·單源]` |
| `launch.json configurations[].autoPort` | `.claude/launch.json` | false = 強制固定埠，ST 場景必須設為 false | medium·單源孤證 `[文件·單源]` |
| `/+esm` URL 字尾 | jsdelivr npm URL | 觸發 Rollup 打包轉 ESM，不支援 SRI | high `[文件·單源]` + `[執行時原始碼]` |
| `@main` 分支快取 TTL | jsdelivr CDN | 12 小時自動更新 | high `[文件·單源]` + `[社群]` |
| `@<semver-exact>` 快取 TTL | jsdelivr CDN | 永久，不可改內容 | high `[文件·單源]` + `[社群]` |

---

## 6. 高頻避坑

**6.1 @main 分支 12 小時快取陷阱**

push 後不會立即生效，CDN 最多 12 小時才同步新內容。生產熱修需要即時生效時，可用 jsDelivr Purge API（需提前申請許可權）。版本 tag 一旦 push 即永久固化，連 purge 都無法改內容，只能發新 tag。

來源：[jsdelivr README](https://cdn.jsdelivr.net/gh/jsdelivr/jsdelivr@master/README.md) `[文件·單源]`、[Issue #18532](https://github.com/jsdelivr/jsdelivr/issues/18532) `[社群]` | **置信度**：high `[文件·單源]` + `[社群]`（同 2.1 節快取表來源，README 為直接依據）

---

**6.2 testingcf 僅走 Cloudflare 節點——雙失效陷阱**

若使用者 ISP 遮蔽 Cloudflare，`testingcf.jsdelivr.net` 與 `cdn.jsdelivr.net` 的 Cloudflare 節點會**同時失敗**，兩源形同一源。VPS 自託管是真正意義上的獨立兜底，三源設計的價值正在於此。

來源：IP 解析推斷 + 網路拓撲分析 | **置信度**：medium `[推斷]`

---

**6.3 無版本號 /+esm URL 的最新版漂移**

`/npm/pinia/+esm` 取的是 npm latest，CDN 快取約 7 天，快取過期後會跳到最新版本。若依賴 API 穩定的庫（pinia、mathjs、zod 等），**應顯式鎖版本**：
```
/npm/pinia@2.3.0/+esm    ← 推薦：生產鎖版本
/npm/pinia/+esm           ← 不推薦：生產環境有漂移風險
```

來源：[jsDelivr README](https://cdn.jsdelivr.net/gh/jsdelivr/jsdelivr@master/README.md)（無版本 = latest，7 天 TTL）`[文件·單源]` | **置信度**：high `[文件·單源]`（7 天上限來自 CDN README，esm.run 頁面未提；但與 2.1 節快取表相互印證，結論可信）

---

**6.4 SRI 與 /+esm 不相容**

jsdelivr 動態生成的 ESM 打包檔案雜湊不固定，`integrity` 屬性無法使用。所有打包檔案註釋頭有官方警告：

```
/* Do NOT use SRI with dynamically generated files! More information: ... */
```

來源：卡A 3.0.2 MVU bundle 檔案頭註釋（`Do NOT use SRI with dynamically generated files`）`[執行時原始碼]`、[esm.run 官方頁](https://www.jsdelivr.com/esm) `[文件·單源]` | **置信度**：high `[執行時原始碼]` + `[文件·單源]`（雙源交叉，可直接施工）

---

**6.5 whitelistImportDomains 不控制 script 載入域**

`config.yaml` 中的 `whitelistImportDomains` 欄位**僅**影響 ST **服務端代理下載**卡片/資原始檔時的來源域白名單（`src/endpoints/content-manager.js` 第 972 行有明確錯誤資訊），不影響 TavernHelper 指令碼內 `import()` 呼叫的 CDN 域。此外，ST v1.14.0 服務端主動停用 CSP（`helmet({ contentSecurityPolicy: false })`），`import('https://cdn.jsdelivr.net/...')` 在 ST 上下文中預設可用，無需在 config.yaml 新增任何條目。

兩者混淆是常見誤判，會導致錯誤地修改 config.yaml 或錯誤地認為 CDN import 需要配置才能工作。

來源：`SillyTavern-1.14.0/src/endpoints/content-manager.js` 直接讀取 `[執行時原始碼]`；`SillyTavern-1.14.0/src/server-main.js` helmet 配置 `[執行時原始碼]` | **置信度**：high `[執行時原始碼]`

---

**6.6 Claude Code preview 不支援連線已執行伺服器**

`launch.json` 目前無 `url` 欄位支援，只能透過 `runtimeExecutable` 啟動新程序。掛載已執行的 ST 例項時，preview 會嘗試在同埠啟動新 ST 程序，與現有 ST 會話產生埠衝突。

當前推薦路徑：改用 Claude-in-Chrome 擴充套件直接操作已開啟的 ST 瀏覽器標籤頁，或等待 [Issue #29315](https://github.com/anthropics/claude-code/issues/29315) 合併。

來源：[Claude Code Desktop docs](https://code.claude.com/docs/en/desktop) `[文件·單源]`；[Issue #29315](https://github.com/anthropics/claude-code/issues/29315) `[社群]`（open，無 PR） | **置信度**：medium·單源孤證 `[文件·單源]`（`url` 欄位缺失為文件觀察，Issue 驗證 feature request 仍 open）

---

**6.7 manifest.json 是 JS bundle，非標準 JSON**

`MVU/manifest.json` 檔名具有誤導性，其內容是原始 Webpack 打包輸出的 JS bundle 文字（以 `import{...}` 開頭），透過 TavernHelper 的 script runner 執行。它**不是**標準 JSON 世界書條目。若按 JSON 格式嘗試解析會直接報錯。

來源：`<local-guide-db>\本地證據\卡A歷史\3.0.2\MVU\manifest.json` line 1 直接觀察 | **置信度**：high `[執行時原始碼]`

---

**6.8 flat-no-blob 離線 vendor 的體積代價**

`MVU-Zod-offline-vendor-loader-r5.json` 使用"flat no-blob build"策略：將所有 vendor 庫內聯為單一 IIFE，不透過 `URL.createObjectURL + Blob` 注入。優點是規避部分瀏覽器對 blob: URL 的 CSP 限制；代價是 `content` 欄位高達 **166,439 字元**，會顯著增加卡檔案體積。在網路條件允許時，CDN 動態載入方案（4.2 節）是更優選擇。

來源：`<local-guide-db>\本地證據\卡A歷史\3.0.2\MVU-Zod-offline-vendor-loader-r5.json` 直接測量 | **置信度**：high `[執行時原始碼]`

---

## 7. 懸案：未決項與驗證路徑

**7.1 testingcf 與 cdn.jsdelivr.net CF 節點是否完全等同**

**問題**：testingcf 和 cdn.jsdelivr.net 的 Cloudflare 節點在流量排程、速率限制、服務協議上是否完全等同？官方無文件明確區分。

**當前認知**：基於 IP 解析推斷兩者均走 Cloudflare anycast，但是否共享同一速率限制桶未知。

**驗證路徑**：在不同 ISP 環境下 `curl -o /dev/null -s -w "%{time_total}" <url>` 對比兩域名延遲；對比 `traceroute` 路徑；觀察高併發時兩域名是否同步限速。

**置信度**：low `[推斷]` | **禁止施工**：不可基於此推斷設計依賴兩者獨立性的方案

---

**7.2 TavernHelper 指令碼的確切執行時機**

**問題**：TH 指令碼是在樓層渲染時執行、ST 初始化時執行，還是其他時機？當前透過 `waitXingyueWorldbookReady` 輪詢處理競態，但 TavernHelper 內部排程順序無官方文件。

**當前認知**：生產卡透過 5000ms 超時輪詢 + 250ms 緩衝規避競態，在卡A 3.0.2 上驗證可用，但根因仍是 workaround 而非理解內部機制。

**驗證路徑**：在 ST 中的 TH 指令碼加 `console.log(Date.now(), 'script start')` 打時間戳，與 `APP_READY` / `CHAT_CHANGED` 等 ST 事件時間戳對比，確定相對順序。

**置信度**：medium `[執行時原始碼]`（現象已知，機制未知）

---

**7.3 無版本 /+esm URL 的精確更新週期**

**問題**：CDN cache 7 天后拉取新版，但 jsdelivr 內部何時輪詢 npm latest 版本？若包每天發新版，CDN 最多延遲多久？

**當前認知**：官方文件僅說"7 days with purge option"，未給出 latest 拉取頻率或內部佇列機制。

**驗證路徑**：釋出一個測試 npm 包，在 jsdelivr CDN 上追蹤無版本 URL 的版本切換時間，記錄從 npm 發版到 CDN 同步的實際延遲。

**置信度**：medium `[文件·單源]`（已知 7 天上限，精確延遲未知）

---

**7.4 多指令碼重複 import 同一 URL 的去重行為**

**問題**：多個 TH 指令碼可能重複 `import()` 同一 CDN URL（如 bundle.js）。瀏覽器模組系統應基於 URL 去重，但 TavernHelper 是否在獨立 iframe 中執行指令碼？若是，每個 iframe 有獨立模組快取，會導致重複網路請求。

**當前認知**：透過 `window.*` 全域性變數檢測（`if (ok()) return`）防止重複執行副作用，但並不能防止重複網路請求。

**驗證路徑**：在 ST Network 面板觀察同一 bundle URL 的請求次數；使用 `import.meta` 檢查指令碼執行環境是否為獨立 iframe。

**置信度**：medium `[推斷]`

---

**7.6 launch.json `cwd` 絕對路徑在 Windows 的實際行為**

**問題**：官方文件說 `cwd` 是"relative to your project root"（相對路徑），但 ST 場景需要指向 ST 根目錄（可能不在專案根下）。Windows 絕對路徑（`C:/path/to/SillyTavern`）是否被 Claude preview 接受並正常工作？

**當前認知**：文件說明相對路徑，但未明確禁止絕對路徑。實際行為未經真機驗證。

**驗證路徑**：在 `.claude/launch.json` 中分別用相對路徑和絕對路徑，觀察 Claude preview 能否正確啟動 ST 程序；同時測試 `${workspaceFolder}` 是否在 ST 掛載場景下可用。

**置信度**：low `[推斷]` | **禁止施工**：不可直接照搬絕對路徑寫法而不做本地測試

---

**7.5 離線 vendor 與線上 bundle 共存的符號衝突風險**

**問題**：若 `MVU-Zod-offline-vendor-loader-r5.json`（內聯 pinia）和 `manifest.json`（從 CDN 匯入 pinia）同時啟用，會否產生兩份 pinia 例項、導致狀態管理錯亂？

**當前認知**：flat-no-blob 構建將 pinia 封裝在 IIFE 作用域內，未註冊到 `window.pinia`，理論上不與 CDN 版本衝突，但兩份例項共存時 `getActivePinia()` 的行為未經測試。

**驗證路徑**：同時載入兩者，在 ST console 中執行 `window.Mvu?.pinia === window.otherPinia` 類似檢查；觀察 pinia store 讀寫是否互相可見。

**置信度**：medium `[推斷]`（存在風險，未量化）

---

## 附錄：本地檔案路徑索引

| 路徑 | 內容描述 |
|---|---|
| `<local-guide-db>\本地證據\卡A歷史\3.0.2\示例學園 MVU 3.0.2.json` | 主卡，含 TH scripts（git loader、CDN fallback、worldbook ready 等待） |
| `<local-guide-db>\本地證據\卡A歷史\3.0.2\MVU\manifest.json` | Webpack bundle（檔名誤導性，實為 JS），開頭有 testingcf CDN ESM imports |
| `<local-guide-db>\本地證據\卡A歷史\3.0.2\MVU-Zod-offline-vendor-loader-r5.json` | 離線 vendor（flat-no-blob IIFE，content 欄位 166,439 字元） |
| `<local-guide-db>\本地證據\卡A歷史\3.0.2\MVU\compare-versions.json` | jsDelivr 打包的單個 npm 包 ESM 原始碼示例 |

---

## 參考來源

- [jsDelivr 官方 README](https://cdn.jsdelivr.net/gh/jsdelivr/jsdelivr@master/README.md)
- [jsDelivr esm.run 介紹](https://www.jsdelivr.com/esm)
- [jsDelivr GitHub URL 文件](https://www.jsdelivr.com/?docs=gh)
- [Issue #18532：major version pinning 快取問題](https://github.com/jsdelivr/jsdelivr/issues/18532)
- [Issue #18263：esm.run 功能介紹](https://github.com/jsdelivr/jsdelivr/issues/18263)
- [Claude Code Desktop 文件（launch.json schema）](https://code.claude.com/docs/en/desktop)
- [Issue #29315：launch.json url 欄位 feature request](https://github.com/anthropics/claude-code/issues/29315)
- [SillyTavern config.yaml 預設配置](https://github.com/SillyTavern/SillyTavern/blob/release/default/config.yaml)
- [SillyTavern Extensions API 文件](https://docs.sillytavern.app/for-contributors/writing-extensions/)
- [SillyTavern config.yaml 文件](https://docs.sillytavern.app/administration/config-yaml/)
- 示例學園 3.0.2 生產卡（本地驗證執行，最高可信度參考）
