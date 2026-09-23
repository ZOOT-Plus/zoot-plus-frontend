import { produce } from 'immer'
import { locales, Params } from 'zod/v4/core'

import { get, isNumber, isObject, isString } from 'lodash-es'
import { Primitive } from 'type-fest'
import * as z from 'zod'

import { i18n, I18NTranslations, Language, languageChangeEmitter } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import JSON_SCHEMA from '../../../models/copilot.schema.json'
import { OpDifficulty } from '../../../models/operation'
import { getRolesByName, matchOperatorIdentity } from '../../../models/operator'

export type ZodIssue = z.core.$ZodIssue

const DEFAULT_MINIMUM_REQUIRED = 'v6.0.0'

// xxForParsing: 用于最基础的语法检查，如果不通过则编辑器会进入不可用状态，用户只能使用 JSON 编辑器进行 JSON 编辑
// xxForValidation: 用于更严格的语义检查，如果不通过则会显示警告，但编辑器仍然可用
// xxForSubmission: 用于提交到后端的最终检查，如果不通过则无法提交

const baseOperationForParsing = z.looseObject({
  version: z.number().optional(),
  stage_name: z.string().optional(),
  difficulty: z.number().int().optional(),
  minimum_required: z.string().default(DEFAULT_MINIMUM_REQUIRED),
})
const baseOperationForValidation = z.looseObject({
  ...baseOperationForParsing.shape,
  stage_name: baseOperationForParsing.shape.stage_name.unwrap().min(1),
  difficulty: z.enum(OpDifficulty).optional(),
  minimum_required: baseOperationForParsing.shape.minimum_required
    .unwrap()
    .regex(
      /^v((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)$/,
    )
    .default(DEFAULT_MINIMUM_REQUIRED),
})

const docForParsing = z.looseObject({
  title: z.string().optional(),
  details: z.string().optional(),
  title_color: z.string().optional(),
  details_color: z.string().optional(),
})
const docForValidation = z.looseObject({
  ...docForParsing.shape,
  title: docForParsing.shape.title.unwrap().min(1),
})

const requirementsForParsing = z.looseObject({
  elite: z.number().int().optional(),
  level: z.number().int().optional(),
  skill_level: z.number().int().optional(),
  module: z.number().int().optional(),
  potentiality: z.number().int().optional(),
})
const requirementsForValidation = z.looseObject({
  ...requirementsForParsing.shape,
  elite: requirementsForParsing.shape.elite.unwrap().min(0).max(2).optional(),
  level: requirementsForParsing.shape.level.unwrap().min(0).optional(),
  skill_level: requirementsForParsing.shape.skill_level.unwrap().min(0).max(10).optional(),
  potentiality: requirementsForParsing.shape.potentiality.unwrap().min(0).max(6).optional(),
})

const operatorIdentityForParsing = z.looseObject({
  name: z.string(),
  role: z.string().optional(),
})
const baseOperatorIdentityForValidation = z.looseObject({
  ...operatorIdentityForParsing.shape,
  name: operatorIdentityForParsing.shape.name.min(1),
  role: z
    .enum(
      CopilotDocV1.Role,
      localizeValues((value) => (isString(value) && i18n.models.operator.role[value]) || value),
    )
    .optional(),
})
function withOperatorIdentityForValidation<
  T extends z.core.$ZodShape,
  U extends z.core.$ZodObjectConfig,
  O extends boolean,
>(schema: z.ZodObject<T, U>, optional: O) {
  const isAction = !!schema.shape.type
  const refinement: Parameters<typeof z.superRefine<unknown>>[0] = (value, ctx) => {
    const identity = baseOperatorIdentityForValidation.safeParse(value).data
    if (!identity) return
    const roles = getRolesByName(identity.name)
    // 进一步检查 role 是否为 name 对应的可用值
    const validRole = z.enum(
      roles,
      localizeValues((value) => (isString(value) && i18n.models.operator.role[value]) || value),
    )
    const invalidRoleError = z.looseObject({ role: validRole.optional() }).safeParse(value).error
    if (invalidRoleError) {
      ctx.issues.push(...(invalidRoleError.issues as typeof ctx.issues))
      return
    }
    // 检查是否有歧义：name 对应的干员有多个角色，但 role 没有指定
    if (roles.length > 1 && !identity.role) {
      const rolesString = roles.map((r) => `"${i18n.models.operator.role[r] || r}"`).join(' / ')
      ctx.addIssue({
        code: 'custom',
        input: value,
        path: ['name'],
        message: `${i18n.components.editor2.validation.role_ambiguous({ name: identity.name, roles: rolesString })} (${isAction ? i18n.components.editor2.validation.role_fix_action : i18n.components.editor2.validation.role_fix})`,
      })
    }
  }
  const requiredSchema = schema
    .extend(baseOperatorIdentityForValidation.shape)
    .superRefine(refinement, { when: () => true })
  const optionalSchema = schema
    .extend(baseOperatorIdentityForValidation.partial().shape)
    .superRefine(refinement, { when: () => true })
  return (optional ? optionalSchema : requiredSchema) as O extends true ? typeof optionalSchema : typeof requiredSchema
}

const operatorForParsing = z.looseObject({
  ...operatorIdentityForParsing.shape,
  skill: z.number().int().optional(),
  skill_usage: z.number().int().optional(),
  skill_times: z.number().int().optional(),
  requirements: requirementsForParsing.optional(),
})
const baseOperatorForValidation = z.looseObject({
  ...operatorForParsing.shape,
  skill: operatorForParsing.shape.skill.unwrap().min(0).max(3).optional(),
  skill_usage: z.enum(CopilotDocV1.SkillUsageType).optional(),
  skill_times: operatorForParsing.shape.skill_times.unwrap().min(0).optional(),
  requirements: requirementsForValidation.optional(),
})
const operatorForValidation = withOperatorIdentityForValidation(baseOperatorForValidation, true).superRefine(
  (value, ctx) => {
    if (!baseOperatorForValidation.pick({ skill: true, requirements: true }).safeParse(value).success) return
    const { skill, requirements } = value
    if (requirements?.elite !== undefined && skill !== undefined) {
      if (requirements.elite + 1 < skill) {
        ctx.addIssue({
          code: 'custom',
          input: value,
          path: ['skill'],
          message: i18n.components.editor2.validation.skill_locked({ skill, elite: requirements.elite }),
        })
      }
      if (requirements.skill_level !== undefined) {
        if (requirements.elite < 1 && requirements.skill_level > 4) {
          ctx.addIssue({
            code: 'custom',
            input: value,
            path: ['requirements', 'skill_level'],
            message: i18n.components.editor2.validation.skill_level_locked({
              elite: requirements.elite,
              skill_level: requirements.skill_level,
            }),
          })
        } else if (requirements.elite < 2 && requirements.skill_level > 7) {
          ctx.addIssue({
            code: 'custom',
            input: value,
            path: ['requirements', 'skill_level'],
            message: i18n.components.editor2.validation.skill_level_locked({
              elite: requirements.elite,
              skill_level: requirements.skill_level,
            }),
          })
        }
      }
    }
  },
  // always run this check, even if the previous validation has failed
  { when: () => true },
)

const groupForParsing = z.looseObject({
  name: z.string(),
  opers: z.array(operatorForParsing).default([]),
})
const groupForValidation = z.looseObject({
  ...groupForParsing.shape,
  name: groupForParsing.shape.name.min(1),
  opers: z.array(operatorForValidation).default([]),
})

const baseActionForParsing = {
  kills: z.number().int().optional(),
  costs: z.number().int().optional(),
  cost_changes: z.number().int().optional(),
  cooling: z.number().int().optional(),
  pre_delay: z.number().int().optional(),
  rear_delay: z.number().int().optional(),
  post_delay: z.number().int().optional(),
  doc: z.string().optional(),
  doc_color: z.string().optional(),
}
const baseActionForValidation = {
  ...baseActionForParsing,
  kills: baseActionForParsing.kills.unwrap().min(0).optional(),
  costs: baseActionForParsing.costs.unwrap().min(0).optional(),
  cooling: baseActionForParsing.cooling.unwrap().min(0).optional(),
  pre_delay: baseActionForParsing.pre_delay.unwrap().min(0).optional(),
  rear_delay: baseActionForParsing.rear_delay.unwrap().min(0).optional(),
  post_delay: baseActionForParsing.post_delay.unwrap().min(0).optional(),
}

const looseCoordinate = z.tuple([
  z.union([z.number(), z.undefined(), z.null()]),
  z.union([z.number(), z.undefined(), z.null()]),
])
const coordinate = z.tuple([z.number().int(), z.number().int()])

const looseVector = z.tuple([
  z.union([z.number(), z.undefined(), z.null()]),
  z.union([z.number(), z.undefined(), z.null()]),
])
const vector = z.tuple([z.number(), z.number()])

const looseRect = z.tuple([
  z.union([z.number(), z.undefined(), z.null()]),
  z.union([z.number(), z.undefined(), z.null()]),
  z.union([z.number(), z.undefined(), z.null()]),
  z.union([z.number(), z.undefined(), z.null()]),
])
const rect = z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()])

