import { defaultCatalogSettings } from '@/lib/catalog-settings'
import type { WarehouseSetting } from '@/types/catalog-settings'

export function formatWarehouseDeliveryAddress(
  warehouse: Pick<WarehouseSetting, 'address' | 'region' | 'commune'>,
): string {
  const parts = [
    warehouse.address?.trim(),
    warehouse.commune?.trim(),
    warehouse.region?.trim(),
  ].filter(Boolean)
  return parts.join(', ')
}

/** Dirección mostrable: valor guardado o la configurada en la bodega elegida. */
export function resolveWarehouseDisplayAddress(
  warehouses: WarehouseSetting[],
  warehouseId: string | undefined,
  warehouseName: string | undefined,
  storedDeliveryAddress: string | undefined,
): string {
  const stored = storedDeliveryAddress?.trim()
  if (stored) return stored

  const id = resolveWarehouseIdFromForm(warehouses, warehouseId, warehouseName)
  const warehouse = warehouses.find((w) => w.id === id)
  return warehouse ? formatWarehouseDeliveryAddress(warehouse) : ''
}

export function warehouseHasCompleteLocation(
  warehouse: Pick<WarehouseSetting, 'address' | 'region' | 'commune'>,
): boolean {
  return Boolean(
    warehouse.address?.trim() &&
      warehouse.region?.trim() &&
      warehouse.commune?.trim(),
  )
}

export function resolveWarehouseFromStoredLabel(
  warehouses: WarehouseSetting[],
  stored: string | null | undefined,
): WarehouseSetting | undefined {
  const trimmed = stored?.trim() ?? ''
  if (!trimmed) return undefined

  const exact = warehouses.find((w) => w.name === trimmed)
  if (exact) return exact

  const lower = trimmed.toLowerCase()
  return warehouses.find(
    (w) =>
      lower === w.name.toLowerCase() ||
      lower.startsWith(`${w.name.toLowerCase()} —`) ||
      lower.startsWith(`${w.name.toLowerCase()} -`),
  )
}

export function defaultWarehouseFromCatalog(
  warehouses: WarehouseSetting[],
): WarehouseSetting | undefined {
  const pool = warehouses.filter((w) => w.active)
  if (pool.length === 0) return undefined
  return pool.find((w) => w.isDefault) ?? pool[0]
}

export function warehouseFormPatchFromSelection(
  warehouse: WarehouseSetting | undefined,
): {
  warehouseId: string
  warehouse: string
  deliveryAddress: string
} {
  if (!warehouse) {
    return { warehouseId: '', warehouse: '', deliveryAddress: '' }
  }
  return {
    warehouseId: warehouse.id,
    warehouse: warehouse.name,
    deliveryAddress: formatWarehouseDeliveryAddress(warehouse),
  }
}

export function resolveWarehouseIdFromForm(
  warehouses: WarehouseSetting[],
  warehouseId: string | undefined,
  warehouseName: string | undefined,
): string {
  if (warehouseId?.trim()) {
    const byId = warehouses.find((w) => w.id === warehouseId.trim())
    if (byId) return byId.id
  }
  const byName = resolveWarehouseFromStoredLabel(warehouses, warehouseName ?? '')
  return byName?.id ?? ''
}

export function activeWarehousesOrDefault(
  warehouses: WarehouseSetting[],
): WarehouseSetting[] {
  const active = warehouses.filter((w) => w.active)
  if (active.length > 0) return active
  return defaultCatalogSettings().warehouses.filter((w) => w.active)
}
