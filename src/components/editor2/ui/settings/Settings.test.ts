import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { getDefaultStore } from 'jotai'
import { afterEach, describe, expect, it } from 'vitest'

import { createElement } from 'react'
import { i18n } from '../../../../i18n/i18n'
import { HISTORY_LIMIT_MIN, editorAtoms } from '../../core/editor-state'
import { Settings } from './Settings'

afterEach(cleanup)

const openSettings = (historyLimit: number) => {
  const store = getDefaultStore()
  store.set(editorAtoms.config, { historyLimit })
  render(createElement(Settings, {}))
  fireEvent.click(screen.getByRole('button', { name: i18n.components.editor2.Settings.title }))
  return { store, input: screen.getByDisplayValue(String(historyLimit)) as HTMLInputElement }
}

// Blueprint Dialog 的关闭按钮用的是它自带的英文文案，没有接进项目 i18n
const closeSettings = () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))

describe('history limit input', () => {
  it('keeps the value typed so far instead of clamping on every keystroke', () => {
    const { store, input } = openSettings(20)

    fireEvent.change(input, { target: { value: '1' } })
    expect(store.get(editorAtoms.config).historyLimit).toBe(1)
    expect(input.value).toBe('1')

    fireEvent.change(input, { target: { value: `${input.value}2` } })
    expect(store.get(editorAtoms.config).historyLimit).toBe(12)
    expect(input.value).toBe('12')
  })

  it('enforces the minimum when the field loses focus', () => {
    const { store, input } = openSettings(20)

    fireEvent.change(input, { target: { value: '1' } })
    fireEvent.blur(input)

    expect(store.get(editorAtoms.config).historyLimit).toBe(HISTORY_LIMIT_MIN)
  })

  it('does not write the cleared field into the config', () => {
    const { store, input } = openSettings(20)

    fireEvent.change(input, { target: { value: '' } })

    expect(input.value).toBe('')
    expect(store.get(editorAtoms.config).historyLimit).toBe(20)
  })

  it('restores the minimum when the dialog closes without a blur', () => {
    const { store, input } = openSettings(20)

    fireEvent.change(input, { target: { value: '1' } })
    closeSettings()

    expect(store.get(editorAtoms.config).historyLimit).toBe(HISTORY_LIMIT_MIN)
  })

  it('repairs a limit persisted by the version that wrote NaN', () => {
    const { store } = openSettings(HISTORY_LIMIT_MIN)
    // 旧版本把 NaN 写进过配置，JSON 往返后落在 localStorage 里就是 null
    act(() => store.set(editorAtoms.config, { historyLimit: null as unknown as number }))

    closeSettings()

    expect(store.get(editorAtoms.config).historyLimit).toBe(HISTORY_LIMIT_MIN)
  })
})
