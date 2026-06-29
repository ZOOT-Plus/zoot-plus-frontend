import { atom, useAtomValue } from 'jotai'
import { findLastIndex, isNumber, isString, get as lodashGet } from 'lodash-es'
import { useMemo } from 'react'

import { editorAtoms } from '../editor-state'
import { toMaaOperation } from '../reconciliation'
import { ZodIssue, getLabel, operationSchema } from './schema'

export type EntityIssue = ZodIssue & {
  fieldLabel?: string
}

export function useEntityErrors(id: string): EntityIssue[] | undefined {
  return useAtomValue(useMemo(() => atom((get) => get(editorAtoms.visibleEntityErrors)?.[id]), [id]))
}

export const editorValidationAtom = atom(null, (get, set) => {
  const operation = get(editorAtoms.operation)
  const result = operationSchema.safeParse(toMaaOperation(operation))

  const globalIssues: ZodIssue[] = []
  const entityIssues: Record<string, EntityIssue[]> = {}

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const entityIndexIndex = findLastIndex(issue.path, isNumber)
      if (entityIndexIndex !== -1) {
        const entityPath = issue.path.slice(0, entityIndexIndex + 1)
        try {
          const maybeEntity = lodashGet(operation, entityPath)
          if (maybeEntity && 'id' in maybeEntity && isString(maybeEntity.id)) {
            ;(entityIssues[maybeEntity.id] ||= []).push({
              ...issue,
              fieldLabel: getLabel(issue.path),
            })
            return
          }
        } catch {
          console.warn('Failed to get entity at', issue.path)
        }
      }
      globalIssues.push(issue)
    })
  }

  set(editorAtoms.entityErrors, (prev) =>
    Object.keys(entityIssues).length === 0 && Object.keys(prev).length === 0 ? prev : entityIssues,
  )
  set(editorAtoms.globalErrors, (prev) => (prev.length === 0 && globalIssues.length === 0 ? prev : globalIssues))

  return result
})
