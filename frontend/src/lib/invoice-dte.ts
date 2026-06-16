import type { InvoiceLineItem } from '@/data/invoice-detail.mock'
import { computeInvoiceTotals, invoiceLineSubjectToVat } from '@/lib/invoice-line-item'

export type InvoiceDocumentKind = 'invoice' | 'credit_note' | 'debit_note'

export type InvoiceDocumentKindFilter = InvoiceDocumentKind | 'all'

export const INVOICE_DOCUMENT_KIND_OPTIONS: {
  value: InvoiceDocumentKindFilter
  label: string
}[] = [
  { value: 'all', label: 'Todos los documentos' },
  { value: 'invoice', label: 'Facturas' },
  { value: 'credit_note', label: 'Notas de crédito' },
  { value: 'debit_note', label: 'Notas de débito' },
]

export function resolvePreviewInvoiceDteType(lineItems: InvoiceLineItem[]): 33 | 34 {
  if (lineItems.length === 0) return 33
  return lineItems.every((line) => !invoiceLineSubjectToVat(line)) ? 34 : 33
}

export function documentKindLabel(kind?: InvoiceDocumentKind): string {
  switch (kind) {
    case 'credit_note':
      return 'Nota de crédito'
    case 'debit_note':
      return 'Nota de débito'
    default:
      return 'Factura'
  }
}

export function dteTypeLabel(
  dteType: number | undefined,
  documentKind?: InvoiceDocumentKind,
): string {
  if (documentKind === 'credit_note') return 'DTE 61'
  if (documentKind === 'debit_note') return 'DTE 56'
  if (dteType === 34) return 'DTE 34'
  if (dteType === 33) return 'DTE 33'
  if (dteType === 61) return 'DTE 61'
  if (dteType === 56) return 'DTE 56'
  return resolvePreviewInvoiceDteType([]) === 34 ? 'DTE 34 (previsto)' : 'DTE 33 (previsto)'
}

export function previewDteBreakdown(
  lineItems: InvoiceLineItem[],
  options?: { globalDiscountPercent?: string; taxPercent?: number },
) {
  return computeInvoiceTotals(lineItems, options)
}

export function canCreateAdjustments(invoice: {
  documentKind?: InvoiceDocumentKind
  status: string
  siiNumber?: string
}): boolean {
  return (
    (invoice.documentKind ?? 'invoice') === 'invoice' &&
    invoice.status !== 'Borrador' &&
    invoice.status !== 'Anulada' &&
    Boolean(invoice.siiNumber?.trim())
  )
}

export function referenceCodeLabel(code?: number): string {
  switch (code) {
    case 1:
      return 'Anula documento'
    case 2:
      return 'Corrige texto'
    case 3:
      return 'Corrige montos'
    default:
      return '—'
  }
}
