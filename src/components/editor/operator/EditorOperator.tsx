import { Icon, IconSize, MenuItem } from '@blueprintjs/core'

import clsx from 'clsx'
import Fuse from 'fuse.js'
import { useAtomValue } from 'jotai'
import { ReactNode, useMemo } from 'react'
import { FieldValues, useController } from 'react-hook-form'

import { EditorFieldProps } from 'components/editor/EditorFieldProps'

import { languageAtom, useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import {
  OPERATORS,
  findOperatorById,
  findOperatorByName,
} from '../../../models/operator'
import { Suggest } from '../../Suggest'

type OperatorInfo = (typeof OPERATORS)[number]
type PerformerItem = OperatorInfo | CopilotDocV1.Group

const isOperator = (item: PerformerItem): item is OperatorInfo =>
  !!(item as OperatorInfo).alias

const createArbitraryOperator = (name: string): OperatorInfo => ({
  id: '',
  name,
  alias: '',
  alt_name: '',
  subProf: '',
  name_en: '',
  prof: '',
  rarity: 0,
})

export const EditorOperatorName = <T extends FieldValues>({
  groups,
  name,
  control,
  rules,
  operators,
  ...controllerProps
}: EditorFieldProps<T, string> & {
  groups?: CopilotDocV1.Group[]
  operators?: CopilotDocV1.Operator[]
}) => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)

  const entityName = useMemo(
    () =>
      groups
        ? t.components.editor.operator.EditorOperator.operator_or_group
        : t.components.editor.operator.EditorOperator.operator,
    [groups, t],
  )

  const {
    field: { onChange, onBlur, value },
    fieldState,
  } = useController({
    name,
    control,
    rules: {
      required: t.components.editor.operator.EditorOperator.please_enter_name({
        entityName,
      }),
      ...rules,
    },
    ...controllerProps,
  })

  const items: PerformerItem[] = useMemo(() => {
    const _selectOperators: CopilotDocV1.Operator[] = operators || []
    if (!_selectOperators.length) return [...(groups || []), ...OPERATORS]
    // 已选择的名称做 set
    const _selectedOperatorsNameSet = new Set<string>()
    _selectOperators.forEach((v) => {
      _selectedOperatorsNameSet.add(v.name)
    })
    // 已选择的
    const _selectedOperators: OperatorInfo[] = []
    // 过滤出未加入干员列表的干员，顺便插入已选择的列表
    const _OPERATORS = OPERATORS.filter((v) => {
      const has = _selectedOperatorsNameSet.has(v.name)
      if (has) _selectedOperators.push(v)
      return !has
    })
    // 干员组和已选择的放前面
    return [...(groups || []), ..._selectedOperators, ..._OPERATORS]
  }, [groups, operators])

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ['name', 'name_en', 'alias', 'alt_name'],
        threshold: 0.3,
      }),
    [items],
  )

  return (
    <Suggest<PerformerItem>
      items={items}
      itemListPredicate={(query) =>
        query ? fuse.search(query).map((el) => el.item) : items
      }
      fieldState={fieldState}
      onReset={() => onChange('')}
      itemRenderer={(item, { handleClick, handleFocus, modifiers }) => (
        <MenuItem
          key={'id' in item ? item.id : item.name}
          text={
            isOperator(item) && language === 'en' && item.name_en
              ? item.name_en
              : item.name
          }
          icon={
            isOperator(item) ? (
              <OperatorAvatar id={item.id} size="small" />
            ) : (
              <Icon icon="people" size={IconSize.LARGE} />
            )
          }
          onClick={handleClick}
          onFocus={handleFocus}
          selected={modifiers.active}
          disabled={modifiers.disabled}
        />
      )}
      onItemSelect={(item) => onChange(item.name)}
      selectedItem={createArbitraryOperator((value || '') as string)}
      inputValueRenderer={(item) =>
        isOperator(item) && language === 'en' && item.name_en
          ? item.name_en
          : item.name
      }
      createNewItemFromQuery={(query) => createArbitraryOperator(query)}
      createNewItemRenderer={(query, active, handleClick) => (
        <MenuItem
          key="create-new-item"
          text={t.components.editor.operator.EditorOperator.use_custom_name({
            entityName,
            query,
          })}
          icon="text-highlight"
          onClick={handleClick}
          selected={active}
        />
      )}
      noResults={
        <MenuItem
          disabled
          text={t.components.editor.operator.EditorOperator.no_matching_entity({
            entityName,
          })}
        />
      }
      inputProps={{
        placeholder: t.components.editor.operator.EditorOperator.entity_name({
          entityName,
        }),
        large: true,
        onBlur,
      }}
      popoverProps={{
        placement: 'bottom-start',
      }}
    />
  )
}

export const OperatorAvatar = ({
  id,
  name,
  rarity,
  size,
  fallback = '?',
  className,
}: {
  id?: string
  name?: string
  rarity?: number
  size?: 'small' | 'medium' | 'large'
  fallback?: ReactNode
  className?: string
}) => {
  let info: OperatorInfo | undefined
  if (id) {
    info = findOperatorById(id)
  } else if (name) {
    info = findOperatorByName(name)
    id = info?.id
  }
  rarity ??= info?.rarity

  const sizingClassName =
    size &&
    {
      small: 'h-5 w-5',
      medium: 'h-6 w-6',
      large: 'h-8 w-8',
    }[size]

  const colorClassName =
    rarity === 6
      ? 'bg-orange-200 ring-orange-300'
      : rarity === 5
        ? 'bg-yellow-100 ring-yellow-200'
        : rarity === 4
          ? 'bg-purple-100 ring-purple-200'
          : 'bg-slate-100 ring-slate-200'

  const commonClassName =
    'ring-inset ring-2 border-solid rounded-md object-cover'

  return id ? (
    <img
      className={clsx(
        sizingClassName,
        colorClassName,
        commonClassName,
        className,
      )}
      src={'/assets/operator-avatars/' + id + '.png'}
      alt={id}
      // lazy 要配合 width和 height 使用，不然图片提前很多就加载了
      loading="lazy"
      width="180"
      height="180"
    />
  ) : (
    <div
      className={clsx(
        sizingClassName,
        colorClassName,
        commonClassName,
        'flex items-center justify-center font-bold text-2xl text-slate-300 truncate select-none',
        className,
      )}
    >
      <div className="min-w-0">{fallback}</div>
    </div>
  )
}
