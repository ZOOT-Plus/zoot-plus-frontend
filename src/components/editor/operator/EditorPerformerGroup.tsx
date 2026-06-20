import { Button, Callout, InputGroup } from '@blueprintjs/core'

import { useEffect } from 'react'
import { SubmitHandler, UseFormSetError, useForm } from 'react-hook-form'

import { CardTitle } from 'components/CardTitle'
import { FormField } from 'components/FormField'
import { EditorResetButton } from 'components/editor/EditorResetButton'
import { FormError } from 'components/editor/FormError'
import { FormSubmitButton } from 'components/editor/FormSubmitButton'
import type { CopilotDocV1 } from 'models/copilot.schema'

import { useTranslation } from '../../../i18n/i18n'
import { FactItem } from '../../FactItem'

export interface EditorPerformerGroupProps {
  group?: CopilotDocV1.Group
  submit: (group: CopilotDocV1.Group, setError?: UseFormSetError<CopilotDocV1.Group>, fromSheet?: boolean) => boolean
  onCancel: () => void
  categorySelector: JSX.Element
}

export const EditorPerformerGroup = ({ group, submit, onCancel, categorySelector }: EditorPerformerGroupProps) => {
  const t = useTranslation()
  const isNew = !group

  const {
    control,
    reset,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CopilotDocV1.Group>({
    defaultValues: {
      name: '',
    },
  })

  useEffect(() => {
    reset(group, { keepDefaultValues: true })
  }, [reset, group])

  const onSubmit: SubmitHandler<CopilotDocV1.Group> = (values) => {
    values.name = values.name.trim()

    if (submit(values, setError)) {
      reset()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center mb-4">
        <CardTitle className="mb-0" icon="add">
          {categorySelector}
        </CardTitle>

        <div className="flex-1" />

        <EditorResetButton
          reset={reset}
          entityName={t.components.editor.operator.EditorPerformerGroup.editing_operator_group}
        />
      </div>

      <Callout className="mb-4">
        <FactItem
          dense
          icon="info-sign"
          title={t.components.editor.operator.EditorPerformerGroup.what_is_group}
          className="font-bold"
        />
        <div>{t.components.editor.operator.EditorPerformerGroup.group_explanation}</div>
      </Callout>

      <FormField
        label={t.components.editor.operator.EditorPerformerGroup.group_name}
        field="name"
        control={control}
        error={errors.name}
        description={t.components.editor.operator.EditorPerformerGroup.name_description}
        ControllerProps={{
          rules: {
            validate: (value) => !!value.trim() || t.components.editor.operator.EditorPerformerGroup.name_required,
          },
          render: ({ field }) => (
            <InputGroup
              large
              placeholder={t.components.editor.operator.EditorPerformerGroup.name_placeholder}
              {...field}
            />
          ),
        }}
      />

      <div className="flex">
        <FormSubmitButton control={control} icon={isNew ? 'add' : 'edit'}>
          {isNew
            ? t.components.editor.operator.EditorPerformerGroup.add
            : t.components.editor.operator.EditorPerformerGroup.save}
        </FormSubmitButton>

        {!isNew && (
          <Button icon="cross" className="ml-2" onClick={onCancel}>
            {t.components.editor.operator.EditorPerformerGroup.cancel_edit}
          </Button>
        )}
      </div>

      <FormError errors={errors} />
    </form>
  )
}
