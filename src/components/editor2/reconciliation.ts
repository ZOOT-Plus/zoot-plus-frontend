import camelcaseKeys, { CamelCaseKeys } from 'camelcase-keys'
import { atom } from 'jotai'
import { defaults, defaultsDeep, uniqueId } from 'lodash-es'
import { PartialDeep, SetOptional, SetRequired } from 'type-fest'

import { migrateOperation } from '../../models/converter'
import { CopilotDocV1 } from '../../models/copilot.schema'
import { findOperatorByName, getDefaultRequirements } from '../../models/operator'
import { FavGroup, favGroupAtom } from '../../store/useFavGroups'
import { FavOperator, favOperatorAtom } from '../../store/useFavOperators'
import { snakeCaseKeysUnicode } from '../../utils/object'
import { EditorAction, EditorGroup, EditorOperation, EditorOperator, getEditorConfig } from './editor-state'
import { ParsedOperation } from './validation/schema'

export type WithLooseCoordinates<T> = {
  [K in keyof T]: K extends 'location' | 'distance' ? (number | undefined | null)[] : T[K]
}

export type WithId<T = {}> = { [K in keyof (T & { id: string })]: K extends keyof T ? T[K] : string }

type DehydratedEditorOperation = WithoutIdDeep<EditorOperation>

type WithoutIdDeep<T> = T extends unknown[]
  ? { [K in keyof T]: WithoutIdDeep<T[K]> }
  : T extends object
    ? Omit<{ [K in keyof T]: WithoutIdDeep<T[K]> }, 'id'>
    : T

export function createAction(initialValues: SetRequired<Partial<Omit<EditorAction, 'id'>>, 'type'>) {
  const action: EditorAction = defaults({ id: uniqueId() }, initialValues)
  if (action.type === CopilotDocV1.Type.SkillUsage) {
    action.skillUsage = CopilotDocV1.SkillUsageType.ReadyToUse
  }
  return action
}

export function createGroup(initialValues: Partial<Omit<EditorGroup, 'id' | 'opers'>> = {}): EditorGroup {
  const group: EditorGroup = defaults({ id: uniqueId() }, initialValues, {
    name: '',
    opers: [],
  })
  return group
}

export function createOperator(
  initialValues: Omit<EditorOperator, 'id'>,
  applyDefaultRequirements = true,
): EditorOperator {
  const info = findOperatorByName(initialValues.name)
  const shouldApplyDefaultRequirements = applyDefaultRequirements && (!info || info.prof !== 'TOKEN')
  let defaultRequirements: EditorOperator['requirements'] | undefined
  if (shouldApplyDefaultRequirements) {
    const rarity = info?.rarity ?? 6
    const preset = getEditorConfig().operatorPreset?.byRarity?.[rarity]
    if (preset) {
      defaultRequirements = {
        level: preset.level,
        elite: preset.elite,
      }
    }
    defaultRequirements = defaults(
      {},
      defaultRequirements,
      getDefaultRequirements(rarity) satisfies EditorOperator['requirements'],
    )
  }
  const operator: EditorOperator = defaultsDeep(
    { id: uniqueId() } satisfies Omit<EditorOperator, 'name'>,
    initialValues,
    { requirements: defaultRequirements } satisfies Omit<EditorOperator, 'id' | 'name'>,
  )
  return operator
}

const favOperatorCache = new WeakMap<FavOperator, WithId<FavOperator>>()
const favOperatorReverseCache = new WeakMap<WithId<FavOperator> | EditorOperator, FavOperator>()
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
      | ((prev: WithId<FavOperator>[]) => (WithId<FavOperator> | EditorOperator)[]),
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

const favGroupCache = new WeakMap<FavGroup, WithId<FavGroup>>()
const favGroupReverseCache = new WeakMap<WithId<FavGroup> | EditorGroup, FavGroup>()
export const editorFavGroupsAtom = atom(
  (get) =>
    get(favGroupAtom).map((group) => {
      const cached = favGroupCache.get(group)
      if (cached) {
        return cached
      }
      const newGroup = { ...group, id: uniqueId() }
      favGroupCache.set(group, newGroup)
      favGroupReverseCache.set(newGroup, group)
      return newGroup
    }),
  (
    get,
    set,
    update: (WithId<FavGroup> | EditorGroup)[] | ((prev: WithId<FavGroup>[]) => (WithId<FavGroup> | EditorGroup)[]),
  ) => {
    if (typeof update === 'function') {
      update = update(get(editorFavGroupsAtom))
    }
    const newGroups = update.map((group) => {
      const cached = favGroupReverseCache.get(group)
      if (cached) {
        return cached
      }
      const { id, ...newGroup } = {
        ...group,
        id: '',
        opers: group.opers?.map((operator: CopilotDocV1.Operator | EditorOperator) => {
          const { id, ...newOperator } = {
            ...operator,
            id: '',
          }
          return newOperator
        }),
      }
      favGroupCache.set(newGroup, group)
      favGroupReverseCache.set(group, newGroup)
      return newGroup
    })

    // 检查有没有多余的属性
    0 as unknown as FavGroup satisfies SetOptional<(typeof newGroups)[number], 'opers'>
    set(favGroupAtom, newGroups)
  },
)

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

type PartialMaaOperation = PartialDeep<Omit<CopilotDocV1.OperationSnakeCased, 'actions'>> & {
  actions?: PartialMaaAction[]
}
type PartialMaaAction = WithLooseCoordinates<NonNullable<CopilotDocV1.OperationSnakeCased['actions']>[number]>

/**
 * To MAA's standard format. No validation is performed so it's not guaranteed to be valid.
 */
export function toMaaOperation(operation: EditorOperation): PartialMaaOperation {
  operation = JSON.parse(JSON.stringify(operation))
  const dehydrated = dehydrateOperation(operation)
  const converted = {
    ...dehydrated,
    actions: dehydrated.actions.map((action, index, actions) => {
      const { intermediatePreDelay, intermediatePostDelay, ...restAction } = action
      const newAction: CamelCaseKeys<PartialMaaAction> = restAction

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

  return snakeCaseKeysUnicode(converted, { deep: true })
}
