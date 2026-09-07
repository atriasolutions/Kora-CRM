import { useContext } from 'react'

import { WorkersRegistryContext } from '@/contexts/workers-registry-context'

export function useWorkersRegistry() {
  const ctx = useContext(WorkersRegistryContext)
  if (!ctx) {
    throw new Error('useWorkersRegistry debe usarse dentro de WorkersRegistryProvider')
  }
  return ctx
}
