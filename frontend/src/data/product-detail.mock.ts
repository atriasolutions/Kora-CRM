import type { ContactActivity, ContactNote } from '@/data/contact-detail.mock'
import { mergeEntityNotesForMock } from '@/lib/entity-notes-storage'
import { buildProductActivitiesForDetail } from '@/lib/product-activities'
import { getRegistryProductById } from '@/data/products-registry-store'
import type { ProductListItem } from '@/data/products.mock'
import {
  BILLING_PERIOD_OPTIONS,
  type BillingPeriod,
  type ProductType,
} from '@/lib/product-catalog'
import { loadProductDetailOverride, persistProductDetailOverride } from '@/lib/product-detail-storage'
import {
  computeMarginPercent,
  computeMarkupPercent,
  formatMoneyCLP,
} from '@/lib/product-pricing'

export type ProductDimensions = {
  length: string
  width: string
  height: string
  unit: string
}

export type ProductDetail = ProductListItem & {
  description: string
  shortDescription: string
  brand: string
  internalCode: string
  billingPeriod: BillingPeriod
  taxRate: string
  taxIncluded: boolean
  trackInventory: boolean
  minStock: string
  maxStock: string
  dimensions: ProductDimensions
  weight: string
  weightUnit: string
  requiresRefrigeration: boolean
  shelfLifeDays: string
  storageNotes: string
  licenseTerms: string
  supplierName: string
  supplierSku: string
  publishInIntegration: boolean
  publishPriceInIntegration: boolean
  unitsSold: number
  revenue: string
  marginPercent: number
  markupPercent: number
  tags: string[]
  notes: ContactNote[]
  activities: ContactActivity[]
}

export function resolveProductListItem(
  id: string,
  base?: ProductListItem,
): ProductListItem {
  const fromRegistry = getRegistryProductById(id)
  if (fromRegistry) return { ...fromRegistry, id }
  if (base) return { ...base, id }
  throw new Error(`Producto no encontrado: ${id}`)
}

function defaultDimensionsFor(type: ProductType): ProductDimensions {
  if (type === 'Físico') {
    return { length: '30', width: '20', height: '10', unit: 'cm' }
  }
  return { length: '', width: '', height: '', unit: 'cm' }
}

function formatInventoryThreshold(num: number | undefined, unit: string): string {
  if (num == null || num <= 0) return `0 ${unit}`
  return `${num} ${unit}`
}

export function buildDetailFromList(base: ProductListItem, id: string): ProductDetail {
  const isPhysical = base.productType === 'Físico'
  const isFood = base.category.includes('Cárnic') || base.category.includes('Aliment')
  const isSoftware =
    base.productType === 'Digital' ||
    base.productType === 'Suscripción' ||
    base.category.includes('Software')
  const unit = base.unitOfMeasure?.trim() || 'ud'

  const trackInventory =
    typeof base.trackInventory === 'boolean'
      ? base.trackInventory
      : isPhysical && base.stockNum >= 0

  const savedBillingPeriod = base.billingPeriod
  const hasSavedBillingPeriod =
    !!savedBillingPeriod &&
    BILLING_PERIOD_OPTIONS.includes(savedBillingPeriod as BillingPeriod)

  return {
    ...base,
    owner: base.owner ?? '—',
    description: base.description?.trim() || buildDescription(base),
    shortDescription: `SKU ${base.sku} · ${base.productType} · ${base.category}`,
    brand: base.brand?.trim() || '',
    internalCode: base.sku.replace(/-/g, ''),
    billingPeriod: hasSavedBillingPeriod
      ? (savedBillingPeriod as BillingPeriod)
      : base.unitOfMeasure === 'mes'
        ? 'Mensual'
        : base.unitOfMeasure === 'hora'
          ? 'Por hora'
          : base.unitOfMeasure === 'kg' || base.unitOfMeasure === 'unidad'
            ? 'Por unidad'
            : base.priceNum === 0
              ? 'A medida'
              : 'Único',
    taxRate: '19',
    taxIncluded: true,
    trackInventory,
    minStock: trackInventory
      ? formatInventoryThreshold(base.minStockNum, unit)
      : '—',
    maxStock: trackInventory
      ? formatInventoryThreshold(base.maxStockNum, unit)
      : '—',
    dimensions: defaultDimensionsFor(base.productType),
    weight: isPhysical ? (base.unitOfMeasure === 'kg' ? '1' : '0.5') : '',
    weightUnit: 'kg',
    requiresRefrigeration: isFood,
    shelfLifeDays: isFood ? '5' : '',
    storageNotes: '',
    licenseTerms: isSoftware
      ? 'Licencia por usuario activo.'
      : '',
    supplierName: '',
    supplierSku: isPhysical ? `SUP-${base.sku}` : '',
    publishInIntegration: base.publishInIntegration !== false,
    publishPriceInIntegration:
      base.publishInIntegration !== false && base.publishPriceInIntegration !== false,
    unitsSold: 0,
    revenue: base.priceNum > 0 ? formatMoneyCLP(0) : 'A medida',
    marginPercent: computeMarginPercent(base.costPriceNum, base.priceNum),
    markupPercent: computeMarkupPercent(base.costPriceNum, base.priceNum),
    tags: [base.category, base.productType, base.status].filter(Boolean),
    notes: [],
    activities: buildProductActivitiesForDetail({ ...base, id }),
  }
}

function buildDescription(base: ProductListItem): string {
  const unit = base.customUnit ?? base.unitOfMeasure
  const inv =
    base.stockNum < 0
      ? 'Sin control de inventario en catálogo.'
      : `Stock actual: ${base.stock}.`
  return `${base.name} (${base.sku}) — ${base.productType} en ${base.category}. Venta ${base.price}, costo ${base.costPrice}, unidad: ${unit}. ${inv}`
}

export function getProductDetail(id: string): ProductDetail {
  const base = resolveProductListItem(id)
  const built = buildDetailFromList(base, id)
  const override = loadProductDetailOverride(id)
  if (!override) return built
  const merged = { ...built, ...override, id: built.id }
  merged.marginPercent = computeMarginPercent(merged.costPriceNum, merged.priceNum)
  merged.markupPercent = computeMarkupPercent(merged.costPriceNum, merged.priceNum)
  merged.notes = mergeEntityNotesForMock('producto', id, merged.notes ?? [])
  return merged
}

export function saveProductDetail(detail: ProductDetail) {
  persistProductDetailOverride(detail.id, detail)
}
