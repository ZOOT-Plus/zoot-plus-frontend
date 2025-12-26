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

// --- 检查作业可用性的 Hook ---
const useOperationAvailability = (operation: Operation) => {
  const ownedOps = useAtomValue(ownedOperatorsAtom)
  const filterMode = useAtomValue(filterModeAtom)

  // 如果没有导入干员或未开启筛选，默认可用
  if (ownedOps.length === 0 || filterMode === 'NONE') {
    return { isAvailable: true, missingCount: 0, missingOps: [] }
  }

  const { opers } = operation.parsedContent
  if (!opers || opers.length === 0) {
    return { isAvailable: true, missingCount: 0, missingOps: [] }
  }

  // 找出缺少的干员
  const missingOps = opers
    .map((o) => o.name)
    .filter((name) => !ownedOps.includes(name))

  const missingCount = missingOps.length
  let isAvailable = true

  // 完美模式：缺任何一个都不行
  if (filterMode === 'PERFECT' && missingCount > 0) {
    isAvailable = false
  }
  // 助战模式：允许缺1个，但缺2个以上不可用
  else if (filterMode === 'SUPPORT' && missingCount > 1) {
    isAvailable = false
  }

  return { isAvailable, missingCount, missingOps }
}
// ------------------------------------

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
  const { data: levels } = useLevels()

  // --- 筛选逻辑 ---
  const { isAvailable, missingCount, missingOps } =
    useOperationAvailability(operation)
  const displayMode = useAtomValue(displayModeAtom)
  const filterMode = useAtomValue(filterModeAtom)

  // 隐藏模式：只有真正不可用时才隐藏
  // (如果是助战模式缺1人，isAvailable是true，所以不会被隐藏，符合预期)
  if (!isAvailable && displayMode === 'HIDE') {
    return null
  }

  // 置灰模式：不可用时置灰
  const isGrayed = !isAvailable && displayMode === 'GRAY'

  // 是否显示提示信息：不可用 OR (助战模式且缺1人)
  const showMissingInfo =
    !isAvailable || (filterMode === 'SUPPORT' && missingCount === 1)
  // ----------------

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

            {/* --- 缺人状态提示 --- */}
            {showMissingInfo && (
              <div className="flex items-center gap-2 text-sm font-bold">
                {filterMode === 'SUPPORT' && missingCount === 1 ? (
                  <span className="text-amber-600 dark:text-amber-500 flex items-center">
                    <Icon icon="people" className="mr-1" /> 需助战:{' '}
                    {missingOps[0]}
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-500 flex items-center">
                    <Icon icon="cross" className="mr-1" /> 缺 {missingCount} 人
                  </span>
                )}
              </div>
            )}
            {/* ------------------- */}

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
  // ----------------

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
              {/* title */}
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

                {/* --- 缺人状态提示 --- */}
                {showMissingInfo && (
                  <div className="text-sm font-bold">
                    {filterMode === 'SUPPORT' && missingCount === 1 ? (
                      <span className="text-amber-600 dark:text-amber-500 flex items-center">
                        <Icon icon="people" className="mr-1" /> 需助战:{' '}
                        {missingOps[0]}
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-500 flex items-center">
                        <Icon icon="cross" className="mr-1" /> 缺 {missingCount}{' '}
                        人: {missingOps.slice(0, 3).join(', ')}
                        {missingCount > 3 ? '...' : ''}
                      </span>
                    )}
                  </div>
                )}
                {/* ------------------- */}
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
