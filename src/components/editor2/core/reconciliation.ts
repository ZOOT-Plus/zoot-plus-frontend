import camelcaseKeys from 'camelcase-keys'
import { uniqueId } from 'lodash-es'

import { migrateOperation } from '../../../models/converter'
import { CopilotDocV1, minimumRequiredForActions } from '../../../models/copilot.schema'
import { snakeCaseKeysUnicode } from '../../../utils/object'
import { EditorAction, EditorOperation } from './editor-state'
import { ParsedOperation } from './schema'

// Coordinates (location/distance 2-tuples and rect/begin/end 4-tuples) are edited
// element by element in the UI, so each element must be individually nullable
// while the user has only filled in part of the tuple.
type WithPartialCoordinateElements<V> = V extends [number, ...number[]] ? { [I in keyof V]: V[I] | undefined } : V

export type WithLooseCoordinates<T> = {
  [K in keyof T]: WithPartialCoordinateElements<T[K]>
}

export type WithId<T = {}> = T & { id: string }

type DehydratedEditorOperation = WithoutIdDeep<EditorOperation>

type WithoutIdDeep<T> = T extends unknown[]
  ? { [K in keyof T]: WithoutIdDeep<T[K]> }
  : T extends object
    ? Omit<{ [K in keyof T]: WithoutIdDeep<T[K]> }, 'id'>
    : T

/**
 * Converts the operation to a dehydrated format that is suitable
 * for storage or transmission. Essentially, it strips all `id` fields
 * which only makes sense in the context of the editor.
 */
export function dehydrateOperation(source: EditorOperation): DehydratedEditorOperation {
  return {
    ...source,
    opers: source.opers.map(({ id, ...operator }) => operator),
    groups: source.groups.map(({ id, opers, ...group }) => ({
      ...group,
      opers: opers.map(({ id, ...operator }) => operator),
    })),
    actions: source.actions.map(({ id, ...action }) => action),
  }
}

export function hydrateOperation(source: DehydratedEditorOperation): EditorOperation {
  return {
    ...source,
    opers: source.opers.map((operator) => ({
      ...operator,
      id: uniqueId(),
    })),
    groups: source.groups.map((group) => ({
      ...group,
      id: uniqueId(),
      opers: group.opers.map((operator) => ({
        ...operator,
        id: uniqueId(),
      })),
    })),
    actions: source.actions.map((action) => ({
      ...action,
      id: uniqueId(),
    })),
  }
}

export function toEditorOperation(source: ParsedOperation): EditorOperation {
  const camelCased = camelcaseKeys(source, { deep: true })
  const operation = JSON.parse(
    JSON.stringify(migrateOperation(camelCased as CopilotDocV1.Operation)),
  ) as typeof camelCased
  const converted = {
    ...operation,
    actions: operation.actions.map((action: any, index: number) => {
      const {
        preDelay,
        postDelay,
        rearDelay,
        ...newAction
      }: WithoutIdDeep<EditorAction> & (typeof operation)['actions'][number] = action
      // intermediatePostDelay 等于当前动作的 preDelay
      if (preDelay !== undefined) {
        newAction.intermediatePostDelay = preDelay
      }
      if (index > 0) {
        // intermediatePreDelay 等于前一个动作的 postDelay
        const prevAction = operation.actions![index - 1]
        if (prevAction.rearDelay !== undefined) {
          newAction.intermediatePreDelay = prevAction.rearDelay
        }
        if (prevAction.postDelay !== undefined) {
          newAction.intermediatePreDelay = prevAction.postDelay
        }
      }
      return newAction satisfies WithoutIdDeep<EditorAction>
    }),
  }

  return hydrateOperation(converted)
}

/**
 * To MAA's standard format. No validation is performed so it's not guaranteed to be valid.
 */
export function toMaaOperation(operation: EditorOperation): ParsedOperation {
  operation = JSON.parse(JSON.stringify(operation))
  const dehydrated = dehydrateOperation(operation)
  const converted = {
    ...dehydrated,
    actions: dehydrated.actions.map((action, index, actions) => {
      const { intermediatePreDelay, intermediatePostDelay, ...restAction } = action
      const newAction: ParsedOperation['actions'][number] = restAction

      // preDelay 等于当前动作的 intermediatePostDelay
      if (intermediatePostDelay !== undefined) {
        newAction.preDelay = intermediatePostDelay
      }
      if (index < actions.length - 1) {
        // postDelay 等于下一个动作的 intermediatePreDelay
        const nextAction = actions[index + 1]
        if (nextAction.intermediatePreDelay !== undefined) {
          newAction.postDelay = nextAction.intermediatePreDelay
        }
      }
      return newAction
    }),
  }

  // 如果没有版本号，则自动检测是否要设置一个
  if (converted.version === undefined) {
    if (
      converted.opers.some((operator) => operator.requirements) ||
      converted.groups.some((group) => group.opers.some((operator) => operator.requirements))
    ) {
      converted.version = CopilotDocV1.VERSION
    }
  }

  // 含仅新版协议支持的动作/字段时按特性注册表抬升 minimum_required（见 PROTOCOL_FEATURE_MINIMUMS），
  // 已声明更高版本时保持不降级
  const minimumRequired = minimumRequiredForActions(converted.actions, converted.minimumRequired)
  if (minimumRequired !== undefined) {
    converted.minimumRequired = minimumRequired
  }

  return snakeCaseKeysUnicode(converted, { deep: true })
}
