import type { InvoiceStatus } from '@/data/invoices.mock'

/** Estado «Emitida» en la ruta del éxito (etiqueta UI). */
export const INVOICE_EMITTED_STATUS: InvoiceStatus = 'Pendiente'

export function invoiceRequiresSiiNumber(status: InvoiceStatus): boolean {
  return status === 'Pendiente' || status === 'Pagada' || status === 'Vencida'
}

export function validateSiiInvoiceNumber(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'El folio SII es obligatorio al emitir la factura.'
  }
  const digits = trimmed.replace(/\./g, '').replace(/\s/g, '')
  if (!/^\d{1,12}$/.test(digits)) {
    return 'Ingresa el folio numérico del DTE emitido en el SII (hasta 12 dígitos).'
  }
  return null
}

export function normalizeSiiInvoiceNumber(value: string): string {
  return value.trim().replace(/\./g, '').replace(/\s/g, '')
}

export function formatSiiInvoiceNumberDisplay(value: string): string {
  const n = normalizeSiiInvoiceNumber(value)
  if (n.length <= 3) return n
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
