import { Button, Card, Icon, Intent, PopoverNext } from '@blueprintjs/core'

import clsx from 'clsx'
import { useAtom } from 'jotai'
import { isEqual, omit } from 'lodash-es'
import { FC } from 'react'

import { AppToaster } from 'components/Toaster'
import { CopilotDocV1 } from 'models/copilot.schema'
import { useLocalizedOperatorName } from 'models/operator'
import { ignoreKeyDic } from 'store/useFavGroups'
import { favOperatorAtom } from 'store/useFavOperators'

import { useTranslation } from '../../../../../i18n/i18n'
import { OperatorAvatar } from '../../../../OperatorAvatar'
import { SkillAboutTrigger } from '../SheetOperatorSkillAbout'
import { useSheet } from '../SheetProvider'

export interface SheetOperatorItemProp {
  name: string
}

export const SheetOperatorItem: FC<SheetOperatorItemProp> = ({ name }) => {
  const t = useTranslation()
  const { existedOperators, existedGroups, submitOperatorInSheet, removeOperator } = useSheet()
  const [favOperators, setFavOperators] = useAtom(favOperatorAtom)

  const operatorNoneGroupedIndex = existedOperators.findIndex(({ name: existedName }) => existedName === name)
  const operatorInGroup = existedGroups
    .map(({ opers }) => opers)
    .flat()
    .filter((item) => !!item)
    .find(({ name: existedName }) => existedName === name)
  const selected = operatorNoneGroupedIndex !== -1
  const grouped = !!operatorInGroup
  const favOper = favOperators.find(({ name: exsitedName }) => exsitedName === name)
  const isFav = !!favOper
  const operator = existedOperators?.[operatorNoneGroupedIndex] ||
    operatorInGroup ||
    favOper || {
      name,
    }
  const selectedInView = selected || grouped

  const pinned = isFav && isEqual(omit(operator, [...ignoreKeyDic]), omit(favOper, [...ignoreKeyDic]))
  const showPinned = isFav && (!selected || pinned)

  const onOperatorSelect = () => {
    if (grouped)
      AppToaster.show({
        message: t.components.editor.operator.sheet.sheetOperator.SheetOperatorItem.operator_in_group({ name }),
        intent: Intent.DANGER,
      })
    else {
      if (selected) {
        removeOperator(operatorNoneGroupedIndex)
      } else submitOperatorInSheet(operator)
    }
  }

  const updateFavOperator = () => {
    const { skill, skillUsage, skillTimes, ...rest } = operator
    const formattedValue = {
      ...rest,
      skill: skill ?? 1,
      skillUsage: skillUsage || 0,
      skillTimes: skillUsage === CopilotDocV1.SkillUsageType.ReadyToUseTimes ? skillTimes || 1 : undefined,
    }
    setFavOperators([...[...favOperators].filter(({ name }) => name !== formattedValue.name), { ...formattedValue }])
    submitOperatorInSheet(formattedValue)
  }

  const removeFavOperator = () => {
    setFavOperators([...favOperators].filter(({ name: existedName }) => existedName !== name))
  }

  const onPinnedChange = () => {
    if (pinned) removeFavOperator()
    else updateFavOperator()
  }

  return (
    <Card
      className={clsx(
        'flex items-center w-full h-full relative cursor-pointer flex-col',
        selectedInView && 'scale-90 bg-gray-200',
      )}
      elevation={grouped ? 0 : 2}
      interactive={!selectedInView}
      onClick={onOperatorSelect}
    >
      <>
        <OperatorAvatar className="mt-3" name={name} size="large" />
        <p
          className={clsx(
            'mt-1 font-bold leading-tight text-center',
            'break-words', // Allow text to break to next line
          )}
        >
          {useLocalizedOperatorName(name)}
        </p>

        {(selected || isFav) && (
          <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()} role="presentation">
            <PopoverNext
              content={
                showPinned ? (
                  <Button minimal onClick={removeFavOperator}>
                    <Icon icon="pin" className="-rotate-45" />
                    <span>
                      {t.components.editor.operator.sheet.sheetOperator.SheetOperatorItem.remove_from_favorites}
                    </span>
                  </Button>
                ) : (
                  <div className="flex flex-col items-start">
                    <Button minimal onClick={onPinnedChange}>
                      <Icon icon="warning-sign" />
                      <span>
                        {t.components.editor.operator.sheet.sheetOperator.SheetOperatorItem.will_replace_operator}
                      </span>
                    </Button>
                    <Button minimal intent="danger" onClick={removeFavOperator}>
                      <Icon icon="trash" />
                      <span>
                        {t.components.editor.operator.sheet.sheetOperator.SheetOperatorItem.remove_from_favorites}
                      </span>
                    </Button>
                  </div>
                )
              }
              disabled={!isFav}
            >
              <Icon
                icon={showPinned ? 'pin' : 'unpin'}
                className={clsx(showPinned && '-rotate-45')}
                onClick={!isFav ? onPinnedChange : undefined}
              />
            </PopoverNext>
          </div>
        )}
      </>
      {selected && (
        <SkillAboutTrigger
          {...{
            operator,
            onSkillChange: (value) => submitOperatorInSheet(value),
            disabled: grouped,
          }}
        />
      )}
      {grouped && (
        <div className={clsx('flex mt-1 text-gray-500 items-center text-xs')}>
          <Icon icon="warning-sign" size={12} className="flex items-center mr-1" />
          <p className="font-semibold">{t.components.editor.operator.sheet.sheetOperator.SheetOperatorItem.in_group}</p>
        </div>
      )}
    </Card>
  )
}
