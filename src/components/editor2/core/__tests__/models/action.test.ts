import { describe, expect, it } from 'vitest'

import { CopilotDocV1 } from '../../../../../models/copilot.schema'
import { createAction } from '../../models/action'

describe('createAction', () => {
  it('assigns an ID and preserves supplied action values', () => {
    const initialValues = {
      type: CopilotDocV1.Type.Click,
      costs: 7,
      doc: 'Initial action note',
      location: [2, 3],
    }
    const action = createAction(initialValues)

    expect(action.id).toEqual(expect.any(String))
    expect(action).toMatchObject({
      type: CopilotDocV1.Type.Click,
      costs: 7,
      doc: 'Initial action note',
      location: [2, 3],
    })
  })

  it('defaults new skill usage actions to ready-to-use', () => {
    const action = createAction({
      type: CopilotDocV1.Type.SkillUsage,
    })

    expect(action).toMatchObject({
      type: CopilotDocV1.Type.SkillUsage,
      skillUsage: CopilotDocV1.SkillUsageType.ReadyToUse,
    })
  })

  it('preserves an explicitly supplied skill usage mode', () => {
    const initialValues = {
      type: CopilotDocV1.Type.SkillUsage,
      skillUsage: CopilotDocV1.SkillUsageType.None,
    }
    const action = createAction(initialValues)

    expect(action).toMatchObject({
      type: CopilotDocV1.Type.SkillUsage,
      skillUsage: CopilotDocV1.SkillUsageType.None,
    })
  })
})
