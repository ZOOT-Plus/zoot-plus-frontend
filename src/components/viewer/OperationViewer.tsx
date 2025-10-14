import {
  Button,
  ButtonGroup,
  Callout,
  Card,
  Collapse,
  Elevation,
  H3,
  H4,
  H6,
  Icon,
  Menu,
  MenuDivider,
  MenuItem,
  NonIdealState,
  Tag,
} from '@blueprintjs/core'
import { Popover2, Tooltip2 } from '@blueprintjs/popover2'
import { ErrorBoundary } from '@sentry/react'

import {
  banComments,
  deleteOperation,
  rateOperation,
  useOperation,
  useRefreshOperations,
} from 'apis/operation'
import clsx from 'clsx'
import { useAtom } from 'jotai'
import {
  BanCommentsStatusEnum,
  CopilotInfoStatusEnum,
} from 'maa-copilot-client'
import { ComponentType, FC, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { copyShortCode, handleDownloadJSON } from 'services/operation'

import { FactItem } from 'components/FactItem'
import { Paragraphs } from 'components/Paragraphs'
import { RelativeTime } from 'components/RelativeTime'
import { withSuspensable } from 'components/Suspensable'
import { AppToaster } from 'components/Toaster'
import { DrawerLayout } from 'components/drawer/DrawerLayout'
import { EDifficultyLevel } from 'components/entity/ELevel'
import { OperationRating } from 'components/viewer/OperationRating'
import { OpRatingType, Operation } from 'models/operation'
import { toShortCode } from 'models/shortCode'
import { authAtom } from 'store/auth'
import { wrapErrorMessage } from 'utils/wrapErrorMessage'

import { useLevels } from '../../apis/level'
import { i18nDefer, useTranslation } from '../../i18n/i18n'
import { CopilotDocV1 } from '../../models/copilot.schema'
import { createCustomLevel, findLevelByStageName } from '../../models/level'
import { Level } from '../../models/operation'
import {
  OPERATORS,
  getModuleName,
  useLocalizedOperatorName,
  withDefaultRequirements,
} from '../../models/operator'
import { formatError } from '../../utils/error'
import { Confirm } from '../Confirm'
import { OperatorAvatar } from '../OperatorAvatar'
import { ReLinkRenderer } from '../ReLink'
import { UserName } from '../UserName'
import { CommentArea } from './comment/CommentArea'
import { ActionSequenceViewer } from './ActionSequenceViewer'

const ManageMenu: FC<{
  operation: Operation
  onRevalidateOperation: () => void
  onDelete: () => void
}> = ({ operation, onRevalidateOperation, onDelete }) => {
  const t = useTranslation()
  const refreshOperations = useRefreshOperations()

  const handleBanComments = async (status: BanCommentsStatusEnum) => {
    await wrapErrorMessage(
      (e) =>
        t.components.viewer.OperationViewer.operation_failed({
          error: formatError(e),
        }),
      banComments({ operationId: operation.id, status }),
    ).catch(console.warn)

    onRevalidateOperation()
  }

  const handleDelete = async () => {
    try {
      await wrapErrorMessage(
        (e) =>
          t.components.viewer.OperationViewer.delete_failed({
            error: formatError(e),
          }),
        deleteOperation({ id: operation.id }),
      )

      refreshOperations()

      AppToaster.show({
        intent: 'success',
        message: t.components.viewer.OperationViewer.delete_success,
      })
      onDelete()
    } catch (e) {
      console.warn(e)
    }
  }

  return (
    <>
      <Menu>
        {/* <ReLinkRenderer
          className="hover:text-inherit hover:no-underline"
          to={`/create/${operation.id}`}
          target="_blank"
          render={({ className, ...props }) => (
            <MenuItem
              icon="edit"
              text={t.components.viewer.OperationViewer.modify_task}
              {...props}
            />
          )}
        /> */}
        <ReLinkRenderer
          className="hover:text-inherit hover:no-underline"
          to={`/editor/${operation.id}`}
          target="_blank"
          render={({ className, ...props }) => (
            <MenuItem
              icon="edit"
              text={t.components.viewer.OperationViewer.modify_task_v2}
              {...props}
            />
          )}
        />
        {operation.commentStatus === BanCommentsStatusEnum.Enabled && (
          <Confirm
            intent="danger"
            trigger={({ handleClick }) => (
              <MenuItem
                icon="comment"
                text={t.components.viewer.OperationViewer.close_comments}
                shouldDismissPopover={false}
                onClick={handleClick}
              />
            )}
            onConfirm={() => handleBanComments(BanCommentsStatusEnum.Disabled)}
          >
            <H6>{t.components.viewer.OperationViewer.close_comments}</H6>
            <p>{t.components.viewer.OperationViewer.confirm_close_comments}</p>
            <p>
              {t.components.viewer.OperationViewer.existing_comments_preserved}
            </p>
          </Confirm>
        )}
        {operation.commentStatus === BanCommentsStatusEnum.Disabled && (
          <Confirm
            trigger={({ handleClick }) => (
              <MenuItem
                icon="comment"
                text={t.components.viewer.OperationViewer.open_comments}
                shouldDismissPopover={false}
                onClick={handleClick}
              />
            )}
            onConfirm={() => handleBanComments(BanCommentsStatusEnum.Enabled)}
          >
            <H6>{t.components.viewer.OperationViewer.open_comments}</H6>
            <p>{t.components.viewer.OperationViewer.confirm_open_comments}</p>
          </Confirm>
        )}
        <MenuDivider />
        <Confirm
          intent="danger"
          confirmButtonText={t.components.viewer.OperationViewer.delete}
          repeats={3}
          onConfirm={handleDelete}
          trigger={({ handleClick }) => (
            <MenuItem
              icon="delete"
              intent="danger"
              text={t.components.viewer.OperationViewer.delete_task}
              shouldDismissPopover={false}
              onClick={handleClick}
            />
          )}
        >
          <H4>{t.components.viewer.OperationViewer.delete_task}</H4>
          <p>{t.components.viewer.OperationViewer.confirm_delete_task}</p>
          <p>{t.components.viewer.OperationViewer.three_confirmations}</p>
        </Confirm>
      </Menu>
    </>
  )
}

export const OperationViewer: ComponentType<{
  operationId: Operation['id']
  onCloseDrawer: () => void
}> = withSuspensable(
  function OperationViewer({ operationId, onCloseDrawer }) {
    const t = useTranslation()
    const navigate = useNavigate()
    const {
      data: operation,
      error,
      mutate,
    } = useOperation({
      id: operationId,
      suspense: true,
    })

    useEffect(() => {
      // on finished loading, scroll to #fragment if any
      if (operation) {
        const fragment = window.location.hash
        if (fragment) {
          const el = document.querySelector(fragment)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' })
          }
        }
      }
    }, [operation])

    const { data: levels } = useLevels()

    const [auth] = useAtom(authAtom)

    // make eslint happy: we got Suspense out there
    if (!operation) throw new Error('unreachable')

    useEffect(() => {
      if (error) {
        AppToaster.show({
          intent: 'danger',
          message: t.components.viewer.OperationViewer.refresh_failed({
            error: formatError(error),
          }),
        })
      }
    }, [error, t])

    const handleRating = async (decision: OpRatingType) => {
      // cancel rating if already rated by the same type
      if (decision === operation.ratingType) {
        decision = OpRatingType.None
      }

      wrapErrorMessage(
        (e) =>
          t.components.viewer.OperationViewer.submit_rating_failed({
            error: formatError(e),
          }),
        mutate(async (val) => {
          await rateOperation({
            id: operationId,
            rating: decision,
          })
          return val
        }),
      ).catch(console.warn)
    }

    const handleCopyToEditor = () => {
      const shortCode = toShortCode({ id: operation.id })
      onCloseDrawer()
      navigate(`/editor?shortcode=${encodeURIComponent(shortCode)}`)
    }

    return (
      <DrawerLayout
        title={
          <>
            <Icon icon="document" />
            <span className="ml-2">
              {t.components.viewer.OperationViewer.maa_copilot_task}
            </span>

            <div className="flex-1" />

            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              {operation.uploaderId === auth.userId && (
                // 使用 Portal 渲染，避免被头部容器裁剪/遮挡；提升层级与全局样式一致
                <Popover2
                  content={
                    <ManageMenu
                      operation={operation}
                      onRevalidateOperation={() => mutate()}
                      onDelete={() => onCloseDrawer()}
                    />
                  }
                  usePortal={true}
                  // 仅对本弹层提升层级，避免被 Drawer 内容遮挡
                  portalClassName="operation-viewer-portal"
                >
                  <Button
                    icon="wrench"
                    text={t.components.viewer.OperationViewer.manage}
                    rightIcon="caret-down"
                  />
                </Popover2>
              )}

              {/* <Button
                icon="download"
                text={t.components.viewer.OperationViewer.download_json}
                onClick={() => handleDownloadJSON(operation.parsedContent)}
              /> */}

              <Button
                icon="clipboard"
                text={t.components.viewer.OperationViewer.copy_secret_code}
                intent="primary"
                onClick={() => copyShortCode(operation)}
              />

              <Button
                icon="share"
                text={t.components.viewer.OperationViewer.copy_to_editor_v2}
                intent="primary"
                onClick={handleCopyToEditor}
              />
            </div>
          </>
        }
      >
        <ErrorBoundary
          fallback={
            <NonIdealState
              icon="issue"
              title={t.components.viewer.OperationViewer.render_error}
              description={t.components.viewer.OperationViewer.render_problem}
            />
          }
        >
          <OperationViewerInner
            levels={levels}
            operation={operation}
            handleRating={handleRating}
          />
        </ErrorBoundary>
      </DrawerLayout>
    )
  },
  {
    pendingTitle: i18nDefer.components.viewer.OperationViewer.loading_task,
  },
)

