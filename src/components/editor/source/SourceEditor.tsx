import { Callout, Tooltip } from '@blueprintjs/core'

import camelcaseKeys from 'camelcase-keys'
import { FC, useMemo, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'

import { useTranslation } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import { useAfterRender } from '../../../utils/useAfterRender'
import { DrawerLayout } from '../../drawer/DrawerLayout'
import { toEditableOperation, toMaaOperation } from '../converter'
import { SourceEditorHeader } from './SourceEditorHeader'

export interface SourceEditorProps {
  form: UseFormReturn<CopilotDocV1.Operation>
  triggerValidation: () => void
}

export const SourceEditor: FC<SourceEditorProps> = ({
  form: {
    getValues,
    watch,
    reset,
    formState: { errors },
  },
  triggerValidation,
}) => {
  const t = useTranslation()
  const hasValidationErrors = !!Object.keys(errors).length

  const initialText = useMemo(() => {
    try {
      const initialOperation = getValues()
      return JSON.stringify(toMaaOperation(initialOperation), null, 2)
    } catch (e) {
      console.warn(e)
      return t.components.editor.source.SourceEditor.parsing_error
    }
  }, [getValues, t])

  const { afterRender } = useAfterRender()

  const [text, setText] = useState(initialText)
  const [jsonError, setJsonError] = useState<string>()

  const handleChange = (text: string) => {
    try {
      setJsonError(undefined)

      const json = JSON.parse(text)
      reset(toEditableOperation(camelcaseKeys(json, { deep: true })), {
        keepDefaultValues: true,
      })

      afterRender(triggerValidation)
    } catch (e) {
      if (e instanceof SyntaxError) {
        setJsonError(t.components.editor.source.SourceEditor.syntax_error)
      } else {
        // this will most likely not happen
        console.warn(e)
        setJsonError(t.components.editor.source.SourceEditor.structure_error)
      }
    }
  }

  return (
    <DrawerLayout
      title={
        <SourceEditorHeader
          text={text}
          onChange={(text) => {
            setText(text)
            handleChange(text)
          }}
        />
      }
    >
      <div className="px-8 py-4 flex-grow flex flex-col bg-zinc-50 dark:bg-slate-900 dark:text-white">
        <Callout
          className=" [&_h4]:text-sm"
          intent="primary"
          title={t.components.editor.source.SourceEditor.json_update_notice}
        />
        <div className="mt-2 flex flex-wrap gap-2 [&_h4]:text-sm">
          {/* wrap in an extra div to work around a flex bug, where the children's sizes are uneven when using flex-1.
              refer to: https://github.com/philipwalton/flexbugs#flexbug-7 */}
          <div className="flex-1">
            <Callout
              title={t.components.editor.source.SourceEditor.json_validation({
                status: jsonError
                  ? t.components.editor.source.SourceEditor.syntax_error_short
                  : t.components.editor.source.SourceEditor.passed,
              })}
              intent={jsonError ? 'warning' : 'success'}
            />
          </div>
          <Tooltip
            className="flex-1"
            content={t.components.editor.source.SourceEditor.see_errors_in_form}
            position="bottom"
            disabled={!hasValidationErrors}
          >
            <Callout
              title={t.components.editor.source.SourceEditor.form_validation({
                status: hasValidationErrors
                  ? t.components.editor.source.SourceEditor.not_passed
                  : t.components.editor.source.SourceEditor.passed,
              })}
              intent={hasValidationErrors ? 'warning' : 'success'}
            />
          </Tooltip>
        </div>
        <textarea
          className="mt-4 p-1 flex-grow bg-white text-xm font-mono resize-none focus:outline focus:outline-2 focus:outline-blue-300 dark:bg-slate-900 dark:text-white"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => handleChange(e.target.value)}
        />
      </div>
    </DrawerLayout>
  )
}
