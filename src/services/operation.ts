import { AppToaster } from 'components/Toaster'

import { i18n } from '../i18n/i18n'
import { CopilotDocV1 } from '../models/copilot.schema'
import { ShortCodeContent, toShortCode } from '../models/shortCode'
import { formatError } from '../utils/error'
import { OperationApi } from '../utils/maa-copilot-client'
import { snakeCaseKeysUnicode } from '../utils/object'
import { wrapErrorMessage } from '../utils/wrapErrorMessage'

export const stripOperationExportFields = (
  payload: Record<string, unknown>,
) => {
  const sanitized = { ...payload }
  delete sanitized.minimum_required
  delete sanitized.minimumRequired
  delete sanitized.groups
  return sanitized
}

const doTriggerDownloadJSON = (content: string, filename: string) => {
  const blob = new Blob([content], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export const handleDownloadJSON = (operationDoc: CopilotDocV1.Operation) => {
  // pretty print the JSON
  const snakeCaseDoc = snakeCaseKeysUnicode(operationDoc as any) as Record<
    string,
    unknown
  >
  const sanitizedDoc = stripOperationExportFields(snakeCaseDoc)
  const json = JSON.stringify(sanitizedDoc, null, 2)

  doTriggerDownloadJSON(json, `MaaYuanCopilot_${operationDoc.doc.title}.json`)

  AppToaster.show({
    message: i18n.services.operation.json_downloaded,
    intent: 'success',
  })
}

const getSnakeCaseOperationDoc = async (
  id: number,
): Promise<Record<string, unknown> | undefined> => {
  const resp = await wrapErrorMessage(
    (e) =>
      i18n.services.operation.json_download_failed({
        error: formatError(e),
      }),
    new OperationApi().getCopilotById({
      id,
    }),
  )

  try {
    const rawDoc = JSON.parse(resp.data!.content) as Record<string, unknown>
    return snakeCaseKeysUnicode(rawDoc as any) as Record<string, unknown>
  } catch (error) {
    console.error(error)
    AppToaster.show({
      message: i18n.services.operation.json_data_error,
      intent: 'danger',
    })
    return undefined
  }
}

export const handleLazyDownloadJSON = async (id: number, title: string) => {
  const snakeCaseDoc = await getSnakeCaseOperationDoc(id)
  if (!snakeCaseDoc) {
    return
  }

  const sanitizedDoc = stripOperationExportFields(snakeCaseDoc)
  const json = JSON.stringify(sanitizedDoc, null, 2)
  doTriggerDownloadJSON(json, `MaaYuanCopilot_${title}.json`)
  AppToaster.show({
    message: i18n.services.operation.json_downloaded,
    intent: 'success',
  })
}

export const handleLazyDownloadSimingJSON = async (
  id: number,
  title: string,
) => {
  const snakeCaseDoc = await getSnakeCaseOperationDoc(id)
  if (!snakeCaseDoc) {
    return
  }

  const sanitizedDoc = stripOperationExportFields(snakeCaseDoc)
  const simingActionsCandidate =
    sanitizedDoc['siming_actions'] ?? sanitizedDoc['actions']

  if (
    !simingActionsCandidate ||
    Array.isArray(simingActionsCandidate) ||
    typeof simingActionsCandidate !== 'object'
  ) {
    AppToaster.show({
      message: i18n.services.operation.siming_json_missing,
      intent: 'danger',
    })
    return
  }

  const simingActions = simingActionsCandidate as CopilotDocV1.SimingActionMap

  const json = JSON.stringify(simingActions, null, 2)
  doTriggerDownloadJSON(json, `MaaYuanCopilot_Siming_${title}.json`)
  AppToaster.show({
    message: i18n.services.operation.json_downloaded,
    intent: 'success',
  })
}

/**
 * @param target - Either an operation or an operation set
 */
export const copyShortCode = async (target: { id: number }) => {
  try {
    const content: ShortCodeContent = {
      id: target.id,
    }

    const shortCode = toShortCode(content)
    navigator.clipboard.writeText(shortCode)

    AppToaster.show({
      message: i18n.services.operation.shortcode_copied,
      intent: 'success',
    })
  } catch (e) {
    AppToaster.show({
      message: i18n.services.operation.shortcode_copy_failed({
        error: formatError(e),
      }),
      intent: 'danger',
    })
  }
}
