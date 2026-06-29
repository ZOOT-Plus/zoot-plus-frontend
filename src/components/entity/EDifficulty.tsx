import { Tag } from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'

import clsx from 'clsx'
import { FC, ReactNode } from 'react'

import { OpDifficulty, OpDifficultyBitFlag } from 'models/operation'

import { useTranslation } from '../../i18n/i18n'

const DifficultyTag: FC<{
  tooltip?: string | JSX.Element
  content: ReactNode
  hardLevel?: boolean
}> = ({ tooltip, content, hardLevel }) => {
  return (
    <Tooltip2 placement="bottom" content={<div className="max-w-sm">{tooltip}</div>}>
      <Tag
        className={clsx(
          'transition border border-solid !text-xs cursor-help tracking-tight !px-2 !py-1 !mx-1 !my-1 leading-none !min-h-0',
          hardLevel
            ? 'bg-red-400 hover:bg-red-500 border-red-700 text-red-900'
            : 'bg-slate-200 hover:bg-slate-300 border-slate-300  text-slate-700 dark:bg-slate-900 dark:text-slate-100',
        )}
      >
        {content}
      </Tag>
    </Tooltip2>
  )
}

export const EDifficulty: FC<{
  difficulty: OpDifficulty
}> = ({ difficulty }) => {
  const t = useTranslation()
  const descriptions = {
    regular: {
      title: t.components.entity.EDifficulty.regular,
      description: t.components.entity.EDifficulty.regular_description,
    },
    hard: {
      title: t.components.entity.EDifficulty.hard,
      description: t.components.entity.EDifficulty.hard_description,
    },
  }

  if (difficulty === OpDifficulty.UNKNOWN) {
    return <></>
    // return (
    //   <DifficultyTag
    //     tooltip={
    //       <div className="flex flex-col">
    //         <span>
    //           本作业并未支持难度支持标识，请自行根据作业的文字描述判断其所支持的作业难度等级。通常来说，未写明支持难度的作业均兼容突袭和普通难度作战。
    //         </span>

    //         {/* <Callout
    //           className="mt-2"
    //           intent="primary"
    //           title="作业作者"
    //           icon="help"
    //         >
    //           若您为作业作者，您可使用作业编辑器将此作业编辑为对应的难度支持标识。
    //         </Callout> */}
    //       </div>
    //     }
    //     content="未知难度"
    //   />
    // )
  }

  const children: JSX.Element[] = []

  if (difficulty & OpDifficultyBitFlag.REGULAR) {
    children.push(
      <DifficultyTag key="regular" tooltip={descriptions.regular.description} content={descriptions.regular.title} />,
    )
  }

  if (difficulty & OpDifficultyBitFlag.HARD) {
    children.push(
      <DifficultyTag key="hard" tooltip={descriptions.hard.description} content={descriptions.hard.title} hardLevel />,
    )
  }

  return <span className="ml-1">{children}</span>
}
