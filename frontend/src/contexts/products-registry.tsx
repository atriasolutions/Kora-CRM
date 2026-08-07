import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  archiveProductApi,
  createProductApi,
  deleteProductApi,
  listProductsApi,
  productDetailToApiBody,
  productFormToApiBody,
  restoreProductApi,
  updateProductApi,
} from '@/api/products'
import {
  ProductsRegistryContext,
  type ArchivedProductEntry,
} from '@/contexts/products-registry-context'
import { getRegistryProductById, syncRegistryProducts } from '@/data/products-registry-store'
import type { ProductDetail } from '@/data/product-detail.mock'
import type { ProductListItem } from '@/data/products.mock'
import {
  formValuesToListItem,
  type CreateProductFormValues,
} from '@/lib/product-create'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import {
  listItemFromProductDetail,
  persistNewProductFromForm,
  type ProductFormValues,
} from '@/lib/product-form'
import {
  INVENTORY_REGISTRY_SYNC_EVENT,
  removeInventoryForProduct,
  syncInventoryFromProduct,
} from '@/lib/product-inventory-sync'
import {
  type ArchivedProductStore,
  archivedProductIds,
  purgeExpiredFromStore,
} from '@/lib/product-archive'
import { purgeProductLocalData } from '@/lib/product-permanent-delete'
import { assertProductSkuAvailable } from '@/lib/product-sku-uniqueness'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
const useApi = isApiEnabled()

function snapshotForArchive(
  id: string,
  userProducts: ProductListItem[],
): ProductListItem {
  const fromUser = userProducts.find((o) => o.id === id)
  if (fromUser) return stampRecordAuditOnUpdate({ ...fromUser })
  const fromRegistry = getRegistryProductById(id)
  if (fromRegistry) return stampRecordAuditOnUpdate({ ...fromRegistry, id })
  return stampRecordAuditOnUpdate({ id, name: id, sku: '—' } as ProductListItem)
}

