import { debounce } from 'lodash-es'
import { RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { ZodError } from 'zod'

import { i18n } from '../../../i18n/i18n'
import { formatError } from '../../../utils/error'
import { editorAtoms, useEdit } from './editor-state'
import { toEditorOperation } from './reconciliation'
import { operationForParsing, operationForValidation, ParsedOperation } from './schema'

export interface SourceEditorSubmitter {
  submit: (onSubmit: (parsed: ParsedOperation) => void) => boolean
}

export function formatSourceErrors(error: unknown): string[] {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
  }
  return [
    i18n.components.editor2.SourceEditor.unknown_error({
      error: formatError(error),
    }),
  ]
}

export function parseSourceText(text: string): {
  parsed?: ParsedOperation
  errors: string[]
  warnings: string[]
} {
  let json: any
  let parsed: ParsedOperation

  try {
    json = JSON.parse(text)
  } catch (error) {
    return {
      errors: [i18n.components.editor2.SourceEditor.json_syntax_error({ error: formatError(error) })],
      warnings: [],
    }
  }

  try {
    parsed = operationForParsing.parse(json)
  } catch (error) {
    return {
      errors: formatSourceErrors(error),
      warnings: [],
    }
  }

  let warnings: string[] = []
  try {
    operationForValidation.parse(json)
  } catch (error) {
    warnings = formatSourceErrors(error)
  }

  return { parsed, errors: [], warnings }
}

export function useSourceEditorSync(workspaceRef: RefObject<SourceEditorSubmitter | null>, timeout: number) {
  const edit = useEdit()
  const [syncState, setSyncState] = useState<'idle' | 'pending' | 'failed'>('idle')
  const latestTimeoutRef = useRef(timeout)
  // 在渲染期同步最新值：timeout 变化时，上一个 effect 的 cleanup 会先于所有 effect 的 setup 执行，
  // 若改在 effect 里赋值，cleanup 读到的还是旧 timeout，判断就反了
  latestTimeoutRef.current = timeout

  const sync = useMemo(
    () =>
      debounce((): boolean => {
        if (!workspaceRef.current) {
          return false
        }
        const success = workspaceRef.current.submit((parsed) => {
          const newOperation = toEditorOperation(parsed)
          edit((get, set, skip) => {
            const operation = get(editorAtoms.operation)
            if (JSON.stringify(operation) === JSON.stringify(newOperation)) {
              return skip
            }
            set(editorAtoms.operation, newOperation)
            return {
              action: 'edit-json',
              desc: i18n.actions.editor2.set_json,
              squashBy: '',
            }
          })
        })
        setSyncState(success ? 'idle' : 'failed')
        return success
      }, timeout),
    [edit, timeout, workspaceRef],
  )

  useEffect(() => {
    return () => {
      // 超时被改成 0 表示用户关掉了自动同步，此时排队中的这次同步要丢弃：
      // flush 会把挂起的源码缓冲照样提交，等于关开关之后还改动作业。
      // 仍启用时保持 flush，避免离开编辑器时丢掉最后一次改动。
      if (latestTimeoutRef.current > 0) {
        sync.flush()
      } else {
        sync.cancel()
      }
    }
  }, [sync])

  useEffect(() => {
    // 上面 cancel 掉的挂起同步不会把状态推回 idle：关闭自动同步期间 syncState 会一直停在
    // 'pending'，之后仅把超时调大而没有再编辑源码时，工具栏就渲染一个卡在满圈的倒计时
    if (timeout <= 0) {
      setSyncState('idle')
    }
  }, [timeout])

  const requestSync = () => {
    if (timeout > 0) {
      setSyncState('pending')
      sync()
    }
  }

  return { sync, syncState, requestSync }
}
