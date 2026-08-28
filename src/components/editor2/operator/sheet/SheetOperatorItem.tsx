import { Card, Icon, Intent } from '@blueprintjs/core'

import clsx from 'clsx'
import { FC } from 'react'

import { MasteryIcon } from 'components/MasteryIcon'
import { AppToaster } from 'components/Toaster'
import { DetailedSelectChoice } from 'components/editor/DetailedSelect'
import { CopilotDocV1 } from 'models/copilot.schema'
import { getModuleName, isSameOperatorConfig, operatorSkillUsages, useLocalizedOperatorName } from 'models/operator'

import { useTranslation } from '../../../../i18n/i18n'
import { OperatorAvatar } from '../../../OperatorAvatar'
import { useSheet } from '../../../editor/operator/sheet/SheetProvider'

export interface SheetOperatorItemProp {
  operator: CopilotDocV1.Operator
  showSkillAbout?: boolean
}

const skillDic = operatorSkillUsages as DetailedSelectChoice[]

export const SheetOperatorItem: FC<SheetOperatorItemProp> = ({ operator: baseOperator, showSkillAbout = false }) => {
  const { name } = baseOperator
  const t = useTranslation()
  const { existedOperators, existedGroups, submitOperatorInSheet, removeOperator } = useSheet()
  const compareOperator = showSkillAbout
    ? (operator: CopilotDocV1.Operator) => isSameOperatorConfig(operator, baseOperator, true)
    : (operator: CopilotDocV1.Operator) => operator.name === name
  const sameNameOperator = showSkillAbout
    ? existedOperators.find(({ name: existedName }) => existedName === name) ||
      existedGroups.flatMap(({ opers }) => opers ?? []).find(({ name: existedName }) => existedName === name)
    : undefined
  const sameNameOperatorInGroup = showSkillAbout
    ? existedGroups.flatMap(({ opers }) => opers ?? []).find(({ name: existedName }) => existedName === name)
    : undefined

  const operatorNoneGroupedIndex = existedOperators.findIndex(compareOperator)
  const operatorInGroup = existedGroups
    .flatMap(({ opers }) => opers ?? [])
    .find(compareOperator)
  const selected = operatorNoneGroupedIndex !== -1
  const grouped = !!operatorInGroup
  const selectionLocked = grouped || !!sameNameOperatorInGroup
  const operator = existedOperators?.[operatorNoneGroupedIndex] || operatorInGroup || baseOperator
  const selectedInView = selected || grouped
  const { skill, skillUsage, skillTimes, requirements: baseRequirements } = baseOperator
  const requirements: CopilotDocV1.Requirements = {
    ...(baseRequirements?.skillLevel !== undefined && { skillLevel: baseRequirements.skillLevel }),
    ...(baseRequirements?.module !== undefined && { module: baseRequirements.module }),
  }
  const operatorConfig = {
    name,
    ...(skill !== undefined && { skill }),
    ...(skillUsage !== undefined && { skillUsage }),
    ...(skillTimes !== undefined && { skillTimes }),
    ...(Object.keys(requirements).length && { requirements }),
  } satisfies CopilotDocV1.Operator

  const onOperatorSelect = () => {
    if (selectionLocked) {
      AppToaster.show({
        message: t.components.editor.operator.sheet.sheetOperator.SheetOperatorItem.operator_in_group({ name }),
        intent: Intent.DANGER,
      })
      return
    }

    if (selected) {
      removeOperator(operatorNoneGroupedIndex)
      return
    }

    let selectedOperator: CopilotDocV1.Operator = { name }
    if (showSkillAbout) {
      selectedOperator = operatorConfig
      if (sameNameOperator) {
        selectedOperator = {
          ...operatorConfig,
          id: (sameNameOperator as typeof sameNameOperator & { id: string }).id,
        } as typeof baseOperator
      }
    }
    submitOperatorInSheet(selectedOperator)
  }

  return (
    <Card
      className={clsx(
        'flex items-center w-full h-full relative cursor-pointer flex-col !rounded-none',
        selectedInView && 'scale-90 bg-gray-200',
      )}
      elevation={0}
      interactive={false}
      onClick={onOperatorSelect}
    >
      <div
        className={clsx(
          'flex min-h-0 grow w-full flex-col items-center justify-center px-2 py-3',
          grouped ? 'gap-1.5' : 'gap-2',
        )}
      >
        <OperatorAvatar className="!h-12 !w-12 shrink-0" name={name} size="large" sourceSize={96} />
        <p
          className={clsx(
            'max-w-full text-xs font-bold leading-tight text-center',
            'break-words', // Allow text to break to next line
          )}
        >
          {useLocalizedOperatorName(name)}
        </p>
        {showSkillAbout && <SheetOperatorSkillAbout operator={operator} />}
        {grouped && (
          <div className={clsx('flex text-gray-500 items-center text-xs')}>
            <Icon icon="warning-sign" size={12} className="flex items-center mr-1" />
            <p className="font-semibold">{t.components.editor.operator.sheet.sheetOperator.SheetOperatorItem.in_group}</p>
          </div>
        )}
      </div>
    </Card>
  )
}

export const SheetOperatorSkillAbout: FC<{ operator: CopilotDocV1.Operator }> = ({ operator }) => {
  const t = useTranslation()

  return (
    <div className="flex mt-1 max-w-full flex-nowrap items-center justify-center text-xs text-gray-500 whitespace-nowrap">
      {!operator.skill && <Icon icon="info-sign" size={12} className="flex items-center mr-1" />}
      <p>
        {operator.skill
          ? t.models.operator.skill_number({ count: operator.skill })
          : t.components.editor.operator.sheet.SheetOperatorSkillAbout.not_set}
      </p>
      {operator.requirements?.skillLevel !== undefined &&
        (operator.requirements.skillLevel < 8 ? (
          <p className="ml-1">Lv.{operator.requirements.skillLevel}</p>
        ) : (
          <MasteryIcon
            className="ml-1 h-3 w-3"
            mastery={operator.requirements.skillLevel - 7}
            subClassName="fill-gray-300"
          />
        ))}
      {operator.skillUsage !== undefined && <p className="mx-1">·</p>}
      {operator.skillUsage !== undefined && (
        <Icon
          icon={skillDic.find((item) => item.value === operator.skillUsage)?.icon}
          className="flex items-center"
          size={12}
        />
      )}
      {operator.skillTimes && <p>×{operator.skillTimes}</p>}
      {operator.requirements?.module !== undefined && operator.requirements.module !== CopilotDocV1.Module.Default && (
        <>
          <p className="mx-1">·</p>
          {operator.requirements.module === CopilotDocV1.Module.Original ? (
            <Icon icon="small-square" size={12} />
          ) : (
            <p>{getModuleName(operator.requirements.module)}</p>
          )}
        </>
      )}
    </div>
  )
}
