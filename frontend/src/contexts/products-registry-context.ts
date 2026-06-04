import { createContext } from 'react'

import type { ProductDetail } from '@/data/product-detail.mock'
import type { ProductListItem } from '@/data/products.mock'
import type { CreateProductFormValues } from '@/lib/product-create'
import type { ProductFormValues } from '@/lib/product-form'
import type { ArchivedProductRecord } from '@/lib/product-archive'

export type ArchivedProductEntry = ArchivedProductRecord & {
  product: ProductListItem
}

export type ProductsRegistryContextValue = {
  userProducts: ProductListItem[]
  allProducts: ProductListItem[]
  archivedProducts: ArchivedProductEntry[]
  findById: (id: string) => ProductListItem | undefined
  addProduct: (values: ProductFormValues) => Promise<ProductListItem>
  addProducts: (values: CreateProductFormValues[]) => Promise<ProductListItem[]>
  updateProduct: (item: ProductListItem) => void
  updateProductFromDetail: (
    detail: ProductDetail,
    options?: { previousSku?: string },
  ) => Promise<void>
  archiveProduct: (id: string) => Promise<void>
  archiveProducts: (ids: string[]) => Promise<void>
  restoreProduct: (id: string) => Promise<void>
  restoreProducts: (ids: string[]) => Promise<void>
  permanentlyDeleteProduct: (id: string) => Promise<void>
  permanentlyDeleteProducts: (ids: string[]) => Promise<void>
  isArchived: (id: string) => boolean
  reloadFromApi: () => Promise<void>
}

export const ProductsRegistryContext =
  createContext<ProductsRegistryContextValue | null>(null)