const OperatorCard: FC<{
  operator: CopilotDocV1.Operator
  showExtras?: boolean
}> = ({ operator, showExtras }) => {
  const t = useTranslation()
  const displayName = useLocalizedOperatorName(operator.name)
  const info = OPERATORS.find((o) => o.name === operator.name)
  const { module } = withDefaultRequirements(
    operator.requirements,
    info?.rarity,
  )

  // 读取命盘集合（从 operators.json 注入的 info.discs）与选中结果
  const discList = (info as any)?.discs ?? []
  let selected: number[] = Array.isArray((operator as any).discsSelected)
    ? ((operator as any).discsSelected as number[])
    : []
  if ((!selected || selected.length === 0) && typeof operator.skill === 'number') {
    // 兼容：旧数据仅有 skill（1-based），视为只选了一个命盘
    selected = [operator.skill]
  }
  const selectedDiscs = (selected || [])
    .map((idx) => {
      if (idx === -1) {
        return { name: '任意', abbreviation: '任意', desp: '任意' } as any
      }
      if (typeof idx === 'number' && idx > 0 && idx <= discList.length) {
        return discList[idx - 1]
      }
      return null
    })
    .filter(Boolean) as any[]

  const discColorClasses = (color?: string) => {
    switch (color) {
      case '金':
        return '!bg-yellow-100 dark:!bg-yellow-900 dark:!text-yellow-200 !text-yellow-800'
      case '紫':
        return '!bg-purple-100 dark:!bg-purple-900 dark:!text-purple-200 !text-purple-800'
      case '蓝':
        return '!bg-blue-100 dark:!bg-blue-900 dark:!text-blue-200 !text-blue-800'
      case '橙':
        return '!bg-orange-100 dark:!bg-orange-900 dark:!text-orange-200 !text-orange-800'
      default:
        return '!bg-gray-300 dark:!bg-gray-600 opacity-15 dark:opacity-25 hover:opacity-30 dark:hover:opacity-50'
    }
  }

  return (
    <div className="relative flex items-start">
      <div className="relative w-[23ch] shrink-0">
        <div className="relative w-20 h-20 rounded-lg overflow-hidden shadow-md mx-auto">
          <OperatorAvatar
            id={info?.id}
            rarity={info?.rarity}
            className="w-20 h-20"
            fallback={displayName}
            sourceSize={96}
          />
          {info && info.prof !== 'TOKEN' && (
            <img
              className="absolute top-0 right-0 w-5 h-5 p-px bg-gray-600 rounded-tr-md"
              src={'/assets/prof-icons/' + info.prof + '.png'}
              alt={info.prof}
            />
          )}
          {module !== CopilotDocV1.Module.Default && (
            <div
              title={t.components.viewer.OperationViewer.module_title({
                count: module,
                name: getModuleName(module),
              })}
              className="absolute -bottom-1 right-1 font-serif font-bold text-lg text-white [text-shadow:0_0_3px_#a855f7,0_0_5px_#a855f7]"
            >
              {module === CopilotDocV1.Module.Original ? (
                <Icon icon="small-square" />
              ) : (
                getModuleName(module)
              )}
            </div>
          )}
        </div>
        <h4 className="mt-1 -mx-2 leading-4 font-semibold tracking-tighter text-center">
          {displayName}
        </h4>
        {selectedDiscs?.length > 0 && (
          <div className="mt-1 mx-[-4px] grid gap-1">
            {selectedDiscs.map((d: any, i: number) => {
              const star = ((operator as any).discStarStones ?? [])[i]
              return (
                <div
                  key={i}
                  className={clsx('flex gap-1', !showExtras && 'justify-center')}
                >
                  {/* 提升命盘描述 Tooltip 的层级，避免被 Drawer 内容遮挡 */}
                  <Tooltip2 content={d.desp} usePortal={true} portalClassName="operation-viewer-portal">
                    <div
                      className={clsx(
                        'bp4-button bp4-minimal bp4-small w-[7ch] shrink-0 whitespace-nowrap !p-0 px-1 flex items-center justify-center font-serif !font-bold !text-sm !rounded-md !border-2 !border-current',
                        discColorClasses(d.color),
                      )}
                    >
                      <span className="bp4-button-text">{(d.abbreviation || d.name) as string}</span>
                    </div>
                  </Tooltip2>
                  {showExtras && (
                    <>
                      <div
                        className={clsx(
                          'bp4-button bp4-minimal bp4-small w-[7ch] shrink-0 whitespace-nowrap !p-0 px-1 flex items-center justify-center font-serif !font-bold !text-sm !rounded-md !border-2 !border-current bg-slate-200 dark:bg-slate-600',
                        )}
                        title={star || '主星'}
                      >
                        <span className="bp4-button-text">{star || '主星'}</span>
                      </div>
                      <div
                        className={clsx(
                          'bp4-button bp4-minimal bp4-small w-[7ch] shrink-0 whitespace-nowrap !p-0 px-1 flex items-center justify-center font-serif !font-bold !text-sm !rounded-md !border-2 !border-current bg-slate-200 dark:bg-slate-600',
                        )}
                        title={((operator as any).discAssistStars ?? [])[i] || '辅星'}
                      >
                        <span className="bp4-button-text">{((operator as any).discAssistStars ?? [])[i] || '辅星'}</span>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {/* prof icon moved into avatar container to stick to avatar corner */}
      </div>
    </div>
  )
}

function OperationViewerInner({
  levels,
  operation,
  handleRating,
}: {
  levels: Level[]
  operation: Operation
  handleRating: (decision: OpRatingType) => Promise<void>
}) {
  const t = useTranslation()
  return (
    <div className="h-full overflow-auto p-4 md:p-8">
      <H3>
        {operation.parsedContent.doc.title}
        {operation.status === CopilotInfoStatusEnum.Private && (
          <Tag minimal className="ml-2 font-normal opacity-75">
            {t.components.viewer.OperationViewer.private}
          </Tag>
        )}
      </H3>

      <div className="flex flex-col-reverse md:grid grid-rows-1 grid-cols-3 gap-2 md:gap-8">
        <div className="flex flex-col">
          <Paragraphs content={operation.parsedContent.doc.details} linkify />
        </div>

        <div className="flex flex-col">
          <FactItem title={t.components.viewer.OperationViewer.stage}>
            <EDifficultyLevel
              level={
                findLevelByStageName(
                  levels,
                  operation.parsedContent.stageName,
                ) || createCustomLevel(operation.parsedContent.stageName)
              }
              difficulty={operation.parsedContent.difficulty}
            />
          </FactItem>

          <FactItem
            relaxed
            className="items-start"
            title={t.components.viewer.OperationViewer.task_rating}
          >
            <OperationRating operation={operation} className="mr-2" />

            <ButtonGroup className="flex items-center ml-2">
              <Tooltip2 content="o(*≧▽≦)ツ" placement="bottom">
                <Button
                  icon="thumbs-up"
                  intent={
                    operation.ratingType === OpRatingType.Like
                      ? 'success'
                      : 'none'
                  }
                  className="mr-2"
                  active={operation.ratingType === OpRatingType.Like}
                  onClick={() => handleRating(OpRatingType.Like)}
                />
              </Tooltip2>
              <Tooltip2 content=" ヽ(。>д<)ｐ" placement="bottom">
                <Button
                  icon="thumbs-down"
                  intent={
                    operation.ratingType === OpRatingType.Dislike
                      ? 'danger'
                      : 'none'
                  }
                  active={operation.ratingType === OpRatingType.Dislike}
                  onClick={() => handleRating(OpRatingType.Dislike)}
                />
              </Tooltip2>
            </ButtonGroup>
          </FactItem>
        </div>

        <div className="flex flex-wrap md:flex-col items-start select-none tabular-nums gap-4">
          <FactItem
            dense
            title={t.components.viewer.OperationViewer.views}
            icon="eye-open"
          >
            <span className="text-gray-800 dark:text-slate-100 font-bold">
              {operation.views}
            </span>
          </FactItem>

          <FactItem
            dense
            title={t.components.viewer.OperationViewer.published_at}
            icon="time"
          >
            <span className="text-gray-800 dark:text-slate-100 font-bold">
              <RelativeTime moment={operation.uploadTime} />
            </span>
          </FactItem>

          <FactItem
            dense
            title={t.components.viewer.OperationViewer.author}
            icon="user"
          >
            <UserName
              className="text-gray-800 dark:text-slate-100 font-bold"
              userId={operation.uploaderId}
            >
              {operation.uploader}
            </UserName>
          </FactItem>
        </div>
      </div>

      <div className="h-[1px] w-full bg-gray-200 mt-4 mb-6" />

      <ErrorBoundary
        fallback={
          <NonIdealState
            icon="issue"
            title={t.components.viewer.OperationViewer.render_error}
            description={
              t.components.viewer.OperationViewer.render_preview_problem
            }
            className="h-96 bg-stripe rounded"
          />
        }
      >
        <OperationViewerInnerDetails operation={operation} />
      </ErrorBoundary>

      <div className="h-[1px] w-full bg-gray-200 mt-4 mb-6" />

      <div className="mb-6">
        <H4 className="mb-4" id="comment">
          {operation.commentStatus === BanCommentsStatusEnum.Disabled
            ? t.components.viewer.OperationViewer.comments
            : t.components.viewer.OperationViewer.comments_count({
                count: operation.commentsCount,
              })}
        </H4>
        {operation.commentStatus === BanCommentsStatusEnum.Disabled ? (
          <NonIdealState
            icon="tree"
            title={t.components.viewer.OperationViewer.comments_closed}
            description={
              t.components.viewer.OperationViewer.comments_closed_note
            }
          />
        ) : (
          <CommentArea operationId={operation.id} />
        )}
      </div>
    </div>
  )
}
function OperationViewerInnerDetails({ operation }: { operation: Operation }) {
  const t = useTranslation()
  const [showOperators, setShowOperators] = useState(true)
  const [showActions, setShowActions] = useState(true)
  // 眼睛开关：控制是否显示星石/辅星，默认关闭（不显示）
  const [showExtras, setShowExtras] = useState(false)

  return (
    <div>
      <div className="flex items-center flex-wrap">
        <H4
          className="inline-flex items-center cursor-pointer hover:opacity-80"
          onClick={() => setShowOperators((v) => !v)}
        >
          {t.components.viewer.OperationViewer.operators_and_groups}
          <Icon
            icon="chevron-down"
            className={clsx(
              'ml-1 transition-transform',
              showOperators && 'rotate-180',
            )}
          />
        </H4>
        <details className="inline ml-2">
          <summary className="inline cursor-pointer">
            <Icon icon="help" size={14} className="mb-1 opacity-50" />
          </summary>
          <Callout intent="primary" icon={null} className="mb-4">
            <p>
              {t.components.viewer.OperationViewer.operators_and_groups_note.jsx({
                operators: (s) => <b>{s}</b>,
                groups: (s) => <b>{s}</b>,
              })}
            </p>
          </Callout>
        </details>
        {/* 星石/辅星显示开关：默认闭眼（隐藏），点击切换 */}
        <Icon
          icon={showExtras ? 'eye-open' : 'eye-off'}
          size={14}
          className="ml-2 mb-1 opacity-60 cursor-pointer hover:opacity-90 align-middle"
          onClick={() => setShowExtras((v) => !v)}
          title={showExtras ? '隐藏星石/辅星' : '显示星石/辅星'}
        />
      </div>
      <Collapse isOpen={showOperators}>
        <div className="mt-2 flex flex-wrap gap-8">
          {!operation.parsedContent.opers?.length &&
            !operation.parsedContent.groups?.length && (
              <NonIdealState
                className="my-2"
                title={t.components.viewer.OperationViewer.no_operators}
                description={
                  t.components.viewer.OperationViewer.no_operators_added
                }
                icon="slash"
                layout="horizontal"
              />
            )}
          {operation.parsedContent.opers?.map((operator) => (
            <OperatorCard
              key={operator.name}
              operator={operator}
              showExtras={showExtras}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          {operation.parsedContent.groups?.map((group) => (
            <Card
              elevation={Elevation.ONE}
              className="!p-2 flex flex-col items-center"
              key={group.name}
            >
              <H6 className="mb-3 text-gray-800">{group.name}</H6>
              <div className="flex flex-wrap px-2 gap-8">
                {group.opers
                  ?.filter(Boolean)
                  .map((operator) => (
                    <OperatorCard
                      key={operator.name}
                      operator={operator}
                      showExtras={showExtras}
                    />
                  ))}

                {group.opers?.filter(Boolean).length === 0 && (
                  <span className="text-zinc-500">
                    {t.components.viewer.OperationViewer.no_operator}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </Collapse>

      <H4
        className="mt-6 inline-flex items-center cursor-pointer hover:opacity-80"
        onClick={() => setShowActions((v) => !v)}
      >
        {t.components.viewer.OperationViewer.action_sequence}
        <Icon
          icon="chevron-down"
          className={clsx(
            'ml-1 transition-transform',
            showActions && 'rotate-180',
          )}
        />
      </H4>
      <Collapse isOpen={showActions}>
        <ActionSequenceViewer operation={operation} />
      </Collapse>
    </div>
  )
}
