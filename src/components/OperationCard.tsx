import { Button, Card, Elevation, H4, H5, Icon, Tag } from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'

import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { CopilotInfoStatusEnum } from 'maa-copilot-client'
import { copyShortCode, handleLazyDownloadJSON } from 'services/operation'

import { RelativeTime } from 'components/RelativeTime'
import { AddToOperationSetButton } from 'components/operation-set/AddToOperationSet'
import { OperationRating } from 'components/viewer/OperationRating'
import { OpDifficulty, Operation } from 'models/operation'
import {
  displayModeAtom,
  filterModeAtom,
  ownedOperatorsAtom,
} from 'store/ownedOperators'

import { useLevels } from '../apis/level'
import { languageAtom, useTranslation } from '../i18n/i18n'
import { createCustomLevel, findLevelByStageName } from '../models/level'
import { getLocalizedOperatorName } from '../models/operator'
import { Paragraphs } from './Paragraphs'
import { ReLinkRenderer } from './ReLink'
import { UserName } from './UserName'
import { EDifficulty } from './entity/EDifficulty'
import { EDifficultyLevel, NeoELevel } from './entity/ELevel'

const formatMissingName = (name: string, lang: string) => {
  if (name.startsWith('[') && name.endsWith(']')) {
    return name
  }
  return getLocalizedOperatorName(name, lang)
}

/**
 * 检查算法逻辑：
 * 1. 优先满足干员需求
 * 2. 剩余的持有干员，用于满足 groups
 * 3. 组的分配策略采用“最少候选优先”(Least Restricted First)：
 *    如果组A只能由【干员X】满足，而组B能由【干员X, Y, Z】满足，
 *    必须先把 X 分给 A，否则 A 就没人了。
 */
export const useOperationAvailability = (operation: Operation) => {
  const ownedOps = useAtomValue(ownedOperatorsAtom) // string[] 用户拥有的干员名列表
  const filterMode = useAtomValue(filterModeAtom) // 'NONE' | 'PERFECT' | 'SUPPORT'

  // 0. 基础检查：无数据或不筛选
  if (!ownedOps || ownedOps.length === 0 || filterMode === 'NONE') {
    return { isAvailable: true, missingCount: 0, missingOps: [] }
  }

  const { opers: requiredOps = [], groups: requiredGroups = [] } = operation.parsedContent

  if (requiredOps.length === 0 && requiredGroups.length === 0) {
    return { isAvailable: true, missingCount: 0, missingOps: [] }
  }

  const usedOwnedOps = new Set<string>()
  const missingDetails: string[] = []

  // 处理干员
  requiredOps.forEach((op) => {
    const opName = op.name
    if (ownedOps.includes(opName) && !usedOwnedOps.has(opName)) {
      usedOwnedOps.add(opName)
    } else {
      missingDetails.push(opName)
    }
  })

  // 处理干员组
  if (requiredGroups.length > 0) {
    // 找出每个组在“当前剩余可用干员”中的所有候选人
    const availablePool = new Set(
      ownedOps.filter((name) => !usedOwnedOps.has(name))
    )

    let groupProcessList = requiredGroups.map((group) => {
      const allowedNames = (group.opers || []).map((o) => o.name)
      const candidates = allowedNames.filter((name) => availablePool.has(name))
      return {
        name: group.name || '未命名干员组',
        candidates: candidates, // string[]
      }
    })

    // 排序：优先处理“候选人最少”的组 (贪心策略)
    groupProcessList.sort((a, b) => a.candidates.length - b.candidates.length)

    groupProcessList.forEach((groupItem) => {
      const validCandidate = groupItem.candidates.find((name) => availablePool.has(name))

      if (validCandidate) {
        availablePool.delete(validCandidate)
        usedOwnedOps.add(validCandidate)
      } else {
        missingDetails.push(`[${groupItem.name}]`)
      }
    })
  }

  const missingCount = missingDetails.length
  let isAvailable = true

  // 完美模式
  if (filterMode === 'PERFECT' && missingCount > 0) {
    isAvailable = false
  }
  // 助战模式
  else if (filterMode === 'SUPPORT' && missingCount > 1) {
    isAvailable = false
  }

  return {
    isAvailable,
    missingCount,
    missingOps: missingDetails,
  }
}

