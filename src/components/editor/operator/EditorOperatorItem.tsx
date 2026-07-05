import { Card, Elevation, Icon } from '@blueprintjs/core'

import clsx from 'clsx'
import { useAtomValue } from 'jotai'

import type { CopilotDocV1 } from 'models/copilot.schema'

import { languageAtom, useTranslation } from '../../../i18n/i18n'
import { OPERATORS, getLocalizedOperatorName, getSkillUsageTitle } from '../../../models/operator'
import { OperatorAvatar } from '../../OperatorAvatar'
import { SortableItemProps } from '../../dnd'
import { CardDeleteOption, CardEditOption } from '../CardOptions'

interface EditorOperatorItemProps extends Partial<SortableItemProps> {
  operator: CopilotDocV1.Operator
  editing?: boolean
  onEdit?: () => void
  onRemove?: () => void
}

export const EditorOperatorItem = ({
  operator,
  editing,
  onEdit,
  onRemove,
  isDragging,
  attributes,
  listeners,
}: EditorOperatorItemProps) => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)
  const id = OPERATORS.find(({ name }) => name === operator.name)?.id
  const skillUsage = getSkillUsageTitle(operator.skillUsage as CopilotDocV1.SkillUsageType, operator.skillTimes)

  return (
    <Card
      elevation={Elevation.TWO}
      className={clsx(
        'flex items-start',
        editing && 'bg-gray-100',
        isDragging && 'opacity-30',
        'h-[72px] w-[calc(4.5*72px)]',
      )}
    >
      <Icon
        className="cursor-grab active:cursor-grabbing p-1 -mt-1 -ml-2 mr-3 rounded-[1px]"
        icon="drag-handle-vertical"
        {...attributes}
        {...listeners}
      />
      <OperatorAvatar id={id} size="large" />
      <div className="ml-4 flex-grow">
        <h3 className="font-bold leading-none mb-1">{getLocalizedOperatorName(operator.name, language)}</h3>
        <div className="text-gray-400 text-xs">
          {t.components.editor.operator.EditorOperatorItem.skill_number({
            count: operator.skill,
          })}
          : {skillUsage}
        </div>
      </div>

      <CardEditOption active={editing} onClick={onEdit} />
      <CardDeleteOption className="-mr-3" onClick={onRemove} />
    </Card>
  )
}
