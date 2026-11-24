import type { SoulId } from './soul-switch-types'

// Each command is a Host Front Door phrase; tests/claude-plugin.test.mjs keeps them in sync.
export const SOULS: readonly { id: SoulId; label: string; command: string }[] = [
  { id: 'atong', label: '阿瞳', command: '阿瞳助我！' },
  { id: 'mttt', label: 'MTTT.sir', command: 'MTTT.sir，拷打我！' },
  { id: 'killer', label: '靈魂殺手', command: '靈魂殺手！' },
  { id: 'ensemble', label: '三席聯席', command: '腦暴模式，Soul 聯席' },
  { id: 'off', label: '關閉', command: 'Soul 歸位' },
]

const SOUL_ALIASES: readonly [SoulId, RegExp][] = [
  ['ensemble', /腦暴模式，?\s*Soul\s*聯席|三人一起腦暴|Soul\s*三席就位/u],
  ['atong', /阿瞳助我|開啟\s*Soul\s*模式/iu],
  ['mttt', /MTTT\.sir，?拷打我/iu],
  ['killer', /靈魂殺手|強尼·銀手，接管|強尼，罵醒我|啟動 Relic 故障檢測/u],
  ['off', /Soul\s*歸位|結束\s*Soul\s*模式|^\/soul off$/iu],
]

/** The Soul a sent prompt asks for, by the Front Door's own phrases. */
export function soulOf(text: string): SoulId | null {
  const trimmed = text.trim()
  for (const [id, pattern] of SOUL_ALIASES) if (pattern.test(trimmed)) return id
  return null
}

export function soulLabel(id: SoulId): string {
  return SOULS.find(one => one.id === id)?.label ?? id
}
