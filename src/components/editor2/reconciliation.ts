import camelcaseKeys from 'camelcase-keys'
import { atom } from 'jotai'
import { uniqueId } from 'lodash-es'
import { PartialDeep } from 'type-fest'

import { migrateOperation } from '../../models/converter'
import { CopilotDocV1 } from '../../models/copilot.schema'
import { FavOperator, favOperatorAtom } from '../../store/useFavOperators'
import { snakeCaseKeysUnicode } from '../../utils/object'
import { roundActionsToEditorActions } from './action/roundMapping'
import { simingActionsToRoundActions } from './siming-export'
import {
  DEFAULT_SIMING_ACTION_DELAYS,
  SimingActionDelays,
} from './siming/constants'
import {
  EditorAction,
  EditorOperation,
  EditorOperator,
  WithId,
  WithPartialCoordinates,
} from './types'
import { CopilotOperationLoose } from './validation/schema'

export { createAction, createOperator } from './factories'

type DehydratedEditorOperation = WithoutIdDeep<EditorOperation>

type WithoutIdDeep<T> = T extends unknown[]
  ? { [K in keyof T]: WithoutIdDeep<T[K]> }
  : T extends object
    ? Omit<{ [K in keyof T]: WithoutIdDeep<T[K]> }, 'id'>
    : T

const favOperatorCache = new WeakMap<FavOperator, WithId<FavOperator>>()
const favOperatorReverseCache = new WeakMap<
  WithId<FavOperator> | EditorOperator,
  FavOperator
>()
export const editorFavOperatorsAtom = atom(
  (get) =>
    get(favOperatorAtom).map((operator) => {
      const cached = favOperatorCache.get(operator)
      if (cached) {
        return cached
      }
      const newOperator = { ...operator, id: uniqueId() }
      favOperatorCache.set(operator, newOperator)
      favOperatorReverseCache.set(newOperator, operator)
      return newOperator
    }),
  (
    get,
    set,
    update:
      | (WithId<FavOperator> | EditorOperator)[]
      | ((
          prev: WithId<FavOperator>[],
        ) => (WithId<FavOperator> | EditorOperator)[]),
  ) => {
    if (typeof update === 'function') {
      update = update(get(editorFavOperatorsAtom))
    }
    const newOperators = update.map((operator) => {
      const cached = favOperatorReverseCache.get(operator)
      if (cached) {
        return cached
      }
      const { id, ...newOperator } = { ...operator, id: '' }
      favOperatorCache.set(newOperator, operator)
      favOperatorReverseCache.set(operator, newOperator)
      return newOperator
    })

    // 检查有没有多余的属性
    0 as unknown as FavOperator[] satisfies typeof newOperators
    set(favOperatorAtom, newOperators)
  },
)

/**
 * Converts the operation to a dehydrated format that is suitable
 * for storage or transmission. Essentially, it strips all `id` fields
 * which only makes sense in the context of the editor.
 */
export function dehydrateOperation(
  source: EditorOperation,
): DehydratedEditorOperation {
  return {
    ...source,
    // 剥离仅供编辑器使用的字段（如 id / extensions）
    opers: source.opers.map(({ id, extensions, ...operator }) => operator),
    groups: source.groups.map(({ id, opers, ...group }) => ({
      ...group,
      opers: opers.map(({ id, extensions, ...operator }) => operator),
    })),
    actions: source.actions.map(({ id, ...action }) => action),
  }
}

