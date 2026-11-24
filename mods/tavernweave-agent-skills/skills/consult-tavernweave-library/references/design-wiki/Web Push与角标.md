---
title: Web Push與角標
created: 2026-08-14
updated: 2026-08-15
type: concept
status: active
tags:
  - wiki
  - concept
  - tooling
  - research
  - safety
sources:
  - https://www.w3.org/TR/push-api/
  - https://notifications.spec.whatwg.org/
  - https://developer.mozilla.org/en-US/docs/Web/API/Push_API
  - https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API
  - https://www.rfc-editor.org/rfc/rfc8030.html
  - https://www.rfc-editor.org/rfc/rfc8292.html
  - https://www.rfc-editor.org/rfc/rfc8291.html
  - https://www.w3.org/TR/badging/
  - https://developer.mozilla.org/en-US/docs/Web/API/Badging_API
  - https://webkit.org/blog/12945/meet-web-push/
  - https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
  - https://web.dev/articles/push-notifications-overview
  - https://web.dev/articles/push-notifications-permissions-ux
  - queries/第五批蒸餾目標.md
  - queries/第二批蒸餾目標.md
  - queries/第三批蒸餾目標.md
  - concepts/PWA與儲存配額.md
  - concepts/酒館宿主與iframe分層.md
knowledge_class: factual
---

# Web Push與角標

本頁不是已採用推送棧，也不改工坊或角色卡。檢索時間：2026-08-14。只談公開規範與平臺門，不寫攻擊步驟、繞過或憑證。賬本樞紐是 [[queries/第五批蒸餾目標]] **B5-Push**（13 條入口）。Service Worker 只當投遞鉤，不重蒸 [[queries/第二批蒸餾目標]] **B2-PWA** 的配額 / 七日 / `persist()`。Badging TR 本身已在 [[queries/第三批蒸餾目標]] B3-Mani，本頁只收推送後的角標合同。

## 一句話定義

Push 是應用伺服器經瀏覽器選定的推送服務，把加密報文投到源上的 Service Worker；Notifications 是作業系統把這件事亮到視口外；VAPID 只證明哪臺應用伺服器有權用這條訂閱；Badging 只改已安裝應用圖示上的點或數字。四件事疊用，不是一個 API。

## 為什麼重要

「Web Push」常被寫成一份瀏覽器能力。合同其實分傳輸、身份、加密、訂閱讀、系統通知；角標還是另一份。Safari 宣稱同一套標準 Push，但 iOS 另加主屏門。MDN 把 Push 標 Baseline Widely（2023-03）不能抹掉這條安裝門。許可權何時彈也不是一條規範。

## 權威入口

