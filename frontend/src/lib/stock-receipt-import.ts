import { findProductBySku, getAllKnownProducts } from '@/lib/product-lookup'
import {
  createDefaultStockReceiptFormValues,
  type StockReceiptFormValues,
} from '@/lib/stock-receipt-form'
import { defaultStockReceiptLineItem } from '@/lib/stock-receipt-line-item'

export type StockReceiptCsvParseResult = {
  values: StockReceiptFormValues | null
  errors: string[]
  skipped: number
}

const HEADER_MAP: Record<string, string> = {
  sku: 'sku',
  cantidad: 'quantity',
  quantity: 'quantity',
  qty: 'quantity',
  bodega: 'warehouse',
  warehouse: 'warehouse',
  referencia_externa: 'externalReference',
  referencia: 'externalReference',
  external_reference: 'externalReference',
  proveedor: 'supplier',
  supplier: 'supplier',
  notas: 'notes',
  notas_linea: 'notes',
  notes: 'memo',
  memo: 'memo',
}

function parseDelimiter(header: string): string {
  return header.includes(';') ? ';' : ','
}

export function parseStockReceiptsCsv(
  text: string,
  options?: { existingNumbers?: string[] },
): StockReceiptCsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { values: null, errors: ['El archivo está vacío.'], skipped: 0 }
  }

  const delimiter = parseDelimiter(lines[0]!)
  const headerCells = lines[0]!
    .split(delimiter)
    .map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''))

  const columnKeys = headerCells.map((h) => HEADER_MAP[h] ?? null)
  if (!columnKeys.includes('sku') || !columnKeys.includes('quantity')) {
    return {
      values: null,
      errors: ['Encabezados requeridos: sku, cantidad (y opcionalmente bodega, referencia_externa, proveedor, notas).'],
      skipped: 0,
    }
  }

  const lineItems: StockReceiptFormValues['lineItems'] = []
  const errors: string[] = []
  let skipped = 0
  let warehouse = ''
  let externalReference = ''
  let supplier = ''
  let memo = ''

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    columnKeys.forEach((key, idx) => {
      if (key) row[key] = cells[idx] ?? ''
    })

    const sku = row.sku?.trim() ?? ''
    const qtyRaw = row.quantity?.trim() ?? ''
    const qty = Number.parseInt(qtyRaw.replace(/[^\d]/g, ''), 10)

    if (!sku) {
      skipped += 1
      continue
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      errors.push(`Fila ${i + 1}: cantidad inválida para SKU ${sku}.`)
      continue
    }

    const product = findProductBySku(getAllKnownProducts(), sku)
    if (!product) {
      errors.push(`Fila ${i + 1}: SKU «${sku}» no encontrado en catálogo.`)
      continue
    }

    if (row.warehouse?.trim() && !warehouse) warehouse = row.warehouse.trim()
    if (row.externalReference?.trim() && !externalReference) {
      externalReference = row.externalReference.trim()
    }
    if (row.supplier?.trim() && !supplier) supplier = row.supplier.trim()
    if (row.notes?.trim()) memo = [memo, row.notes.trim()].filter(Boolean).join(' · ')

    lineItems.push({
      ...defaultStockReceiptLineItem(),
      id: `csv-line-${i}`,
      productId: product.id,
      product: product.name,
      sku: product.sku,
      quantity: qty,
    })
  }

  if (lineItems.length === 0) {
    return {
      values: null,
      errors: errors.length ? errors : ['No se importó ninguna línea válida.'],
      skipped,
    }
  }

  const values = createDefaultStockReceiptFormValues(
    {
      externalReference,
      supplier,
      warehouse: warehouse || undefined,
      lineItems,
      memo,
    },
    { existingNumbers: options?.existingNumbers },
  )

  if (warehouse) {
    values.warehouse = warehouse
  }

  return { values, errors: errors.slice(0, 8), skipped }
}
