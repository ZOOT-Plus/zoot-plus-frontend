import { Button, NonIdealState, Spinner } from '@blueprintjs/core'

import { getOperationsByIds } from 'apis/operation'
import { UseOperationSetsParams, useOperationSetSearch } from 'apis/operation-set'
import { useAtomValue } from 'jotai'
import { ComponentType, ReactNode, useEffect, useMemo, useRef } from 'react'
import useSWR from 'swr'

import { neoLayoutAtom } from 'store/pref'

import { useTranslation } from '../i18n/i18n'
import { OperatorMatcherFilter, getOperationSetMatchResult } from '../models/operatorMatcher'
import { NeoOperationSetCard, OperationSetCard } from './OperationSetCard'
import { withSuspensable } from './Suspensable'

interface OperationSetListProps extends UseOperationSetsParams {
  onUpdate?: (params: { total: number }) => void
  operatorMatcher?: OperatorMatcherFilter
}

export const OperationSetList: ComponentType<OperationSetListProps> = withSuspensable(
  ({ onUpdate, operatorMatcher, ...params }) => {
    const t = useTranslation()
    const neoLayout = useAtomValue(neoLayoutAtom)

    const { operationSets, total, setSize, isValidating, isReachingEnd } = useOperationSetSearch({
      ...params,
      suspense: true,
    })

    // make TS happy: we got Suspense out there
    if (!operationSets) throw new Error('unreachable')

    const operationIds = useMemo(
      () => Array.from(new Set(operationSets.flatMap((operationSet) => operationSet.copilotIds))),
      [operationSets],
    )
    const {
      data: operations,
      error: matchingError,
      isLoading: isMatching,
    } = useSWR(
      operatorMatcher ? (['operation-set-matcher-operations', operationIds] as const) : null,
      ([, ids]) => getOperationsByIds(ids),
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      },
    )

    if (matchingError) throw matchingError

    const visibleOperationSets = useMemo(() => {
      if (!operatorMatcher) {
        return operationSets
      }
      if (!operations) {
        return []
      }

      const operationsById = new Map(operations.map((operation) => [operation.id, operation]))

      return operationSets.filter((operationSet) => {
        const match = getOperationSetMatchResult(
          operationSet.copilotIds,
          operationsById,
          operatorMatcher.ownedOperators,
        )
        return operatorMatcher.modes.includes(match.mode)
      })
    }, [operationSets, operations, operatorMatcher])
    const autoLoadCount = useRef(0)
    const matcherQueryKey = JSON.stringify({
      keyword: params.keyword,
      creatorId: params.creatorId,
      onlyFollowing: params.onlyFollowing,
      descending: params.descending,
    })

    useEffect(() => {
      onUpdate?.({ total })
    }, [total, onUpdate])

    useEffect(() => {
      autoLoadCount.current = 0
    }, [operatorMatcher, matcherQueryKey])

    useEffect(() => {
      if (
        !operatorMatcher ||
        isMatching ||
        visibleOperationSets.length > 0 ||
        isReachingEnd ||
        isValidating ||
        autoLoadCount.current >= 2
      ) {
        return
      }

      autoLoadCount.current += 1
      void setSize((size) => size + 1)
    }, [isMatching, isReachingEnd, isValidating, operatorMatcher, setSize, visibleOperationSets.length])

    const items: ReactNode = neoLayout ? (
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr)',
        }}
      >
        {visibleOperationSets.map((operationSet) => (
          <NeoOperationSetCard operationSet={operationSet} key={operationSet.id} />
        ))}
      </div>
    ) : (
      visibleOperationSets.map((operationSet) => <OperationSetCard operationSet={operationSet} key={operationSet.id} />)
    )

    return (
      <>
        {isMatching && (
          <div className="flex justify-center py-6">
            <Spinner size={20} />
          </div>
        )}
        {items}

        {isReachingEnd && !isMatching && visibleOperationSets.length === 0 && (
          <NonIdealState
            icon="slash"
            title={t.components.OperationSetList.no_job_sets_found}
            description={t.components.OperationSetList.sad_face}
          />
        )}

        {isReachingEnd && !isMatching && visibleOperationSets.length !== 0 && (
          <div className="mt-8 w-full tracking-wider text-center select-none text-slate-500">
            {t.components.OperationSetList.reached_bottom}
          </div>
        )}

        {!isReachingEnd && (
          <Button
            disabled={isMatching}
            loading={isValidating || isMatching}
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
    retryOnChange: ['keyword', 'operatorMatcher'],
  },
)
