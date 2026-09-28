import { Button, Icon } from '@blueprintjs/core'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import clsx from 'clsx'
import { useAtomValue, useSetAtom } from 'jotai'
import { selectAtom } from 'jotai/utils'
import { FC, useRef } from 'react'

import { useTranslation } from '../../../../i18n/i18n'
import { Sortable } from '../../../dnd'
import { editorAtoms } from '../../core/editor-state'
import { useActionDragEnd } from '../../core/models/action'
import { AtomRenderer } from '../AtomRenderer'
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
  const t = useTranslation()
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  )
  const { toggleSelectorPanel } = useAtomValue(editorAtoms.config)
  const setSelectorMode = useSetAtom(editorAtoms.selectorPanelMode)
  const createActionMenuRef = useRef<CreateActionMenuRef>(null)

  const handleDragEnd = useActionDragEnd()

  return (
    <div
      className={clsx('px-4 grow min-h-0 pb-96', className)}
      onMouseDownCapture={() => toggleSelectorPanel && setSelectorMode('map')}
    >
      <h3 className="text-lg font-bold">
        {t.components.editor2.ActionEditor.action_sequence} ({actionAtoms.length})
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
                    {(attrs) => <ActionItem actionAtom={actionAtom} {...attrs} />}
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
          <div className="fixed top-0 right-0 bottom-0 left-0 pointer-events-none" ref={ref}>
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <span className="absolute" ref={locatorRef} onClick={onClick} />
          </div>
        )}
      />
    </div>
  )
}
