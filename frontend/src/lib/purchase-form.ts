import { stampRecordAuditOnCreate, stampRecordAuditOnUpdate } from '@/lib/record-audit'
import { getAllKnownCompanies } from '@/data/companies-registry-store'
import type { PurchaseDetail, PurchaseLineItem } from '@/data/purchase-detail.mock'
import type { PurchaseListItem, PurchaseStatus } from '@/data/purchases.mock'
import { PURCHASE_STATUS_OPTIONS } from '@/data/purchases.mock'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import {
  contactDisplayPhone,
  findLinkedContact,
  getAllKnownContacts,
} from '@/lib/contact-lookup'
import { resolveCompanyIdFromName } from '@/lib/company-lookup'
import { defaultPurchaseLineItem, recalcPurchaseLine } from '@/lib/purchase-line-item'
import { normalizePurchasePaymentTerms } from '@/lib/purchase-payment-terms'
import {
  defaultWarehouseFromCatalog,
  resolveWarehouseFromStoredLabel,
  warehouseFormPatchFromSelection,
} from '@/lib/warehouse-lookup'
import { loadCatalogSettings } from '@/lib/catalog-settings'
import { findLinkedProduct, getAllKnownProducts } from '@/lib/product-lookup'
import { formatMoneyCLP } from '@/lib/purchase-fulfillment'
import type { PurchaseDetailOverride } from '@/lib/purchase-detail-storage'
import {
  legacyStatusToPurchaseJourney,
  type PurchaseJourneyStage,
} from '@/lib/purchase-journey'

function warehousePatchFromFormValues(
  values: Pick<PurchaseFormValues, 'warehouseId' | 'warehouse'>,
) {
  const catalog = loadCatalogSettings()
  const warehouse =
    (values.warehouseId?.trim()
      ? catalog.warehouses.find((w) => w.id === values.warehouseId.trim())
      : undefined) ??
    resolveWarehouseFromStoredLabel(catalog.warehouses, values.warehouse)
  return warehouseFormPatchFromSelection(warehouse)
}

export type PurchaseFormValues = {
  reference: string
  supplierId: string
  supplier: string
  supplierContactId: string
  productSummary: string
  orderDate: string
  amount: string
  status: PurchaseStatus
  ownerName: string
  description: string
  expectedDelivery: string
  paymentTerms: string
  warehouseId: string
  warehouse: string
  deliveryAddress: string
  supplierContact: string
  supplierEmail: string
  supplierPhone: string
  cancelReason: string
  lineItems: PurchaseLineItem[]
}

export { PURCHASE_STATUS_OPTIONS }

const REF_PREFIX = /^OC-(\d{4})-(\d+)$/i

