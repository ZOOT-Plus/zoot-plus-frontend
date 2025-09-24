import { locales } from '@zod/core'

import { get, isNumber, isString } from 'lodash-es'
import { Primitive } from 'type-fest'
import * as z from 'zod'

import { i18n } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import { OpDifficulty } from '../../../models/operation'
import cn from './error-map-cn'

export type ZodIssue = z.core.$ZodIssue

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const version = z.number().optional()
const stage_name = z.string().optional()
const difficulty = z.enum(OpDifficulty).optional()
const minimum_required = z
  .string()
  .regex(
    /^v((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)$/,
  )
  .default('v4.0.0')

const doc = z.looseObject({
  title: z.string().optional(),
  details: z.string().optional(),
  title_color: z.string().optional(),
  details_color: z.string().optional(),
})

const docStrict = doc
  .extend({
    title: doc.shape.title.unwrap().min(1),
  })
  .transform((doc) => ({
    ...doc,
    // the backend requires details to be non-empty, but we don't want to
    // force the user to fill it in, so we use title as a fallback
    details: doc.details || doc.title,
  }))

const operator_requirements = z.looseObject({
  elite: z.number().int().min(0).max(2).optional(),
  level: z.number().int().min(0).optional(),
  skill_level: z.number().int().min(0).max(10).optional(),
  module: z.number().int().optional(),
  potentiality: z.number().int().min(0).max(6).optional(),
})

const operator = z.looseObject({
  name: z.string().min(1),
  skill: z.number().int().min(1).max(3).optional(),
  skill_usage: z.number().int().min(0).max(3).optional(),
  skill_times: z.number().int().min(0).optional(),
  requirements: operator_requirements.optional(),
})

const group = z.looseObject({
  name: z.string(),
  opers: z.array(operator).default([]),
})

const groupStrict = group.extend({
  name: group.shape.name.min(1),
})

const actionShape = {
  name: z.string().min(1).optional(),
  location: z
    .tuple([
      z.number().int().or(z.undefined()),
      z.number().int().or(z.undefined()),
    ])
    .optional(),

  // We have to use `distance: z.string()` here and later validate it in `.check()`,
  // because if we use `distance: z.enum()` here, it becomes the second discriminator key,
  // which leads to very counterintuitive behavior when parsing. See: https://github.com/colinhacks/zod/issues/4280
  // We also need to cast its type to match the expected type in `actionWithDirection` below.
  direction: z.string().optional() as unknown as z.ZodOptional<
    typeof actionWithDirection.shape.direction
  >,

  distance: z
    .tuple([z.number().or(z.undefined()), z.number().or(z.undefined())])
    .optional(),
  skill_usage: operator.shape.skill_usage,
  skill_times: operator.shape.skill_times,

  // common fields
  kills: z.number().int().min(0).optional(),
  costs: z.number().int().min(0).optional(),
  cost_changes: z.number().int().optional(),
  cooling: z.number().int().min(0).optional(),
  pre_delay: z.number().int().min(0).optional(),
  rear_delay: z.number().int().min(0).optional(),
  post_delay: z.number().int().min(0).optional(),
  doc: z.string().optional(),
  doc_color: z.string().optional(),
}
const actionWithDirection = z.object({
  direction: z.enum(CopilotDocV1.Direction),
})
const action = z
  .discriminatedUnion('type', [
    z.looseObject({
      type: z.literal(CopilotDocV1.Type.Deploy),
      ...actionShape,
    }),
    z.looseObject({
      type: z.literal(CopilotDocV1.Type.SkillUsage),
      ...actionShape,
    }),
    z.looseObject({
      type: z.literal(CopilotDocV1.Type.Skill),
      ...actionShape,
    }),
    z.looseObject({
      type: z.literal(CopilotDocV1.Type.Retreat),
      ...actionShape,
    }),
    z.looseObject({
      type: z.literal(CopilotDocV1.Type.BulletTime),
      ...actionShape,
    }),
    z.looseObject({
      type: z.literal(CopilotDocV1.Type.MoveCamera),
      ...actionShape,
    }),
    z.looseObject({
      type: z.literal(CopilotDocV1.Type.SpeedUp),
      ...actionShape,
    }),
    z.looseObject({
      type: z.literal(CopilotDocV1.Type.SkillDaemon),
      ...actionShape,
    }),
    z.looseObject({
      type: z.literal(CopilotDocV1.Type.Output),
      ...actionShape,
    }),
  ])
  .check(({ value, issues }) => {
    if ('direction' in value && value.direction !== undefined) {
      const result = actionWithDirection.safeParse(value)
      if (result.error) {
        issues.push(...result.error.issues)
      }
    }
  })

const actionShapeStrict = {
  ...actionShape,
  location: z.tuple([z.number().int(), z.number().int()]).optional(),
  distance: z.tuple([z.number(), z.number()]).optional(),
}
const actionStrict = z
  .discriminatedUnion('type', [
    z.looseObject({
      ...actionShapeStrict,
      type: z.literal(CopilotDocV1.Type.Deploy),
      name: actionShapeStrict.name.unwrap(),
      location: actionShapeStrict.location.unwrap(),
      direction: actionShapeStrict.direction.unwrap(),
    }),
    z.looseObject({
      ...actionShapeStrict,
      type: z.literal(CopilotDocV1.Type.SkillUsage),
      name: actionShapeStrict.name.unwrap(),
      skill_usage: actionShapeStrict.skill_usage.unwrap(),
    }),
    z.looseObject({
      ...actionShapeStrict,
      type: z.literal(CopilotDocV1.Type.Skill),
      name: actionShapeStrict.name,
      location: actionShapeStrict.location,
    }),
    z.looseObject({
      ...actionShapeStrict,
      type: z.literal(CopilotDocV1.Type.Retreat),
      name: actionShapeStrict.name,
      location: actionShapeStrict.location,
    }),
    z.looseObject({
      ...actionShapeStrict,
      type: z.literal(CopilotDocV1.Type.BulletTime),
      name: actionShapeStrict.name,
      location: actionShapeStrict.location,
    }),
    z.looseObject({
      ...actionShapeStrict,
      type: z.literal(CopilotDocV1.Type.MoveCamera),
      distance: actionShapeStrict.distance.unwrap(),
    }),
    z.looseObject({
      ...actionShapeStrict,
      type: z.literal(CopilotDocV1.Type.SpeedUp),
    }),
    z.looseObject({
      ...actionShapeStrict,
      type: z.literal(CopilotDocV1.Type.SkillDaemon),
    }),
    z.looseObject({
      ...actionShapeStrict,
      type: z.literal(CopilotDocV1.Type.Output),
    }),
  ])
  .check(({ value, issues }) => {
    if ('direction' in value && value.direction !== undefined) {
      const result = actionWithDirection.safeParse(value)
      if (result.error) {
        issues.push(...result.error.issues)
      }
    }
    if (
      (value.type === CopilotDocV1.Type.Retreat ||
        value.type === CopilotDocV1.Type.Skill ||
        value.type === CopilotDocV1.Type.BulletTime) &&
      value.name === undefined &&
      value.location === undefined
    ) {
      issues.push({
        code: 'custom',
        input: value,
        message: '目标或位置至少需要填写一项',
        continue: true,
      })
    }
  })

const siming_actions = z
  .record(z.string(), z.record(z.string(), z.unknown()))
  .optional()

export type CopilotOperationLoose = z.infer<typeof operationLooseSchema>
export const operationLooseSchema = z.object({
  version,
  stage_name,
  difficulty,
  minimum_required,
  doc: doc.default({}),
  opers: z.array(operator).default([]),
  groups: z.array(group).default([]),
  actions: z.array(action).default([]),
  siming_actions,
})

const KNOWN_OPERATION_KEYS = new Set([
  'version',
  'stage_name',
  'stageName',
  'difficulty',
  'minimum_required',
  'minimumRequired',
  'doc',
  'opers',
  'groups',
  'actions',
  'siming_actions',
  'simingActions',
])

function isLikelySimingActionEntry(
  value: unknown,
): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false
  }
  return (
    'next' in value ||
    'action' in value ||
    'recognition' in value ||
    'expected' in value ||
    'text_doc' in value ||
    'textDoc' in value
  )
}

