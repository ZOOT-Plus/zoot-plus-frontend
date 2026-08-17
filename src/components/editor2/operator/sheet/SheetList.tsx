import { Button, PopoverNext } from '@blueprintjs/core'

import { FC, useCallback, useEffect, useRef } from 'react'

import { OperatorBackToTop } from 'components/editor/operator/sheet/sheetOperator/toolBox/OperatorBackToTop'
import { OperatorRaritySelect } from 'components/editor/operator/sheet/sheetOperator/toolBox/OperatorRaritySelect'

import { OperatorNoData } from '../../../editor/operator/sheet/SheetNoneData'
import {
  defaultPagination,
  useOperatorFilterProvider,
} from '../../../editor/operator/sheet/sheetOperator/SheetOperatorFilterProvider'
import { ShowMore } from '../../../editor/operator/sheet/sheetOperator/ShowMore'
import { ProfClassification } from './ProfClassification'
import { SheetOperatorItem } from './SheetOperatorItem'
import { OperatorNameSearch } from './toolBox/OperatorNameSearch'
import { OperatorMutipleSelect } from './toolBox/OperatorMutipleSelect'

interface SheetListProps {}

export const SheetList: FC<SheetListProps> = () => {
  const operatorScrollRef = useRef<HTMLDivElement>(null)

  const toTop = useCallback(
    () =>
      operatorScrollRef?.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      }),
    [operatorScrollRef],
  )

  const {
    operatorFiltered: { data: operatorFilteredData },
    useProfFilterState: [{ selectedProf }],
    useNameFilterState: [{ query }],
    usePaginationFilterState: [_, setPaginationFilter],
  } = useOperatorFilterProvider()

  useEffect(() => {
    toTop()
    setPaginationFilter(defaultPagination)
  }, [query, selectedProf, setPaginationFilter, toTop])

  return (
    <div className="flex flex-col h-full">
      <div className="flex h-full w-full overflow-auto">
        <div className="grow px-1 py-4">
          {operatorFilteredData.length ? (
            <>
              <div
                key="operatorContainer"
                className="grid auto-rows-auto grid-cols-[repeat(auto-fill,minmax(128px,128px))] gap-[1px]"
                ref={operatorScrollRef}
              >
                {operatorFilteredData.map(({ name }, index) => (
                  <div className="flex items-center flex-0 w-full h-32" key={index}>
                    <SheetOperatorItem {...{ name }} />
                  </div>
                ))}
              </div>
              <ShowMore {...{ toTop }} />
            </>
          ) : (
            <OperatorNoData />
          )}
        </div>
        <div className="h-full sticky top-0 self-start shrink-0 z-10 flex flex-col items-center justify-center">
          <PopoverNext
            content={
              <div className="min-w-52">
                <OperatorNameSearch />
                <OperatorRaritySelect />
              </div>
            }
          >
            <Button minimal icon="filter-list" />
          </PopoverNext>
          <OperatorMutipleSelect />
          <OperatorBackToTop {...{ toTop }} />
        </div>
      </div>
      <ProfClassification />
    </div>
  )
}
