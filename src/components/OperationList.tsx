import { Button, Callout, NonIdealState, Tooltip } from '@blueprintjs/core'

import { UseOperationsParams, useOperations } from 'apis/operation'
import { useAtomValue } from 'jotai'
import { ComponentType, ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { neoLayoutAtom } from 'store/pref'

import { useTranslation } from '../i18n/i18n'
import { OperatorMatcherFilter, getOperationMatchResult } from '../models/operatorMatcher'
import { Operation } from '../models/operation'
import { NeoOperationCard, OperationCard } from './OperationCard'
import { withSuspensable } from './Suspensable'
import { AddToOperationSetButton } from './operation-set/AddToOperationSet'
import { OperationsData } from 'apis/operation'

interface OperationListProps extends UseOperationsParams {
  multiselect?: boolean
  onUpdate?: (params: { total: number }) => void
  operatorMatcher?: OperatorMatcherFilter
}

export const OperationList: ComponentType<OperationListProps> = withSuspensable(
  ({ multiselect, onUpdate, operatorMatcher, ...params }) => {
    const data = useOperations({
      ...params,
      suspense: true,
    })

    return (
      <OperationListView multiselect={multiselect} onUpdate={onUpdate} operatorMatcher={operatorMatcher} data={data} />
    )
  },
  {
    retryOnChange: ['orderBy', 'keyword', 'levelKeyword', 'operator', 'operatorMatcher'],
  },
)

export function OperationListView({
  multiselect,
  onUpdate,
  operatorMatcher,
  data,
}: {
  multiselect?: boolean
  onUpdate?: (params: { total: number }) => void
  operatorMatcher?: OperatorMatcherFilter
  data: OperationsData
}) {
  const t = useTranslation()
  const neoLayout = useAtomValue(neoLayoutAtom)

  const { operations, total, setSize, isValidating, isReachingEnd } = data

  // make TS happy: we got Suspense out there
  if (!operations) throw new Error('unreachable')

  const resolvedOperations = useMemo(
    () =>
      operations.map((operation) => ({
        operation,
        match: operatorMatcher ? getOperationMatchResult(operation, operatorMatcher.ownedOperators) : undefined,
      })),
    [operations, operatorMatcher],
  )
  const visibleOperations = useMemo(
    () =>
      operatorMatcher
        ? resolvedOperations.filter(({ match }) => match && operatorMatcher.modes.includes(match.mode))
        : resolvedOperations,
    [operatorMatcher, resolvedOperations],
  )
  const autoLoadCount = useRef(0)

  useEffect(() => {
    onUpdate?.({ total })
  }, [total, onUpdate])

  useEffect(() => {
    autoLoadCount.current = 0
  }, [operatorMatcher])

  useEffect(() => {
    if (
      !operatorMatcher ||
      visibleOperations.length > 0 ||
      isReachingEnd ||
      isValidating ||
      autoLoadCount.current >= 2
    ) {
      return
    }

    autoLoadCount.current += 1
    void setSize((size) => size + 1)
  }, [isReachingEnd, isValidating, operatorMatcher, setSize, visibleOperations.length])

  const [selectedOperations, setSelectedOperations] = useState<Operation[]>([])
  const updateSelection = (add: Operation[], remove: Operation[]) => {
    setSelectedOperations((old) => {
      return [
        ...old.filter((op) => !remove.some((o) => o.id === op.id)),
        ...add.filter((op) => !old.some((o) => o.id === op.id)),
      ]
    })
  }
  const onSelect = (operation: Operation, selected: boolean) => {
    if (selected) {
      updateSelection([operation], [])
    } else {
      updateSelection([], [operation])
    }
  }

  const items: ReactNode = neoLayout ? (
    <ul
      className="grid gap-4 items-stretch"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr)',
      }}
    >
      {visibleOperations.map(({ operation }) => (
        <NeoOperationCard
          operation={operation}
          key={operation.id}
          selectable={multiselect}
          selected={selectedOperations?.some((op) => op.id === operation.id)}
          onSelect={onSelect}
        />
      ))}
    </ul>
  ) : (
    <ul>
      {visibleOperations.map(({ operation }) => (
        <OperationCard operation={operation} key={operation.id} />
      ))}
    </ul>
  )

  return (
    <>
      {multiselect && (
        <Callout className="mb-4 p-0 select-none">
          <details>
            <summary className="px-2 py-4 cursor-pointer hover:bg-zinc-500 hover:bg-opacity-5">
              {t.components.OperationList.selected_jobs({
                count: selectedOperations.length,
              })}
            </summary>
            <div className="p-2 flex flex-wrap gap-1">
              {selectedOperations.map((operation) => (
                <Button
                  key={operation.id}
                  small
                  minimal
                  outlined
                  rightIcon="cross"
                  onClick={() => updateSelection([], [operation])}
                >
                  {operation.parsedContent.doc.title}
                </Button>
              ))}
            </div>
          </details>
          <div className="absolute top-2 right-2 flex">
            <Tooltip content={t.components.OperationList.only_loaded_items} placement="top">
              <Button
                minimal
                icon="tick"
                onClick={() =>
                  updateSelection(
                    visibleOperations.map(({ operation }) => operation),
                    [],
                  )
                }
              >
                {t.components.OperationList.select_all}
              </Button>
            </Tooltip>
            <Button minimal intent="danger" icon="trash" onClick={() => setSelectedOperations([])}>
              {t.components.OperationList.clear}
            </Button>
            <AddToOperationSetButton
              minimal
              outlined
              intent="primary"
              icon="add-to-folder"
              className="ml-2"
              disabled={selectedOperations.length === 0}
              operationIds={selectedOperations.map((op) => op.id)}
            >
              {t.components.OperationList.add_to_job_set}
            </AddToOperationSetButton>
          </div>
        </Callout>
      )}

      {items}

      {isReachingEnd && visibleOperations.length === 0 && (
        <NonIdealState
          icon="slash"
          title={t.components.OperationList.no_jobs_found}
          description={t.components.OperationList.sad_face}
        />
      )}

      {isReachingEnd && visibleOperations.length !== 0 && (
        <div className="mt-8 w-full tracking-wider text-center select-none text-slate-500">
          {t.components.OperationList.reached_bottom}
        </div>
      )}

      {!isReachingEnd && (
        <Button
          loading={isValidating}
          text={t.components.OperationList.load_more}
          icon="more"
          className="mt-2"
          large
          fill
          onClick={() => setSize((size) => size + 1)}
        />
      )}
    </>
  )
}
