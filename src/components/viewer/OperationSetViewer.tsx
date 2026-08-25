import {
  Alert,
  Button,
  H3,
  H4,
  H5,
  Icon,
  Menu,
  MenuItem,
  NonIdealState,
  PopoverNext,
  Spinner,
  Tooltip,
} from '@blueprintjs/core'
import { ErrorBoundary } from '@sentry/react'

import { useOperations } from 'apis/operation'
import { deleteOperationSet, useOperationSet, useRefreshOperationSets } from 'apis/operation-set'
import { useAtom } from 'jotai'
import { ComponentType, FC, Suspense, useEffect, useState } from 'react'
import { copyShortCode } from 'services/operation'

import { OperationsData } from 'apis/operation'
import { FactItem } from 'components/FactItem'
import { OperationListView} from 'components/OperationList'
import { Paragraphs } from 'components/Paragraphs'
import { RelativeTime } from 'components/RelativeTime'
import { withSuspensable } from 'components/Suspensable'
import { AppToaster } from 'components/Toaster'
import { DrawerLayout } from 'components/drawer/DrawerLayout'
import { OperationSetEditorDialog } from 'components/operation-set/OperationSetEditor'
import { OperatorAvatar } from 'components/OperatorAvatar'
import { Operation } from 'models/operation'
import { findOperatorByName } from 'models/operator'
import { OperationSet } from 'models/operation-set'
import { authAtom } from 'store/auth'
import { wrapErrorMessage } from 'utils/wrapErrorMessage'

import { i18nDefer, useTranslation } from '../../i18n/i18n'
import { formatError } from '../../utils/error'
import { UserName } from '../UserName'

const ManageMenu: FC<{
  operationSet: OperationSet
  onUpdate: () => void
}> = ({ operationSet, onUpdate }) => {
  const t = useTranslation()
  const refreshOperationSets = useRefreshOperationSets()

  const [loading, setLoading] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await wrapErrorMessage(
        (e) =>
          t.components.viewer.OperationSetViewer.delete_failed({
            error: formatError(e),
          }),
        deleteOperationSet({ id: operationSet.id }),
      )

      refreshOperationSets()

      AppToaster.show({
        intent: 'success',
        message: t.components.viewer.OperationSetViewer.delete_success,
      })
      setDeleteDialogOpen(false)
      onUpdate()
    } catch (e) {
      console.warn(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Alert
        isOpen={deleteDialogOpen}
        cancelButtonText={t.components.viewer.OperationSetViewer.cancel}
        confirmButtonText={t.components.viewer.OperationSetViewer.delete}
        icon="log-out"
        intent="danger"
        canOutsideClickCancel
        loading={loading}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      >
        <H4>{t.components.viewer.OperationSetViewer.delete_task_set}</H4>
        <p>{t.components.viewer.OperationSetViewer.confirm_delete_task_set}</p>
      </Alert>

      <OperationSetEditorDialog operationSet={operationSet} isOpen={editorOpen} onClose={() => setEditorOpen(false)} />

      <Menu>
        <MenuItem
          icon="edit"
          text={t.components.viewer.OperationSetViewer.edit_task_set}
          shouldDismissPopover={false}
          onClick={() => setEditorOpen(true)}
        />
        <MenuItem
          icon="delete"
          intent="danger"
          text={t.components.viewer.OperationSetViewer.delete_task_set}
          shouldDismissPopover={false}
          onClick={() => setDeleteDialogOpen(true)}
        />
      </Menu>
    </>
  )
}

export const OperationSetViewer: ComponentType<{
  operationSetId: OperationSet['id']
  onCloseDrawer: () => void
}> = withSuspensable(
  function OperationSetViewer({ operationSetId, onCloseDrawer }) {
    const t = useTranslation()
    const { data: operationSet, error } = useOperationSet({
      id: operationSetId,
      suspense: true,
    })

    useEffect(() => {
      // on finished loading, scroll to #fragment if any
      if (operationSet) {
        const fragment = window.location.hash
        if (fragment) {
          const el = document.querySelector(fragment)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' })
          }
        }
      }
    }, [operationSet])

    const [auth] = useAtom(authAtom)

    // make eslint happy: we got Suspense out there
    if (!operationSet) throw new Error('unreachable')

    useEffect(() => {
      if (error) {
        AppToaster.show({
          intent: 'danger',
          message: t.components.viewer.OperationSetViewer.refresh_failed({
            error: formatError(error),
          }),
        })
      }
    }, [error, t])

    return (
      <DrawerLayout
        title={
          <>
            <Icon icon="document" />
            <span className="ml-2">{t.components.viewer.OperationSetViewer.task_set}</span>

            <div className="flex-1" />

            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              {operationSet.creatorId === auth.userId && (
                <PopoverNext content={<ManageMenu operationSet={operationSet} onUpdate={() => onCloseDrawer()} />}>
                  <Button icon="wrench" text={t.components.viewer.OperationSetViewer.manage} rightIcon="caret-down" />
                </PopoverNext>
              )}

              <Button
                icon="clipboard"
                text={t.components.viewer.OperationSetViewer.copy_secret_code}
                intent="primary"
                onClick={() => copyShortCode({ id: operationSet.id, type: 'operation-set' })}
              />
            </div>
          </>
        }
      >
        <ErrorBoundary
          fallback={
            <NonIdealState
              icon="issue"
              title={t.components.viewer.OperationSetViewer.render_error}
              description={t.components.viewer.OperationSetViewer.render_problem}
            />
          }
        >
          <OperationSetViewerInner operationSet={operationSet} />
        </ErrorBoundary>
      </DrawerLayout>
    )
  },
  {
    pendingTitle: i18nDefer.components.viewer.OperationSetViewer.loading_task_set,
  },
)

