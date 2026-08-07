import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { BoletaDetail } from '@/data/boleta-detail.mock'
import type { BoletaListItem } from '@/data/boletas.mock'
import type { CreateBoletaFormValues } from '@/lib/boleta-create'
import { computeInvoiceTotals } from '@/lib/invoice-line-item'
import type { InvoiceLineItem } from '@/data/invoice-detail.mock'
import { normalizeProductCurrency } from '@/lib/currency'
import { parseProductPrice } from '@/lib/product-currency-input'
import { parseMoneyNum, formatMoneyCLP } from '@/lib/product-pricing'

const BASE = `${API_V1}/boletas`

type BoletaApiPayload = BoletaDetail & {
  notes?: string | BoletaDetail['notes']
}

function asTrimmedString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

function asMoneyString(value: unknown, fallback = ''): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatMoneyCLP(Math.round(value))
  }
  return fallback
}

function normalizeBoletaLineItems(lineItems: InvoiceLineItem[] | undefined): InvoiceLineItem[] {
  return (lineItems ?? []).map((li) => ({
    ...li,
    sku: asTrimmedString(li.sku),
    description: asTrimmedString(li.description) || asTrimmedString(li.sku) || 'Ítem',
    unitPrice: asMoneyString(li.unitPrice, '$0'),
    total: asMoneyString(li.total, '$0'),
    discount:
      typeof li.discount === 'string'
        ? li.discount
        : `${Number(li.discount) || 0}%`,
    deferredPaymentText: li.deferredPaymentText
      ? asTrimmedString(li.deferredPaymentText)
      : undefined,
  }))
}

function normalizeBoletaApiDetail(data: BoletaApiPayload): BoletaDetail {
  const { notes, lineItems, activities, statusHistory, files, description, subtotal, taxPercent, ...rest } =
    data
  const internalNotes =
    asTrimmedString(rest.internalNotes) ||
    (typeof notes === 'string' ? notes.trim() : '')
  return {
    ...rest,
    buyerName: asTrimmedString(rest.buyerName) || 'Sin comprador',
    buyerTaxId: asTrimmedString(rest.buyerTaxId) || undefined,
    contactName: asTrimmedString(rest.contactName) || undefined,
    companyName: asTrimmedString(rest.companyName) || undefined,
    owner: asTrimmedString(rest.owner) || '—',
    paymentMethod: asTrimmedString(rest.paymentMethod) || '—',
    issueDate: asTrimmedString(rest.issueDate) || '—',
    amount: asMoneyString(rest.amount, '$0'),
    globalDiscount: rest.globalDiscount != null ? asTrimmedString(rest.globalDiscount) : undefined,
    lineItems: normalizeBoletaLineItems(lineItems),
    activities: activities ?? [],
    statusHistory: statusHistory ?? [],
    files: files ?? [],
    description: asTrimmedString(description),
    subtotal: asMoneyString(subtotal, asMoneyString(rest.amount, '')),
    taxPercent: asTrimmedString(taxPercent) || '19%',
    taxAmount: asTrimmedString(rest.taxAmount) || undefined,
    internalNotes,
    notes: Array.isArray(notes) ? notes : [],
  }
}

export type BoletaApiBody = {
  number?: string
  buyerName?: string
  buyerTaxId?: string
  companyId?: string | null
  companyName?: string
  contactId?: string | null
  contactName?: string
  amount?: string
  amountNum?: number
  issueDate?: string
  status?: string
  ownerName?: string
  paymentMethod?: string
  notes?: string
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
    subjectToVat?: boolean
    deferredPayment?: boolean
    deferredPaymentText?: string
  }[]
}

function boletaLineOriginalAmount(li: InvoiceLineItem): number {
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
    .filter((li) => asTrimmedString(li.description) && li.quantity > 0)
    .map((li) => ({
      productId: asTrimmedString(li.productId) || undefined,
      sku: asTrimmedString(li.sku) || undefined,
      productName: asTrimmedString(li.description),
      description: asTrimmedString(li.description),
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      unitPriceOriginal: boletaLineOriginalAmount(li),
      priceCurrency: li.priceCurrency ?? 'CLP',
      discount: li.discount,
      subjectToVat: li.subjectToVat !== false,
      deferredPayment: li.deferredPayment === true,
      deferredPaymentText: asTrimmedString(li.deferredPaymentText) || undefined,
    }))
}

