import type {
  ExpenseCategory,
  ExpenseListItem,
  ExpensePaymentMethod,
  ExpenseStatus,
} from '@/data/expenses.mock'
import {
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_PAYMENT_METHOD_OPTIONS,
  EXPENSE_STATUS_OPTIONS,
} from '@/data/expenses.mock'
import {
  createDefaultListDateFilter,
  isListDateFilterActive,
  listDateFilterToServerQuery,
  listRowMatchesDateFilter,
  type ListDateFilter,
} from '@/lib/list-date-filter'

export type ExpenseFilters = {
  statuses: ExpenseStatus[]
  categories: ExpenseCategory[]
  paymentMethods: ExpensePaymentMethod[]
  date: ListDateFilter
}

export {
  EXPENSE_STATUS_OPTIONS,
  EXPENSE_PAYMENT_METHOD_OPTIONS,
  EXPENSE_CATEGORY_OPTIONS,
}

export function createDefaultExpenseFilters(): ExpenseFilters {
  return {
    statuses: [],
    categories: [],
    paymentMethods: [],
    date: createDefaultListDateFilter(),
  }
}

export function countActiveExpenseFilters(filters: ExpenseFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (filters.categories.length > 0) n += 1
  if (filters.paymentMethods.length > 0) n += 1
  if (isListDateFilterActive(filters.date)) n += 1
  return n
}

export function expenseRowMatchesFilters(
  row: ExpenseListItem,
  filters: ExpenseFilters,
): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) {
    return false
  }
  if (
    filters.categories.length > 0 &&
    !filters.categories.includes(row.category as ExpenseCategory)
  ) {
    return false
  }
  if (
    filters.paymentMethods.length > 0 &&
    !filters.paymentMethods.includes(row.paymentMethod as ExpensePaymentMethod)
  ) {
    return false
  }
  const dateKey = row.expenseDateIso || row.expenseDate
  if (!listRowMatchesDateFilter(dateKey, filters.date)) return false
  return true
}

export function expenseFiltersToServerQuery(
  filters: ExpenseFilters,
  options?: { mine?: boolean; ownerName?: string },
): Record<string, string> {
  const query: Record<string, string> = {
    ...listDateFilterToServerQuery(filters.date),
  }
  if (filters.statuses.length > 0) {
    query.status = filters.statuses.join(',')
  }
  if (filters.categories.length > 0) {
    query.category = filters.categories.join(',')
  }
  if (filters.paymentMethods.length > 0) {
    query.paymentMethod = filters.paymentMethods.join(',')
  }
  if (options?.mine && options.ownerName?.trim()) {
    query.ownerName = options.ownerName.trim()
  }
  return query
}

export type ExpenseSegment = {
  id: string
  name: string
  description: string
  accentClass: string
  matches: (item: ExpenseListItem) => boolean
}

export const expenseSegments: ExpenseSegment[] = [
  {
    id: 'registered',
    name: 'Registrados',
    description: 'Gastos confirmados.',
    accentClass: 'border-s-emerald-500',
    matches: (row) => row.status === 'Registrado',
  },
  {
    id: 'draft',
    name: 'Borradores',
    description: 'Pendientes de registrar.',
    accentClass: 'border-s-muted-foreground',
    matches: (row) => row.status === 'Borrador',
  },
  {
    id: 'void',
    name: 'Anulados',
    description: 'Gastos anulados.',
    accentClass: 'border-s-destructive',
    matches: (row) => row.status === 'Anulado',
  },
  {
    id: 'high-value',
    name: 'Monto > $500.000',
    description: 'Gastos de alto importe.',
    accentClass: 'border-s-violet-500',
    matches: (row) => row.amountNum >= 500000,
  },
]

export function filterExpenses(
  items: ExpenseListItem[],
  query: string,
  matches?: (item: ExpenseListItem) => boolean,
): ExpenseListItem[] {
  let rows = items
  const q = query.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (row) =>
        row.number.toLowerCase().includes(q) ||
        row.concept.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        (row.supplierName ?? '').toLowerCase().includes(q) ||
        row.owner.toLowerCase().includes(q),
    )
  }
  if (matches) rows = rows.filter(matches)
  return rows
}

export function countExpenseSegmentMatches(
  items: ExpenseListItem[],
  segment: ExpenseSegment,
): number {
  return items.filter(segment.matches).length
}
