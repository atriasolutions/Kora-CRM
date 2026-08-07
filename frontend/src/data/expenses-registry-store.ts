import type { ExpenseListItem } from '@/data/expenses.mock'

let registrySnapshot: ExpenseListItem[] = []

export function syncRegistryExpenses(items: ExpenseListItem[]) {
  registrySnapshot = items
}

export function getRegistryExpenseById(id: string): ExpenseListItem | undefined {
  return registrySnapshot.find((row) => row.id === id)
}

export function getAllKnownExpenses(): ExpenseListItem[] {
  return registrySnapshot
}
