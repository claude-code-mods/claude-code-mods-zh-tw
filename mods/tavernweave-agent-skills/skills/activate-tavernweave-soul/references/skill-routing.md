# Soul skill routing

Soul never copies the engineering instructions. Select the primary TavernWeave skill, use `$consult-tavernweave-library` for the smallest guide set, and keep the chosen persona as the response/teaching layer.

| Intent | Primary skill |
| --- | --- |
| 選擇、查詢或更改新人/入門/熟練/老手引導擋位 | `$consult-tavernweave-library` and its shared guidance reference |
| 接手角色卡、二創、沿原作繼續更新 | `$tavern-card-builder` inherited-card path |
| 不知道從哪裡開始，想先體驗一次 | `$orchestrate-project-blueprint` first-result path |
| Brainstorm, total design, blueprint set, first playable/usable | `$orchestrate-project-blueprint` |
| Card concept, long material, worldbook, MVU, custom CoT | `$tavern-card-builder` |
| Component extraction or registry | `$sillytavern-card-components` |
| Component-only regex/helper update | `$sillytavern-component-update` |
| Regex fixture and render stages | `$sillytavern-render-regex-pipeline` |
| Exact event, macro, command, or API | `$sillytavern-api-reference` |
| Embedded status bar, drawer, opening, control center | `$sillytavern-embedded-ui` |
| Frontend visual review, aesthetic direction, design or motion evidence | `$consult-tavernweave-library` + `$shadcn-tailwind-ui` or `$sillytavern-embedded-ui` |
| Real host failure | `$sillytavern-runtime-debug` |
| Build, pack, release artifact | `$sillytavern-card-pipeline` |
| Security, database, extension, performance, or media | matching focused skill |
| Code audit, refactor gate, finish slice | `$code-quality-workflow` |
| 全量審查、架構審查、全量架構審查 of software/card/mixed projects | `$code-quality-workflow` with explicit scope/focus and coverage |
| 洗稿、去 AI 味、去八股 or rewriting mode management | `$rewrite-natural-prose` |
| Guide, design, motion, source, picker | `$consult-tavernweave-library` |

The complete route authority is `../consult-tavernweave-library/references/route-map.json` in the TavernWeave distribution. If unavailable, route by the installed Skill descriptions and report the degraded lookup.

靈魂殺手 does not replace the owning engineering Skill. Use the frontend rubric for frontend critique, the quality workflow for full/architecture review, the Library for the smallest relevant references, the UI Skill for implementation, runtime debug for real-host failures, and performance/security Skills when the claim crosses into those capabilities. Keep a three-point summary separate from complete findings. Active prose refinement preserves evidence, severity and gaps; its state and exit remain independent from Soul.

Soul 三席聯席也不擁有專案權威。由 `$orchestrate-project-blueprint` 維護方向預算、四態決策、First Playable、藍圖體量和下一道門；三席只從創作、工程和前端審查角度提出意見，並標明席位。
