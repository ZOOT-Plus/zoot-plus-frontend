import { Icon } from '@blueprintjs/core'

import clsx from 'clsx'
import { FC } from 'react'

import { useTranslation } from 'i18n/i18n'
import { CopilotDocV1 } from 'models/copilot.schema'
import { OPERATORS, getEliteIconUrl, getModuleName, getSkillCount, useLocalizedOperatorName } from 'models/operator'

import { MasteryIcon } from './MasteryIcon'
import { OperatorAvatar } from './OperatorAvatar'

export const OperatorCard: FC<{
  operator: CopilotDocV1.Operator
}> = ({ operator }) => {
  const t = useTranslation()
  const displayName = useLocalizedOperatorName(operator.name)
  const info = OPERATORS.find((o) => o.name === operator.name)
  const { level, elite, skillLevel, module } = operator.requirements ?? {}
  const skillCount = info ? Math.max(getSkillCount(info), operator.skill ?? 1) : 3

  return (
    <div className="relative flex items-start">
      <div className="relative w-20">
        <div className="relative rounded-lg overflow-hidden shadow-md">
          <OperatorAvatar
            id={info?.id}
            rarity={info?.rarity}
            className="w-20 h-20"
            fallback={displayName}
            sourceSize={96}
          />
          {module !== undefined && module !== CopilotDocV1.Module.Default && (
            <div
              title={t.components.viewer.OperationViewer.module_title({
                count: module,
                name: getModuleName(module),
              })}
              className="absolute -bottom-1 right-1 font-serif font-bold text-lg text-white [text-shadow:0_0_3px_#a855f7,0_0_5px_#a855f7]"
            >
              {module === CopilotDocV1.Module.Original ? <Icon icon="small-square" /> : getModuleName(module)}
            </div>
          )}
        </div>
        <h4 className="mt-1 -mx-2 leading-4 font-semibold tracking-tighter text-center">{displayName}</h4>
        {info && info.prof !== 'TOKEN' && (
          <img
            className="absolute top-0 right-0 w-5 h-5 p-px bg-gray-600 rounded-tr-md"
            src={'/assets/prof-icons/' + info.prof + '.png'}
            alt={info.prof}
          />
        )}
      </div>
      {level !== undefined && elite !== undefined && (
        <div className="absolute -top-2 -left-4 flex items-center flex-col-reverse">
          <div className="-mt-5 px-3 py-4 rounded-full bg-[radial-gradient(rgba(0,0,0,0.6)_10%,rgba(0,0,0,0.08)_35%,rgba(0,0,0,0)_50%)] pointer-events-none">
            <img
              className="w-7 h-6 object-contain pointer-events-auto"
              src={getEliteIconUrl(elite)}
              alt={t.models.operator.elite({ level: elite })}
            />
          </div>
          <div className="w-8 h-8 leading-7 rounded-full border-2 border-yellow-300 bg-black/50 text-lg text-white font-semibold text-center shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {level}
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-1 ml-1">
        {Array.from({ length: skillCount }, (_, index) => {
          const skillNumber = index + 1
          const selected = operator.skill === skillNumber
          return (
            <li
              key={index}
              className={clsx(
                'relative',
                selected
                  ? 'bg-purple-100 dark:bg-purple-900 dark:text-purple-200 text-purple-800'
                  : 'bg-gray-300 dark:bg-gray-600 opacity-15 dark:opacity-25',
              )}
              title={t.models.operator.skill_number({ count: skillNumber })}
            >
              <div className="w-6 h-6 flex items-center justify-center font-bold text-xl border-2 border-current">
                {selected &&
                  (skillLevel === undefined ? (
                    <Icon icon="tick" />
                  ) : skillLevel <= 7 ? (
                    skillLevel
                  ) : (
                    <MasteryIcon
                      className="w-4 h-4"
                      mastery={skillLevel - 7}
                      subClassName="fill-gray-300 dark:fill-gray-500"
                    />
                  ))}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
