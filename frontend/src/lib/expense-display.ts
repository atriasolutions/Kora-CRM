import type { ExpenseListItem, ExpenseStatus } from '@/data/expenses.mock'

export function expenseStatusVariant(
  status: ExpenseStatus | string,
): 'customer' | 'negotiation' | 'destructive' | 'muted' {
  switch (status) {
    case 'Registrado':
      return 'customer'
    case 'Borrador':
      return 'muted'
    case 'Anulado':
      return 'destructive'
    default:
      return 'negotiation'
  }
}

export function parseExpenseAmountNum(amount: string): number {
  return Number.parseInt(amount.replace(/[^\d]/g, ''), 10) || 0
}

export function formatExpenseAmount(value: number): string {
  return `$${value.toLocaleString('es-CL')}`
}

export function expenseSupplierDisplayName(
  expense: Pick<ExpenseListItem, 'supplierName'>,
): string {
  return expense.supplierName?.trim() || '—'
}

export function expenseObservationText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}
