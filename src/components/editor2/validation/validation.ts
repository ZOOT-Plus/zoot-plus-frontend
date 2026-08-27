import { atom, useAtomValue } from 'jotai'
import { findLastIndex, isNumber, isString, get as lodashGet } from 'lodash-es'
import { useMemo } from 'react'
import type { ZodError } from 'zod'

import { i18n } from '../../../i18n/i18n'
import { formatError } from '../../../utils/error'
import { editorAtoms } from '../editor-state'
import { toMaaOperation } from '../reconciliation'
import { getLabel, operationForSubmission, operationForValidation, ZodIssue } from './schema'

export type GlobalIssue = ZodIssue | SimpleIssue
export interface SimpleIssue {
  message: string
  path?: (string | number)[]
}

// Entities are objects that have an `id` property and are stored in an array.
// This includes operators, groups, and actions. For entity-specific errors,
// we want to display them next to their associated entity instead of displaying
// something like "Error in actions[0].name" in the global errors, which is not user-friendly.
export type EntityIssue = ZodIssue & {
  entityId: string
  fieldLabel?: string
}

export function useEntityErrors(id: string): EntityIssue[] | undefined {
  return useAtomValue(useMemo(() => atom((get) => get(editorAtoms.visibleEntityErrors)?.[id]), [id]))
}

export function useEntityWarnings(id: string): EntityIssue[] | undefined {
  return useAtomValue(useMemo(() => atom((get) => get(editorAtoms.visibleEntityWarnings)?.[id]), [id]))
}

export const editorValidationAtom = atom(null, (get, set) => {
  const operation = get(editorAtoms.operation)
  const maaOperation = toMaaOperation(operation)

  let globalWarnings: ZodIssue[] = []
  let entityWarnings: Record<string, EntityIssue[]> = {}
  let globalErrors: ZodIssue[] = []
  let entityErrors: Record<string, EntityIssue[]> = {}

  function classifyIssues(issues: ZodIssue[]) {
    const globalIssues: ZodIssue[] = []
    const entityIssues: Record<string, EntityIssue[]> = {}

    issues.forEach((issue) => {
      const entityIndexIndex = findLastIndex(issue.path, isNumber)
      if (entityIndexIndex !== -1) {
        const entityPath = issue.path.slice(0, entityIndexIndex + 1)
        try {
          const maybeEntity = lodashGet(operation, entityPath)
          if (maybeEntity && 'id' in maybeEntity && isString(maybeEntity.id)) {
            ;(entityIssues[maybeEntity.id] ||= []).push({
              ...issue,
              entityId: maybeEntity.id,
              fieldLabel: getLabel(i18n, issue.path),
            })
            return
          }
        } catch {
          // if failed, fall back to adding to global issues
          console.warn('Failed to get entity at', issue.path)
        }
      }
      globalIssues.push(issue)
    })
    return { globalIssues, entityIssues }
  }

  const validatedResult = operationForValidation.safeParse(maaOperation)
  if (!validatedResult.success) {
    const classified = classifyIssues(validatedResult.error.issues)
    globalWarnings = classified.globalIssues
    entityWarnings = classified.entityIssues
  }

  const submittableResult = operationForSubmission.safeParse(maaOperation)
  if (!submittableResult.success) {
    const classified = classifyIssues(submittableResult.error.issues)
    globalErrors = classified.globalIssues
    entityErrors = classified.entityIssues
  }

  function isSameIssue(a: ZodIssue, b: ZodIssue) {
    return a.code === b.code && a.path.join() === b.path.join()
  }

  // deduplicate warnings that are also errors
  globalWarnings = globalWarnings.filter((warning) => !globalErrors.some((error) => isSameIssue(warning, error)))
  for (const entityId in entityWarnings) {
    entityWarnings[entityId] = entityWarnings[entityId].filter(
      (warning) => !entityErrors[entityId]?.some((error) => isSameIssue(warning, error)),
    )
  }

  set(editorAtoms.globalWarnings, (prev) => (prev.length === 0 && globalWarnings.length === 0 ? prev : globalWarnings))
  set(editorAtoms.entityWarnings, (prev) =>
    Object.keys(prev).length === 0 && Object.keys(entityWarnings).length === 0 ? prev : entityWarnings,
  )
  set(editorAtoms.globalErrors, (prev) => (prev.length === 0 && globalErrors.length === 0 ? prev : globalErrors))
  set(editorAtoms.entityErrors, (prev) =>
    Object.keys(prev).length === 0 && Object.keys(entityErrors).length === 0 ? prev : entityErrors,
  )

  return {
    globalWarnings,
    entityWarnings,
    globalErrors,
    entityErrors,
  }
})

function isZodError(e: unknown): e is ZodError {
  return 'issues' in (e as any) && Array.isArray((e as any).issues)
}

export function normalizeIssues(e: unknown): GlobalIssue[] {
  if (isZodError(e)) {
    return e.issues
  }
  return [{ message: formatError(e) }]
}
