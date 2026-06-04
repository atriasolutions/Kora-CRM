import { useCallback, useState } from 'react'

/** Ancla en el header del módulo; la lista renderiza la toolbar vía portal (sin setState con ReactNode). */
export function useEmbeddedListToolbarSlot() {
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null)
  const toolbarSlotRef = useCallback((node: HTMLDivElement | null) => {
    setToolbarHost(node)
  }, [])

  const toolbarSlot = (
    <div ref={toolbarSlotRef} className="flex items-center gap-2" />
  )

  return { toolbarHost, toolbarSlot }
}
