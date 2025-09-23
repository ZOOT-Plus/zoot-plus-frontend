import { Button, Icon } from '@blueprintjs/core'
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'

import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { selectAtom, useAtomCallback } from 'jotai/utils'
import { FC, useCallback, useRef } from 'react'

import { i18n, useTranslation } from '../../../i18n/i18n'
import { Sortable } from '../../dnd'
import { AtomRenderer } from '../AtomRenderer'
import { editorAtoms, useEdit } from '../editor-state'
import { ActionItem } from './ActionItem'
import { CreateActionMenu, CreateActionMenuRef } from './CreateActionMenu'

interface ActionEditorProps {
  className?: string
}

const actionIdsAtom = selectAtom(
  editorAtoms.actions,
  (actions) => actions.map((action) => action.id),
  (a, b) => a.join() === b.join(),
)

export const ActionEditor: FC<ActionEditorProps> = ({ className }) => {
  const actionAtoms = useAtomValue(editorAtoms.actionAtoms)
  const actionIds = useAtomValue(actionIdsAtom)
  const edit = useEdit()
  const t = useTranslation()
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  )
  const createActionMenuRef = useRef<CreateActionMenuRef>(null)

  const handleDragEnd = useAtomCallback(
    useCallback(
      (get, set, { active, over }: DragEndEvent) => {
        const actions = get(editorAtoms.actions)
        if (over && active.id !== over.id) {
          const oldIndex = actions.findIndex((el) => el.id === active.id)
          const newIndex = actions.findIndex((el) => el.id === over.id)
          if (oldIndex !== -1 && newIndex !== -1) {
            const actionAtoms = get(editorAtoms.actionAtoms)
            edit(() => {
              // 从后往前移动需要+1，比如从 0 移动到 1，最终位置是 1，实际上是 before 2
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

  return (
    <div className={clsx('px-4 grow min-h-0 pb-96', className)}>
      <h3 className="text-lg font-bold">
        {t.components.editor2.ActionEditor.action_sequence} (
        {actionAtoms.length})
      </h3>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={actionIds}>
          <ul className="flex flex-col">
            {actionAtoms.map((actionAtom) => (
              <AtomRenderer
                key={actionAtom.toString()}
                atom={actionAtom}
                render={(action) => (
                  <Sortable id={action.id} key={action.id}>
                    {(attrs) => (
                      <ActionItem actionAtom={actionAtom} {...attrs} />
                    )}
                  </Sortable>
                )}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <Button
        minimal
        outlined
        icon={<Icon icon="plus" size={24} />}
        intent="primary"
        className="relative mt-6 w-full h-16 !text-lg"
        onClick={(e) => {
          createActionMenuRef.current?.open(e.clientX, e.clientY)
        }}
      >
        {t.components.editor2.ActionEditor.add_action}
      </Button>
      <CreateActionMenu
        ref={createActionMenuRef}
        renderTarget={({ ref, locatorRef, onClick }) => (
          <div
            className="fixed top-0 right-0 bottom-0 left-0 pointer-events-none"
            ref={ref}
          >
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <span className="absolute" ref={locatorRef} onClick={onClick} />
          </div>
        )}
      />
    </div>
  )
}
