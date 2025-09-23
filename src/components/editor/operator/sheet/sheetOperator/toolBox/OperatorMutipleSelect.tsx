import { Button } from '@blueprintjs/core'

import { FC, useMemo } from 'react'

import { MAX_ACTIVE_OPERATORS } from 'components/editor2/operator/constants'

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

  const { cancelAllDisabled, selectAllDisabled, existedOperatorsNames } =
    useMemo(() => {
      const existedOperatorsNames = existedOperators.map(({ name }) => name)
      return {
        cancelAllDisabled: !operatorFilteredData.some(({ name }) =>
          existedOperatorsNames.includes(name),
        ),
        selectAllDisabled:
          MAX_ACTIVE_OPERATORS - existedOperators.length <= 0 ||
          operatorFilteredData.every(({ name }) =>
            existedOperatorsNames.includes(name),
          ),
        existedOperatorsNames,
      }
    }, [existedOperators, operatorFilteredData])

  const selectAll = () => {
    let remainingSlots = MAX_ACTIVE_OPERATORS - existedOperators.length
    operatorFilteredData.forEach((item) => {
      const isExisting = existedOperatorsNames.includes(item.name)
      if (!isExisting && remainingSlots <= 0) {
        return
      }
      const success = submitOperatorInSheet(item)
      if (!isExisting && success) {
        remainingSlots -= 1
      }
    })
  }

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
        title={t.components.editor.operator.sheet.sheetOperator.toolbox.OperatorMutipleSelect.deselect_all_operators(
          { count: existedOperators.length },
        )}
        onClick={cancelAll}
      />
      <Button
        minimal
        icon="selection"
        title={t.components.editor.operator.sheet.sheetOperator.toolbox.OperatorMutipleSelect.select_all_operators(
          { count: operatorFilteredData.length },
        )}
        disabled={selectAllDisabled}
        onClick={selectAll}
      />
    </>
  )
}
