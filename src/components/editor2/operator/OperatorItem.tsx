import { Button, Card, Classes, Icon, Menu, MenuItem } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

import clsx from 'clsx'
import { useSetAtom } from 'jotai'
import { FC, memo } from 'react'

import { i18n, useTranslation } from '../../../i18n/i18n'
import { OPERATORS, useLocalizedOperatorName } from '../../../models/operator'
import { OperatorAvatar } from '../../OperatorAvatar'
import { AppToaster } from '../../Toaster'
import { SortableItemProps } from '../../dnd'
import { EditorOperator } from '../editor-state'
import { editorFavOperatorsAtom } from '../reconciliation'

interface OperatorItemProps extends Partial<SortableItemProps> {
  operator: EditorOperator
  onOverlay?: boolean
  onChange?: (operator: EditorOperator) => void
  onRemove?: () => void
}

export const OperatorItem: FC<OperatorItemProps> = memo(
  ({ operator, onRemove, isDragging, attributes, listeners }) => {
    const t = useTranslation()
    const displayName = useLocalizedOperatorName(operator.name)
    const setFavOperators = useSetAtom(editorFavOperatorsAtom)
    const info = OPERATORS.find(({ name }) => name === operator.name)

    return (
      <div
        className={clsx('relative flex items-start', isDragging && 'invisible')}
      >
        <div className="relative">
          <Popover2
            placement="top"
            content={
              <Menu>
                <MenuItem
                  icon="star"
                  text={t.components.editor2.OperatorItem.add_to_favorites}
                  onClick={() => {
                    setFavOperators((prev) => [...prev, operator])
                    AppToaster.show({
                      message:
                        t.components.editor2.OperatorItem.added_to_favorites,
                      intent: 'success',
                    })
                  }}
                />
                <MenuItem
                  icon="trash"
                  text={t.common.delete}
                  intent="danger"
                  onClick={onRemove}
                />
              </Menu>
            }
          >
            <Card
              interactive
              className="card-shadow-subtle relative w-24 p-0 !py-0 flex flex-col overflow-hidden select-none pointer-events-auto"
              {...attributes}
              {...listeners}
            >
              <OperatorAvatar
                id={info?.id}
                rarity={info?.rarity}
                className="w-24 h-24 rounded-b-none"
                fallback={displayName}
                sourceSize={96}
              />
              <h4
                className={clsx(
                  'm-1 leading-4 font-semibold tracking-tighter pointer-events-none',
                  displayName.length >= 12 && 'text-xs',
                )}
              >
                {displayName}
              </h4>
              {info && info.prof !== 'TOKEN' && (
                <img
                  className="absolute top-0 right-0 w-5 h-5 p-px bg-gray-600 pointer-events-none"
                  src={'/assets/prof-icons/' + info.prof + '.png'}
                  alt={info.prof}
                />
              )}
            </Card>
          </Popover2>
        </div>
      </div>
    )
  },
)
OperatorItem.displayName = 'OperatorItem'
