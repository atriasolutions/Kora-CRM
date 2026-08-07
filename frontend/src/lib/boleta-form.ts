import type { InvoiceLineItem } from '@/data/invoice-detail.mock'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import type {
  BoletaListItem,
  BoletaPaymentMethod,
  BoletaStatus,
} from '@/data/boletas.mock'
import { BOLETA_PAYMENT_METHOD_OPTIONS } from '@/data/boletas.mock'
import { DEFAULT_GLOBAL_DISCOUNT } from '@/lib/document-global-discount'
import { boletaBuyerDisplayName, boletaObservationText } from '@/lib/boleta-display'
import { computeInvoiceTotals } from '@/lib/invoice-line-item'
import { BOLETA_JOURNEY_STAGE_OPTIONS } from '@/lib/boleta-journey'
import type { SaleCustomerKind } from '@/lib/sale-customer'
import type { BoletaDetail } from '@/data/boleta-detail.mock'

export const BOLETA_STATUS_OPTIONS = BOLETA_JOURNEY_STAGE_OPTIONS as BoletaStatus[]

export type BoletaFormValues = {
  buyerName: string
  buyerTaxId: string
  customerKind: SaleCustomerKind
  contactId: string
  contactName: string
  companyId: string
  companyName: string
  amount: string
  issueDate: string
  ownerName: string
  status: BoletaStatus
  paymentMethod: BoletaPaymentMethod
  notes: string
  lineItems: InvoiceLineItem[]
  globalDiscountPercent: string
}

export { BOLETA_PAYMENT_METHOD_OPTIONS }

function resolveGlobalDiscountFromDetail(boleta: BoletaDetail): string {
  return boleta.globalDiscount ?? DEFAULT_GLOBAL_DISCOUNT
}

export function boletaDetailToFormValues(boleta: BoletaDetail): BoletaFormValues {
  const globalDiscountPercent = resolveGlobalDiscountFromDetail(boleta)
  const totals = computeInvoiceTotals(boleta.lineItems, { globalDiscountPercent })
  return {
    buyerName: boleta.buyerName,
    buyerTaxId: boleta.buyerTaxId ?? '',
    customerKind: boleta.contactId ? 'contacto' : boleta.companyId ? 'empresa' : 'empresa',
    contactId: boleta.contactId ?? '',
    contactName: boleta.contactName ?? '',
    companyId: boleta.companyId ?? '',
    companyName: boleta.companyName ?? '',
    amount: totals.amount,
    issueDate: boleta.issueDate,
    ownerName: boleta.owner,
    status: boleta.status,
    paymentMethod: boleta.paymentMethod,
    notes: boleta.internalNotes ?? '',
    lineItems: boleta.lineItems,
    globalDiscountPercent,
  }
}

export function syncBoletaEditFormAmount(
  lineItems: InvoiceLineItem[],
  globalDiscountPercent = DEFAULT_GLOBAL_DISCOUNT,
): Pick<BoletaFormValues, 'amount'> {
  return {
    amount: computeInvoiceTotals(lineItems, { globalDiscountPercent }).amount,
  }
}

export function applyFormValuesToBoleta(
  boleta: BoletaDetail,
  values: BoletaFormValues,
): BoletaDetail {
  const totals = computeInvoiceTotals(values.lineItems, {
    globalDiscountPercent: values.globalDiscountPercent,
  })
  const buyerName = values.buyerName.trim()
    ? values.buyerName.trim()
    : boletaBuyerDisplayName({
        buyerName: '',
        contactName: values.contactName,
        companyName: values.companyName,
      })
  return {
    ...boleta,
    buyerName,
    buyerTaxId: values.buyerTaxId.trim() || undefined,
    contactId: values.contactId.trim() || undefined,
    contactName: values.contactName.trim() || undefined,
    companyId: values.companyId.trim() || undefined,
    companyName: values.companyName.trim() || undefined,
    amount: totals.amount,
    amountNum: totals.amountNum,
    issueDate: values.issueDate.trim(),
    owner: values.ownerName.trim(),
    status: values.status,
    paymentMethod: values.paymentMethod,
    internalNotes: values.notes.trim(),
    lineItems: values.lineItems,
    subtotal: totals.subtotal,
    taxableSubtotal: totals.taxableSubtotal,
    exemptSubtotal: totals.exemptSubtotal,
    globalDiscount: totals.discountPercent,
    taxPercent: totals.taxPercent,
    taxAmount: totals.taxAmount,
  }
}

export function listItemFromBoletaDetail(boleta: BoletaDetail): BoletaListItem {
  const {
    lineItems: _li,
    activities: _a,
    notes: entityNotes,
    description: _d,
    subtotal: _s,
    taxableSubtotal: _ts,
    exemptSubtotal: _es,
    taxAmount: _t,
    taxPercent: _tp,
    internalNotes,
    statusHistory: _sh,
    files: _f,
    globalDiscount: _gd,
    exchangeRateDate: _erd,
    exchangeRateUf: _uf,
    exchangeRateUsd: _usd,
    exchangeRateEur: _eur,
    ...list
  } = boleta

  const observationNotes =
    boletaObservationText(internalNotes) ||
    (typeof entityNotes === 'string' ? entityNotes.trim() : '')

  return stampRecordAuditOnUpdate({
    ...list,
    notes: observationNotes || undefined,
  })
}
