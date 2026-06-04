/** Alias de SKUs en cotizaciones/facturas hacia SKU de inventario/catálogo. */
const SKU_ALIASES: Record<string, string> = {
  'lic-cloud-ent': 'pln-bus-01',
  'srv-impl-onb': 'srv-onb-01',
  'srv-consult': 'srv-con-10',
  'lic-soft': 'add-bi-01',
}

export function normalizeSku(value: string): string {
  return value.trim().toLowerCase()
}

export function resolveCatalogSku(sku: string): string {
  const key = normalizeSku(sku)
  return SKU_ALIASES[key] ?? sku.trim()
}
