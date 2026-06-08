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

/** Sufijo corto para precio / periodo de cobro. */
export function billingPeriodPriceSuffix(
  billingPeriod?: string | null,
): string | null {
  const bp = billingPeriod?.trim()
  if (!bp || bp === 'Único' || bp === 'A medida' || bp === 'Por unidad') return null
  if (bp === 'Por hora') return 'hora'
  if (bp === 'Diario') return 'día'
  if (bp === 'Mensual') return 'mes'
  if (bp === 'Anual') return 'año'
  return bp.toLowerCase()
}

export function stripPriceSuffix(price: string): string {
  const trimmed = price.trim()
  if (!trimmed) return ''
  const slashIdx = trimmed.lastIndexOf('/')
  if (slashIdx <= 0) return trimmed
  return trimmed.slice(0, slashIdx).trim()
}

/** Precio de catálogo con /periodo de cobro (prioritario) o /unidad de venta si aplica. */
export function formatProductPriceDisplay(params: {
  price: string
  unitOfMeasure?: string
  customUnit?: string
  billingPeriod?: string | null
  includeSuffix?: boolean
}): string {
  const base = stripPriceSuffix(params.price)
  if (!base) return ''
  if (params.includeSuffix === false) return base

  const periodSuffix = billingPeriodPriceSuffix(params.billingPeriod)
  if (periodSuffix) return `${base}/${periodSuffix}`

  const bp = params.billingPeriod?.trim()
  if (bp === 'Por unidad' || !bp) {
    const u =
      params.unitOfMeasure === 'otra'
        ? params.customUnit?.trim() || 'u.'
        : params.unitOfMeasure?.trim() || 'ud'
    if (bp === 'Por unidad' || params.unitOfMeasure) return `${base}/${u}`
  }

  return base
}

export function formatPriceWithUnit(price: string, unit: string, customUnit?: string): string {
  return formatProductPriceDisplay({
    price,
    unitOfMeasure: unit,
    customUnit,
    billingPeriod: 'Por unidad',
  })
}

export function unitLabel(unit: string, customUnit?: string): string {
  if (unit === 'otra') return customUnit?.trim() || 'u.'
  const found = UNIT_OF_MEASURE_OPTIONS.find((o) => o.value === unit)
  return found?.label.split('(')[0]?.trim() ?? unit
}
