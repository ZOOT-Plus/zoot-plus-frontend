import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  it('keeps the typed value local until the field loses focus', () => {
    const { store, input } = openSettings(20)

    fireEvent.change(input, { target: { value: '1' } })
    expect(input.value).toBe('1')
    expect(store.get(editorAtoms.config).historyLimit).toBe(20)

    fireEvent.change(input, { target: { value: '15' } })
    expect(input.value).toBe('15')
    expect(store.get(editorAtoms.config).historyLimit).toBe(20)

    fireEvent.blur(input)
    expect(input.value).toBe('15')
    expect(store.get(editorAtoms.config).historyLimit).toBe(15)
  })

  it('enforces the minimum when the field loses focus', () => {
    const { store, input } = openSettings(20)

    fireEvent.change(input, { target: { value: '1' } })
    fireEvent.blur(input)

    expect(input.value).toBe(String(HISTORY_LIMIT_MIN))
    expect(store.get(editorAtoms.config).historyLimit).toBe(HISTORY_LIMIT_MIN)
  })

  it('does not write a cleared field into the config', () => {
    const { store, input } = openSettings(20)

    fireEvent.change(input, { target: { value: '' } })
    expect(input.value).toBe('')
    expect(store.get(editorAtoms.config).historyLimit).toBe(20)

    // 失焦后字段恢复显示当前配置值
    fireEvent.blur(input)
    expect(input.value).toBe('20')
    expect(store.get(editorAtoms.config).historyLimit).toBe(20)
  })

  it('commits the drafted value when the dialog closes without a blur', () => {
    const { store, input } = openSettings(20)

    fireEvent.change(input, { target: { value: '1' } })
    closeSettings()

    expect(store.get(editorAtoms.config).historyLimit).toBe(HISTORY_LIMIT_MIN)
  })
})
