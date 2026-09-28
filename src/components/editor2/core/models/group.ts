import { defaults, uniqueId } from 'lodash-es'
import { EditorGroup } from '../editor-state'

export function createGroup(initialValues: Partial<Omit<EditorGroup, 'id' | 'opers'>> = {}): EditorGroup {
  const group: EditorGroup = defaults({ id: uniqueId() }, initialValues, {
    name: '',
    opers: [],
  })
  return group
}
