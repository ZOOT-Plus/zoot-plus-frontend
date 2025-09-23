import { Button, Card, Classes, Icon, Menu, MenuItem } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

import clsx from 'clsx'
import { useSetAtom } from 'jotai'
import { FC, memo } from 'react'

import { CopilotDocV1 } from 'models/copilot.schema'

import { i18n, useTranslation } from '../../../i18n/i18n'
import {
  OPERATORS,
  getDefaultRequirements,
  getModuleName,
  useLocalizedOperatorName,
  withDefaultRequirements,
} from '../../../models/operator'
import { OperatorAvatar } from '../../OperatorAvatar'
import { Select } from '../../Select'
import { AppToaster } from '../../Toaster'
import { SortableItemProps } from '../../dnd'
import { EditorOperator, useEdit } from '../editor-state'
import { editorFavOperatorsAtom } from '../reconciliation'

interface OperatorItemProps extends Partial<SortableItemProps> {
  operator: EditorOperator
  onOverlay?: boolean
  onChange?: (operator: EditorOperator) => void
  onRemove?: () => void
}

export const OperatorItem: FC<OperatorItemProps> = memo(
  ({
    operator,
    onChange,
    onRemove,
    onOverlay,
    isDragging,
    isSorting,
    attributes,
    listeners,
  }) => {
    const t = useTranslation()
    const edit = useEdit()
    const displayName = useLocalizedOperatorName(operator.name)
    const setFavOperators = useSetAtom(editorFavOperatorsAtom)
    const info = OPERATORS.find(({ name }) => name === operator.name)
    const requirements = withDefaultRequirements(
      operator.requirements,
      info?.rarity,
    )
    const controlsEnabled = !onOverlay && !isDragging && !isSorting

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

        {controlsEnabled && info?.modules && (
          <Select
            className="mt-2"
            filterable={false}
            items={[
              CopilotDocV1.Module.Default,
              ...info.modules
                .map((m) =>
                  m
                    ? (CopilotDocV1.Module[m] as
                        | CopilotDocV1.Module
                        | undefined)
                    : CopilotDocV1.Module.Original,
                )
                .filter((m) => m !== undefined),
            ]}
            itemRenderer={(
              value,
              { handleClick, handleFocus, modifiers },
            ) => (
              <MenuItem
                roleStructure="listoption"
                key={value}
                className={clsx(
                  'min-w-12 !rounded-none text-base font-serif font-bold text-center text-slate-600 dark:text-slate-300',
                  modifiers.active && Classes.ACTIVE,
                )}
                text={
                  value === CopilotDocV1.Module.Default ? (
                    <Icon icon="disable" />
                  ) : value === CopilotDocV1.Module.Original ? (
                    <Icon icon="small-square" />
                  ) : (
                    getModuleName(value)
                  )
                }
                title={t.components.editor2.OperatorItem.module_title({
                  count: value,
                  name: getModuleName(value),
                })}
                onClick={handleClick}
                onFocus={handleFocus}
                selected={value === requirements.module}
              />
            )}
            onItemSelect={(value) => {
              edit(() => {
                onChange?.({
                  ...operator,
                  requirements: {
                    ...operator.requirements,
                    module: value,
                  },
                })
                return {
                  action: 'set-operator-module',
                  desc: i18n.actions.editor2.set_operator_module,
                  squashBy: operator.id,
                }
              })
            }}
            popoverProps={{
              placement: 'top',
              popoverClassName:
                '!rounded-none [&_.bp4-popover2-content]:!p-0 [&_.bp4-menu]:min-w-0 [&_li]:!mb-0',
            }}
          >
            <Button
              small
              minimal
              title={
                t.components.editor2.OperatorItem.module +
                ': ' +
                t.components.editor2.OperatorItem.module_title({
                  count: requirements.module,
                  name: getModuleName(requirements.module),
                })
              }
              className={clsx(
                'w-4 h-4 !p-0 flex items-center justify-center font-serif !font-bold !text-base !rounded-none !border-2 !border-current',
                requirements.module !== CopilotDocV1.Module.Default
                  ? '!bg-purple-100 dark:!bg-purple-900 dark:!text-purple-200 !text-purple-800'
                  : '!bg-gray-300 dark:!bg-gray-600 opacity-15 dark:opacity-25 hover:opacity-30 dark:hover:opacity-50',
              )}
            >
              {requirements.module === CopilotDocV1.Module.Default ? (
                null
              ) : requirements.module === CopilotDocV1.Module.Original ? (
                <Icon icon="small-square" />
              ) : (
                getModuleName(requirements.module)
              )}
            </Button>
          </Select>
        )}

      </div>
    )
  },
)
OperatorItem.displayName = 'OperatorItem'
