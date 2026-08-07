import { isApiEnabled } from '@/api/config'
import {
  type InventoryListItem,
  type InventoryStatus,
} from '@/data/inventory.mock'
import type { InventoryMovementLine } from '@/data/inventory-detail.mock'
import { CURRENT_USER_NAME } from '@/lib/current-user'
import type { InventoryMovementAdjustmentDetail } from '@/lib/inventory-movement'
import { getRegistryInventory } from '@/data/inventory-registry-store'
import type { ProductListItem } from '@/data/products.mock'
import { getRegistryProducts } from '@/data/products-registry-store'
import { productForInventorySku } from '@/lib/inventory-relations'
import { normalizeSku, resolveCatalogSku } from '@/lib/stock-sku'
import { syncRegistryInventory } from '@/data/inventory-registry-store'
import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import { getStockStore, mutateStockStore, STOCK_CHANGE_EVENT } from '@/lib/stock-store'
import { STORAGE_PREFIX } from '@/config/brand'
import type { InventoryMovementSourceKind } from '@/lib/inventory-movement'
import type {
  StockLineInput,
  StockOperationResult,
  StockReservationRecord,
} from '@/lib/stock-types'

const DEFAULT_AUTHOR = 'Sistema Kora'
const USER_INVENTORY_STORAGE_KEY = `${STORAGE_PREFIX}-crm-user-inventory`

const RELEASE_QUOTE_STATUSES = new Set([
  'Rechazada',
  'Cancelada',
  'Vencida',
  'Borrador',
  'En revisión interna',
  'Enviada',
  'En negociación',
  'En espera cliente',
])

