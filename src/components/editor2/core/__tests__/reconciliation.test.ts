import { describe, expect, it } from 'vitest'

import { CopilotDocV1 } from '../../../../models/copilot.schema'
import { dehydrateOperation, hydrateOperation, toEditorOperation, toMaaOperation } from '../reconciliation'
import { operationForParsing } from '../schema'

describe('operation reconciliation', () => {
  it('strips editor IDs when dehydrating and creates fresh IDs when hydrating', () => {
    const operation = operationForParsing.parse({
      opers: [{ name: 'Operator' }],
      groups: [{ name: 'Squad', opers: [{ name: 'Grouped operator' }] }],
      actions: [{ type: CopilotDocV1.Type.SpeedUp }],
    })
    const editorOperation = toEditorOperation(operation)
    const dehydrated = dehydrateOperation(editorOperation)
    const rehydrated = hydrateOperation(dehydrated)
    const ids = [
      ...rehydrated.opers.map(({ id }) => id),
      ...rehydrated.groups.flatMap(({ id, opers }) => [id, ...opers.map((operator) => operator.id)]),
      ...rehydrated.actions.map(({ id }) => id),
    ]

    expect(dehydrated.opers[0]).not.toHaveProperty('id')
    expect(dehydrated.groups[0]).not.toHaveProperty('id')
    expect(dehydrated.groups[0].opers[0]).not.toHaveProperty('id')
    expect(dehydrated.actions[0]).not.toHaveProperty('id')
    expect(new Set(ids).size).toBe(ids.length)
    expect(dehydrateOperation(rehydrated)).toEqual(dehydrated)
  })

  it('maps action delays and raises the minimum required version for newer actions', () => {
    const operation = operationForParsing.parse({
      minimum_required: 'v6.0.0',
      actions: [
        { type: CopilotDocV1.Type.SpeedUp, pre_delay: 3, post_delay: 7 },
        { type: CopilotDocV1.Type.Click, location: [1, 2], pre_delay: 4 },
      ],
    })
    const editorOperation = toEditorOperation(operation)
    const maaOperation = toMaaOperation(editorOperation)

    expect(
      editorOperation.actions.map(({ intermediatePreDelay, intermediatePostDelay }) => [
        intermediatePreDelay,
        intermediatePostDelay,
      ]),
    ).toEqual([
      [undefined, 3],
      [7, 4],
    ])
    expect(maaOperation.actions.map(({ pre_delay, post_delay }) => [pre_delay, post_delay])).toEqual([
      [3, 7],
      [4, undefined],
    ])
    expect(maaOperation.minimum_required).toBe('v6.18.0-beta.3')
  })
})
