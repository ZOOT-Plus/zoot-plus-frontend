import { Button, Divider, H5 } from '@blueprintjs/core'

import clsx from 'clsx'
import { debounce } from 'lodash-es'
import { FC } from 'react'

import { useTranslation } from '../../../../../../i18n/i18n'
import { defaultRarityFilter, useOperatorFilterProvider } from '../SheetOperatorFilterProvider'

const selectClass = 'scale-90'

export interface OperatorRaritySelectProp {}

export const OperatorRaritySelect: FC<OperatorRaritySelectProp> = () => {
  const t = useTranslation()
  const {
    useRarityFilterState: [{ selectedRarity, reverse }, setRarityFilter],
  } = useOperatorFilterProvider()

  return (
    <>
      <div className="flex items-center">
        <H5 className="m-0 mr-1">
          {t.components.editor.operator.sheet.sheetOperator.toolbox.OperatorRaritySelect.display_by_rarity}
        </H5>
        <Button
          icon="reset"
          minimal
          title={t.components.editor.operator.sheet.sheetOperator.toolbox.OperatorRaritySelect.reset_selection}
          onClick={() => setRarityFilter(defaultRarityFilter)}
        />
      </div>
      <div className="flex my-1">
        {defaultRarityFilter.selectedRarity.map((rarityIndex) => {
          const isSelect = selectedRarity.includes(rarityIndex)
          return (
            <Button
              key={rarityIndex}
              active={isSelect}
              text={rarityIndex}
              minimal
              className={clsx(isSelect && selectClass)}
              rightIcon="star"
              onClick={debounce(
                () =>
                  setRarityFilter(({ selectedRarity, ...rest }) => ({
                    ...rest,
                    selectedRarity: isSelect
                      ? selectedRarity.filter((selectedRarityIndex) => selectedRarityIndex !== rarityIndex)
                      : [...selectedRarity, rarityIndex],
                  })),
                150,
              )}
            />
          )
        })}
      </div>
      <div className="flex">
        <Button
          minimal
          icon="arrow-up"
          className={clsx(!reverse && selectClass)}
          active={!reverse}
          onClick={() =>
            setRarityFilter((prev) => ({
              ...prev,
              reverse: false,
            }))
          }
          title={t.components.editor.operator.sheet.sheetOperator.toolbox.OperatorRaritySelect.sort_ascending}
        />
        <Button
          minimal
          icon="arrow-down"
          className={clsx(reverse && selectClass)}
          active={reverse}
          onClick={() =>
            setRarityFilter((prev) => ({
              ...prev,
              reverse: true,
            }))
          }
          title={t.components.editor.operator.sheet.sheetOperator.toolbox.OperatorRaritySelect.sort_descending}
        />
      </div>
      <Divider />
      {/* <Button text="确认" className={POPOVER2_DISMISS} onClick={submitFilter} /> */}
    </>
  )
}
