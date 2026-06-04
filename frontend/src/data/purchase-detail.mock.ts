import { isApiEnabled } from '@/api/config'
import { purchaseListSeed, type PurchaseListItem } from '@/data/purchases.mock'
import {
  getRegistryPurchaseById,
  getRegistryPurchaseLines,
} from '@/data/purchases-registry-store'
import type { ContactActivity, ContactNote } from '@/data/contact-detail.mock'
import { loadCatalogSettings } from '@/lib/catalog-settings'
import { buildPurchaseActivitiesForDetail } from '@/lib/purchase-activities'
import { mergeEntityNotesForMock } from '@/lib/entity-notes-storage'
import {
  resolveWarehouseFromStoredLabel,
  warehouseFormPatchFromSelection,
} from '@/lib/warehouse-lookup'
import { computeFulfillmentTotals } from '@/lib/purchase-fulfillment'
import {
  loadPurchaseDetailOverride,
  mergeDetailOverride,
} from '@/lib/purchase-detail-storage'
import { getPurchaseFiles, type PurchaseFile } from '@/lib/purchase-files'
import {
  isMainLineStage,
  isOffRouteStage,
  legacyStatusToPurchaseJourney,
  resolvePurchaseJourneyStage,
  type PurchaseJourneyMainStage,
  type PurchaseJourneyStage,
  type PurchaseStageHistory,
} from '@/lib/purchase-journey'

export type { PurchaseStageHistory }

export type PurchaseLineKind = 'product' | 'manual'

export type PurchaseLineItem = {
  id: string
  /** product = catálogo; manual = servicio, flete, etc. (texto libre). */
  lineKind?: PurchaseLineKind
  /** Catálogo de productos vinculado. */
  productId?: string
  /** Nombre en catálogo (lookup). */
  product: string
  /** Descripción de la línea (desde catálogo). */
  description?: string
  sku?: string
  unitOfMeasure?: string
  customUnit?: string
  quantity: number
  quantityReceived: number
  unitPrice: string
  unitPriceOriginal?: string
  priceCurrency?: import('@/lib/currency').ProductCurrency
  discount: string
  total: string
}

export type PurchaseDetail = PurchaseListItem & {
  description: string
  stageEnteredAt: string
  expectedDelivery: string
  paymentTerms: string
  warehouseId?: string
  warehouse: string
  deliveryAddress: string
  supplierContactId?: string
  supplierContact: string
  supplierEmail: string
  supplierPhone: string
  cancelReason?: string
  nextStep?: { title: string; when: string }
  tags: string[]
  stage: PurchaseJourneyStage
  stageHistory: PurchaseStageHistory[]
  lineItems: PurchaseLineItem[]
  activities: ContactActivity[]
  notes: ContactNote[]
  files: PurchaseFile[]
  pendingActivities: number
  daysInStage: number
  receivedPercent: number
  exchangeRateDate?: string | null
  exchangeRateUf?: number | null
  exchangeRateUsd?: number | null
  exchangeRateEur?: number | null
}

export function resolvePurchaseListItem(
  id: string,
  base?: PurchaseListItem,
): PurchaseListItem {
  const fromRegistry = getRegistryPurchaseById(id)
  if (fromRegistry) return { ...fromRegistry, id }
  if (base) return { ...base, id }

  const direct = purchaseListSeed.find((p) => p.id === id)
  if (direct) return { ...direct, id }

  const pageMatch = /^compras-(\d+)$/.exec(id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = purchaseListSeed[idx % purchaseListSeed.length]
    return { ...seed!, id }
  }

  throw new Error(`Orden de compra no encontrada: ${id}`)
}

function stageHistoryFor(
  id: string,
  journeyStage: PurchaseJourneyStage,
): PurchaseStageHistory[] {
  const chains: Partial<Record<PurchaseJourneyStage, PurchaseJourneyStage[]>> = {
    Borrador: ['Borrador'],
    Emitida: ['Borrador', 'Emitida'],
    Confirmada: ['Borrador', 'Emitida', 'Confirmada'],
  }

  const chain = chains[journeyStage] ?? ['Borrador', journeyStage]
  const dates = ['28 abr 2024', '5 may 2024', '14 may 2024']

  return chain.map((stage, i) => {
    const entry: PurchaseStageHistory = {
      id: `${id}-st-${i}`,
      stage,
      enteredAt: dates[i] ?? dates[dates.length - 1]!,
      note: stage === journeyStage ? 'Etapa actual' : undefined,
    }
    const prev = chain[i - 1]
    if (
      stage === journeyStage &&
      isOffRouteStage(journeyStage) &&
      prev &&
      isMainLineStage(prev)
    ) {
      entry.pausedFromMain = prev as PurchaseJourneyMainStage
    }
    return entry
  })
}

