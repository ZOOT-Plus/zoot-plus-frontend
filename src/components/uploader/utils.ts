import { isString } from '@sentry/utils'

import ajvLocalizeZh from 'ajv-i18n/localize/zh'
import { isFinite, isPlainObject } from 'lodash-es'

import { i18n } from '../../i18n/i18n'
import { CopilotDocV1 } from '../../models/copilot.schema'
import { copilotSchemaValidator } from '../../models/copilot.schema.validator'
import { isHardMode, matchLevelByStageName, toHardMode, toNormalMode } from '../../models/level'
import { Level, OpDifficulty } from '../../models/operation'
import { formatError } from '../../utils/error'
import { AppToaster } from '../Toaster'

export async function parseOperationFile(file: File): Promise<object> {
  if (file.type !== 'application/json') {
    throw new Error(i18n.components.uploader.utils.select_json_file)
  }

  try {
    const fileText = await file.text()

    const json = JSON.parse(fileText)

    if (!isPlainObject(json)) {
      throw new Error(i18n.components.uploader.utils.invalid_object)
    }

    return json
  } catch (e) {
    throw new Error(i18n.components.uploader.utils.json_parse_failed + formatError(e))
  }
}

export function patchOperation(operation: object, levels: Level[]): object {
  try {
    // this part is quite dirty, do not use in other parts
    // backend compatibility of minimum_required
    if (!operation['minimum_required'] || operation['minimum_required'] === 'v4.0') {
      operation['minimum_required'] = 'v4.0.0'
    }

    if (!operation['doc']) {
      operation['doc'] = {}
    }

    const stage_name = operation['stage_name']

    if (stage_name && isString(stage_name)) {
      // title
      if (!isString(operation['doc']['title']) || operation['doc']['title'] === '') {
        operation['doc']['title'] = stage_name
      }

      // description
      if (!isString(operation['doc']['details']) || operation['doc']['details'] === '') {
        operation['doc']['details'] = i18n.components.uploader.utils.job_with_stage_name({
          stageName: stage_name,
        })
      }

      // i18n compatibility of level id

      const expectsHardMode =
        isHardMode(stage_name) || (isFinite(operation['difficulty']) && operation['difficulty'] & OpDifficulty.HARD)

      const matchedLevels = levels.filter((level) => matchLevelByStageName(level, stage_name))

      const uniqueStageIds = new Set(
        matchedLevels.map(({ stageId }) => (expectsHardMode ? toHardMode(stageId) : toNormalMode(stageId))),
      )

      if (uniqueStageIds.size === 1) {
        operation['stage_name'] = [...uniqueStageIds][0]
      } else {
        const reason =
          uniqueStageIds.size > 0
            ? i18n.components.uploader.utils.stage_not_unique
            : i18n.components.uploader.utils.stage_not_found
        const error = new Error(`${reason}(${stage_name})`)

        ;(error as any).matchedLevels = matchedLevels

        throw error
      }
    }
  } catch (e) {
    console.warn(e)
    AppToaster.show({
      message: i18n.components.uploader.utils.auto_fix_failed + formatError(e),
      intent: 'warning',
    })
  }

  // i18n compatibility of char id
  // pending for now
  return operation
}

export function validateOperation(operation: object): asserts operation is CopilotDocV1.OperationSnakeCased {
  try {
    const jsonSchemaValidation = copilotSchemaValidator.validate('copilot', operation)

    if (!jsonSchemaValidation && copilotSchemaValidator.errors) {
      console.log('[Copilot validation] error:', copilotSchemaValidator.errors, operation)
      ajvLocalizeZh(copilotSchemaValidator.errors)
      throw new Error(
        copilotSchemaValidator.errorsText(copilotSchemaValidator.errors, {
          separator: '；',
        }),
      )
    }
  } catch (e) {
    throw new Error(i18n.components.uploader.utils.validation_failed + formatError(e))
  }
}