export function boletaFormToApiBody(values: CreateBoletaFormValues): BoletaApiBody {
  const totals = computeInvoiceTotals(values.lineItems, {
    globalDiscountPercent: values.globalDiscountPercent,
  })
  return {
    buyerName: values.buyerName.trim() || undefined,
    buyerTaxId: values.buyerTaxId.trim() || undefined,
    companyId: values.companyId.trim() || undefined,
    companyName: values.companyName.trim() || undefined,
    contactId: values.contactId.trim() || undefined,
    contactName: values.contactName.trim() || undefined,
    amount: totals.amount,
    amountNum: totals.amountNum,
    issueDate: values.issueDate.trim() || undefined,
    status: values.status,
    ownerName: values.ownerName.trim() || undefined,
    paymentMethod: values.paymentMethod,
    notes: values.notes.trim() || undefined,
    globalDiscount: values.globalDiscountPercent.trim() || undefined,
    lineItems: lineItemsToApi(values.lineItems),
  }
}

export function boletaDetailToApiBody(detail: BoletaDetail): BoletaApiBody {
  const globalDiscount = detail.globalDiscount
  const totals = computeInvoiceTotals(detail.lineItems, {
    globalDiscountPercent: globalDiscount,
  })
  return {
    buyerName: detail.buyerName.trim() || undefined,
    buyerTaxId: detail.buyerTaxId?.trim() || undefined,
    companyId: detail.companyId,
    companyName: detail.companyName,
    contactId: detail.contactId,
    contactName: detail.contactName,
    amount: totals.amount,
    amountNum: totals.amountNum,
    issueDate: detail.issueDate,
    status: detail.status,
    ownerName: detail.owner,
    paymentMethod: detail.paymentMethod,
    notes: detail.internalNotes,
    globalDiscount,
    lineItems: lineItemsToApi(detail.lineItems),
  }
}

export async function listBoletasApi(archived: boolean): Promise<BoletaListItem[]> {
  return fetchAllPages<BoletaListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
}

export async function getBoletaApi(id: string): Promise<BoletaDetail> {
  const res = await fetchJSON<ApiItemResponse<BoletaApiPayload>>(`${BASE}/${id}`)
  return normalizeBoletaApiDetail(res.data)
}

export async function createBoletaApi(body: BoletaApiBody): Promise<BoletaDetail> {
  const res = await fetchJSON<ApiItemResponse<BoletaApiPayload>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizeBoletaApiDetail(res.data)
}

export async function updateBoletaApi(
  id: string,
  body: Partial<BoletaApiBody>,
): Promise<BoletaDetail> {
  const res = await fetchJSON<ApiItemResponse<BoletaApiPayload>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizeBoletaApiDetail(res.data)
}

export async function archiveBoletaApi(id: string): Promise<BoletaListItem> {
  const res = await fetchJSON<ApiItemResponse<BoletaListItem>>(`${BASE}/${id}/archive`, {
    method: 'POST',
  })
  return res.data
}

export async function restoreBoletaApi(id: string): Promise<BoletaListItem> {
  const res = await fetchJSON<ApiItemResponse<BoletaListItem>>(`${BASE}/${id}/restore`, {
    method: 'POST',
  })
  return res.data
}

export async function permanentlyDeleteBoletaApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}

export async function patchBoletaStatusApi(
  id: string,
  patch: { status: string },
): Promise<BoletaDetail> {
  const res = await fetchJSON<ApiItemResponse<BoletaApiPayload>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return normalizeBoletaApiDetail(res.data)
}

export async function markBoletaPrintedApi(id: string): Promise<BoletaListItem> {
  const res = await fetchJSON<ApiItemResponse<BoletaListItem>>(
    `${BASE}/${id}/printed`,
    { method: 'POST' },
  )
  return res.data
}