const specializedActionForParsing = {
  direction: z.string(),
  // JSON 序列化会把 undefined 转为 null，所以这里允许 null
  location: looseCoordinate,
  distance: looseVector,
  keep_kills: z.boolean(),
  skill_usage: operatorForParsing.shape.skill_usage.unwrap(),
  skill_times: operatorForParsing.shape.skill_times.unwrap(),
  rect: looseRect,
  begin: looseRect,
  end: looseRect,
  duration: z.number(),
  extra_swipe: z.number(),
  slope_in: z.number(),
  slope_out: z.number(),
  with_pause: z.boolean(),
  high_resolution_swipe_fix: z.boolean(),
}
const specializedActionForValidation = {
  ...specializedActionForParsing,
  direction: z.enum(CopilotDocV1.Direction),
  location: coordinate,
  distance: vector,
  keep_kills: z.boolean(),
  skill_usage: baseOperatorForValidation.shape.skill_usage.unwrap(),
  skill_times: baseOperatorForValidation.shape.skill_times.unwrap(),
  rect: rect,
  begin: rect,
  end: rect,
  duration: z.number().int().min(0),
  extra_swipe: z.number().int().min(0).max(4),
  slope_in: z.number().int().min(0),
  slope_out: z.number().int().min(0),
  with_pause: z.boolean(),
  high_resolution_swipe_fix: z.boolean(),
}
const actionForParsing = z.discriminatedUnion('type', [
  z.looseObject({
    ...baseActionForParsing,
    ...operatorIdentityForParsing.partial().shape,
    type: z.literal(CopilotDocV1.Type.Deploy),
    location: specializedActionForParsing.location.optional(),
    direction: specializedActionForParsing.direction.optional(),
  }),
  z.looseObject({
    ...baseActionForParsing,
    ...operatorIdentityForParsing.partial().shape,
    type: z.literal(CopilotDocV1.Type.SkillUsage),
    skill_usage: specializedActionForParsing.skill_usage.optional(),
    skill_times: specializedActionForParsing.skill_times.optional(),
  }),
  z.looseObject({
    ...baseActionForParsing,
    ...operatorIdentityForParsing.partial().shape,
    type: z.literal(CopilotDocV1.Type.Skill),
    location: specializedActionForParsing.location.optional(),
  }),
  z.looseObject({
    ...baseActionForParsing,
    ...operatorIdentityForParsing.partial().shape,
    type: z.literal(CopilotDocV1.Type.Retreat),
    location: specializedActionForParsing.location.optional(),
  }),
  z.looseObject({
    ...baseActionForParsing,
    ...operatorIdentityForParsing.partial().shape,
    type: z.literal(CopilotDocV1.Type.BulletTime),
    location: specializedActionForParsing.location.optional(),
  }),
  z.looseObject({
    ...baseActionForParsing,
    type: z.literal(CopilotDocV1.Type.MoveCamera),
    distance: specializedActionForParsing.distance.optional(),
    keep_kills: specializedActionForParsing.keep_kills.optional(),
  }),
  z.looseObject({
    ...baseActionForParsing,
    type: z.literal(CopilotDocV1.Type.Click),
    rect: specializedActionForParsing.rect.optional(),
    location: specializedActionForParsing.location.optional(),
  }),
  z.looseObject({
    ...baseActionForParsing,
    type: z.literal(CopilotDocV1.Type.Swipe),
    rect: specializedActionForParsing.rect.optional(),
    location: specializedActionForParsing.location.optional(),
    begin: specializedActionForParsing.begin.optional(),
    end: specializedActionForParsing.end.optional(),
    duration: specializedActionForParsing.duration.optional(),
    extra_swipe: specializedActionForParsing.extra_swipe.optional(),
    slope_in: specializedActionForParsing.slope_in.optional(),
    slope_out: specializedActionForParsing.slope_out.optional(),
    with_pause: specializedActionForParsing.with_pause.optional(),
    high_resolution_swipe_fix: specializedActionForParsing.high_resolution_swipe_fix.optional(),
  }),
  z.looseObject({
    ...baseActionForParsing,
    ...operatorIdentityForParsing.partial().shape,
    type: z.literal(CopilotDocV1.Type.SetUnitLocation),
    location: specializedActionForParsing.location.optional(),
  }),
  z.looseObject({
    ...baseActionForParsing,
    type: z.literal(CopilotDocV1.Type.SpeedUp),
  }),
  z.looseObject({
    ...baseActionForParsing,
    type: z.literal(CopilotDocV1.Type.SkillDaemon),
  }),
  z.looseObject({
    ...baseActionForParsing,
    type: z.literal(CopilotDocV1.Type.Output),
  }),
])
const actionForValidation = z
  .discriminatedUnion('type', [
    withOperatorIdentityForValidation(
      z.looseObject({
        ...baseActionForValidation,
        type: z.literal(CopilotDocV1.Type.Deploy),
        location: specializedActionForValidation.location,
        direction: specializedActionForValidation.direction,
      }),
      false,
    ),
    withOperatorIdentityForValidation(
      z.looseObject({
        ...baseActionForValidation,
        type: z.literal(CopilotDocV1.Type.SkillUsage),
        skill_usage: specializedActionForValidation.skill_usage,
        skill_times: specializedActionForValidation.skill_times,
      }),
      false,
    ),
    withOperatorIdentityForValidation(
      z.looseObject({
        ...baseActionForValidation,
        type: z.literal(CopilotDocV1.Type.Skill),
        location: specializedActionForValidation.location.optional(),
      }),
      true,
    ),
    withOperatorIdentityForValidation(
      z.looseObject({
        ...baseActionForValidation,
        type: z.literal(CopilotDocV1.Type.Retreat),
        location: specializedActionForValidation.location.optional(),
      }),
      true,
    ),
    withOperatorIdentityForValidation(
      z.looseObject({
        ...baseActionForValidation,
        type: z.literal(CopilotDocV1.Type.BulletTime),
        location: specializedActionForValidation.location.optional(),
      }),
      true,
    ),
    z.looseObject({
      ...baseActionForValidation,
      type: z.literal(CopilotDocV1.Type.MoveCamera),
      distance: specializedActionForValidation.distance,
      keep_kills: specializedActionForValidation.keep_kills.optional(),
    }),
    z.looseObject({
      ...baseActionForValidation,
      type: z.literal(CopilotDocV1.Type.Click),
      rect: specializedActionForValidation.rect.optional(),
      location: specializedActionForValidation.location.optional(),
    }),
    z.looseObject({
      ...baseActionForValidation,
      type: z.literal(CopilotDocV1.Type.Swipe),
      rect: specializedActionForValidation.rect.optional(),
      location: specializedActionForValidation.location.optional(),
      begin: specializedActionForValidation.begin.optional(),
      end: specializedActionForValidation.end.optional(),
      duration: specializedActionForValidation.duration.optional(),
      extra_swipe: specializedActionForValidation.extra_swipe.optional(),
      slope_in: specializedActionForValidation.slope_in.optional(),
      slope_out: specializedActionForValidation.slope_out.optional(),
      with_pause: specializedActionForValidation.with_pause.optional(),
      high_resolution_swipe_fix: specializedActionForValidation.high_resolution_swipe_fix.optional(),
    }),
    withOperatorIdentityForValidation(
      z.looseObject({
        ...baseActionForValidation,
        type: z.literal(CopilotDocV1.Type.SetUnitLocation),
        location: specializedActionForValidation.location,
      }),
      false,
    ),
    z.looseObject({
      ...baseActionForValidation,
      type: z.literal(CopilotDocV1.Type.SpeedUp),
    }),
    z.looseObject({
      ...baseActionForValidation,
      type: z.literal(CopilotDocV1.Type.SkillDaemon),
    }),
    z.looseObject({
      ...baseActionForValidation,
      type: z.literal(CopilotDocV1.Type.Output),
    }),
  ])
  .check(({ value, issues }) => {
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
        message: i18n.components.editor2.validation.name_or_location_required,
      })
    }
    // Click 的 rect 与 location 至少填一项，都不填会导致 MAA 加载作业失败；
    // 同填是合法的：MAA 会警告并优先使用 rect
    if (value.type === CopilotDocV1.Type.Click && value.rect === undefined && value.location === undefined) {
      issues.push({
        code: 'custom',
        input: value,
        message: i18n.components.editor2.validation.rect_or_location_required,
        continue: true,
      })
    }
  })

