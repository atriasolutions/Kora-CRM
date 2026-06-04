import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import type { PurchaseListItem } from '@/data/purchases.mock'
import type { PurchaseFormValues } from '@/lib/purchase-form'

const BASE = `${API_V1}/purchases`

export type PurchaseApiBody = {
  reference?: string
  supplierId?: string
  supplier?: string
  productSummary?: string
  orderDate?: string
  amount?: string
  amountNum?: number
  status?: string
  ownerName?: string
  description?: string
  expectedDelivery?: string
  paymentTerms?: string
  warehouseId?: string
  warehouse?: string
  deliveryAddress?: string
  supplierContactId?: string
  supplierContact?: string
  supplierEmail?: string
  supplierPhone?: string
  lineItems?: {
    productId?: string
    product?: string
    sku?: string
    description?: string
    quantity?: number
    quantityReceived?: number
    unitPrice?: string
    discount?: string
    total?: string
  }[]
}

function mapLineItemsToApi(
  lineItems: Array<{
    productId?: string
    product: string
    sku?: string
    description?: string
    quantity: number
    quantityReceived?: number
    unitPrice: string
    discount: string
    total: string
  }>,
) {
  return lineItems
    .filter((li) => li.productId?.trim() || li.product.trim())
    .map((li) => ({
      productId: li.productId,
      product: li.product,
      sku: li.sku,
      description: li.description,
      quantity: li.quantity,
      quantityReceived: li.quantityReceived ?? 0,
      unitPrice: li.unitPrice,
      discount: li.discount?.trim() || '0%',
      total: li.total,
    }))
}

export function purchaseFormToApiBody(values: PurchaseFormValues): PurchaseApiBody {
  const lineItems = mapLineItemsToApi(values.lineItems)

  const amountNum = lineItems.reduce(
    (s, li) => s + (Number.parseInt(li.total?.replace(/[^\d]/g, '') ?? '0', 10) || 0),
    0,
  )

  return {
    reference: values.reference.trim() || undefined,
    supplierId: values.supplierId.trim() || undefined,
    supplier: values.supplier.trim() || undefined,
    productSummary: values.productSummary.trim() || undefined,
    orderDate: values.orderDate,
    amount: values.amount.trim() || undefined,
    amountNum: amountNum > 0 ? amountNum : undefined,
    status: values.status,
    ownerName: values.ownerName.trim() || undefined,
    description: values.description.trim() || undefined,
    expectedDelivery: values.expectedDelivery.trim() || undefined,
    paymentTerms: values.paymentTerms.trim() || undefined,
    warehouseId: values.warehouseId.trim() || undefined,
    warehouse: values.warehouse.trim() || undefined,
    deliveryAddress: values.deliveryAddress.trim() || undefined,
    supplierContactId: values.supplierContactId.trim() || undefined,
    supplierContact: values.supplierContact.trim() || undefined,
    supplierEmail: values.supplierEmail.trim() || undefined,
    supplierPhone: values.supplierPhone.trim() || undefined,
    lineItems,
  }
}

export function purchaseDetailToApiBody(detail: PurchaseDetail): PurchaseApiBody {
  return {
    reference: detail.reference,
    supplierId: detail.supplierId,
    supplier: detail.supplier,
    productSummary: detail.productSummary,
    orderDate: detail.orderDate,
    amount: detail.amount,
    amountNum: detail.amountNum,
    status: detail.status,
    ownerName: detail.owner,
    description: detail.description?.trim() || undefined,
    expectedDelivery: detail.expectedDelivery?.trim() || undefined,
    paymentTerms: detail.paymentTerms?.trim() || undefined,
    warehouseId: detail.warehouseId,
    warehouse: detail.warehouse?.trim() || undefined,
    deliveryAddress: detail.deliveryAddress?.trim() || undefined,
    supplierContactId: detail.supplierContactId,
    supplierContact: detail.supplierContact?.trim() || undefined,
    supplierEmail: detail.supplierEmail?.trim() || undefined,
    supplierPhone: detail.supplierPhone?.trim() || undefined,
    lineItems: mapLineItemsToApi(detail.lineItems),
  }
}

export async function listPurchasesApi(archived: boolean): Promise<PurchaseListItem[]> {
  return fetchAllPages<PurchaseListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
}

export async function getPurchaseApi(id: string): Promise<PurchaseDetail> {
  const res = await fetchJSON<ApiItemResponse<PurchaseDetail>>(`${BASE}/${id}`)
  return res.data
}

export async function createPurchaseApi(body: PurchaseApiBody): Promise<PurchaseDetail> {
  const res = await fetchJSON<ApiItemResponse<PurchaseDetail>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updatePurchaseApi(
  id: string,
  body: Partial<PurchaseApiBody>,
): Promise<PurchaseDetail> {
  const res = await fetchJSON<ApiItemResponse<PurchaseDetail>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function archivePurchaseApi(id: string): Promise<PurchaseListItem> {
  const res = await fetchJSON<ApiItemResponse<PurchaseListItem>>(
    `${BASE}/${id}/archive`,
    { method: 'POST' },
  )
  return res.data
}

export async function restorePurchaseApi(id: string): Promise<PurchaseListItem> {
  const res = await fetchJSON<ApiItemResponse<PurchaseListItem>>(
    `${BASE}/${id}/restore`,
    { method: 'POST' },
  )
  return res.data
}

export async function permanentlyDeletePurchaseApi(id: string): Promise<void> {
  await fetchJSON<void>(`${BASE}/${id}`, { method: 'DELETE' })
}