function OperationSetViewerInner({ operationSet }: { operationSet: OperationSet }) {
  return (
    <div className="h-full overflow-auto p-4 md:p-8">
      <H3>{operationSet.name}</H3>

      <OperationSetViewerBody operationSet={operationSet} />
    </div>
  )
}

function OperationSetViewerBody({ operationSet }: { operationSet: OperationSet }) {
  const t = useTranslation()
  const hasDescription = Boolean(operationSet.description?.trim())

  return (
    <>
      <div className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-x-8">
        <div
          className={
            hasDescription
              ? 'flex flex-wrap items-start gap-x-4 select-none tabular-nums md:col-start-2 md:row-start-1'
              : 'flex flex-wrap items-start gap-x-4 select-none tabular-nums md:col-start-1 md:row-start-1'
          }
        >
          <FactItem title={t.components.viewer.OperationSetViewer.published_at} icon="time">
            <span className="text-gray-800 dark:text-slate-100 font-bold">
              <RelativeTime moment={operationSet.createTime} />
            </span>
          </FactItem>

          <FactItem title={t.components.viewer.OperationSetViewer.author} icon="user">
            <UserName className="text-gray-800 dark:text-slate-100 font-bold" userId={operationSet.creatorId}>
              {operationSet.creator}
            </UserName>
          </FactItem>
        </div>

        {hasDescription && (
          <div className="flex flex-col md:col-start-1 md:row-start-1 md:row-span-2">
            <Paragraphs content={operationSet.description} linkify />
          </div>
        )}

        <div className={hasDescription ? 'md:col-start-2 md:row-start-2' : 'md:col-start-2 md:row-start-1'}>
          <OperationSetViewerOperatorsSection operationSet={operationSet} />
        </div>
      </div>

      <div className="h-[1px] w-full bg-gray-200 mt-4 mb-6" />

      <OperationSetViewerDetails operationSet={operationSet} />
    </>
  )
}

function useOperationSetOperations(operationSet: OperationSet) {
  return useOperations({
    operationIds: operationSet.copilotIds,
    suspense: true,
  })
}

function OperationSetViewerOperatorsSection({ operationSet }: { operationSet: OperationSet }) {
  const t = useTranslation()

  return (
    <ErrorBoundary
      key={operationSet.id}
      fallback={({ error }) => (
        <NonIdealState
          icon="issue"
          title={t.components.Suspensable.loadFailed}
          description={error.message}
          className="py-4"
        />
      )}
    >
      <Suspense
        fallback={
          <div className="flex items-center gap-2 py-4 text-slate-500">
            <Spinner size={20} />
            <span>{t.components.viewer.OperationSetViewer.loading_task_set}</span>
          </div>
        }
      >
        <OperationSetViewerOperatorsLoader operationSet={operationSet} />
      </Suspense>
    </ErrorBoundary>
  )
}

function OperationSetViewerOperatorsLoader({ operationSet }: { operationSet: OperationSet }) {
  const data = useOperationSetOperations(operationSet)
  return <OperationSetViewerOperators operations={data.operations} />
}

function OperationSetViewerOperators({ operations }: { operations: Operation[] }) {
  const t = useTranslation()

  const rarityByName = new Map<string, number>()
  const push = (name: string) => {
    if (rarityByName.has(name)) return
    rarityByName.set(name, findOperatorByName(name)?.rarity ?? 0)
  }

  for (const operation of operations) {
    // 干员组（groups[].opers）是“任选其一”的可替换干员，非确定使用，故头像区只展示明确指定的 opers
    operation.parsedContent.opers?.forEach(({ name }) => push(name))
  }

  const operatorNames = Array.from(rarityByName.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name]) => name)

  return (
    <div className="flex flex-col items-start select-none tabular-nums">
      <FactItem title={t.components.viewer.OperationSetViewer.operators} icon="people">
        {operatorNames.length === 0 ? (
          <span className="text-gray-800 dark:text-slate-100 font-bold">
            {t.components.viewer.OperationSetViewer.no_operators}
          </span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {operatorNames.map((name) => (
              <Tooltip content={name}>
                <OperatorAvatar key={name} name={name} className="w-10 h-10" sourceSize={96} />
              </Tooltip>
            ))}
          </div>
        )}
      </FactItem>
    </div>
  )
}

const OperationSetViewerDetails = withSuspensable(
  function OperationSetViewerDetails({ operationSet }: { operationSet: OperationSet }) {
    const t = useTranslation()
    const data = useOperationSetOperations(operationSet)

    return (
      <ErrorBoundary
        key={operationSet.id}
        fallback={
          <NonIdealState
            icon="issue"
            title={t.components.viewer.OperationSetViewer.render_error}
            description={t.components.viewer.OperationSetViewer.render_preview_problem}
            className="h-96 bg-stripe rounded"
          />
        }
      >
        <OperationSetViewerInnerDetails operationSet={operationSet} data={data} />
      </ErrorBoundary>
    )
  },
  {
    pendingTitle: i18nDefer.components.viewer.OperationSetViewer.loading_task_set,
    retryOnChange: ['operationSet'],
  },
)

function OperationSetViewerInnerDetails({ operationSet, data }: { operationSet: OperationSet; data: OperationsData }) {
  const t = useTranslation()

  return (
    <div className="flex flex-col">
      <H5 className="mb-4 text-slate-600">
        {t.components.viewer.OperationSetViewer.task_list}({operationSet.copilotIds.length})
      </H5>
      <div className="flex flex-col mb-4 max-w-screen-2xl">
        <OperationListView data={data} />
      </div>
    </div>
  )
}
