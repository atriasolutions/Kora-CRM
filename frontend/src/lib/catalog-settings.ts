import { isApiEnabled } from '@/api/config'
import { STORAGE_PREFIX } from '@/config/brand'
import { getCatalogSettingsSnapshot } from '@/data/catalog-settings-store'
import { INVENTORY_LOCATION_OPTIONS } from '@/data/inventory.mock'
import { PRODUCT_CATEGORY_OPTIONS } from '@/lib/product-catalog'
import type {
  CatalogSettings,
  ProductCategorySetting,
  WarehouseSetting,
} from '@/types/catalog-settings'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-catalog-settings`

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function defaultCatalogSettings(): CatalogSettings {
  const warehouses: WarehouseSetting[] = INVENTORY_LOCATION_OPTIONS.map((name, index) => ({
    id: `wh-seed-${index}`,
    name,
    code: name
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 4),
    address: '',
    region: '',
    commune: '',
    isDefault: index === 0,
    active: true,
  }))

  const productCategories: ProductCategorySetting[] = PRODUCT_CATEGORY_OPTIONS.map(
    (name, index) => ({
      id: `cat-seed-${index}`,
      name,
      active: true,
    }),
  )

  return { warehouses, productCategories }
}

export function loadCatalogSettings(): CatalogSettings {
  if (isApiEnabled()) {
    const snapshot = getCatalogSettingsSnapshot()
    if (snapshot) return snapshot
    return { warehouses: [], productCategories: [] }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultCatalogSettings()
    const parsed = JSON.parse(raw) as CatalogSettings
    if (!Array.isArray(parsed.warehouses) || !Array.isArray(parsed.productCategories)) {
      return defaultCatalogSettings()
    }
    return parsed
  } catch {
    return defaultCatalogSettings()
  }
}

export function saveCatalogSettings(settings: CatalogSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
}

export function activeWarehouseNames(warehouses: WarehouseSetting[]): string[] {
  return warehouses.filter((w) => w.active).map((w) => w.name)
}

/** Bodegas activas del catálogo (o seed), para agregados de inventario sin React. */
export function getAllWarehouseLocationNames(): string[] {
  const catalog = loadCatalogSettings()
  const names = activeWarehouseNames(catalog.warehouses)
  if (isApiEnabled()) return names
  return names.length > 0 ? names : [...INVENTORY_LOCATION_OPTIONS]
}

export function activeProductCategoryNames(
  categories: ProductCategorySetting[],
): string[] {
  return categories.filter((c) => c.active).map((c) => c.name)
}

export function normalizeWarehouseName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function validateWarehouseName(
  warehouses: WarehouseSetting[],
  name: string,
  excludeId?: string,
): string | null {
  const normalized = normalizeWarehouseName(name)
  if (!normalized) return 'El nombre de la bodega es obligatorio.'
  if (
    warehouses.some(
      (w) => w.id !== excludeId && w.name.toLowerCase() === normalized.toLowerCase(),
    )
  ) {
    return 'Ya existe una bodega con ese nombre.'
  }
  return null
}

export function validateCategoryName(
  categories: ProductCategorySetting[],
  name: string,
  excludeId?: string,
): string | null {
  const normalized = normalizeWarehouseName(name)
  if (!normalized) return 'El nombre de la categoría es obligatorio.'
  if (
    categories.some(
      (c) => c.id !== excludeId && c.name.toLowerCase() === normalized.toLowerCase(),
    )
  ) {
    return 'Ya existe una categoría con ese nombre.'
  }
  return null
}

export function validateWarehouseLocation(warehouse: Pick<
  WarehouseSetting,
  'address' | 'region' | 'commune'
>): string | null {
  const address = warehouse.address.trim()
  const region = warehouse.region.trim()
  const commune = warehouse.commune.trim()
  if (!address) return 'La dirección de la bodega es obligatoria.'
  if (!region) return 'La región de la bodega es obligatoria.'
  if (!commune) return 'La comuna de la bodega es obligatoria.'
  if (region && !commune) return 'Selecciona una comuna para la región indicada.'
  if (commune && !region) return 'Selecciona una región para la comuna indicada.'
  return null
}

export function createWarehouse(name: string): WarehouseSetting {
  const normalized = normalizeWarehouseName(name)
  return {
    id: createId('wh'),
    name: normalized,
    code: normalized
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 6),
    address: '',
    region: '',
    commune: '',
    isDefault: false,
    active: true,
  }
}

export function createProductCategory(name: string): ProductCategorySetting {
  return {
    id: createId('cat'),
    name: normalizeWarehouseName(name),
    active: true,
  }
}
