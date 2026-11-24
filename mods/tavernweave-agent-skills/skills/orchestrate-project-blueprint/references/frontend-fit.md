# 前端承載面適配門

先判斷任務需要的是資訊表達、輕量互動、同層前端、獨立前端，還是混合結構。前端形態必須服務核心迴圈。

輸出契約：

```yaml
recommended: text-first | lightweight-display | same-floor | independent-ui | hybrid
fit: suitable | conditional | not-recommended
reason: 為什麼適合或不適合
fallback: 更輕、更穩的替代方案
reopenWhen: 哪些條件滿足後可以重新評估
driverOverride: false
```

## 建議勸退的訊號

- 主要價值是文字、規則或短對話，獨立前端沒有新的可驗證互動價值；
- 同層 DOM/iframe 生命週期、移動端尺寸或宿主許可權無法穩定承載；
- 視覺外殼將吃掉首版大部分預算，卻不改善核心迴圈；
- 狀態源不明確，介面只能展示偽狀態；
- 使用者已有更穩定的宿主元件，重寫只會增加維護面。

`not-recommended` 時必須明確說“不建議強上”，並給 fallback。若使用者仍堅持，記錄 `driverOverride: true`，同時強制 `prototypeGateRequired: true` 與 `realHostGateRequired: true`；靜態截圖不能關閉真實宿主門。
