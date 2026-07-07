import { buildDetailFromList, type ProductDetail } from '@/data/product-detail.mock'
import { saveProductDetail } from '@/data/product-detail.mock'
import {
  createProductId,
  formValuesToListItem,
  type CreateProductFormValues,
} from '@/lib/product-create'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import type { ProductListItem, ProductStatus } from '@/data/products.mock'
import { PRODUCT_STATUS_OPTIONS } from '@/data/products.mock'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import {
  BILLING_PERIOD_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  UNIT_OF_MEASURE_OPTIONS,
  DIMENSION_UNIT_OPTIONS,
  WEIGHT_UNIT_OPTIONS,
  type BillingPeriod,
  type ProductType,
} from '@/lib/product-catalog'
import {
  PRODUCT_CURRENCIES,
  PRODUCT_CURRENCY_LABELS,
  normalizeProductCurrency,
  type ProductCurrency,
} from '@/lib/currency'
import {
  computeMarginPercent,
  computeMarkupPercent,
  formatMoneyCLP,
} from '@/lib/product-pricing'
import {
  formatProductPriceAmount,
  parseProductPrice,
} from '@/lib/product-currency-input'
import {
  inventoryQuantityInputValue,
  parseStockNum,
} from '@/lib/product-display'
import { syncInventoryFromProduct } from '@/lib/product-inventory-sync'
import { getProductDefaultTaxRateString } from '@/lib/default-vat'

/** IVA por defecto del sistema (Configuración → Impuestos y moneda). */
export function productDefaultTaxRate(): string {
  return getProductDefaultTaxRateString()
}

export type ProductFormValues = {
  name: string
  sku: string
  category: string
  productType: ProductType
  unitOfMeasure: string
  customUnit: string
  price: string
  costPrice: string
  priceCurrency: import('@/lib/currency').ProductCurrency
  stock: string
  status: ProductStatus
  ownerName: string
  imageUrl: string
  barcode: string
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
  length: string
  width: string
  height: string
  dimensionUnit: string
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
}

export {
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  UNIT_OF_MEASURE_OPTIONS,
  DIMENSION_UNIT_OPTIONS,
  WEIGHT_UNIT_OPTIONS,
  BILLING_PERIOD_OPTIONS,
  PRODUCT_CURRENCIES,
  PRODUCT_CURRENCY_LABELS,
}

export function productDetailToFormValues(product: ProductDetail): ProductFormValues {
  return {
    name: product.name,
    sku: product.sku,
    category: product.category,
    productType: product.productType,
    unitOfMeasure: product.unitOfMeasure,
    customUnit: product.customUnit ?? '',
    price: formatProductPriceAmount(
      product.priceNum,
      normalizeProductCurrency(product.priceCurrency),
      { allowEmpty: true },
    ),
    priceCurrency: normalizeProductCurrency(product.priceCurrency),
    costPrice: product.costPrice,
    stock: inventoryQuantityInputValue(product.stock, product.trackInventory),
    status: product.status,
    ownerName: product.owner,
    imageUrl: product.imageUrl ?? '',
    barcode: product.barcode ?? '',
    description: product.description,
    shortDescription: product.shortDescription,
    brand: product.brand,
    internalCode: product.internalCode,
    billingPeriod: product.billingPeriod,
    taxRate: productDefaultTaxRate(),
    taxIncluded: product.taxIncluded,
    trackInventory: product.trackInventory,
    minStock: inventoryQuantityInputValue(product.minStock, product.trackInventory),
    maxStock: inventoryQuantityInputValue(product.maxStock, product.trackInventory),
    length: product.dimensions.length,
    width: product.dimensions.width,
    height: product.dimensions.height,
    dimensionUnit: product.dimensions.unit,
    weight: product.weight,
    weightUnit: product.weightUnit,
    requiresRefrigeration: product.requiresRefrigeration,
    shelfLifeDays: product.shelfLifeDays,
    storageNotes: product.storageNotes,
    licenseTerms: product.licenseTerms,
    supplierName: product.supplierName,
    supplierSku: product.supplierSku,
    publishInIntegration: product.publishInIntegration !== false,
    publishPriceInIntegration: product.publishPriceInIntegration !== false,
  }
}

