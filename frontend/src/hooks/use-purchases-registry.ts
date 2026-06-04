import { useContext } from 'react'

import { PurchasesRegistryContext } from '@/contexts/purchases-registry-context'

export function usePurchasesRegistry() {
  const ctx = useContext(PurchasesRegistryContext)
  if (!ctx) {
    throw new Error('usePurchasesRegistry debe usarse dentro de PurchasesRegistryProvider')
  }
  return ctx
}
