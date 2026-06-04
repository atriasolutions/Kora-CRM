import { useContext } from 'react'

import { ActivitiesRegistryContext } from '@/contexts/activities-registry-context'

export function useActivitiesRegistry() {
  const ctx = useContext(ActivitiesRegistryContext)
  if (!ctx) {
    throw new Error(
      'useActivitiesRegistry debe usarse dentro de ActivitiesRegistryProvider',
    )
  }
  return ctx
}