function nowLabel(): string {
  return new Date().toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function getAllInventoryRows(): InventoryListItem[] {
  const user = getRegistryInventory()
  const pool = user
  const ids = new Set<string>()
  const rows: InventoryListItem[] = []
  for (const item of pool) {
    if (ids.has(item.id)) continue
    ids.add(item.id)
    rows.push(item)
  }
  return rows
}

export function getAllProducts(): ProductListItem[] {
  const user = getRegistryProducts()
  const ids = new Set<string>()
  const rows: ProductListItem[] = []
  for (const item of user) {
    if (ids.has(item.id)) continue
    ids.add(item.id)
    rows.push(item)
  }
  return rows
}

export function findInventoryBySku(sku: string): InventoryListItem | undefined {
  const catalogSku = resolveCatalogSku(sku)
  const key = normalizeSku(catalogSku)
  return getAllInventoryRows().find((row) => normalizeSku(row.sku) === key)
}

export function productTracksStock(product: ProductListItem | undefined): boolean {
  if (!product) return true
  const trackInventory = (product as ProductListItem & { trackInventory?: boolean })
    .trackInventory
  if (trackInventory === false) return false
  return product.stockNum >= 0
}

export function lineShouldReserveStock(sku: string): boolean {
  const catalogSku = resolveCatalogSku(sku)
  const product =
    getAllProducts().find(
      (p) => normalizeSku(p.sku) === normalizeSku(catalogSku),
    ) ?? productForInventorySku(getAllProducts(), catalogSku)
  if (product && !productTracksStock(product)) return false

  const inventory = findInventoryBySku(sku)
  if (!inventory) return false
  if (!isApiEnabled() && inventory.quantityNum < 0) {
    return productTracksStock(product)
  }
  return true
}

function ledgerQuantityAdjustment(inventoryId: string): number {
  return getStockStore().ledgers[inventoryId]?.quantityAdjustment ?? 0
}

export function effectiveQuantityNum(base: InventoryListItem): number {
  if (isApiEnabled()) {
    return base.onHandQtyNum ?? base.quantityNum
  }
  return Math.max(0, base.quantityNum + ledgerQuantityAdjustment(base.id))
}

export function reservedQuantityForInventory(inventoryId: string): number {
  const store = getStockStore()
  return store.reservations
    .filter(
      (r) =>
        r.inventoryId === inventoryId &&
        (r.status === 'active' || r.status === 'transferred'),
    )
    .reduce((sum, r) => sum + r.qty, 0)
}

export function availableQuantityForInventory(item: InventoryListItem): number {
  return Math.max(0, effectiveQuantityNum(item))
}

export function formatQuantityLabel(
  value: number,
  item: Pick<InventoryListItem, 'quantity'>,
): string {
  const suffix = item.quantity.replace(/^[\d.,\s]+/u, '').trim()
  return suffix ? `${value} ${suffix}` : `${value} u.`
}

export function enrichInventoryListItem(item: InventoryListItem): InventoryListItem & {
  reservedQtyNum: number
  availableQtyNum: number
  onHandQtyNum: number
} {
  const onHandQtyNum = effectiveQuantityNum(item)
  const apiReserved = item.reservedQtyNum ?? 0
  const reservedQtyNum = isApiEnabled()
    ? apiReserved
    : Math.max(reservedQuantityForInventory(item.id), apiReserved)
  const availableQtyNum = isApiEnabled()
    ? (item.availableQtyNum ?? onHandQtyNum)
    : onHandQtyNum
  return {
    ...item,
    quantityNum: onHandQtyNum,
    quantity: formatQuantityLabel(onHandQtyNum, item),
    reservedQtyNum,
    availableQtyNum,
    onHandQtyNum,
  }
}

export function stockMovementsForInventory(inventoryId: string): InventoryMovementLine[] {
  const store = getStockStore()
  const item = getAllInventoryRows().find((r) => r.id === inventoryId)
  if (!item) return []

  const baseOnHand = item.quantityNum
  let running = baseOnHand

  const ledgerRows = store.movements
    .filter((m) => m.inventoryId === inventoryId)
    .sort((a, b) => a.when.localeCompare(b.when))

  return ledgerRows.map((mv) => {
    running = Math.max(0, running + mv.quantityDelta)
    const sign =
      mv.quantityDelta >= 0 ? '+' : ''
    const qtyLabel =
      mv.reservedDelta !== 0
        ? `${mv.reservedDelta > 0 ? '+' : ''}${mv.reservedDelta} res.`
        : `${sign}${mv.quantityDelta}`

    return {
      id: mv.id,
      type: mv.type === 'Liberación' ? 'Reserva' : mv.type,
      reference: mv.reference,
      quantity: qtyLabel,
      balance: formatQuantityLabel(running, item),
      when: mv.when,
      author: mv.author,
      sourceKind: mv.sourceKind,
      sourceId: mv.sourceId,
      adjustmentDetail: mv.adjustmentDetail,
    }
  })
}

type AppendMovementMeta = {
  sourceKind?: InventoryMovementSourceKind
  sourceId?: string
  adjustmentDetail?: InventoryMovementAdjustmentDetail
  author?: string
}

function appendMovement(
  inventoryId: string,
  type: InventoryMovementLine['type'] | 'Liberación',
  reference: string,
  quantityDelta: number,
  reservedDelta: number,
  meta?: AppendMovementMeta,
) {
  const author = meta?.author ?? DEFAULT_AUTHOR
  mutateStockStore((store) => ({
    ...store,
    movements: [
      ...store.movements,
      {
        id: createId('mov'),
        inventoryId,
        type,
        reference: reference.slice(0, 80),
        quantityDelta,
        reservedDelta,
        when: nowLabel(),
        author,
        sourceKind: meta?.sourceKind,
        sourceId: meta?.sourceId,
        adjustmentDetail: meta?.adjustmentDetail,
      },
    ],
  }))
}

function adjustLedger(inventoryId: string, quantityDelta: number) {
  mutateStockStore((store) => {
    const prev = store.ledgers[inventoryId]?.quantityAdjustment ?? 0
    return {
      ...store,
      ledgers: {
        ...store.ledgers,
        [inventoryId]: { quantityAdjustment: prev + quantityDelta },
      },
    }
  })
}

function activeReservationsForQuote(quoteId: string): StockReservationRecord[] {
  const store = getStockStore()
  return store.reservations.filter(
    (r) => r.quoteId === quoteId && (r.status === 'active' || r.status === 'transferred'),
  )
}

export function quoteHasActiveReservation(quoteId: string): boolean {
  return activeReservationsForQuote(quoteId).length > 0
}

function reserveLine(
  line: StockLineInput,
  quoteId: string,
  reference: string,
): StockOperationResult {
  if (!lineShouldReserveStock(line.sku)) {
    return { ok: true, warnings: [`${line.sku}: sin control de stock`] }
  }

  const inventory = findInventoryBySku(line.sku)
  if (!inventory) {
    return { ok: false, message: `No hay fila de inventario para SKU ${line.sku}.` }
  }

  const product = productForInventorySku(getAllProducts(), inventory.sku)

  mutateStockStore((store) => ({
    ...store,
    reservations: [
      ...store.reservations,
      {
        id: createId('res'),
        inventoryId: inventory.id,
        sku: inventory.sku,
        productId: line.productId ?? product?.id,
        qty: line.quantity,
        quoteId,
        quoteLineId: line.id,
        status: 'active',
        createdAt: Date.now(),
      },
    ],
  }))

  appendMovement(
    inventory.id,
    'Reserva',
    reference,
    0,
    line.quantity,
  )

  return { ok: true }
}

export function reserveStockForQuote(
  quoteId: string,
  quoteCode: string,
  lines: StockLineInput[],
): StockOperationResult {
  const existing = activeReservationsForQuote(quoteId)
  if (existing.length > 0) {
    return { ok: true, message: 'La cotización ya tiene stock reservado.' }
  }

  const warnings: string[] = []
  for (const line of lines) {
    const result = reserveLine(line, quoteId, `COT ${quoteCode}`)
    if (!result.ok) return result
    if (result.warnings?.length) warnings.push(...result.warnings)
  }

  return {
    ok: true,
    message: 'Stock reservado para la cotización aceptada.',
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

export function releaseStockForQuote(quoteId: string, reason: string): StockOperationResult {
  const store = getStockStore()
  const toRelease = store.reservations.filter(
    (r) =>
      r.quoteId === quoteId &&
      (r.status === 'active' || r.status === 'transferred'),
  )

  if (toRelease.length === 0) {
    return { ok: true }
  }

  for (const res of toRelease) {
    appendMovement(res.inventoryId, 'Liberación', reason, 0, -res.qty)
  }

  mutateStockStore((current) => ({
    ...current,
    reservations: current.reservations.map((r) =>
      toRelease.some((t) => t.id === r.id) ? { ...r, status: 'released' as const } : r,
    ),
  }))

  return { ok: true, message: 'Reserva de stock liberada.' }
}

export function shouldReleaseQuoteReservation(
  fromStatus: string,
  toStatus: string,
): boolean {
  if (fromStatus === 'Aceptada' && RELEASE_QUOTE_STATUSES.has(toStatus)) {
    return true
  }
  return false
}

export function shouldReserveQuoteOnStatus(toStatus: string): boolean {
  return toStatus === 'Aceptada'
}

export function transferQuoteReservationToInvoice(
  quoteId: string,
  invoiceId: string,
  invoiceNumber: string,
): StockOperationResult {
  const store = getStockStore()
  const toTransfer = store.reservations.filter(
    (r) => r.quoteId === quoteId && r.status === 'active',
  )

  if (toTransfer.length === 0) {
    return { ok: true }
  }

  mutateStockStore((current) => ({
    ...current,
    reservations: current.reservations.map((r) =>
      toTransfer.some((t) => t.id === r.id)
        ? { ...r, status: 'transferred' as const, invoiceId }
        : r,
    ),
  }))

  for (const res of toTransfer) {
    appendMovement(res.inventoryId, 'Reserva', `FAC ${invoiceNumber}`, 0, 0, {
      sourceKind: 'factura',
      sourceId: invoiceId,
    })
  }

  return { ok: true, message: 'Reserva transferida a la factura.' }
}

export function commitStockForInvoice(
  invoiceId: string,
  invoiceNumber: string,
): StockOperationResult {
  const store = getStockStore()
  const pending = store.reservations.filter(
    (r) =>
      r.invoiceId === invoiceId &&
      (r.status === 'active' || r.status === 'transferred'),
  )

  if (pending.length === 0) {
    return { ok: true }
  }

  const pendingTracked = pending.filter((res) => lineShouldReserveStock(res.sku))

  for (const res of pendingTracked) {
    const inventory = getAllInventoryRows().find((i) => i.id === res.inventoryId)
    if (!inventory) {
      return {
        ok: false,
        message: `No hay inventario para SKU ${res.sku} al emitir la factura.`,
      }
    }
    const onHand = effectiveQuantityNum(inventory)
    if (onHand < res.qty) {
      return {
        ok: false,
        message: `Stock insuficiente para emitir la factura: ${inventory.productName} (${res.sku}) requiere ${res.qty} u. y hay ${onHand} en bodega.`,
      }
    }
  }

  for (const res of pendingTracked) {
    adjustLedger(res.inventoryId, -res.qty)
    appendMovement(res.inventoryId, 'Salida', `FAC ${invoiceNumber}`, -res.qty, -res.qty, {
      sourceKind: 'factura',
      sourceId: invoiceId,
    })
  }

  mutateStockStore((current) => ({
    ...current,
    reservations: current.reservations.map((r) =>
      pendingTracked.some((p) => p.id === r.id)
        ? { ...r, status: 'committed' as const }
        : r,
    ),
  }))

  return { ok: true, message: 'Stock descontado por emisión de factura.' }
}

export function voidInvoiceStock(
  invoiceId: string,
  invoiceNumber: string,
): StockOperationResult {
  const store = getStockStore()
  const committed = store.reservations.filter(
    (r) => r.invoiceId === invoiceId && r.status === 'committed',
  )
  const reserved = store.reservations.filter(
    (r) =>
      r.invoiceId === invoiceId &&
      (r.status === 'active' || r.status === 'transferred'),
  )

  for (const res of committed) {
    adjustLedger(res.inventoryId, res.qty)
    appendMovement(
      res.inventoryId,
      'Entrada',
      `NC/Anulación ${invoiceNumber}`,
      res.qty,
      0,
      { sourceKind: 'factura', sourceId: invoiceId },
    )
  }

  for (const res of reserved) {
    appendMovement(
      res.inventoryId,
      'Liberación',
      `Anulación ${invoiceNumber}`,
      0,
      -res.qty,
    )
  }

  const affected = [...committed, ...reserved]
  if (affected.length === 0) {
    return { ok: true }
  }

  mutateStockStore((current) => ({
    ...current,
    reservations: current.reservations.map((r) =>
      affected.some((a) => a.id === r.id) ? { ...r, status: 'released' as const } : r,
    ),
  }))

  return { ok: true, message: 'Stock restaurado por anulación de factura.' }
}

export function handleInvoiceStatusStockChange(
  invoiceId: string,
  invoiceNumber: string,
  previousStatus: string,
  nextStatus: string,
): StockOperationResult {
  if (isApiEnabled()) {
    return { ok: true }
  }

  const wasDraft = previousStatus === 'Borrador'
  const isDraft = nextStatus === 'Borrador'
  const isVoid = nextStatus === 'Anulada'
  const wasVoid = previousStatus === 'Anulada'

  if (isVoid) {
    return voidInvoiceStock(invoiceId, invoiceNumber)
  }

  if (wasVoid && !isDraft && (nextStatus === 'Pendiente' || nextStatus === 'Pagada')) {
    return commitStockForInvoice(invoiceId, invoiceNumber)
  }

  if (wasDraft && nextStatus === 'Pendiente') {
    return commitStockForInvoice(invoiceId, invoiceNumber)
  }

  if (nextStatus === 'Pagada' && !isDraft) {
    return commitStockForInvoice(invoiceId, invoiceNumber)
  }

  if (wasDraft && nextStatus === 'Pagada') {
    return commitStockForInvoice(invoiceId, invoiceNumber)
  }

  if (!wasDraft && isDraft) {
    return voidInvoiceStock(invoiceId, invoiceNumber)
  }

  return { ok: true }
}

const NON_STOCK_SKU_PREFIXES = ['LOG-']

function isStockReceiptSku(sku: string): boolean {
  const trimmed = sku.trim()
  if (!trimmed) return false
  return !NON_STOCK_SKU_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
}

export function handleBoletaStatusStockChange(
  boletaId: string,
  boletaNumber: string,
  previousStatus: string,
  nextStatus: string,
): StockOperationResult {
  if (isApiEnabled()) {
    return { ok: true }
  }

  const wasDraft = previousStatus === 'Borrador'
  const isDraft = nextStatus === 'Borrador'
  const isVoid = nextStatus === 'Anulada'
  const wasVoid = previousStatus === 'Anulada'

  if (isVoid) {
    return voidInvoiceStock(boletaId, boletaNumber)
  }

  if (wasVoid && !isDraft && nextStatus === 'Emitida') {
    return commitStockForInvoice(boletaId, boletaNumber)
  }

  if (wasDraft && nextStatus === 'Emitida') {
    return commitStockForInvoice(boletaId, boletaNumber)
  }

  if (!wasDraft && isDraft) {
    return voidInvoiceStock(boletaId, boletaNumber)
  }

  return { ok: true }
}

export function receiveStockForReceipt(
  receiptNumber: string,
  lines: StockLineInput[],
  receiptId?: string,
): StockOperationResult {
  const warnings: string[] = []
  const reference = `Ingreso ${receiptNumber}`.slice(0, 80)

  for (const line of lines) {
    if (!line.sku?.trim()) continue
    if (!isStockReceiptSku(line.sku)) {
      warnings.push(`${line.sku}: sin control de stock`)
      continue
    }
    if (!lineShouldReserveStock(line.sku)) {
      warnings.push(`${line.sku}: sin fila de inventario`)
      continue
    }

    const inventory = findInventoryBySku(line.sku)
    if (!inventory) {
      return {
        ok: false,
        message: `No hay fila de inventario para SKU ${line.sku}.`,
        warnings,
      }
    }

    const qty = Math.max(0, line.quantity || 0)
    if (qty <= 0) continue

    adjustLedger(inventory.id, qty)
    appendMovement(inventory.id, 'Entrada', reference, qty, 0, {
      sourceKind: 'ingreso',
      sourceId: receiptId,
    })
  }

  return {
    ok: true,
    message: 'Stock ingresado correctamente.',
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

export function findInventoryBySkuAndLocation(
  sku: string,
  location: string,
): InventoryListItem | undefined {
  const catalogSku = resolveCatalogSku(sku)
  const key = normalizeSku(catalogSku)
  const loc = location.trim().toLowerCase()
  return getAllInventoryRows().find(
    (row) => normalizeSku(row.sku) === key && row.location.trim().toLowerCase() === loc,
  )
}

function loadUserInventoryRows(): InventoryListItem[] {
  try {
    const raw = localStorage.getItem(USER_INVENTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as InventoryListItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistUserInventoryRows(items: InventoryListItem[]): void {
  try {
    localStorage.setItem(USER_INVENTORY_STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
  syncRegistryInventory(items)
  window.dispatchEvent(new CustomEvent(STOCK_CHANGE_EVENT))
}

function ensureInventoryRowAtLocation(
  sku: string,
  location: string,
): InventoryListItem | undefined {
  const existing = findInventoryBySkuAndLocation(sku, location)
  if (existing) return existing

  const template = findInventoryBySku(sku)
  if (!template) return undefined

  const row = stampRecordAuditOnCreate({
    id: `inv-user-${normalizeSku(sku)}-${Date.now()}`,
    productName: template.productName,
    sku: template.sku,
    location: location.trim(),
    quantity: formatQuantityLabel(0, template),
    quantityNum: 0,
    minStock: template.minStock,
    minStockNum: template.minStockNum,
    status: 'Sin stock' satisfies InventoryStatus,
    lastMovement: 'Alta por ajuste en bodega',
  }) as InventoryListItem

  const items = [row, ...loadUserInventoryRows()]
  persistUserInventoryRows(items)
  return row
}

/** Existencias en una bodega (en mano y disponible tras reservas). */
export function inventoryStockAtLocation(
  sku: string,
  location: string,
): { onHand: number; available: number; row: InventoryListItem | null } {
  const row = findInventoryBySkuAndLocation(sku, location)
  if (!row) return { onHand: 0, available: 0, row: null }
  const enriched = enrichInventoryListItem(row)
  return {
    onHand: enriched.onHandQtyNum ?? 0,
    available: enriched.availableQtyNum ?? 0,
    row: enriched,
  }
}

export function applyInventoryAdjustment(params: {
  sku: string
  location: string
  quantityDelta: number
  reference: string
}): StockOperationResult {
  const delta = Math.round(params.quantityDelta)
  if (!Number.isFinite(delta) || delta === 0) {
    return { ok: false, message: 'Indica una cantidad distinta de cero.' }
  }

  const location = params.location.trim()
  if (!location) {
    return { ok: false, message: 'Selecciona una bodega.' }
  }

  let row =
    findInventoryBySkuAndLocation(params.sku, location) ??
    (delta > 0 ? ensureInventoryRowAtLocation(params.sku, location) : undefined)

  if (!row) {
    return {
      ok: false,
      message: `No hay registro de inventario en ${location} para este SKU.`,
    }
  }

  const enriched = enrichInventoryListItem(row)
  const available = enriched.availableQtyNum ?? 0
  if (delta < 0 && available + delta < 0) {
    return {
      ok: false,
      message: `No hay stock suficiente en ${location} (disponible: ${available}).`,
    }
  }

  const onHand = enriched.onHandQtyNum ?? effectiveQuantityNum(row)
  const note = params.reference.trim()
  const ref = note || `AJU-${Date.now()}`
  const quantityAfter = onHand + delta
  adjustLedger(row.id, delta)
  appendMovement(row.id, 'Ajuste', ref, delta, 0, {
    sourceKind: 'ajuste',
    author: CURRENT_USER_NAME,
    adjustmentDetail: {
      field: 'Cantidad en bodega',
      quantityBefore: onHand,
      quantityAfter,
      quantityDelta: delta,
      location: row.location,
      note: note || undefined,
    },
  })
  return { ok: true, message: 'Ajuste registrado correctamente.' }
}

export function applyInventoryTransfer(params: {
  sku: string
  fromLocation: string
  toLocation: string
  quantity: number
}): StockOperationResult {
  const qty = Math.round(params.quantity)
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, message: 'La cantidad debe ser un entero mayor que cero.' }
  }
  const from = params.fromLocation.trim()
  const to = params.toLocation.trim()
  if (!from || !to) {
    return { ok: false, message: 'Selecciona bodega origen y destino.' }
  }
  if (from.toLowerCase() === to.toLowerCase()) {
    return { ok: false, message: 'Origen y destino deben ser distintos.' }
  }

  const source = findInventoryBySkuAndLocation(params.sku, from)
  const dest = findInventoryBySkuAndLocation(params.sku, to)
  if (!source) return { ok: false, message: `No hay stock de este SKU en ${from}.` }
  if (!dest) return { ok: false, message: `No existe registro de inventario en ${to} para este SKU.` }

  const available = effectiveQuantityNum(source)
  if (available < qty) {
    return { ok: false, message: `Stock insuficiente en ${from} (disponible: ${available}).` }
  }

  const ref = `TRAS-${Date.now()}`
  adjustLedger(source.id, -qty)
  adjustLedger(dest.id, qty)
  appendMovement(source.id, 'Traslado', ref, -qty, 0, { sourceKind: 'traslado' })
  appendMovement(dest.id, 'Traslado', ref, qty, 0, { sourceKind: 'traslado' })
  return { ok: true, message: `Traslado de ${qty} u. a ${to} registrado.` }
}

export function reservationsSummaryForQuote(quoteId: string): {
  lines: { sku: string; productName: string; qty: number }[]
  totalQty: number
} {
  const rows = getAllInventoryRows()
  const active = activeReservationsForQuote(quoteId)
  const lines = active.map((r) => {
    const inv = rows.find((i) => i.id === r.inventoryId)
    return {
      sku: r.sku,
      productName: inv?.productName ?? r.sku,
      qty: r.qty,
    }
  })
  return {
    lines,
    totalQty: lines.reduce((s, l) => s + l.qty, 0),
  }
}
