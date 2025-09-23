import { Button, Callout, NonIdealState } from '@blueprintjs/core'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDndContext,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'

import { produce } from 'immer'
import { atom, useAtom, useAtomValue } from 'jotai'
import { selectAtom, useAtomCallback } from 'jotai/utils'
import { FC, memo, useCallback, useMemo } from 'react'

import { i18n, languageAtom, useTranslation } from '../../../i18n/i18n'
import { getLocalizedOperatorName } from '../../../models/operator'
import { Droppable, Sortable } from '../../dnd'
import { AtomRenderer } from '../AtomRenderer'
import {
  EditorOperator,
  editorAtoms,
  traverseOperators,
  useEdit,
} from '../editor-state'
import { createOperator } from '../reconciliation'
import { EntityIssue } from '../validation/validation'
import { OperatorItem } from './OperatorItem'
import { OperatorSelect } from './OperatorSelect'
import { useAddOperator } from './useAddOperator'

const globalContainerId = 'global'

const operatorIdsAtom = selectAtom(
  editorAtoms.operators,
  (operators) => operators.map((o) => o.id),
  (a, b) => a.join() === b.join(),
)

export const OperatorEditor: FC = memo(() => {
  const operatorIds = useAtomValue(operatorIdsAtom)
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
  const [operatorAtoms, dispatchOperators] = useAtom(editorAtoms.operatorAtoms)

  const handleDragEnd = useAtomCallback(
    useCallback(
      (get, set, { active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) {
          return
        }
        const operation = get(editorAtoms.operation)
        const activeIndex = operation.opers.findIndex((op) => op.id === active.id)
        const overIndex = operation.opers.findIndex((op) => op.id === over.id)
        if (activeIndex === -1 || overIndex === -1) {
          return
        }
        const newOperation = produce(operation, (draft) => {
          const [moved] = draft.opers.splice(activeIndex, 1)
          draft.opers.splice(overIndex, 0, moved)
        })
        if (newOperation !== operation) {
          edit(() => {
            set(editorAtoms.operation, newOperation)
            return {
              action: 'move-operator',
              desc: i18n.actions.editor2.move_operator,
            }
          })
        }
      },
      [edit],
    ),
  )

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center border-b border-gray-200 dark:border-gray-600">
        <CreateOperatorButton />
      </div>
      <div className="grow md:overflow-auto px-4 pt-4">
        <OperatorError />
        {operatorAtoms.length === 0 ? (
          <NonIdealState
            icon="helicopter"
            title={t.components.editor2.OperatorEditor.no_operators}
          />
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <Droppable id={globalContainerId} data={{ type: 'operator-list' }}>
              <SortableContext items={operatorIds}>
                <ul className="flex flex-wrap gap-4">
                  {operatorAtoms.map((operatorAtom) => (
                    <AtomRenderer
                      atom={operatorAtom}
                      key={operatorAtom.toString()}
                      render={(operator, { onChange }) => (
                        <Sortable
                          id={operator.id}
                          data={{
                            type: 'operator',
                            container: globalContainerId,
                          }}
                        >
                          {(attrs) => (
                            <OperatorItem
                              operator={operator}
                              onChange={onChange}
                              onRemove={() =>
                                edit(() => {
                                  dispatchOperators({
                                    type: 'remove',
                                    atom: operatorAtom,
                                  })
                                  return {
                                    action: 'remove-operator',
                                    desc: i18n.actions.editor2.delete_operator,
                                  }
                                })
                              }
                              {...attrs}
                            />
                          )}
                        </Sortable>
                      )}
                    />
                  ))}
                </ul>
              </SortableContext>
            </Droppable>
            <OperatorDragOverlay />
          </DndContext>
        )}
      </div>
    </div>
  )
})
OperatorEditor.displayName = 'OperatorPanel'

const CreateOperatorButton: FC<{}> = () => {
  const addOperator = useAddOperator()
  const t = useTranslation()
  return (
    <OperatorSelect
      markPicked
      onSelect={(name) => {
        addOperator(createOperator({ name }))
      }}
    >
      <Button minimal intent="primary" className="!py-1.5" icon="plus">
        {t.components.editor2.OperatorEditor.add_operator}
      </Button>
    </OperatorSelect>
  )
}

const OperatorDragOverlay = () => {
  const { active } = useDndContext()
  const activeOperatorAtom = useMemo(
    () =>
      atom((get) => {
        if (active?.id) {
          for (const op of get(editorAtoms.operators)) {
            if (op.id === active.id) {
              return op
            }
          }
          for (const group of get(editorAtoms.groups)) {
            for (const op of group.opers) {
              if (op.id === active.id) {
                return op
              }
            }
          }
        }
        return undefined
      }),
    [active?.id],
  )
  const activeOperator = useAtomValue(activeOperatorAtom)
  return (
    <DragOverlay>
      {activeOperator && <OperatorItem onOverlay operator={activeOperator} />}
    </DragOverlay>
  )
}

const operatorErrorsAtom = atom((get) => {
  const entityErrors = get(editorAtoms.visibleEntityErrors)
  if (!entityErrors) return undefined

  const opers = get(editorAtoms.operators)
  const groups = get(editorAtoms.groups)
  const operatorErrors: { operator: EditorOperator; errors: EntityIssue[] }[] =
    []

  for (const [id, errors] of Object.entries(entityErrors)) {
    traverseOperators({ opers, groups }, (operator) => {
      if (operator.id === id) {
        operatorErrors.push({ operator, errors })
        return true
      }
      return false
    })
  }
  return operatorErrors.length ? operatorErrors : undefined
})

const OperatorError = () => {
  const errors = useAtomValue(operatorErrorsAtom)
  const language = useAtomValue(languageAtom)
  const t = useTranslation()
  if (!errors) return null

  return (
    <Callout intent="danger" icon={null} className="mb-4 p-2 text-xs">
      {errors.map(({ operator, errors }) =>
        errors.map(({ path, fieldLabel, message }) => (
          <p key={operator.id + path.join()} className="error-message">
            {fieldLabel
              ? t.components.editor2.OperatorEditor.operator_field_error({
                  name: getLocalizedOperatorName(operator.name, language),
                  field: fieldLabel,
                  error: message,
                })
              : t.components.editor2.OperatorEditor.operator_error({
                  name: getLocalizedOperatorName(operator.name, language),
                  error: message,
                })}
          </p>
        )),
      )}
    </Callout>
  )
}

