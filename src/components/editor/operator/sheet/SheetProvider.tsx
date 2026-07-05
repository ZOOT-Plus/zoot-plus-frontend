import { FC, ReactNode, createContext, useContext } from 'react'
import { UseFieldArrayRemove } from 'react-hook-form'

import { EditorPerformerGroupProps } from '../EditorPerformerGroup'
import { EditorPerformerOperatorProps } from '../EditorPerformerOperator'
import { Group, Operator } from '../EditorSheet'

export interface SheetProviderProp {
  submitOperator: EditorPerformerOperatorProps['submit']
  existedOperators: Operator[]
  existedGroups: Group[]
  removeOperator: UseFieldArrayRemove
  submitGroup: EditorPerformerGroupProps['submit']
  removeGroup: UseFieldArrayRemove
  children: ReactNode
}

export type SheetContextValue = {
  existedOperators: SheetProviderProp['existedOperators']
  existedGroups: SheetProviderProp['existedGroups']
  removeOperator: SheetProviderProp['removeOperator']
  removeGroup: SheetProviderProp['removeGroup']
  submitOperatorInSheet: (value: Operator) => void
  submitGroupInSheet: (value: Group) => void
}

const SheetContext = createContext<SheetContextValue>({} as SheetContextValue)

export const SheetProvider: FC<SheetProviderProp> = ({ children, submitGroup, submitOperator, ...restValueField }) => (
  <SheetContext.Provider
    value={{
      submitOperatorInSheet: (value) => submitOperator(value, undefined, true),
      submitGroupInSheet: (value) => submitGroup(value, undefined, true),
      ...restValueField,
    }}
  >
    {children}
  </SheetContext.Provider>
)

export const useSheet = () => useContext(SheetContext)
