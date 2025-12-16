import { Button, Card, Elevation, H4, H5, Icon, Tag } from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'

import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { CopilotInfoStatusEnum } from 'maa-copilot-client'
import { copyShortCode, handleLazyDownloadJSON } from 'services/operation'

import { OperatorAvatar } from 'components/OperatorAvatar'
import { RelativeTime } from 'components/RelativeTime'
import { AddToOperationSetButton } from 'components/operation-set/AddToOperationSet'
import { OperationRating } from 'components/viewer/OperationRating'
import { OpDifficulty, Operation } from 'models/operation'

import { useLevels } from '../apis/level'
import { languageAtom, useTranslation } from '../i18n/i18n'
import { createCustomLevel, findLevelByStageName } from '../models/level'
import { getLocalizedOperatorName } from '../models/operator'
import { Paragraphs } from './Paragraphs'
import { ReLinkRenderer } from './ReLink'
import { UserName } from './UserName'
import { EDifficulty } from './entity/EDifficulty'
import { EDifficultyLevel, NeoELevel } from './entity/ELevel'

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

  return (
    <li className="relative">
      <ReLinkRenderer
        search={{ op: operation.id }}
        render={({ onClick, onKeyDown }) => (
          <Card
            interactive
            className="h-full flex flex-col gap-2"
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

  const hasContent = opers?.length || groups?.length

  if (!hasContent) {
    return (
      <div className="text-gray-500">
        {t.components.OperationCard.no_records}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {/* 渲染干员头像 */}
      {opers?.map(({ name, skill }, index) => {
        const displayName = getLocalizedOperatorName(name, language)
        return (
          <Tooltip2
            key={`op-${index}`}
            content={`${displayName} ${skill ? skill : ''}`}
            placement="top"
          >
            <div className="relative group cursor-pointer transition-transform hover:-translate-y-0.5">
              <OperatorAvatar
                name={name}
                sourceSize={96} // 使用高清图以适应稍大的尺寸
                className="w-10 h-10 shadow-sm" // 40px 大小
              />
              {/* 技能角标 */}
              {skill && (
                <div className="absolute bottom-0 right-0 bg-slate-800/90 text-white text-[10px] px-1 leading-tight rounded-tl-sm font-mono border-t border-l border-white/20 pointer-events-none">
                  {skill}
                </div>
              )}
            </div>
          </Tooltip2>
        )
      })}

      {/* 渲染干员组 (保留 Tag 样式，但调整大小以对齐) */}
      {groups?.map(({ name, opers }, index) => (
        <Tooltip2
          key={`group-${index}`}
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
          <div className="h-10 px-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm cursor-help hover:-translate-y-0.5 transition-transform">
            [{name}]
          </div>
        </Tooltip2>
      ))}
    </div>
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
