import { Button, Callout, NonIdealState } from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'

import { UseOperationsParams, useOperations } from 'apis/operation'
import { useAtomValue } from 'jotai'
import { ComponentType, ReactNode, useEffect, useState } from 'react'

import { neoLayoutAtom } from 'store/pref'

import { useTranslation } from '../i18n/i18n'
import { Operation } from '../models/operation'
import { NeoOperationCard, OperationCard } from './OperationCard'
import { withSuspensable } from './Suspensable'
import { AddToOperationSetButton } from './operation-set/AddToOperationSet'

interface OperationListProps extends UseOperationsParams {
  multiselect?: boolean
  onUpdate?: (params: { total: number }) => void
  /**
   * 扩展：在多选模式下渲染额外的批量操作按钮（如批量删除）。
   * 仅在 multiselect=true 时生效。
   */
  renderMultiSelectActions?: (params: {
    selectedOperations: Operation[]
    clearSelection: () => void
  }) => ReactNode
  /**
   * 客户端过滤：根据 metadata.sourceType 过滤（original | repost）
   * 若未指定则不过滤。
   */
  sourceTypeFilter?: 'original' | 'repost'
}

export const OperationList: ComponentType<OperationListProps> = withSuspensable(
  ({ multiselect, onUpdate, renderMultiSelectActions, sourceTypeFilter, ...params }) => {
    const t = useTranslation()
    const neoLayout = useAtomValue(neoLayoutAtom)

    const { operations, total, setSize, isValidating, isReachingEnd } =
      useOperations({
        ...params,
        suspense: true,
      })

    // make TS happy: we got Suspense out there
    if (!operations) throw new Error('unreachable')

    useEffect(() => {
      onUpdate?.({ total })
    }, [total, onUpdate])

    const [selectedOperations, setSelectedOperations] = useState<Operation[]>(
      [],
    )
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

    // 根据需要进行客户端过滤（例如按来源：原创/搬运）
    const displayedOperations = sourceTypeFilter
      ? operations.filter(
          (op) => op.metadata?.sourceType === sourceTypeFilter,
        )
      : operations

    const items: ReactNode = neoLayout ? (
      <ul
        className="grid gap-4 items-stretch"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr)',
        }}
      >
        {displayedOperations.map((operation) => (
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
        {displayedOperations.map((operation) => (
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
              <Tooltip2
                content={t.components.OperationList.only_loaded_items}
                placement="top"
              >
                <Button
                  minimal
                  icon="tick"
                  onClick={() => updateSelection(displayedOperations, [])}
                >
                  {t.components.OperationList.select_all}
                </Button>
              </Tooltip2>
              <Button
                minimal
                intent="danger"
                icon="trash"
                onClick={() => setSelectedOperations([])}
              >
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
              {renderMultiSelectActions?.({
                selectedOperations,
                clearSelection: () => setSelectedOperations([]),
              })}
            </div>
          </Callout>
        )}

        {items}

        {isReachingEnd && displayedOperations.length === 0 && (
          <NonIdealState
            icon="slash"
            title={t.components.OperationList.no_jobs_found}
            description={t.components.OperationList.sad_face}
          />
        )}

        {isReachingEnd && displayedOperations.length !== 0 && (
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
  },
  {
    retryOnChange: ['orderBy', 'keyword', 'levelKeyword', 'operator'],
  },
)
