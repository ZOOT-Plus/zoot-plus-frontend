import { AppToaster } from 'components/Toaster'

import { i18n } from '../i18n/i18n'
import { CopilotDocV1 } from '../models/copilot.schema'
import { ShortCodeContent, toShortCode } from '../models/shortCode'
import { formatError } from '../utils/error'
import { OperationApi } from '../utils/maa-copilot-client'
import { snakeCaseKeysUnicode } from '../utils/object'
import { wrapErrorMessage } from '../utils/wrapErrorMessage'

export const stripOperationExportFields = (payload: Record<string, unknown>) => {
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
  const snakeCaseDoc = snakeCaseKeysUnicode(operationDoc as any) as Record<string, unknown>
  const sanitizedDoc = stripOperationExportFields(snakeCaseDoc)
  const json = JSON.stringify(sanitizedDoc, null, 2)

  doTriggerDownloadJSON(json, `MAACopilot_${operationDoc.doc.title}.json`)

  AppToaster.show({
    message: i18n.services.operation.json_downloaded,
    intent: 'success',
  })
}

export const handleLazyDownloadJSON = async (id: number, title: string) => {
  const resp = await wrapErrorMessage(
    (e) =>
      i18n.services.operation.json_download_failed({
        error: formatError(e),
      }),
    new OperationApi().getCopilotById({
      id: id,
    }),
  )

  try {
    const rawDoc = JSON.parse(resp.data!.content) as Record<string, unknown>
    const snakeCaseDoc = snakeCaseKeysUnicode(rawDoc as any) as Record<string, unknown>
    const sanitizedDoc = stripOperationExportFields(snakeCaseDoc)
    const json = JSON.stringify(sanitizedDoc, null, 2)
    doTriggerDownloadJSON(json, `MAACopilot_${title}.json`)
    AppToaster.show({
      message: i18n.services.operation.json_downloaded,
      intent: 'success',
    })
  } catch (e) {
    console.error(e)
    AppToaster.show({
      message: i18n.services.operation.json_data_error,
      intent: 'danger',
    })
  }
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
