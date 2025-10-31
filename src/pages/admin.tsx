import { Button, ButtonGroup, Card, Divider, H6, InputGroup, Tab, Tabs } from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'
import clsx from 'clsx'
import { debounce } from 'lodash-es'
import { ComponentType, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { UseOperationsParams, useRefreshOperations } from 'apis/operation'
import { deleteOperation } from 'apis/operation'
import { OperationList } from 'components/OperationList'
import { withGlobalErrorBoundary } from 'components/GlobalErrorBoundary'
import { Confirm } from 'components/Confirm'
import { LevelSelectButton } from 'components/LevelSelectButton'
import { OperatorFilter, useOperatorFilter } from 'components/OperatorFilter'
import { UserFilter } from 'components/UserFilter'
import { AdminOperationSetList } from 'components/admin/AdminOperationSetList'
import { OperationDrawer } from 'components/drawer/OperationDrawer'
import { useTranslation } from '../i18n/i18n'
import { authAtom, isAdmin } from '../store/auth'
import { useAtomValue } from 'jotai'
import { IconNames } from '@blueprintjs/icons'

export const AdminPage: ComponentType = withGlobalErrorBoundary(() => {
  const t = useTranslation()
  const auth = useAtomValue(authAtom)

  if (!isAdmin(auth)) {
    return <Navigate to="/" replace />
  }

  const refreshOperations = useRefreshOperations()
  const [tab, setTab] = useState<'operation' | 'operationSet'>('operation')

  const [queryParams, setQueryParams] = useState<
    Omit<UseOperationsParams, 'operator'>
  >({ limit: 20, orderBy: 'id', descending: true })
  const debouncedSetQueryParams = useMemo(() => debounce(setQueryParams, 500), [])

  const { operatorFilter, setOperatorFilter } = useOperatorFilter()
  const [selectedStageId, setSelectedStageId] = useState<string>('')
  // 记录由快捷筛选选择的当前 game，用于打开关卡选择时作为默认值
  const [selectedGame, setSelectedGame] = useState<string | undefined>()
  // 元数据来源过滤：原创/搬运
  const [sourceTypeFilter, setSourceTypeFilter] = useState<
    'original' | 'repost' | undefined
  >(undefined)

  return (
    <div className="px-4 pb-16 mt-4 md:px-8 md:mt-8 max-w-[96rem] mx-auto">
      <Card className="flex flex-col mb-4">
        <div className="mb-6 flex items-center">
          <Tabs
            className="pl-2 [&>div]:space-x-2 [&>div]:space-x-reverse"
            id="admin-operation-tabs"
            large
            selectedTabId={tab}
            onChange={(newTab) => setTab(newTab as 'operation' | 'operationSet')}
          >
            <Tab
              className={clsx('text-inherit', tab !== 'operation' && 'opacity-75')}
              id="operation"
              title={t.components.Operations.operations}
            />
            <Divider className="self-center h-[1em]" />
            <Tab
              className={clsx('text-inherit', tab !== 'operationSet' && 'opacity-75')}
              id="operationSet"
              title={t.components.Operations.operation_sets}
            />
          </Tabs>
        </div>

        {tab === 'operation' && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <InputGroup
                className="max-w-md [&>input]:!rounded-md"
                placeholder={t.components.Operations.search_placeholder}
                leftIcon="search"
                size={32}
                large
                type="search"
                enterKeyHint="search"
                defaultValue={queryParams.keyword}
                onChange={(e) =>
                  debouncedSetQueryParams((old) => ({
                    ...old,
                    keyword: e.target.value.trim(),
                  }))
                }
                onBlur={() => debouncedSetQueryParams.flush()}
              />
              <div className="flex flex-wrap gap-1 items-end">
                <LevelSelectButton
                  value={selectedStageId}
                  onChange={(stageId) => {
                    setSelectedStageId(stageId)
                    setQueryParams((old) => ({ ...old, levelKeyword: stageId }))
                    refreshOperations()
                  }}
                  onFilter={(kw) => {
                    setQueryParams((old) => ({ ...old, levelKeyword: kw }))
                    refreshOperations()
                  }}
                  defaultGame={selectedGame}
                />
                {/* 快捷筛选：如鸢 / 代号鸢 */}
                <ButtonGroup minimal className="flex flex-wrap items-center gap-1">
                  {[
                    { label: '只看如鸢', value: '如鸢', icon: IconNames.MANUAL },
                    { label: '只看代号鸢', value: '代号鸢', icon: IconNames.GLOBE },
                  ].map(({ label, value, icon }) => (
                    <Button
                      key={label}
                      className="bp4-button bp4-minimal !px-3"
                      icon={icon}
                      active={(queryParams.levelKeyword || '') === value}
                      onClick={() => {
                        const isActive = (queryParams.levelKeyword || '') === value
                        // 清空已选具体关卡，仅按游戏关键字筛选
                        setSelectedStageId('')
                        // 记录当前快捷筛选的 game，打开关卡选择时作为默认 game
                        setSelectedGame(isActive ? undefined : value)
                        setQueryParams((old) => ({
                          ...old,
                          // 仅以“游戏名”作为 levelKeyword，避免过度收窄（不附加“通用”）
                          levelKeyword: isActive ? undefined : value,
                          // 同时清空自由关键字，避免叠加条件导致无结果
                          keyword: isActive ? old.keyword : undefined,
                        }))
                        // 立刻刷新列表
                        refreshOperations()
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </ButtonGroup>
                {/* 快捷筛选：原创 / 搬运（基于 metadata.sourceType 的客户端过滤）*/}
                <ButtonGroup minimal className="flex flex-wrap items-center gap-1">
                  {[
                    { label: '只看原创', value: 'original' as const },
                    { label: '只看搬运', value: 'repost' as const },
                  ].map(({ label, value }) => (
                    <Button
                      key={label}
                      className="bp4-button bp4-minimal !px-3"
                      active={sourceTypeFilter === value}
                      onClick={() => {
                        setSourceTypeFilter((old) => (old === value ? undefined : value))
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </ButtonGroup>
              </div>
              <UserFilter
                user={undefined}
                onChange={(user) =>
                  setQueryParams((old) => {
                    if (!user) {
                      const { uploaderId: _removed, ...rest } = old
                      return rest
                    }
                    return { ...old, uploaderId: user.id }
                  })
                }
              />
              <div className="flex flex-wrap items-center ml-auto">
                <H6 className="mb-0 mr-1 opacity-75">{t.components.Operations.sort_by}</H6>
                <div className="flex items-center">
                  {(
                    [
                      { icon: 'time', text: t.components.Operations.newest, orderBy: 'id' },
                      { icon: 'flame', text: t.components.Operations.popularity, orderBy: 'hot' },
                      { icon: 'eye-open', text: t.components.Operations.views, orderBy: 'views' },
                    ] as const
                  ).map(({ icon, text, orderBy }) => (
                    <Tooltip2 key={orderBy} placement="top" content={text}>
                      <Button
                        minimal
                        className="!px-2 !py-1 !border-none [&>.bp4-icon]:!mr-1"
                        icon={icon}
                        intent={queryParams.orderBy === orderBy ? 'primary' : 'none'}
                        onClick={() => setQueryParams((old) => ({ ...old, orderBy }))}
                      />
                    </Tooltip2>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2">
              <OperatorFilter filter={operatorFilter} onChange={setOperatorFilter} />
            </div>
          </>
        )}
      </Card>

      <div className="tabular-nums">
        {tab === 'operation' && (
          <OperationList
            {...queryParams}
            multiselect
            operator={operatorFilter.enabled ? operatorFilter : undefined}
            sourceTypeFilter={sourceTypeFilter}
            renderMultiSelectActions={({ selectedOperations, clearSelection }) => (
              <Confirm
                intent="danger"
                confirmButtonText={t.common.delete}
                canOutsideClickCancel
                canEscapeKeyCancel
                trigger={({ handleClick }) => (
                  <Button
                    small
                    intent="danger"
                    icon="trash"
                    className="ml-2"
                    disabled={selectedOperations.length === 0}
                    onClick={handleClick}
                  >
                    {t.common.delete}
                  </Button>
                )}
                onConfirm={async () => {
                  const ids = selectedOperations.map((op) => op.id)
                  await Promise.allSettled(ids.map((id) => deleteOperation({ id })))
                  clearSelection()
                  refreshOperations()
                }}
              />
            )}
          />
        )}

        {tab === 'operationSet' && <AdminOperationSetList />}
      </div>
      <OperationDrawer />
    </div>
  )
})

AdminPage.displayName = 'AdminPage'
