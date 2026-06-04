import { useContext } from 'react'

import { StockReceiptsRegistryContext } from '@/contexts/stock-receipts-registry-context'

export function useStockReceiptsRegistry() {
  const ctx = useContext(StockReceiptsRegistryContext)
  if (!ctx) {
    throw new Error('useStockReceiptsRegistry must be used within StockReceiptsRegistryProvider')
  }
  return ctx
}
