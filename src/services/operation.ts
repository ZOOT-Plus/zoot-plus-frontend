import { AppToaster } from 'components/Toaster'

import { i18n } from '../i18n/i18n'
import { CopilotDocV1 } from '../models/copilot.schema'
import { ShortCodeContent, toShortCode } from '../models/shortCode'
import { formatError } from '../utils/error'
import { OperationApi } from '../utils/maa-copilot-client'
import { snakeCaseKeysUnicode } from '../utils/object'
import { wrapErrorMessage } from '../utils/wrapErrorMessage'

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
  const json = JSON.stringify(
    // 类型对不上 https://github.com/bendrucker/snakecase-keys/issues/138
    snakeCaseKeysUnicode(operationDoc as any),
    null,
    2,
  )

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
    const json = JSON.stringify(
      snakeCaseKeysUnicode(JSON.parse(resp.data!.content) as any),
      null,
      2,
    )
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
