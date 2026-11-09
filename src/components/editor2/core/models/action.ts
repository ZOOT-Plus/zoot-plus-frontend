import { DragEndEvent } from '@dnd-kit/core'
import { useAtomCallback } from 'jotai/utils'
import { useCallback } from 'react'

import { defaults, uniqueId } from 'lodash-es'
import { SetRequired } from 'type-fest'
import { i18n } from '../../../../i18n/i18n'
import { CopilotDocV1 } from '../../../../models/copilot.schema'
import { EditorAction, editorAtoms, useEdit } from '../editor-state'

export function createAction(initialValues: SetRequired<Partial<Omit<EditorAction, 'id'>>, 'type'>) {
  const action: EditorAction = defaults({ id: uniqueId() }, initialValues)
  if (action.type === CopilotDocV1.Type.SkillUsage && action.skillUsage === undefined) {
    action.skillUsage = CopilotDocV1.SkillUsageType.ReadyToUse
  }
  return action
}

/**
 * 逐位编辑坐标元组（location / distance / rect 共用）。
 *
 * value 为 NaN 表示该位被清空；所有位都空时返回 undefined，由调用方删除整个字段。
 * 未填的位统一归一化成 undefined：导入与序列化链路里 JSON 往返会把 undefined 变成 null，
 * 只认 undefined 会留下 [undefined, null] 这种输入框显示为空、却因元组校验不过而无法导出的字段。
 *
 * 前置条件：index < size，且 T 是长度恰为 size 的固定元组（location/distance 传 2，rect 传 4）。
 * 返回值的运行时长度由 size 保证，但 TS 无法从数组建出定长元组，故末位断言为 T。
 */
export function updateCoordinate<T extends (number | undefined | null)[]>(
  tuple: T | undefined,
  index: number,
  value: number,
  size: number,
): T | undefined {
  const next: (number | undefined)[] = Array.from(
    { length: Math.max(tuple?.length ?? 0, size) },
    (_, i) => tuple?.[i] ?? undefined,
  )
  next[index] = Number.isNaN(value) ? undefined : value
  return next.every((axis) => axis === undefined) ? undefined : (next as unknown as T)
}

export function useActionDragEnd() {
  const edit = useEdit()
  return useAtomCallback(
    useCallback(
      (get, set, { active, over }: DragEndEvent) => {
        const actions = get(editorAtoms.actions)
        if (over && active.id !== over.id) {
          const oldIndex = actions.findIndex((action) => action.id === active.id)
          const newIndex = actions.findIndex((action) => action.id === over.id)
          if (oldIndex !== -1 && newIndex !== -1) {
            const actionAtoms = get(editorAtoms.actionAtoms)
            edit(() => {
              const beforeIndex = oldIndex < newIndex ? newIndex + 1 : newIndex
              set(editorAtoms.actionAtoms, {
                type: 'move',
                atom: actionAtoms[oldIndex],
                before: actionAtoms[beforeIndex],
              })
              return {
                action: 'move-action',
                desc: i18n.components.editor2.ActionEditor.move_action,
              }
            })
          }
        }
      },
      [edit],
    ),
  )
}
