import { useMemo } from 'react'

import { isApiEnabled } from '@/api/config'
import { INVENTORY_LOCATION_OPTIONS } from '@/data/inventory.mock'
import { PRODUCT_CATEGORY_OPTIONS } from '@/lib/product-catalog'
import {
  activeProductCategoryNames,
  activeWarehouseNames,
} from '@/lib/catalog-settings'
import { useCatalogSettings } from '@/hooks/use-catalog-settings'

/** Bodegas activas configuradas, con fallback al seed del módulo inventario. */
export function useWarehouseLocationOptions(): string[] {
  const { catalog } = useCatalogSettings()
  return useMemo(() => {
    const names = activeWarehouseNames(catalog.warehouses)
    if (isApiEnabled()) return names
    return names.length > 0 ? names : [...INVENTORY_LOCATION_OPTIONS]
  }, [catalog.warehouses])
}

/** Categorías de producto activas, con fallback al catálogo por defecto. */
export function useProductCategoryOptions(): string[] {
  const { catalog } = useCatalogSettings()
  return useMemo(() => {
    const names = activeProductCategoryNames(catalog.productCategories)
    if (isApiEnabled()) return names
    return names.length > 0 ? names : [...PRODUCT_CATEGORY_OPTIONS]
  }, [catalog.productCategories])
}
