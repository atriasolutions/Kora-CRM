import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { ProductDetail } from '@/data/product-detail.mock'
import { buildDetailFromList } from '@/data/product-detail.mock'
import type { ProductListItem } from '@/data/products.mock'
import type { CreateProductFormValues } from '@/lib/product-create'
import { parseStockNum } from '@/lib/product-display'
import type { ProductFormValues } from '@/lib/product-form'
import { parseProductPrice } from '@/lib/product-currency-input'
import { parseMoneyNum } from '@/lib/product-pricing'

const BASE = `${API_V1}/products`

export type ProductApiBody = {
  name: string
  sku: string
  ownerName?: string
  category?: string
  productType?: string
  unitOfMeasure?: string
  billingPeriod?: string
  priceNum?: number
  priceCurrency?: string
  costPriceNum?: number
  stockNum?: number
  status?: string
  imageUrl?: string
  barcode?: string
  description?: string
  brand?: string
  publishInIntegration?: boolean
  publishPriceInIntegration?: boolean
  trackInventory?: boolean
  minStock?: number
  maxStock?: number
}

function unitFromForm(values: { unitOfMeasure: string; customUnit?: string }): string {
  if (values.unitOfMeasure === 'otra') return values.customUnit?.trim() || 'ud'
  return values.unitOfMeasure.trim() || 'ud'
}

export function productFormToApiBody(
  values: CreateProductFormValues | ProductFormValues,
): ProductApiBody {
  const stockNum = parseStockNum(values.stock)
  const trackInventory =
    'trackInventory' in values && typeof values.trackInventory === 'boolean'
      ? values.trackInventory
      : stockNum >= 0
  const minStockNum =
    'minStock' in values ? parseStockNum(values.minStock) : 0
  const maxStockNum =
    'maxStock' in values ? parseStockNum(values.maxStock) : 0

  return {
    name: values.name.trim(),
    sku: values.sku.trim(),
    ownerName: values.ownerName?.trim(),
    category: values.category?.trim(),
    productType: values.productType,
    unitOfMeasure: unitFromForm(values),
    billingPeriod: 'billingPeriod' in values ? values.billingPeriod : undefined,
    priceNum: parseProductPrice(values.price, 'priceCurrency' in values ? values.priceCurrency : 'CLP'),
    priceCurrency: 'priceCurrency' in values ? values.priceCurrency : 'CLP',
    costPriceNum: values.costPrice?.trim() ? parseMoneyNum(values.costPrice) : undefined,
    stockNum: trackInventory ? (stockNum >= 0 ? stockNum : 0) : undefined,
    status: values.status,
    imageUrl: values.imageUrl?.trim() || undefined,
    barcode: values.barcode?.trim() || undefined,
    description: 'description' in values ? values.description?.trim() || undefined : undefined,
    brand: 'brand' in values ? values.brand?.trim() || undefined : undefined,
    publishInIntegration:
      'publishInIntegration' in values ? values.publishInIntegration : undefined,
    publishPriceInIntegration:
      'publishPriceInIntegration' in values
        ? values.publishInIntegration
          ? values.publishPriceInIntegration
          : false
        : undefined,
    trackInventory,
    minStock: trackInventory && minStockNum >= 0 ? minStockNum : undefined,
    maxStock: trackInventory && maxStockNum >= 0 ? maxStockNum : undefined,
  }
}

function stockFieldToApiNum(value: string | undefined): number | undefined {
  if (!value?.trim() || value.trim() === '—') return undefined
  const n = parseStockNum(value)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function productDetailToApiBody(detail: ProductDetail): ProductApiBody {
  const minStock = stockFieldToApiNum(detail.minStock)
  const maxStock = stockFieldToApiNum(detail.maxStock)

  return {
    name: detail.name,
    sku: detail.sku,
    ownerName: detail.owner?.trim() || undefined,
    category: detail.category,
    productType: detail.productType,
    unitOfMeasure: detail.unitOfMeasure,
    billingPeriod: detail.billingPeriod,
    priceNum: detail.priceNum,
    priceCurrency: detail.priceCurrency ?? 'CLP',
    costPriceNum: detail.costPriceNum > 0 ? detail.costPriceNum : undefined,
    stockNum: detail.stockNum >= 0 ? detail.stockNum : undefined,
    status: detail.status,
    imageUrl: detail.imageUrl?.trim() || undefined,
    barcode: detail.barcode,
    description: detail.description?.trim() || undefined,
    brand: detail.brand?.trim() || undefined,
    publishInIntegration: detail.publishInIntegration,
    publishPriceInIntegration: detail.publishInIntegration
      ? detail.publishPriceInIntegration
      : false,
    trackInventory: detail.trackInventory,
    minStock: detail.trackInventory ? (minStock ?? 0) : undefined,
    maxStock: detail.trackInventory ? (maxStock ?? 0) : undefined,
  }
}

export function mergeProductDetailFromListItem(
  detail: ProductDetail,
  saved: ProductListItem,
): ProductDetail {
  const refreshed = buildDetailFromList(saved, detail.id)
  return {
    ...detail,
    ...saved,
    description: saved.description?.trim() || detail.description,
    brand: saved.brand?.trim() || detail.brand,
    publishInIntegration: saved.publishInIntegration !== false,
    publishPriceInIntegration: saved.publishPriceInIntegration !== false,
    trackInventory: refreshed.trackInventory,
    minStock: refreshed.minStock,
    maxStock: refreshed.maxStock,
    stock: saved.stock,
    stockNum: saved.stockNum,
  }
}

export async function listProductsApi(archived: boolean): Promise<ProductListItem[]> {
  return fetchAllPages<ProductListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
}

export async function getProductApi(id: string): Promise<ProductListItem> {
  const res = await fetchJSON<ApiItemResponse<ProductListItem>>(`${BASE}/${id}`)
  return res.data
}

export async function createProductApi(body: ProductApiBody): Promise<ProductListItem> {
  const res = await fetchJSON<ApiItemResponse<ProductListItem>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateProductApi(
  id: string,
  body: Partial<ProductApiBody>,
): Promise<ProductListItem> {
  const res = await fetchJSON<ApiItemResponse<ProductListItem>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function archiveProductApi(id: string): Promise<ProductListItem> {
  const res = await fetchJSON<ApiItemResponse<ProductListItem>>(`${BASE}/${id}/archive`, {
    method: 'POST',
  })
  return res.data
}

export async function restoreProductApi(id: string): Promise<ProductListItem> {
  const res = await fetchJSON<ApiItemResponse<ProductListItem>>(`${BASE}/${id}/restore`, {
    method: 'POST',
  })
  return res.data
}

export async function deleteProductApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}

export type ProductInvoiceSalesTotalApiRow = {
  productId: string | null
  sku: string
  productName: string
  totalQuantity: number
}

export async function fetchProductInvoiceSalesTotalsApi(): Promise<
  ProductInvoiceSalesTotalApiRow[]
> {
  const res = await fetchJSON<{ data: ProductInvoiceSalesTotalApiRow[] }>(
    `${BASE}/invoice-sales-totals`,
  )
  return res.data
}
