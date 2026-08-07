import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import type {
  ExpenseCategory,
  ExpenseDetail,
  ExpenseListItem,
  ExpensePaymentMethod,
  ExpenseStatus,
} from '@/data/expenses.mock'
import { EXPENSE_PAYMENT_METHOD_OPTIONS } from '@/data/expenses.mock'
import {
  formatExpenseAmount,
  parseExpenseAmountNum,
} from '@/lib/expense-display'
import {
  normalizeExpenseReceiptUrls,
  type CreateExpenseFormValues,
} from '@/lib/expense-create'

export type ExpenseFormValues = CreateExpenseFormValues

export { EXPENSE_PAYMENT_METHOD_OPTIONS }

export function expenseDetailToFormValues(expense: ExpenseDetail): ExpenseFormValues {
  return {
    number: expense.number,
    concept: expense.concept,
    category: expense.category,
    expenseDate: expense.expenseDate,
    amount: expense.amount,
    paymentMethod: expense.paymentMethod,
    status: expense.status,
    supplierId: expense.supplierId ?? '',
    supplierName: expense.supplierName ?? '',
    ownerName: expense.owner,
    notes: expense.internalNotes ?? '',
    receiptUrlsText: (expense.receiptUrls ?? []).join('\n'),
    isPartnerLoan: Boolean(expense.isPartnerLoan),
    partnerUserId: expense.partnerUserId ?? '',
    partnerName: expense.partnerName ?? '',
    partnerLoanReturned: Boolean(expense.partnerLoanReturned),
  }
}

export function applyFormValuesToExpense(
  expense: ExpenseDetail,
  values: ExpenseFormValues,
): ExpenseDetail {
  const amountNum = parseExpenseAmountNum(values.amount)
  return stampRecordAuditOnUpdate({
    ...expense,
    concept: values.concept.trim() || 'Sin concepto',
    category: (values.category || 'Otros') as ExpenseCategory,
    expenseDate: values.expenseDate.trim(),
    amount: formatExpenseAmount(amountNum),
    amountNum,
    paymentMethod: values.paymentMethod as ExpensePaymentMethod,
    status: values.status as ExpenseStatus,
    supplierId: values.supplierId.trim() || undefined,
    supplierName: values.supplierName.trim() || undefined,
    owner: values.ownerName.trim(),
    internalNotes: values.notes.trim(),
    receiptUrls: normalizeExpenseReceiptUrls(values.receiptUrlsText),
    isPartnerLoan: values.isPartnerLoan,
    partnerUserId: values.isPartnerLoan
      ? values.partnerUserId.trim() || undefined
      : undefined,
    partnerName: values.isPartnerLoan
      ? values.partnerName.trim() || undefined
      : undefined,
    partnerLoanReturned: values.isPartnerLoan
      ? values.partnerLoanReturned
      : false,
  })
}

export function listItemFromExpenseDetail(expense: ExpenseDetail): ExpenseListItem {
  const { activities: _a, files: _f, notes: _n, internalNotes, ...rest } = expense
  return {
    ...rest,
    notes: internalNotes?.trim() || undefined,
  }
}
