import { inventoryListSeed, type InventoryListItem } from '@/data/inventory.mock'
import {
  getInventoryProductSummaryById,
  isInventoryProductId,
  stockMovementsForSku,
} from '@/lib/inventory-aggregate'
import {
  enrichInventoryListItem,
  stockMovementsForInventory,
} from '@/lib/stock-service'
import type { ContactActivity, ContactNote } from '@/data/contact-detail.mock'
import { getInventoryFiles, type InventoryFile } from '@/lib/inventory-files'
import { buildInventoryActivitiesForDetail } from '@/lib/inventory-activities'
import { mergeEntityNotesForMock } from '@/lib/entity-notes-storage'
import { buildInventoryDetailFromProductSummary } from '@/lib/inventory-product-detail'
import { deriveInventoryStatusFromRow } from '@/lib/inventory-status'
import type {
  InventoryMovementAdjustmentDetail,
  InventoryMovementSourceKind,
} from '@/lib/inventory-movement'

export type { InventoryMovementAdjustmentDetail, InventoryMovementSourceKind }

export type InventoryMovementLine = {
  id: string
  type: 'Entrada' | 'Salida' | 'Ajuste' | 'Traslado' | 'Reserva'
  reference: string
  quantity: string
  balance: string
  when: string
  author: string
  sourceKind?: InventoryMovementSourceKind
  sourceId?: string
  adjustmentDetail?: InventoryMovementAdjustmentDetail
}

export type InventoryDetail = InventoryListItem & {
  /** Vista consolidada por SKU (varias bodegas). */
  isProductView?: boolean
  /** Id UUID de posición en bodega (notas/archivos en API). */
  recordEntityId?: string
  description: string
  owner: string
  category: string
  unitCost: string
  warehouseZone: string
  linkedPurchaseRef?: string
  nextStep?: { title: string; when: string }
  tags: string[]
  movements: InventoryMovementLine[]
  activities: ContactActivity[]
  notes: ContactNote[]
  files: InventoryFile[]
  pendingActivities: number
  stockHealthPercent: number
  inTransitQtyNum?: number
  inTransitLabel?: string
}

export function resolveInventoryListItem(id: string): InventoryListItem {
  const direct = inventoryListSeed.find((p) => p.id === id)
  if (direct) return { ...direct, id }

  const pageMatch = /^inventario-(\d+)$/.exec(id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = inventoryListSeed[idx % inventoryListSeed.length]
    return { ...seed!, id }
  }

  return { ...inventoryListSeed[0]!, id }
}

function movementsFor(item: InventoryListItem, id: string): InventoryMovementLine[] {
  const onHand = item.quantityNum
  return [
    {
      id: `${id}-mov-1`,
      type: 'Entrada',
      reference: 'Ingreso ING-2024-0012',
      quantity: '+50',
      balance: item.quantity,
      when: '16 may 2024',
      author: 'María López',
      sourceKind: 'ingreso',
      sourceId: 'sr1',
    },
    {
      id: `${id}-mov-2`,
      type: 'Salida',
      reference: 'FAC FAC-2024-0842',
      quantity: '-12',
      balance: item.quantity,
      when: '14 may 2024',
      author: 'Carlos Vega',
      sourceKind: 'factura',
      sourceId: 'inv1',
    },
    {
      id: `${id}-mov-3`,
      type: 'Ajuste',
      reference: 'Conteo cíclico',
      quantity: '-2',
      balance: item.quantity,
      when: '12 may 2024',
      author: 'Ana Ruiz',
      sourceKind: 'ajuste',
      adjustmentDetail: {
        field: 'Cantidad en bodega',
        quantityBefore: onHand + 2,
        quantityAfter: onHand,
        quantityDelta: -2,
        location: item.location,
        note: 'Conteo cíclico',
      },
    },
  ]
}

function stockHealthFor(item: InventoryListItem): number {
  const available = item.availableQtyNum ?? item.quantityNum
  if (item.minStockNum <= 0) return 100
  return Math.min(100, Math.round((available / item.minStockNum) * 100))
}

const owners = ['María López', 'Carlos Vega', 'Ana Ruiz', 'Roberto Sánchez']

export function getInventoryProductDetail(id: string): InventoryDetail | null {
  const summary = getInventoryProductSummaryById(id)
  if (!summary) return null

  const primary = summary.locationRows[0]!
  const base = getInventoryDetail(primary.id)
  return buildInventoryDetailFromProductSummary(
    summary,
    stockMovementsForSku(summary.sku),
    base,
  )
}

export function getInventoryDetail(id: string): InventoryDetail {
  if (isInventoryProductId(id)) {
    const product = getInventoryProductDetail(id)
    if (product) return product
  }

  const base = resolveInventoryListItem(id)
  const enriched = enrichInventoryListItem(base)
  const status = deriveInventoryStatusFromRow(enriched)
  const listBase: InventoryListItem = { ...enriched, status }

  const idx = inventoryListSeed.findIndex((s) => s.id === listBase.id)
  const owner = owners[idx % owners.length] ?? 'María López'
  const stockHealthPercent = stockHealthFor(listBase)

  const detail: InventoryDetail = {
    ...listBase,
    description: `Control de existencias para ${listBase.productName} (${listBase.sku}) en ${listBase.location}. Seguimiento de mínimos, reservas y movimientos.`,
    owner,
    category: listBase.sku.startsWith('PLN')
      ? 'Licencias'
      : listBase.sku.startsWith('SRV')
        ? 'Servicios'
        : 'Add-ons',
    unitCost: idx % 2 === 0 ? '$120 / u.' : '$85 / u.',
    warehouseZone: listBase.location === 'Bodega central' ? 'Zona A · Pasillo 3' : 'Zona B',
    linkedPurchaseRef: idx % 2 === 0 ? 'OC-2024-0182' : undefined,
    nextStep:
      listBase.status === 'Stock bajo' ||
      listBase.status === 'Sin stock' ||
      listBase.status === 'Quiebre de stock'
        ? { title: 'Generar solicitud de reposición', when: 'Mañana, 09:00' }
        : undefined,
    tags: [
      listBase.status === 'Stock bajo' || listBase.status === 'Quiebre de stock'
        ? 'Reposición sugerida'
        : 'Inventario activo',
      listBase.location,
    ],
    movements: (() => {
      const ledger = stockMovementsForInventory(listBase.id)
      return ledger.length > 0 ? ledger : movementsFor(listBase, id)
    })(),
    activities: buildInventoryActivitiesForDetail(listBase),
    notes: [
      {
        id: `inv-note-${id}-1`,
        body: '<p>Validar lote y ubicación en rack antes del próximo conteo.</p>',
        author: owner,
        when: '13 may, 09:30',
      },
    ],
    files: getInventoryFiles(id, owner),
    pendingActivities: (idx % 3) + 1,
    stockHealthPercent,
  }

  detail.notes = mergeEntityNotesForMock('inventario', id, detail.notes ?? [])
  return detail
}
