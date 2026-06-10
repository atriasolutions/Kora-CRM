import { useContext } from 'react'

import { BitacoraRegistryContext } from '@/contexts/bitacora-registry-context'

export function useBitacoraRegistry() {
  const ctx = useContext(BitacoraRegistryContext)
  if (!ctx) {
    throw new Error('useBitacoraRegistry debe usarse dentro de BitacoraRegistryProvider')
  }
  return ctx
}
