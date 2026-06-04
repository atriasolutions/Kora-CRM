import type { StockReceiptStatus } from '@/data/stock-receipts.mock'

export function stockReceiptStatusVariant(
  status: StockReceiptStatus,
): 'proposal' | 'negotiation' | 'customer' | 'destructive' | 'muted' {
  return status === 'Confirmado' ? 'customer' : 'proposal'
}
