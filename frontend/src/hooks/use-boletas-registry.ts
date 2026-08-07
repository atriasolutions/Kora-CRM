import { useContext } from 'react'

import { BoletasRegistryContext } from '@/contexts/boletas-registry-context'

export function useBoletasRegistry() {
  const ctx = useContext(BoletasRegistryContext)
  if (!ctx) {
    throw new Error('useBoletasRegistry debe usarse dentro de BoletasRegistryProvider')
  }
  return ctx
}
