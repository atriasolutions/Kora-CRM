import { resolveIntegrationProductImageForResponse } from '../lib/integration-catalog-image.js'
import { runWithTenantAsync } from '../lib/tenant-context.js'
import { mapProductRow } from '../mappers/product.mapper.js'
import type { ResolvedIntegrationApiKey } from '../repositories/integration-api-keys.repository.js'
import * as categoriesRepo from '../repositories/product-categories.repository.js'
import * as productsRepo from '../repositories/products.repository.js'
import { notFound } from '../middleware/errors.js'
import type { ProductListItem } from '../types/product.js'
import type { ProductCategory } from '../types/settings.js'

export type IntegrationCatalogCategory = {
  id: string
  name: string
  active: boolean
}

export type IntegrationCatalogProduct = {
  id: string
  name: string
  sku: string
  categoryId: string
  categoryName: string
  productType: string
  unitOfMeasure: string
  billingPeriod?: string
  price: string
  priceNum: number
  priceCurrency: ProductListItem['priceCurrency']
  status: ProductListItem['status']
  stockNum: number | null
  imageUrl?: string
  barcode?: string
}

export type IntegrationCatalogCategoriesResult = {
  tenantId: string
  tenantSlug: string
  categories: IntegrationCatalogCategory[]
}

export type IntegrationCatalogProductsResult = {
  tenantId: string
  tenantSlug: string
  category: IntegrationCatalogCategory
  products: IntegrationCatalogProduct[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type IntegrationCatalogCategoryWithProducts = IntegrationCatalogCategory & {
  products: IntegrationCatalogProduct[]
  productCount: number
}

export type IntegrationCatalogSnapshotResult = {
  tenantId: string
  tenantSlug: string
  generatedAt: string
  includeImages: boolean
  categories: IntegrationCatalogCategoryWithProducts[]
  meta: {
    categoryCount: number
    productCount: number
  }
}

function mapCategory(category: ProductCategory): IntegrationCatalogCategory {
  return {
    id: category.id,
    name: category.name,
    active: category.active,
  }
}

function mapProduct(
  product: ProductListItem,
  categoryId: string,
  storedImageUrl: string | null | undefined,
  includeImages = false,
): IntegrationCatalogProduct {
  const mapped: IntegrationCatalogProduct = {
    id: product.id,
    name: product.name,
    sku: product.sku,
    categoryId,
    categoryName: product.category,
    productType: product.productType,
    unitOfMeasure: product.unitOfMeasure,
    billingPeriod: product.billingPeriod,
    price: product.price,
    priceNum: product.priceNum,
    priceCurrency: product.priceCurrency,
    status: product.status,
    stockNum: product.stockNum >= 0 ? product.stockNum : null,
    barcode: product.barcode,
  }
  const imageUrl = resolveIntegrationProductImageForResponse(
    product.id,
    storedImageUrl,
    includeImages,
  )
  if (imageUrl) mapped.imageUrl = imageUrl
  return mapped
}

async function listAllProductRowsForCategory(
  categoryId: string,
  status: ProductListItem['status'],
): Promise<Awaited<ReturnType<typeof productsRepo.listProductRows>>['items']> {
  const pageSize = 100
  const items: Awaited<ReturnType<typeof productsRepo.listProductRows>>['items'] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const result = await productsRepo.listProductRows({
      page,
      pageSize,
      categoryId,
      status,
      archivedOnly: false,
    })
    items.push(...result.items)
    totalPages = Math.ceil(result.total / pageSize) || 1
    page += 1
  }

  return items
}

export async function getIntegrationCatalogProductImage(
  apiKey: ResolvedIntegrationApiKey,
  productId: string,
): Promise<string | null> {
  return runWithTenantAsync(
    { tenantId: apiKey.tenantId, tenantSlug: apiKey.tenantSlug },
    async () => {
      const stored = await productsRepo.getProductStoredImageUrl(productId)
      if (!stored) throw notFound('Imagen de producto no encontrada')
      return stored
    },
  )
}

export async function listIntegrationCatalogCategories(
  apiKey: ResolvedIntegrationApiKey,
  options: { activeOnly?: boolean } = {},
): Promise<IntegrationCatalogCategoriesResult> {
  const activeOnly = options.activeOnly !== false

  return runWithTenantAsync(
    { tenantId: apiKey.tenantId, tenantSlug: apiKey.tenantSlug },
    async () => {
      const categories = await categoriesRepo.listProductCategories()
      const filtered = activeOnly
        ? categories.filter((category) => category.active)
        : categories

      return {
        tenantId: apiKey.tenantId,
        tenantSlug: apiKey.tenantSlug,
        categories: filtered.map(mapCategory),
      }
    },
  )
}

export async function listIntegrationCatalogProductsByCategory(
  apiKey: ResolvedIntegrationApiKey,
  categoryId: string,
  options: {
    page?: number
    pageSize?: number
    status?: ProductListItem['status']
    q?: string
    includeImages?: boolean
  } = {},
): Promise<IntegrationCatalogProductsResult> {
  const page = options.page ?? 1
  const pageSize = options.pageSize ?? 50
  const status = options.status ?? 'Activo'
  const includeImages = options.includeImages === true

  return runWithTenantAsync(
    { tenantId: apiKey.tenantId, tenantSlug: apiKey.tenantSlug },
    async () => {
      const category = await categoriesRepo.getProductCategoryById(categoryId)
      const result = await productsRepo.listProductRows({
        page,
        pageSize,
        categoryId,
        status,
        q: options.q,
        archivedOnly: false,
      })

      return {
        tenantId: apiKey.tenantId,
        tenantSlug: apiKey.tenantSlug,
        category: mapCategory(category),
        products: result.items.map((row) =>
          mapProduct(mapProductRow(row), category.id, row.image_url, includeImages),
        ),
        meta: {
          page,
          pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / pageSize) || 1,
        },
      }
    },
  )
}

/** Una sola llamada: todas las categorías con sus productos (y opcionalmente imágenes embebidas). */
export async function getIntegrationCatalogSnapshot(
  apiKey: ResolvedIntegrationApiKey,
  options: {
    activeOnly?: boolean
    status?: ProductListItem['status']
    includeImages?: boolean
  } = {},
): Promise<IntegrationCatalogSnapshotResult> {
  const activeOnly = options.activeOnly !== false
  const status = options.status ?? 'Activo'
  const includeImages = options.includeImages === true

  return runWithTenantAsync(
    { tenantId: apiKey.tenantId, tenantSlug: apiKey.tenantSlug },
    async () => {
      const categories = await categoriesRepo.listProductCategories()
      const filtered = activeOnly
        ? categories.filter((category) => category.active)
        : categories

      const categoriesWithProducts: IntegrationCatalogCategoryWithProducts[] = []
      let productCount = 0

      for (const category of filtered) {
        const rows = await listAllProductRowsForCategory(category.id, status)
        const products = rows.map((row) =>
          mapProduct(mapProductRow(row), category.id, row.image_url, includeImages),
        )
        productCount += products.length
        categoriesWithProducts.push({
          ...mapCategory(category),
          products,
          productCount: products.length,
        })
      }

      return {
        tenantId: apiKey.tenantId,
        tenantSlug: apiKey.tenantSlug,
        generatedAt: new Date().toISOString(),
        includeImages,
        categories: categoriesWithProducts,
        meta: {
          categoryCount: categoriesWithProducts.length,
          productCount,
        },
      }
    },
  )
}
