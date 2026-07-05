import { useEffect, useRef, useState } from 'react'

export function useEditableFields<T>(fields: T[]) {
  const [editingField, setEditingField] = useState<T>()
  const editingIndex = useRef<number>(-1)
  const updatedListener = useRef<(fields: T[]) => void>()

  const reserveEditingField = (index: number, onceUpdated?: (fields: T[]) => void) => {
    // we cannot directly update editingField using the field because its ID
    // as well as the object reference will be changed. The only thing we can do
    // is keep track of the index and retrieve the field after fields have been
    // updated. BEWARE: make sure the indices do not change before next rerender,
    // otherwise the index access in useEffect will be wrong.
    editingIndex.current = index
    updatedListener.current = onceUpdated
  }

  // retrieve the field that's just updated
  useEffect(() => {
    if (editingIndex.current !== -1) {
      setEditingField(fields[editingIndex.current])
      editingIndex.current = -1
    }
    updatedListener.current?.(fields)
    updatedListener.current = undefined
  }, [fields])

  return { editingField, setEditingField, reserveEditingField }
}
