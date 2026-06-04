import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  createProductCategoryApi,
  deleteProductCategoryApi,
  listProductCategoriesApi,
  updateProductCategoryApi,
} from '@/api/product-categories'
import {
  createWarehouseApi,
  deleteWarehouseApi,
  listWarehousesApi,
  updateWarehouseApi,
} from '@/api/warehouses'
import { CatalogSettingsContext } from '@/contexts/catalog-settings-context'
import { syncCatalogSettings } from '@/data/catalog-settings-store'
import {
  createProductCategory,
  createWarehouse,
  defaultCatalogSettings,
  loadCatalogSettings,
  saveCatalogSettings,
} from '@/lib/catalog-settings'
import type {
  CatalogSettings,
  ProductCategorySetting,
  WarehouseSetting,
} from '@/types/catalog-settings'
import { useAuth } from '@/hooks/use-auth'
import {
  useRegistryApiBootstrap,
  useSessionCanModule,
} from '@/hooks/use-registry-api-bootstrap'
import { canModule, getProfilePermissionMap } from '@/lib/access-control'
import { toast } from '@/lib/toast'

const useApi = isApiEnabled()

function parseApiError(err: unknown): string {
  const message = err instanceof Error ? err.message : ''
  const match = message.match(/"message":"([^"]+)"/)
  return match?.[1] ?? 'No se pudo completar la operación.'
}

