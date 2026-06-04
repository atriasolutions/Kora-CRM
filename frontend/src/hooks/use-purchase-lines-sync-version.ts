import { useEffect, useState } from 'react'

import { PURCHASE_LINES_SYNC_EVENT } from '@/data/purchases-registry-store'
import { STOCK_RECEIPT_LINES_SYNC_EVENT } from '@/data/stock-receipt-lines-registry-store'

/** Incrementa cuando se sincronizan líneas de OC (p. ej. en tránsito en inventario). */
export function usePurchaseLinesSyncVersion(): number {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const onSync = () => setVersion((v) => v + 1)
    window.addEventListener(PURCHASE_LINES_SYNC_EVENT, onSync)
    window.addEventListener(STOCK_RECEIPT_LINES_SYNC_EVENT, onSync)
    return () => {
      window.removeEventListener(PURCHASE_LINES_SYNC_EVENT, onSync)
      window.removeEventListener(STOCK_RECEIPT_LINES_SYNC_EVENT, onSync)
    }
  }, [])

  return version
}
