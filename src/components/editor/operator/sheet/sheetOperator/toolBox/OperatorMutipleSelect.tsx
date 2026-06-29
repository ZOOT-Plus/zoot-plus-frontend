import { Button } from '@blueprintjs/core'

import { FC, useMemo } from 'react'

import { useTranslation } from '../../../../../../i18n/i18n'
import { useSheet } from '../../SheetProvider'
import { useOperatorFilterProvider } from '../SheetOperatorFilterProvider'

export interface OperatorMutipleSelectProp {}

export const OperatorMutipleSelect: FC<OperatorMutipleSelectProp> = () => {
  const t = useTranslation()
  const {
    operatorFiltered: { data: operatorFilteredData },
  } = useOperatorFilterProvider()
  const { existedOperators, submitOperatorInSheet, removeOperator } = useSheet()

  const { cancelAllDisabled, selectAllDisabled } = useMemo(() => {
    const existedOperatorsNames = existedOperators.map(({ name }) => name)
    return {
      cancelAllDisabled: !operatorFilteredData.some(({ name }) => existedOperatorsNames.includes(name)),
      selectAllDisabled: operatorFilteredData.every(({ name }) => existedOperatorsNames.includes(name)),
    }
  }, [existedOperators, operatorFilteredData])

  const selectAll = () =>
    operatorFilteredData.forEach((item) => {
      submitOperatorInSheet(item)
    })

  const cancelAll = () => {
    const deleteIndexList: number[] = []
    operatorFilteredData.forEach(({ name }) => {
      const index = existedOperators.findIndex((item) => item.name === name)
      if (index !== -1) deleteIndexList.push(index)
    })
    removeOperator(deleteIndexList)
  }

  return (
    <>
      <Button
        minimal
        icon="circle"
        disabled={cancelAllDisabled}
        title={t.components.editor.operator.sheet.sheetOperator.toolbox.OperatorMutipleSelect.deselect_all_operators({
          count: existedOperators.length,
        })}
        onClick={cancelAll}
      />
      <Button
        minimal
        icon="selection"
        title={t.components.editor.operator.sheet.sheetOperator.toolbox.OperatorMutipleSelect.select_all_operators({
          count: operatorFilteredData.length,
        })}
        disabled={selectAllDisabled}
        onClick={selectAll}
      />
    </>
  )
}
