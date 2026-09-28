import { DragEndEvent } from '@dnd-kit/core'
import { useAtomCallback } from 'jotai/utils'
import { useCallback } from 'react'

import { defaults, uniqueId } from 'lodash-es'
import { SetRequired } from 'type-fest'
import { i18n } from '../../../../i18n/i18n'
import { CopilotDocV1 } from '../../../../models/copilot.schema'
import { EditorAction, editorAtoms, useEdit } from '../editor-state'

export function createAction(initialValues: SetRequired<Partial<Omit<EditorAction, 'id'>>, 'type'>) {
  const action: EditorAction = defaults({ id: uniqueId() }, initialValues)
  if (action.type === CopilotDocV1.Type.SkillUsage && action.skillUsage === undefined) {
    action.skillUsage = CopilotDocV1.SkillUsageType.ReadyToUse
  }
  return action
}

export function useActionDragEnd() {
  const edit = useEdit()
  return useAtomCallback(
    useCallback(
      (get, set, { active, over }: DragEndEvent) => {
        const actions = get(editorAtoms.actions)
        if (over && active.id !== over.id) {
          const oldIndex = actions.findIndex((action) => action.id === active.id)
          const newIndex = actions.findIndex((action) => action.id === over.id)
          if (oldIndex !== -1 && newIndex !== -1) {
            const actionAtoms = get(editorAtoms.actionAtoms)
            edit(() => {
              const beforeIndex = oldIndex < newIndex ? newIndex + 1 : newIndex
              set(editorAtoms.actionAtoms, {
                type: 'move',
                atom: actionAtoms[oldIndex],
                before: actionAtoms[beforeIndex],
              })
              return {
                action: 'move-action',
                desc: i18n.components.editor2.ActionEditor.move_action,
              }
            })
          }
        }
      },
      [edit],
    ),
  )
}
