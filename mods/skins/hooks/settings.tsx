import type { ElementTable } from 'claude-code'

import type { SkinSlot } from '../types'
import type { ToggleWord } from './command'
import { SLOTS } from './custom'
import type { Table } from './markdown'
import { footerRow, groupRow, promptRow, tableRows, toolRow } from './rows'
import type { Look } from './rows'

export type PaneUi = Pick<ElementTable<'terminal' | 'desktop'>, 'Box' | 'Text' | 'Markdown' | 'Button' | 'Input' | 'Select'>

export type SettingsModel = {
  names: readonly string[]
  editing: SkinSlot
  width: number
}

export type SettingsActions = {
  pick: (name: string) => void
  toggle: (word: ToggleWord) => void
  calm: () => void
  tables: () => void
  icons: () => void
  prompt: () => void
  words: () => void
  edit: (slot: SkinSlot) => void
  paint: (hex: string) => void
}

const SAMPLE: Table = {
  kind: 'table',
  header: ['Route', 'Limit', 'Window'],
  align: ['left', 'right', 'left'],
  rows: [
    ['/chat', '60', '1 min'],
    ['/upload', '10', '1 min'],
    ['/search', '120', '1 min'],
  ],
}

const done = { isRunning: false, isErrored: false, isInterrupted: false }

// A turn as the skin would draw it, built from the same rows the transcript uses.
function preview(look: Look, width: number) {
  const { Box } = look.ui
  const word = look.skin.done[0] ?? 'Done'

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={look.skin.palette.muted} paddingX={1}>
      {promptRow(look, 'add rate limiting to the hub api')}
      {toolRow(look, { tool: 'Bash', input: {}, ...done }, 'run', 'pnpm test --filter hub', { ms: 2140 })}
      {toolRow(look, { tool: 'Edit', input: {}, ...done }, 'write', 'apps/hub/src/server.ts', {
        ms: 380,
        added: 18,
        removed: 3,
      })}
      {groupRow(look, [
        { tool: 'Read', input: {}, ...done },
        { tool: 'Read', input: {}, ...done },
        { tool: 'Grep', input: {}, ...done },
      ])}
      {tableRows(look, SAMPLE, Math.max(20, width - 4))}
      {footerRow(look, word, 41_000, { tools: 6, added: 18, removed: 3 })}
    </Box>
  )
}

const mark = (on: boolean): string => (on ? '●' : '○')

export function settingsPane(look: Look, ui: PaneUi, model: SettingsModel, actions: SettingsActions) {
  const { Box, Text, Button, Input, Select } = ui
  const { palette } = look.skin
  const TABLE_LABEL = { on: '卡片', text: '文字', off: '關閉' } as const
  const PROMPT_LABEL = { left: '左', right: '右', plain: '簡潔' } as const
  const { prefs } = look
  const WORD = {
    rail: '側欄', shimmer: '流光', band: '狀態帶', countdown: '倒計時',
    clip: '截斷', markdown: 'Markdown', quiet: '安靜', charts: '圖表',
    math: '數學', commands: '命令', shell: '終端', highlight: '高亮',
    hints: '提示', links: '連結', copy: '複製', fold: '摺疊',
    expand: '展開', compact: '壓縮',
  } as const
  const toggle = (word: ToggleWord, hotkey: string, on: boolean) => (
    <Button
      key={`toggle-${word}`}
      label={`${WORD[word]} ${mark(on)}`}
      hotkey={hotkey}
      plain
      dimColor={!on}
      onPress={() => actions.toggle(word)}
    />
  )

  return (
    <Box flexDirection="column" rowGap={1}>
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        <Text color={palette.muted}>皮膚</Text>
        {model.names.map((name, i) => (
          <Button
            key={`skin-${name}`}
            label={name === prefs.skin ? `${name} ●` : name}
            plain
            dimColor={name !== prefs.skin}
            onPress={() => actions.pick(name)}
            {...(i < 9 ? { hotkey: String(i + 1) } : {})}
          />
        ))}
      </Box>

      {preview(look, model.width)}

      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        <Text color={palette.muted}>外觀</Text>
        {toggle('rail', 'r', prefs.rail)}
        <Button
          key="tables"
          label={`表格 ${TABLE_LABEL[prefs.tables] ?? prefs.tables}`}
          hotkey="t"
          plain
          dimColor={prefs.tables === 'off'}
          onPress={() => actions.tables()}
        />
        {toggle('shimmer', 's', prefs.shimmer)}
        {toggle('band', 'b', prefs.band)}
        {toggle('countdown', 'w', prefs.countdown)}
        {toggle('clip', 'c', prefs.clipOutput)}
        {toggle('markdown', 'm', prefs.markdown)}
        {toggle('quiet', 'q', prefs.quiet)}
        {toggle('charts', 'g', prefs.charts)}
        {toggle('math', 'x', prefs.math)}
        {toggle('commands', 'o', prefs.commands)}
        {toggle('shell', 'h', prefs.shell)}
        {toggle('highlight', 'y', prefs.highlight)}
        {toggle('hints', 'n', prefs.hints)}
        {toggle('links', 'l', prefs.links)}
        {toggle('copy', 'p', prefs.copy)}
        {toggle('fold', 'f', prefs.fold)}
        {toggle('expand', 'd', prefs.expand)}
        {toggle('compact', 'u', prefs.compact)}
        <Button key="calm" label={`靜謐 ${mark(prefs.calm !== null)}`} hotkey="k" plain dimColor={prefs.calm === null} onPress={() => actions.calm()} />
        <Button key="icons" label={`圖示 ${prefs.icons === 'unicode' ? '字元' : 'ASCII'}`} hotkey="i" plain onPress={() => actions.icons()} />
        <Button key="prompt" label={`提示符 ${PROMPT_LABEL[prefs.prompt] ?? prefs.prompt}`} hotkey="a" plain onPress={() => actions.prompt()} />
        <Button key="words" label={`文案 ${prefs.words === 'claude' ? 'Claude' : '皮膚'}`} hotkey="e" plain onPress={() => actions.words()} />
      </Box>

      <Box flexDirection="column">
        <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
          {SLOTS.map(slot => (
            <Text>
              <Text backgroundColor={palette[slot]}>{'  '}</Text>
              <Text color={slot === model.editing ? palette.fg : palette.muted} bold={slot === model.editing}>
                {` ${slot}`}
              </Text>
            </Text>
          ))}
        </Box>
        <Box flexDirection="row" columnGap={2} marginTop={1}>
          <Select
            key="slot"
            label="顏色"
            value={model.editing}
            options={SLOTS.map(slot => ({ value: slot, label: slot }))}
            onSelect={(value: string) => actions.edit(value as SkinSlot)}
          />
          <Input
            key="hex"
            label={palette[model.editing]}
            placeholder="#rrggbb"
            value=""
            submitLabel="上色"
            onSubmit={(value: string) => actions.paint(value.trim())}
          />
        </Box>
      </Box>

      <Text color={palette.muted}>
        或讓 Claude 幫你：<Text color={palette.fg}>“給我做一款像日落一樣感覺的皮膚”</Text>。按 Esc 關閉。
      </Text>
    </Box>
  )
}