export type ParsedOperation = z.infer<typeof operationForParsing>
export const operationForParsing = z.looseObject({
  ...baseOperationForParsing.shape,
  doc: docForParsing.default({}),
  opers: z.array(operatorForParsing).default([]),
  groups: z.array(groupForParsing).default([]),
  actions: z.array(actionForParsing).default([]),
})

export type ValidatedOperation = z.infer<typeof operationForValidation>
export const operationForValidation = z
  .object({
    ...baseOperationForValidation.shape,
    // use {} as a prefault, so that when the doc is undefined, zod will parse this {}
    // and properly report the missing required fields in the doc, instead of just saying "doc is required"
    doc: docForValidation.prefault({} as z.infer<typeof docForValidation>),
    opers: z.array(operatorForValidation).default([]),
    groups: z.array(groupForValidation).default([]),
    actions: z.array(actionForValidation).default([]),
  })
  .superRefine(
    (value, ctx) => {
      if (!isObject(value)) return
      if (!Array.isArray(value.actions)) return
      const validatedOpers: CopilotDocV1.OperatorIdentity[] = []
      if (Array.isArray(value.opers)) {
        value.opers.forEach((o) => {
          const parsed = operatorIdentityForParsing.safeParse(o).data
          if (parsed) validatedOpers.push(parsed)
        })
      }
      const validatedGroups: { name: string }[] = []
      if (Array.isArray(value.groups)) {
        value.groups.forEach((g) => {
          const parsed = groupForParsing.pick({ name: true }).safeParse(g).data
          if (parsed) validatedGroups.push(parsed)
        })
      }
      value.actions.forEach((action, index) => {
        // 检查有没有 name，没有就跳过
        const actionWithIdentity = baseOperatorIdentityForValidation.safeParse(action).data
        if (!actionWithIdentity) return
        // 检查 name 是否对应到干员组，有就跳过
        const matchingGroup = validatedGroups.find((g) => g.name === actionWithIdentity.name)
        if (matchingGroup) return
        // 检查 name 是否对应到干员，没有就报错
        const matchingOperator = validatedOpers.find((o) => matchOperatorIdentity(actionWithIdentity, o))
        if (matchingOperator) return
        ctx.addIssue({
          code: 'custom',
          input: actionWithIdentity.name,
          path: ['actions', index, 'name'],
          message: i18n.components.editor2.validation.action_name_not_found({ name: actionWithIdentity.name }),
        })
      })
    },
    { when: () => true },
  )

