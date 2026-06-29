import { Button, ButtonProps, Callout, Checkbox, Dialog, NonIdealState, Tag, ToastProps } from '@blueprintjs/core'

import { addToOperationSet, removeFromOperationSet, useOperationSets } from 'apis/operation-set'
import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { compact, isEqual } from 'lodash-es'
import { FC, memo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { AppToaster } from 'components/Toaster'
import { OperationSetEditorDialog } from 'components/operation-set/OperationSetEditor'
import { formatError } from 'utils/error'
import { useNetworkState } from 'utils/useNetworkState'

import { useTranslation } from '../../i18n/i18n'
import { authAtom } from '../../store/auth'

interface AddToOperationSetButtonProps extends ButtonProps {
  operationIds: number[]
}

export const AddToOperationSetButton: FC<AddToOperationSetButtonProps> = memo(
  ({ operationIds, ...props }) => {
    const t = useTranslation()
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button {...props} disabled={!operationIds.length} onClick={() => setIsOpen(true)} />
        <Dialog
          title={t.components.operationSet.AddToOperationSet.add_to_job_set_title({
            count: operationIds.length,
          })}
          icon="add-to-folder"
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        >
          <AddToOperationSet operationIds={operationIds} isOpen={isOpen} onSuccess={() => setIsOpen(false)} />
        </Dialog>
      </>
    )
  },
  (prevProps, nextProps) => isEqual(prevProps.operationIds, nextProps.operationIds),
)
AddToOperationSetButton.displayName = 'AddToOperationSetButton'

interface AddToOperationSetProps {
  operationIds: number[]
  isOpen: boolean
  onSuccess: () => void
}

function AddToOperationSet({ operationIds, onSuccess }: AddToOperationSetProps) {
  const t = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const singleOperationId = operationIds.length > 1 ? undefined : operationIds[0]
  const auth = useAtomValue(authAtom)

  const {
    operationSets,
    isReachingEnd,
    isValidating,
    setSize,
    error: listError,
  } = useOperationSets({
    disabled: !auth.userId,
    creatorId: auth.userId,
  })

  const {
    networkState: { loading, error: submitError },
    start,
    finish,
  } = useNetworkState()

  const [editorOpen, setEditorOpen] = useState(false)
  const [onlyShowAdded, setOnlyShowAdded] = useState(false)
  const [checkboxOverrides, setCheckboxOverrides] = useState({} as Record<number, boolean>)

  const error =
    submitError || listError || (!auth.userId ? t.components.operationSet.AddToOperationSet.not_logged_in : undefined)

  const operationSetList =
    singleOperationId && onlyShowAdded
      ? operationSets?.filter((set) => checkboxOverrides[set.id] ?? set.copilotIds.includes(operationIds[0]))
      : operationSets

  const defaultChecked = (operationSetId: number) =>
    singleOperationId
      ? !!operationSets?.find((set) => set.id === operationSetId && set.copilotIds.includes(singleOperationId))
      : false

  const onSubmit = async () => {
    if (loading || !operationSets?.length) return

    start()

    try {
      const tasks = Object.entries(checkboxOverrides).map(async ([idKey, checked]) => {
        const id = +idKey
        if (isNaN(id)) return undefined

        if (checked && !defaultChecked(id)) {
          await addToOperationSet({
            operationSetId: id,
            operationIds,
          })
          return id
        } else if (!checked && defaultChecked(id)) {
          await removeFromOperationSet({
            operationSetId: id,
            operationIds,
          })
          return id
        }

        return undefined
      })
      const processedIds = compact(await Promise.all(tasks))
      if (processedIds.length) {
        let action: ToastProps['action']

        if (processedIds.length === 1) {
          const search = new URLSearchParams(searchParams)
          search.set('opset', processedIds[0].toString())
          action = {
            text: t.components.operationSet.AddToOperationSet.click_to_view,
            className: '!px-1',
            onClick: () => navigate({ search: search.toString() }),
          }
        }

        AppToaster.show({
          intent: 'success',
          message: t.components.operationSet.AddToOperationSet.added_to_job_set,
          action,
        })
      }

      finish(null)
      onSuccess()
    } catch (e) {
      finish(e as Error)
    }
  }

  return (
    <>
      <div className="py-2 px-px">
        {error && (
          <Callout intent="danger" icon="error" title={t.components.operationSet.AddToOperationSet.error}>
            {formatError(error)}
          </Callout>
        )}

        {operationSetList?.length === 0 && (
          <NonIdealState
            icon="helicopter"
            description={
              operationSets?.length === 0
                ? t.components.operationSet.AddToOperationSet.no_job_sets_yet
                : t.components.operationSet.AddToOperationSet.no_added_job_sets_yet
            }
          />
        )}

        <div className="min-h-36 max-h-[calc(100vh-20rem)] overflow-y-auto">
          {operationSetList?.map(({ id, name, copilotIds, status }) => (
            <div key={id}>
              <Checkbox
                className={clsx(
                  'flex items-center m-0 p-2 !pl-10 hover:bg-slate-200 dark:hover:bg-slate-800 [&>.bp6-control-indicator]:mt-0',
                  checkboxOverrides[id] !== undefined && checkboxOverrides[id] !== defaultChecked(id) && 'font-bold',
                )}
                checked={checkboxOverrides[id] ?? defaultChecked(id)}
                onChange={(e) => {
                  const checked = (e.target as HTMLInputElement).checked
                  setCheckboxOverrides((prev) => ({ ...prev, [id]: checked }))
                }}
              >
                {status === 'PRIVATE' && (
                  <Tag minimal className="mr-1">
                    {t.components.operationSet.AddToOperationSet.private}
                  </Tag>
                )}
                {name}
                <span className="ml-auto opacity-50">{copilotIds.length}</span>
              </Checkbox>
            </div>
          ))}

          {!isReachingEnd && (
            <Button
              minimal
              small
              loading={isValidating}
              text={t.components.operationSet.AddToOperationSet.load_more}
              icon="more"
              className="mt-2 ml-1.5"
              onClick={() => setSize((size) => size + 1)}
            />
          )}
        </div>
      </div>

      <div className="h-px bg-slate-200" />

      <div className="flex p-4 gap-3">
        {!!singleOperationId && (
          <Checkbox
            label={t.components.operationSet.AddToOperationSet.show_only_added}
            checked={onlyShowAdded}
            onChange={(e) => setOnlyShowAdded((e.target as HTMLInputElement).checked)}
          />
        )}
        <Button className="ml-auto" onClick={() => setEditorOpen(true)}>
          {t.components.operationSet.AddToOperationSet.create_job_set}
        </Button>
        <Button disabled={!operationSets?.length} loading={loading} intent="primary" onClick={onSubmit}>
          {t.components.operationSet.AddToOperationSet.confirm}
        </Button>
      </div>

      <OperationSetEditorDialog
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false)
          setSize(1)
        }}
      />
    </>
  )
}
