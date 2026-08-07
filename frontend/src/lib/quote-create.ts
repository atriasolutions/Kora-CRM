import type { QuoteLineItem } from '@/data/quote-detail.mock'
import { isApiEnabled } from '@/api/config'
import type { OpportunityDetail } from '@/data/opportunity-detail.mock'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import type { QuoteListItem } from '@/data/quotes.mock'
import {
  computeQuoteTotals,
  defaultQuoteLineItem,
} from '@/lib/quote-line-item'
import { DEFAULT_GLOBAL_DISCOUNT } from '@/lib/document-global-discount'
import { loadCatalogSettings } from '@/lib/catalog-settings'
import {
  defaultWarehouseFromCatalog,
  warehouseFormPatchFromSelection,
} from '@/lib/warehouse-lookup'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import {
  defaultSaleCustomerValues,
  saleCustomerDisplayName,
  saleCustomerFromOpportunity,
  validateSaleCustomer,
  type SaleCustomerValues,
} from '@/lib/sale-customer'
import type { QuoteStatus } from '@/lib/quote-journey'
import {
  DEFAULT_QUOTE_DELIVERY_TERMS,
  DEFAULT_QUOTE_PAYMENT_TERMS,
} from '@/lib/quote-defaults'
import { formatPurchaseDisplayDate } from '@/lib/purchase-dates'
import type { ProductCurrency } from '@/lib/currency'

export type CreateQuoteFormValues = SaleCustomerValues & {
  code: string
  title: string
  status: QuoteStatus
  validUntil: string
  ownerName: string
  opportunityId: string
  opportunityName: string
  amount: string
  lockOpportunity: boolean
  lineItems: QuoteLineItem[]
  destinationWarehouseId: string
  destinationWarehouse: string
  deliveryAddress: string
  paymentTerms: string
  deliveryTerms: string
  terms: string
  globalDiscountPercent: string
  includeBankDetails: boolean
  bankAccountId: string
  issueDate: string
  quoteCurrency: ProductCurrency
}

export function createDefaultQuoteFormValues(
  partial?: Partial<CreateQuoteFormValues>,
): CreateQuoteFormValues {
  const lineItems =
    partial?.lineItems && partial.lineItems.length > 0
      ? partial.lineItems
      : isApiEnabled()
        ? []
        : [defaultQuoteLineItem()]
  const catalog = loadCatalogSettings()
  const whPatch = warehouseFormPatchFromSelection(
    defaultWarehouseFromCatalog(catalog.warehouses),
  )

  return {
    ...defaultSaleCustomerValues(partial),
    code: '',
    title: '',
    status: 'Borrador',
    validUntil: '',
    ownerName: getDefaultOwnerName(),
    opportunityId: '',
    opportunityName: '',
    lockOpportunity: false,
    destinationWarehouseId: whPatch.warehouseId,
    destinationWarehouse: whPatch.warehouse,
    deliveryAddress: whPatch.deliveryAddress,
    ...partial,
    paymentTerms: partial?.paymentTerms?.trim()
      ? partial.paymentTerms
      : DEFAULT_QUOTE_PAYMENT_TERMS,
    deliveryTerms: partial?.deliveryTerms?.trim()
      ? partial.deliveryTerms
      : DEFAULT_QUOTE_DELIVERY_TERMS,
    terms: partial?.terms ?? '',
    lineItems,
    globalDiscountPercent: partial?.globalDiscountPercent ?? DEFAULT_GLOBAL_DISCOUNT,
    includeBankDetails: partial?.includeBankDetails ?? false,
    bankAccountId: partial?.bankAccountId ?? '',
    issueDate: partial?.issueDate ?? formatPurchaseDisplayDate(new Date()),
    quoteCurrency: partial?.quoteCurrency ?? 'CLP',
    amount:
      partial?.amount ??
      computeQuoteTotals(lineItems, {
        globalDiscountPercent: partial?.globalDiscountPercent,
      }).amount,
  }
}

/** Código provisional hasta asignación en BD. */
export function generateQuoteCode(): string {
  const suffix = String(Date.now()).slice(-4)
  return `COT-${new Date().getFullYear()}-${suffix}`
}

export function quoteFormPatchFromOpportunity(
  opportunity: OpportunityListItem | OpportunityDetail,
  options?: { fillCodeAndTitle?: boolean },
): Partial<CreateQuoteFormValues> {
  const fillMeta = options?.fillCodeAndTitle !== false
  return {
    ...(fillMeta
      ? {
          title: `Propuesta — ${opportunity.name}`,
        }
      : {}),
    opportunityId: opportunity.id,
    opportunityName: opportunity.name,
    ...saleCustomerFromOpportunity(opportunity),
    ownerName: opportunity.owner,
    amount: opportunity.amount,
    validUntil: opportunity.closeDate,
  }
}

export function quoteFormValuesFromOpportunity(
  opportunity: OpportunityDetail,
): Partial<CreateQuoteFormValues> {
  return {
    ...quoteFormPatchFromOpportunity(opportunity),
    lockOpportunity: true,
  }
}

export function validateCreateQuoteForm(values: CreateQuoteFormValues): string | null {
  if (!values.title.trim()) return 'El título es obligatorio.'
  if (!values.opportunityId.trim()) return 'La oportunidad vinculada es obligatoria.'
  if (!values.validUntil.trim()) return 'La fecha de validez es obligatoria.'
  const meaningfulLines = values.lineItems.filter(
    (li) => li.description.trim() || li.sku.trim(),
  )
  if (!isApiEnabled()) {
    if (!values.lineItems.length) return 'Agrega al menos una línea a la cotización.'
    if (meaningfulLines.length === 0) {
      return 'Completa la descripción o el SKU de al menos una línea.'
    }
  } else if (values.lineItems.length > 0 && meaningfulLines.length === 0) {
    return 'Completa la descripción o el SKU de al menos una línea.'
  }
  const customerError = validateSaleCustomer(values)
  if (customerError) return customerError
  return null
}

export function persistQuoteDetailFromCreate(
  _quoteId: string,
  _values: CreateQuoteFormValues,
): void {
  /* sin persistencia local */
}

export function formValuesToListItem(values: CreateQuoteFormValues): QuoteListItem {
  const id = `qt-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const today = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const amount = computeQuoteTotals(values.lineItems, {
    globalDiscountPercent: values.globalDiscountPercent,
  }).amount

  return stampRecordAuditOnCreate({
    id,
    code: values.code.trim() || generateQuoteCode(),
    title: values.title.trim(),
    opportunityId: values.opportunityId.trim(),
    opportunityName: values.opportunityName.trim(),
    companyName: saleCustomerDisplayName(values),
    customerKind: values.customerKind,
    contactId: values.contactId.trim() || undefined,
    companyId: values.companyId.trim() || undefined,
    amount,
    status: values.status,
    validUntil: values.validUntil.trim(),
    issueDate: today,
    owner: values.ownerName.trim(),
  })
}
