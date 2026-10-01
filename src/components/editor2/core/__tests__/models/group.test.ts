import { describe, expect, it } from 'vitest'

import { createGroup } from '../../models/group'

describe('createGroup', () => {
  it('creates an empty group with an ID by default', () => {
    const group = createGroup()

    expect(group).toMatchObject({
      name: '',
      opers: [],
    })
    expect(group.id).toEqual(expect.any(String))
  })

  it('preserves supplied initial values', () => {
    const group = createGroup({ name: 'Initial group name' })

    expect(group.name).toBe('Initial group name')
    expect(group.opers).toEqual([])
    expect(group.id).toEqual(expect.any(String))
  })
})
