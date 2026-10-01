import { H6 } from '@blueprintjs/core'

import { FC, useEffect } from 'react'

import { useTranslation } from '../../../../../i18n/i18n'
import { defaultPagination, useOperatorFilterProvider } from './SheetOperatorFilterProvider'

export interface ShowMoreProp {
  toTop: () => void
}

export const ShowMore: FC<ShowMoreProp> = ({ toTop }) => {
  const t = useTranslation()
  const {
    operatorFiltered: {
      meta: { dataTotal },
    },
    usePaginationFilterState: [{ current, size }, setPagination],
  } = useOperatorFilterProvider()

  const lastIndex = current * size

  useEffect(() => {
    if (current === 1) toTop()
  }, [current, toTop])

  return (
    <div className="flex items-center justify-center pt-3 cursor-default">
      {lastIndex >= dataTotal ? (
        <>
          <H6>
            {t.components.editor.operator.sheet.sheetOperator.ShowMore.showing_all_operators({ total: dataTotal })}
          </H6>
          {dataTotal > size && (
            <H6
              className="ml-1 cursor-pointer text-sm text-gray-500 hover:text-inherit hover:underline"
              onClick={() => setPagination(defaultPagination)}
            >
              {t.components.editor.operator.sheet.sheetOperator.ShowMore.collapse}
            </H6>
          )}
        </>
      ) : (
        <H6
          className="cursor-pointer mx-auto text-sm text-gray-500 hover:text-inherit hover:underline"
          onClick={() =>
            setPagination(({ current, ...rest }) => ({
              ...rest,
              current: current + 1,
            }))
          }
        >
          {t.components.editor.operator.sheet.sheetOperator.ShowMore.show_more({
            remaining: dataTotal - lastIndex,
          })}
        </H6>
      )}
    </div>
  )
}
