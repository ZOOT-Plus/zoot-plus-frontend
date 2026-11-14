import { Icon, IconSize, MenuItem } from '@blueprintjs/core'
import Fuse from 'fuse.js'
import { useAtomValue } from 'jotai'
import { FC, useMemo } from 'react'

import { languageAtom, useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import { OPERATORS, OperatorInfo } from '../../../models/operator'
import { OperatorAvatar } from '../../OperatorAvatar'
import { Suggest } from '../../Suggest'
import { EditorOperator } from '../core/editor-state'

interface LegacyOperatorNameProps {
  value: string
  onChange: (name: string) => void
  groups?: Array<Pick<CopilotDocV1.Group, 'name'> & { id?: string }>
  operators?: Array<Pick<EditorOperator, 'name'>>
}

interface OperatorChoice extends OperatorInfo {
  kind: 'operator'
}

interface GroupChoice {
  kind: 'group'
  id: string
  name: string
}

interface CustomChoice {
  kind: 'custom'
  name: string
}

type LegacyPerformerItem = OperatorChoice | GroupChoice | CustomChoice

const operatorChoices: OperatorChoice[] = OPERATORS.map((operator) => ({ ...operator, kind: 'operator' }))

export const LegacyOperatorName: FC<LegacyOperatorNameProps> = ({ value, onChange, groups, operators }) => {
  const t = useTranslation()
  const language = useAtomValue(languageAtom)
  const entityName = groups
    ? t.components.editor.operator.EditorOperator.operator_or_group
    : t.components.editor.operator.EditorOperator.operator

  const groupChoices = useMemo<GroupChoice[]>(
    () =>
      groups?.map((group, index) => ({ kind: 'group', id: group.id || `${group.name}-${index}`, name: group.name })) ||
      [],
    [groups],
  )
  const items = useMemo<LegacyPerformerItem[]>(() => {
    const selectedNames = new Set(operators?.map((operator) => operator.name) || [])
    const selectedOperators = operators?.length
      ? operatorChoices.filter((operator) => selectedNames.has(operator.name))
      : []
    const remainingOperators = operators?.length
      ? operatorChoices.filter((operator) => !selectedNames.has(operator.name))
      : operatorChoices
    return [...groupChoices, ...selectedOperators, ...remainingOperators]
  }, [groupChoices, operators])

  const fuse = useMemo(
    () => new Fuse(items, { keys: ['name', 'name_en', 'alias', 'alt_name'], threshold: 0.3 }),
    [items],
  )
  const selectedItem =
    items.find((item) => item.name === value) || (value ? { kind: 'custom' as const, name: value } : null)

  return (
    <Suggest<LegacyPerformerItem>
      items={items}
      itemListPredicate={(query) => (query ? fuse.search(query).map((result) => result.item) : items)}
      onReset={() => onChange('')}
      itemRenderer={(item, { handleClick, handleFocus, modifiers }) => (
        <MenuItem
          key={item.kind === 'operator' ? item.id : `${item.kind}-${item.name}`}
          text={item.kind === 'operator' && language === 'en' && item.name_en ? item.name_en : item.name}
          icon={
            item.kind === 'operator' ? (
              <OperatorAvatar id={item.id} size="small" />
            ) : item.kind === 'group' ? (
              <Icon icon="people" size={IconSize.LARGE} />
            ) : undefined
          }
          onClick={handleClick}
          onFocus={handleFocus}
          selected={modifiers.active}
          disabled={modifiers.disabled}
        />
      )}
      onItemSelect={(item) => onChange(item.name)}
      selectedItem={selectedItem}
      inputValueRenderer={(item) =>
        item.kind === 'operator' && language === 'en' && item.name_en ? item.name_en : item.name
      }
      createNewItemFromQuery={(query) => ({ kind: 'custom', name: query })}
      createNewItemRenderer={(query, active, handleClick) => (
        <MenuItem
          key="create-new-item"
          text={t.components.editor.operator.EditorOperator.use_custom_name({ entityName, query })}
          icon="text-highlight"
          onClick={handleClick}
          selected={active}
        />
      )}
      noResults={
        <MenuItem disabled text={t.components.editor.operator.EditorOperator.no_matching_entity({ entityName })} />
      }
      inputProps={{
        placeholder: t.components.editor.operator.EditorOperator.entity_name({ entityName }),
        large: true,
      }}
      popoverProps={{ placement: 'bottom-start' }}
    />
  )
}