export function hydrateOperation(
  source: DehydratedEditorOperation,
): EditorOperation {
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

export function toEditorOperation(
  source: CopilotOperationLoose,
): EditorOperation {
  const camelCased = camelcaseKeys(source, { deep: true })
  const operation = JSON.parse(
    JSON.stringify(migrateOperation(camelCased as CopilotDocV1.Operation)),
  ) as typeof camelCased
  const simingActions = (
    operation as { simingActions?: CopilotDocV1.SimingActionMap }
  ).simingActions
  const originalActions = Array.isArray(operation.actions)
    ? operation.actions
    : []
  let convertedActions = originalActions.map((action, index) => {
    const {
      preDelay,
      postDelay,
      rearDelay,
      ...newAction
    }: WithoutIdDeep<EditorAction> & (typeof originalActions)[number] = action
    if (preDelay !== undefined) {
      newAction.intermediatePostDelay = preDelay
    }
    if (index > 0 && action.type === 'SpeedUp') {
      const prevAction = originalActions[index - 1]
      if (prevAction.rearDelay !== undefined) {
        newAction.intermediatePreDelay = prevAction.rearDelay
      }
      if (prevAction.postDelay !== undefined) {
        newAction.intermediatePreDelay = prevAction.postDelay
      }
    }
    return newAction satisfies WithoutIdDeep<EditorAction>
  })

  let simingEditorActions: EditorAction[] | undefined
  if (
    convertedActions.length === 0 &&
    simingActions &&
    Object.keys(simingActions).length > 0
  ) {
    const roundActions = simingActionsToRoundActions(simingActions)
    simingEditorActions = roundActionsToEditorActions(roundActions)
    convertedActions = simingEditorActions.map(({ id, ...rest }) => rest)
  }

  const converted = {
    ...operation,
    actions: convertedActions,
  }

  const hydrated = hydrateOperation(converted)
  // 兼容：若缺少 stageName，但存在 level 字段，则回填到 stageName
  if (!('stageName' in hydrated) || !hydrated.stageName) {
    const maybeLevel = (operation as unknown as { level?: string }).level
    if (maybeLevel) {
      hydrated.stageName = maybeLevel
    }
  }
  hydrated.simingActionDelays = extractSimingActionDelays(simingActions)
  if (simingEditorActions) {
    hydrated.actions = simingEditorActions
  }
  return hydrated
}

/**
 * To MAA's standard format. No validation is performed so it's not guaranteed to be valid.
 */
export function toMaaOperation(
  operation: EditorOperation,
): CopilotOperationLoose {
  operation = JSON.parse(JSON.stringify(operation))
  const dehydrated = dehydrateOperation(operation)
  const { simingActionDelays: _simingActionDelays, ...restDehydrated } =
    dehydrated
  const converted = {
    ...restDehydrated,
    actions: dehydrated.actions.map((action, index, actions) => {
      type Action = PartialDeep<WithPartialCoordinates<CopilotDocV1.Action>>
      const {
        _id,
        intermediatePreDelay,
        intermediatePostDelay,
        ...newAction
      }: WithoutIdDeep<EditorAction> & Action = action
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

      // 类型检查
      newAction satisfies Action
      // 检查多余的属性
      '114514' as keyof typeof newAction satisfies Exclude<
        keyof Action,
        // TODO: 兼容性处理，等到 _id 被去掉之后就可以去掉 Exclude _id 了
        '_id'
      >

      return newAction
    }),
  }

  // 如果没有版本号，则自动检测是否要设置一个
  if (converted.version === undefined) {
    if (
      converted.opers.some((operator) => operator.requirements) ||
      converted.groups.some((group) =>
        group.opers.some((operator) => operator.requirements),
      )
    ) {
      converted.version = CopilotDocV1.VERSION
    }
  }

  return snakeCaseKeysUnicode(converted, {
    deep: true,
  }) as unknown as CopilotOperationLoose
}

function extractSimingActionDelays(
  simingActions: CopilotDocV1.SimingActionMap | undefined,
): SimingActionDelays {
  const defaults = { ...DEFAULT_SIMING_ACTION_DELAYS }
  if (!simingActions) {
    return defaults
  }

  const raw = simingActions['抄作业自定义延时']
  if (!raw || typeof raw !== 'object') {
    return defaults
  }

  const normalize = (value: unknown, fallback: number) => {
    const numberLike = typeof value === 'string' ? Number(value) : Number(value)
    const normalized =
      Number.isFinite(numberLike) && numberLike >= 0
        ? Math.round(numberLike)
        : fallback
    return normalized
  }

  const record = raw as Record<string, unknown>
  const read = (keys: string[], fallback: number) => {
    for (const key of keys) {
      if (key in record) {
        return normalize(record[key], fallback)
      }
    }
    return fallback
  }

  return {
    attack: read(['attack_delay', 'attackDelay'], defaults.attack),
    ultimate: read(
      ['ult_delay', 'ultimate_delay', 'ultDelay'],
      defaults.ultimate,
    ),
    defense: read(
      ['defense_delay', 'defence_delay', 'defenseDelay'],
      defaults.defense,
    ),
  }
}
