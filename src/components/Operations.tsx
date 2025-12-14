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

import { UseOperationsParams } from 'apis/operation'
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
import { LevelSelect } from './LevelSelect'
import { OperatorFilter, useOperatorFilter } from './OperatorFilter'
import { withSuspensable } from './Suspensable'
import { UserFilter } from './UserFilter'

import {
  ownedOperatorsAtom,
  filterModeAtom,
  displayModeAtom
} from 'store/ownedOperators'


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

  const primaryBtnClass = "hover:!bg-blue-600 active:!bg-blue-700"
  const normalBtnClass = "hover:!bg-slate-200 dark:hover:!bg-slate-700"

  const handleImportOperators = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. 简单的文件大小限制 (例如限制 2MB)，防止浏览器卡死
    if (file.size > 2 * 1024 * 1024) {
      alert('文件过大，请上传标准格式的干员数据文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const jsonStr = event.target?.result as string
        let json

        // 2. 防止 JSON.parse 报错导致页面崩溃
        try {
          json = JSON.parse(jsonStr)
        } catch (e) {
          alert('文件格式错误：不是有效的 JSON 文件')
          return
        }

        let names: string[] = []

        if (Array.isArray(json)) {
          if (typeof json[0] === 'string') {
            // 格式 ["阿米娅", "陈"]
            names = json
          } else if (typeof json[0] === 'object' && json[0] !== null && 'name' in json[0]) {
            // 格式 [{"name": "阿米娅", "own": true}, ...]
            // 3. 严格校验：只提取 name 且强制转换为 string，防止对象注入
            names = json
              .filter((op: any) => op?.own !== false && typeof op?.name === 'string')
              .map((op: any) => String(op.name).trim()) // 再次防御：去除首尾空格
              .filter((name: string) => /^[a-zA-Z0-9\u4e00-\u9fa5\-\(\)\uff08\uff09]+$/.test(name)) // 4. 可选：正则白名单校验（只允许中英文、数字、括号）
          }
        }

        if (names.length > 0) {
          // 5. 去重，防止大量重复数据
          const uniqueNames = Array.from(new Set(names))
          setOwnedOps(uniqueNames)
          alert(`成功导入 ${uniqueNames.length} 名干员`)
        } else {
          alert('未能识别有效的干员数据，请检查文件格式')
        }
      } catch (err) {
        console.error(err)
        alert('导入过程中发生未知错误')
      }
      // 6. 清空 input value，允许重复上传同一个文件
      e.target.value = ''
    }
    reader.readAsText(file)
  }

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
            <div className="flex flex-wrap items-center gap-2 mt-4 p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
              <div className="relative">
                <input
                  type="file"
                  accept=".json,.txt"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleImportOperators}
                  title="导入干员数据"
                />
                <Button icon="import" text={`导入干员 (${ownedOps.length})`} />
              </div>

              <Divider />

              <ButtonGroup>
                <Button
                  icon={displayMode === 'GRAY' ? 'eye-open' : 'eye-off'}
                  text={displayMode === 'GRAY' ? '置灰模式' : '隐藏模式'}
                  onClick={() => setDisplayMode(v => v === 'GRAY' ? 'HIDE' : 'GRAY')}
                />
              </ButtonGroup>

              <Divider />

              <ButtonGroup>
                <Button
                  icon="confirm"
                  // 如果选中，给蓝色 intent；否则给 none
                  intent={filterMode === 'PERFECT' ? 'primary' : 'none'}
                  active={filterMode === 'PERFECT'}
                  text="完美阵容"
                  onClick={() => setFilterMode(v => v === 'PERFECT' ? 'NONE' : 'PERFECT')}
                  disabled={ownedOps.length === 0}
                  // 添加 className 修复 Hover 颜色
                  className={filterMode === 'PERFECT' ? primaryBtnClass : normalBtnClass}
                />
                <Button
                  icon="people"
                  intent={filterMode === 'SUPPORT' ? 'primary' : 'none'}
                  active={filterMode === 'SUPPORT'}
                  text="允许助战"
                  onClick={() => setFilterMode(v => v === 'SUPPORT' ? 'NONE' : 'SUPPORT')}
                  disabled={ownedOps.length === 0}
                  className={filterMode === 'SUPPORT' ? primaryBtnClass : normalBtnClass}
                />
              </ButtonGroup>
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
