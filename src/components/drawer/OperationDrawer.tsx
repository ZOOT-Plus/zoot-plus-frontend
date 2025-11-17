import { Drawer, DrawerSize } from '@blueprintjs/core'

import { SyntheticEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

import { OperationSetViewer } from 'components/viewer/OperationSetViewer'
import { OperationViewer } from 'components/viewer/OperationViewer'

export function OperationDrawer() {
  const [searchParams, setSearchParams] = useSearchParams()
  const operationId = +(searchParams.get('op') || NaN) || undefined
  const operationSetId = +(searchParams.get('opset') || NaN) || undefined

  const closeOperation = (e?: SyntheticEvent) => {
    // 如果是通过鼠标点击外面来触发的关闭，那么只在左键点击时关闭，避免用后退键点击时关闭后又立即打开的问题
    // (原因是后退键会先触发关闭，然后触发浏览器的后退操作，使页面回到上一个 URL，导致又触发打开)
    if (e?.nativeEvent instanceof MouseEvent && e.nativeEvent.button !== 0) {
      return
    }

    setSearchParams((params) => {
      params.delete('op')
      return params
    })
  }

  const closeOperationSet = (e?: SyntheticEvent) => {
    if (e?.nativeEvent instanceof MouseEvent && e.nativeEvent.button !== 0) {
      return
    }

    setSearchParams((params) => {
      params.delete('opset')
      return params
    })
  }

  const handleOuterBackdropClick = (e?: SyntheticEvent) => {
    if (e?.nativeEvent instanceof MouseEvent && e.nativeEvent.button !== 0) {
      return
    }

    if (operationId) {
      closeOperation(e)
    } else {
      closeOperationSet(e)
    }
  }

  if (operationSetId) {
    return (
      <Drawer
        size={DrawerSize.LARGE}
        isOpen={!!operationSetId}
        onClose={handleOuterBackdropClick}
      >
        {operationSetId && (
          <OperationSetViewer
            operationSetId={operationSetId}
            onCloseDrawer={closeOperationSet}
          />
        )}

        <Drawer
          usePortal={false} // 嵌套 Drawer 时需要关闭 Portal
          size={DrawerSize.LARGE}
          isOpen={!!operationId}
          onClose={closeOperation}
        >
          {operationId && (
            <OperationViewer
              operationId={operationId}
              onCloseDrawer={closeOperation}
            />
          )}
        </Drawer>
      </Drawer>
    )
  }

  return (
    <Drawer
      size={DrawerSize.LARGE}
      isOpen={!!operationId}
      onClose={closeOperation}
    >
      {operationId && (
        <OperationViewer
          operationId={operationId}
          onCloseDrawer={closeOperation}
        />
      )}
    </Drawer>
  )
}
