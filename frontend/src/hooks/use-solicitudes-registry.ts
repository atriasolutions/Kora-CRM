import { useContext } from 'react'

import { SolicitudesRegistryContext } from '@/contexts/solicitudes-registry-context'

export function useSolicitudesRegistry() {
  const ctx = useContext(SolicitudesRegistryContext)
  if (!ctx) {
    throw new Error('useSolicitudesRegistry debe usarse dentro de SolicitudesRegistryProvider')
  }
  return ctx
}