export const NeoOperationCard = ({
  operation,
  selected,
  selectable,
  onSelect,
}: {
  operation: Operation
  selectable?: boolean
  selected?: boolean
  onSelect?: (operation: Operation, selected: boolean) => void
}) => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)
  const { data: levels } = useLevels()

  // --- 筛选逻辑 ---
  const { isAvailable, missingCount, missingOps } =
    useOperationAvailability(operation)
  const displayMode = useAtomValue(displayModeAtom)
  const filterMode = useAtomValue(filterModeAtom)

  if (!isAvailable && displayMode === 'HIDE') {
    return null
  }

  const isGrayed = !isAvailable && displayMode === 'GRAY'

  const showMissingInfo =
    !isAvailable || (filterMode === 'SUPPORT' && missingCount === 1)

  return (
    <li className="relative">
      <ReLinkRenderer
        search={{ op: operation.id }}
        render={({ onClick, onKeyDown }) => (
          <Card
            interactive
            className={clsx(
              'h-full flex flex-col gap-2 transition-all duration-200',
              // 应用置灰样式
              isGrayed &&
                'opacity-40 grayscale hover:opacity-90 hover:grayscale-0',
            )}
            elevation={Elevation.TWO}
            tabIndex={0}
            onClick={onClick}
            onKeyDown={onKeyDown}
          >
            <Tooltip2
              content={operation.parsedContent.doc.title}
              className="whitespace-nowrap overflow-hidden text-ellipsis"
            >
              <H4 className="p-0 m-0 mr-20 flex items-center overflow-hidden">
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                  {operation.parsedContent.doc.title}
                </span>
                {operation.status === CopilotInfoStatusEnum.Private && (
                  <Tag minimal className="ml-2 shrink-0 font-normal opacity-75">
                    {t.components.OperationCard.private}
                  </Tag>
                )}
              </H4>
            </Tooltip2>

            <div className="flex items-center text-slate-900">
              <NeoELevel
                level={
                  findLevelByStageName(
                    levels,
                    operation.parsedContent.stageName,
                  ) || createCustomLevel(operation.parsedContent.stageName)
                }
              />
              <EDifficulty
                difficulty={
                  operation.parsedContent.difficulty ?? OpDifficulty.UNKNOWN
                }
              />
            </div>

            {showMissingInfo && (
              <div className="flex items-center gap-2 text-sm font-bold">
                {filterMode === 'SUPPORT' && missingCount === 1 ? (
                  <span className="text-amber-600 dark:text-amber-500 flex items-center">
                    <Icon icon="people" className="mr-1" />
                    {t.components.OperationCard.need_support({ name: formatMissingName(missingOps[0], language) })}
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-500 flex items-center">
                    <Icon icon="cross" className="mr-1" />
                    {t.components.OperationCard.missing_operators({
                      count: missingCount,
                    })}
                  </span>
                )}
              </div>
            )}

            <div className="grow text-gray-700 leading-normal">
              <Paragraphs
                content={operation.parsedContent.doc.details}
                limitHeight={21 * 13.5} // 13 lines, 21px per line; the extra 0.5 line is intentional so the `mask` effect is obvious
              />
            </div>

            <div className="text-sm text-zinc-600 dark:text-slate-100 font-bold">
              {t.components.OperationCard.operators_and_groups}
            </div>
            <OperatorTags operation={operation} />

            <div className="flex">
              <div className="flex items-center gap-1.5">
                <Icon icon="star" />
                <OperationRating
                  className="text-sm"
                  operation={operation}
                  layout="horizontal"
                />
              </div>
              <div className="flex-1" />

              <Tooltip2
                placement="top"
                content={t.components.OperationCard.views_count({
                  count: operation.views,
                })}
              >
                <div>
                  <Icon icon="eye-open" className="mr-1.5" />
                  <span>{operation.views}</span>
                </div>
              </Tooltip2>
            </div>

            <div className="flex">
              <div>
                <Icon icon="time" className="mr-1.5" />
                <RelativeTime
                  Tooltip2Props={{ placement: 'top' }}
                  moment={operation.uploadTime}
                />
              </div>
              <div className="flex-1" />
              <div className="text-zinc-500">
                <Icon icon="user" className="mr-1.5" />
                <UserName userId={operation.uploaderId}>
                  {operation.uploader}
                </UserName>
              </div>
            </div>
          </Card>
        )}
      />

      <CardActions
        className="absolute top-4 right-4"
        operation={operation}
        selectable={selectable}
        selected={selected}
        onSelect={onSelect}
      />
    </li>
  )
}

