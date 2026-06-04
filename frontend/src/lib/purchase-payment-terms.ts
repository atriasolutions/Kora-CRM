export const PURCHASE_PAYMENT_TERMS_OPTIONS = [
  'Contado',
  'Crédito',
  'Net 15 · Transferencia',
  'Net 30 · Transferencia',
  'Net 45 · Transferencia',
  'Net 60 · Transferencia',
  '50% anticipo · 50% contra entrega',
  'Cheque a 30 días',
  'Cheque a 60 días',
  'Tarjeta corporativa',
  'Otra (especificar en notas)',
] as const

export type PurchasePaymentTerms = (typeof PURCHASE_PAYMENT_TERMS_OPTIONS)[number]

export function normalizePurchasePaymentTerms(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return PURCHASE_PAYMENT_TERMS_OPTIONS[2]
  const match = PURCHASE_PAYMENT_TERMS_OPTIONS.find(
    (opt) => opt.toLowerCase() === trimmed.toLowerCase(),
  )
  return match ?? trimmed
}
