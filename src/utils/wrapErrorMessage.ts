import { ToastProps } from '@blueprintjs/core'

import { AppToaster } from 'components/Toaster'

export type MessageFormatter = (error: unknown) => string

const defaultMessageProps: Partial<ToastProps> = {
  intent: 'danger',
}

export const wrapErrorMessage = <T>(
  options: string | MessageFormatter | Omit<ToastProps, 'intent'>,
  promise: Promise<T>,
): Promise<T> => {
  return promise.catch((error) => {
    const config: ToastProps = (() => {
      switch (typeof options) {
        case 'string':
          return {
            ...defaultMessageProps,
            message: options,
          }
        case 'function':
          return {
            ...defaultMessageProps,
            message: options(error),
          }
        case 'object':
          return options
      }
    })()
    AppToaster.show(config)
    return Promise.reject(error)
  })
}
