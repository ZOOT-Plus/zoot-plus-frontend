import { locales } from 'zod/v4/core'

import { get, isNumber, isObject, isString } from 'lodash-es'
import { Primitive } from 'type-fest'
import * as z from 'zod'

import { i18n, I18NTranslations, Language, languageChangeEmitter } from '../../../i18n/i18n'
import { CopilotDocV1 } from '../../../models/copilot.schema'
import { OpDifficulty } from '../../../models/operation'

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
const docForSubmission = z.looseObject({
  title: docForValidation.shape.title,
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

const operatorForParsing = z.looseObject({
  name: z.string(),
  skill: z.number().int().optional(),
  skill_usage: z.number().int().optional(),
  skill_times: z.number().int().optional(),
  requirements: requirementsForParsing.optional(),
})
const operatorForValidation = z.looseObject({
  ...operatorForParsing.shape,
  name: operatorForParsing.shape.name.min(1),
  skill: operatorForParsing.shape.skill.unwrap().min(0).max(3).optional(),
  skill_usage: z.enum(CopilotDocV1.SkillUsageType).optional(),
  skill_times: operatorForParsing.shape.skill_times.unwrap().min(0).optional(),
  requirements: requirementsForValidation.optional(),
})

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
const specializedActionForParsing = {
  name: z.string(),
  direction: z.string(),
  // JSON 序列化会把 undefined 转为 null，所以这里允许 null
  location: z.array(z.union([z.number(), z.undefined(), z.null()])),
  distance: z.array(z.union([z.number(), z.undefined(), z.null()])),
  skill_usage: operatorForParsing.shape.skill_usage.unwrap(),
  skill_times: operatorForParsing.shape.skill_times.unwrap(),
}
const specializedActionForValidation = {
  ...specializedActionForParsing,
  name: specializedActionForParsing.name.min(1),
  direction: z.enum(CopilotDocV1.Direction),
  location: z.tuple([z.number().int(), z.number().int()]),
  distance: z.tuple([z.number(), z.number()]),
  skill_usage: operatorForValidation.shape.skill_usage.unwrap(),
  skill_times: operatorForValidation.shape.skill_times.unwrap(),
}
const actionForParsing = z
  .looseObject({
    ...baseActionForParsing,
    ...specializedActionForParsing,
  })
  .partial()
  .extend({
    type: z.string().min(1),
  })
const actionForValidation = z
  .discriminatedUnion('type', [
    z.looseObject({
      ...baseActionForValidation,
      type: z.literal(CopilotDocV1.Type.Deploy),
      name: specializedActionForValidation.name,
      location: specializedActionForValidation.location,
      direction: specializedActionForValidation.direction,
    }),
    z.looseObject({
      ...baseActionForValidation,
      type: z.literal(CopilotDocV1.Type.SkillUsage),
      name: specializedActionForValidation.name,
      skill_usage: specializedActionForValidation.skill_usage,
    }),
    z.looseObject({
      ...baseActionForValidation,
      type: z.literal(CopilotDocV1.Type.Skill),
      name: specializedActionForValidation.name.optional(),
      location: specializedActionForValidation.location.optional(),
    }),
    z.looseObject({
      ...baseActionForValidation,
      type: z.literal(CopilotDocV1.Type.Retreat),
      name: specializedActionForValidation.name.optional(),
      location: specializedActionForValidation.location.optional(),
    }),
    z.looseObject({
      ...baseActionForValidation,
      type: z.literal(CopilotDocV1.Type.BulletTime),
      name: specializedActionForValidation.name.optional(),
      location: specializedActionForValidation.location.optional(),
    }),
    z.looseObject({
      ...baseActionForValidation,
      type: z.literal(CopilotDocV1.Type.MoveCamera),
      distance: specializedActionForValidation.distance,
    }),
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
export const operationForValidation = z.object({
  ...baseOperationForValidation.shape,
  // use {} as a prefault, so that when the doc is undefined, zod will parse this {}
  // and properly report the missing required fields in the doc, instead of just saying "doc is required"
  doc: docForValidation.prefault({} as z.infer<typeof docForValidation>),
  opers: z.array(operatorForValidation).default([]),
  groups: z.array(groupForValidation).default([]),
  actions: z.array(actionForValidation).default([]),
})

export const operationForSubmission = z.looseObject({
  stage_name: operationForValidation.shape.stage_name,
  doc: docForSubmission.prefault({} as z.infer<typeof docForSubmission>),
})

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

async function loadLocale(lang: Language) {
  try {
    if (lang === 'cn') {
      const locale = await import('zod/v4/locales/zh-CN.js')

      // check language again to avoid race condition
      if (lang === i18n.currentLanguage) {
        z.config(locale.default())
      }
    } else {
      // the en locale is already automatically loaded by zod, so we don't need to lazily load it
      z.config(locales.en())
    }
    languageChangeEmitter.emit('localeLoadedForZod')
  } catch (e) {
    console.error('Failed to load zod locale', lang, e)
  }
}

languageChangeEmitter.on('languageChange', (lang) => {
  void loadLocale(lang)
})

void loadLocale(i18n.currentLanguage)
