import { Button, NonIdealState } from '@blueprintjs/core'

import { UseOperationSetsParams, useOperationSetSearch } from 'apis/operation-set'
import { useAtomValue } from 'jotai'
import { ComponentType, ReactNode, useEffect } from 'react'

import { neoLayoutAtom } from 'store/pref'

import { useTranslation } from '../i18n/i18n'
import { NeoOperationSetCard, OperationSetCard } from './OperationSetCard'
import { withSuspensable } from './Suspensable'

interface OperationSetListProps extends UseOperationSetsParams {
  onUpdate?: (params: { total: number }) => void
}

export const OperationSetList: ComponentType<OperationSetListProps> = withSuspensable(
  ({ onUpdate, ...params }) => {
    const t = useTranslation()
    const neoLayout = useAtomValue(neoLayoutAtom)

    const { operationSets, total, setSize, isValidating, isReachingEnd } = useOperationSetSearch({
      ...params,
      suspense: true,
    })

    // make TS happy: we got Suspense out there
    if (!operationSets) throw new Error('unreachable')

    useEffect(() => {
      onUpdate?.({ total })
    }, [total, onUpdate])

    const items: ReactNode = neoLayout ? (
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr)',
        }}
      >
        {operationSets?.map((operationSet) => (
          <NeoOperationSetCard operationSet={operationSet} key={operationSet.id} />
        ))}
      </div>
    ) : (
      operationSets.map((operationSet) => <OperationSetCard operationSet={operationSet} key={operationSet.id} />)
    )

    return (
      <>
        {items}

        {isReachingEnd && operationSets.length === 0 && (
          <NonIdealState
            icon="slash"
            title={t.components.OperationSetList.no_job_sets_found}
            description={t.components.OperationSetList.sad_face}
          />
        )}

        {isReachingEnd && operationSets.length !== 0 && (
          <div className="mt-8 w-full tracking-wider text-center select-none text-slate-500">
            {t.components.OperationSetList.reached_bottom}
          </div>
        )}

        {!isReachingEnd && (
          <Button
            loading={isValidating}
            text={t.components.OperationSetList.load_more}
            icon="more"
            className="mt-2"
            large
            fill
            onClick={() => setSize((size) => size + 1)}
          />
        )}
      </>
    )
  },
  {
    retryOnChange: ['keyword'],
  },
)
