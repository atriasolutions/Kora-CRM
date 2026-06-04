import { useEffect, useState } from 'react'

import { STOCK_CHANGE_EVENT } from '@/lib/stock-store'

/** Fuerza re-render cuando cambia el ledger de stock (localStorage). */
export function useStockSync(): number {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const onChange = () => setVersion((v) => v + 1)
    window.addEventListener(STOCK_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(STOCK_CHANGE_EVENT, onChange)
  }, [])

  return version
}
