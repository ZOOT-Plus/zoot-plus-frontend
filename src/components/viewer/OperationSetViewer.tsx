import {
  Alert,
  Button,
  Callout,
  Collapse,
  H3,
  H4,
  H5,
  Icon,
  Menu,
  MenuItem,
  NonIdealState,
  PopoverNext,
  Spinner,
} from '@blueprintjs/core'
import { ErrorBoundary } from '@sentry/react'

import { useOperations, type OperationsData } from 'apis/operation'
import { deleteOperationSet, useOperationSet, useRefreshOperationSets } from 'apis/operation-set'
import clsx from 'clsx'
import { useAtom } from 'jotai'
import { ComponentType, FC, Suspense, useEffect, useState, useId } from 'react'
import { copyShortCode } from 'services/operation'

import { FactItem } from 'components/FactItem'
import { OperationListView } from 'components/OperationList'
import { OperatorCard, type OperatorCardSkill } from 'components/OperatorCard'
import { Paragraphs } from 'components/Paragraphs'
import { RelativeTime } from 'components/RelativeTime'
import { withSuspensable } from 'components/Suspensable'
import { AppToaster } from 'components/Toaster'
import { DrawerLayout } from 'components/drawer/DrawerLayout'
import { OperationSetEditorDialog } from 'components/operation-set/OperationSetEditor'
import { CopilotDocV1 } from 'models/copilot.schema'
import { Operation } from 'models/operation'
import { OPERATORS } from 'models/operator'
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
  const hasDescription = Boolean(operationSet.description?.trim())

  return (
    <>
      <div className="flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-x-8">
        <div
          className={
            hasDescription
              ? 'flex flex-wrap items-start gap-x-4 select-none tabular-nums md:col-start-3 md:row-start-1'
              : 'flex flex-wrap items-start gap-x-4 select-none tabular-nums md:col-start-1 md:row-start-1'
          }
        >
          <OperationSetMetadata operationSet={operationSet} />
        </div>

        {hasDescription && (
          <div className="flex flex-col md:col-span-2 md:col-start-1 md:row-start-1">
            <Paragraphs content={operationSet.description} linkify />
          </div>
        )}
      </div>

      <div className="h-[1px] w-full bg-gray-200 mt-4 mb-6" />

      <OperationSetViewerOperatorsSection operationSet={operationSet} />

      <OperationSetViewerDetails operationSet={operationSet} />
    </>
  )
}

