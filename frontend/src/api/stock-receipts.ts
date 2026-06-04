import { API_V1, isApiEnabled } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { StockReceiptDetail } from '@/data/stock-receipt-detail.mock'
import type { StockReceiptListItem } from '@/data/stock-receipts.mock'
import type { StockReceiptFormValues } from '@/lib/stock-receipt-form'

const BASE = `${API_V1}/stock-receipts`

export type StockReceiptApiBody = {
  externalReference?: string
  purchaseId?: string
  purchaseReference?: string
  supplier?: string
  warehouseId?: string
  warehouse?: string
  ownerName?: string
  status?: string
  lineItems?: {
    productId?: string
    product?: string
    sku?: string
    quantity?: number
  }[]
}

export function stockReceiptFormToApiBody(
  values: StockReceiptFormValues,
): StockReceiptApiBody {
  const lineItems = values.lineItems
    .filter((li) => li.sku.trim())
    .map((li) => ({
      productId: li.productId,
      product: li.product,
      sku: li.sku,
      quantity: li.quantity,
    }))

  return {
    externalReference: values.externalReference.trim() || undefined,
    purchaseId: values.purchaseId.trim() || undefined,
    purchaseReference: values.purchaseReference.trim() || undefined,
    supplier: values.supplier.trim() || undefined,
    warehouseId: values.warehouseId.trim() || undefined,
    warehouse: values.warehouse.trim() || undefined,
    ownerName: values.ownerName.trim() || undefined,
    lineItems,
  }
}

export function stockReceiptDetailToApiBody(
  detail: StockReceiptDetail,
): StockReceiptApiBody {
  return {
    externalReference: detail.externalReference,
    purchaseId: detail.purchaseId,
    purchaseReference: detail.purchaseReference,
    supplier: detail.supplier,
    warehouse: detail.warehouse,
    ownerName: detail.owner,
    status: detail.status,
    lineItems: detail.lineItems.map((li) => ({
      productId: li.productId,
      product: li.product,
      sku: li.sku,
      quantity: li.quantity,
    })),
  }
}

export async function listStockReceiptsApi(
  archived: boolean,
): Promise<StockReceiptListItem[]> {
  return fetchAllPages<StockReceiptListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
}

export async function getStockReceiptApi(id: string): Promise<StockReceiptDetail> {
  const res = await fetchJSON<ApiItemResponse<StockReceiptDetail>>(`${BASE}/${id}`)
  return res.data
}

export async function createStockReceiptApi(
  body: StockReceiptApiBody,
): Promise<StockReceiptDetail> {
  const res = await fetchJSON<ApiItemResponse<StockReceiptDetail>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateStockReceiptApi(
  id: string,
  body: Partial<StockReceiptApiBody>,
): Promise<StockReceiptDetail> {
  const res = await fetchJSON<ApiItemResponse<StockReceiptDetail>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function confirmStockReceiptApi(id: string): Promise<StockReceiptDetail> {
  const res = await fetchJSON<ApiItemResponse<StockReceiptDetail>>(
    `${BASE}/${id}/confirm`,
    { method: 'POST' },
  )
  return res.data
}

export async function archiveStockReceiptApi(id: string): Promise<StockReceiptListItem> {
  const res = await fetchJSON<ApiItemResponse<StockReceiptListItem>>(
    `${BASE}/${id}/archive`,
    { method: 'POST' },
  )
  return res.data
}

export async function restoreStockReceiptApi(id: string): Promise<StockReceiptListItem> {
  const res = await fetchJSON<ApiItemResponse<StockReceiptListItem>>(
    `${BASE}/${id}/restore`,
    { method: 'POST' },
  )
  return res.data
}

export async function permanentlyDeleteStockReceiptApi(id: string): Promise<void> {
  await fetchJSON<void>(`${BASE}/${id}`, { method: 'DELETE' })
}
