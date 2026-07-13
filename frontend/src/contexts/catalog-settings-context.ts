import { createContext } from 'react'

import type {
  CatalogSettings,
  ProductCategorySetting,
  WarehouseSetting,
} from '@/types/catalog-settings'

export type CatalogSettingsContextValue = {
  catalog: CatalogSettings
  isLoading: boolean
  saveCatalog: (next: CatalogSettings) => void
  resetCatalog: () => void
  reloadCatalog: () => Promise<void>
  createWarehouse: (name: string) => Promise<WarehouseSetting>
  updateWarehouse: (
    id: string,
    patch: Partial<WarehouseSetting>,
  ) => Promise<WarehouseSetting>
  deleteWarehouse: (id: string) => Promise<void>
  setDefaultWarehouse: (id: string) => Promise<void>
  createCategory: (name: string, parentId?: string | null) => Promise<ProductCategorySetting>
  updateCategory: (
    id: string,
    patch: Partial<ProductCategorySetting>,
  ) => Promise<ProductCategorySetting>
  deleteCategory: (id: string) => Promise<void>
}

export const CatalogSettingsContext = createContext<CatalogSettingsContextValue | null>(
  null,
)
