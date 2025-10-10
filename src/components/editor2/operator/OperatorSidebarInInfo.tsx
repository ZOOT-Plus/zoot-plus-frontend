import { Button } from '@blueprintjs/core'
import clsx from 'clsx'
import { FC, useCallback, useEffect, useId, useState } from 'react'

import { useTranslation } from '../../../i18n/i18n'
import { OperatorEditor } from './OperatorEditor'
import { OperatorSheet } from './sheet/OperatorSheet'

const TRANSITION_MS = 200

interface OperatorSidebarInInfoProps {
  className?: string
  label?: string
}

// 与 OperatorSidebarFloating 保持相同的侧边抽屉逻辑，仅将触发按钮放置为内联样式
export const OperatorSidebarInInfo: FC<OperatorSidebarInInfoProps> = ({
  className,
  label,
}) => {
  const [open, setOpen] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const t = useTranslation()
  const dialogId = useId()

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      if (!prev) {
        setShouldRender(true)
      }
      return next
    })
  }, [])

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    if (open) {
      setShouldRender(true)
      return
    }
    const timeout = window.setTimeout(() => setShouldRender(false), TRANSITION_MS)
    return () => window.clearTimeout(timeout)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, close])

  const panelTitle = t.components.editor2.OperatorEditor.add_operator
  const triggerText = open ? t.common.close : label ?? t.components.editor2.SelectorPanel.operator

  return (
    <>
      <Button
        large
        icon={open ? 'cross' : 'people'}
        className={clsx('z-40', className)}
        onClick={toggle}
        text={triggerText}
        aria-expanded={open}
        aria-controls={shouldRender ? dialogId : undefined}
      />
      {shouldRender && (
        <div
          className={clsx(
            // 提升整体遮罩层级，确保悬浮窗覆盖粘性页头/其它浮层
            'fixed inset-0 z-50 transition-opacity duration-200',
            open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <div
            className={clsx(
              'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200',
              open ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden
            onClick={close}
          />
          <aside
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-label={panelTitle}
            className={clsx(
              // 面板层级设为更高，避免被其它 fixed 元素覆盖
              'fixed bottom-20 right-4 z-[60] flex w-[min(520px,calc(100vw-2rem))] flex-col gap-3 overflow-hidden rounded-xl bg-white/95 dark:bg-slate-900/95 shadow-lg',
              'transition-all duration-200 ease-out',
              // 展开态需避免 transform，否则 dnd-kit 会使用错误坐标
              open ? 'opacity-100' : 'translate-y-4 opacity-0 pointer-events-none',
            )}
            style={{ height: 'min(720px, calc(100vh - 6rem))' }}
          >
            <div className="panel-shadow flex shrink-0 items-center justify-between rounded-lg  px-4 py-2 dark:bg-gray-900/90">
              <span className="font-semibold">{panelTitle}</span>
              <Button minimal icon="cross" onClick={close} aria-label={t.common.close} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 h-full overflow-hidden">
                <OperatorSheet />
              </div>
              <div className="h-1 bg-white dark:bg-[#383e47]" />
              <div className="flex-1 h-full overflow-auto">
                <OperatorEditor />
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

