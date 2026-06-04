import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { InventoryDetail, InventoryMovementLine } from '@/data/inventory-detail.mock'
import type { InventoryListItem } from '@/data/inventory.mock'
import {
  aggregateInventoryProducts,
  isInventoryProductId,
  skuFromInventoryProductId,
} from '@/lib/inventory-aggregate'
import { buildInventoryDetailFromProductSummary } from '@/lib/inventory-product-detail'
import { normalizeSku } from '@/lib/stock-sku'

const BASE = `${API_V1}/inventory`

export async function listInventoryApi(): Promise<InventoryListItem[]> {
  return fetchAllPages<InventoryListItem>(BASE)
}

async function fetchInventoryPositionDetail(positionId: string): Promise<InventoryDetail> {
  const res = await fetchJSON<ApiItemResponse<InventoryDetail>>(`${BASE}/${positionId}`)
  return res.data
}

async function loadMergedMovementsForSku(
  positions: InventoryListItem[],
): Promise<InventoryMovementLine[]> {
  if (positions.length === 0) return []

  const details = await Promise.all(
    positions.map((row) => fetchInventoryPositionDetail(row.id)),
  )

  const merged: InventoryMovementLine[] = []
  for (let i = 0; i < details.length; i++) {
    const detail = details[i]!
    const location = positions[i]!.location
    const suffix =
      positions.length > 1 ? ` · ${location}` : ''
    for (const mv of detail.movements ?? []) {
      merged.push({
        ...mv,
        reference: `${mv.reference}${suffix}`,
      })
    }
  }

  return merged.sort((a, b) => b.when.localeCompare(a.when, 'es'))
}

/** Detalle consolidado por SKU (misma lógica que la lista). */
export async function getInventoryProductDetailApi(productId: string): Promise<InventoryDetail> {
  const sku = skuFromInventoryProductId(productId)
  if (!sku) {
    throw new Error('Identificador de producto de inventario no válido.')
  }

  const rows = await listInventoryApi()
  const matching = rows.filter((r) => normalizeSku(r.sku) === normalizeSku(sku))
  if (matching.length === 0) {
    throw new Error('Producto no encontrado en inventario.')
  }

  const summaries = aggregateInventoryProducts(matching)
  const summary = summaries[0]
  if (!summary) {
    throw new Error('No se pudo consolidar el inventario del producto.')
  }

  const movements = await loadMergedMovementsForSku(matching)
  const primaryPosition = await fetchInventoryPositionDetail(matching[0]!.id)
  return buildInventoryDetailFromProductSummary(summary, movements, {
    ...matching[0]!,
    id: matching[0]!.id,
    category: primaryPosition.category ?? '',
    owner: primaryPosition.owner ?? '—',
    unitCost: primaryPosition.unitCost ?? '',
  })
}

export async function getInventoryApi(id: string): Promise<InventoryDetail> {
  if (isInventoryProductId(id)) {
    return getInventoryProductDetailApi(id)
  }

  return fetchInventoryPositionDetail(id)
}

export async function updateInventoryApi(
  id: string,
  body: {
    quantityNum?: number
    minStockNum?: number
    status?: string
  },
): Promise<InventoryDetail> {
  const res = await fetchJSON<ApiItemResponse<InventoryDetail>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function adjustInventoryApi(
  id: string,
  body: { quantityDelta: number; note?: string },
): Promise<InventoryDetail> {
  const res = await fetchJSON<ApiItemResponse<InventoryDetail>>(
    `${BASE}/${id}/adjust`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return res.data
}

/** Posición de inventario (fila por bodega) para un SKU y nombre de bodega. */
export async function findInventoryPositionIdApi(
  sku: string,
  warehouseName: string,
): Promise<string | undefined> {
  const rows = await listInventoryApi()
  const targetSku = normalizeSku(sku)
  const targetLoc = warehouseName.trim().toLowerCase()
  return rows.find(
    (row) =>
      normalizeSku(row.sku) === targetSku &&
      row.location.trim().toLowerCase() === targetLoc,
  )?.id
}
