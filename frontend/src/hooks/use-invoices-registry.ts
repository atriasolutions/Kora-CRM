import { useContext } from 'react'

import { InvoicesRegistryContext } from '@/contexts/invoices-registry-context'

export function useInvoicesRegistry() {
  const ctx = useContext(InvoicesRegistryContext)
  if (!ctx) {
    throw new Error('useInvoicesRegistry debe usarse dentro de InvoicesRegistryProvider')
  }
  return ctx
}