export function applyFormValuesToProduct(
  product: ProductDetail,
  values: ProductFormValues,
): ProductDetail {
  const priceNum = parseProductPrice(values.price, values.priceCurrency)
  const costPriceNum = product.costPriceNum
  const stockNum = values.trackInventory
    ? product.stockNum >= 0
      ? product.stockNum
      : 0
    : parseStockNum(values.stock)
  const stockDisplay = values.trackInventory
    ? stockNum < 0
      ? '0'
      : String(stockNum)
    : values.stock.trim() || '—'
  const minStockDisplay = values.trackInventory
    ? values.minStock.trim() || '—'
    : values.minStock.trim()
  const maxStockDisplay = values.trackInventory
    ? values.maxStock.trim() || '—'
    : values.maxStock.trim()
  return {
    ...product,
    name: values.name.trim(),
    sku: values.sku.trim(),
    category: values.category.trim(),
    productType: values.productType,
    unitOfMeasure: values.unitOfMeasure,
    customUnit: values.unitOfMeasure === 'otra' ? values.customUnit.trim() : undefined,
    price: values.price.trim(),
    priceNum,
    priceCurrency: values.priceCurrency,
    costPrice: product.costPrice,
    costPriceNum,
    stock: stockDisplay,
    stockNum,
    status: values.status,
    owner: values.ownerName.trim(),
    imageUrl: values.imageUrl.trim() || undefined,
    barcode: values.barcode.trim() || undefined,
    description: values.description.trim(),
    shortDescription: values.shortDescription.trim(),
    brand: values.brand.trim(),
    internalCode: values.internalCode.trim(),
    billingPeriod: values.billingPeriod,
    taxRate: productDefaultTaxRate(),
    taxIncluded: values.taxIncluded,
    trackInventory: values.trackInventory,
    minStock: minStockDisplay,
    maxStock: maxStockDisplay,
    dimensions: {
      length: values.length.trim(),
      width: values.width.trim(),
      height: values.height.trim(),
      unit: values.dimensionUnit,
    },
    weight: values.weight.trim(),
    weightUnit: values.weightUnit,
    requiresRefrigeration: product.requiresRefrigeration,
    shelfLifeDays: product.shelfLifeDays,
    storageNotes: product.storageNotes,
    licenseTerms: values.licenseTerms.trim(),
    supplierName: product.supplierName,
    supplierSku: product.supplierSku,
    publishInIntegration: values.publishInIntegration,
    publishPriceInIntegration: values.publishInIntegration
      ? values.publishPriceInIntegration
      : false,
    marginPercent: computeMarginPercent(costPriceNum, priceNum),
    markupPercent: computeMarkupPercent(costPriceNum, priceNum),
    revenue:
      priceNum > 0
        ? formatMoneyCLP(priceNum * product.unitsSold)
        : product.revenue,
  }
}

export function listItemFromProductDetail(product: ProductDetail): ProductListItem {
  const {
    description: _d,
    shortDescription: _sd,
    brand: _b,
    internalCode: _ic,
    billingPeriod: _bp,
    taxRate: _tr,
    taxIncluded: _ti,
    trackInventory: _track,
    minStock: _min,
    maxStock: _max,
    dimensions: _dim,
    weight: _w,
    weightUnit: _wu,
    requiresRefrigeration: _rr,
    shelfLifeDays: _sl,
    storageNotes: _sn,
    licenseTerms: _lt,
    supplierName: _sup,
    supplierSku: _ss,
    unitsSold: _us,
    revenue: _r,
    marginPercent: _mp,
    markupPercent: _mu,
    tags: _t,
    notes: _n,
    createdAt: _c,
    updatedAt: _u,
    ...list
  } = product
  return stampRecordAuditOnUpdate(list)
}

export function productFormValuesToCreateSlice(
  values: ProductFormValues,
): CreateProductFormValues {
  return {
    name: values.name,
    sku: values.sku,
    category: values.category,
    productType: values.productType,
    unitOfMeasure: values.unitOfMeasure,
    customUnit: values.customUnit,
    price: values.price,
    priceCurrency: values.priceCurrency,
    costPrice: '—',
    stock: values.trackInventory ? '0' : values.stock.trim() || '—',
    status: values.status,
    ownerName: values.ownerName,
    imageUrl: values.imageUrl,
    barcode: values.barcode,
  }
}

export function productDetailFromListAndForm(
  item: ProductListItem,
  values: ProductFormValues,
): ProductDetail {
  return applyFormValuesToProduct(buildDetailFromList(item, item.id), values)
}

/** Crea ítem de lista + ficha de detalle (inventario incluido) y persiste override. */
export function persistNewProductFromForm(
  values: ProductFormValues,
  id = createProductId(),
): { item: ProductListItem; detail: ProductDetail } {
  const listItem = formValuesToListItem(productFormValuesToCreateSlice(values), id)
  const detail = productDetailFromListAndForm(listItem, values)
  saveProductDetail(detail)
  syncInventoryFromProduct(detail)
  return { item: listItemFromProductDetail(detail), detail }
}
