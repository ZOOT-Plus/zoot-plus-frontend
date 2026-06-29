import { Icon, Menu, MenuDivider, MenuItem, mergeRefs } from '@blueprintjs/core'
import { Popover2, Popover2Props, PopperCustomModifer, Tooltip2 } from '@blueprintjs/popover2'

import { PrimitiveAtom, useSetAtom } from 'jotai'
import { clamp } from 'lodash-es'
import { ReactNode, Ref, forwardRef, useImperativeHandle, useRef, useState } from 'react'

import { useTranslation } from '../../../i18n/i18n'
import { ACTION_TYPES_BY_GROUP } from '../../../models/types'
import { joinJSX } from '../../../utils/react'
import { EditorAction, editorAtoms, useEdit } from '../editor-state'
import { createAction } from '../reconciliation'

interface CreateActionMenuProps {
  actionAtom?: PrimitiveAtom<EditorAction>
  renderTarget?: (
    props: { locatorRef: Ref<HTMLElement> } & Parameters<NonNullable<Popover2Props['renderTarget']>>[0],
  ) => JSX.Element
  children?: ReactNode
}

export interface CreateActionMenuRef {
  open: (x: number, y: number, e?: MouseEvent) => void
}

export const CreateActionMenu = forwardRef<CreateActionMenuRef, CreateActionMenuProps>(
  ({ actionAtom, renderTarget, children }, ref) => {
    const edit = useEdit()
    const dispatchActions = useSetAtom(editorAtoms.actionAtoms)
    const containerRef = useRef<HTMLElement>(null)
    const locatorRef = useRef<HTMLElement>(null)
    const popperRef = useRef<Parameters<NonNullable<PopperCustomModifer['fn']>>[0]['instance']>()
    const [isOpen, setIsOpen] = useState(false)
    const t = useTranslation()

    useImperativeHandle(
      ref,
      () => ({
        open: (x, y) => {
          const locator = locatorRef.current
          const container = containerRef.current
          if (!locator || !container) {
            return
          }
          const rect = container.getBoundingClientRect()
          const top = clamp(y - rect.top, 0, rect.height)
          const left = clamp(x - rect.left, 0, rect.width)
          locator.style.top = `${top}px`
          locator.style.left = `${left}px`
          setIsOpen((wasOpen) => {
            if (wasOpen) {
              // 如果在 Popover 已经是打开状态时再次点击，会关闭并立刻再打开，而由于 Popover 内部的动画机制，
              // 在关闭后 300ms 内打开会导致 Popper 不更新位置，所以这里必须手动更新
              popperRef.current?.update()
            }
            return true
          })
        },
      }),
      [],
    )

    return (
      <Popover2
        minimal
        placement="right-start"
        popoverClassName="[&>.bp4-popover2-content]:!p-0 overflow-hidden"
        isOpen={isOpen}
        onInteraction={setIsOpen}
        content={
          <Menu>
            {joinJSX(
              Object.values(ACTION_TYPES_BY_GROUP).map((actionTypes) =>
                actionTypes.map(({ title, description, icon, value }) => (
                  <MenuItem
                    key={value}
                    icon={icon}
                    text={title()}
                    labelElement={
                      <Tooltip2 content={description()}>
                        <Icon className="!text-gray-300 dark:!text-gray-500" icon="info-sign" />
                      </Tooltip2>
                    }
                    onClick={() => {
                      edit(() => {
                        dispatchActions({
                          type: 'insert',
                          value: createAction({ type: value }),
                          before: actionAtom,
                        })
                        return {
                          action: 'add-action',
                          desc: t.components.editor2.CreateActionMenu.add_action,
                        }
                      })
                    }}
                  />
                )),
              ),
              <MenuDivider />,
            ).flat()}
          </Menu>
        }
        modifiersCustom={
          renderTarget
            ? [
                {
                  name: 'getPopperInstance',
                  enabled: true,
                  phase: 'main',
                  fn: ({ instance }) => void (popperRef.current = instance),
                },
              ]
            : undefined
        }
        renderTarget={
          renderTarget &&
          (({ ref, ...props }) =>
            renderTarget({
              ...props,
              ref: containerRef,
              locatorRef: mergeRefs(locatorRef, ref),
            }))
        }
      >
        {children}
      </Popover2>
    )
  },
)
CreateActionMenu.displayName = 'CreateActionMenu'
