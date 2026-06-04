import { formatAmountCLP, formatAmountCLPFromInput, parseAmountCLP } from '@/lib/form-input-format'
import type { ProductCurrency } from '@/lib/currency'

export function productPricePlaceholder(currency: ProductCurrency): string {
  switch (currency) {
    case 'USD':
      return '$0,00'
    case 'EUR':
      return '€0,00'
    case 'UF':
      return '0,00'
    default:
      return '$0'
  }
}

export function productPriceUsesDecimals(currency: ProductCurrency): boolean {
  return currency !== 'CLP'
}

function stripCurrencySymbols(value: string): string {
  return value.replace(/[€$]/g, '').replace(/\s*(UF|CLP|USD|EUR)\s*/gi, '').trim()
}

/** Parsea monto según moneda del producto. */
export function parseProductPrice(value: string, currency: ProductCurrency): number {
  if (!value.trim()) return 0
  if (currency === 'CLP') return parseAmountCLP(value)
  return parseDecimalProductPrice(value)
}

function parseDecimalProductPrice(value: string): number {
  let s = stripCurrencySymbols(value)
  if (!s) return 0

  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes('.')) {
    const parts = s.split('.')
    const last = parts[parts.length - 1] ?? ''
    if (parts.length > 2 || (last.length === 3 && parts.length === 2)) {
      s = s.replace(/\./g, '')
    }
  }

  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

/** Formatea número almacenado para mostrar en el campo. */
export function formatProductPriceAmount(
  amount: number,
  currency: ProductCurrency,
  options?: { allowEmpty?: boolean },
): string {
  if (amount <= 0) {
    return options?.allowEmpty ? '' : productPricePlaceholder(currency)
  }

  switch (currency) {
    case 'CLP':
      return formatAmountCLP(amount, options)
    case 'USD':
      return `$${formatDecimalDisplay(amount, 2)}`
    case 'EUR':
      return `€${formatDecimalDisplay(amount, 2)}`
    case 'UF':
      return formatDecimalDisplay(amount, 4)
  }
}

function formatDecimalDisplay(amount: number, maxDecimals: number): string {
  return amount.toLocaleString('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  })
}

function sanitizeDecimalTyping(raw: string, maxDecimals: number): string {
  let s = stripCurrencySymbols(raw)
  s = s.replace(/[^\d.,]/g, '')

  const sepIdx = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  if (sepIdx >= 0) {
    const intPart = s.slice(0, sepIdx).replace(/[.,]/g, '')
    const decPart = s.slice(sepIdx + 1).replace(/[.,]/g, '').slice(0, maxDecimals)
    const sep = s[sepIdx]
    if (decPart.length === 0 && s.endsWith(sep)) {
      return `${intPart}${sep}`
    }
    return decPart.length > 0 ? `${intPart}${sep}${decPart}` : intPart
  }

  return s.replace(/[.,]/g, '')
}

/** Normaliza texto mientras el usuario escribe. */
export function formatProductPriceFromInput(
  raw: string,
  currency: ProductCurrency,
): string {
  if (currency === 'CLP') {
    return formatAmountCLPFromInput(raw)
  }

  const maxDecimals = currency === 'UF' ? 4 : 2
  const numeric = sanitizeDecimalTyping(raw, maxDecimals)
  if (!numeric) return ''

  switch (currency) {
    case 'USD':
      return `$${numeric}`
    case 'EUR':
      return `€${numeric}`
    case 'UF':
      return numeric
    default:
      return numeric
  }
}

/** Al salir del campo, deja formato consistente. */
export function normalizeProductPriceOnBlur(
  value: string,
  currency: ProductCurrency,
): string {
  const amount = parseProductPrice(value, currency)
  if (amount <= 0) return ''
  return formatProductPriceAmount(amount, currency, { allowEmpty: true })
}