function OperationSetMetadata({ operationSet }: { operationSet: OperationSet }) {
  const t = useTranslation()

  return (
    <>
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
  const [showOperators, setShowOperators] = useState(true)
  const operatorsContentId = useId()
  const exceedsAggregationLimit = operationSet.copilotIds.length > 50

  return (
    <div className="mb-6">
      <H4 className="inline-flex">
        <button
          type="button"
          className="inline-flex items-center cursor-pointer border-0 bg-transparent p-0 hover:opacity-80"
          aria-expanded={showOperators}
          aria-controls={operatorsContentId}
          onClick={() => setShowOperators((visible) => !visible)}
        >
          {t.components.viewer.OperationSetViewer.operators}
          <Icon icon="chevron-down" className={clsx('ml-1 transition-transform', showOperators && 'rotate-180')} />
        </button>
      </H4>

      <div id={operatorsContentId}>
        <Collapse isOpen={showOperators}>
          {exceedsAggregationLimit ? (
            <Callout intent="warning" className="mt-2">
              {t.components.viewer.OperationSetViewer.operations_over_limit}
            </Callout>
          ) : (
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
          )}
        </Collapse>
      </div>
    </div>
  )
}

function OperationSetViewerOperatorsLoader({ operationSet }: { operationSet: OperationSet }) {
  const data = useOperationSetOperations(operationSet)
  return <OperationSetViewerOperators operationSet={operationSet} operations={data.operations} />
}

interface AggregatedOperator {
  operator: CopilotDocV1.Operator
  skills: OperatorCardSkill[]
  modules: CopilotDocV1.Module[]
}

interface MutableAggregatedOperator {
  name: string
  skills: Map<number, number | undefined>
  modules: Set<CopilotDocV1.Module>
  requirements?: Pick<CopilotDocV1.Requirements, 'elite' | 'level'>
}

const OPERATOR_ORDER = new Map(
  OPERATORS.map((operator, index) => [operator.name, { rarity: operator.rarity, index }] as const),
)

export function aggregateOperationSetOperators(operations: readonly Operation[]): AggregatedOperator[] {
  const operatorsByName = new Map<string, MutableAggregatedOperator>()

  for (const operation of operations) {
    // opers 不含干员组内干员
    for (const operator of operation.parsedContent.opers ?? []) {
      let aggregated = operatorsByName.get(operator.name)
      if (!aggregated) {
        aggregated = {
          name: operator.name,
          skills: new Map(),
          modules: new Set(),
        }
        operatorsByName.set(operator.name, aggregated)
      }

      const { elite, level, skillLevel, module } = operator.requirements ?? {}

      if (operator.skill !== undefined) {
        const currentSkillLevel = aggregated.skills.get(operator.skill)
        if (
          !aggregated.skills.has(operator.skill) ||
          (skillLevel !== undefined && (currentSkillLevel === undefined || skillLevel > currentSkillLevel))
        ) {
          aggregated.skills.set(operator.skill, skillLevel)
        }
      }

      if (
        elite !== undefined &&
        level !== undefined &&
        (!aggregated.requirements ||
          elite > aggregated.requirements.elite! ||
          (elite === aggregated.requirements.elite && level > aggregated.requirements.level!))
      ) {
        aggregated.requirements = { elite, level }
      }

      if (module !== undefined && module !== CopilotDocV1.Module.Default) {
        aggregated.modules.add(module)
      }
    }
  }

  return Array.from(operatorsByName.values())
    .sort((a, b) => {
      const aOrder = OPERATOR_ORDER.get(a.name)
      const bOrder = OPERATOR_ORDER.get(b.name)

      if (aOrder && bOrder) {
        return bOrder.rarity - aOrder.rarity || aOrder.index - bOrder.index
      }
      if (aOrder) return -1
      if (bOrder) return 1
      if (a.name === b.name) return 0
      return a.name < b.name ? -1 : 1
    })
    .map(({ name, requirements, skills, modules }) => ({
      operator: {
        name,
        ...(requirements && { requirements }),
      },
      skills: Array.from(skills, ([skill, skillLevel]) => ({ skill, skillLevel })).sort((a, b) => a.skill - b.skill),
      modules: Array.from(modules).sort((a, b) => a - b),
    }))
}

function OperationSetViewerOperators({
  operationSet,
  operations,
}: {
  operationSet: OperationSet
  operations: Operation[]
}) {
  const t = useTranslation()
  const operators = aggregateOperationSetOperators(operations)
  const expectedOperationIds = new Set(operationSet.copilotIds)
  const loadedOperationIds = new Set(operations.map((operation) => operation.id))
  const missingOperationCount = Array.from(expectedOperationIds).filter((id) => !loadedOperationIds.has(id)).length

  return (
    <div className="mt-2 select-none tabular-nums">
      {missingOperationCount > 0 && (
        <Callout intent="warning" className="mb-4">
          {t.components.viewer.OperationSetViewer.operations_incomplete({ count: missingOperationCount })}
        </Callout>
      )}

      <div className="flex flex-wrap gap-6">
        {operators.length === 0 ? (
          <NonIdealState
            className="my-2"
            title={t.components.viewer.OperationSetViewer.no_explicit_operators}
            icon="slash"
            layout="horizontal"
          />
        ) : (
          operators.map(({ operator, skills, modules }) => (
            <OperatorCard key={operator.name} operator={operator} skills={skills} modules={modules} />
          ))
        )}
      </div>
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
