import { OverlayToaster, Position, type ToastProps, type Toaster } from '@blueprintjs/core'

// v6 起 OverlayToaster.create 返回 Promise（内部改用 React 18 createRoot 异步挂载）。
// 这里用一个同步门面缓冲就绪前的调用，对外保持历史上的同步 AppToaster API。
let toaster: Toaster | undefined
const toasterPromise = OverlayToaster.create({
  position: Position.BOTTOM_LEFT,
  className: '!fixed',
})
void toasterPromise.then((t) => {
  toaster = t
})

export const AppToaster = {
  show(props: ToastProps, key?: string): string | undefined {
    if (toaster) {
      return toaster.show(props, key)
    }
    void toasterPromise.then((t) => t.show(props, key))
    return key
  },
  dismiss(key: string) {
    if (toaster) {
      toaster.dismiss(key)
      return
    }
    void toasterPromise.then((t) => t.dismiss(key))
  },
  clear() {
    if (toaster) {
      toaster.clear()
      return
    }
    void toasterPromise.then((t) => t.clear())
  },
}
