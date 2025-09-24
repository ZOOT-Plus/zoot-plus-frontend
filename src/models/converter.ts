import camelcaseKeys from 'camelcase-keys'
import { CopilotInfo } from 'maa-copilot-client'

import { CopilotDocV1 } from 'models/copilot.schema'

import { i18n } from '../i18n/i18n'
import { findOperatorByName } from './operator'

export function toCopilotOperation(
  apiOperation: CopilotInfo,
): CopilotDocV1.Operation {
  try {
    const json = JSON.parse(apiOperation.content)
    const operation: CopilotDocV1.Operation = camelcaseKeys(json, {
      deep: true,
    })
    return normalizeOperation(migrateOperation(operation))
  } catch (e) {
    console.error('Failed to parse operation', apiOperation, e)
  }

  return {
    doc: {
      title: i18n.models.converter.invalid_operation_content,
    },
    minimumRequired: 'v4.0.0',
    actions: [],
    stageName: '',
  }
}

export function migrateOperation(
  operation: CopilotDocV1.Operation,
): CopilotDocV1.Operation {
  if (operation.version === 2) {
    // in version 2, the module property is set to the index of the module in the modules array,
    // we need to convert it using the correct CopilotDocV1.Module mapping
    return {
      ...operation,
      version: CopilotDocV1.VERSION,
      opers: operation.opers?.map((operator) => {
        if (operator.requirements?.module === undefined) {
          return operator
        }
        const modules = findOperatorByName(operator.name)?.modules
        if (!modules) {
          return operator
        }
        const actualModuleName = modules[operator.requirements.module]
        const actualModule =
          actualModuleName in CopilotDocV1.Module
            ? (CopilotDocV1.Module[actualModuleName] as CopilotDocV1.Module)
            : CopilotDocV1.Module.Default
        return {
          ...operator,
          requirements: {
            ...operator.requirements,
            module: actualModule,
          },
        }
      }),
    }
  }
  return operation
}

function normalizeOperation(
  operation: CopilotDocV1.Operation,
): CopilotDocV1.Operation {
  const { actions } = operation as { actions?: CopilotDocV1.Action[] | CopilotDocV1.SimingActionMap }
  if (actions && !Array.isArray(actions) && typeof actions === 'object') {
    const simingActions =
      operation.simingActions ?? (actions as CopilotDocV1.SimingActionMap)
    return {
      ...operation,
      actions: undefined,
      simingActions,
    }
  }

  if (operation.simingActions && Array.isArray(operation.simingActions)) {
    return {
      ...operation,
      simingActions: undefined,
    }
  }

  return operation
}
