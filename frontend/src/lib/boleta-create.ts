import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import type { InvoiceLineItem } from '@/data/invoice-detail.mock'
import type {
  BoletaListItem,
  BoletaPaymentMethod,
  BoletaStatus,
} from '@/data/boletas.mock'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import { parseBoletaAmountNum, boletaBuyerDisplayName } from '@/lib/boleta-display'
import type { BoletaDetailOverride } from '@/lib/boleta-detail-storage'
import { DEFAULT_GLOBAL_DISCOUNT } from '@/lib/document-global-discount'
import {
  computeInvoiceTotals,
  defaultInvoiceLineItem,
} from '@/lib/invoice-line-item'
import { formatPurchaseDisplayDate } from '@/lib/purchase-dates'
import {
  defaultSaleCustomerValues,
  type SaleCustomerValues,
} from '@/lib/sale-customer'

export type CreateBoletaFormValues = SaleCustomerValues & {
  buyerName: string
  buyerTaxId: string
  number: string
  amount: string
  issueDate: string
  ownerName: string
  status: BoletaStatus
  paymentMethod: BoletaPaymentMethod
  notes: string
  lineItems: InvoiceLineItem[]
  globalDiscountPercent: string
}

export function createDefaultBoletaFormValues(
  partial?: Partial<CreateBoletaFormValues>,
): CreateBoletaFormValues {
  const lineItems =
    partial?.lineItems && partial.lineItems.length > 0
      ? partial.lineItems
      : [defaultInvoiceLineItem()]
  const totals = computeInvoiceTotals(lineItems, {
    globalDiscountPercent: partial?.globalDiscountPercent,
  })

  return {
    ...defaultSaleCustomerValues(partial),
    buyerName: partial?.buyerName ?? '',
    buyerTaxId: partial?.buyerTaxId ?? '',
    number: '',
    amount: partial?.amount ?? totals.amount,
    issueDate: partial?.issueDate ?? formatPurchaseDisplayDate(new Date()),
    ownerName: getDefaultOwnerName(),
    status: 'Borrador',
    paymentMethod: 'Efectivo',
    notes: '',
    globalDiscountPercent: partial?.globalDiscountPercent ?? DEFAULT_GLOBAL_DISCOUNT,
    lineItems,
    ...partial,
  }
}

export function generateBoletaNumber(): string {
  const suffix = String(Date.now()).slice(-4)
  return `BOL-${new Date().getFullYear()}-${suffix}`
}

export function syncBoletaFormAmount(
  lineItems: InvoiceLineItem[],
  globalDiscountPercent = DEFAULT_GLOBAL_DISCOUNT,
): Pick<CreateBoletaFormValues, 'amount'> {
  return {
    amount: computeInvoiceTotals(lineItems, { globalDiscountPercent }).amount,
  }
}

export function validateCreateBoletaForm(values: CreateBoletaFormValues): string | null {
  const validLines = values.lineItems.filter(
    (li) => li.description.trim() && li.quantity > 0,
  )
  if (validLines.length === 0) {
    return 'Agrega al menos una línea con descripción y cantidad.'
  }

  if (!values.amount.trim() || parseBoletaAmountNum(values.amount) <= 0) {
    return 'El monto debe ser mayor a cero (revisa las líneas).'
  }

  return null
}

export function createBoletaId(): string {
  return `boleta-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function resolveBuyerName(values: CreateBoletaFormValues): string {
  if (values.buyerName.trim()) return values.buyerName.trim()
  return boletaBuyerDisplayName({
    buyerName: '',
    contactName: values.contactName,
    companyName: values.companyName,
  })
}

export function formValuesToBoletaListItem(
  values: CreateBoletaFormValues,
  id = createBoletaId(),
): BoletaListItem {
  const totals = computeInvoiceTotals(values.lineItems, {
    globalDiscountPercent: values.globalDiscountPercent,
  })
  const buyerName = resolveBuyerName(values)
  return stampRecordAuditOnCreate({
    id,
    number: values.number.trim() || generateBoletaNumber(),
    buyerName,
    buyerTaxId: values.buyerTaxId.trim() || undefined,
    contactId: values.contactId.trim() || undefined,
    contactName: values.contactName.trim() || undefined,
    companyId: values.companyId.trim() || undefined,
    companyName: values.companyName.trim() || undefined,
    amount: totals.amount,
    amountNum: totals.amountNum,
    issueDate: values.issueDate.trim() || '—',
    status: values.status,
    owner: values.ownerName.trim(),
    paymentMethod: values.paymentMethod,
    notes: values.notes.trim() || undefined,
  })
}

export function formValuesToBoletaDetailOverride(
  values: CreateBoletaFormValues,
): BoletaDetailOverride {
  const totals = computeInvoiceTotals(values.lineItems, {
    globalDiscountPercent: values.globalDiscountPercent,
  })
  return {
    lineItems: values.lineItems,
    subtotal: totals.subtotal,
    taxableSubtotal: totals.taxableSubtotal,
    exemptSubtotal: totals.exemptSubtotal,
    taxPercent: totals.taxPercent,
    taxAmount: totals.taxAmount,
    amount: totals.amount,
    notes: values.notes.trim() || undefined,
  }
}