const jsonSchema = produce(JSON_SCHEMA, (draft) => {
  // make doc.details optional
  draft.definitions.doc.required = draft.definitions.doc.required.filter((field) => field !== 'details')
}) as z.core.JSONSchema.JSONSchema
export const operationForSubmission = z.fromJSONSchema(jsonSchema).prefault({ doc: {} })

type Labeled<T> = T extends Primitive
  ? string
  : T extends ReadonlyArray<infer U> // test for array and tuple
    ? U[] extends T // test for array (non-tuple)
      ? { _item: string } & Labeled<U>
      : string
    : { [K in keyof T as string extends K ? never : K]-?: Labeled<T[K]> }

export function getLabel(i18n: I18NTranslations, path: PropertyKey[]) {
  const labels: Labeled<ValidatedOperation> = {
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
  if (isObject(labelOrObject) && '_item' in labelOrObject) {
    return labelOrObject._item as string
  }
  return undefined
}

export function getLabeledPath(i18n: I18NTranslations, path: PropertyKey[]): string {
  if (path.length === 0) {
    return ''
  }

  let label: string | undefined
  const maybeIndex = path[path.length - 1]

  if (isNumber(maybeIndex)) {
    label = maybeIndex + 1 + ''
  } else {
    label = getLabel(i18n, path)
  }

  return [getLabeledPath(i18n, path.slice(0, -1)), label].filter(Boolean).join('/')
}

interface LocalizableIssue {
  localize?: () => string | undefined
}

function localizeValues(localize: (value: unknown) => string | undefined): Params<any, any> {
  return {
    error: (issue) => {
      ;(issue as LocalizableIssue).localize = () => {
        const localized = currentLocale.localeError({
          ...issue,
          input: issue.input && (localize(issue.input) ?? issue.input),
          values: issue.values?.map((v: unknown) => localize(v) ?? v),
        } as any)
        return isString(localized) ? localized : localized?.message
      }
    },
  }
}

export function localizeIssue(issue: ZodIssue): string | undefined {
  return (issue as LocalizableIssue).localize?.()
}

z.config({
  customError: (issue) => {
    // the default error message for missing fields is not very user-friendly
    // so we override it with our own one
    if (
      (issue.code === 'invalid_type' && issue.input === undefined) ||
      (issue.code === 'too_small' && issue.origin === 'string' && issue.minimum === 1)
    ) {
      return i18n.components.editor2.validation.required
    }
    return undefined
  },
})

// the en locale is already automatically loaded by zod
let currentLocale = locales.en()

async function loadLocale(lang: Language) {
  try {
    if (lang === 'cn') {
      const locale = await import('zod/v4/locales/zh-CN.js')

      // check language again to avoid race condition
      if (lang !== i18n.currentLanguage) return

      currentLocale = locale.default()
    } else {
      currentLocale = locales.en()
    }
    z.config(currentLocale)
    languageChangeEmitter.emit('localeLoadedForZod')
  } catch (e) {
    console.error('Failed to load zod locale', lang, e)
  }
}

languageChangeEmitter.on('languageChange', (lang) => {
  void loadLocale(lang)
})

void loadLocale(i18n.currentLanguage)
