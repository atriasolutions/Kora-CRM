import { useContext } from 'react'

import { ReportsTreeContext } from '@/contexts/reports-tree-context'

export function useReportsTree() {
  const ctx = useContext(ReportsTreeContext)
  if (!ctx) {
    throw new Error('useReportsTree debe usarse dentro de ReportsRegistryProvider')
  }
  return ctx
}
