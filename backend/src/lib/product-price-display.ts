/** Sufijo corto para mostrar precio / periodo de cobro (no unidad de venta). */
export function billingPeriodPriceSuffix(
  billingPeriod: string | null | undefined,
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

/** Precio de catálogo: monto + /periodo de cobro, o /unidad solo si corresponde. */
export function formatProductPriceLabel(params: {
  priceLabel: string
  unitOfMeasure?: string | null
  billingPeriod?: string | null
  includeSuffix?: boolean
}): string {
  const base = stripPriceSuffix(params.priceLabel)
  if (!base) return ''
  if (params.includeSuffix === false) return base

  const periodSuffix = billingPeriodPriceSuffix(params.billingPeriod)
  if (periodSuffix) return `${base}/${periodSuffix}`

  const bp = params.billingPeriod?.trim()
  if (bp === 'Por unidad' || !bp) {
    const unit = params.unitOfMeasure?.trim()
    if (unit) return `${base}/${unit}`
  }

  return base
}