export const OperationCard = ({ operation }: { operation: Operation }) => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)
  const { data: levels } = useLevels()

  // --- 筛选逻辑 ---
  const { isAvailable, missingCount, missingOps } =
    useOperationAvailability(operation)
  const displayMode = useAtomValue(displayModeAtom)
  const filterMode = useAtomValue(filterModeAtom)

  if (!isAvailable && displayMode === 'HIDE') {
    return null
  }

  const isGrayed = !isAvailable && displayMode === 'GRAY'
  const showMissingInfo =
    !isAvailable || (filterMode === 'SUPPORT' && missingCount === 1)

  return (
    <li className="mb-4 sm:mb-2 last:mb-0 relative">
      <ReLinkRenderer
        search={{ op: operation.id }}
        render={({ onClick, onKeyDown }) => (
          <Card
            interactive
            elevation={Elevation.TWO}
            tabIndex={0}
            onClick={onClick}
            onKeyDown={onKeyDown}
            className={clsx(
              // 应用置灰样式
              isGrayed &&
                'opacity-40 grayscale hover:opacity-90 hover:grayscale-0',
            )}
          >
            <div className="flex flex-wrap mb-4 sm:mb-2">
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <H4 className="inline-block pb-1 border-b-2 border-zinc-200 border-solid mb-2">
                    {operation.parsedContent.doc.title}
                    {operation.status === CopilotInfoStatusEnum.Private && (
                      <Tag minimal className="ml-2 font-normal opacity-75">
                        {t.components.OperationCard.private}
                      </Tag>
                    )}
                  </H4>
                </div>
                <H5 className="flex items-center text-slate-900 -mt-3">
                  <EDifficultyLevel
                    level={
                      findLevelByStageName(
                        levels,
                        operation.parsedContent.stageName,
                      ) || createCustomLevel(operation.parsedContent.stageName)
                    }
                    difficulty={operation.parsedContent.difficulty}
                  />
                </H5>

                {showMissingInfo && (
                  <div className="text-sm font-bold">
                    {filterMode === 'SUPPORT' && missingCount === 1 ? (
                      <span className="text-amber-600 dark:text-amber-500 flex items-center">
                        <Icon icon="people" className="mr-1" />
                        {t.components.OperationCard.need_support({ name: formatMissingName(missingOps[0], language) })}
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-500 flex items-center">
                        <Icon icon="cross" className="mr-1" />
                        {(() => {
                          const listStr =
                            missingOps
                              .slice(0, 3)
                              .map((name) => formatMissingName(name, language))
                              .join(', ') + (missingCount > 3 ? '...' : '')
                          return t.components.OperationCard.missing_operators_list(
                            {
                              count: missingCount,
                              list: listStr,
                            },
                          )
                        })()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="grow basis-full xl:basis-0" />

              {/* meta */}
              <div className="flex flex-wrap items-start gap-x-4 gap-y-1 text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Icon icon="star" />
                  <OperationRating
                    className="text-sm"
                    operation={operation}
                    layout="horizontal"
                  />
                </div>

                <Tooltip2
                  placement="top"
                  content={t.components.OperationCard.views_count({
                    count: operation.views,
                  })}
                >
                  <div>
                    <Icon icon="eye-open" className="mr-1.5" />
                    <span>{operation.views}</span>
                  </div>
                </Tooltip2>

                <div>
                  <Icon icon="time" className="mr-1.5" />
                  <RelativeTime
                    Tooltip2Props={{ placement: 'top' }}
                    moment={operation.uploadTime}
                  />
                </div>

                <div>
                  <Icon icon="user" className="mr-1.5" />
                  <UserName userId={operation.uploaderId}>
                    {operation.uploader}
                  </UserName>
                </div>
              </div>
            </div>
            <div className="flex md:flex-row flex-col gap-4">
              <div className="text-gray-700 leading-normal md:w-1/2">
                <Paragraphs
                  content={operation.parsedContent.doc.details}
                  limitHeight={21 * 13.5} // 13 lines, 21px per line; the extra 0.5 line is intentional so the `mask` effect is obvious
                />
              </div>
              <div className="md:w-1/2">
                <div className="text-sm text-zinc-600 dark:text-slate-100 mb-2 font-bold">
                  {t.components.OperationCard.operators_and_groups}
                </div>
                <OperatorTags operation={operation} />
              </div>
            </div>
          </Card>
        )}
      />
      <CardActions
        className="absolute top-4 xl:top-12 right-[18px]"
        operation={operation}
      />
    </li>
  )
}

const OperatorTags = ({ operation }: { operation: Operation }) => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)
  const { opers, groups } = operation.parsedContent

  return opers?.length || groups?.length ? (
    <div>
      {opers?.map(({ name, skill }, index) => (
        <Tag key={index} className="mr-2 last:mr-0 mb-1 last:mb-0">
          {`${getLocalizedOperatorName(name, language)} ${skill ?? 1}`}
        </Tag>
      ))}
      {groups?.map(({ name, opers }, index) => (
        <Tooltip2
          key={index}
          className="mr-2 last:mr-0 mb-1 last:mb-0"
          placement="top"
          content={
            opers
              ?.map(
                ({ name, skill }) =>
                  `${getLocalizedOperatorName(name, language)} ${skill ?? 1}`,
              )
              .join(', ') || t.components.OperationCard.no_operators
          }
        >
          <Tag>[{name}]</Tag>
        </Tooltip2>
      ))}
    </div>
  ) : (
    <div className="text-gray-500">{t.components.OperationCard.no_records}</div>
  )
}

const CardActions = ({
  className,
  operation,
  selected,
  selectable,
  onSelect,
}: {
  className?: string
  operation: Operation
  selectable?: boolean
  selected?: boolean
  onSelect?: (operation: Operation, selected: boolean) => void
}) => {
  const t = useTranslation()
  return selectable ? (
    <Button
      small
      minimal={!selected}
      outlined={!selected}
      intent="primary"
      className="absolute top-4 right-4"
      icon={selected ? 'tick' : 'blank'}
      onClick={() => onSelect?.(operation, !selected)}
    />
  ) : (
    <div className={clsx('flex gap-1', className)}>
      <Tooltip2
        placement="bottom"
        content={
          <div className="max-w-sm dark:text-slate-900">
            {t.components.OperationCard.download_json}
          </div>
        }
      >
        <Button
          small
          icon="download"
          onClick={() =>
            handleLazyDownloadJSON(
              operation.id,
              operation.parsedContent.doc.title,
            )
          }
        />
      </Tooltip2>
      <Tooltip2
        placement="bottom"
        content={
          <div className="max-w-sm dark:text-slate-900">
            {t.components.OperationCard.copy_secret_code}
          </div>
        }
      >
        <Button
          small
          icon="clipboard"
          onClick={() => copyShortCode(operation)}
        />
      </Tooltip2>
      <Tooltip2
        placement="bottom"
        content={
          <div className="max-w-sm dark:text-slate-900">
            {t.components.OperationCard.add_to_job_set}
          </div>
        }
      >
        <AddToOperationSetButton
          small
          icon="plus"
          operationIds={[operation.id]}
        />
      </Tooltip2>
    </div>
  )
}