function entriesFromStore(
  store: ArchivedProductStore,
  userProducts: ProductListItem[],
): ArchivedProductEntry[] {
  return Object.values(store)
    .map((record) => ({
      ...record,
      product: record.snapshot ?? snapshotForArchive(record.id, userProducts),
    }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}

export function ProductsRegistryProvider({ children }: { children: ReactNode }) {
  const [userProducts, setUserProducts] = useState<ProductListItem[]>([])
  const [archiveStore, setArchiveStore] = useState<ArchivedProductStore>({})

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listProductsApi(false, { groupVariants: false }),
      listProductsApi(true, { groupVariants: false }),
    ])
    syncRegistryProducts(active)
    setUserProducts(active)
    setArchiveStore(archivedStoreFromList(archived))
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { enabled: false })

  useEffect(() => {
    const onInventorySync = () => {
      if (useApi) {
        reloadFromApi().catch(console.error)
        return
      }
      setUserProducts((prev) => enrichProductListStock(prev))
    }
    window.addEventListener(INVENTORY_REGISTRY_SYNC_EVENT, onInventorySync)
    return () => window.removeEventListener(INVENTORY_REGISTRY_SYNC_EVENT, onInventorySync)
  }, [reloadFromApi])

  const archivedIds = useMemo(() => archivedProductIds(archiveStore), [archiveStore])

  const save = useCallback((next: ProductListItem[]) => {
    syncRegistryProducts(next)
    setUserProducts(next)
  }, [])

  const persistArchive = useCallback((store: ArchivedProductStore) => {
    setArchiveStore(store)
  }, [])

  const findById = useCallback(
    (id: string) => userProducts.find((o) => o.id === id),
    [userProducts],
  )

  const notifyInventoryRegistry = useCallback(() => {
    window.dispatchEvent(new CustomEvent(INVENTORY_REGISTRY_SYNC_EVENT))
  }, [])

  const addProduct = useCallback(
    async (values: ProductFormValues) => {
      assertProductSkuAvailable(values.sku, userProducts)
      if (useApi) {
        const item = await createProductApi(productFormToApiBody(values))
        save([item, ...userProducts])
        notifyInventoryRegistry()
        return item
      }
      const { item } = persistNewProductFromForm(values)
      save([item, ...userProducts])
      return item
    },
    [notifyInventoryRegistry, save, userProducts],
  )

  const addProducts = useCallback(
    async (valuesList: CreateProductFormValues[]): Promise<ProductListItem[]> => {
      const seen = new Set<string>()
      for (const values of valuesList) {
        const key = values.sku.trim().toLowerCase()
        if (seen.has(key)) {
          throw new Error(`El SKU «${values.sku.trim()}» está repetido en la importación.`)
        }
        seen.add(key)
        assertProductSkuAvailable(values.sku, userProducts)
      }
      if (useApi) {
        const items = await Promise.all(
          valuesList.map((v) => createProductApi(productFormToApiBody(v))),
        )
        save([...items, ...userProducts])
        notifyInventoryRegistry()
        return items
      }
      const items: ProductListItem[] = []
      for (const v of valuesList) {
        assertProductSkuAvailable(v.sku, [...userProducts, ...items])
        items.push(formValuesToListItem(v))
      }
      save([...items, ...userProducts])
      return items
    },
    [notifyInventoryRegistry, save, userProducts],
  )

  const isArchived = useCallback(
    (id: string) => archivedIds.has(id),
    [archivedIds],
  )

  const updateProductFromDetail = useCallback(
    async (
      detail: ProductDetail,
      options?: { previousSku?: string },
    ): Promise<ProductListItem | void> => {
      const existing = userProducts.find((p) => p.id === detail.id)
      const prevSku = options?.previousSku ?? existing?.sku ?? detail.sku
      if (detail.sku.trim().toLowerCase() !== prevSku.trim().toLowerCase()) {
        assertProductSkuAvailable(detail.sku, userProducts, detail.id)
      }
      if (useApi) {
        const saved = await updateProductApi(detail.id, productDetailToApiBody(detail))
        save(userProducts.map((p) => (p.id === detail.id ? saved : p)))
        notifyInventoryRegistry()
        return saved
      }
      const list = listItemFromProductDetail(detail)
      const { saveProductDetail } = await import('@/data/product-detail.mock')
      saveProductDetail(detail)
      const wasTracking = existing?.trackInventory ?? false
      if (!detail.trackInventory && wasTracking) {
        removeInventoryForProduct(prevSku)
      } else {
        syncInventoryFromProduct(detail, options)
      }
      if (userProducts.some((p) => p.id === detail.id)) {
        save(userProducts.map((p) => (p.id === detail.id ? list : p)))
      }
      return list
    },
    [notifyInventoryRegistry, save, userProducts],
  )

  const updateProduct = useCallback(
    (item: ProductListItem) => {
      const idx = userProducts.findIndex((p) => p.id === item.id)
      if (idx >= 0) {
        const next = [...userProducts]
        next[idx] = item
        save(next)
        return
      }
      save([item, ...userProducts])
    },
    [save, userProducts],
  )

  const archiveProduct = useCallback(
    async (id: string) => {
      if (archivedIds.has(id)) return
      if (useApi) {
        const snapshot = await archiveProductApi(id)
        persistArchive({
          ...archiveStore,
          [id]: { id, archivedAt: Date.now(), snapshot },
        })
        save(userProducts.filter((o) => o.id !== id))
        return
      }
      const next: ArchivedProductStore = {
        ...archiveStore,
        [id]: { id, archivedAt: Date.now(), snapshot: snapshotForArchive(id, userProducts) },
      }
      persistArchive(next)
      save(userProducts.filter((o) => o.id !== id))
    },
    [archiveStore, archivedIds, persistArchive, save, userProducts],
  )

  const archiveProducts = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      for (const id of unique) {
        await archiveProduct(id)
      }
    },
    [archiveProduct],
  )

  const restoreProduct = useCallback(
    async (id: string) => {
      const record = archiveStore[id]
      if (!record) return
      if (useApi) {
        const item = await restoreProductApi(id)
        const next = { ...archiveStore }
        delete next[id]
        persistArchive(next)
        if (!userProducts.some((o) => o.id === id)) save([item, ...userProducts])
        return
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      const item = stampRecordAuditOnUpdate(
        record.snapshot ?? snapshotForArchive(id, userProducts),
      )
      if (!userProducts.some((o) => o.id === id)) save([item, ...userProducts])
    },
    [archiveStore, persistArchive, save, userProducts],
  )

  const restoreProducts = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      for (const id of unique) {
        await restoreProduct(id)
      }
    },
    [restoreProduct],
  )

  const permanentlyDeleteProduct = useCallback(
    async (id: string) => {
      if (!archiveStore[id]) return
      if (useApi) {
        await deleteProductApi(id)
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      save(userProducts.filter((o) => o.id !== id))
      purgeProductLocalData(id)
    },
    [archiveStore, persistArchive, save, userProducts],
  )

  const permanentlyDeleteProducts = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        await Promise.all(unique.map((id) => deleteProductApi(id)))
      }
      const nextStore = { ...archiveStore }
      const idSet = new Set(unique)
      for (const id of unique) {
        if (nextStore[id]) {
          delete nextStore[id]
          purgeProductLocalData(id)
        }
      }
      persistArchive(nextStore)
      save(userProducts.filter((o) => !idSet.has(o.id)))
    },
    [archiveStore, persistArchive, save, userProducts],
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      const { store, purgedIds } = purgeExpiredFromStore(archiveStore)
      if (purgedIds.length === 0) return
      setArchiveStore(store)
      purgedIds.forEach((id) => purgeProductLocalData(id))
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [archiveStore])

  const allProducts = useMemo(
    () =>
      userProducts.filter(
        (o) => !archivedIds.has(o.id),
      ),
    [userProducts, archivedIds],
  )

  const archivedProducts = useMemo(
    () => entriesFromStore(archiveStore, userProducts),
    [archiveStore, userProducts],
  )

  const value = useMemo(
    () => ({
      userProducts,
      allProducts,
      archivedProducts,
      findById,
      addProduct,
      addProducts,
      updateProductFromDetail,
      updateProduct,
      archiveProduct,
      archiveProducts,
      restoreProduct,
      restoreProducts,
      permanentlyDeleteProduct,
      permanentlyDeleteProducts,
      isArchived,
      reloadFromApi,
    }),
    [
      userProducts,
      allProducts,
      archivedProducts,
      findById,
      addProduct,
      addProducts,
      updateProductFromDetail,
      updateProduct,
      archiveProduct,
      archiveProducts,
      restoreProduct,
      restoreProducts,
      permanentlyDeleteProduct,
      permanentlyDeleteProducts,
      isArchived,
      reloadFromApi,
    ],
  )

  return (
    <ProductsRegistryContext.Provider value={value}>
      {children}
    </ProductsRegistryContext.Provider>
  )
}
