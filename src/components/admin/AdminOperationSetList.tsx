import { Button, NonIdealState } from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'
import { ComponentType } from 'react'

import {
  UseOperationSetsParams,
  useOperationSetSearch,
  deleteOperationSet,
  useRefreshOperationSets,
} from 'apis/operation-set'
import { withSuspensable } from 'components/Suspensable'
import { OperationSetCard } from 'components/OperationSetCard'
import { Confirm } from 'components/Confirm'
import { useTranslation } from '../../i18n/i18n'

interface AdminOperationSetListProps extends UseOperationSetsParams {}

export const AdminOperationSetList: ComponentType<AdminOperationSetListProps> =
  withSuspensable(({ ...params }) => {
    const t = useTranslation()
    const refresh = useRefreshOperationSets()

    const { operationSets, isReachingEnd, isValidating, setSize } =
      useOperationSetSearch({ ...params, suspense: true })

    if (!operationSets) throw new Error('unreachable')

    return (
      <>
        {operationSets.map((opset) => (
          <div key={opset.id} className="relative">
            <OperationSetCard operationSet={opset} />
            <div className="absolute top-4 right-4 z-10">
              <Confirm
                intent="danger"
                confirmButtonText={t.common.delete}
                canOutsideClickCancel
                canEscapeKeyCancel
                trigger={({ handleClick }) => (
                  <Tooltip2
                    placement="bottom"
                    content={t.common.delete}
                  >
                    <Button small icon="trash" intent="danger" onClick={handleClick} />
                  </Tooltip2>
                )}
                onConfirm={async () => {
                  await deleteOperationSet({ id: opset.id })
                  refresh()
                }}
              />
            </div>
          </div>
        ))}

        {isReachingEnd && operationSets.length === 0 && (
          <NonIdealState icon="slash" title={t.components.OperationSetList.no_job_sets_found} />
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
  })

AdminOperationSetList.displayName = 'AdminOperationSetList'

