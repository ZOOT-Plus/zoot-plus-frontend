import {
  Button,
  ButtonGroup,
  Card,
  Divider,
  H6,
  Icon,
  IconName,
  InputGroup,
  Tab,
  Tabs,
} from '@blueprintjs/core'

import { UseOperationsParams } from 'apis/operation'
import clsx from 'clsx'
import { useAtom } from 'jotai'
import { debounce } from 'lodash-es'
import { MaaUserInfo } from 'maa-copilot-client'
import { ComponentType, useMemo, useState } from 'react'

import { CardTitle } from 'components/CardTitle'
import { OperationList } from 'components/OperationList'
import { OperationSetList } from 'components/OperationSetList'
// 确保这里的引用指向了使用 atomWithStorage 的文件
import {
  displayModeAtom,
  filterModeAtom,
  ownedOperatorsAtom,
} from 'store/ownedOperators'
import { neoLayoutAtom } from 'store/pref'

import { useTranslation } from '../i18n/i18n'
import { LevelSelect } from './LevelSelect'
import { OperatorFilter, useOperatorFilter } from './OperatorFilter'
import { withSuspensable } from './Suspensable'
import { UserFilter } from './UserFilter'

// --- [样式复刻] 自定义按钮组件 ---
const PrtsBtn = ({
  icon,
  text,
  active,
  onClick,
  disabled,
}: {
  icon: IconName
  text: string
  active?: boolean
  onClick?: () => void
  disabled?: boolean
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center px-3 py-1.5 min-h-[30px] mr-1',
        'text-sm font-normal leading-none rounded-[3px]',
        'transition-colors duration-100 ease-[cubic-bezier(0.4,1,0.75,0.9)] select-none',

        // 1. 默认状态 (未激活 & 未禁用)
        !active &&
        !disabled &&
        clsx(
          'bg-transparent text-[#5c7080] dark:text-[#a7b6c2]',
          // 自身 Hover
          'hover:bg-[#a7b6c2]/30 dark:hover:bg-[#8a9ba8]/15 hover:text-[#1c2127] dark:hover:text-[#f5f8fa]',
          // 父级 Group Hover (用于文件上传)
          'group-hover:bg-[#a7b6c2]/30 dark:group-hover:bg-[#8a9ba8]/15 group-hover:text-[#1c2127] dark:group-hover:text-[#f5f8fa]',
        ),

        // 2. 激活状态
        active &&
        'bg-[#a7b6c2]/30 dark:bg-[#8a9ba8]/15 text-[#2563eb] dark:text-[#60a5fa] font-semibold',

        // 3. 禁用状态
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <Icon icon={icon} size={16} className="mr-[7px] opacity-90" />
      <span>{text}</span>
    </button>
  )
}

const PrtsDivider = () => (
  <div className="mx-2 inline-block h-4 w-[1px] bg-[#10161a]/15 dark:bg-white/15" />
)

export const Operations: ComponentType = withSuspensable(() => {
  const t = useTranslation()
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

  const [ownedOps, setOwnedOps] = useAtom(ownedOperatorsAtom)
  const [filterMode, setFilterMode] = useAtom(filterModeAtom)
  const [displayMode, setDisplayMode] = useAtom(displayModeAtom)

  const handleImportOperators = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. 简单的文件大小限制 (例如限制 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert(t.components.Operations.import_too_large)
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const jsonStr = event.target?.result as string
        let json

        // 2. 防止 JSON.parse 报错
        try {
          json = JSON.parse(jsonStr)
        } catch (e) {
          alert(t.components.Operations.import_invalid_json)
          return
        }

        let names: string[] = []

        if (Array.isArray(json)) {
          if (typeof json[0] === 'string') {
            names = json
          } else if (
            typeof json[0] === 'object' &&
            json[0] !== null &&
            'name' in json[0]
          ) {
            // 3. 严格校验
            names = json
              .filter(
                (op: any) => op?.own !== false && typeof op?.name === 'string',
              )
              .map((op: any) => String(op.name).trim())
              .filter((name: string) =>
                /^[a-zA-Z0-9\u4e00-\u9fa5\-\(\)\uff08\uff09]+$/.test(name),
              )
          }
        }

        if (names.length > 0) {
          // 5. 去重
          const uniqueNames = Array.from(new Set(names))
          setOwnedOps(uniqueNames)
          // 注意：t 函数支持插值，需要在 translations.json 中配置 {{count}}
          alert(
            t.components.Operations.import_success({
              count: uniqueNames.length,
            }),
          )
        } else {
          alert(t.components.Operations.import_no_valid_data)
        }
      } catch (err) {
        console.error(err)
        alert(t.components.Operations.import_unknown_error)
      }
      // 6. 清空 input value
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <>
      <Card className="mb-4 flex flex-col">
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
            <Divider className="h-[1em] self-center" />
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
              <div className="flex flex-wrap gap-1">
                <LevelSelect
                  value={queryParams.levelKeyword ?? ''}
                  onChange={(level) =>
                    setQueryParams((old) => ({
                      ...old,
                      levelKeyword: level,
                    }))
                  }
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
            </div>

            {/* --- 筛选控制栏 --- */}
            <div className="mt-3 mb-2 flex w-full flex-wrap items-center pl-[2px]">
              {/* 导入按钮区域 */}
              <div className="group relative mr-1 inline-flex">
                <input
                  type="file"
                  accept=".json,.txt"
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  onChange={handleImportOperators}
                  title={t.components.Operations.import_btn}
                />
                <PrtsBtn
                  icon="import"
                  text={
                    ownedOps.length > 0
                      ? t.components.Operations.import_btn_count({
                        count: ownedOps.length,
                      })
                      : t.components.Operations.import_btn
                  }
                />
              </div>

              <PrtsBtn
                icon={displayMode === 'GRAY' ? 'eye-open' : 'eye-off'}
                text={
                  displayMode === 'GRAY'
                    ? t.components.Operations.mode_gray
                    : t.components.Operations.mode_hide
                }
                onClick={() =>
                  setDisplayMode((v) => (v === 'GRAY' ? 'HIDE' : 'GRAY'))
                }
              />

              <PrtsDivider />

              <PrtsBtn
                icon="confirm"
                text={t.components.Operations.perfect_team}
                active={filterMode === 'PERFECT'}
                onClick={() =>
                  setFilterMode((v) => (v === 'PERFECT' ? 'NONE' : 'PERFECT'))
                }
                disabled={ownedOps.length === 0}
              />

              <PrtsBtn
                icon="people"
                text={t.components.Operations.allow_support}
                active={filterMode === 'SUPPORT'}
                onClick={() =>
                  setFilterMode((v) => (v === 'SUPPORT' ? 'NONE' : 'SUPPORT'))
                }
                disabled={ownedOps.length === 0}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4">
              <OperatorFilter
                className=""
                filter={operatorFilter}
                onChange={setOperatorFilter}
              />
              <div className="ml-auto flex flex-wrap items-center">
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