function normalizeOperationLooseInput(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw
  }

  const keys = Object.keys(raw)
  const hasKnownKey = keys.some((key) => KNOWN_OPERATION_KEYS.has(key))
  if (!hasKnownKey && keys.length > 0) {
    const entries = Object.values(raw)
    if (entries.length > 0 && entries.every(isLikelySimingActionEntry)) {
      return {
        siming_actions: Object.fromEntries(Object.entries(raw)),
        actions: [],
      }
    }
  }

  const normalized: Record<string, unknown> = { ...raw }
  const camelSimingActions = normalized['simingActions']
  if (isRecord(camelSimingActions)) {
    normalized['siming_actions'] = camelSimingActions
    delete normalized['simingActions']
  }
  const actions = normalized['actions']

  if (Array.isArray(actions)) {
    return normalized
  }

  if (isRecord(actions)) {
    const existingSimingActions = (() => {
      const snakeCase = normalized['siming_actions']
      if (isRecord(snakeCase)) {
        return snakeCase
      }
      const camelCase = normalized['simingActions']
      if (isRecord(camelCase)) {
        return camelCase
      }
      return {}
    })()

    normalized['siming_actions'] = {
      ...existingSimingActions,
      ...actions,
    }
    normalized['actions'] = []
    if ('simingActions' in normalized) {
      delete normalized['simingActions']
    }
    return normalized
  }

  if (actions === undefined || actions === null) {
    normalized['actions'] = []
    return normalized
  }

  normalized['actions'] = []
  return normalized
}

