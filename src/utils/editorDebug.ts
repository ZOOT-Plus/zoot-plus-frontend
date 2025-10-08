const parseBoolean = (value: string | null | undefined) => {
  if (value === null || value === undefined) return undefined
  if (value === '0' || value === 'false' || value === 'off') return false
  if (value === '1' || value === 'true' || value === 'on') return true
  return undefined
}

const shouldEnableDebug = () => {
  if (typeof window === 'undefined') {
    return import.meta.env.DEV
  }

  const globalFlag = (window as any).__EDITOR_DEBUG_ENABLED
  if (globalFlag !== undefined) {
    return !!globalFlag
  }

  try {
    const stored = parseBoolean(window.localStorage?.getItem('editorDebug'))
    if (stored !== undefined) {
      return stored
    }
  } catch {
    // ignore, fallback to default behaviour
  }

  return import.meta.env.DEV
}

export const updateEditorDebug = (key: string, payload: unknown) => {
  if (!shouldEnableDebug()) {
    return
  }
  if (typeof window === 'undefined') {
    return
  }
  const store = ((window as any).__editor_debug ??= Object.create(null))
  store[key] = payload
  try {
    // eslint-disable-next-line no-console
    console.debug('[EditorDebug]', key, payload)
  } catch {
    // ignore console failures in restricted environments
  }
}

