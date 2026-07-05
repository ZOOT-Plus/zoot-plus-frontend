import {
  Icon,
  Menu,
  MenuDivider,
  MenuItem,
  PopoverNext,
  PopoverNextProps,
  PopoverNextRef,
  Tooltip,
  mergeRefs,
} from '@blueprintjs/core'

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
    props: { locatorRef: Ref<HTMLElement> } & Parameters<NonNullable<PopoverNextProps['renderTarget']>>[0],
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
    const popoverRef = useRef<PopoverNextRef>(null)
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
              // 已打开时再次点击会关闭并立刻重开，浮层动画期间位置不会自动跟随 locator，
              // 所以这里手动让 Floating UI 重新计算位置
              popoverRef.current?.reposition()
            }
            return true
          })
        },
      }),
      [],
    )

    return (
      <PopoverNext
        ref={popoverRef}
        animation="minimal"
        arrow={false}
        placement="right-start"
        popoverClassName="[&>.bp6-popover-content]:!p-0 overflow-hidden"
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
                      <Tooltip content={description()}>
                        <Icon className="!text-gray-300 dark:!text-gray-500" icon="info-sign" />
                      </Tooltip>
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
      </PopoverNext>
    )
  },
)
CreateActionMenu.displayName = 'CreateActionMenu'
