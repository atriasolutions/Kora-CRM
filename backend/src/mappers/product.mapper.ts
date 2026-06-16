import type { ProductListItem } from '../types/product.js'
import { formatProductPriceLabel } from '../lib/product-price-display.js'
import { imageUrlForList } from '../utils/entity-image.js'
import { normalizeProductCurrency } from '../types/currency.js'
import { formatForeignAmount } from './currency.mapper.js'
import { toIsoString } from '../utils/format.js'

export type ProductRow = {
  id: string
  name: string
  sku: string
  category_name: string | null
  product_type: string | null
  unit_of_measure: string | null
  billing_period: string | null
  price_cents: string | number
  price_currency: string | null
  price_amount: string | number | null
  cost_price_cents: string | number | null
  stock_qty: number | null
  status: ProductListItem['status']
  track_inventory: boolean
  min_stock: number | null
  max_stock: number | null
  barcode: string | null
  image_url: string | null
  created_at: Date
  created_by_id: string | null
  created_by_name: string | null
  owner_name: string | null
  updated_at: Date
  updated_by_id: string | null
  updated_by_name: string | null
}

function centsToNum(cents: string | number | null | undefined): number {
  if (cents == null) return 0
  return Math.round(Number(cents) / 100)
}

function formatClp(cents: string | number | null | undefined): string {
  const n = centsToNum(cents)
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatStock(
  stockQty: number | null,
  trackInventory: boolean,
  unit: string | null,
): { stock: string; stockNum: number } {
  if (!trackInventory || stockQty == null) {
    return { stock: '—', stockNum: -1 }
  }
  const u = unit?.trim() || 'ud'
  return { stock: `${stockQty} ${u}`, stockNum: stockQty }
}

export function mapProductRow(row: ProductRow): ProductListItem {
  const { stock, stockNum } = formatStock(
    row.stock_qty,
    row.track_inventory,
    row.unit_of_measure,
  )
  const priceCurrency = normalizeProductCurrency(row.price_currency)
  const priceNum =
    row.price_amount != null
      ? Number(row.price_amount)
      : centsToNum(row.price_cents)
  const costPriceNum = centsToNum(row.cost_price_cents)
  const unit = row.unit_of_measure?.trim() || 'ud'
  const billingPeriod = row.billing_period?.trim() || undefined
  const priceLabel =
    priceCurrency === 'CLP'
      ? formatClp(row.price_cents)
      : formatForeignAmount(priceNum, priceCurrency)
  const showPriceSuffix = !row.track_inventory || stockNum < 0

  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category_name ?? 'Sin categoría',
    productType: row.product_type ?? 'Producto',
    unitOfMeasure: unit,
    billingPeriod,
    price: formatProductPriceLabel({
      priceLabel,
      unitOfMeasure: unit,
      billingPeriod,
      includeSuffix: showPriceSuffix,
    }),
    priceNum,
    priceCurrency,
    costPrice: row.cost_price_cents != null ? formatClp(row.cost_price_cents) : '—',
    costPriceNum,
    stock,
    stockNum,
    status: row.status,
    trackInventory: row.track_inventory,
    minStockNum: row.min_stock ?? 0,
    maxStockNum: row.max_stock ?? 0,
    owner: row.owner_name?.trim() || row.created_by_name?.trim() || '—',
    imageUrl: imageUrlForList(row.image_url),
    barcode: row.barcode ?? undefined,
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name ?? '',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name ?? '',
  }
}

/** Ficha individual: incluye imagen embebida (data URL) si existe. */
export function mapProductDetail(row: ProductRow): ProductListItem {
  return {
    ...mapProductRow(row),
    imageUrl: row.image_url?.trim() || undefined,
  }
}
