import type { PurchaseDetail, PurchaseLineItem } from '@/data/purchase-detail.mock'
import { isApiEnabled } from '@/api/config'
import {
  journeyStageToListStatus,
  legacyStatusToPurchaseJourney,
  resolvePurchaseJourneyStage,
  type PurchaseJourneyStage,
  type PurchaseStageHistory,
} from '@/lib/purchase-journey'

type PurchaseApiPayload = Partial<PurchaseDetail> & {
  lineItems?: PurchaseLineItem[]
}

function stageHistoryFor(
  id: string,
  journeyStage: PurchaseJourneyStage,
): PurchaseStageHistory[] {
  const chains: Partial<Record<PurchaseJourneyStage, PurchaseJourneyStage[]>> = {
    Borrador: ['Borrador'],
    Emitida: ['Borrador', 'Emitida'],
    Confirmada: ['Borrador', 'Emitida', 'Confirmada'],
  }

  const chain = chains[journeyStage] ?? ['Borrador', journeyStage]
  const enteredAt = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return chain.map((stage, i) => {
    const entry: PurchaseStageHistory = {
      id: `${id}-st-${i}`,
      stage,
      enteredAt,
      note: stage === journeyStage ? 'Etapa actual' : undefined,
    }
    return entry
  })
}

function resolveStage(id: string, status: string | undefined): PurchaseJourneyStage {
  const seed = legacyStatusToPurchaseJourney(status ?? 'Borrador')
  if (isApiEnabled()) return seed
  return resolvePurchaseJourneyStage(id, seed)
}

/**
 * Completa campos que el detalle mock incluye pero la API aún no persiste,
 * para que la ruta del éxito y el encabezado funcionen con compras reales.
 */
export function normalizePurchaseDetailFromApi(
  api: PurchaseApiPayload,
): PurchaseDetail {
  const id = api.id ?? ''
  const lineItems = (api.lineItems ?? []).map((li) => ({
    ...li,
    lineKind: li.lineKind ?? (li.productId?.trim() ? 'product' : 'manual'),
    quantityReceived: 0,
    discount: li.discount ?? '0%',
  }))
  const stage = resolveStage(id, api.status)
  const status = journeyStageToListStatus(stage)

  const supplier = api.supplier?.trim() || '—'
  const reference = api.reference?.trim() || '—'

  return {
    id,
    reference,
    supplier,
    supplierId: api.supplierId,
    productSummary: api.productSummary?.trim() || '',
    orderDate: api.orderDate?.trim() || '—',
    amount: api.amount?.trim() || '$0',
    amountNum: api.amountNum ?? 0,
    status,
    owner: api.owner?.trim() || '—',
    createdAt: api.createdAt ?? '',
    createdById: api.createdById ?? '',
    createdByName: api.createdByName ?? '',
    updatedAt: api.updatedAt ?? '',
    updatedById: api.updatedById ?? '',
    updatedByName: api.updatedByName ?? '',
    description: api.description?.trim() ?? '',
    stageEnteredAt:
      api.stageEnteredAt?.trim() ||
      new Date().toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    expectedDelivery: api.expectedDelivery?.trim() ?? '',
    paymentTerms: api.paymentTerms?.trim() ?? '',
    warehouseId: api.warehouseId,
    warehouse: api.warehouse?.trim() ?? '',
    deliveryAddress: api.deliveryAddress?.trim() ?? '',
    supplierContactId: api.supplierContactId,
    supplierContact: api.supplierContact?.trim() ?? '',
    supplierEmail: api.supplierEmail?.trim() ?? '',
    supplierPhone: api.supplierPhone?.trim() ?? '',
    cancelReason: api.cancelReason,
    nextStep: api.nextStep,
    tags: api.tags?.length ? api.tags : ['Compras'],
    stage,
    stageHistory:
      api.stageHistory && api.stageHistory.length > 0
        ? api.stageHistory
        : stageHistoryFor(id, stage),
    lineItems,
    activities: api.activities ?? [],
    notes: api.notes ?? [],
    files: api.files ?? [],
    pendingActivities: api.pendingActivities ?? 0,
    daysInStage: api.daysInStage ?? 0,
    receivedPercent: 0,
  }
}