export function generatePurchaseReference(existingReferences: string[] = []): string {
  const year = new Date().getFullYear()
  const prefix = `OC-${year}-`
  let maxSeq = 0

  for (const ref of existingReferences) {
    const match = ref.trim().match(REF_PREFIX)
    if (!match || Number(match[1]) !== year) continue
    const seq = Number.parseInt(match[2] ?? '0', 10)
    if (!Number.isNaN(seq)) maxSeq = Math.max(maxSeq, seq)
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`
}

export function createDefaultPurchaseFormValues(
  partial?: Partial<PurchaseFormValues>,
  options?: { existingReferences?: string[] },
): PurchaseFormValues {
  const today = new Date()
  const orderDate = today.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const catalog = loadCatalogSettings()
  const defaultWh = defaultWarehouseFromCatalog(catalog.warehouses)
  const whPatch = warehouseFormPatchFromSelection(defaultWh)

  return {
    reference: generatePurchaseReference(options?.existingReferences ?? []),
    supplierId: '',
    supplier: '',
    supplierContactId: '',
    productSummary: '',
    orderDate,
    amount: '',
    status: 'Borrador',
    ownerName: getDefaultOwnerName(),
    description: '',
    expectedDelivery: '',
    paymentTerms: normalizePurchasePaymentTerms('Net 30 · Transferencia'),
    warehouseId: whPatch.warehouseId,
    warehouse: whPatch.warehouse,
    deliveryAddress: whPatch.deliveryAddress,
    supplierContact: '',
    supplierEmail: '',
    supplierPhone: '',
    cancelReason: '',
    lineItems: [defaultPurchaseLineItem()],
    ...partial,
  }
}

export function validatePurchaseForm(values: PurchaseFormValues): string | null {
  if (!values.supplierId.trim()) {
    return 'Selecciona un proveedor (empresa con etapa Proveedor).'
  }
  if (!values.ownerName.trim()) return 'El responsable interno es obligatorio.'
  if (values.lineItems.length === 0) {
    return 'Agrega al menos una línea a la orden.'
  }

  for (const [index, li] of values.lineItems.entries()) {
    const kind = li.lineKind ?? (li.productId?.trim() ? 'product' : 'manual')
    if (kind === 'product') {
      if (!li.productId?.trim()) {
        return `Línea ${index + 1}: selecciona un producto del catálogo o cambia a ítem manual.`
      }
    } else if (!li.product.trim() && !li.description?.trim()) {
      return `Línea ${index + 1}: indica la descripción del ítem (servicio, flete, etc.).`
    }
  }

  if (
    !values.productSummary.trim() &&
    !values.lineItems.some((li) => li.product.trim() || li.description?.trim())
  ) {
    return 'Indica al menos un ítem o un resumen de la orden.'
  }

  return null
}

function resolveSupplierContactId(
  pur: PurchaseDetail,
  supplierId: string,
): string {
  if (pur.supplierContactId?.trim()) return pur.supplierContactId.trim()
  const linked = findLinkedContact(getAllKnownContacts(), {
    name: pur.supplierContact,
    email: pur.supplierEmail,
    companyId: supplierId,
    company: pur.supplier,
  })
  return linked?.id ?? ''
}

export function purchaseDetailToFormValues(pur: PurchaseDetail): PurchaseFormValues {
  const supplierId =
    pur.supplierId ??
    resolveCompanyIdFromName(getAllKnownCompanies(), pur.supplier) ??
    ''

  const catalog = loadCatalogSettings()
  const resolvedWh =
    (pur.warehouseId
      ? catalog.warehouses.find((w) => w.id === pur.warehouseId)
      : undefined) ?? resolveWarehouseFromStoredLabel(catalog.warehouses, pur.warehouse)
  const whPatch = warehouseFormPatchFromSelection(resolvedWh)

  return {
    reference: pur.reference,
    supplierId,
    supplier: pur.supplier,
    supplierContactId: resolveSupplierContactId(pur, supplierId),
    productSummary: pur.productSummary,
    orderDate: pur.orderDate,
    amount: pur.amount,
    status: pur.status,
    ownerName: pur.owner,
    description: pur.description,
    expectedDelivery: pur.expectedDelivery,
    paymentTerms: pur.paymentTerms,
    warehouseId: whPatch.warehouseId || pur.warehouseId || '',
    warehouse: whPatch.warehouse || pur.warehouse,
    deliveryAddress: whPatch.deliveryAddress,
    supplierContact: pur.supplierContact,
    supplierEmail: pur.supplierEmail,
    supplierPhone: pur.supplierPhone,
    cancelReason: pur.cancelReason ?? '',
    lineItems: pur.lineItems.map((li) => {
      const productId =
        li.productId ??
        findLinkedProduct(getAllKnownProducts(), {
          name: li.product,
          sku: li.sku,
        })?.id ??
        ''
      return { ...li, productId: productId || undefined }
    }),
  }
}

export function applyFormValuesToPurchase(
  pur: PurchaseDetail,
  values: PurchaseFormValues,
): PurchaseDetail {
  const lineItems = values.lineItems.map((li) =>
    recalcPurchaseLine({ ...li, quantityReceived: 0 }),
  )
  const amountNum = lineItems.reduce(
    (s, li) => s + (Number.parseInt(li.total.replace(/[^\d]/g, ''), 10) || 0),
    0,
  )
  const stage = legacyStatusToPurchaseJourney(values.status) as PurchaseJourneyStage

  const contacts = getAllKnownContacts()
  const linkedContact = values.supplierContactId.trim()
    ? findLinkedContact(contacts, {
        id: values.supplierContactId,
        companyId: values.supplierId,
      })
    : undefined

  return {
    ...pur,
    reference: pur.reference,
    supplierId: values.supplierId.trim() || undefined,
    supplier: values.supplier.trim(),
    supplierContactId: values.supplierContactId.trim() || undefined,
    productSummary: values.productSummary.trim(),
    orderDate: values.orderDate.trim(),
    amount: amountNum > 0 ? formatMoneyCLP(amountNum) : values.amount.trim() || pur.amount,
    amountNum: amountNum || pur.amountNum,
    lineItems,
    receivedPercent: 0,
    status: values.status,
    stage,
    owner: values.ownerName.trim(),
    description: values.description.trim(),
    expectedDelivery: values.expectedDelivery.trim(),
    paymentTerms: values.paymentTerms.trim(),
    warehouseId: values.warehouseId.trim() || undefined,
    warehouse: values.warehouse.trim(),
    deliveryAddress: warehousePatchFromFormValues(values).deliveryAddress,
    supplierContact:
      linkedContact?.name.trim() || values.supplierContact.trim(),
    supplierEmail: linkedContact?.email.trim() || values.supplierEmail.trim(),
    supplierPhone:
      (linkedContact ? contactDisplayPhone(linkedContact) : '') ||
      values.supplierPhone.trim(),
    cancelReason: values.cancelReason.trim() || undefined,
  }
}

export function createPurchaseId(): string {
  return `purchase-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function purchaseFormValuesToListItem(
  values: PurchaseFormValues,
  id = createPurchaseId(),
  options?: { existingReferences?: string[] },
): PurchaseListItem {
  const lineItems = values.lineItems
    .map((li) => recalcPurchaseLine({ ...li, quantityReceived: 0 }))
    .filter((li) => li.product.trim() || li.description?.trim())

  const amountNum = lineItems.reduce(
    (s, li) => s + (Number.parseInt(li.total.replace(/[^\d]/g, ''), 10) || 0),
    0,
  )
  const productSummary =
    values.productSummary.trim() ||
    lineItems.map((l) => l.product).join(' · ').slice(0, 80)

  return stampRecordAuditOnCreate({
    id,
    reference:
      values.reference.trim() ||
      generatePurchaseReference(options?.existingReferences ?? []),
    supplier: values.supplier.trim(),
    supplierId: values.supplierId.trim() || undefined,
    productSummary,
    orderDate: values.orderDate.trim(),
    amount: formatMoneyCLP(amountNum),
    amountNum,
    status: values.status,
    owner: values.ownerName.trim(),
  })
}

export function purchaseFormValuesToDetailOverride(
  values: PurchaseFormValues,
  _purchaseId: string,
): PurchaseDetailOverride {
  const lineItems = values.lineItems
    .map((li) => ({
      ...li,
      quantityReceived: 0,
    }))
    .filter((li) => li.product.trim())

  const contacts = getAllKnownContacts()
  const linkedContact = values.supplierContactId.trim()
    ? findLinkedContact(contacts, {
        id: values.supplierContactId,
        companyId: values.supplierId,
      })
    : undefined

  const stage = legacyStatusToPurchaseJourney(values.status)

  return {
    description:
      values.description.trim() ||
      `Orden de compra con ${values.supplier.trim()}.`,
    expectedDelivery: values.expectedDelivery.trim(),
    paymentTerms: values.paymentTerms.trim(),
    warehouseId: values.warehouseId.trim() || undefined,
    warehouse: values.warehouse.trim(),
    deliveryAddress: warehousePatchFromFormValues(values).deliveryAddress,
    supplierContactId: values.supplierContactId.trim() || undefined,
    supplierContact:
      linkedContact?.name.trim() || values.supplierContact.trim(),
    supplierEmail: linkedContact?.email.trim() || values.supplierEmail.trim(),
    supplierPhone:
      (linkedContact ? contactDisplayPhone(linkedContact) : '') ||
      values.supplierPhone.trim(),
    lineItems,
    stage,
    receivedPercent: 0,
    tags: ['Compras'],
  }
}

export function listItemFromPurchaseDetail(pur: PurchaseDetail): PurchaseListItem {
  const {
    description: _d,
    createdAt: _c,
    stageEnteredAt: _s,
    expectedDelivery: _ed,
    paymentTerms: _pt,
    warehouse: _w,
    deliveryAddress: _da,
    supplierContact: _sc,
    supplierContactId: _sci,
    supplierEmail: _se,
    supplierPhone: _sp,
    cancelReason: _cr,
    nextStep: _n,
    tags: _t,
    stage: _st,
    stageHistory: _sh,
    lineItems: _li,
    activities: _a,
    notes: _no,
    files: _f,
    pendingActivities: _pa,
    daysInStage: _ds,
    receivedPercent: _rp,
    ...list
  } = pur
  return stampRecordAuditOnUpdate(list)
}
