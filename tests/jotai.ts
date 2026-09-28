import { Provider, createStore } from 'jotai'
import { createElement, type PropsWithChildren } from 'react'

export function createStoreWrapper(store: ReturnType<typeof createStore>) {
  return function StoreWrapper({ children }: PropsWithChildren) {
    return createElement(Provider, { store }, children)
  }
}
