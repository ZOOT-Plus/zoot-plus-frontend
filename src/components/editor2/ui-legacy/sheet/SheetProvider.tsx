import { FC, ReactNode, createContext, useContext } from 'react'
import { produce } from 'immer'
import { useAtomValue } from 'jotai'

import { i18n } from '../../../../i18n/i18n'
import { EditorGroup, EditorOperator, editorAtoms, useEdit } from '../../core/editor-state'
import { createGroup } from '../../core/models/group'
import { createOperator } from '../../core/models/operator'
import { Group, Operator } from './types'

export type SheetContextValue = {
  existedOperators: EditorOperator[]
  existedGroups: EditorGroup[]
  removeOperator: (index: number | number[]) => void
  removeGroup: (index: number | number[]) => void
  submitOperatorInSheet: (value: Operator) => void
  submitGroupInSheet: (value: Group) => void
}

const SheetContext = createContext<SheetContextValue>({} as SheetContextValue)

export const SheetProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const operation = useAtomValue(editorAtoms.operation)
  const edit = useEdit()

  const removeOperator: SheetContextValue['removeOperator'] = (indices) => {
    const removeIndices = new Set(Array.isArray(indices) ? indices : [indices])
    edit((get, set, skip) => {
      const previous = get(editorAtoms.operation)
      const next = produce(previous, (draft) => {
        draft.opers = draft.opers.filter((_, index) => !removeIndices.has(index))
      })
      if (next === previous) return skip
      set(editorAtoms.operation, next)
      return { action: 'remove-operator', desc: i18n.actions.editor2.delete_operator }
    })
  }

  const removeGroup: SheetContextValue['removeGroup'] = (indices) => {
    const removeIndices = new Set(Array.isArray(indices) ? indices : [indices])
    edit((get, set, skip) => {
      const previous = get(editorAtoms.operation)
      const next = produce(previous, (draft) => {
        draft.groups = draft.groups.filter((_, index) => !removeIndices.has(index))
      })
      if (next === previous) return skip
      set(editorAtoms.operation, next)
      return { action: 'remove-group', desc: i18n.actions.editor2.delete_group }
    })
  }

  const submitOperatorInSheet = (value: Operator) => {
    edit((get, set, skip) => {
      const previous = get(editorAtoms.operation)
      const next = produce(previous, (draft) => {
        const operatorId = value.id
        const index = draft.opers.findIndex((operator) => operator.id === operatorId || operator.name === value.name)
        const { id: _id, _id: _legacyId, ...fields } = value as Operator & { _id?: string }
        if (index >= 0) Object.assign(draft.opers[index], fields)
        else draft.opers.push(createOperator(fields as Omit<EditorOperator, 'id'>))
      })
      if (next === previous) return skip
      set(editorAtoms.operation, next)
      return { action: 'add-operator', desc: i18n.actions.editor2.add_operator }
    })
  }

  const submitGroupInSheet = (value: Group) => {
    edit((get, set, skip) => {
      const previous = get(editorAtoms.operation)
      const next = produce(previous, (draft) => {
        const groupId = value.id
        const index = draft.groups.findIndex((group) => (groupId && group.id === groupId) || group.name === value.name)
        const incomingOperators = value.opers || []
        const operators = incomingOperators.map((incoming) => {
          const existing =
            draft.opers.find((operator) => operator.id === incoming.id) ||
            draft.groups.flatMap((group) => group.opers).find((operator) => operator.id === incoming.id)
          if (existing) return existing
          const { id: _id, _id: _legacyId, ...fields } = incoming as Operator & { _id?: string }
          return createOperator(fields as Omit<EditorOperator, 'id'>)
        })

        if (index >= 0) {
          const group = draft.groups[index]
          group.name = value.name
          group.opers = operators
        } else {
          const { id: _id, _id: _legacyId, opers: _opers, ...fields } = value as Group & { _id?: string }
          draft.groups.push({ ...createGroup(fields), opers: operators })
          const operatorIds = new Set(operators.map(({ id }) => id))
          draft.opers = draft.opers.filter((operator) => !operatorIds.has(operator.id))
        }
      })
      if (next === previous) return skip
      set(editorAtoms.operation, next)
      return { action: 'add-group', desc: i18n.actions.editor2.add_group }
    })
  }

  return (
    <SheetContext.Provider
      value={{
        existedOperators: operation.opers,
        existedGroups: operation.groups,
        removeOperator,
        removeGroup,
        submitOperatorInSheet,
        submitGroupInSheet,
      }}
    >
      {children}
    </SheetContext.Provider>
  )
}

export const useSheet = () => useContext(SheetContext)