export function CatalogSettingsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const canConfig = useSessionCanModule('configuracion')
  const canProducts = useSessionCanModule('productos')
  const canBootstrapCatalog = canConfig || canProducts

  const [catalog, setCatalog] = useState<CatalogSettings>(() =>
    useApi ? { warehouses: [], productCategories: [] } : loadCatalogSettings(),
  )
  const [isLoading, setIsLoading] = useState(false)

  const applyCatalog = useCallback((next: CatalogSettings) => {
    setCatalog(next)
    syncCatalogSettings(next)
  }, [])

  const reloadFromApi = useCallback(async () => {
    const map = profile ? getProfilePermissionMap(profile) : null
    const loadWarehouses = !useApi || !map || canModule(map, 'configuracion', 'view')
    const loadCategories = !useApi || !map || canModule(map, 'productos', 'view')

    const [warehouses, productCategories] = await Promise.all([
      loadWarehouses ? listWarehousesApi() : Promise.resolve(null),
      loadCategories ? listProductCategoriesApi() : Promise.resolve(null),
    ])
    setCatalog((prev) => {
      const next = {
        warehouses: warehouses ?? prev.warehouses,
        productCategories: productCategories ?? prev.productCategories,
      }
      syncCatalogSettings(next)
      return next
    })
  }, [profile])

  useRegistryApiBootstrap(
    async () => {
      setIsLoading(true)
      try {
        await reloadFromApi()
      } finally {
        setIsLoading(false)
      }
    },
    { enabled: canBootstrapCatalog },
  )

  const saveCatalog = useCallback(
    (next: CatalogSettings) => {
      if (useApi) {
        applyCatalog(next)
        return
      }
      applyCatalog(next)
      saveCatalogSettings(next)
    },
    [applyCatalog],
  )

  const resetCatalog = useCallback(() => {
    if (useApi) {
      reloadFromApi().catch((err) => {
        console.error(err)
        toast.error('No se pudo recargar la configuración.')
      })
      return
    }
    const defaults = defaultCatalogSettings()
    applyCatalog(defaults)
    saveCatalogSettings(defaults)
  }, [applyCatalog, reloadFromApi])

  const replaceWarehouse = useCallback(
    (item: WarehouseSetting) => {
      applyCatalog({
        ...catalog,
        warehouses: catalog.warehouses.map((w) => (w.id === item.id ? item : w)),
      })
    },
    [applyCatalog, catalog],
  )

  const replaceCategory = useCallback(
    (item: ProductCategorySetting) => {
      applyCatalog({
        ...catalog,
        productCategories: catalog.productCategories.map((c) =>
          c.id === item.id ? item : c,
        ),
      })
    },
    [applyCatalog, catalog],
  )

  const createWarehouseMutation = useCallback(
    async (name: string) => {
      if (useApi) {
        try {
          const created = await createWarehouseApi({ name })
          applyCatalog({ ...catalog, warehouses: [...catalog.warehouses, created] })
          return created
        } catch (err) {
          throw new Error(parseApiError(err))
        }
      }
      const created = createWarehouse(name)
      const next = [...catalog.warehouses, created]
      if (next.length === 1) created.isDefault = true
      saveCatalog({ ...catalog, warehouses: next })
      return created
    },
    [applyCatalog, catalog, saveCatalog],
  )

  const updateWarehouseMutation = useCallback(
    async (id: string, patch: Partial<WarehouseSetting>) => {
      if (useApi) {
        try {
          const updated = await updateWarehouseApi(id, patch)
          if (patch.isDefault === true) {
            await reloadFromApi()
            return updated
          }
          replaceWarehouse(updated)
          return updated
        } catch (err) {
          throw new Error(parseApiError(err))
        }
      }
      const next = catalog.warehouses.map((w) => (w.id === id ? { ...w, ...patch } : w))
      if (patch.isDefault === true) {
        next.forEach((w) => {
          w.isDefault = w.id === id
        })
      }
      saveCatalog({ ...catalog, warehouses: next })
      return next.find((w) => w.id === id)!
    },
    [catalog, reloadFromApi, replaceWarehouse, saveCatalog],
  )

  const deleteWarehouseMutation = useCallback(
    async (id: string) => {
      if (useApi) {
        try {
          await deleteWarehouseApi(id)
          await reloadFromApi()
        } catch (err) {
          throw new Error(parseApiError(err))
        }
        return
      }
      const target = catalog.warehouses.find((w) => w.id === id)
      if (!target) return
      let next = catalog.warehouses.filter((w) => w.id !== id)
      if (target.isDefault && next[0]) {
        next = next.map((w, i) => ({ ...w, isDefault: i === 0 }))
      }
      saveCatalog({ ...catalog, warehouses: next })
    },
    [catalog, reloadFromApi, saveCatalog],
  )

  const setDefaultWarehouseMutation = useCallback(
    async (id: string) => {
      await updateWarehouseMutation(id, { isDefault: true })
    },
    [updateWarehouseMutation],
  )

  const createCategoryMutation = useCallback(
    async (name: string) => {
      if (useApi) {
        try {
          const created = await createProductCategoryApi({ name })
          applyCatalog({
            ...catalog,
            productCategories: [...catalog.productCategories, created],
          })
          return created
        } catch (err) {
          throw new Error(parseApiError(err))
        }
      }
      const created = createProductCategory(name)
      saveCatalog({
        ...catalog,
        productCategories: [...catalog.productCategories, created],
      })
      return created
    },
    [applyCatalog, catalog, saveCatalog],
  )

  const updateCategoryMutation = useCallback(
    async (id: string, patch: Partial<ProductCategorySetting>) => {
      if (useApi) {
        try {
          const updated = await updateProductCategoryApi(id, patch)
          replaceCategory(updated)
          return updated
        } catch (err) {
          throw new Error(parseApiError(err))
        }
      }
      const next = catalog.productCategories.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      )
      saveCatalog({ ...catalog, productCategories: next })
      return next.find((c) => c.id === id)!
    },
    [catalog, replaceCategory, saveCatalog],
  )

  const deleteCategoryMutation = useCallback(
    async (id: string) => {
      if (useApi) {
        try {
          await deleteProductCategoryApi(id)
          applyCatalog({
            ...catalog,
            productCategories: catalog.productCategories.filter((c) => c.id !== id),
          })
        } catch (err) {
          throw new Error(parseApiError(err))
        }
        return
      }
      saveCatalog({
        ...catalog,
        productCategories: catalog.productCategories.filter((c) => c.id !== id),
      })
    },
    [applyCatalog, catalog, saveCatalog],
  )

  const value = useMemo(
    () => ({
      catalog,
      isLoading,
      saveCatalog,
      resetCatalog,
      reloadCatalog: reloadFromApi,
      createWarehouse: createWarehouseMutation,
      updateWarehouse: updateWarehouseMutation,
      deleteWarehouse: deleteWarehouseMutation,
      setDefaultWarehouse: setDefaultWarehouseMutation,
      createCategory: createCategoryMutation,
      updateCategory: updateCategoryMutation,
      deleteCategory: deleteCategoryMutation,
    }),
    [
      catalog,
      isLoading,
      saveCatalog,
      resetCatalog,
      reloadFromApi,
      createWarehouseMutation,
      updateWarehouseMutation,
      deleteWarehouseMutation,
      setDefaultWarehouseMutation,
      createCategoryMutation,
      updateCategoryMutation,
      deleteCategoryMutation,
    ],
  )

  return (
    <CatalogSettingsContext.Provider value={value}>
      {children}
    </CatalogSettingsContext.Provider>
  )
}
