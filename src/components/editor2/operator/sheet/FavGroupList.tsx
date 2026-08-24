import { Card, Intent } from '@blueprintjs/core'

import clsx from 'clsx'
import { produce } from 'immer'
import { useAtomValue } from 'jotai'
import { FC } from 'react'

import { i18n, useTranslation } from '../../../../i18n/i18n'
import { CopilotDocV1 } from '../../../../models/copilot.schema'
import { isSameOperatorConfig, useLocalizedOperatorName } from '../../../../models/operator'
import { OperatorAvatar } from '../../../OperatorAvatar'
import { AppToaster } from '../../../Toaster'
import { editorAtoms, useEdit } from '../../editor-state'
import { createGroup, createOperator, editorFavGroupsAtom } from '../../reconciliation'
import { SheetOperatorSkillAbout } from './SheetOperatorItem'

export const FavGroupList: FC = () => {
  const t = useTranslation()
  const favGroups = useAtomValue(editorFavGroupsAtom)
  const groups = useAtomValue(editorAtoms.groups)
  const edit = useEdit()

  if (!favGroups.length) {
    return null
  }

  const addGroup = (group: (typeof favGroups)[number]) => {
    edit((get, set, skip) => {
      const operation = get(editorAtoms.operation)
      const groupOperatorNames = new Set(group.opers?.map(({ name }) => name) ?? [])
      const conflictedOperatorNames = [
        ...new Set(
          operation.groups
            .flatMap(({ opers }) => opers)
            .filter(({ name }) => groupOperatorNames.has(name))
            .map(({ name }) => name),
        ),
      ]

      if (conflictedOperatorNames.length) {
        AppToaster.show({
          message: t.components.editor.operator.sheet.sheetOperator.SheetOperatorItem.operator_in_group({
            name: conflictedOperatorNames.join('、'),
          }),
          intent: Intent.DANGER,
        })
        return skip
      }

      set(
        editorAtoms.operation,
        produce(operation, (draft) => {
          draft.opers = draft.opers.filter(({ name }) => !groupOperatorNames.has(name))
          draft.groups.push({
            ...createGroup(group),
            opers: group.opers?.map((operator) => createOperator(operator)) ?? [],
          })
        }),
      )

      return {
        action: 'add-group',
        desc: i18n.actions.editor2.add_group,
      }
    })
  }

  return (
    <section className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
      <h3 className="mb-2 px-1 text-xs font-semibold text-gray-500">
        {t.components.editor.operator.sheet.SheetGroup.favorite_groups}
      </h3>
      <div className="flex flex-wrap items-start gap-2">
        {favGroups.map((group) => {
          const selected = groups.some((existedGroup) => isSameGroupConfig(existedGroup, group))

          return (
            <Card
              key={group.id}
              interactive={!selected}
              onClick={() => {
                if (!selected) {
                  addGroup(group)
                }
              }}
              className={clsx(
                '!p-0 inline-flex max-w-full w-fit flex-col overflow-hidden !rounded-none shadow-sm hover:!shadow',
                !selected && 'cursor-pointer',
                selected &&
                  '!bg-gray-200 text-gray-500 opacity-70 [&_img]:grayscale dark:!bg-gray-700 dark:text-gray-400',
              )}
            >
              <div className="min-w-0 px-3 py-2 text-base font-bold italic text-slate-400">
                <span className="block truncate">{group.name}</span>
              </div>
              <div className="flex max-w-full flex-wrap gap-2 px-3 pb-3">
                {group.opers?.length ? (
                  group.opers.map((operator, index) => (
                    <FavGroupOperatorItem
                      key={`${operator.name}-${index}`}
                      operator={operator as CopilotDocV1.Operator}
                    />
                  ))
                ) : (
                  <EmptyFavGroupOperatorItem label={t.components.editor2.OperatorEditor.no_operators} />
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

const FavGroupOperatorItem: FC<{ operator: CopilotDocV1.Operator }> = ({ operator }) => (
  <div className="flex h-32 w-32 shrink-0 flex-col items-center justify-center gap-2 border border-gray-200 px-2 py-3 dark:border-gray-600">
    <OperatorAvatar className="!h-12 !w-12 shrink-0" name={operator.name} size="large" sourceSize={96} />
    <p className="max-w-full break-words text-center text-xs font-bold leading-tight">
      {useLocalizedOperatorName(operator.name)}
    </p>
    <SheetOperatorSkillAbout operator={operator} />
  </div>
)

const EmptyFavGroupOperatorItem: FC<{ label: string }> = ({ label }) => (
  <div className="flex h-32 w-32 shrink-0 items-center justify-center border border-dashed border-gray-200 px-2 py-3 text-center text-[11px] font-semibold text-gray-400 dark:border-gray-600 dark:text-gray-500">
    {label}
  </div>
)

const isSameGroupConfig = (
  groupA: { name?: string; opers?: CopilotDocV1.Operator[] },
  groupB: { name?: string; opers?: CopilotDocV1.Operator[] },
) => {
  const operatorsA = groupA.opers ?? []
  const operatorsB = groupB.opers ?? []

  return (
    groupA.name === groupB.name &&
    operatorsA.length === operatorsB.length &&
    operatorsA.every((operatorA) =>
      operatorsB.some((operatorB) => isSameOperatorConfig(operatorA, operatorB, true)),
    )
  )
}
