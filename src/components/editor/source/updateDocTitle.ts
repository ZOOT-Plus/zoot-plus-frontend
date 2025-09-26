import { toEditorOperation, toMaaOperation } from '../../editor2/reconciliation'
import { parseOperationLoose } from '../../editor2/validation/schema'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const shouldOverrideTitle = (value: unknown) =>
  typeof value !== 'string' || value.trim().length === 0

const extractTitleFromFilename = (filename: string) => filename

export const updateOperationDocTitle = (
  jsonContent: string,
  filename: string,
): string => {
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(jsonContent)
  } catch (error) {
    console.warn('Failed to parse imported JSON', error)
    return jsonContent
  }

  try {
    const operationLoose = parseOperationLoose(parsedJson)

    if (shouldOverrideTitle(operationLoose.doc?.title)) {
      operationLoose.doc = {
        ...operationLoose.doc,
        title: extractTitleFromFilename(filename),
      }
    }

    const editorOperation = toEditorOperation(operationLoose)
    const formatted = toMaaOperation(editorOperation)
    return JSON.stringify(formatted, null, 2)
  } catch (error) {
    console.warn('Failed to normalize operation JSON', error)

    if (!isRecord(parsedJson)) {
      return jsonContent
    }

    const docValue = parsedJson['doc']
    if (!isRecord(docValue)) {
      return jsonContent
    }

    if (!shouldOverrideTitle(docValue.title)) {
      return jsonContent
    }

    const sanitizedDoc = {
      ...docValue,
      title: extractTitleFromFilename(filename),
    }

    return JSON.stringify(
      {
        ...parsedJson,
        doc: sanitizedDoc,
      },
      null,
      2,
    )
  }
}
