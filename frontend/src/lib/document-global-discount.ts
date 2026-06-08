/** Descuento global sobre el subtotal de líneas (distinto al descuento por línea). */

export function parseGlobalDiscountPercent(value: string | number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, Math.round(value)))
  }
  const n = Number.parseInt(String(value ?? '').replace(/[^\d]/g, ''), 10)
  return Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n))
}

export function formatGlobalDiscountPercent(pct: number): string {
  return `${Math.min(100, Math.max(0, Math.round(pct)))}%`
}

export const DEFAULT_GLOBAL_DISCOUNT = '0%'
