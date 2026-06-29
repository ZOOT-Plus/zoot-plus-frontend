import { Button, Card, Classes, Collapse, H6, Icon, Intent, Position } from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { DetailedHTMLProps, Dispatch, FC, ReactNode, SetStateAction, useMemo, useState } from 'react'

import { getLocalizedOperatorName } from 'models/operator'

import { languageAtom, useTranslation } from '../../../../../i18n/i18n'
import { OperatorAvatar } from '../../../../OperatorAvatar'
import { Group } from '../../EditorSheet'
import { SheetContainerSkeleton, SheetContainerSkeletonProps } from '../SheetContainerSkeleton'
import { OperatorNoData } from '../SheetNoneData'
import { useSheet } from '../SheetProvider'
import { CollapseButton } from './CollapseButton'

export interface SheetOperatorEditorProp extends SheetOperatorEditorFormProp {}

export const SheetOperatorEditor: FC<SheetOperatorEditorProp> = ({ ...SheetOperatorEditorFormProps }) => {
  const t = useTranslation()

  return (
    <Popover2
      className="w-full"
      content={<SheetOperatorEditorForm {...SheetOperatorEditorFormProps} />}
      position={Position.TOP}
    >
      <Card
        className="flex items-center justify-center"
        interactive
        title={t.components.editor.operator.sheet.sheetGroup.SheetOperatorEditor.edit_operator_info}
      >
        <Icon icon="plus" size={30} />
      </Card>
    </Popover2>
  )
}

type OperatorInSheetOperatorEditor = {
  groupName?: string
  operName: string
}

interface SheetOperatorEditorFormProp {
  name: Group['name']
  opers?: Group['opers']
}

const SheetOperatorEditorForm: FC<SheetOperatorEditorFormProp> = ({ name, opers = [] }) => {
  const t = useTranslation()
  const { existedOperators, existedGroups, removeOperator, submitGroupInSheet } = useSheet()
  const [selectedOperators, setSelectedOperators] = useState<OperatorInSheetOperatorEditor[]>(
    opers.map(({ name: operName }) => ({
      groupName: name,
      operName,
    })),
  )
  const otherGroups = useMemo(
    () => existedGroups.filter(({ name: existedName, opers }) => existedName !== name && !!opers?.length),
    [existedGroups, name],
  )

  const onSubmit: DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>['onSubmit'] = (e) => {
    e.preventDefault()
    const needModifyGroups = selectedOperators.reduce(
      (acc, { groupName, operName }) => {
        const key = groupName || 'noneGrouped'
        if (acc[key]) acc[key].push(operName)
        else acc[key] = [operName]
        return acc
      },
      {} as Record<Group['name'], OperatorInSheetOperatorEditor['operName'][]>,
    )
    let newOpers: Group['opers'] = []
    Object.entries(needModifyGroups).forEach(([key, value]) => {
      if (key === 'noneGrouped') {
        removeOperator(
          value.map((name) => {
            const index = existedOperators.findIndex(({ name: existedName }) => existedName === name)
            newOpers?.push(existedOperators[index])
            return index
          }),
        )
      } else {
        const { opers: otherGroupOpers, ...groupRestField } = existedGroups.find(
          ({ name: existedGroups }) => existedGroups === key,
        )!
        newOpers = newOpers?.concat(
          value.map((name) => otherGroupOpers?.find(({ name: existedName }) => existedName === name)!),
        )
        if (key !== name)
          submitGroupInSheet({
            ...groupRestField,
            opers: otherGroupOpers?.filter(({ name }) => !value.includes(name)),
          })
      }
    })

    submitGroupInSheet({
      ...existedGroups.find(({ name: existedName }) => existedName === name)!,
      opers: newOpers,
    })
  }

  const onReset = () => {
    setSelectedOperators(
      opers.map(({ name: operName }) => ({
        groupName: name,
        operName,
      })),
    )
  }

  return (
    <SheetContainerSkeleton
      title={t.components.editor.operator.sheet.sheetGroup.SheetOperatorEditor.select_operator}
      icon="select"
    >
      <form className="mt-3" onSubmit={onSubmit}>
        <div className="max-h-96 overflow-y-auto overflow-x-hidden">
          <OperatorSelectorSkeleton
            icon="person"
            title={t.components.editor.operator.sheet.sheetGroup.SheetOperatorEditor.selected_operators}
            collapseDisabled={!opers.length}
          >
            <OperatorSelectorItem {...{ selectedOperators, setSelectedOperators, opers }} />
          </OperatorSelectorSkeleton>
          <OperatorSelectorSkeleton
            icon="person"
            title={t.components.editor.operator.sheet.sheetGroup.SheetOperatorEditor.unselected_operators}
            collapseDisabled={!existedOperators.length}
          >
            <OperatorSelectorItem
              {...{
                selectedOperators,
                setSelectedOperators,
                opers: existedOperators,
              }}
            />
          </OperatorSelectorSkeleton>
          <OperatorSelectorSkeleton
            icon="people"
            title={t.components.editor.operator.sheet.sheetGroup.SheetOperatorEditor.operators_in_other_groups}
            collapseDisabled={!otherGroups?.length}
          >
            {otherGroups.map(({ name: otherGroupName, opers }) => (
              <div key={otherGroupName}>
                <div className="flex flex-row-reverse items-center">
                  <H6 className="p-0 m-0">{otherGroupName}</H6>
                  <Button
                    minimal
                    icon="arrow-top-left"
                    title={t.components.editor.operator.sheet.sheetGroup.SheetOperatorEditor.select_all}
                    onClick={() =>
                      opers?.forEach(({ name }) => {
                        if (selectedOperators.find(({ operName }) => operName === name)) return
                        setSelectedOperators((prev) => [...prev, { operName: name, groupName: otherGroupName }])
                      })
                    }
                  />
                </div>
                <OperatorSelectorItem
                  {...{
                    selectedOperators,
                    setSelectedOperators,
                    opers,
                    groupName: otherGroupName,
                  }}
                />
              </div>
            ))}
          </OperatorSelectorSkeleton>
        </div>
        <div className="flex p-0.5">
          <Button
            text={t.components.editor.operator.sheet.sheetGroup.SheetOperatorEditor.confirm}
            className={Classes.POPOVER_DISMISS}
            type="submit"
          />
          <Popover2
            captureDismiss
            content={
              <div className="flex items-center">
                <p>{t.components.editor.operator.sheet.sheetGroup.SheetOperatorEditor.unsaved_data_warning}</p>
                <Button
                  type="reset"
                  text={t.components.editor.operator.sheet.sheetGroup.SheetOperatorEditor.continue}
                  onClick={onReset}
                  className={clsx(Classes.POPOVER_DISMISS, 'mx-1')}
                />
                <Button
                  text={t.components.editor.operator.sheet.sheetGroup.SheetOperatorEditor.cancel}
                  className={Classes.POPOVER_DISMISS}
                />
              </div>
            }
            position={Position.TOP}
          >
            <Button
              intent={Intent.DANGER}
              className="ml-1"
              text={t.components.editor.operator.sheet.sheetGroup.SheetOperatorEditor.reset}
            />
          </Popover2>
        </div>
      </form>
    </SheetContainerSkeleton>
  )
}