export function parseOperationLoose(raw: unknown): CopilotOperationLoose {
  return operationLooseSchema.parse(normalizeOperationLooseInput(raw))
}

export type CopilotOperation = z.infer<typeof operationSchema>
export const operationSchema = z.object({
  version,
  stage_name: stage_name.unwrap(),
  difficulty,
  minimum_required,
  doc: docStrict,
  opers: z.array(operator).default([]),
  groups: z.array(groupStrict).default([]),
  actions: z.array(actionStrict).default([]),
})

type Labeled<T> = T extends Primitive
  ? string
  : T extends ReadonlyArray<infer U> // test for array and tuple
    ? U[] extends T // test for array (non-tuple)
      ? { _item: string } & Labeled<U>
      : string
    : { [K in keyof T as string extends K ? never : K]-?: Labeled<T[K]> }

export function getLabel(path: PropertyKey[]) {
  const labels: Labeled<CopilotOperation> = {
    ...i18n.components.editor2.label.operation,
    opers: i18n.components.editor2.label.opers,
    groups: {
      ...i18n.components.editor2.label.operation.groups,
      opers: i18n.components.editor2.label.opers,
    },
  }
  const labelOrObject = get(labels, path.filter(isString))
  if (isString(labelOrObject)) {
    return labelOrObject
  }
  if ('_item' in labelOrObject) {
    return labelOrObject._item as string
  }
  return undefined
}

export function getLabeledPath(path: PropertyKey[]): string {
  if (path.length === 0) {
    return ''
  }

  let label: string | undefined
  const maybeIndex = path[path.length - 1]

  if (isNumber(maybeIndex)) {
    label = maybeIndex + 1 + ''
  } else {
    label = getLabel(path)
  }

  return [getLabeledPath(path.slice(0, -1)), label].filter(Boolean).join('/')
}

const enError = locales.en()
const cnError = cn()

z.config({
  localeError: (issue) => {
    // the default error message for missing fields is not very user-friendly
    // so we override it with our own one
    if (
      (issue.code === 'invalid_type' && issue.input === undefined) ||
      (issue.code === 'too_small' &&
        issue.origin === 'string' &&
        issue.minimum === 1)
    ) {
      return i18n.components.editor2.validation.required
    }

    return i18n.currentLanguage === 'cn'
      ? cnError.localeError(issue)
      : enError.localeError(issue)
  },
})
