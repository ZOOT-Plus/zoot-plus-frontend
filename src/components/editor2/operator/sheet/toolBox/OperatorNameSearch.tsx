import { Button, Divider, H5, InputGroup } from '@blueprintjs/core'

import { debounce } from 'lodash-es'
import { FC, useEffect, useMemo, useState } from 'react'

import { useTranslation } from '../../../../../i18n/i18n'
import {
  defaultNameFilter,
  useOperatorFilterProvider,
} from '../../../../editor/operator/sheet/sheetOperator/SheetOperatorFilterProvider'

export interface OperatorNameSearchProp {}

export const OperatorNameSearch: FC<OperatorNameSearchProp> = () => {
  const t = useTranslation()
  const {
    useNameFilterState: [{ query }, setNameFilter],
  } = useOperatorFilterProvider()
  const [inputQuery, setInputQuery] = useState(query)

  const updateNameFilter = useMemo(
    () =>
      debounce((query: string) => {
        setNameFilter({ query })
      }, 300),
    [setNameFilter],
  )

  useEffect(() => {
    setInputQuery(query)
  }, [query])

  useEffect(() => () => updateNameFilter.cancel(), [updateNameFilter])

  const resetNameFilter = () => {
    updateNameFilter.cancel()
    setInputQuery(defaultNameFilter.query)
    setNameFilter(defaultNameFilter)
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <H5 className="m-0 text-sm">{t.components.editor2.OperatorSelect.search_operator}</H5>
          <Button icon="reset" minimal small onClick={resetNameFilter} />
        </div>
        <InputGroup
          className="!w-44"
          fill
          placeholder={t.components.editor2.OperatorSelect.search_operator}
          value={inputQuery}
          onChange={(e) => {
            const nextQuery = e.currentTarget.value
            setInputQuery(nextQuery)
            updateNameFilter(nextQuery)
          }}
        />
      </div>
      <Divider />
    </>
  )
}
