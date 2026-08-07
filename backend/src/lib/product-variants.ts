export type VariantOption = {
  name: string
  values: string[]
}

export type VariantAttributes = Record<string, string>

export type ProductVariantKind = 'simple' | 'parent' | 'variant'

export function normalizeVariantOptions(
  raw: unknown,
): VariantOption[] {
  if (!Array.isArray(raw)) return []
  const options: VariantOption[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const name = String((item as { name?: unknown }).name ?? '').trim()
    const valuesRaw = (item as { values?: unknown }).values
    if (!name || !Array.isArray(valuesRaw)) continue
    const values = [
      ...new Set(
        valuesRaw
          .map((v) => String(v ?? '').trim())
          .filter(Boolean),
      ),
    ]
    if (values.length === 0) continue
    options.push({ name, values })
  }
  return options
}

export function normalizeVariantAttributes(
  raw: unknown,
): VariantAttributes {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: VariantAttributes = {}
  for (const [key, value] of Object.entries(raw)) {
    const k = key.trim()
    const v = String(value ?? '').trim()
    if (k && v) out[k] = v
  }
  return out
}

/** Producto cartesiano de opciones → lista de atributos. */
export function generateVariantCombinations(
  options: VariantOption[],
): VariantAttributes[] {
  const normalized = normalizeVariantOptions(options)
  if (normalized.length === 0) return []

  let combos: VariantAttributes[] = [{}]
  for (const opt of normalized) {
    const next: VariantAttributes[] = []
    for (const base of combos) {
      for (const value of opt.values) {
        next.push({ ...base, [opt.name]: value })
      }
    }
    combos = next
  }
  return combos
}

function slugPart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8)
}

/** SKU sugerido: FAMILIA-COLOR-TALLA (máx 64). */
export function suggestVariantSku(
  parentSku: string,
  attributes: VariantAttributes,
  optionOrder?: string[],
): string {
  const base = parentSku.trim() || 'VAR'
  const keys =
    optionOrder && optionOrder.length > 0
      ? optionOrder
      : Object.keys(attributes)
  const parts = keys
    .map((k) => slugPart(attributes[k] ?? ''))
    .filter(Boolean)
  const sku = [base, ...parts].join('-')
  return sku.slice(0, 64)
}

export function formatVariantLabel(
  parentName: string,
  attributes: VariantAttributes,
  optionOrder?: string[],
): string {
  const keys =
    optionOrder && optionOrder.length > 0
      ? optionOrder
      : Object.keys(attributes)
  const parts = keys
    .map((k) => attributes[k]?.trim())
    .filter(Boolean)
  if (parts.length === 0) return parentName.trim()
  return `${parentName.trim()} · ${parts.join(' · ')}`
}

export function resolveVariantKind(input: {
  parentProductId?: string | null
  variantsCount?: number
}): ProductVariantKind {
  if (input.parentProductId) return 'variant'
  if ((input.variantsCount ?? 0) > 0) return 'parent'
  return 'simple'
}

/** Solo simples y variedades se venden / ingresan stock. */
export function isSellableProduct(input: {
  parentProductId?: string | null
  variantsCount?: number
}): boolean {
  return resolveVariantKind(input) !== 'parent'
}

export type InventoryFamilyLeaf = {
  productId: string
  sku: string
  productName: string
  attributes: VariantAttributes
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  warehouseId?: string | null
  warehouseName?: string
}

export type InventoryFamilyNode = {
  key: string
  label: string
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  children?: InventoryFamilyNode[]
  leaf?: InventoryFamilyLeaf
}

/**
 * Agrupa posiciones de variedades por ejes de atributos del padre.
 * Ejemplo: Color → Talla → SKU.
 */
export function groupInventoryByFamily(
  leaves: InventoryFamilyLeaf[],
  optionOrder: string[],
): InventoryFamilyNode[] {
  if (leaves.length === 0) return []

  function nest(
    items: InventoryFamilyLeaf[],
    depth: number,
  ): InventoryFamilyNode[] {
    if (depth >= optionOrder.length) {
      return items.map((leaf) => ({
        key: `sku:${leaf.sku}:${leaf.warehouseId ?? ''}`,
        label: leaf.sku,
        quantityOnHand: leaf.quantityOnHand,
        quantityReserved: leaf.quantityReserved,
        quantityAvailable: leaf.quantityAvailable,
        leaf,
      }))
    }

    const axis = optionOrder[depth]!
    const buckets = new Map<string, InventoryFamilyLeaf[]>()
    for (const item of items) {
      const value = item.attributes[axis]?.trim() || '—'
      const list = buckets.get(value) ?? []
      list.push(item)
      buckets.set(value, list)
    }

    return [...buckets.entries()].map(([value, group]) => {
      const children = nest(group, depth + 1)
      return {
        key: `${axis}:${value}`,
        label: `${axis}: ${value}`,
        quantityOnHand: children.reduce((s, c) => s + c.quantityOnHand, 0),
        quantityReserved: children.reduce((s, c) => s + c.quantityReserved, 0),
        quantityAvailable: children.reduce(
          (s, c) => s + c.quantityAvailable,
          0,
        ),
        children,
      }
    })
  }

  const children = nest(leaves, 0)
  return [
    {
      key: 'family',
      label: 'Total',
      quantityOnHand: children.reduce((s, c) => s + c.quantityOnHand, 0),
      quantityReserved: children.reduce((s, c) => s + c.quantityReserved, 0),
      quantityAvailable: children.reduce(
        (s, c) => s + c.quantityAvailable,
        0,
      ),
      children,
    },
  ]
}
