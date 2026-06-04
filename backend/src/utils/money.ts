/** Convierte centavos a formato demo del frontend (ej. `$55,400`). */
export function formatCentsToMoney(cents: number | string | null | undefined): string {
  const n =
    typeof cents === 'string'
      ? Number.parseInt(cents, 10)
      : Math.round(Number(cents ?? 0))
  if (!Number.isFinite(n)) return '$0'
  return `$${Math.round(n / 100).toLocaleString('es-CL')}`
}

/** Parsea `$55,400`, `55400` o centavos numéricos → centavos. */
export function parseMoneyToCents(value: string | number | null | undefined): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 999_999 ? value : Math.round(value * 100)
  }
  const digits = value.replace(/[^\d]/g, '')
  if (!digits) return 0
  const parsed = Number.parseInt(digits, 10)
  if (value.includes('$') || value.includes('.') || value.includes(',')) {
    return parsed * 100
  }
  return parsed > 999_999 ? parsed : parsed * 100
}

export function parsePercentToInt(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Math.min(100, Math.max(0, Math.round(value)))
  const digits = value.replace(/[^\d]/g, '')
  if (!digits) return null
  return Math.min(100, Math.max(0, Number.parseInt(digits, 10)))
}

export function formatPercent(pct: number | null | undefined): string {
  if (pct == null) return '—'
  return `${pct}%`
}

export function formatDiscountPct(pct: number | string | null | undefined): string {
  const n =
    typeof pct === 'string'
      ? Number.parseFloat(pct)
      : Number(pct ?? 0)
  if (!Number.isFinite(n) || n <= 0) return '0%'
  return `${n % 1 === 0 ? n : n.toFixed(1)}%`
}

export function weightedCents(amountCents: number, probabilityPct: number | null): number {
  const pct = probabilityPct ?? 0
  return Math.round((amountCents * pct) / 100)
}
