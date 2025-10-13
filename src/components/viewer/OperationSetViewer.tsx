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
} from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'
import { ErrorBoundary } from '@sentry/react'

import {
  deleteOperationSet,
  useOperationSet,
  useRefreshOperationSets,
} from 'apis/operation-set'
import { useAtom } from 'jotai'
import { ComponentType, FC, useEffect, useState } from 'react'
import { copyShortCode } from 'services/operation'

import { FactItem } from 'components/FactItem'
import { OperationList } from 'components/OperationList'
import { Paragraphs } from 'components/Paragraphs'
import { RelativeTime } from 'components/RelativeTime'
import { withSuspensable } from 'components/Suspensable'
import { AppToaster } from 'components/Toaster'
import { DrawerLayout } from 'components/drawer/DrawerLayout'
import { OperationSetEditorDialog } from 'components/operation-set/OperationSetEditor'
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

      <OperationSetEditorDialog
        operationSet={operationSet}
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
      />

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
            <span className="ml-2">
              {t.components.viewer.OperationSetViewer.maa_copilot_task_set}
            </span>

            <div className="flex-1" />

            {operationSet.creatorId === auth.userId && (
              // 与 OperationViewer 保持一致：使用 Portal 并提升层级，避免在 Drawer 标题区域被裁剪/遮挡
              <Popover2
                content={
                  <ManageMenu
                    operationSet={operationSet}
                    onUpdate={() => onCloseDrawer()}
                  />
                }
                usePortal={true}
                portalClassName="operation-viewer-portal"
              >
                <Button
                  className="ml-4"
                  icon="wrench"
                  text={t.components.viewer.OperationSetViewer.manage}
                  rightIcon="caret-down"
                />
              </Popover2>
            )}

            <Button
              className="ml-4"
              icon="clipboard"
              text={t.components.viewer.OperationSetViewer.copy_secret_code}
              intent="primary"
              onClick={() => copyShortCode(operationSet)}
            />
          </>
        }
      >
        <ErrorBoundary
          fallback={
            <NonIdealState
              icon="issue"
              title={t.components.viewer.OperationSetViewer.render_error}
              description={
                t.components.viewer.OperationSetViewer.render_problem
              }
            />
          }
        >
          <OperationSetViewerInner operationSet={operationSet} />
        </ErrorBoundary>
      </DrawerLayout>
    )
  },
  {
    pendingTitle:
      i18nDefer.components.viewer.OperationSetViewer.loading_task_set,
  },
)

function OperationSetViewerInner({
  operationSet,
}: {
  operationSet: OperationSet
}) {
  const t = useTranslation()

  return (
    <div className="h-full overflow-auto py-4 px-8 pt-8">
      <H3>{operationSet.name}</H3>

      <div className="grid grid-rows-1 grid-cols-3 gap-8">
        <div className="flex flex-col">
          <Paragraphs content={operationSet.description} linkify />
        </div>

        <div className="flex flex-col items-start select-none tabular-nums">
          <FactItem
            title={t.components.viewer.OperationSetViewer.published_at}
            icon="time"
          >
            <span className="text-gray-800 dark:text-slate-100 font-bold">
              <RelativeTime moment={operationSet.createTime} />
            </span>
          </FactItem>

          <FactItem
            title={t.components.viewer.OperationSetViewer.author}
            icon="user"
          >
            <UserName
              className="text-gray-800 dark:text-slate-100 font-bold"
              userId={operationSet.creatorId}
            >
              {operationSet.creator}
            </UserName>
          </FactItem>
        </div>
      </div>

      <div className="h-[1px] w-full bg-gray-200 mt-4 mb-6" />

      <ErrorBoundary
        fallback={
          <NonIdealState
            icon="issue"
            title={t.components.viewer.OperationSetViewer.render_error}
            description={
              t.components.viewer.OperationSetViewer.render_preview_problem
            }
            className="h-96 bg-stripe rounded"
          />
        }
      >
        <OperationSetViewerInnerDetails operationSet={operationSet} />
      </ErrorBoundary>
    </div>
  )
}

function OperationSetViewerInnerDetails({
  operationSet,
}: {
  operationSet: OperationSet
}) {
  const t = useTranslation()

  return (
    <div className="flex flex-col">
      <H5 className="mb-4 text-slate-600">
        {t.components.viewer.OperationSetViewer.task_list}(
        {operationSet.copilotIds.length})
      </H5>
      <div className="flex flex-col mb-4 max-w-screen-2xl">
        <OperationList operationIds={operationSet.copilotIds} />
      </div>
    </div>
  )
}