const OperatorSelectorItem: FC<{
  selectedOperators: OperatorInSheetOperatorEditor[]
  setSelectedOperators: Dispatch<SetStateAction<OperatorInSheetOperatorEditor[]>>
  groupName?: OperatorInSheetOperatorEditor['groupName']
  opers: Group['opers']
}> = ({ selectedOperators, setSelectedOperators, groupName, opers }) => {
  const language = useAtomValue(languageAtom)

  return (
    <div className="flex flex-wrap">
      {opers?.map(({ name }) => {
        const selected = !!selectedOperators.find(({ operName }) => operName === name)
        return (
          <Card
            key={name}
            interactive={!selected}
            className={clsx(
              selected && 'scale-90 bg-gray-200',
              'w-1/4 p-0.5 flex flex-col items-center cursor-pointer',
            )}
            onClick={() => {
              setSelectedOperators((prev) =>
                selected
                  ? prev.filter(({ operName: selectedOperName }) => selectedOperName !== name)
                  : [...prev, { groupName, operName: name }],
              )
            }}
          >
            <OperatorAvatar name={name} size="large" />
            <p className="mt-1 font-bold leading-tight text-center break-words">
              {getLocalizedOperatorName(name, language)}
            </p>
          </Card>
        )
      })}
    </div>
  )
}

const OperatorSelectorSkeleton: FC<{
  collapseDisabled: boolean
  title: SheetContainerSkeletonProps['title']
  icon: SheetContainerSkeletonProps['icon']
  children: ReactNode
}> = ({ children, collapseDisabled, ...sheetContainerSkeletonProps }) => {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <SheetContainerSkeleton
      {...sheetContainerSkeletonProps}
      mini
      className="w-96"
      rightOptions={
        <CollapseButton isCollapse={isOpen} onClick={() => setIsOpen((prev) => !prev)} disabled={collapseDisabled} />
      }
    >
      {collapseDisabled ? (
        <OperatorNoData />
      ) : (
        <Collapse isOpen={isOpen} className="m-0.5">
          {children}
        </Collapse>
      )}
    </SheetContainerSkeleton>
  )
}
