import { debounce } from 'lodash-es'
import { RefObject, useEffect, useMemo, useState } from 'react'
import { ZodError } from 'zod'

import { i18n } from '../../../i18n/i18n'
import { formatError } from '../../../utils/error'
import { editorAtoms, useEdit } from './editor-state'
import { toEditorOperation } from './reconciliation'
import { operationForParsing, operationForValidation, ParsedOperation } from './schema'

export interface SourceEditorSubmitter {
  submit: (onSubmit: (parsed: ParsedOperation) => void) => boolean
}

export function formatSourceErrors(error: unknown): string[] {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
  }
  return [
    i18n.components.editor2.SourceEditor.unknown_error({
      error: formatError(error),
    }),
  ]
}

export function parseSourceText(text: string): {
  parsed?: ParsedOperation
  errors: string[]
  warnings: string[]
} {
  let json: any
  let parsed: ParsedOperation

  try {
    json = JSON.parse(text)
  } catch (error) {
    return {
      errors: [i18n.components.editor2.SourceEditor.json_syntax_error({ error: formatError(error) })],
      warnings: [],
    }
  }

  try {
    parsed = operationForParsing.parse(json)
  } catch (error) {
    return {
      errors: formatSourceErrors(error),
      warnings: [],
    }
  }

  let warnings: string[] = []
  try {
    operationForValidation.parse(json)
  } catch (error) {
    warnings = formatSourceErrors(error)
  }

  return { parsed, errors: [], warnings }
}

export function useSourceEditorSync(workspaceRef: RefObject<SourceEditorSubmitter | null>, timeout: number) {
  const edit = useEdit()
  const [syncState, setSyncState] = useState<'idle' | 'pending' | 'failed'>('idle')

  const sync = useMemo(
    () =>
      debounce((): boolean => {
        if (!workspaceRef.current) {
          return false
        }
        const success = workspaceRef.current.submit((parsed) => {
          const newOperation = toEditorOperation(parsed)
          edit((get, set, skip) => {
            const operation = get(editorAtoms.operation)
            if (JSON.stringify(operation) === JSON.stringify(newOperation)) {
              return skip
            }
            set(editorAtoms.operation, newOperation)
            return {
              action: 'edit-json',
              desc: i18n.actions.editor2.set_json,
              squashBy: '',
            }
          })
        })
        setSyncState(success ? 'idle' : 'failed')
        return success
      }, timeout),
    [edit, timeout, workspaceRef],
  )

  useEffect(() => {
    return () => {
      sync.flush()
    }
  }, [sync])

  const requestSync = () => {
    if (timeout > 0) {
      setSyncState('pending')
      sync()
    }
  }

  return { sync, syncState, requestSync }
}
