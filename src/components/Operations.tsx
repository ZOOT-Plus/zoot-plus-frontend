import {
  Button,
  ButtonGroup,
  Card,
  Divider,
  H6,
  InputGroup,
  Tab,
  Tabs,
} from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'

import { UseOperationsParams, useRefreshOperations } from 'apis/operation'
import clsx from 'clsx'
import { useAtom } from 'jotai'
import { debounce } from 'lodash-es'
import { MaaUserInfo } from 'maa-copilot-client'
import { ComponentType, useMemo, useState } from 'react'

import { CardTitle } from 'components/CardTitle'
import { OperationList } from 'components/OperationList'
import { OperationSetList } from 'components/OperationSetList'
import { neoLayoutAtom } from 'store/pref'

import { useTranslation } from '../i18n/i18n'
// 使用悬浮式按钮选择器
import { LevelSelectButton } from './LevelSelectButton'
import { OperatorFilter, useOperatorFilter } from './OperatorFilter'
import { withSuspensable } from './Suspensable'
import { UserFilter } from './UserFilter'

export const Operations: ComponentType = withSuspensable(() => {
  const t = useTranslation()
  const refreshOperations = useRefreshOperations()
  const [queryParams, setQueryParams] = useState<
    Omit<UseOperationsParams, 'operator'>
  >({
    limit: 10,
    orderBy: 'hot',
  })
  const debouncedSetQueryParams = useMemo(
    () => debounce(setQueryParams, 500),
    [],
  )

  const { operatorFilter, setOperatorFilter } = useOperatorFilter()
  const [selectedUser, setSelectedUser] = useState<MaaUserInfo>()
  const [neoLayout, setNeoLayout] = useAtom(neoLayoutAtom)
  const [tab, setTab] = useState<'operation' | 'operationSet'>('operation')
  const [multiselect, setMultiselect] = useState(false)
  // 独立保存已选中的具体关卡，用于按钮展示与弹层回显
  const [selectedStageId, setSelectedStageId] = useState<string>('')
  // 记录由快捷筛选选择的当前 game，用于打开关卡选择时作为默认值
  const [selectedGame, setSelectedGame] = useState<string | undefined>()

  return (
    <>
      <Card className="flex flex-col mb-4">
        <CardTitle className="mb-6 flex" icon="properties">
          <Tabs
            className="pl-2 [&>div]:space-x-2 [&>div]:space-x-reverse"
            id="operation-tabs"
            large
            selectedTabId={tab}
            onChange={(newTab) =>
              setTab(newTab as 'operation' | 'operationSet')
            }
          >
            <Tab
              className={clsx(
                'text-inherit',
                tab !== 'operation' && 'opacity-75',
              )}
              id="operation"
              title={t.components.Operations.operations}
            />
            <Divider className="self-center h-[1em]" />
            <Tab
              className={clsx(
                'text-inherit',
                tab !== 'operationSet' && 'opacity-75',
              )}
              id="operationSet"
              title={t.components.Operations.operation_sets}
            />
          </Tabs>
          <Button
            minimal
            icon="multi-select"
            title={t.components.Operations.enable_multi_select}
            className="ml-auto mr-2"
            active={multiselect}
            onClick={() => setMultiselect((v) => !v)}
          />
          <ButtonGroup>
            <Button
              icon="grid-view"
              active={neoLayout}
              onClick={() => setNeoLayout(true)}
            />
            <Button
              icon="list"
              active={!neoLayout}
              onClick={() => setNeoLayout(false)}
            />
          </ButtonGroup>
        </CardTitle>
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
                    setQueryParams((old) => ({
                      ...old,
                      levelKeyword: stageId,
                    }))
                    // 主动触发一次刷新，确保立刻发起查询
                    refreshOperations()
                  }}
                  onFilter={(kw) => {
                    // 仅改变过滤关键字，不影响已选择的具体关卡展示
                    setQueryParams((old) => ({
                      ...old,
                      levelKeyword: kw,
                    }))
                    // 主动触发一次刷新，确保立刻发起查询
                    refreshOperations()
                  }}
                  defaultGame={selectedGame}
                />
                {/* 快捷筛选：如鸢 / 代号鸢 */}
                <ButtonGroup
                  minimal
                  className="flex flex-wrap items-center gap-1 [&>.bp4-button]:!pl-3 [&>.bp4-button]:!pr-2 [&>.bp4-button]:!border-none"
                >
                  {[
                    {
                      label: '只看如鸢',
                      value: '如鸢',
                      icon: IconNames.MANUAL,
                    },
                    {
                      label: '只看代号鸢',
                      value: '代号鸢',
                      icon: IconNames.GLOBE,
                    },
                  ].map(({ label, value, icon }) => (
                    <Button
                      key={label}
                      className="[&>.bp4-icon]:!mr-1 [&>.bp4-icon]:!align-middle"
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
                <UserFilter
                  user={selectedUser}
                  onChange={(user) => {
                    setSelectedUser(user)
                    setQueryParams((old) => ({
                      ...old,
                      uploaderId: user?.id,
                    }))
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <OperatorFilter
                className=""
                filter={operatorFilter}
                onChange={setOperatorFilter}
              />
              <div className="flex flex-wrap items-center ml-auto">
                <H6 className="mb-0 mr-1 opacity-75">
                  {t.components.Operations.sort_by}
                </H6>
                <ButtonGroup minimal className="flex-wrap">
                  {(
                    [
                      {
                        icon: 'flame',
                        text: t.components.Operations.popularity,
                        orderBy: 'hot',
                        active: queryParams.orderBy === 'hot',
                      },
                      {
                        icon: 'time',
                        text: t.components.Operations.newest,
                        orderBy: 'id',
                        active: queryParams.orderBy === 'id',
                      },
                      {
                        icon: 'eye-open',
                        text: t.components.Operations.views,
                        orderBy: 'views',
                        active: queryParams.orderBy === 'views',
                      },
                    ] as const
                  ).map(({ icon, text, orderBy, active }) => (
                    <Button
                      key={orderBy}
                      className={clsx(
                        '!px-2 !py-1 !border-none [&>.bp4-icon]:!mr-1',
                        !active && 'opacity-75 !font-normal',
                      )}
                      icon={icon}
                      intent={active ? 'primary' : 'none'}
                      onClick={() => {
                        setQueryParams((old) => ({ ...old, orderBy }))
                      }}
                    >
                      {text}
                    </Button>
                  ))}
                </ButtonGroup>
              </div>
            </div>
          </>
        )}

        {tab === 'operationSet' && (
          <div className="flex flex-wrap items-center gap-2">
            <InputGroup
              className="max-w-md [&>input]:!rounded-md"
              placeholder={t.components.Operations.search_placeholder}
              leftIcon="search"
              size={64}
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
            <UserFilter
              user={selectedUser}
              onChange={(user) => {
                setSelectedUser(user)
                setQueryParams((old) => ({
                  ...old,
                  uploaderId: user?.id,
                }))
              }}
            />
          </div>
        )}
      </Card>

      <div className="tabular-nums">
        {tab === 'operation' && (
          <OperationList
            {...queryParams}
            multiselect={multiselect}
            operator={operatorFilter.enabled ? operatorFilter : undefined}
            // 按热度排序时列表前几页的变化不会太频繁，可以不刷新第一页，节省点流量
            revalidateFirstPage={queryParams.orderBy !== 'hot'}
          />
        )}
        {tab === 'operationSet' && (
          <OperationSetList
            {...queryParams}
            creatorId={queryParams.uploaderId}
          />
        )}
      </div>
    </>
  )
})
Operations.displayName = 'Operations'
