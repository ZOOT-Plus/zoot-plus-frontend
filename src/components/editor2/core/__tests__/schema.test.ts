import { describe, expect, it } from 'vitest'

import { CopilotDocV1 } from '../../../../models/copilot.schema'
import { operationForParsing, operationForValidation } from '../schema'

describe('operationForParsing', () => {
  it('applies defaults and accepts partially entered coordinates', () => {
    const operation = operationForParsing.parse({
      future_operation_field: true,
      actions: [
        {
          type: CopilotDocV1.Type.Click,
          location: [3, null],
          future_action_field: 'preserved',
        },
      ],
    })

    expect(operation).toMatchObject({
      minimum_required: 'v6.0.0',
      doc: {},
      opers: [],
      groups: [],
      actions: [
        {
          type: CopilotDocV1.Type.Click,
          location: [3, null],
          future_action_field: 'preserved',
        },
      ],
      future_operation_field: true,
    })
  })
})

describe('operationForValidation', () => {
  it('rejects a click action without a target', () => {
    const result = operationForValidation.safeParse({
      stage_name: 'stage-1',
      doc: { title: 'Example' },
      actions: [{ type: CopilotDocV1.Type.Click }],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'custom' })]))
    }
  })

  it('requires named actions to reference an operator or group', () => {
    const operation = {
      stage_name: 'stage-1',
      doc: { title: 'Example' },
      groups: [{ name: 'A named group' }],
      actions: [
        {
          type: CopilotDocV1.Type.Deploy,
          name: 'A named group',
          direction: CopilotDocV1.Direction.Down,
          location: [1, 2],
        },
      ],
    }

    expect(operationForValidation.safeParse(operation).success).toBe(true)

    const invalidOperation = {
      ...operation,
      actions: [{ ...operation.actions[0], name: 'Missing from the operation' }],
    }
    const result = operationForValidation.safeParse(invalidOperation)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['actions', 0, 'name'] })]),
      )
    }
  })
})
