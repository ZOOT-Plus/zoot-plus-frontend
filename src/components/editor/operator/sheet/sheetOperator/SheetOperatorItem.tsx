import { Button, Card, Icon, Intent } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

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
  showSkillTrigger?: boolean
}

export const SheetOperatorItem: FC<SheetOperatorItemProp> = ({
  name,
  showSkillTrigger = true,
}) => {
  const t = useTranslation()
  const {
    existedOperators,
    existedGroups,
    submitOperatorInSheet,
    removeOperator,
  } = useSheet()
  const [favOperators, setFavOperators] = useAtom(favOperatorAtom)

  const operatorNoneGroupedIndex = existedOperators.findIndex(
    ({ name: existedName }) => existedName === name,
  )
  const operatorInGroup = existedGroups
    .map(({ opers }) => opers)
    .flat()
    .filter((item) => !!item)
    .find(({ name: existedName }) => existedName === name)
  const selected = operatorNoneGroupedIndex !== -1
  const grouped = !!operatorInGroup
  const operator = existedOperators?.[operatorNoneGroupedIndex] ||
    operatorInGroup ||
    favOperators.find(({ name: exsitedName }) => exsitedName === name) || {
      name,
    }
  const selectedInView = selected || grouped

  const pinned = isEqual(
    omit(operator, [...ignoreKeyDic]),
    omit(
      favOperators.find(({ name: exsitedName }) => exsitedName === name),
      [...ignoreKeyDic],
    ),
  )

  const onOperatorSelect = () => {
    if (grouped)
      AppToaster.show({
        message:
          t.components.editor.operator.sheet.sheetOperator.SheetOperatorItem.operator_in_group(
            { name },
          ),
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
      skill: skill || 1,
      skillUsage: skillUsage || 0,
      skillTimes:
        skillUsage === CopilotDocV1.SkillUsageType.ReadyToUseTimes
          ? skillTimes || 1
          : undefined,
    }
    setFavOperators([
      ...[...favOperators].filter(({ name }) => name !== formattedValue.name),
      { ...formattedValue },
    ])
    submitOperatorInSheet(formattedValue)
  }

  const onPinnedChange = () => {
    if (pinned)
      setFavOperators(
        [...favOperators].filter(
          ({ name: existedName }) => existedName !== name,
        ),
      )
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
        <OperatorAvatar className="mt-3" name={name} size="verylarge" />
        <p
          className={clsx(
            'mt-1 font-bold leading-tight text-center',
            'break-words', // Allow text to break to next line
          )}
        >
          {useLocalizedOperatorName(name)}
        </p>

        {selected && (
          <div
            className="absolute top-2 right-2"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            {(() => {
              const isFavDuplicate = favOperators.find(
                ({ name: existedName }) => existedName === name,
              )
              return (
                <Popover2
                  content={
                    <Button minimal onClick={onPinnedChange}>
                      <Icon
                        icon={pinned ? 'pin' : 'warning-sign'}
                        className={clsx(pinned && '-rotate-45')}
                      />
                      <span>
                        {pinned
                          ? t.components.editor.operator.sheet.sheetOperator
                              .SheetOperatorItem.remove_from_favorites
                          : t.components.editor.operator.sheet.sheetOperator
                              .SheetOperatorItem.will_replace_operator}
                      </span>
                    </Button>
                  }
                  disabled={!pinned && !isFavDuplicate}
                >
                  <Icon
                    icon={pinned ? 'pin' : 'unpin'}
                    className={clsx(pinned && '-rotate-45')}
                    onClick={
                      !pinned && !isFavDuplicate ? onPinnedChange : undefined
                    }
                  />
                </Popover2>
              )
            })()}
          </div>
        )}
      </>
      {selected && showSkillTrigger && (
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
          <Icon
            icon="warning-sign"
            size={12}
            className="flex items-center mr-1"
          />
          <p className="font-semibold">
            {
              t.components.editor.operator.sheet.sheetOperator.SheetOperatorItem
                .in_group
            }
          </p>
        </div>
      )}
    </Card>
  )
}
