import { MenuItem } from '@blueprintjs/core'

import { useController } from 'react-hook-form'

import { useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import { Suggest } from '../../Suggest'
import { EditorFieldProps } from '../EditorFieldProps'
import { EditorOperatorFormValues } from './EditorPerformerOperator'

interface Props extends EditorFieldProps<EditorOperatorFormValues, string> {
  className?: string
  groups: CopilotDocV1.Group[]
}

const createArbitraryGroup = (name: string) => ({ name })

export const EditorOperatorGroupSelect = ({ className, groups, ...controllerProps }: Props) => {
  const t = useTranslation()

  const {
    field: { onChange, onBlur, value },
    fieldState,
  } = useController(controllerProps)

  const selectedGroup = value ? createArbitraryGroup(value) : null

  return (
    <Suggest<CopilotDocV1.Group>
      items={groups}
      itemListPredicate={(query) => (query ? groups.filter((group) => group.name.includes(query)) : groups)}
      fieldState={fieldState}
      onReset={() => onChange(undefined)}
      itemRenderer={(item, { handleClick, handleFocus, modifiers }) => (
        <MenuItem
          key={item.name}
          text={item.name}
          onClick={handleClick}
          onFocus={handleFocus}
          selected={modifiers.active}
          disabled={modifiers.disabled}
        />
      )}
      onItemSelect={(item) => onChange(item.name)}
      selectedItem={selectedGroup}
      inputValueRenderer={(item) => item.name}
      createNewItemFromQuery={(query) => createArbitraryGroup(query)}
      createNewItemRenderer={(query, active, handleClick) => (
        <MenuItem
          key="create-new-item"
          text={t.components.editor.operator.EditorOperatorGroupSelect.create_new_group({ query })}
          icon="text-highlight"
          onClick={handleClick}
          selected={active}
        />
      )}
      noResults={<MenuItem disabled text={t.components.editor.operator.EditorOperatorGroupSelect.no_matching_groups} />}
      inputProps={{
        placeholder: t.components.editor.operator.EditorOperatorGroupSelect.group_name,
        large: true,
        onBlur,
      }}
    />
  )
}
