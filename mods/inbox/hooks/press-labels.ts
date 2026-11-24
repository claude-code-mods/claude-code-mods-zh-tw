import type { PrPress } from './pr-press'
import type { RowPress } from './presses'

export function actionId(p: RowPress | PrPress): string {
  return p.action === 'step' ? `step-${p.step}` : p.action
}

export function pressText(p: RowPress): string {
  switch (p.action) {
    case 'answer':
      return p.option
    case 'type':
      return '回覆'
    case 'issue':
      return ISSUE_LABEL
    case 'show-explanation':
      return SHOW_EXPLANATION_LABEL
    case 'step':
      return p.label
    case 'remove-goal':
      return '移除'
    case 'restore-goal':
      return '撤銷'
    case 'take-goal':
      return '設定目標'
    default:
      return capitalized(p.action)
  }
}

export function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const ISSUE_LABEL = '提交問題'
export const SHOW_EXPLANATION_LABEL = '顯示解釋'
