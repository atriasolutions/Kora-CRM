import { useContext } from 'react'

import { CompaniesRegistryContext } from '@/contexts/companies-registry-context'

export function useCompaniesRegistry() {
  const ctx = useContext(CompaniesRegistryContext)
  if (!ctx) {
    throw new Error(
      'useCompaniesRegistry debe usarse dentro de CompaniesRegistryProvider',
    )
  }
  return ctx
}
