import { useContext } from 'react'

import { QuotesRegistryContext } from '@/contexts/quotes-registry-context'

export function useQuotesRegistry() {
  const ctx = useContext(QuotesRegistryContext)
  if (!ctx) {
    throw new Error('useQuotesRegistry debe usarse dentro de QuotesRegistryProvider')
  }
  return ctx
}