檢索 2026-08-14。下列 **13** 條，不是教程，也不映象全文。Apple Developer「Sending web push…」短鏈本次超時，不以它升條；Apple 平臺真源是 WebKit 兩篇。B5-Push 採集行不在本頁映象。

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [Push API](https://www.w3.org/TR/push-api/) | WD 2025-12-01；訂閱讀、`push` 事件 |
| 2 | [Notifications](https://notifications.spec.whatwg.org/) | WHATWG LS 2026-03-15；系統通知抽象 |
| 3 | [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) | Baseline Widely；`subscribe()`、endpoint 須保密 |
| 4 | [MDN Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API) | Limited；`Notification()` vs `showNotification()` |
| 5 | [RFC 8030](https://www.rfc-editor.org/rfc/rfc8030.html) | Web Push 傳輸 |
| 6 | [RFC 8292 VAPID](https://www.rfc-editor.org/rfc/rfc8292.html) | 應用伺服器自願身份 |
| 7 | [RFC 8291](https://www.rfc-editor.org/rfc/rfc8291.html) | 報文加密 |
| 8 | [Badging API](https://www.w3.org/TR/badging/) | WD 2026-04-27；`setAppBadge` / `clearAppBadge` |
| 9 | [MDN Badging](https://developer.mozilla.org/en-US/docs/Web/API/Badging_API) | Limited；`0` 即清除 |
| 10 | [WebKit Meet Web Push](https://webkit.org/blog/12945/meet-web-push/) | Safari 16 / macOS Ventura；標籤可訂 |
| 11 | [WebKit iOS/iPadOS Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) | 16.4；**僅主屏 Web 應用** |
| 12 | [web.dev Push 總覽](https://web.dev/articles/push-notifications-overview) | Push ≠ Notification；現不允許靜默推 |
| 13 | [web.dev 許可權 UX](https://web.dev/articles/push-notifications-permissions-ux) | 雙許可 / 禁落地即彈 |

刻意未收：Permissions WD（只查授權態）、Chrome Android 輕提示（許可權衝突證據，不是第二份 Push 規範）、Lighthouse onload 審計、Push 編輯草稿、舊 Safari Push Package / Website Push ID、FCM 控制檯、web-push 庫 README。

## 如何運作

### 五層合同

1. **傳輸**：[RFC 8030](https://www.rfc-editor.org/rfc/rfc8030.html)（2016-12）規定應用伺服器如何把 HTTP 報文交給推送服務。
2. **身份**：[RFC 8292 VAPID](https://www.rfc-editor.org/rfc/rfc8292.html)（2017-11）用 JWT 把訂閱綁到一對應用伺服器金鑰。這不是加密金鑰。
3. **加密**：[RFC 8291](https://www.rfc-editor.org/rfc/rfc8291.html)（2017-11）保護報文；推送服務讀不到明文。`applicationServerKey` ≠ `p256dh`。
4. **訂閱讀**：[Push API](https://www.w3.org/TR/push-api/) 是 **WD 2025-12-01**，不是 Rec。管 `PushManager.subscribe()`、`push` 事件。宣告式推送（`web_push: 8030`）寫在 WD 裡，不是 Baseline。
5. **亮出來**：[Notifications](https://notifications.spec.whatwg.org/) 是 WHATWG LS（**2026-03-15**）。`/TR/notifications/` 現網落到這篇，不要寫成 W3C Rec。

[Badging](https://www.w3.org/TR/badging/)（**WD 2026-04-27**）是另一份：`setAppBadge` / `clearAppBadge` 寫已安裝應用的主屏 / Dock 角標。通知裡的 badge 圖是通知點陣圖，不是這份 API。

`endpoint` 是能力 URL：知道它就能投。須保密。本頁不寫盜用或偽造步驟。推送服務由使用者代理選定，站點只按 `PushSubscription.endpoint` 投。

### Safari 與主屏門

WebKit 兩篇都寫：同一套 W3C Push + Notifications + Service Worker，應用做特徵檢測、放行 `*.push.apple.com`。

**另一邊必須留**：macOS Safari 16 可在**標籤頁**訂；iOS/iPadOS 16.4 **只給已加到主屏**、且清單 `display` 為 `standalone` / `fullscreen` 的 Web 應用。Safari 標籤裡的站點沒有這層安裝面，就沒有 iOS 推送。寫「Safari 支援 Web Push」必須拆平臺。

### 許可權提示不是一條合同

規範（含 Permissions WD）只標準化查詢與授權態，不規定何時彈系統提示。幾套策略不要併成一種：

- MDN：須用戶手勢；Firefox 72 起無手勢會被拒。
- web.dev：價值主張 / 雙許可 / 設定面板 / 被動開關；**禁落地即彈**；被永久 Block 後站點不能再要。
- Chrome Lighthouse 把 onload `requestPermission()` 標失敗。Chrome 80 起低接受率進安靜 UI。
- Android Chrome 155 起非阻塞提示可超時，`requestPermission()` 回到 `default`，須聽 `permissions.onchange`。
- Safari / iOS：**必須**使用者手勢，且先過主屏門。

### 可見通知與角標

Chrome/Edge 拒 `userVisibleOnly !== true`。WebKit：違 `userVisibleOnly`（不亮可見通知）會**撤訂閱**。web.dev：瀏覽器目前不允許無可見通知的靜默推。Firefox 對不亮通知的推送另有配額；Chrome 無此條。都不是「可以做靜默推」。

MDN：Push 已 Baseline Widely；Notifications 與 Badging 仍 Limited。三套成熟度不同。Badging 實現面：`nothing` / `flag` / 整數；`0` 即清除。iOS 上 Badging 跟通知許可權走。

## 必須保留的衝突

- **iOS 只給已加主屏的 Web 應用。** 同一套標準 Push：macOS Safari 16 可在標籤頁訂；iOS/iPadOS 16.4 只給已加到主屏且 `display` 為 `standalone` / `fullscreen` 的 Web 應用。MDN Baseline Widely 不能抹掉這條安裝門。兩邊都留。
- 許可權提示策略不是一條合同：手勢、雙許可、安靜 UI、超時回到 `default` 不要併成一種。
- Push API 是 WD，不是 Rec。Notifications 真源是 WHATWG LS，不是 W3C Rec。
- Push 已 Baseline；Notifications 與 Badging 仍 Limited。
- VAPID 身份 ≠ 8291 加密；`applicationServerKey` ≠ `p256dh`。
- 違 `userVisibleOnly` 在 WebKit 會撤訂閱；現瀏覽器不允許無可見通知的靜默推。
- 本頁對映獨立站的推送 / 角標合同；**不是**「本倉庫已採用 Web Push」。

## 例子

- 正例：獨立工坊站若談推送，按五層分開寫：8030 投遞、8292 身份、8291 加密、Push API 訂閱、Notifications 亮出。
- 正例：寫 Safari 支援時拆 macOS 標籤 vs iOS 主屏門，不寫「Safari 已 Baseline」。
- 正例：角標用 `setAppBadge`；通知小圖示用 Notifications 的 badge 點陣圖。兩套不混名。
- 反例：落地即彈 `requestPermission()`，或把「手勢 / 雙許可 / 安靜 UI / 超時 default」併成一種提示。
- 反例：把 VAPID 金鑰當報文加密金鑰，或把 `userVisibleOnly: false` 當成靜默推開關。
- 反例：因本頁出現 Push 就寫進 recipe / 髮卡依賴。

## 邊界與易混概念

- 不包括：垃圾推送教程、onload 彈許可權菜譜、繞過許可權、靜默推利用、endpoint 盜用、攻擊、PoC、FCM 操作、舊 Safari Push Package、把庫接入當規範。
- Push ≠ Notification。前者是投到 SW；後者是 OS 亮出來。
- VAPID ≠ 8291 加密。身份金鑰不是 ECDH 金鑰。
- 通知 badge 圖 ≠ Badging API。
- 舊 Website Push ID ≠ RFC 8030。
- B2-PWA 的配額 / 七日 / `persist()` **不是**推送許可權，也不擋撤訂閱。見 [[concepts/PWA與儲存配額]]。
- 宣告式推送不是 Baseline。

## 對映到本倉庫

酒館卡 iframe 無 OS 安裝面，也不是頂層 PWA：Push / 主屏門 / `setAppBadge` 不自動落到卡。分層見 [[concepts/酒館宿主與iframe分層]]。SW 作為第三種 worker 見 [[concepts/SharedWorker與Web Locks]]。獨立工坊站可以談推送，那是頂層站點合同；本頁不寫「本倉庫已採用 Web Push」。

## 來源與證據

- 五層：Push API WD 20251201；Notifications LS 2026-03-15；RFC 8030 / 8291 / 8292 文首；Badging WD 20260427。
- Safari 門：WebKit 2022「Meet Web Push」（Safari 16 / 標籤）；WebKit「Web Push for web apps on iOS and iPadOS」（16.4 / 僅主屏）。
- 許可權：web.dev 兩篇；MDN Push / Notifications；Chrome Android 155 輕提示作衝突證據，不升條。
- 賬本：[[queries/第五批蒸餾目標]] B5-Push；分路原稿仍在 `10-收件箱/寫回候選/第五批-B5-Push.md`。重疊 [[queries/第二批蒸餾目標]] B2-PWA（SW / 配額）、[[queries/第三批蒸餾目標]] B3-Mani（清單 `display` / 角標 TR）。

已知衝突見上節，不靜默覆蓋。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞（含 `safety`：只談規範約束）
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[concepts/PWA與儲存配額]]
- [[concepts/SharedWorker與Web Locks]]
- [[concepts/酒館宿主與iframe分層]]
- [[concepts/創意工坊與安全契約]]
- [[concepts/git掛載與遠端真身]]
- [[queries/第五批蒸餾目標]]
- [[queries/第二批蒸餾目標]]
- [[queries/第三批蒸餾目標]]
