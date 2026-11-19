import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { atom, getDefaultStore } from 'jotai'
import { afterEach, describe, expect, it } from 'vitest'

import { createElement } from 'react'
import { CopilotDocV1 } from '../../../../models/copilot.schema'
import { createAction } from '../../core/models/action'
import { ActionLinker } from './ActionLinker'

afterEach(cleanup)

const renderCondition = () => {
  const actionAtom = atom(createAction({ type: CopilotDocV1.Type.Click, costs: 10 }))
  render(createElement(ActionLinker, { actionAtom }))
  return { store: getDefaultStore(), actionAtom, input: screen.getByRole('spinbutton') as HTMLInputElement }
}

describe('condition value input', () => {
  it('keeps a cleared condition empty and writes the fallback on blur', () => {
    const { store, actionAtom, input } = renderCondition()
    expect(input.value).toBe('10')

    fireEvent.change(input, { target: { value: '' } })

    // 字段保持为空（节点仍在），动作里的旧值不被中间态覆盖
    expect(input.value).toBe('')
    expect(store.get(actionAtom).costs).toBe(10)

    fireEvent.blur(input)

    expect(store.get(actionAtom).costs).toBe(0)
  })

  it('writes the replacement value typed after clearing', () => {
    const { store, actionAtom, input } = renderCondition()

    fireEvent.change(input, { target: { value: '' } })
    fireEvent.change(input, { target: { value: '7' } })

    expect(input.value).toBe('7')
    expect(store.get(actionAtom).costs).toBe(7)
  })

  it('commits the cleared fallback on Enter as well', () => {
    const { store, actionAtom, input } = renderCondition()

    fireEvent.change(input, { target: { value: '' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(store.get(actionAtom).costs).toBe(0)
  })

  it('does not overwrite a value changed externally while empty', () => {
    const { store, actionAtom, input } = renderCondition()

    fireEvent.change(input, { target: { value: '' } })
    // 模拟清空期间发生的撤销/外部修改
    act(() => store.set(actionAtom, (action) => ({ ...action, costs: 5 })))
    fireEvent.blur(input)

    expect(store.get(actionAtom).costs).toBe(5)
  })
})
