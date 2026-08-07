import { createContext } from 'react'

import type { ExpenseDetail, ExpenseListItem } from '@/data/expenses.mock'
import type { CreateExpenseFormValues } from '@/lib/expense-create'
import type { ArchivedExpenseRecord } from '@/lib/expense-archive'

export type ArchivedExpenseEntry = ArchivedExpenseRecord & {
  expense: ExpenseListItem
}

export type ExpensesRegistryContextValue = {
  userExpenses: ExpenseListItem[]
  allExpenses: ExpenseListItem[]
  archivedExpenses: ArchivedExpenseEntry[]
  findById: (id: string) => ExpenseListItem | undefined
  addExpense: (values: CreateExpenseFormValues) => Promise<ExpenseListItem>
  updateExpenseFromDetail: (detail: ExpenseDetail) => Promise<void>
  patchExpenseStatus: (id: string, status: string) => Promise<ExpenseDetail>
  archiveExpense: (id: string) => Promise<void>
  archiveExpenses: (ids: string[]) => Promise<void>
  restoreExpense: (id: string) => Promise<void>
  restoreExpenses: (ids: string[]) => Promise<void>
  permanentlyDeleteExpense: (id: string) => Promise<void>
  permanentlyDeleteExpenses: (ids: string[]) => Promise<void>
  isArchived: (id: string) => boolean
  reloadFromApi: () => Promise<void>
}

export const ExpensesRegistryContext = createContext<ExpensesRegistryContextValue | null>(
  null,
)
