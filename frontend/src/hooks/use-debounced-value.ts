import { useEffect, useState } from 'react'

/** Retorna `value` solo después de `delayMs` sin cambios (evita trabajo en cada tecla). */
export function useDebouncedValue<T>(value: T, delayMs = 450): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
