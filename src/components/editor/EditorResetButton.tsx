import { Alert, Button, H4 } from '@blueprintjs/core'

import { useState } from 'react'
import { FieldValues, UseFormReset } from 'react-hook-form'

import { useTranslation } from '../../i18n/i18n'

export const EditorResetButton = <T extends FieldValues>({
  reset,
  entityName,
}: {
  reset: UseFormReset<T>
  entityName: string
}) => {
  const t = useTranslation()
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  return (
    <>
      <Alert
        isOpen={resetDialogOpen}
        confirmButtonText={t.components.editor.EditorResetButton.reset}
        cancelButtonText={t.components.editor.EditorResetButton.cancel}
        icon="reset"
        intent="danger"
        canOutsideClickCancel
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={() => {
          reset()
          setResetDialogOpen(false)
        }}
      >
        <H4>
          {t.components.editor.EditorResetButton.reset_entity({
            entityName,
          })}
        </H4>
        <p>
          {t.components.editor.EditorResetButton.confirm_reset({
            entityName,
          })}
        </p>
      </Alert>

      <Button className="ml-4" icon="reset" minimal intent="danger" onClick={() => setResetDialogOpen(true)}>
        {t.components.editor.EditorResetButton.reset_button}
      </Button>
    </>
  )
}
