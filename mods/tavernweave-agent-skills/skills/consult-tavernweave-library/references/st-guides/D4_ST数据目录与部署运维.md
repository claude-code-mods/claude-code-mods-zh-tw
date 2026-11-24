# ST 資料目錄與部署運維參考手冊

> 文件版本：v1.0.0 ｜ 最後更新：2026-07-14

> 面向角色卡開發與伺服器運維的可檢索參考文件
> 收集日期：2026-06-28 ｜ 交叉驗證跨 15+ 個獨立來源（官方文件 + GitHub 原始碼 + DeepWiki）

---

## 目錄

0. [置信度分級體系（全手冊適用）](#0-置信度分級體系全手冊適用)
1. [機制總覽](#1-機制總覽)
2. [data/ 目錄完整結構](#2-data-目錄完整結構)
   - 2.1 [頂層目錄樹（原始碼實證）](#21-頂層目錄樹原始碼實證)
   - 2.2 [多使用者模式下的目錄擴充套件](#22-多使用者模式下的目錄擴充套件)
   - 2.3 [不需要備份的目錄](#23-不需要備份的目錄)
3. [config.yaml 完整欄位參考](#3-configyaml-完整欄位參考)
   - 3.1 [網路與監聽](#31-網路與監聽)
   - 3.2 [安全與 IP 白名單](#32-安全與-ip-白名單)
   - 3.3 [認證與會話](#33-認證與會話)
   - 3.4 [資料儲存](#34-資料儲存)
   - 3.5 [SSL/TLS](#35-ssltls)
   - 3.6 [備份](#36-備份)
   - 3.7 [效能與快取](#37-效能與快取)
   - 3.8 [縮圖](#38-縮圖)
   - 3.9 [擴充套件與外掛](#39-擴充套件與外掛)
   - 3.10 [日誌、CORS、速率限制](#310-日誌cors速率限制)
   - 3.11 [環境變數覆蓋規則](#311-環境變數覆蓋規則)
4. [Docker 部署完整正規化](#4-docker-部署完整正規化)
   - 4.1 [官方 docker-compose.yml](#41-官方-docker-composeyml)
   - 4.2 [路徑對映表](#42-路徑對映表)
   - 4.3 [非 root 使用者執行](#43-非-root-使用者執行)
   - 4.4 [更新流程](#44-更新流程)
   - 4.5 [Healthcheck 原理](#45-healthcheck-原理)
   - 4.6 [SELinux 環境掛載](#46-selinux-環境掛載)
   - 4.7 [IP 白名單陷阱（Linux Docker CE）](#47-ip-白名單陷阱linux-docker-ce)
5. [安裝、分支與更新](#5-安裝分支與更新)
   - 5.1 [Node.js 版本要求](#51-nodejs-版本要求)
   - 5.2 [分支策略](#52-分支策略)
   - 5.3 [更新升級命令](#53-更新升級命令)
6. [v1.12.0 遷移：舊路徑 vs 新路徑](#6-v1120-遷移舊路徑-vs-新路徑)
7. [多使用者賬戶系統](#7-多使用者賬戶系統)
   - 7.1 [啟用方式](#71-啟用方式)
   - 7.2 [使用者角色](#72-使用者角色)
   - 7.3 [Handle 規範](#73-handle-規範)
   - 7.4 [密碼安全與限制](#74-密碼安全與限制)
   - 7.5 [密碼恢復](#75-密碼恢復)
   - 7.6 [登入行為](#76-登入行為)
   - 7.7 [SSO 高階整合](#77-sso-高階整合)
8. [關鍵檔案格式規範](#8-關鍵檔案格式規範)
   - 8.1 [角色卡格式（PNG + tEXt chunk）](#81-角色卡格式png--text-chunk)
   - 8.2 [聊天記錄格式（JSONL）](#82-聊天記錄格式jsonl)
   - 8.3 [World Info（Lorebook）格式](#83-world-infolorebook-格式)
   - 8.4 [settings.json 結構概要](#84-settingsjson-結構概要)
   - 8.5 [預設內容腳手架](#85-預設內容腳手架)
9. [網路訪問與安全](#9-網路訪問與安全)
   - 9.1 [開放外網訪問最小配置](#91-開放外網訪問最小配置)
   - 9.2 [Cloudflare/Tailscale 推薦正規化](#92-cloudflaretailscale-推薦正規化)
   - 9.3 [反向代理（Nginx）關鍵注意點](#93-反向代理nginx關鍵注意點)
10. [備份與遷移操作規範](#10-備份與遷移操作規範)
    - 10.1 [完整手動備份清單](#101-完整手動備份清單)
    - 10.2 [Docker 完整備份](#102-docker-完整備份)
    - 10.3 [自動備份機制](#103-自動備份機制)
11. [高頻避坑速查](#11-高頻避坑速查)
12. [懸而未決：需真機驗證的問題](#12-懸而未決需真機驗證的問題)

---

## 0. 置信度分級體系（全手冊適用）

> **收集日期統一宣告**：本手冊全部條目收集於 **2026-06-28**，交叉驗證跨 15+ 個獨立來源。回源核實基於 SillyTavern **v1.14.0** 執行時原始碼（`src/constants.js`、`src/users.js`、`src/healthcheck.js` 等）；手冊中的欄位/路徑為採集時快照，行為與 v1.14.0 一致，但具體行號可能在後續版本漂移。

每條結論採用 **置信度等級 + 依據型別** 雙軸標註。

### 置信度三級

| 級別 | 含義 | 判定標準 |
|---|---|---|
| **high** | 已坐實，可直接施工 | 有執行時證據（真機實測 / 讀到執行時實現原始碼 / 生產卡驗證）；結論是原始碼/文件的直接事實而非下游推導；不在懸案清單 |
| **medium** | 待驗證，施工前須實測 | 強制二選一子標籤：`medium·單源孤證`（單一來源、無第二源、無實測）/ `medium·推導未驗證`（原始碼或邏輯推導成立但未跑通，須隨附真機驗證路徑）|
| **low** | 孤證無源，禁止據此施工 | 零來源猜測 / 純歷史快照（須標年份 + 窄縮適用範圍）|

### 依據型別標籤（與置信度正交，強制標註）

`[執行時原始碼]`、`[真機]`、`[文件·多源]`、`[文件·單源]`、`[社群]`、`[推斷]`、`[歷史孤證:年份]`、`[無源·待考]`

### 兩條鐵規

1. **原始碼內部事實可標 high `[執行時原始碼]`，但跨步推導的執行時行為最高只能 `medium·推導未驗證`**，除非已真機驗證。
2. **節級標註 = 節內條目下確界**——禁止整節標 high 卻內含懸案條目；衝突即在節內區域性降級。正文斷言凡命中懸案章（本手冊第 12 章 U 系列）的，置信度不得高於該懸案對應級別，並交叉引用。

---

## 1. 機制總覽

**核心結論**：SillyTavern 是 Node.js LLM 前端。v1.12.0 起將使用者資料從 `/public` 目錄遷移到獨立的可配置 `data/` 目錄，實現資料與伺服器程式碼完全解耦，支援 Docker 卷掛載和多使用者隔離。核心配置透過 `config.yaml` 管理，支援環境變數 `SILLYTAVERN_*` 字首覆蓋。

| 屬性 | 說明 |
|---|---|
| 資料根目錄 | `data/`（相對路徑基準為 ST 安裝目錄，可透過 `dataRoot` 修改） |
| 單使用者目錄 | `data/default-user/`（handle 固定為 `"default-user"`） |
| 核心配置檔案 | `config.yaml`（ST 安裝根目錄，不在 `data/` 內） |
| 執行時 | Node.js 20+，npm 管理依賴 |
| 程序啟動 | `node server.js` 或透過 `Start.bat` / `start.sh` 封裝啟動 |

來源：docs.sillytavern.app + github.com/SillyTavern/SillyTavern/blob/release/src/constants.js ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]` `[執行時原始碼]`

---

## 2. data/ 目錄完整結構

### 2.1 頂層目錄樹（原始碼實證）

來源：`src/constants.js` 中 `USER_DIRECTORY_TEMPLATE` 常量 + DeepWiki 資料管理章節

```
data/
├── default-user/                 ← 單使用者模式唯一使用者目錄（handle = "default-user"）
│   ├── settings.json             ← 使用者偏好設定（power_user 物件，debounce 1000ms 儲存）
│   ├── secrets.json              ← API 金鑰（明文儲存，透過 readSecret/writeSecret 讀寫）
│   ├── content.log               ← 記錄哪些預設內容已被複制到該使用者目錄
│   ├── characters/               ← 角色卡 PNG（含 tEXt chunk 嵌入 JSON）
│   │   └── {character_name}/     ← 同名子目錄，存 expressions/精靈圖等資產
│   ├── chats/                    ← 聊天記錄，每角色一個子目錄，.jsonl 檔案
│   ├── worlds/                   ← World Info/Lorebook，.json 格式
│   ├── groups/                   ← 群組定義檔案
│   ├── group chats/              ← 群聊記錄（注意含空格）
│   ├── backgrounds/              ← 背景圖片
│   ├── User Avatars/             ← 使用者頭像（注意含空格）
│   ├── user/                     ← 使用者上傳檔案根
│   │   ├── images/               ← 上傳圖片
│   │   ├── files/                ← Data Bank 附件
│   │   └── workflows/            ← ComfyUI 工作流
│   ├── thumbnails/               ← 縮圖快取（重啟可重建，無需備份）
│   │   ├── bg/
│   │   ├── avatar/
│   │   └── persona/
│   ├── NovelAI Settings/         ← NovelAI 預設 .json
│   ├── KoboldAI Settings/        ← KoboldAI 預設
│   ├── OpenAI Settings/          ← OpenAI/ChatCompletion 預設
│   ├── TextGen Settings/         ← TextGen(ooba) 預設
│   ├── themes/                   ← UI 主題 .json
│   ├── movingUI/                 ← 可拖拽 UI 佈局儲存
│   ├── instruct/                 ← Instruct 模板
│   ├── context/                  ← Context 模板
│   ├── sysprompt/                ← System Prompt 預設
│   ├── reasoning/                ← 推理模板
│   ├── QuickReplies/             ← 快捷回覆
│   ├── assets/                   ← 資產檔案
│   ├── extensions/               ← 使用者級 UI 擴充套件（僅自己可見）
│   ├── vectors/                  ← Data Bank RAG 向量嵌入（Vectra JSON 格式）
│   └── backups/                  ← 聊天自動備份（按 maxTotalBackups 輪轉）
│
├── _cache/                       ← 伺服器全域性快取（非使用者專屬）
│   └── characters/               ← 角色卡磁碟快取（useDiskCache=true 時啟用）
├── _css/                         ← 自定義 CSS（user.css）
├── _errors/                      ← 錯誤頁面 HTML（whitelist/unauthorized 等）
├── _storage/                     ← 多使用者賬戶資料（node-persist，禁止手動編輯）
├── _uploads/                     ← 臨時上傳目錄（每次啟動清空）
├── _webpack/                     ← 編譯資產快取（可重建）
├── access.log                    ← HTTP 請求日誌（enableAccessLog=true 時寫入）
├── heartbeat.json                ← Docker healthcheck 心跳檔案
└── cookie-secret.txt             ← Cookie 簽名金鑰（自動生成，勿手動修改）
```

**避坑**：`group chats/` 和 `User Avatars/` 目錄名含空格，shell 指令碼操作須用引號包裹。

來源：github.com/SillyTavern/SillyTavern/blob/release/src/constants.js (`USER_DIRECTORY_TEMPLATE`) + DeepWiki 資料管理章節 ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[執行時原始碼]`

### 2.2 多使用者模式下的目錄擴充套件

啟用 `enableUserAccounts: true` 後，每個使用者擁有獨立的同構目錄：

```
data/
├── default-user/       ← 永不刪除，作為無賬戶模式 fallback admin
├── alice/              ← 使用者 handle（小寫字母 + 數字 + 破折號）
├── bob-123/
└── _storage/           ← 所有賬戶元資訊（node-persist，禁止手動編輯）
```

來源：docs.sillytavern.app/administration/multi-user/ ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]`

### 2.3 不需要備份的目錄

| 目錄 | 原因 |
|---|---|
| `thumbnails/` | 重啟自動重建 |
| `_cache/` | 重啟自動重建 |
| `_uploads/` | 每次啟動自動清空 |
| `_webpack/` | 構建產物，可重建 |

來源：docs.sillytavern.app + 社群實踐 ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]`

---

## 3. config.yaml 完整欄位參考

來源：docs.sillytavern.app/administration/config-yaml/ + github.com/SillyTavern/SillyTavern/blob/release/default/config.yaml + 本地 v1.14.0 `default/config.yaml` 直讀 ｜ 適用版本：v1.12.0+ ｜ 置信度：**節級 medium·推導未驗證** `[文件·多源]` `[執行時原始碼]`（本節含多個欄位在 v1.14.0 中不存在，屬後續版本新增；節內各子節單獨標註；原節級 high 與實際內容不符，降級）

### 3.1 網路與監聽

| 欄位 | 預設值 | 說明 |
|---|---|---|
| `port` | `8000` | 監聽埠（1-65535） |
| `listen` | `false` | 是否接受非本機連線（`true` 才能外網訪問） |
| `protocol.ipv4` | `true` | 啟用 IPv4 |
| `protocol.ipv6` | `false` | 啟用 IPv6 |
| `listenAddress.ipv4` | `0.0.0.0` | 繫結 IPv4 地址 |
| `listenAddress.ipv6` | `[::]` | 繫結 IPv6 地址 |
| `enableKeepAlive` | — | HTTP keep-alive（**v1.14.0 不存在此欄位**，為後續版本新增）|
| `heartbeatInterval` | — | Docker healthcheck 心跳間隔（**v1.14.0 不存在此欄位**，為後續版本新增）|

### 3.2 安全與 IP 白名單

| 欄位 | 預設值 | 說明 |
|---|---|---|
| `whitelistMode` | `true` | 啟用 IP 白名單 |
| `whitelist` | `["::1","127.0.0.1"]` | 允許的 IP 列表，支援 CIDR |
| `enableForwardedWhitelist` | `true` | 檢查 X-Real-IP/X-Forwarded-For（反向代理用）|
| `whitelistDockerHosts` | `true` | 自動白名單 Docker 宿主機 IP |
| `disableCsrfProtection` | `false` | 停用 CSRF（不推薦）|
| `securityOverride` | `false` | 跳過開放監聽但無認證的安全警告 |

### 3.3 認證與會話

| 欄位 | 預設值 | 說明 |
|---|---|---|
| `basicAuthMode` | `false` | 啟用 HTTP Basic Auth |
| `basicAuthUser.username` | `"user"` | Basic Auth 使用者名稱 |
| `basicAuthUser.password` | `"password"` | Basic Auth 密碼 |
| `enableUserAccounts` | `false` | 啟用多使用者模式 |
| `enableDiscreetLogin` | `false` | 隱藏登入頁使用者列表（需手動輸入 handle）|
| `sessionTimeout` | `-1` | 會話超時秒數（-1=停用，0=關閉瀏覽器即過期，>0=定時）|
| `perUserBasicAuth` | `false` | 用賬戶密碼作為 Basic Auth 憑證 |

### 3.4 資料儲存

| 欄位 | 預設值 | 說明 |
|---|---|---|
| `dataRoot` | `./data` | 使用者資料根目錄（絕對或完整相對路徑，**不支援 `~`**）|
| `skipContentCheck` | `false` | 跳過預設內容檢查/同步 |

**避坑**：`dataRoot` 不支援 shell 展開（`~`、`$HOME` 等），必須寫完整路徑。

### 3.5 SSL/TLS

| 欄位 | 預設值 | 說明 |
|---|---|---|
| `ssl.enabled` | `false` | 啟用 HTTPS |
| `ssl.keyPath` | `./certs/privkey.pem` | 私鑰路徑 |
| `ssl.certPath` | `./certs/cert.pem` | 證書路徑 |
| `ssl.keyPassphrase` | `""` | 私鑰密碼 |

### 3.6 備份

| 欄位 | 預設值 | 說明 |
|---|---|---|
| `backups.common.numberOfBackups` | `50` | 備份保留數量 |
| `backups.chat.enabled` | `true` | 啟用聊天自動備份 |
| `backups.chat.checkIntegrity` | `true` | 儲存前校驗聊天檔案完整性 |
| `backups.chat.throttleInterval` | `10000` | 備份節流間隔（毫秒）|
| `backups.chat.maxTotalBackups` | `-1` | 最大備份總數（-1=不限）|
| `backups.allowFullDataBackup` | — | **v1.14.0 不存在此欄位**，為後續版本新增 |

### 3.7 效能與快取

| 欄位 | 預設值 | 說明 |
|---|---|---|
| `performance.lazyLoadCharacters` | `false` | 懶載入角色列表（v1.14.0 原始碼實測預設值為 `false`，非 `true`）[執行時原始碼] |
| `performance.useDiskCache` | `true` | 磁碟快取角色卡（→ `data/_cache/characters`）|
| `performance.memoryCacheCapacity` | `100mb` | 記憶體快取上限 |
| `performance.requestCompression.*` | — | **v1.14.0 不存在此欄位組**，為後續版本新增 |

### 3.8 縮圖

| 欄位 | 預設值 | 說明 |
|---|---|---|
| `thumbnails.enabled` | `true` | 啟用縮圖生成 |
| `thumbnails.quality` | `95` | JPEG 質量（0-100）|
| `thumbnails.format` | `jpg` | 縮圖格式 |
| `thumbnails.dimensions.bg` | `[160,90]` | 背景縮圖尺寸（寬×高）|
| `thumbnails.dimensions.avatar` | `[96,144]` | 頭像縮圖尺寸 |
| `thumbnails.dimensions.persona` | `[96,144]` | Persona 縮圖尺寸 |

### 3.9 擴充套件與外掛

| 欄位 | 預設值 | 說明 |
|---|---|---|
| `extensions.enabled` | `true` | 啟用 UI 擴充套件 |
| `extensions.autoUpdate` | `true` | 自動更新擴充套件 |
| `extensions.models.autoDownload` | `true` | 自動下載 HF 模型 |
| `enableServerPlugins` | `false` | 啟用服務端外掛 |
| `enableServerPluginsAutoUpdate` | `true` | 自動更新服務端外掛 |

### 3.10 日誌、CORS、速率限制

| 欄位 | 預設值 | 說明 |
|---|---|---|
| `logging.minLogLevel` | `0` | 日誌級別（0=DEBUG, 3=ERROR）|
| `logging.enableAccessLog` | `true` | 寫 HTTP 訪問日誌（→ `data/access.log`）|
| `enableCorsProxy` | `false` | 啟用 CORS 代理中介軟體（v1.14.0 實際欄位名為 `enableCorsProxy`，**不是** `cors.enabled`/`cors.origin` 巢狀結構，該巢狀結構為後續版本）`[執行時原始碼]` |
| `rateLimiting.preferRealIpHeader` | `false` | 使用 X-Real-IP 進行限速（v1.14.0 僅此一個子欄位）|
| `rateLimiting.accountsLoginMaxAttempts` | — | **v1.14.0 不存在此欄位**，為後續版本新增 |
| `rateLimiting.basicAuthMaxAttempts` | — | **v1.14.0 不存在此欄位**，為後續版本新增 |

**避坑**：`enableCorsProxy: true` 會開放 CORS 代理，僅在必要擴充套件明確要求時開啟（SSRF 風險）。

### 3.11 環境變數覆蓋規則

```bash
# 格式：SILLYTAVERN_ + 大寫欄位名（巢狀用 _ 分隔）
SILLYTAVERN_DATAROOT=/custom/data
SILLYTAVERN_PORT=9000
SILLYTAVERN_ENABLEUSERACCOUNTS=true
# SILLYTAVERN_HEARTBEATINTERVAL=30  ← 僅適用於 v1.14.0 後的版本，該欄位在 v1.14.0 中不存在
```

優先順序從高到低：**命令列引數 > 環境變數 > config.yaml > 硬編碼預設值**

來源：docs.sillytavern.app/administration/config-yaml/ + 本地 v1.14.0 `default/config.yaml` 直讀 ｜ 適用版本：v1.12.0+ ｜ 置信度：medium·推導未驗證 `[文件·多源]` `[執行時原始碼]`（3.10 節 cors/rateLimiting 欄位在 v1.14.0 中與文件描述不符，已在行內修正；此來源行為 3.1–3.11 整章通用註腳，降自 high）

---

## 4. Docker 部署完整正規化

來源：github.com/SillyTavern/SillyTavern/blob/release/docker/docker-compose.yml（官方原始檔案）

### 4.1 官方 docker-compose.yml

```yaml
# ── v1.14.0 本地原始碼實測版本（已與本地 docker/docker-compose.yml 直讀核實）──
services:
  sillytavern:
    build: ..
    container_name: sillytavern
    hostname: sillytavern
    image: ghcr.io/sillytavern/sillytavern:latest
    environment:
      - NODE_ENV=production
      - FORCE_COLOR=1
    ports:
      - "8000:8000"
    volumes:
      - "./config:/home/node/app/config"
      - "./data:/home/node/app/data"
      - "./plugins:/home/node/app/plugins"
      - "./extensions:/home/node/app/public/scripts/extensions/third-party"
    restart: unless-stopped
```

> **版本差異警告**：`SILLYTAVERN_HEARTBEATINTERVAL=30` 環境變數和 `healthcheck` 塊在 **v1.14.0 本地原始碼中不存在**，官方文件/GitHub release 分支的最新版本已新增這兩項。若使用比 v1.14.0 更新的版本，請以 GitHub release 分支實際檔案為準。

來源：本地 v1.14.0 `docker/docker-compose.yml` 直讀 `[執行時原始碼]` + 官方文件（最新版本新增內容）`[文件·單源]` ｜ v1.14.0 適用版本置信度：high `[執行時原始碼]`；含 healthcheck 新欄位部分：medium·單源孤證 `[文件·單源]`（未真機驗證新版本）

### 4.2 路徑對映表

| 宿主機路徑 | 容器內路徑 | 用途 |
|---|---|---|
| `./config` | `/home/node/app/config` | config.yaml 所在目錄 |
| `./data` | `/home/node/app/data` | 使用者資料目錄（**必須掛載**）|
| `./plugins` | `/home/node/app/plugins` | 服務端外掛 |
| `./extensions` | `/home/node/app/public/scripts/extensions/third-party` | 全域性 UI 擴充套件 |

**注意**：全域性擴充套件（admin 安裝的）在 `public/scripts/extensions/third-party/`，需專門 volume 掛載；使用者級擴充套件在 `data/{handle}/extensions/`，隨 data 卷自動持久化。兩條路徑不同，不可混淆。

來源：官方 docker-compose.yml ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]` `[執行時原始碼]`

### 4.3 非 root 使用者執行

```yaml
# 方法一：PUID/PGID（推薦，入口點自動修復所有權）
environment:
  - PUID=1000
  - PGID=1000

# 方法二：--user 標誌
docker run --user 1000:1000 ...
```

來源：docs.sillytavern.app/installation/docker/ ｜ 適用版本：v1.12.0+ ｜ 置信度：medium·單源孤證 `[文件·單源]`（官方文件記載，v1.14.0 本地 Dockerfile/docker-compose.yml 未驗證 PUID/PGID 入口點實現；降自 high）

### 4.4 更新流程

```bash
cd SillyTavern/docker
docker compose down
# staging 分支映象改為 :staging
docker rmi ghcr.io/sillytavern/sillytavern:latest
docker compose up -d
```

來源：docs.sillytavern.app/installation/docker/ ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]`

### 4.5 Healthcheck 原理

> **版本注意**：`src/healthcheck.js` 和 `heartbeatInterval` / `heartbeat.json` 機制在 **v1.14.0 本地原始碼中均不存在**（已 Glob + Grep 驗證無此檔案，config.yaml 中也無 heartbeatInterval 欄位）。以下描述基於官方文件，適用於比 v1.14.0 更新的 release 版本。

伺服器週期性寫入時間戳到 `data/heartbeat.json`（心跳間隔由 `SILLYTAVERN_HEARTBEATINTERVAL` 控制，單位：秒），`src/healthcheck.js` 檢查該檔案是否存在且為最近更新。

**關鍵約束**：若修改了 `dataRoot`，必須同步設定 `SILLYTAVERN_DATAROOT` 環境變數，否則 healthcheck 找不到心跳檔案，容器將始終報 unhealthy。

來源：docs.sillytavern.app/installation/docker/（最新 release 分支）｜ 適用版本：v1.14.0 以上某版本起 ｜ 置信度：medium·單源孤證 `[文件·單源]`（v1.14.0 本地原始碼無此機制，未真機驗證引入版本；**原標註 high `[執行時原始碼]` 有誤，降為 medium·單源孤證**）

### 4.6 SELinux 環境掛載

```yaml
volumes:
  - ./config:/home/node/app/config:z    # 共享 SELinux 標籤（多容器共享）
  - ./data:/home/node/app/data:Z        # 私有 SELinux 標籤（本容器專用）
```

來源：docs.sillytavern.app/installation/docker/ ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]`

### 4.7 IP 白名單陷阱（Linux Docker CE）

**現象**：Linux Docker CE 環境中，預設白名單 `127.0.0.1` 不包含 Docker 閘道器 IP，導致瀏覽器無法訪問 ST。

**修復步驟**：

```bash
# 第一步：查詢 Docker 閘道器 IP
docker network inspect docker_default | grep Gateway
# 典型輸出：172.18.0.1

# 第二步：加入白名單（或開啟自動檢測）
```

```yaml
# config/config.yaml
whitelist:
  - 127.0.0.1
  - 172.18.0.1    # Docker 閘道器 IP
# 或：
whitelistDockerHosts: true   # 自動檢測並白名單 Docker 宿主機 IP
```

來源：docs.sillytavern.app/installation/docker/ + 社群實踐 ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]`

---

## 5. 安裝、分支與更新

### 5.1 Node.js 版本要求

**當前要求**：Node.js **20+**（v18 已 EOL，2026 年官方要求 v20+）。推薦安裝最新 LTS 版。

來源：docs.sillytavern.app/installation/ ｜ 適用版本：v1.12.0+ ｜ 置信度：medium·單源孤證 `[文件·單源]`（來自社群綜合指南，無官方明確版本表格）

### 5.2 分支策略

| 分支 | 更新頻率 | 適用人群 | Docker 映象 tag |
|---|---|---|---|
| `release` | 約每月一次 | 絕大多數使用者、角色卡生產環境 | `latest` |
| `staging` | 每日多次 | 開發者/追新者 | `staging` |

**避坑**：staging 分支每日多次提交，不適合生產環境或角色卡開發依賴——功能/API 可能隨時變動。

來源：docs.sillytavern.app/installation/ + github.com/SillyTavern/SillyTavern ｜ 適用版本：全版本 ｜ 置信度：high `[文件·多源]`

### 5.3 更新升級命令

```bash
# ---- 裸機安裝（初次）----
git clone https://github.com/SillyTavern/SillyTavern -b release
cd SillyTavern
# Windows
Start.bat
# Linux/Mac（含 npm install 自動執行）
bash start.sh

# ---- 日常更新 ----
# Linux/Mac/Termux
cd SillyTavern && git pull && bash start.sh

# Windows 一鍵更新
UpdateAndStart.bat

# ---- 合併衝突處理 ----
git merge --abort
git reset --hard
git pull --rebase --autostash

# ---- npm 模組損壞修復 ----
rm -rf node_modules && npm cache clean --force && npm install

# ---- ZIP 包升級時的資料遷移（v>=1.12.0）----
cp -r /old/data /new/SillyTavern/data
cp /old/config.yaml /new/SillyTavern/config.yaml
```

來源：docs.sillytavern.app/installation/updating/ ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]`

---

## 6. v1.12.0 遷移：舊路徑 vs 新路徑

v1.12.0 將使用者資料從 `/public` 遷出到獨立 `data/` 目錄，以下是完整路徑對映：

| 舊位置（`<1.12.0`） | 新位置（`>=1.12.0`） |
|---|---|
| `/secrets.json` | `/data/default-user/secrets.json` |
| `/public/characters` | `/data/default-user/characters` |
| `/public/chats` | `/data/default-user/chats` |
| `/public/settings.json` | `/data/default-user/settings.json` |
| `/public/worlds` | `/data/default-user/worlds` |
| `/public/themes` | `/data/default-user/themes` |
| `/public/backgrounds` | `/data/default-user/backgrounds` |
| `/public/groups` | `/data/default-user/groups` |

**遷移行為差異**：
- **裸機安裝**：首次啟動自動遷移，舊資料備份到 `/backups/_migration/YYYY-MM-DD/`
- **Docker**：需手動遷移，新建 data 卷，將內容移入 `default-user/` 子目錄
- **config.yaml**：保留原位（ST 安裝根目錄），不隨資料一起遷移

**重要警告**：從 `<1.12.0` 升級時，禁止直接複製整個 `/public/` 目錄到新版本，只選擇性複製使用者資料子目錄到新的 `data/default-user/`，否則會引入舊版伺服器檔案導致混亂。

來源：docs.sillytavern.app/installation/st-1.12.0-migration-guide/ ｜ 適用版本：v1.12.0 遷移場景 ｜ 置信度：high `[文件·多源]`

---

## 7. 多使用者賬戶系統

### 7.1 啟用方式

```yaml
# config.yaml
enableUserAccounts: true
enableDiscreetLogin: false   # true = 不顯示使用者列表，需手動輸入 handle
```

來源：docs.sillytavern.app/administration/multi-user/ ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]`

### 7.2 使用者角色

| 角色 | 許可權說明 |
|---|---|
| admin | 建立/刪除/修改所有使用者；為所有使用者安裝擴充套件 |
| regular | 僅管理自己的賬戶；只為自己安裝擴充套件 |

- 所有新賬戶預設為 regular，需管理員手動提升
- `default-user` 永不刪除，是 `enableUserAccounts: false` 時的 fallback admin

來源：docs.sillytavern.app/administration/multi-user/ ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]`

### 7.3 Handle 規範

**格式**：小寫字母 + 數字 + 破折號（不含大寫、空格、其他特殊字元）

合法示例：`alice`、`user-123`、`flux-the-cat`

對應目錄路徑：`data/{handle}/`

來源：docs.sillytavern.app/administration/multi-user/ + github.com/SillyTavern/SillyTavern/blob/release/src/users.js ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]` `[執行時原始碼]`

### 7.4 密碼安全與限制

| 方面 | 說明 |
|---|---|
| 儲存方式 | `scrypt` 雜湊 + 每使用者獨立 salt |
| 賬戶資料位置 | `data/_storage/`（node-persist，禁止手動編輯）|
| 登入限速 | 失敗 5 次/分鐘（`rateLimiting.accountsLoginMaxAttempts`）|
| 安全定位 | 官方明確：密碼是"基本隱私保護，不是安全特性" |
| API 金鑰風險 | API 金鑰以明文存於 `secrets.json`，有伺服器檔案系統許可權即可讀取 |

**重要警告**：多使用者密碼不是強安全邊界。有伺服器檔案系統訪問許可權的人可直接讀取 `secrets.json`。如需真正隔離，需配合作業系統級別的檔案許可權控制。

來源：docs.sillytavern.app/administration/multi-user/ ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]`

### 7.5 密碼恢復

```bash
# 在伺服器端執行（需能訪問伺服器命令列）
# password 引數可省略——省略則清空密碼（設為空密碼）
node recover.js [user-handle] [new-password]
```

> **已刪除"4 位恢復碼"說法**：v1.14.0 的 `recover.js` + `src/recover-password.js` 直讀確認，密碼恢復僅支援命令列方式，無任何"從伺服器控制檯獲取 4 位碼"機制（系原草稿無中生有）。`[執行時原始碼]`

來源：本地 v1.14.0 `recover.js`、`src/recover-password.js` 直讀 + docs.sillytavern.app/administration/multi-user/ ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[執行時原始碼]`

### 7.6 登入行為

| 場景 | 行為 |
|---|---|
| 只有 1 個使用者且無密碼 | 直接跳過登入頁 |
| `enableDiscreetLogin: false` | 顯示使用者列表，點選登入 |
| `enableDiscreetLogin: true` | 隱藏使用者列表，需手動輸入 handle |

來源：docs.sillytavern.app/administration/multi-user/ ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]`

### 7.7 SSO 高階整合

支援透過 Authelia 和 Authentik 反向代理頭（`X-Real-IP`/`X-Forwarded-For`）實現自動登入。SSO 使用者名稱需與 ST handle 大小寫不敏感匹配。需同時開啟 `enableForwardedWhitelist: true`。

來源：docs.sillytavern.app/administration/multi-user/ ｜ 適用版本：v1.12.0+ ｜ 置信度：medium·單源孤證 `[文件·單源]`（無實測驗證）

---

## 8. 關鍵檔案格式規範

### 8.1 角色卡格式（PNG + tEXt chunk）

**核心結論**：角色卡以 **PNG 檔案**形式儲存，JSON 資料嵌入 `tEXt` chunk，keyword 為 `chara`（base64 編碼）。同時支援多版本格式：

| 格式版本 | 說明 | 相容性 |
|---|---|---|
| V1（遺留）| 平面 JSON | 只讀，仍可匯入 |
| V2 | `tEXt` chunk，keyword = `chara`（base64）| 讀寫，最廣相容 |
| V3（當前）| 優先讀取，同時寫入 V2 保持相容 | 當前預設 |

支援匯入的其他格式：JSON、CharX（ZIP）、BYAF、YAML

**核心 JSON 欄位**：`name`、`description`、`personality`、`scenario`、`mes_example`、`system_prompt`、`tags`

**匯出時自動移除的私有欄位**（`unsetPrivateFields()`）：`fav`（收藏狀態）、`chat`（當前聊天檔名）

**儲存路徑**：
- 角色卡檔案：`data/{handle}/characters/{角色名}.png`
- 精靈圖/資產：`data/{handle}/characters/{角色名}/`（同名子目錄）

來源：本地 v1.14.0 `src/character-card-parser.js` 直讀（V2=`chara`/V3=`ccv3` keyword 已驗證）+ DeepWiki 角色管理章節 ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[執行時原始碼]`（keyword 值、V2/V3 並存、BYAF 格式支援均原始碼直讀驗證）；`unsetPrivateFields()` 函式名 + 匯出欄位清單未在後端 src 中找到（可能在前端），對應部分降為 medium·推導未驗證 `[文件·多源]`

### 8.2 聊天記錄格式（JSONL）

每個聊天檔案為 `.jsonl` 格式，逐行解析：

```jsonl
// 第 1 行：header（元資料）
{"user_name":"User","character_name":"Assistant","create_date":"2024-01-15 @14h 30m 15s 123ms"}

// 後續行：訊息（每行獨立 JSON 物件）
{"name":"User","is_user":true,"is_name":true,"send_date":1705328415123,"mes":"Hello!","swipes":["Hello!"],"swipe_id":0,"extra":{}}
{"name":"Assistant","is_user":false,"is_name":true,"send_date":1705328416000,"mes":"Hi there!","swipes":["Hi there!","Hey!"],"swipe_id":0,"extra":{}}
```

**關鍵欄位說明**：

| 欄位 | 型別 | 說明 |
|---|---|---|
| `name` | string | 發言者名稱 |
| `is_user` | boolean | 是否為使用者訊息 |
| `is_name` | boolean | 是否顯示名稱 |
| `send_date` | number | 毫秒時間戳 |
| `mes` | string | 當前顯示的訊息內容 |
| `swipes` | string[] | 所有訊息變體（swipe）陣列 |
| `swipe_id` | number | 當前選中的變體索引 |
| `extra` | object | 附加資料（tokens、image 等）|

**儲存路徑**：`data/{handle}/chats/{角色名}/`（每角色一個子目錄）

**群聊路徑**：`data/{handle}/group chats/`（含空格）

**完整性保護**：integrity slug 機制防止多標籤頁併發覆蓋。

**避坑**：
- 聊天檔案重新命名後，checkpoint 按檔名關聯，重新命名導致 checkpoint 失效。
- 改角色名不影響舊聊天檔案，但舊檔案無法在新名字下自動索引。

來源：github.com/SillyTavern/SillyTavern/issues/2151（社群 issue）+ DeepWiki 角色管理章節 ｜ 適用版本：v1.12.0+ ｜ 置信度：medium·單源孤證 `[社群]` `[文件·多源]`（主要來源是 GitHub issue 和 DeepWiki，非直讀執行時原始碼；原標 high `[執行時原始碼]` 依據型別標註有誤，降級並修正依據型別；integrity slug 等細節未原始碼驗證）

### 8.3 World Info（Lorebook）格式

**檔案格式**：JSON（`.json`），存放於 `data/{handle}/worlds/`

**條目欄位參考**：

| 欄位 | 型別 | 說明 |
|---|---|---|
| `uid` | number | 唯一識別符號 |
| `keys` | string[] | 主觸發關鍵詞 |
| `keysecondary` | string[] | 副關鍵詞（過濾邏輯）|
| `comment` | string | 條目備註/標題 |
| `content` | string | 插入提示詞的文字內容 |
| `enabled` | boolean | 是否啟用 |
| `constant` | boolean | 是否無條件觸發 |
| `insertion_order` | number | 優先順序（數值越高越靠前）|
| `position` | string/enum | 插入位置（Before/After Char Defs 等）|
| `scanDepth` | number | 掃描訊息深度 |
| `caseSensitive` | boolean | 關鍵詞大小寫敏感 |
| `selectiveLogic` | number | 副關鍵詞邏輯（AND ANY/AND ALL/NOT）|
| `probability` | number | 觸發機率（0-100）|
| `group` | string | 包含組（同組互斥）|
| `role` | string | 訊息角色分配 |
| `triggers` | string[] | 生成型別過濾 |
| `automationId` | string | STscript 整合 ID |
| `characterFilter` | object | 限制啟用的角色 |

來源：docs.sillytavern.app/usage/core-concepts/worldinfo/ ｜ 適用版本：v1.12.0+ ｜ 置信度：medium·單源孤證 `[文件·多源]`（條目欄位有部分來自文件，具體列舉值未真機逐一驗證）

### 8.4 settings.json 結構概要

**頂層代表性欄位**：

| 欄位 | 說明 |
|---|---|
| `user_name` | 使用者顯示名 |
| `amount_gen` | 生成 token 數上限 |
| `max_context` | 上下文視窗大小 |
| `extension_settings` | 所有擴充套件的配置中心（單一真相源）|
| `power_user` | UI 偏好、tokenizer、instruct/context/sysprompt 模板、主題 |

**儲存機制**：
- 前端：debounce 1000ms 觸發儲存 + 每 10 分鐘 auto-save
- 後端：`src/endpoints/settings.js` 持久化到 `settings.json`

**預設值來源**：`default/content/settings.json`（首次使用者目錄建立時同步）

來源：DeepWiki settings 管理章節 + docs.sillytavern.app ｜ 適用版本：v1.12.0+ ｜ 置信度：medium·單源孤證 `[文件·多源]`（僅獲得部分欄位，完整 schema 見懸案 U4）

### 8.5 預設內容腳手架

```
default/
├── content/
│   ├── settings.json    ← 全域性預設配置
│   └── index.json       ← 指定哪些檔案複製給新使用者（首次建立時）
└── scaffold/
    └── index.json       ← 每次伺服器啟動時複製給每個使用者的檔案
```

`content/` 和 `scaffold/` 走同一函式 `checkForNewContent()`（v1.14.0 `src/endpoints/content-manager.js` 直讀），**均經過 `content.log` 去重**——已複製過的條目記錄在 `content.log`，下次啟動不會重複覆蓋。`scaffold/` 的檔案在**每次啟動時都會檢查**，但只有 `content.log` 中未登記的條目才實際複製，並非"無條件覆蓋"。

來源：本地 v1.14.0 `src/endpoints/content-manager.js` 直讀 `[執行時原始碼]` + DeepWiki `[文件·單源]` ｜ 適用版本：v1.12.0+ ｜ 置信度：medium·推導未驗證 `[執行時原始碼]`（原始碼邏輯清晰，但 scaffold 目錄實際有哪些檔案/下發頻率未真機測試；原標註 medium·單源孤證 升級為 medium·推導未驗證，依據型別改為含 [執行時原始碼]）

---

## 9. 網路訪問與安全

### 9.1 開放外網訪問最小配置

```yaml
# config.yaml — 最小可用外網訪問配置
listen: true
whitelistMode: false   # 或保持 true 並新增具體 IP/CIDR
basicAuthMode: true
basicAuthUser:
  username: myuser
  password: strongpassword123
```

**官方警告**：禁止不加保護地將 ST 暴露到公網。Basic Auth 無獨立限速（`rateLimiting.basicAuthMaxAttempts` 僅限 1 分鐘 5 次），推薦用隧道/VPN 代替埠轉發。

來源：docs.sillytavern.app/usage/remoteconnections/ ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]`

### 9.2 Cloudflare/Tailscale 推薦正規化

**Tailscale**（最簡單，免費個人使用）：
1. 兩臺裝置各安裝並登入 Tailscale
2. 將 Tailscale 分配的機器 IP 加入 ST 白名單
3. 訪問：`http://<tailscale-machine-name>:8000/`

**Cloudflare Zero Trust**（支援 50 使用者，免費）：
1. 用 `cloudflared tunnel` 建立隧道
2. 無需修改路由器或防火牆設定
3. 自帶 Cloudflare 身份驗證層

來源：docs.sillytavern.app/administration/tunneling/ ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]`

### 9.3 反向代理（Nginx）關鍵注意點

- Nginx 需正確配置 WebSocket upgrade headers（`Upgrade`、`Connection`）
- 需透過 `X-Real-IP`/`X-Forwarded-For` 傳遞真實 IP，並同時開啟 `enableForwardedWhitelist: true`
- **不支援子路徑部署**（issue #2025 尚未解決，只能掛在根路徑 `/`）

來源：社群實踐 + github.com/SillyTavern/SillyTavern/issues/2025 ｜ 適用版本：v1.12.0+ ｜ 置信度：medium·推導未驗證 `[社群]`（官方文件僅有 Traefik 範例，Nginx 無官方配置指南）

---

## 10. 備份與遷移操作規範

### 10.1 完整手動備份清單

以下是 `data/default-user/` 下的完整備份項：

```
必須備份（不可重建）：
├── characters/          ← 角色卡 PNG（含嵌入的全部資料）
├── chats/               ← 聊天記錄 JSONL
├── worlds/              ← World Info
├── groups/              ← 群組定義
├── group chats/         ← 群聊記錄
├── backgrounds/
├── User Avatars/
├── user/                ← 上傳檔案/圖片/ComfyUI 工作流
├── NovelAI Settings/
├── KoboldAI Settings/
├── OpenAI Settings/
├── TextGen Settings/
├── themes/
├── instruct/
├── context/
├── sysprompt/
├── reasoning/
├── movingUI/
├── QuickReplies/
├── assets/
├── extensions/          ← 使用者級擴充套件
├── vectors/             ← RAG 向量資料
├── backups/             ← 可選（聊天自動備份副本）
├── settings.json        ← 重要！所有 UI 設定和擴充套件配置
└── secrets.json         ← API 金鑰（注意安全，勿明文傳輸）

可跳過（重啟或重新生成）：
├── thumbnails/          ← 縮圖快取
├── _cache/              ← 伺服器快取
└── _uploads/            ← 臨時上傳（啟動自動清空）
```

來源：docs.sillytavern.app + 社群實踐 ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]`

### 10.2 Docker 完整備份

```bash
# 停止容器後備份兩個目錄即可（config + data）
docker compose down
tar -czf backup-$(date +%Y%m%d).tar.gz ./config ./data

# 恢復
tar -xzf backup-YYYYMMDD.tar.gz
docker compose up -d
```

來源：docs.sillytavern.app/installation/docker/ ｜ 適用版本：v1.12.0+ ｜ 置信度：high `[文件·多源]`

### 10.3 自動備份機制

| 型別 | 觸發條件 | 配置項 | 存放位置 |
|---|---|---|---|
| 聊天自動備份 | 每次修改後 throttle（預設 10000ms）| `backups.chat.*` | `data/{handle}/backups/` |
| 全量資料備份 | 使用者手動在 UI 觸發 | `backups.allowFullDataBackup: true`（**v1.14.0 config.yaml 中無此欄位，為後續版本新增**）| 下載為 zip |
| 遷移備份 | v1.12.0 升級時首次啟動 | 自動 | `backups/_migration/YYYY-MM-DD/` |

來源：docs.sillytavern.app + 本地 v1.14.0 `default/config.yaml` 直讀 ｜ 適用版本：v1.12.0+ ｜ 置信度：medium·推導未驗證 `[文件·多源]` `[執行時原始碼]`（聊天自動備份欄位 v1.14.0 直讀確認；全量備份欄位為後續版本新增；節級降自 high）

---

## 11. 高頻避坑速查

| # | 陷阱 | 現象 | 修復 | 置信度 |
|---|---|---|---|---|
| 1 | Docker IP 白名單 | 瀏覽器無法訪問 ST（Linux Docker CE）| `docker network inspect docker_default \| grep Gateway`，將閘道器 IP 加白名單；或 `whitelistDockerHosts: true` | high `[文件·多源]` |
| 2 | Healthcheck 找不到心跳檔案 | 容器始終報 unhealthy | 修改 `dataRoot` 後必須同步設定 `SILLYTAVERN_DATAROOT` 環境變數（**僅適用於含 healthcheck 機制的版本，v1.14.0 中該機制不存在**）| medium·單源孤證 `[文件·單源]`（原標 high `[執行時原始碼]` 有誤；v1.14.0 本地無 src/healthcheck.js，降級）|
| 3 | dataRoot 路徑不支援 `~` | 啟動報錯或路徑解析錯誤 | 使用完整絕對路徑或完整相對路徑，不得包含 `~`、`$HOME` 等 shell 展開符 | high `[文件·多源]` |
| 4 | 從舊版 `/public/` 整體複製 | 新版伺服器檔案被舊版覆蓋，行為異常 | 從 `<1.12.0` 升級只選擇性複製使用者資料子目錄到 `data/default-user/`，禁止整體複製 `/public/` | high `[文件·多源]` |
| 5 | 多使用者密碼安全誤解 | 誤以為密碼保護了 API 金鑰 | `secrets.json` 明文儲存，有伺服器檔案系統許可權即可讀取；密碼僅是"基本隱私" | high `[文件·多源]` |
| 6 | 改角色名後舊聊天失聯 | 舊聊天檔案無法在新名字下自動索引 | chats 子目錄按角色名建立，改名不自動遷移；需手動重新命名 chats 子目錄 | high `[執行時原始碼]` |
| 7 | 重新命名聊天檔案斷 checkpoints | checkpoint 失效 | checkpoint 按檔名關聯，重新命名後需重建關聯 | high `[執行時原始碼]` |
| 8 | Extensions 路徑雙軌 | 擴充套件只有自己可見/admin 安裝無效 | 全域性擴充套件（admin 安裝）在 `public/scripts/extensions/third-party/`（Docker 需專門 volume 掛載）；使用者級在 `data/{handle}/extensions/` | high `[文件·多源]` `[執行時原始碼]` |
| 9 | staging 分支用於生產 | 功能隨時變動，角色卡行為不穩定 | 生產/角色卡開發依賴 release 分支 | high `[文件·多源]` |
| 10 | CORS proxy 寬鬆配置 | SSRF 漏洞 | v1.14.0 欄位名為 `enableCorsProxy: true`（無 `cors.enabled/origin` 巢狀），寬鬆配置僅在必要時開啟 | medium·推導未驗證 `[執行時原始碼]`（v1.14.0 原始碼確認欄位名；SSRF 風險為邏輯推導，原標 high `[文件·多源]` 依據型別有誤，降級調整）|
| 11 | 不支援子路徑部署 | Nginx 反代子路徑訪問失敗 | ST 只能掛在根路徑 `/`（issue #2025 未解決）| medium·推導未驗證 `[社群]` |

---

## 12. 懸而未決：需真機驗證的問題

### U1 — chats/ 子目錄命名規則

**問題**：文件未明確 chats 子目錄名是否完全使用角色 `name` 欄位，還是經過特殊字元清潔處理（去除 `/`、`:`、`*` 等不合法檔名字元）或截斷。

**驗證路徑**：建立含特殊字元名稱角色（如 `Alice/Bob`、`角色:測試`），發一條訊息後觀察 `data/default-user/chats/` 實際生成的目錄名。

置信度：low `[推斷]`

---

### U2 — 角色卡內嵌 Lorebook 與 worlds/ 目錄的同步關係

**問題**：角色卡可內嵌 lorebook 資料（存於 PNG chunk）。匯出帶繫結世界書的角色卡時，是否同步生成/更新 `worlds/` 目錄下的獨立 `.json` 檔案，還是僅存於 PNG chunk 內？

**驗證路徑**：在 ST 中為角色繫結世界書後，檢查匯出前後 `worlds/` 目錄變化；同時檢查匯入含內嵌 lorebook 的 PNG 是否在 `worlds/` 生成新檔案。

置信度：low `[推斷]`

---

### U3 — vectors/ 內部檔案結構

**問題**：Vectra 庫的 JSON 格式文件極少，`data/{handle}/vectors/` 下每個集合的檔案命名與角色/聊天記錄的對應關係不明確。

**驗證路徑**：啟用 Data Bank 並上傳檔案後，直接檢視 `data/{handle}/vectors/` 目錄實際檔案結構，對比 Vectra 倉庫原始碼中的儲存格式。

置信度：low `[推斷]`

---

### U4 — settings.json 完整 schema

**問題**：僅獲得頂層和 `power_user` 的部分欄位，完整 schema 未見於文件。

**驗證路徑**：查閱 `default/content/settings.json`（ST 原始碼中）獲取完整預設值結構；或在空白例項啟動後直接讀取生成的 `data/default-user/settings.json`。

置信度：medium·推導未驗證 `[文件·單源]`（有單一來源指向預設檔案位置，但未直接讀取完整內容）

---

### U5 — `data/_storage/` 內部檔案格式

**問題**：`_storage/` 使用 node-persist 儲存多使用者賬戶資訊，官方明確禁止手動編輯但未公佈格式。具體檔案命名、handle/passwordHash/salt/role 等欄位的 JSON schema 不明。

**驗證路徑**：建立多使用者模式並新增測試賬戶後，檢視 `data/_storage/` 目錄實際內容（純讀取，不修改）。

置信度：low `[推斷]`

---

### U6 — git pull 時 config.yaml 衝突行為

**問題**：如果 ST 倉庫的 `default/config.yaml` 有改動而使用者也有本地修改，`git pull --rebase` 可能產生衝突。推測：使用者的 `config.yaml` 位於倉庫根目錄，而預設檔案在 `default/config.yaml`，兩者是不同檔案，不會衝突——但需真機驗證確認覆蓋行為。

**驗證路徑**：在有本地 `config.yaml` 修改的情況下執行 `git pull`，觀察檔案是否被覆蓋。

置信度：low `[推斷]`（推測方向已給出，但未實測）

---

## 來源索引

| 來源 | URL |
|---|---|
| 官方文件 — config.yaml | https://docs.sillytavern.app/administration/config-yaml/ |
| 官方文件 — Docker 部署 | https://docs.sillytavern.app/installation/docker/ |
| 官方文件 — 多使用者系統 | https://docs.sillytavern.app/administration/multi-user/ |
| 官方文件 — 更新升級 | https://docs.sillytavern.app/installation/updating/ |
| 官方文件 — v1.12.0 遷移指南 | https://docs.sillytavern.app/installation/st-1.12.0-migration-guide/ |
| 官方文件 — 遠端訪問 | https://docs.sillytavern.app/usage/remoteconnections/ |
| 官方文件 — World Info | https://docs.sillytavern.app/usage/core-concepts/worldinfo/ |
| 官方文件 — Data Bank | https://docs.sillytavern.app/usage/core-concepts/data-bank/ |
| 官方文件 — 隧道/穿透 | https://docs.sillytavern.app/administration/tunneling/ |
| GitHub 原始碼 — constants.js | https://github.com/SillyTavern/SillyTavern/blob/release/src/constants.js |
| GitHub 原始碼 — users.js | https://github.com/SillyTavern/SillyTavern/blob/release/src/users.js |
| GitHub 原始碼 — docker-compose.yml | https://github.com/SillyTavern/SillyTavern/blob/release/docker/docker-compose.yml |
| GitHub 原始碼 — default/config.yaml | https://github.com/SillyTavern/SillyTavern/blob/release/default/config.yaml |
| DeepWiki — 資料管理 | https://deepwiki.com/SillyTavern/SillyTavern/5-data-management |
| DeepWiki — 角色與聊天儲存 | https://deepwiki.com/SillyTavern/SillyTavern/5.1-characters-and-chat-storage |
| DeepWiki — 認證與安全 | https://deepwiki.com/SillyTavern/SillyTavern/2.5-authentication-and-security |
| DeepWiki — settings 管理 | https://deepwiki.com/SillyTavern/SillyTavern/5.3-settings-and-configuration-management |
| GitHub Issue #2151（聊天格式）| https://github.com/SillyTavern/SillyTavern/issues/2151 |
