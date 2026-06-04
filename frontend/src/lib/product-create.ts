import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import type { ProductListItem, ProductStatus } from '@/data/products.mock'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import type { ProductType } from '@/lib/product-catalog'
import { parseStockNum } from '@/lib/product-display'
import { parseProductPrice } from '@/lib/product-currency-input'
import { parseMoneyNum } from '@/lib/product-pricing'
import { normalizeProductCurrency } from '@/lib/currency'

export type CreateProductFormValues = {
  name: string
  sku: string
  category: string
  productType: ProductType
  unitOfMeasure: string
  customUnit: string
  price: string
  costPrice: string
  stock: string
  status: ProductStatus
  ownerName: string
  imageUrl: string
  barcode: string
}

export function createDefaultProductFormValues(
  partial?: Partial<CreateProductFormValues>,
): CreateProductFormValues {
  return {
    name: '',
    sku: '',
    category: 'General',
    productType: 'Físico',
    unitOfMeasure: 'unidad',
    customUnit: '',
    price: '',
    costPrice: '',
    stock: '—',
    status: 'Activo',
    ownerName: getDefaultOwnerName(),
    imageUrl: '',
    barcode: '',
    ...partial,
  }
}

export function duplicateProductFormValues(
  source: ProductListItem,
): CreateProductFormValues {
  return {
    name: `${source.name.replace(/ \(copia\)$/i, '')} (copia)`,
    sku: `${source.sku}-COPY`,
    category: source.category,
    productType: source.productType,
    unitOfMeasure: source.unitOfMeasure,
    customUnit: source.customUnit ?? '',
    price: source.price,
    costPrice: source.costPrice,
    stock: source.stock,
    status: source.status === 'Agotado' ? 'Borrador' : source.status,
    ownerName: source.owner,
    imageUrl: source.imageUrl ?? '',
    barcode: source.barcode ?? '',
  }
}

export function validateCreateProductForm(values: CreateProductFormValues): string | null {
  if (!values.name.trim()) return 'El nombre del producto es obligatorio.'
  if (!values.sku.trim()) return 'El SKU es obligatorio.'
  if (!values.price.trim()) return 'El precio de venta es obligatorio.'
  if (!values.ownerName.trim()) return 'El responsable del producto es obligatorio.'
  if (values.unitOfMeasure === 'otra' && !values.customUnit.trim()) {
    return 'Indica la unidad de medida personalizada.'
  }
  return null
}

export function createProductId(): string {
  return `product-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function formValuesToListItem(
  values: CreateProductFormValues,
  id = createProductId(),
): ProductListItem {
  const priceNum = parseProductPrice(values.price, 'CLP')
  const costPriceNum = parseMoneyNum(values.costPrice)
  const stockNum = parseStockNum(values.stock)
  return stampRecordAuditOnCreate({
    id,
    name: values.name.trim(),
    sku: values.sku.trim(),
    category: values.category.trim(),
    productType: values.productType,
    unitOfMeasure: values.unitOfMeasure,
    customUnit: values.unitOfMeasure === 'otra' ? values.customUnit.trim() : undefined,
    price: values.price.trim(),
    priceNum,
    priceCurrency: 'CLP',
    costPrice: values.costPrice.trim() || '—',
    costPriceNum,
    stock: values.stock.trim() || '—',
    stockNum,
    status: values.status,
    owner: values.ownerName.trim(),
    imageUrl: values.imageUrl.trim() || undefined,
    barcode: values.barcode.trim() || undefined,
  })
}

const PRODUCT_CSV_HEADERS: Record<string, keyof CreateProductFormValues | 'stock_inicial'> = {
  nombre: 'name',
  name: 'name',
  sku: 'sku',
  categoria: 'category',
  category: 'category',
  tipo: 'productType',
  type: 'productType',
  unidad: 'unitOfMeasure',
  unit: 'unitOfMeasure',
  precio: 'price',
  price: 'price',
  costo: 'costPrice',
  cost: 'costPrice',
  stock_inicial: 'stock_inicial',
  stock: 'stock_inicial',
  responsable: 'ownerName',
  owner: 'ownerName',
}

export type ProductCsvParseResult = {
  rows: CreateProductFormValues[]
  errors: string[]
  skipped: number
}

export function parseProductsCsv(text: string): ProductCsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { rows: [], errors: ['El archivo está vacío.'], skipped: 0 }
  }

  const delimiter = lines[0]!.includes(';') ? ';' : ','
  const headerCells = lines[0]!
    .split(delimiter)
    .map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''))

  const columnMap = headerCells.map((h) => PRODUCT_CSV_HEADERS[h] ?? null)
  const hasKnownHeader = columnMap.some(Boolean)
  const dataLines = hasKnownHeader ? lines.slice(1) : lines

  const rows: CreateProductFormValues[] = []
  const errors: string[] = []
  let skipped = 0

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i]!
    const cells = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''))
    const partial: Partial<CreateProductFormValues> = {}
    let stockInicial = ''

    if (hasKnownHeader) {
      columnMap.forEach((key, idx) => {
        if (!key) return
        const val = cells[idx] ?? ''
        if (key === 'stock_inicial') stockInicial = val
        else partial[key] = val as never
      })
    } else if (cells.length >= 2) {
      partial.name = cells[0]
      partial.sku = cells[1]
      partial.category = cells[2] ?? 'General'
      partial.price = cells[5] ?? cells[4] ?? ''
      partial.costPrice = cells[6] ?? ''
      stockInicial = cells[7] ?? ''
    }

    const values = createDefaultProductFormValues({
      name: partial.name ?? '',
      sku: partial.sku ?? '',
      category: partial.category ?? 'General',
      productType: (partial.productType as ProductType) ?? 'Físico',
      unitOfMeasure: partial.unitOfMeasure ?? 'unidad',
      customUnit: partial.customUnit ?? '',
      price: partial.price ?? '',
      costPrice: partial.costPrice ?? '',
      stock: stockInicial || partial.stock || '—',
      ownerName: partial.ownerName ?? getDefaultOwnerName(),
    })

    const err = validateCreateProductForm(values)
    if (err) {
      errors.push(`Fila ${hasKnownHeader ? i + 2 : i + 1}: ${err}`)
      skipped += 1
      continue
    }
    rows.push(values)
  }

  return { rows, errors: errors.slice(0, 8), skipped }
}
