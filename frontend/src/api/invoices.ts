import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { InvoiceDetail } from '@/data/invoice-detail.mock'
import type { InvoiceListItem } from '@/data/invoices.mock'
import type { CreateInvoiceFormValues } from '@/lib/invoice-create'
import { computeInvoiceTotals } from '@/lib/invoice-line-item'
import type { InvoiceLineItem } from '@/data/invoice-detail.mock'
import { normalizeProductCurrency } from '@/lib/currency'
import { parseProductPrice } from '@/lib/product-currency-input'
import { parseMoneyNum } from '@/lib/product-pricing'

const BASE = `${API_V1}/invoices`

export type InvoiceApiBody = {
  number?: string
  customerKind?: string
  companyId?: string
  companyName?: string
  contactId?: string
  contactName?: string
  quoteId?: string
  amount?: string
  amountNum?: number
  issueDate?: string
  dueDate?: string
  status?: string
  ownerName?: string
  paymentMethod?: string
  siiNumber?: string
  globalDiscount?: string
  lineItems?: {
    productId?: string
    sku?: string
    productName?: string
    description?: string
    quantity?: number
    unitPrice?: string
    unitPriceOriginal?: number
    priceCurrency?: string
    discount?: string
  }[]
}

function invoiceLineOriginalAmount(li: InvoiceLineItem): number {
  if (li.unitPriceOriginalNum != null && Number.isFinite(li.unitPriceOriginalNum)) {
    return li.unitPriceOriginalNum
  }
  const currency = normalizeProductCurrency(li.priceCurrency)
  if (li.unitPriceOriginal?.trim()) {
    return parseProductPrice(li.unitPriceOriginal, currency)
  }
  return parseMoneyNum(li.unitPrice)
}

function lineItemsToApi(lineItems: InvoiceLineItem[]) {
  return lineItems
    .filter((li) => li.description.trim() && li.quantity > 0)
    .map((li) => ({
      productId: li.productId?.trim() || undefined,
      sku: li.sku.trim() || undefined,
      productName: li.description,
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      unitPriceOriginal: invoiceLineOriginalAmount(li),
      priceCurrency: li.priceCurrency ?? 'CLP',
      discount: li.discount,
      subjectToVat: li.subjectToVat !== false,
      deferredPayment: li.deferredPayment === true,
      deferredPaymentText: li.deferredPaymentText?.trim() || undefined,
    }))
}

export function invoiceFormToApiBody(values: CreateInvoiceFormValues): InvoiceApiBody {
  const totals = computeInvoiceTotals(values.lineItems, {
    globalDiscountPercent: values.globalDiscountPercent,
  })
  return {
    customerKind: values.customerKind,
    companyId: values.companyId.trim() || undefined,
    companyName: values.companyName.trim() || undefined,
    contactId: values.contactId.trim() || undefined,
    contactName: values.contactName.trim() || undefined,
    quoteId:
      values.invoiceSource === 'cotizacion' ? values.quoteId.trim() || undefined : undefined,
    amount: totals.amount,
    amountNum: totals.amountNum,
    issueDate: values.issueDate.trim() || undefined,
    dueDate: values.dueDate.trim(),
    status: values.status,
    ownerName: values.ownerName.trim() || undefined,
    paymentMethod: values.paymentMethod,
    globalDiscount: values.globalDiscountPercent.trim() || undefined,
    lineItems: lineItemsToApi(values.lineItems),
  }
}

function resolveInvoiceGlobalDiscount(detail: InvoiceDetail): string | undefined {
  return (
    detail.discountPercent ??
    (detail as InvoiceDetail & { globalDiscount?: string }).globalDiscount
  )
}

