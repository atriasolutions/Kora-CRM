/** Tipos de producto para distintos rubros (retail, food, SaaS, etc.) */
export const PRODUCT_TYPE_OPTIONS = [
  'Físico',
  'Servicio',
  'Digital',
  'Suscripción',
  'Combo',
] as const

export type ProductType = (typeof PRODUCT_TYPE_OPTIONS)[number]

/** Unidades de medida habituales; el usuario puede elegir «Otra» y escribir la suya */
export const UNIT_OF_MEASURE_OPTIONS = [
  { value: 'unidad', label: 'Unidad (u.)' },
  { value: 'par', label: 'Par' },
  { value: 'caja', label: 'Caja' },
  { value: 'pack', label: 'Pack / bulto' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'g', label: 'Gramo (g)' },
  { value: 'lb', label: 'Libra (lb)' },
  { value: 'oz', label: 'Onza (oz)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'mL', label: 'Mililitro (mL)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'm²', label: 'Metro cuadrado (m²)' },
  { value: 'm³', label: 'Metro cúbico (m³)' },
  { value: 'hora', label: 'Hora (h)' },
  { value: 'día', label: 'Día' },
  { value: 'mes', label: 'Mes' },
  { value: 'año', label: 'Año' },
  { value: 'licencia', label: 'Licencia' },
  { value: 'usuario', label: 'Usuario / asiento' },
  { value: 'otra', label: 'Otra (personalizada)' },
] as const

export const DIMENSION_UNIT_OPTIONS = ['cm', 'mm', 'm', 'in'] as const
export const WEIGHT_UNIT_OPTIONS = ['g', 'kg', 'lb', 'oz'] as const

export const PRODUCT_CATEGORY_OPTIONS = [
  'General',
  'Hardware / ferretería',
  'Alimentos',
  'Cárnicos',
  'Bebidas',
  'Software',
  'Suscripciones',
  'Servicios',
  'Add-ons',
  'Otros',
] as const

export const BILLING_PERIOD_OPTIONS = [
  'Único',
  'Por unidad',
  'Por hora',
  'Diario',
  'Mensual',
  'Anual',
  'A medida',
] as const

export type BillingPeriod = (typeof BILLING_PERIOD_OPTIONS)[number]

export function formatPriceWithUnit(price: string, unit: string, customUnit?: string): string {
  const u = unit === 'otra' ? (customUnit?.trim() || 'u.') : unit
  if (!price.trim()) return ''
  if (/medida/i.test(price)) return price
  if (price.includes('/')) return price
  return `${price}/${u}`
}

export function unitLabel(unit: string, customUnit?: string): string {
  if (unit === 'otra') return customUnit?.trim() || 'u.'
  const found = UNIT_OF_MEASURE_OPTIONS.find((o) => o.value === unit)
  return found?.label.split('(')[0]?.trim() ?? unit
}
