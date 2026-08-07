import { useContext } from 'react'
import { PruebasSolicitudRegistryContext } from '@/contexts/pruebas-solicitud-registry-context'

export function usePruebasSolicitudRegistry() {
  const ctx = useContext(PruebasSolicitudRegistryContext)
  if (!ctx) {
    throw new Error('usePruebasSolicitudRegistry debe usarse dentro de PruebasSolicitudRegistryProvider')
  }
  return ctx
}