export function invoiceDetailToApiBody(detail: InvoiceDetail): InvoiceApiBody {
  const globalDiscount = resolveInvoiceGlobalDiscount(detail)
  const totals = computeInvoiceTotals(detail.lineItems, {
    globalDiscountPercent: globalDiscount,
  })
  return {
    customerKind: detail.customerKind,
    companyId: detail.companyId,
    companyName: detail.companyName,
    contactId: detail.contactId,
    contactName: detail.contactName,
    quoteId: detail.quoteId,
    amount: totals.amount,
    amountNum: totals.amountNum,
    issueDate: detail.issueDate,
    dueDate: detail.dueDate,
    status: detail.status,
    ownerName: detail.owner,
    paymentMethod: detail.paymentMethod,
    siiNumber: detail.siiNumber,
    globalDiscount,
    lineItems: lineItemsToApi(detail.lineItems),
  }
}

export async function listInvoicesApi(archived: boolean): Promise<InvoiceListItem[]> {
  return fetchAllPages<InvoiceListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
}

/** Facturas vinculadas a una empresa (ficha empresa, resumen comercial). */
export async function listInvoicesForCompanyApi(
  companyId: string,
): Promise<InvoiceListItem[]> {
  const id = companyId.trim()
  if (!id) return []
  return fetchAllPages<InvoiceListItem>(BASE, {
    companyId: id,
    archived: 'false',
  })
}

/** Facturas vinculadas a una cotización (ficha cotización). */
export async function listInvoicesForQuoteApi(
  quoteId: string,
): Promise<InvoiceListItem[]> {
  const id = quoteId.trim()
  if (!id) return []
  return fetchAllPages<InvoiceListItem>(BASE, {
    quoteId: id,
    archived: 'false',
  })
}

export async function getInvoiceApi(id: string): Promise<InvoiceDetail> {
  const res = await fetchJSON<ApiItemResponse<InvoiceDetail>>(`${BASE}/${id}`)
  return res.data
}

export async function createInvoiceApi(body: InvoiceApiBody): Promise<InvoiceDetail> {
  const res = await fetchJSON<ApiItemResponse<InvoiceDetail>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateInvoiceApi(
  id: string,
  body: Partial<InvoiceApiBody>,
): Promise<InvoiceDetail> {
  const res = await fetchJSON<ApiItemResponse<InvoiceDetail>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function archiveInvoiceApi(id: string): Promise<InvoiceListItem> {
  const res = await fetchJSON<ApiItemResponse<InvoiceListItem>>(
    `${BASE}/${id}/archive`,
    { method: 'POST' },
  )
  return res.data
}

export async function restoreInvoiceApi(id: string): Promise<InvoiceListItem> {
  const res = await fetchJSON<ApiItemResponse<InvoiceListItem>>(
    `${BASE}/${id}/restore`,
    { method: 'POST' },
  )
  return res.data
}

export async function permanentlyDeleteInvoiceApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}

/** Actualización ligera al cambiar etapa (sin reescribir líneas). */
export async function patchInvoiceStatusApi(
  id: string,
  patch: { status: string; siiNumber?: string },
): Promise<InvoiceDetail> {
  const res = await fetchJSON<ApiItemResponse<InvoiceDetail>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return res.data
}

export type CreateInvoiceAdjustmentBody = {
  mode: 'full' | 'partial'
  referenceReason: string
  referenceCode?: 1 | 2 | 3
  lineItems?: { id?: string; quantity?: number; unitPrice?: string; discount?: string }[]
}

export async function createCreditNoteApi(
  sourceInvoiceId: string,
  body: CreateInvoiceAdjustmentBody,
): Promise<InvoiceDetail> {
  const res = await fetchJSON<ApiItemResponse<InvoiceDetail>>(
    `${BASE}/${sourceInvoiceId}/credit-notes`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function createDebitNoteApi(
  sourceInvoiceId: string,
  body: CreateInvoiceAdjustmentBody,
): Promise<InvoiceDetail> {
  const res = await fetchJSON<ApiItemResponse<InvoiceDetail>>(
    `${BASE}/${sourceInvoiceId}/debit-notes`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function listInvoiceAdjustmentsApi(
  sourceInvoiceId: string,
): Promise<InvoiceListItem[]> {
  const res = await fetchJSON<ApiItemResponse<InvoiceListItem[]>>(
    `${BASE}/${sourceInvoiceId}/adjustments`,
  )
  return res.data
}
