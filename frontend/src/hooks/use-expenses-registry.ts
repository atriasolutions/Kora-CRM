import { useContext } from 'react'

import { ExpensesRegistryContext } from '@/contexts/expenses-registry-context'

export function useExpensesRegistry() {
  const ctx = useContext(ExpensesRegistryContext)
  if (!ctx) {
    throw new Error('useExpensesRegistry debe usarse dentro de ExpensesRegistryProvider')
  }
  return ctx
}
