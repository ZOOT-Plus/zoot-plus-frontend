import { act, cleanup, renderHook } from '@testing-library/react'
import { createStore } from 'jotai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const toaster = vi.hoisted(() => ({ show: vi.fn() }))

vi.mock('../../../../Toaster', () => ({
  AppToaster: toaster,
}))

import { createStoreWrapper } from '../../../../../../tests/jotai'
import { CopilotDocV1 } from '../../../../../models/copilot.schema'
import { findOperatorById, identityFromInfo } from '../../../../../models/operator'
import { editorAtoms, type EditorGroup, type EditorOperator } from '../../editor-state'
import { createOperator, useOperatorControl } from '../../models/operator'

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(cleanup)

describe('createOperator', () => {
  it('preserves initial values and fills missing rarity-based requirements', () => {
    const operatorInfo = findOperatorById('char_002_amiya')
    expect(operatorInfo?.rarity).toBe(5)
    const initialValues = {
      ...identityFromInfo(operatorInfo!),
      skill: 2,
      requirements: { level: 50 },
    }

    const operator = createOperator(initialValues)

    expect(operator.id).toEqual(expect.any(String))
    expect(operator).toMatchObject({
      ...initialValues,
      requirements: {
        elite: 2,
        level: 50,
        skillLevel: 7,
        potentiality: 1,
        module: CopilotDocV1.Module.Default,
      },
    })
  })

  it('can skip applying default requirements', () => {
    const operatorInfo = findOperatorById('char_002_amiya')
    const initialValues = {
      ...identityFromInfo(operatorInfo!),
      requirements: { level: 50 },
    }

    const operator = createOperator(initialValues, false)

    expect(operator.requirements).toEqual({ level: 50 })
  })
})

describe('useOperatorControl', () => {
  it('adds operators globally and to a target group', () => {
    const store = createStore()
    const group: EditorGroup = { id: 'group-1', name: 'Squad', opers: [] }
    store.set(editorAtoms.groups, [group])
    const { result } = renderHook(() => useOperatorControl(), {
      wrapper: createStoreWrapper(store),
    })

    act(() => result.current.addOperatorByName('New global operator'))
    expect(store.get(editorAtoms.operators).map(({ name }) => name)).toEqual(['New global operator'])

    const groupedOperator: EditorOperator = { id: 'grouped-operator', name: 'Grouped operator' }
    act(() => result.current.addOperator(groupedOperator, group.id))

    expect(store.get(editorAtoms.groups)[0].opers).toEqual([groupedOperator])
    expect(toaster.show).not.toHaveBeenCalled()
  })

  it('rejects duplicate operators and shows an error toast', () => {
    const store = createStore()
    store.set(editorAtoms.operators, [{ id: 'existing-operator', name: 'Duplicate operator' }])
    const { result } = renderHook(() => useOperatorControl(), {
      wrapper: createStoreWrapper(store),
    })

    act(() => result.current.addOperator({ id: 'new-operator', name: 'Duplicate operator' }))

    expect(store.get(editorAtoms.operators)).toHaveLength(1)
    expect(toaster.show).toHaveBeenCalledWith(expect.objectContaining({ intent: 'danger' }))
  })
})
