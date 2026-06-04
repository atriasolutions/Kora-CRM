import { useContext } from 'react'

import { OpportunitiesRegistryContext } from '@/contexts/opportunities-registry-context'

export function useOpportunitiesRegistry() {
  const ctx = useContext(OpportunitiesRegistryContext)
  if (!ctx) {
    throw new Error(
      'useOpportunitiesRegistry debe usarse dentro de OpportunitiesRegistryProvider',
    )
  }
  return ctx
}