/** Líneas de catálogo con SKU real de inventario para calcular stock en tránsito. */
function catalogLinesForPurchase(
  pur: PurchaseListItem,
): Array<{ product: string; sku: string; quantity: number }> {
  const byId: Record<string, { product: string; sku: string; quantity: number }> = {
    pur1: { product: 'Módulo BI avanzado', sku: 'ADD-BI-01', quantity: 50 },
    pur2: { product: 'API Gateway pack', sku: 'ADD-API-01', quantity: 24 },
    pur4: { product: 'Plan Starter', sku: 'PLN-STR-01', quantity: 80 },
    pur6: { product: 'Horas consultoría', sku: 'SRV-CON-10', quantity: 40 },
  }

  const preset = byId[pur.id]
  if (preset) return [preset]

  const mainQty = pur.amountNum >= 10000 ? 50 : 12
  return [
    {
      product: pur.productSummary.split('·')[0]?.trim() ?? pur.productSummary,
      sku: 'PLN-BUS-01',
      quantity: mainQty,
    },
  ]
}

function lineItemsFor(
  pur: PurchaseListItem,
  id: string,
  receivedPercent: number,
): PurchaseLineItem[] {
  const catalog = catalogLinesForPurchase(pur)

  return catalog.map((line, index) => {
    const mainReceived =
      receivedPercent >= 100
        ? line.quantity
        : receivedPercent >= 55
          ? Math.round(line.quantity * 0.55)
          : receivedPercent >= 20
            ? Math.round(line.quantity * 0.2)
            : 0

    return {
      id: `${id}-li-${index + 1}`,
      product: line.product,
      description: line.product,
      sku: line.sku,
      quantity: line.quantity,
      quantityReceived: index === 0 ? mainReceived : 0,
      unitPrice: index === 0 ? pur.amount : '$450',
      discount: '0%',
      total: index === 0 ? pur.amount : '$450',
    }
  })
}

function receivedPercentFor(_stage: PurchaseJourneyStage): number {
  return 0
}

export function getPurchaseDetail(id: string): PurchaseDetail {
  const base = resolvePurchaseListItem(id)
  const journeyStage = resolvePurchaseJourneyStage(
    id,
    legacyStatusToPurchaseJourney(base.status),
  )
  const listBase: PurchaseListItem = {
    ...base,
    status: journeyStage,
  }
  const idx = Math.max(
    0,
    purchaseListSeed.findIndex((s) => s.id === listBase.id),
  )
  const seedReceived = receivedPercentFor(journeyStage)
  const seedLines = isApiEnabled()
    ? (getRegistryPurchaseLines(id) ?? [])
    : lineItemsFor(listBase, id, seedReceived)
  const fulfillment = computeFulfillmentTotals(seedLines)

  const catalog = loadCatalogSettings()
  const resolvedWh = resolveWarehouseFromStoredLabel(
    catalog.warehouses,
    'Bodega central',
  )
  const whPatch = warehouseFormPatchFromSelection(resolvedWh)

  const built: PurchaseDetail = {
    ...listBase,
    stage: journeyStage,
    description: `Orden de compra ${listBase.reference} con ${listBase.supplier}. Seguimiento de recepción, factura del proveedor e ingreso a inventario.`,
    stageEnteredAt: '14 may 2024',
    expectedDelivery: '22 may 2024',
    paymentTerms: 'Net 30 · Transferencia',
    warehouseId: whPatch.warehouseId || undefined,
    warehouse: whPatch.warehouse || 'Bodega central',
    deliveryAddress:
      whPatch.deliveryAddress || 'Av. Providencia 1200, Of. 402',
    supplierContact: 'Equipo comercial proveedor',
    supplierEmail: `compras@${listBase.supplier.toLowerCase().replace(/\s+/g, '')}.cl`,
    supplierPhone: '+56 2 2987 4500',
    cancelReason: undefined,
    nextStep:
      journeyStage === 'Borrador'
        ? { title: 'Revisar y emitir OC', when: 'Pendiente' }
        : undefined,
    tags: ['Compras', listBase.amountNum >= 10000 ? 'Alto monto' : 'Operación estándar'],
    stageHistory: stageHistoryFor(id, journeyStage),
    lineItems: seedLines,
    activities: buildPurchaseActivitiesForDetail({ ...listBase, id }),
    notes: [
      {
        id: `pur-note-${id}-1`,
        body: '<p>Verificar número de serie en recepción y adjuntar guía firmada por bodega.</p>',
        author: listBase.owner,
        when: '13 may, 09:30',
      },
    ],
    files: getPurchaseFiles(id, listBase.owner),
    pendingActivities: (idx % 3) + 1,
    daysInStage: (idx % 10) + 2,
    receivedPercent: fulfillment.receivedPercent || seedReceived,
  }

  const merged = mergeDetailOverride(built, loadPurchaseDetailOverride(id))
  merged.notes = mergeEntityNotesForMock('compra', id, merged.notes ?? [])
  return merged
}
