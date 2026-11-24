---
title: Kubernetes工作負載
created: 2026-08-14
updated: 2026-08-15
type: concept
status: active
tags:
  - wiki
  - concept
  - research
  - tooling
sources:
  - https://kubernetes.io/docs/concepts/workloads/
  - https://kubernetes.io/docs/concepts/workloads/pods/
  - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
  - https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/
  - https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
  - https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
  - https://kubernetes.io/docs/concepts/workloads/controllers/job/
  - https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
  - https://kubernetes.io/docs/concepts/workloads/controllers/replicationcontroller/
  - https://kubernetes.io/docs/concepts/workloads/management/
  - https://kubernetes.io/docs/concepts/configuration/overview/
  - https://kubernetes.io/blog/2025/11/25/configuration-good-practices/
  - https://kubernetes.io/docs/concepts/configuration/
  - https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
  - https://www.cncf.io/projects/kubernetes/
  - https://kubernetes.io/docs/concepts/configuration/configmap/
  - queries/第三批蒸餾目標.md
  - concepts/後端架構名詞與工坊對照.md
knowledge_class: factual
---

# Kubernetes工作負載

本頁不是已採用編排，也不是本倉庫要上 K8s 的工單。檢索時間：2026-08-14。賬本見 [[queries/第三批蒸餾目標]] B3-K8s。只收 [k8s.io 工作負載概念](https://kubernetes.io/docs/concepts/workloads/) 與 [CNCF 專案頁](https://www.cncf.io/projects/kubernetes/)。不收 Secret 操作、攻防步驟、叢集接管。

## 一句話定義

Kubernetes 工作負載是跑在集群裡的應用；真正排程的最小單位是 **Pod**，日常用的是更高一層的控制器：Deployment / ReplicaSet / StatefulSet / DaemonSet / Job（以及按日程建立 Job 的 CronJob）。

## 為什麼重要

行業裡「上 K8s」常被說成一件事。官方分層不是這樣：Pod 會隨節點故障一起死掉且不會自行復活；控制器才按你宣告的狀態補齊。本頁只蒸這層合同，不寫成工坊 Gateway 或髮卡 JSON 已經跑在叢集上。C4 的容器 / 部署圖是說明用符號，不是本頁這些 API 物件，見 [[concepts/C4與ADR]]。十二因素的無狀態程序也不管 ReplicaSet 怎麼補齊，見 [[concepts/十二因素與CAP]]。Deployment 滾動到叢集，也不等於功能對使用者可見，見 [[concepts/功能開關與OpenFeature]]。

## 權威入口

| # | 入口 | 管什麼 |
|---|---|---|
| 1 | [工作負載總覽](https://kubernetes.io/docs/concepts/workloads/) | 層與內建控制器；節點致命故障對已跑 Pod 是終態 |
| 2 | [Pod](https://kubernetes.io/docs/concepts/workloads/pods/) | 最小可部署單位；少建裸 Pod |
| 3 | [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) | B3-K8s 樞紐；宣告式更新 Pod 與 ReplicaSet |
| 4 | [ReplicaSet](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/) | 按 selector 維持數量；建議經 Deployment |
| 5 | [StatefulSet](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/) | 粘性身份、有序擴縮、卷認領 |
| 6 | [DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/) | 每個（或某些）節點一份 |
| 7 | [Job](https://kubernetes.io/docs/concepts/workloads/controllers/job/) | 跑完即停；重試直到成功完成數達標 |
| 8 | [CronJob](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/) | 按日程建 Job；不保證恰好一次 |
| 9 | [ReplicationController](https://kubernetes.io/docs/concepts/workloads/controllers/replicationcontroller/) | 遺留頁，已被 Deployment + ReplicaSet 取代 |
| 10 | [Managing Workloads](https://kubernetes.io/docs/concepts/workloads/management/) | 清單組織與滾動；Helm 標第三方 |
| 11 | [configuration/overview（現網改道）](https://kubernetes.io/docs/concepts/configuration/overview/) | 舊概念路徑，現為部落格正文 |
| 12 | [Configuration Good Practices 部落格](https://kubernetes.io/blog/2025/11/25/configuration-good-practices/) | 2025-11-25 真身，不是現行概念規範 |
| 13 | [Configuration 概念索引](https://kubernetes.io/docs/concepts/configuration/) | 2021-06-16；不再列出 overview |
| 14 | [Recommended Labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/) | `app.kubernetes.io/*` 推薦不是強制 |
| 15 | [CNCF Kubernetes](https://www.cncf.io/projects/kubernetes/) | 2016-03-10 孵化 / 2018-03-06 畢業 |
| 16 | [ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/) | 非機密鍵值；上限 1 MiB；不收 Secret |

上表 **16** 條。B3-K8s 的採集行不在本頁映象。

## 如何運作

### 層（從底到頂）

| 層 | 官方一句話 | 管什麼 | 不管什麼 |
|---|---|---|---|
| Pod | 最小可部署計算單位 | 同機共網共盤的一組容器 | 節點掛了不會自己再起一個 |
| ReplicaSet | 維持指定數量的相同 Pod | 按 selector 收養 / 建立 / 刪除 | 不提供宣告式滾動更新 |
| Deployment | 宣告式更新 Pod 與 ReplicaSet | 無狀態、可互換副本的滾動與回滾 | 不要手改它名下的 ReplicaSet |
| StatefulSet | 一組有粘性身份的 Pod | 穩定網路名、有序擴縮、卷認領 | 刪/縮容預設不刪卷；要自備 Headless Service |
| DaemonSet | 節點本地設施 | 每個（或某些）節點一份 | 不是按副本數水平擴前端 |
| Job | 跑完即停的一次性任務 | 重試直到成功完成數達標 | 不是常駐服務 |
| CronJob | 按日程建立 Job | crontab 式重複 | 不保證恰好一次；Job 應冪等 |

[工作負載總覽](https://kubernetes.io/docs/concepts/workloads/)：節點上的致命故障對已在跑的 Pod 是終態，要恢復必須新建 Pod。內建控制器就是幹這個的。Deployment + ReplicaSet 替換遺留 ReplicationController。生態裡還可以用 CRD 加第三方工作負載；那是擴充套件，不是核心六種。v1.35 **alpha**（預設關）另有 Workload API / `PodGroupTemplate`，給 gang scheduling 用。它不是 Deployment 的繼任，兩邊留。

### Pod

[Pods](https://kubernetes.io/docs/concepts/workloads/pods/)：一組共位置、共排程的容器，模型是應用的「邏輯主機」。常見是一容器一 Pod；多容器只給緊耦合。水平擴容靠多個 Pod，不靠一個 Pod 裡堆副本。官方寫：即使單例項也很少直接建裸 Pod，應走 Deployment 或 Job；要記狀態再看 StatefulSet。Pod 相對短暫：跑完、被刪、被驅逐或節點失敗就結束。**重啟容器 ≠ 重啟 Pod**——Pod 不是程序，是容器環境，物件一直活到被刪除。v1.25 起 `.spec.os.name` 只認 `linux` / `windows`。到 v1.36，該欄位**不**影響 kube-scheduler 選節點；選錯 OS 要靠節點標籤 + `nodeSelector`。兩邊按版本留。

### ReplicaSet 與 Deployment

[ReplicaSet](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/) 用 selector + replicas + template 維持數量。官方建議：除非要自定義更新編排或根本不更新，否則不要直接操作 ReplicaSet，寫 Deployment。Deployment 擁有並管理 ReplicaSet；[Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) 明文：**不要管理 Deployment 名下的 ReplicaSet**。ReplicaSet 仍是一等 API，也可做 HPA 目標。無 OwnerReference（或 Owner 不是 Controller）且標籤匹配的裸 Pod 會被立刻收養——超員則殺掉。這與「永遠只通過 Deployment」的建議並存，兩邊留。[ReplicationController](https://kubernetes.io/docs/concepts/workloads/controllers/replicationcontroller/) 仍有概念頁，但標題已寫 Legacy，被 Deployment + ReplicaSet 取代（RC 無集合選擇器）。

### StatefulSet / DaemonSet / Job

[StatefulSet](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)：同模板但**不可互換**，身份跨重排程粘住。限制：卷要 StorageClass 或預置；刪/縮容不刪卷（資料安全優先）；網路身份靠你自建的 Headless Service；直接刪除不保證有序終止（先縮到 0）；預設 `OrderedReady` 滾動可能卡死要人手修。示例用 `ReadWriteOnce`，正文另寫生產更推薦 `ReadWriteOncePod`。

[DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)：儲存 / 日誌 / 監控這類節點守護。加節點就加 Pod，刪節點就回收。對比 Deployment：前端無狀態、在乎副本與滾動 → Deployment；必須在每臺（或某類）機器上有一份、好讓別的 Pod 能跑 → DaemonSet。靜態 Pod（kubelet 看目錄、不經 apiserver）仍寫在替代方案裡，同時寫「未來可能棄用」。

[Job](https://kubernetes.io/docs/concepts/workloads/controllers/job/)：建立 Pod 並重試直到成功完成數夠；刪 Job 清它建的 Pod。要按日程重複，用 [CronJob](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)（v1.21 stable）。CronJob 在某些情況下會建出 0 個或兩個併發 Job，因此 Job 應冪等。`CRON_TZ` / `TZ` 寫進 `schedule` 從未官方支援，時區用 `.spec.timeZone`。`startingDeadlineSeconds` 小於 10 秒可能根本排不上（控制器約 10 秒看一次）。錯過超過 100 次則本次不啟動並打日誌。

### configuration/overview 已改道部落格

B3-K8s 點名：舊概念路徑 [`/docs/concepts/configuration/overview/`](https://kubernetes.io/docs/concepts/configuration/overview/) 現網仍 200，但正文已是 2025-11-25 Kirti Goyal 的部落格 [Configuration Good Practices](https://kubernetes.io/blog/2025/11/25/configuration-good-practices/)（頁尾 2026-01-03「Reorganize 2025 blog content」）。部落格自稱受原 Configuration Best Practices 啟發，不是現行概念規範。[Configuration 概念索引](https://kubernetes.io/docs/concepts/configuration/) 末更仍標 2021-06-16，子頁是 ConfigMaps / Secrets / 資源管理 / kubeconfig / Windows，**不再列出 overview**。舊路徑與部落格真身、與索引缺頁三邊都留，不把部落格當概念真源，也不假裝 overview 還在概念樹裡。

部落格裡的工作負載句與概念頁同層：裸 Pod 測試可以、生產危險；常駐用 Deployment（它會建 ReplicaSet）；跑完用 Job。管理頁 [Managing Workloads](https://kubernetes.io/docs/concepts/workloads/management/) 仍在概念樹：清單裡 Service 寫在 Deployment 前面；Helm 標第三方，Kustomize 是 kubectl 原生。推薦標籤 [`app.kubernetes.io/*`](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/) 方便工具互操作，**不是**核心工具的硬性要求；官方寫明 Kubernetes 不是 PaaS，沒有強制的「應用」物件。ConfigMap 只記邊界：[非機密鍵值](https://kubernetes.io/docs/concepts/configuration/configmap/)，與映象解耦，上限 1 MiB。機密走 Secret——本頁不收 Secret 操作。[CNCF](https://www.cncf.io/projects/kubernetes/)：2016-03-10 入孵化，2018-03-06 畢業。專案文件真身在 kubernetes.io，不在 CNCF 商店或案例頁。

## 必須保留的衝突

- `configuration/overview` 現網已改道 2025-11-25 部落格；部落格 URL 才是真身；Configuration 索引仍停在 2021 且不再列 overview。不把部落格升成概念規範。
- ReplicaSet：概念頁說「可能永遠不必手改」；它仍是一等 API 且可做 HPA 目標，並能收養匹配標籤的裸 Pod。
- ReplicationController 概念頁仍在，同時標題寫 Legacy、推薦 Deployment。
- Workload API（v1.35 alpha，預設關）與內建六種控制器並行，不是替換。
- 靜態 Pod 仍寫引導用途，DaemonSet 頁同時寫「未來可能棄用」。
- StatefulSet 示例用 `ReadWriteOnce`，正文推薦生產用 `ReadWriteOncePod`。
- CronJob 可能建 0 或 2 個 Job；`startingDeadlineSeconds < 10` 可能排不上。
- v1.36：`spec.os.name` 不參與排程選點，與「寫了 OS 就會落到對的節點」的口語衝突。
- 推薦標籤不是核心工具硬性要求。
- 本倉產物門 ≠ 叢集工作負載；本頁不是上 K8s 工單，也不是已採用編排。

## 例子

- 正例：無狀態前端寫 Deployment，讓它管 ReplicaSet 和滾動。
- 正例：要穩定 DNS 名和卷認領的庫用 StatefulSet + 自建 Headless Service。
- 正例：節點日誌採集用 DaemonSet；一次性遷移用 Job；每天備份用 CronJob 且任務冪等。
- 反例：手改 Deployment 名下的 ReplicaSet。
- 反例：把髮卡 JSON / 工坊 Gateway 寫成已經是集群裡的 Deployment。
- 反例：把 `/docs/concepts/configuration/overview/` 當現行概念規範引用。

## 邊界與易混概念

- 不包括：Secret 建立/掛載/輪換；RBAC 提權；攻防、滲透、叢集接管；把本倉遷到 K8s 的實施工單。
- 不包括：Helm chart 市場、雲廠商託管控制面——管理頁只點名 Helm 為第三方，清單看 CNCF Landscape。
- 易混：Pod ≠ 容器；重啟容器 ≠ 重建 Pod。
- 易混：ReplicaSet ≠ Deployment。前者保數量，後者宣告式更新並擁有前者。
- 易混：StatefulSet ≠ 「帶盤的 Deployment」。身份、順序、卷生命週期都不同。
- 易混：DaemonSet ≠ 「replicas 等於節點數的 Deployment」。排程語義綁節點，不是水平副本。
- 易混：Job ≠ Deployment。跑完即停 vs 常駐。CronJob 只負責按日程**建立** Job。
- 易混：ReplicationController（遺留）≠ ReplicaSet（現行復制原語）≠ Deployment（推薦入口）。
- 易混：靜態 Pod ≠ DaemonSet。前者不經 apiserver，文件同時寫「可能棄用」。
- 易混：Workload API（v1.35 alpha）≠ 上表六種內建控制器。
- 易混：gRPC / Connect 是 RPC 合同，見 [[concepts/gRPC與Connect]]，不是 Deployment。
- 易混：StatefulSet 粘性身份 ≠ 多租戶切庫 / RLS，見 [[concepts/Postgres與多租戶]]。
- 區分：先問「要常駐、有身份、綁節點，還是跑完」；再問「這是行業合同還是本倉產品門」。
- 相鄰賬本不併進本頁：網格與 Gateway API 見 [[queries/第四批蒸餾目標]]；映象合同見 [[queries/第五批蒸餾目標]] B5-OCI；GitOps 見 [[queries/第七批蒸餾目標]]；Helm 專口見 [[queries/第八批蒸餾目標]]。觀測入口見 [[concepts/可觀測與OpenTelemetry]]、[[concepts/Prometheus與OpenMetrics]]，不是工作負載物件。製品清單見 [[concepts/SBOM與SLSA]]，也不是 Pod。

## 對映到本倉庫

工坊目錄、髮卡 JSON/PNG、Wiki 靜態檢查都是**產物門**。它們回答「這份東西能不能出」。K8s 工作負載回答「集群裡誰來保證副本、身份、節點守護或跑完」。**不要把本頁寫成工坊要上 K8s 的工單，也不要寫成已經採用。**

| 本倉物件 | 實際是 | 不是 |
|---|---|---|
| 創意庫專案 / 髮卡物 | 原始檔 + 回封 JSON/PNG，見 [[50-創意庫/README]]、[[concepts/打包回封路徑]] | Deployment / Pod |
| 工坊釋出稽核 | 同步 REST + `pending → approved / rejected / withdrawn`，見 [[comparisons/工坊架構該上與不該上]] | ReplicaSet 保活 |
| Wiki / 蒸餾門 | 來源可定位 + `verify-repo` | Job 完成數 |
| 卡內 iframe HUD | 宿主頁掛載，見 [[concepts/入口外殼與HUD宿主]] | DaemonSet 節點守護 |
| 世界書 / MVU | 提示與變數閉環，見 [[concepts/MVU變數閉環]] | StatefulSet 粘性身份 |
| 有狀態庫 / 多租戶 | 隔離切在例項、庫、schema 或行，見 [[concepts/Postgres與多租戶]] | StatefulSet 網路名與卷認領 |

對照句：卡A / 卡B / 怪談「已驗證穩定」是產品類，不是叢集 Ready。交付結果指標見 [[concepts/DORA五項與SLO]]，也不是 Pod Ready。行業「何時用」仍看 [[comparisons/行業架構方案何時用]]，本頁不改那張表，也不新增「本倉應部署 K8s」。

## 來源與證據

權威入口以上表 16 條與 [[queries/第三批蒸餾目標]] B3-K8s 為準。只收 k8s.io 與 CNCF 專案頁。

- 層與控制器：工作負載總覽、Pod、Deployment、ReplicaSet、StatefulSet、DaemonSet、Job、CronJob。
- 遺留：ReplicationController 概念頁仍在，標題寫 Legacy。
- 管理與標籤：Managing Workloads；Recommended Labels 不是強制。
- `configuration/overview` 現網改道 2025-11-25 部落格；Configuration 索引 2021-06-16 不再列 overview。
- CNCF：2016-03-10 孵化，2018-03-06 畢業。文件真身在 kubernetes.io。
- ConfigMap：非機密、1 MiB；不收 Secret 操作。

已知衝突見上節，不靜默覆蓋。未跑工坊或髮卡的 K8s 真機——本來就沒有已落地的叢集工作負載可驗。

## 完成標準

- [x] 定義能被非專業讀者理解
- [x] 有例子和邊界
- [x] 摘要與來源原文可區分
- [x] 衝突沒有被靜默覆蓋
- [x] `tags` 只使用 SCHEMA 已有詞
- [x] 已釋出到正式區（本波不改 `index.md` / `log.md`）

## 相關內容

- [[queries/第三批蒸餾目標]]
- [[concepts/後端架構名詞與工坊對照]]
- [[comparisons/行業架構方案何時用]]
- [[comparisons/工坊架構該上與不該上]]
- [[concepts/C4與ADR]]
- [[concepts/十二因素與CAP]]
- [[concepts/DORA五項與SLO]]
- [[concepts/功能開關與OpenFeature]]
- [[concepts/Redis與日誌佇列]]
- [[concepts/Postgres與多租戶]]
- [[concepts/可觀測與OpenTelemetry]]
- [[concepts/Prometheus與OpenMetrics]]
- [[concepts/SBOM與SLSA]]
- [[concepts/gRPC與Connect]]
- [[concepts/打包回封路徑]]
- [[concepts/入口外殼與HUD宿主]]
- [[concepts/MVU變數閉環]]
- [[50-創意庫/README]]
