import { Button } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

import { FC, useCallback, useEffect, useRef } from 'react'

import { OperatorBackToTop } from 'components/editor/operator/sheet/sheetOperator/toolBox/OperatorBackToTop'
import { OperatorMutipleSelect } from 'components/editor/operator/sheet/sheetOperator/toolBox/OperatorMutipleSelect'
import { OperatorRaritySelect } from 'components/editor/operator/sheet/sheetOperator/toolBox/OperatorRaritySelect'

import { OperatorNoData } from '../../../editor/operator/sheet/SheetNoneData'
import {
  defaultPagination,
  useOperatorFilterProvider,
} from '../../../editor/operator/sheet/sheetOperator/SheetOperatorFilterProvider'
import { SheetOperatorItem } from '../../../editor/operator/sheet/sheetOperator/SheetOperatorItem'
import { ShowMore } from '../../../editor/operator/sheet/sheetOperator/ShowMore'
import { ProfClassification } from './ProfClassification'

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
    usePaginationFilterState: [_, setPaginationFilter],
  } = useOperatorFilterProvider()

  useEffect(() => {
    toTop()
    setPaginationFilter(defaultPagination)
  }, [selectedProf, setPaginationFilter, toTop])

  return (
    <div className="flex flex-col h-full">
      <div className="flex h-full w-full overflow-auto">
        <div className="grow px-1 py-4">
          {operatorFilteredData.length ? (
            <>
              <div
                key="operatorContainer"
                className="grid auto-rows-auto grid-cols-[repeat(auto-fit,minmax(128px,1fr))]"
                ref={operatorScrollRef}
              >
                {operatorFilteredData.map(({ name }, index) => (
                  <div
                    className="flex items-center flex-0 w-full h-32"
                    key={index}
                  >
                    <SheetOperatorItem
                      name={name}
                      showSkillTrigger={false}
                    />
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
          <Popover2
            // 弹层通过 Portal 提升层级，避免被全屏遮罩覆盖
            usePortal={true}
            popoverClassName="z-[1600]"
            portalClassName="z-[1600]"
            content={
              <>
                <OperatorRaritySelect />
              </>
            }
          >
            <Button minimal icon="filter-list" />
          </Popover2>
          <OperatorMutipleSelect />
          <OperatorBackToTop {...{ toTop }} />
        </div>
      </div>
      <ProfClassification />
    </div>
  )
}
