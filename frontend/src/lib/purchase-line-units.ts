import type { PurchaseLineItem } from '@/data/purchase-detail.mock'
import { unitLabel } from '@/lib/product-catalog'

/** Unidades habituales en órdenes de compra (valor interno → etiqueta corta). */
export const PURCHASE_LINE_UOM_OPTIONS = [
  { value: 'unidad', label: 'UND' },
  { value: 'par', label: 'Par' },
  { value: 'caja', label: 'Caja' },
  { value: 'pack', label: 'Pack' },
  { value: 'kg', label: 'KG' },
  { value: 'g', label: 'Gramo' },
  { value: 'lb', label: 'Libra' },
  { value: 'oz', label: 'Onza' },
  { value: 'L', label: 'Litro' },
  { value: 'mL', label: 'Mililitro' },
  { value: 'm', label: 'Metro' },
  { value: 'm²', label: 'MT2' },
  { value: 'm³', label: 'MT3' },
  { value: 'hora', label: 'Hora' },
  { value: 'día', label: 'Día' },
  { value: 'mes', label: 'Mes' },
  { value: 'año', label: 'Año' },
  { value: 'licencia', label: 'Licencia' },
  { value: 'usuario', label: 'Usuario' },
  { value: 'otra', label: 'Otra' },
] as const

export function purchaseLineUnitShort(line: Pick<PurchaseLineItem, 'unitOfMeasure' | 'customUnit'>): string {
  const uom = line.unitOfMeasure?.trim()
  if (!uom) return 'UND'
  if (uom === 'otra') return line.customUnit?.trim() || 'UND'
  const found = PURCHASE_LINE_UOM_OPTIONS.find((o) => o.value === uom)
  return found?.label ?? unitLabel(uom, line.customUnit)
}

export function purchaseLineUnitSelectValue(
  line: Pick<PurchaseLineItem, 'unitOfMeasure' | 'customUnit'>,
): string {
  const uom = line.unitOfMeasure?.trim()
  if (!uom) return 'unidad'
  if (PURCHASE_LINE_UOM_OPTIONS.some((o) => o.value === uom)) return uom
  return 'otra'
}
