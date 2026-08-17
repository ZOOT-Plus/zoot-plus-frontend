import { Button, Card, Icon, Intent, PopoverNext } from '@blueprintjs/core'

import clsx from 'clsx'
import { useAtom } from 'jotai'
import { isEqual, omit } from 'lodash-es'
import { FC } from 'react'

import { AppToaster } from 'components/Toaster'
import { useLocalizedOperatorName } from 'models/operator'
import { ignoreKeyDic } from 'store/useFavGroups'
import { favOperatorAtom } from 'store/useFavOperators'

import { useTranslation } from '../../../../i18n/i18n'
import { OperatorAvatar } from '../../../OperatorAvatar'
import { useSheet } from '../../../editor/operator/sheet/SheetProvider'

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
  const operator = existedOperators?.[operatorNoneGroupedIndex] ||
    operatorInGroup ||
    favOperators.find(({ name: exsitedName }) => exsitedName === name) || {
      name,
    }
  const operatorWithoutSkill = omit(operator, ['skill', 'skillUsage', 'skillTimes']) as typeof operator
  const selectedInView = selected || grouped

  const pinned = isEqual(
    omit(operatorWithoutSkill, [...ignoreKeyDic]),
    omit(
      favOperators.find(({ name: exsitedName }) => exsitedName === name),
      [...ignoreKeyDic, 'skill', 'skillUsage', 'skillTimes'],
    ),
  )

  const onOperatorSelect = () => {
    if (grouped)
      AppToaster.show({
        message: t.components.editor.operator.sheet.sheetOperator.SheetOperatorItem.operator_in_group({ name }),
        intent: Intent.DANGER,
      })
    else {
      if (selected) {
        removeOperator(operatorNoneGroupedIndex)
      } else submitOperatorInSheet(operatorWithoutSkill)
    }
  }

  const updateFavOperator = () => {
    setFavOperators([
      ...[...favOperators].filter(({ name }) => name !== operatorWithoutSkill.name),
      { ...operatorWithoutSkill },
    ])
    submitOperatorInSheet(operatorWithoutSkill)
  }

  const onPinnedChange = () => {
    if (pinned) setFavOperators([...favOperators].filter(({ name: existedName }) => existedName !== name))
    else updateFavOperator()
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
      <div className="flex min-h-0 grow w-full flex-col items-center justify-center gap-2 px-2 py-3">
        <OperatorAvatar className="!h-12 !w-12 shrink-0" name={name} size="large" sourceSize={96} />
        <p
          className={clsx(
            'max-w-full text-xs font-bold leading-tight text-center',
            'break-words', // Allow text to break to next line
          )}
        >
          {useLocalizedOperatorName(name)}
        </p>
      </div>

      {selected && (
        <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()} role="presentation">
          {(() => {
            const isFavDuplicate = favOperators.find(({ name: existedName }) => existedName === name)
            return (
              <PopoverNext
                content={
                  <Button minimal onClick={onPinnedChange}>
                    <Icon icon={pinned ? 'pin' : 'warning-sign'} className={clsx(pinned && '-rotate-45')} />
                    <span>
                      {pinned
                        ? t.components.editor.operator.sheet.sheetOperator.SheetOperatorItem.remove_from_favorites
                        : t.components.editor.operator.sheet.sheetOperator.SheetOperatorItem.will_replace_operator}
                    </span>
                  </Button>
                }
                disabled={!pinned && !isFavDuplicate}
              >
                <Icon
                  icon={pinned ? 'pin' : 'unpin'}
                  className={clsx(pinned && '-rotate-45')}
                  onClick={!pinned && !isFavDuplicate ? onPinnedChange : undefined}
                />
              </PopoverNext>
            )
          })()}
        </div>
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
