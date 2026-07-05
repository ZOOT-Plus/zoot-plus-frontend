import { Card } from '@blueprintjs/core'

import { FC } from 'react'

import { useLocalizedOperatorName } from 'models/operator'

import { OperatorAvatar } from '../../../../OperatorAvatar'
import { Operator } from '../../EditorSheet'
import { SkillAboutTrigger } from '../SheetOperatorSkillAbout'

export interface OperatorInGroupItemProp {
  operatorInfo: Operator
  onOperatorSkillChange?: (operatorInfo: Operator) => void
}

export const OperatorInGroupItem: FC<OperatorInGroupItemProp> = ({
  onOperatorSkillChange,
  operatorInfo: { name, ...restField },
}) => (
  <Card className="flex items-center mb-1 w-full h-full justify-between">
    <>
      <div className="flex items-center">
        <OperatorAvatar name={name} size="large" />
        <p className="font-bold leading-none text-center truncate ml-2 mr-auto">{useLocalizedOperatorName(name)}</p>
      </div>
      {!!onOperatorSkillChange && (
        <SkillAboutTrigger operator={{ name, ...restField }} onSkillChange={onOperatorSkillChange} />
      )}
    </>
  </Card>
)
