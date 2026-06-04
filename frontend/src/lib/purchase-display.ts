import type { PurchaseStatus } from '@/data/purchases.mock'

export function purchaseStatusVariant(
  status: PurchaseStatus,
): 'proposal' | 'negotiation' | 'customer' | 'destructive' | 'muted' | 'secondary' {
  switch (status) {
    case 'Confirmada':
      return 'customer'
    case 'Emitida':
      return 'proposal'
    case 'Borrador':
    default:
      return 'muted'
  }
}

export function purchaseStatusLabel(status: PurchaseStatus): string {
  return status
}
