import { Icon } from '@blueprintjs/core'

import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { CSSProperties, FC } from 'react'

import { CopilotDocV1 } from 'models/copilot.schema'
import { findActionType } from 'models/types'

import { languageAtom, useTranslation } from '../i18n/i18n'
import {
  findOperatorDirection,
  getLocalizedOperatorName,
  getSkillUsageTitle,
} from '../models/operator'
import { formatDuration } from '../utils/times'
import { OperatorAvatar } from './OperatorAvatar'

interface ActionTimelineItemProps {
  action: CopilotDocV1.Action
  isLast: boolean
  index: number
  groups?: CopilotDocV1.Group[]
  snake?: {
    col: number
    cols: number
    row: number
    isRowLast: boolean
    isRowFirst: boolean
    rtl: boolean
  }
  style?: CSSProperties
  showArrow?: boolean
}

export const ActionTimelineItem: FC<ActionTimelineItemProps> = ({
  action,
  isLast,
  index,
  groups,
  snake,
  style,
  showArrow,
}) => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)
  const type = findActionType(action.type)

  const avatarNames: string[] = (() => {
    if ('name' in action && action.name) {
      const group = groups?.find((g) => g.name === action.name)
      if (group?.opers?.length) return group.opers.map((o) => o.name)
      return [action.name]
    }
    return []
  })()

  const conditions: { label: string; value: string }[] = []
  if (action.kills)
    conditions.push({
      label: t.components.ActionCard.kills,
      value: String(action.kills),
    })
  if (action.cooling)
    conditions.push({
      label: t.components.ActionCard.cooling,
      value: String(action.cooling),
    })
  if (action.costs)
    conditions.push({
      label: t.components.ActionCard.cost,
      value: String(action.costs),
    })
  if (action.costChanges)
    conditions.push({
      label: t.components.ActionCard.cost_changes,
      value: String(action.costChanges),
    })
  if (action.preDelay)
    conditions.push({
      label: t.components.ActionCard.pre_delay,
      value: formatDuration(action.preDelay),
    })
  if (action.rearDelay || action.postDelay)
    conditions.push({
      label: t.components.ActionCard.rear_delay,
      value: formatDuration(action.rearDelay || action.postDelay!),
    })

  const hasConditions = conditions.length > 0

  if (snake) {
    return (
      <div className="relative flex flex-col h-full" style={style}>
        {/* Card */}
        <div
          className={clsx(
            'relative flex-1 h-full overflow-hidden',
            'rounded-xl border border-white/[0.06] bg-[#2F343C]',
            'shadow-[0_2px_12px_rgba(0,0,0,0.4)]',
            'transition-all duration-200 hover:border-white/[0.12] hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]',
          )}
        >
          {/* Colored top accent bar */}
          <div
            className={clsx(
              'absolute top-0 left-0 right-0 h-[3px]',
              type.accentBg,
            )}
          />

          {/* Step number — top right corner */}
          <div
            className={clsx(
              'absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center',
              'text-[10px] font-bold text-white/90 tabular-nums',
              type.accentBg,
              'opacity-80',
            )}
          >
            {index + 1}
          </div>

          <div className="flex px-3 pt-5 pb-3 gap-3">
            {/* Left: main info */}
            <div className="flex-1 min-w-0">
              {/* Action type */}
              <div
                className={clsx(
                  'flex items-center gap-1.5 mb-2',
                  type.accentText,
                )}
              >
                {type.icon && <Icon icon={type.icon} size={12} />}
                <span className="text-[11px] font-semibold tracking-wide uppercase opacity-90">
                  {type.title()}
                </span>
              </div>

              {/* Avatar + name */}
              {avatarNames.length > 0 && 'name' in action && action.name && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex -space-x-1.5">
                    {avatarNames.slice(0, 3).map((name) => (
                      <OperatorAvatar
                        key={name}
                        name={name}
                        size="large"
                        sourceSize={32}
                        className="ring-[1.5px] ring-[#2F343C] w-8 h-8"
                      />
                    ))}
                    {avatarNames.length > 3 && (
                      <div className="w-8 h-8 rounded-md bg-white/10 ring-[1.5px] ring-[#2F343C] flex items-center justify-center text-[10px] text-white/60 font-bold">
                        +{avatarNames.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white/90 leading-tight">
                    {getLocalizedOperatorName(action.name, language)}
                  </span>
                </div>
              )}

              {/* Skill usage */}
              {'skillUsage' in action && (
                <div className="text-[11px] text-white/40 mb-1">
                  {getSkillUsageTitle(action.skillUsage, action.skillTimes)}
                </div>
              )}

              {/* Location + Direction */}
              {(('location' in action && action.location) ||
                'direction' in action ||
                ('distance' in action && action.distance)) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  {'location' in action && action.location && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Icon
                        icon="map-marker"
                        size={10}
                        className="text-white/30"
                      />
                      <span className="text-white/30">
                        {t.components.ActionCard.coordinates}
                      </span>
                      <span className="font-mono text-white/60 bg-white/[0.06] px-1 rounded">
                        {action.location.join(', ')}
                      </span>
                    </span>
                  )}
                  {'direction' in action && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Icon
                        icon="compass"
                        size={10}
                        className="text-white/30"
                      />
                      <span className="text-white/30">
                        {t.components.ActionCard.direction}
                      </span>
                      <span className="font-mono text-white/60">
                        {findOperatorDirection(action.direction).title()}
                      </span>
                    </span>
                  )}
                  {'distance' in action && action.distance && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Icon icon="camera" size={10} className="text-white/30" />
                      <span className="text-white/30">
                        {t.components.ActionCard.distance}
                      </span>
                      <span className="font-mono text-white/60">
                        {action.distance.join(', ')}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: condition grid */}
            <div className="flex-shrink-0 border-l border-white/[0.06] pl-3 grid grid-cols-2 gap-x-3 gap-y-1 content-start">
              {[
                { label: t.components.ActionCard.kills, value: action.kills },
                {
                  label: t.components.ActionCard.cooling,
                  value: action.cooling,
                },
                { label: t.components.ActionCard.cost, value: action.costs },
                {
                  label: t.components.ActionCard.cost_changes,
                  value: action.costChanges,
                },
                {
                  label: t.components.ActionCard.pre_delay,
                  value: action.preDelay
                    ? formatDuration(action.preDelay)
                    : undefined,
                },
                {
                  label: t.components.ActionCard.rear_delay,
                  value:
                    action.rearDelay || action.postDelay
                      ? formatDuration(action.rearDelay || action.postDelay!)
                      : undefined,
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col min-w-[3rem]">
                  <span
                    className={clsx(
                      'font-mono text-[12px] font-bold tabular-nums leading-tight',
                      value ? 'text-white/80' : 'text-white/20',
                    )}
                  >
                    {value ?? '-'}
                  </span>
                  <span className="text-[9px] text-white/25 leading-tight">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Arrow connector */}
        {showArrow && (
          <div
            className={clsx(
              'absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none',
              'flex items-center justify-center',
              snake.rtl ? '-left-[13px]' : '-right-[13px]',
            )}
          >
            <div className="w-6 h-6 rounded-full bg-[#1a1f2e] border border-white/10 flex items-center justify-center shadow-md">
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                className="text-white/40"
                style={snake.rtl ? { transform: 'scaleX(-1)' } : undefined}
              >
                <path
                  d="M1 5 L7 5 M5 2 L9 5 L5 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Default vertical timeline
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0 w-4">
        <div
          className={clsx(
            'w-3 h-3 rounded-full mt-1 flex-shrink-0',
            type.accentBg,
          )}
        />
        {!isLast && (
          <div className="w-px flex-1 mt-1 bg-gray-300 dark:bg-gray-600" />
        )}
      </div>

      <div
        className={clsx(
          'flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252a31] px-3 py-2 shadow-sm',
          isLast ? 'mb-0' : 'mb-3',
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span
            className={clsx(
              'inline-flex items-center gap-1 text-xs font-semibold',
              type.accentText,
            )}
          >
            {type.icon && <Icon icon={type.icon} size={11} />}
            <span>{type.title()}</span>
          </span>

          {'name' in action && action.name && (
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {getLocalizedOperatorName(action.name, language)}
            </span>
          )}

          {'skillUsage' in action && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getSkillUsageTitle(action.skillUsage, action.skillTimes)}
            </span>
          )}

          {'location' in action && action.location && (
            <span className="font-mono text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1 rounded">
              {action.location.join(', ')}
            </span>
          )}

          {'direction' in action && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {findOperatorDirection(action.direction).title()}
            </span>
          )}

          {'distance' in action && action.distance && (
            <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
              {action.distance.join(', ')}
            </span>
          )}
        </div>

        {hasConditions && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {conditions.map(({ label, value }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded"
              >
                <span className="text-gray-400 dark:text-gray-500">
                  {label}
                </span>
                <span className="font-mono font-medium">{value}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
