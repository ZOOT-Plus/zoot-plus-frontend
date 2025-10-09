import {
  Alert,
  Button,
  Card,
  Collapse,
  Icon,
  Intent,
  Menu,
  MenuItem,
} from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'

import clsx from 'clsx'
import { useAtom } from 'jotai'
import { cloneDeep, isEqual, omit } from 'lodash-es'
import { FC, ReactNode, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { CardDeleteOption } from 'components/editor/CardOptions'
import { favGroupAtom, ignoreKeyDic } from 'store/useFavGroups'

import { useTranslation } from '../../../../../i18n/i18n'
import { Group, Operator } from '../../EditorSheet'
import { GroupListModifyProp } from '../SheetGroup'
import { OperatorNoData } from '../SheetNoneData'
import { useSheet } from '../SheetProvider'
import { CollapseButton, SheetGroupOperatorSelectProp } from './CollapseButton'
import {
  OperatorInGroupItem,
  OperatorInGroupItemProp,
} from './OperatorInGroupItem'
import { SheetOperatorEditor } from './SheetOperatorEditor'

export interface GroupItemProps
  extends SheetGroupOperatorSelectProp,
    GroupListModifyProp {
  exist: boolean
  pinned: boolean
}

const GroupTitle = ({
  groupTitle,
  // editable,
  renameSubmit,
}: {
  editable: boolean
  renameSubmit?: (newName: string) => void
  groupTitle: string
}) => {
  const t = useTranslation()
  const editable = !!renameSubmit
  const [editName, setEditName] = useState('')
  const [nameEditState, setNameEditState] = useState(false)
  const [alertState, setAlertState] = useState(false)
  const { register, handleSubmit, reset } = useForm<Group>()
  // handle differ priority of capture events
  const ignoreBlur = useRef(false)
  const blurHandle = () => {
    if (!ignoreBlur.current) {
      if (groupTitle !== editName && editName) setAlertState(true)
      setNameEditState(false)
    } else ignoreBlur.current = false
  }
  const editCancel = () => {
    setNameEditState(false)
    setEditName(groupTitle)
    reset()
    setAlertState(false)
  }
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { ref, ...registerRest } = register('name', {
    onBlur: blurHandle,
    value: editName,
    onChange: (e) => setEditName(e.target.value),
  })
  const editContinue = () => {
    setNameEditState(true)
    setAlertState(false)
    inputRef.current?.focus()
  }

  return (
    <>
      <Alert
        onConfirm={editContinue}
        intent={Intent.DANGER}
        onCancel={editCancel}
        confirmButtonText={
          t.components.editor.operator.sheet.sheetGroup.SheetGroupItem.cancel
        }
        cancelButtonText={
          t.components.editor.operator.sheet.sheetGroup.SheetGroupItem.confirm
        }
        isOpen={alertState}
      >
        <p>
          {
            t.components.editor.operator.sheet.sheetGroup.SheetGroupItem
              .unsaved_changes
          }
        </p>
      </Alert>
      <form
        className="flex items-center"
        onSubmit={handleSubmit(() => {
          ignoreBlur.current = true
          renameSubmit?.(editName || groupTitle)
          setNameEditState(false)
          inputRef.current?.blur()
        })}
      >
        <div className="flex items-center w-full">
          <Icon icon="people" />
          <input
            title={
              t.components.editor.operator.sheet.sheetGroup.SheetGroupItem
                .edit_group_name
            }
            className={clsx(
              'ml-1 w-full bg-transparent text-xs',
              !editable && 'placeholder:text-current',
            )}
            autoComplete="off"
            disabled={!editable}
            onFocus={() => setNameEditState(true)}
            placeholder={groupTitle}
            type="text"
            ref={(e) => {
              ref(e)
              inputRef.current = e
            }}
            onKeyDown={(e) => {
              if (e.key.toLowerCase() === 'enter') e.preventDefault()
            }}
            {...registerRest}
          />
          {nameEditState && (
            <Button
              minimal
              icon="tick"
              type="submit"
              onMouseDown={(e) => e.preventDefault()}
            />
          )}
        </div>
      </form>
    </>
  )
}

type ItemType = 'recommend' | 'selected' | 'fav'

export interface SheetGroupItemProp {
  groupInfo: Group
  itemType: ItemType
}

export const SheetGroupItem: FC<SheetGroupItemProp> = ({
  groupInfo,
  itemType,
}) => {
  const {
    selected,
    onGroupNameChange,
    defaultOperatorCollapseOpen,
    ActionList,
    onOperatorSkillChange,
  } = useSheetGroupItemController({
    groupInfo,
    itemType,
  })
  const [operatorCollapse, setOperatorCollapse] = useState(
    defaultOperatorCollapseOpen,
  )

  return (
    <Card interactive={!selected} className="mt-1 mx-0.5">
      <div className="flex items-center justify-between">
        <GroupTitle
          groupTitle={groupInfo.name}
          editable
          renameSubmit={onGroupNameChange}
        />
        <div className="flex items-center">
          <CollapseButton
            isCollapse={operatorCollapse}
            onClick={() => setOperatorCollapse((prev) => !prev)}
          />
          {ActionList}
        </div>
      </div>
      <Collapse isOpen={operatorCollapse}>
        <div className="w-full pt-1">
          {groupInfo.opers?.length
            ? groupInfo.opers?.map((item) => (
                <OperatorInGroupItem
                  key={item.name}
                  operatorInfo={item}
                  onOperatorSkillChange={onOperatorSkillChange}
                />
              ))
            : !selected && <OperatorNoData />}
          {selected && <SheetOperatorEditor {...groupInfo} />}
        </div>
      </Collapse>
    </Card>
  )
}

type SheetGroupItemController = {
  selected: boolean
  onGroupNameChange: ((name: string) => void) | undefined
  defaultOperatorCollapseOpen: boolean
  onOperatorSkillChange: OperatorInGroupItemProp['onOperatorSkillChange']
  ActionList: ReactNode
}

const useSheetGroupItemController = ({
  groupInfo: { name, opers = [], ...rest },
  itemType,
}: SheetGroupItemProp): SheetGroupItemController => {
  const t = useTranslation()
  const { submitGroupInSheet, removeGroup, existedGroups } = useSheet()
  const [favGroup, setFavGroup] = useAtom(favGroupAtom)

  switch (itemType) {
    case 'selected': {
      const findFavByName = favGroup.find(
        ({ name: nameInFav }) => nameInFav === name,
      )
      const pinned = isEqual({ name, opers }, findFavByName)

      const onPinChange: GroupPinOptionProp['onPinChange'] = () => {
        const newFavGroup = [
          ...favGroup.filter(({ name: nameInFav }) => nameInFav !== name),
        ]
        setFavGroup(
          pinned
            ? newFavGroup
            : [...newFavGroup, cloneDeep({ name, opers, ...rest })],
        )
      }
      return {
        selected: true,
        onGroupNameChange: (name: string) =>
          submitGroupInSheet({ opers, ...rest, name }),
        defaultOperatorCollapseOpen: true,
        onOperatorSkillChange: (operator: Operator) => {
          opers.splice(
            opers.findIndex(
              ({ name: nameInExist }) => nameInExist === operator.name,
            ),
            1,
            operator,
          )
          submitGroupInSheet({ opers, name, ...rest })
        },
        ActionList: (
          <>
            <CardDeleteOption
              onClick={() =>
                removeGroup(
                  existedGroups.findIndex(
                    ({ name: nameInExist }) => nameInExist === name,
                  ),
                )
              }
            />
            <GroupPinOption
              pinned={pinned}
              onPinChange={onPinChange}
              isDuplicate={!!findFavByName}
            />
          </>
        ),
      }
    }
    case 'recommend': {
      return {
        selected: false,
        onGroupNameChange: undefined,
        defaultOperatorCollapseOpen: false,
        onOperatorSkillChange: undefined,
        ActionList: (
          <>
            <Button
              minimal
              icon="arrow-left"
              title={
                t.components.editor.operator.sheet.sheetGroup.SheetGroupItem
                  .use_recommended_group
              }
              onClick={() => submitGroupInSheet({ name, opers })}
            />
          </>
        ),
      }
    }
    case 'fav': {
      const selected = existedGroups.find(
        ({ name: nameInExist }) => nameInExist === name,
      )
      const equal = selected
        ? isEqual(omit(selected, ...ignoreKeyDic), { name, opers })
        : false
      const onPinChange: GroupPinOptionProp['onPinChange'] = () => {
        setFavGroup(
          favGroup.filter(({ name: nameInFav }) => nameInFav !== name),
        )
      }

      return {
        selected: false,
        onGroupNameChange: (name: string) =>
          setFavGroup([
            ...favGroup.filter(({ name: favName }) => favName !== name),
            { opers, name, ...rest },
          ]),
        defaultOperatorCollapseOpen: false,
        onOperatorSkillChange: (operator: Operator) => {
          opers.splice(
            opers.findIndex(
              ({ name: nameInExist }) => nameInExist === operator.name,
            ),
            1,
            operator,
          )
          favGroup.splice(
            favGroup.findIndex(
              ({ name: nameInFav }) => nameInFav === operator.name,
            ),
            1,
            { name, opers, ...rest },
          )
          setFavGroup(favGroup)
        },
        ActionList: (
          <>
            <Button
              minimal
              disabled={!!selected}
              icon={selected && equal ? 'tick' : 'arrow-left'}
              title={
                selected
                  ? equal
                    ? t.components.editor.operator.sheet.sheetGroup
                        .SheetGroupItem.already_added
                    : t.components.editor.operator.sheet.sheetGroup
                        .SheetGroupItem.same_name_detected
                  : t.components.editor.operator.sheet.sheetGroup.SheetGroupItem
                      .use_recommended_group
              }
              onClick={() => submitGroupInSheet({ name, opers })}
            />
            <GroupPinOption pinned onPinChange={onPinChange} />
          </>
        ),
      }
    }
    default:
      return {
        selected: false,
        onGroupNameChange: undefined,
        defaultOperatorCollapseOpen: false,
        onOperatorSkillChange: undefined,
        ActionList: <></>,
      }
  }
}

interface GroupPinOptionProp {
  pinned: boolean
  onPinChange?: () => void
  isDuplicate?: boolean
}

const GroupPinOption: FC<GroupPinOptionProp> = ({
  pinned,
  onPinChange,
  isDuplicate = false,
}) => {
  const t = useTranslation()

  const pinText = pinned
    ? t.components.editor.operator.sheet.sheetGroup.SheetGroupItem
        .remove_from_favorites
    : isDuplicate
      ? t.components.editor.operator.sheet.sheetGroup.SheetGroupItem
          .will_replace_same_name
      : t.components.editor.operator.sheet.sheetGroup.SheetGroupItem
          .add_to_favorites

  return (
    <Popover2
      // 收藏分组操作的弹层需位于遮罩上方
      usePortal={true}
      popoverClassName="z-[1600]"
      portalClassName="z-[1600]"
      disabled={!pinned && !isDuplicate}
      content={
        <Menu className="p-0">
          <MenuItem
            text={pinText}
            icon={pinned ? 'star' : isDuplicate ? 'warning-sign' : 'star-empty'}
            onClick={onPinChange}
          />
        </Menu>
      }
    >
      <Button
        minimal
        icon={pinned ? 'star' : 'star-empty'}
        title={pinText}
        onClick={pinned || isDuplicate ? undefined : onPinChange}
      />
    </Popover2>
  )
}
