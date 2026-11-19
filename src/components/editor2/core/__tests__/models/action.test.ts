import { describe, expect, it } from 'vitest'

import { CopilotDocV1 } from '../../../../../models/copilot.schema'
import { createAction, updateCoordinate } from '../../models/action'

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

describe('updateCoordinate', () => {
  it('writes a cleared axis as undefined and keeps the other axis', () => {
    expect(updateCoordinate([5, 7], 0, NaN, 2)).toEqual([undefined, 7])
  })

  it('returns undefined once every axis is empty', () => {
    expect(updateCoordinate([5], 0, NaN, 2)).toBeUndefined()
  })

  it('treats a null left over from the import path as empty', () => {
    // 导入与序列化链路的 JSON 往返会把 undefined 变成 null，全空时必须能删掉整个字段
    expect(updateCoordinate([5, null], 0, NaN, 2)).toBeUndefined()
    expect(updateCoordinate([null, 5], 1, NaN, 2)).toBeUndefined()
  })

  it('normalizes an untouched null axis to undefined', () => {
    expect(updateCoordinate([null, 4], 0, 3, 2)).toEqual([3, 4])
  })

  it('grows a tuple that is shorter than the field', () => {
    expect(updateCoordinate([2], 3, 9, 4)).toEqual([2, undefined, undefined, 9])
  })
})
