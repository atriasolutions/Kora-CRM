import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { ExpenseDetail, ExpenseListItem } from '@/data/expenses.mock'
import {
  normalizeExpenseReceiptUrls,
  type CreateExpenseFormValues,
} from '@/lib/expense-create'
import { parseExpenseAmountNum, formatExpenseAmount } from '@/lib/expense-display'

const BASE = `${API_V1}/expenses`

type ExpenseApiPayload = ExpenseDetail & {
  notes?: string | ExpenseDetail['notes']
}

function asTrimmedString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

function asMoneyString(value: unknown, fallback = '$0'): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatExpenseAmount(Math.round(value))
  }
  return fallback
}

function normalizeExpenseApiDetail(data: ExpenseApiPayload): ExpenseDetail {
  const { notes, activities, files, ...rest } = data
  const internalNotes =
    asTrimmedString(rest.internalNotes) ||
    (typeof notes === 'string' ? notes.trim() : '')
  const { notes: _listNotes, ...listRest } = rest as ExpenseDetail & {
    notes?: string
  }
  return {
    ...listRest,
    concept: asTrimmedString(listRest.concept) || 'Sin concepto',
    category: asTrimmedString(listRest.category) || 'Otros',
    owner: asTrimmedString(listRest.owner) || '—',
    paymentMethod: asTrimmedString(listRest.paymentMethod) || '—',
    expenseDate: asTrimmedString(listRest.expenseDate) || '—',
    expenseDateIso: asTrimmedString(listRest.expenseDateIso) || undefined,
    amount: asMoneyString(listRest.amount, '$0'),
    amountNum:
      typeof listRest.amountNum === 'number' && Number.isFinite(listRest.amountNum)
        ? listRest.amountNum
        : parseExpenseAmountNum(asMoneyString(listRest.amount)),
    currency: asTrimmedString(listRest.currency) || 'CLP',
    supplierName: asTrimmedString(listRest.supplierName) || undefined,
    receiptUrls: Array.isArray(listRest.receiptUrls)
      ? listRest.receiptUrls.filter((url): url is string => typeof url === 'string')
      : [],
    isPartnerLoan: Boolean(listRest.isPartnerLoan),
    partnerUserId: asTrimmedString(listRest.partnerUserId) || undefined,
    partnerName: asTrimmedString(listRest.partnerName) || undefined,
    partnerLoanReturned: Boolean(listRest.partnerLoanReturned),
    internalNotes,
    notes: Array.isArray(notes) ? notes : [],
    activities: activities ?? [],
    files: files ?? [],
  }
}

export type ExpenseApiBody = {
  number?: string
  concept?: string
  category?: string
  expenseDate?: string
  amount?: string
  amountNum?: number
  currency?: string
  paymentMethod?: string
  status?: string
  supplierId?: string | null
  supplierName?: string
  notes?: string
  receiptUrls?: string[]
  isPartnerLoan?: boolean
  partnerUserId?: string | null
  partnerName?: string
  partnerLoanReturned?: boolean
  ownerName?: string
}

export function expenseFormToApiBody(values: CreateExpenseFormValues): ExpenseApiBody {
  const amountNum = parseExpenseAmountNum(values.amount)
  return {
    concept: values.concept.trim() || undefined,
    category: values.category || undefined,
    expenseDate: values.expenseDate.trim() || undefined,
    amount: values.amount.trim() || undefined,
    amountNum,
    currency: 'CLP',
    paymentMethod: values.paymentMethod,
    status: values.status,
    supplierId: values.supplierId.trim() || undefined,
    supplierName: values.supplierName.trim() || undefined,
    notes: values.notes.trim() || undefined,
    receiptUrls: normalizeExpenseReceiptUrls(values.receiptUrlsText),
    isPartnerLoan: values.isPartnerLoan,
    partnerUserId: values.isPartnerLoan
      ? values.partnerUserId.trim() || null
      : null,
    partnerName: values.isPartnerLoan
      ? values.partnerName.trim() || undefined
      : '',
    partnerLoanReturned: values.isPartnerLoan
      ? values.partnerLoanReturned
      : false,
    ownerName: values.ownerName.trim() || undefined,
  }
}

export function expenseDetailToApiBody(detail: ExpenseDetail): ExpenseApiBody {
  return {
    concept: detail.concept.trim() || undefined,
    category: detail.category || undefined,
    expenseDate: detail.expenseDate,
    amount: detail.amount,
    amountNum: detail.amountNum,
    currency: detail.currency || 'CLP',
    paymentMethod: detail.paymentMethod,
    status: detail.status,
    supplierId: detail.supplierId,
    supplierName: detail.supplierName,
    notes: detail.internalNotes || undefined,
    receiptUrls: detail.receiptUrls ?? [],
    isPartnerLoan: Boolean(detail.isPartnerLoan),
    partnerUserId: detail.isPartnerLoan
      ? detail.partnerUserId ?? null
      : null,
    partnerName: detail.isPartnerLoan ? detail.partnerName : '',
    partnerLoanReturned: detail.isPartnerLoan
      ? Boolean(detail.partnerLoanReturned)
      : false,
    ownerName: detail.owner,
  }
}

export async function listExpensesApi(archived: boolean): Promise<ExpenseListItem[]> {
  return fetchAllPages<ExpenseListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
}

export async function getExpenseApi(id: string): Promise<ExpenseDetail> {
  const res = await fetchJSON<ApiItemResponse<ExpenseApiPayload>>(`${BASE}/${id}`)
  return normalizeExpenseApiDetail(res.data)
}

export async function createExpenseApi(body: ExpenseApiBody): Promise<ExpenseDetail> {
  const res = await fetchJSON<ApiItemResponse<ExpenseApiPayload>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizeExpenseApiDetail(res.data)
}

export async function updateExpenseApi(
  id: string,
  body: Partial<ExpenseApiBody>,
): Promise<ExpenseDetail> {
  const res = await fetchJSON<ApiItemResponse<ExpenseApiPayload>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizeExpenseApiDetail(res.data)
}

export async function archiveExpenseApi(id: string): Promise<ExpenseListItem> {
  const res = await fetchJSON<ApiItemResponse<ExpenseListItem>>(`${BASE}/${id}/archive`, {
    method: 'POST',
  })
  return res.data
}

export async function restoreExpenseApi(id: string): Promise<ExpenseListItem> {
  const res = await fetchJSON<ApiItemResponse<ExpenseListItem>>(`${BASE}/${id}/restore`, {
    method: 'POST',
  })
  return res.data
}

export async function permanentlyDeleteExpenseApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}

export async function patchExpenseStatusApi(
  id: string,
  patch: { status: string },
): Promise<ExpenseDetail> {
  const res = await fetchJSON<ApiItemResponse<ExpenseApiPayload>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return normalizeExpenseApiDetail(res.data)
}
