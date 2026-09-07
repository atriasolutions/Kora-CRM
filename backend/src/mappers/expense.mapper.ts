import type { ExpenseDetail, ExpenseListItem } from '../types/expense.js'
import { formatCentsToMoney } from '../utils/money.js'
import { formatDateLabel, toDateOnlyIso, toIsoString } from '../utils/format.js'

export type ExpenseRow = {
  id: string
  number: string
  concept: string
  category: string
  expense_date: Date | string | null
  amount_cents: string | number
  currency: string
  payment_method: string | null
  status: string
  supplier_id: string | null
  supplier_name: string
  notes: string | null
  receipt_urls: unknown
  document_type: string | null
  document_folio: string | null
  is_partner_loan: boolean | null
  partner_user_id: string | null
  partner_name: string | null
  partner_loan_returned: boolean | null
  owner_name: string | null
  created_at: Date
  created_by_id: string | null
  created_by_name: string | null
  updated_at: Date
  updated_by_id: string | null
  updated_by_name: string | null
}

export function mapExpenseRow(row: ExpenseRow): ExpenseListItem {
  const amountCents = Number(row.amount_cents)
  const notes = row.notes?.trim() || undefined
  const receiptUrls = Array.isArray(row.receipt_urls)
    ? row.receipt_urls.filter((url): url is string => typeof url === 'string' && Boolean(url.trim()))
    : []
  const isPartnerLoan = Boolean(row.is_partner_loan)
  return {
    id: row.id,
    number: row.number,
    concept: row.concept?.trim() || 'Sin concepto',
    category: row.category?.trim() || 'Otros',
    expenseDate: formatDateLabel(row.expense_date),
    expenseDateIso: toDateOnlyIso(row.expense_date),
    amount: formatCentsToMoney(amountCents),
    amountNum: amountCents / 100,
    currency: row.currency?.trim() || 'CLP',
    paymentMethod: row.payment_method?.trim() || '—',
    status: row.status,
    supplierId: row.supplier_id ?? undefined,
    supplierName: row.supplier_name?.trim() || undefined,
    owner: row.owner_name?.trim() || '—',
    notes,
    receiptUrls,
    documentType: row.document_type?.trim() || '',
    documentFolio: row.document_folio?.trim() || '',
    isPartnerLoan,
    partnerUserId: isPartnerLoan ? row.partner_user_id ?? undefined : undefined,
    partnerName: isPartnerLoan
      ? row.partner_name?.trim() || undefined
      : undefined,
    partnerLoanReturned: isPartnerLoan ? Boolean(row.partner_loan_returned) : false,
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name?.trim() || '—',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name?.trim() || '—',
  }
}

export function mapExpenseDetail(row: ExpenseRow): ExpenseDetail {
  return mapExpenseRow(row)
}
