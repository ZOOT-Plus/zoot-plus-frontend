import { H4, Tag } from '@blueprintjs/core'

import { FC } from 'react'

import { EDifficulty } from 'components/entity/EDifficulty'
import { Level, OpDifficulty } from 'models/operation'

import { useTranslation } from '../../i18n/i18n'
import { isCustomLevel } from '../../models/level'

export const NeoELevel: FC<{
  className?: string
  level: Level
}> = ({ level }) => {
  const t = useTranslation()
  const { game } = level
  let { catOne, catTwo } = level

  if (isCustomLevel(level)) {
    catOne = t.components.entity.ELevel.custom_level
    catTwo = ''
  }

  return (
    <Tag className="transition border border-solid !text-xs tracking-tight !px-2 !py-1 !my-1 leading-none !min-h-0 bg-slate-200 border-slate-300 text-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex items-center">
        <div className="flex whitespace-pre">
          {/* 按需显示：game | catOne | catTwo */}
          <span className="inline-block font-bold my-auto">{game}</span>
          {' | '}
          <span className="text-xs">{catOne}</span>
          {catTwo && (
            <>
              {' | '}
              <span className="text-xs">{catTwo}</span>
            </>
          )}
        </div>
      </div>
    </Tag>
  )
}

export const ELevel: FC<{
  className?: string
  level: Level
}> = ({ level }) => {
  const t = useTranslation()
  let { catOne, catTwo, catThree } = level

  if (isCustomLevel(level)) {
    catOne = t.components.entity.ELevel.custom_level
    catTwo = ''
    catThree = level.name
  }

  return (
    <Tag className="transition border border-solid !text-xs tracking-tight !p-1 leading-none !min-h-0 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex items-center mx-1">
        <div className="flex flex-col mr-2">
          <H4 className="inline-block font-bold my-auto">{catThree}</H4>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-light">{catOne}</span>
          <span className="text-xs">{catTwo}</span>
        </div>
      </div>
    </Tag>
  )
}

export const EDifficultyLevel: FC<{
  level: Level
  difficulty?: OpDifficulty
}> = ({ level, difficulty = OpDifficulty.UNKNOWN }) => {
  return (
    <div className="flex flex-wrap">
      <ELevel level={level} />
      <EDifficulty difficulty={difficulty} />
    </div>
  )
}
