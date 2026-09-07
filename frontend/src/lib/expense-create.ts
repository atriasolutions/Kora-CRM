import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import type {
  ExpenseCategory,
  ExpenseDetail,
  ExpenseListItem,
  ExpensePaymentMethod,
  ExpenseStatus,
} from '@/data/expenses.mock'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHOD_OPTIONS,
} from '@/data/expenses.mock'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import { formatExpenseAmount, parseExpenseAmountNum } from '@/lib/expense-display'
import { formatPurchaseDisplayDate } from '@/lib/purchase-dates'

export type CreateExpenseFormValues = {
  number: string
  concept: string
  category: ExpenseCategory | string
  expenseDate: string
  amount: string
  paymentMethod: ExpensePaymentMethod | string
  status: ExpenseStatus
  supplierId: string
  supplierName: string
  ownerName: string
  notes: string
  receiptUrlsText: string
  documentType: string
  documentFolio: string
  isPartnerLoan: boolean
  partnerUserId: string
  partnerName: string
  partnerLoanReturned: boolean
}

export function createDefaultExpenseFormValues(
  partial?: Partial<CreateExpenseFormValues>,
): CreateExpenseFormValues {
  return {
    number: '',
    concept: '',
    category: 'Otros',
    expenseDate: formatPurchaseDisplayDate(new Date()),
    amount: '$0',
    paymentMethod: 'Transferencia',
    status: 'Registrado',
    supplierId: '',
    supplierName: '',
    ownerName: getDefaultOwnerName(),
    notes: '',
    receiptUrlsText: '',
    documentType: '',
    documentFolio: '',
    isPartnerLoan: false,
    partnerUserId: '',
    partnerName: '',
    partnerLoanReturned: false,
    ...partial,
  }
}

export function generateExpenseNumber(): string {
  const suffix = String(Date.now()).slice(-4)
  return `GAS-${new Date().getFullYear()}-${suffix}`
}

export function validateCreateExpenseForm(values: CreateExpenseFormValues): string | null {
  if (!values.concept.trim()) {
    return 'Indica el concepto del gasto.'
  }
  if (parseExpenseAmountNum(values.amount) <= 0) {
    return 'El monto debe ser mayor a cero.'
  }
  if (
    values.category &&
    !(EXPENSE_CATEGORIES as readonly string[]).includes(values.category)
  ) {
    return 'Selecciona una categoría válida.'
  }
  try {
    normalizeExpenseReceiptUrls(values.receiptUrlsText)
  } catch {
    return 'Revisa las URLs de comprobantes. Ingresa una URL válida por línea.'
  }
  if (values.isPartnerLoan) {
    if (!values.partnerUserId.trim() && !values.partnerName.trim()) {
      return 'Indica el socio a quien se debe devolver el préstamo.'
    }
  }
  return null
}

export function normalizeExpenseReceiptUrls(value: string): string[] {
  const unique = new Set<string>()
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    new URL(normalized)
    unique.add(normalized)
  }
  if (unique.size > 20) throw new Error('Máximo 20 comprobantes')
  return [...unique]
}

export function createExpenseId(): string {
  return `gasto-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function formValuesToExpenseListItem(
  values: CreateExpenseFormValues,
  id = createExpenseId(),
): ExpenseListItem {
  const amountNum = parseExpenseAmountNum(values.amount)
  return stampRecordAuditOnCreate({
    id,
    number: values.number.trim() || generateExpenseNumber(),
    concept: values.concept.trim() || 'Sin concepto',
    category: values.category || 'Otros',
    expenseDate: values.expenseDate.trim() || '—',
    amount: formatExpenseAmount(amountNum),
    amountNum,
    currency: 'CLP',
    paymentMethod: values.paymentMethod || 'Transferencia',
    status: values.status,
    supplierId: values.supplierId.trim() || undefined,
    supplierName: values.supplierName.trim() || undefined,
    owner: values.ownerName.trim(),
    notes: values.notes.trim() || undefined,
    receiptUrls: normalizeExpenseReceiptUrls(values.receiptUrlsText),
    documentType: values.documentType.trim() || '',
    documentFolio: values.documentFolio.trim() || '',
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

export function formValuesToExpenseDetail(
  values: CreateExpenseFormValues,
  id = createExpenseId(),
): ExpenseDetail {
  const list = formValuesToExpenseListItem(values, id)
  const { notes: listNotes, ...rest } = list
  return {
    ...rest,
    internalNotes: values.notes.trim() || listNotes || '',
    activities: [],
    notes: [],
    files: [],
  }
}

export { EXPENSE_PAYMENT_METHOD_OPTIONS }
