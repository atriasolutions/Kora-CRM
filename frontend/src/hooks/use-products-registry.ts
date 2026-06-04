import { useContext } from 'react'

import { ProductsRegistryContext } from '@/contexts/products-registry-context'

export function useProductsRegistry() {
  const ctx = useContext(ProductsRegistryContext)
  if (!ctx) {
    throw new Error('useProductsRegistry debe usarse dentro de ProductsRegistryProvider')
  }
  return ctx
}
