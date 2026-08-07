/** Formato compacto para ejes/tooltips de dashboard (evita cortes tipo 2200k). */

export function formatCompactChartMoney(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)

  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000
    const rounded =
      millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10
    const label = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1).replace(/\.0$/, '')
    return `${sign}${label}M`
  }

  if (abs >= 10_000) {
    return `${sign}${Math.round(abs / 1_000)}k`
  }

  if (abs >= 1_000) {
    const thousands = abs / 1_000
    const rounded = Math.round(thousands * 10) / 10
    const label = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1).replace(/\.0$/, '')
    return `${sign}${label}k`
  }

  return `${sign}${Math.round(abs)}`
}

export function formatChartMoneyTooltip(value: number): string {
  if (!Number.isFinite(value)) return '$0'
  return `$${Math.round(value).toLocaleString('es-CL')}`
}
