import { Button, Divider, H6, InputGroup, Intent } from '@blueprintjs/core'

import { useAtomValue } from 'jotai'
import { FC, useMemo, useState } from 'react'

import { AppToaster } from 'components/Toaster'
import { OPERATORS, PROFESSIONS } from 'models/operator'
import { favGroupAtom } from 'store/useFavGroups'

import { useTranslation } from '../../../../i18n/i18n'
import { Group, Operator } from '../EditorSheet'
import { SheetContainerSkeleton, SheetContainerSkeletonProps } from './SheetContainerSkeleton'
import { GroupNoData } from './SheetNoneData'
import { useSheet } from './SheetProvider'
import { SheetGroupItem, SheetGroupItemProp } from './sheetGroup/SheetGroupItem'

export interface SheetGroupProps {}

export interface GroupListModifyProp {
  groupAddHandle?: (value: Group) => void
  groupRemoveHandle?: (_id: string) => void
  groupPinHandle?: (value: Group) => void
  groupUpdateHandle?: (value: Group) => void
}

const EditorGroupName: FC = () => {
  const t = useTranslation()
  const [groupName, setGroupName] = useState('')

  const { submitGroupInSheet } = useSheet()

  const addGroupHandle = () => {
    const name = groupName.trim()
    if (!name) {
      AppToaster.show({
        message: t.components.editor.operator.sheet.SheetGroup.group_name_empty,
        intent: Intent.DANGER,
      })
    } else {
      submitGroupInSheet({ name })
      setGroupName('')
    }
  }

  return (
    <div className="flex px-3 items-center">
      <InputGroup
        type="text"
        value={groupName}
        placeholder={t.components.editor.operator.sheet.SheetGroup.enter_group_name}
        onChange={(e) => setGroupName(e.target.value)}
        fill
      />
      <div className="flex items-center">
        <Button
          minimal
          icon="tick"
          title={t.components.editor.operator.sheet.SheetGroup.add}
          onClick={addGroupHandle}
        />
        <Button
          minimal
          icon="reset"
          title={t.components.editor.operator.sheet.SheetGroup.reset}
          onClick={() => setGroupName('')}
        />
      </div>
    </div>
  )
}

const SheetGroup: FC<SheetGroupProps> = () => {
  const t = useTranslation()
  const { existedGroups, existedOperators } = useSheet()

  const defaultGroup = useMemo<Group[]>(
    () =>
      Object.entries(
        existedOperators.reduce(
          (acc, { name, ...rest }) => {
            const { prof = '', subProf = '' } = OPERATORS.find(({ name: OPERName }) => OPERName === name) || {}
            const profInfo = PROFESSIONS.find(({ id }) => id === prof)
            const subProfName = profInfo?.sub?.find(({ id }) => id === subProf)?.name
            const key = (profInfo?.name || '其它') + (profInfo?.name ? '-' : '') + (subProfName || '')
            if (!acc[key]) acc[key] = []
            acc[key].push({ name, ...rest })
            return acc
          },
          {} as Record<string, Operator[]>,
        ),
      ).map(([key, value]) => ({
        name: key,
        opers: value,
      })),
    [existedOperators],
  )

  const favGroups = useAtomValue(favGroupAtom)

  return (
    <>
      <div className="flex px-1">
        <div className="flex-1 sticky top-0 h-screen flex flex-col">
          <div className="grow overflow-y-auto">
            <SheetContainerSkeleton
              title={t.components.editor.operator.sheet.SheetGroup.add_operator_group}
              icon="add"
              mini
              className="sticky top-0 z-10 backdrop-blur-lg py-1"
            >
              <EditorGroupName />
            </SheetContainerSkeleton>
            <SheetGroupItemsWithSkeleton
              title={t.components.editor.operator.sheet.SheetGroup.configured_groups}
              icon="cog"
              mini
              groups={existedGroups}
              itemType="selected"
            />
            {!!existedGroups.length && (
              <H6 className="my-2 text-center">
                {t.components.editor.operator.sheet.SheetGroup.group_count({
                  count: existedGroups.length,
                })}
              </H6>
            )}
          </div>
        </div>
        <Divider />
        <div className="flex-1">
          <SheetGroupItemsWithSkeleton
            title={t.components.editor.operator.sheet.SheetGroup.recommended_groups}
            icon="thumbs-up"
            mini
            groups={defaultGroup}
            itemType="recommend"
          />
          <SheetGroupItemsWithSkeleton
            title={t.components.editor.operator.sheet.SheetGroup.favorite_groups}
            icon="star"
            mini
            groups={favGroups}
            itemType="fav"
          />
        </div>
      </div>
    </>
  )
}

export const SheetGroupContainer: FC<SheetGroupProps> = () => {
  const t = useTranslation()
  return (
    <SheetContainerSkeleton title={t.components.editor.operator.sheet.SheetGroup.set_operator_groups} icon="people">
      <SheetGroup />
    </SheetContainerSkeleton>
  )
}

const SheetGroupItemsWithSkeleton: FC<
  SheetContainerSkeletonProps & {
    groups: SheetGroupItemProp['groupInfo'][]
    itemType: SheetGroupItemProp['itemType']
  }
> = ({ groups, itemType, ...sheetContainerSkeletonProps }) => (
  <SheetContainerSkeleton {...sheetContainerSkeletonProps}>
    <div>
      {groups.length ? (
        groups.map((item) => <SheetGroupItem key={item.name} groupInfo={item} itemType={itemType} />)
      ) : (
        <GroupNoData />
      )}
    </div>
  </SheetContainerSkeleton>
)
