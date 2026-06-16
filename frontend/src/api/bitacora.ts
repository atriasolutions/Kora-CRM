import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { BitacoraDetail, BitacoraListItem } from '@/data/bitacora.mock'
import type { BitacoraDashboardQuery } from '@/lib/bitacora-dashboard'
import type { BitacoraDashboardStats } from '@/types/bitacora-dashboard'
import { prepareBitacoraFormForSubmit, type BitacoraFormValues } from '@/lib/bitacora-form'

const BASE = `${API_V1}/bitacora`

export type BitacoraApiBody = {
  solicitudId?: string
  workDate?: string
  hours?: number
  description?: string
  isBillable?: boolean
  nonBillableReason?: string | null
  assignedUserId?: string
  assignedUserName?: string
}

export function bitacoraFormToApiBody(values: BitacoraFormValues): BitacoraApiBody {
  const prepared = prepareBitacoraFormForSubmit(values)
  const body: BitacoraApiBody = {
    solicitudId: prepared.solicitudId.trim(),
    workDate: prepared.workDate,
    hours: prepared.hours,
    description: prepared.description.trim(),
    isBillable: prepared.isBillable,
    assignedUserId: prepared.assignedUserId.trim(),
    assignedUserName: prepared.assignedUserName.trim() || undefined,
  }
  if (!prepared.isBillable) {
    const reason = prepared.nonBillableReason.trim()
    if (reason) body.nonBillableReason = reason
  }
  return body
}

export function bitacoraDetailToApiBody(detail: BitacoraDetail): BitacoraApiBody {
  const body: BitacoraApiBody = {
    solicitudId: detail.solicitudId,
    workDate: detail.workDate,
    hours: detail.hours,
    description: detail.description,
    isBillable: detail.isBillable,
    assignedUserId: detail.assignedUserId,
    assignedUserName: detail.assignedUserName,
  }
  if (!detail.isBillable && detail.nonBillableReason?.trim()) {
    body.nonBillableReason = detail.nonBillableReason.trim()
  }
  return body
}

export async function listBitacoraApi(archived = false): Promise<BitacoraListItem[]> {
  return fetchAllPages<BitacoraListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
}

export async function listBitacoraForSolicitudApi(
  solicitudId: string,
): Promise<BitacoraListItem[]> {
  const id = solicitudId.trim()
  if (!id) return []
  const res = await fetchJSON<ApiItemResponse<BitacoraListItem[]>>(
    `${BASE}/for-solicitud/${id}`,
  )
  return res.data
}

export async function getBitacoraApi(id: string): Promise<BitacoraDetail> {
  const res = await fetchJSON<ApiItemResponse<BitacoraDetail>>(`${BASE}/${id}`)
  return res.data
}

export async function createBitacoraApi(body: BitacoraApiBody): Promise<BitacoraDetail> {
  const res = await fetchJSON<ApiItemResponse<BitacoraDetail>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateBitacoraApi(
  id: string,
  body: Partial<BitacoraApiBody>,
): Promise<BitacoraDetail> {
  const res = await fetchJSON<ApiItemResponse<BitacoraDetail>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function archiveBitacoraApi(id: string): Promise<BitacoraListItem> {
  const res = await fetchJSON<ApiItemResponse<BitacoraListItem>>(
    `${BASE}/${id}/archive`,
    { method: 'POST' },
  )
  return res.data
}

export async function restoreBitacoraApi(id: string): Promise<BitacoraListItem> {
  const res = await fetchJSON<ApiItemResponse<BitacoraListItem>>(
    `${BASE}/${id}/restore`,
    { method: 'POST' },
  )
  return res.data
}

export async function permanentlyDeleteBitacoraApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}

/** @deprecated Usar archiveBitacoraApi */
export async function deleteBitacoraApi(id: string): Promise<void> {
  await archiveBitacoraApi(id)
}

export async function fetchBitacoraDashboardApi(
  query: BitacoraDashboardQuery = {},
): Promise<BitacoraDashboardStats> {
  const search = new URLSearchParams()
  if (query.mine) search.set('mine', query.mine)
  if (query.workDateFrom) search.set('workDateFrom', query.workDateFrom)
  if (query.workDateTo) search.set('workDateTo', query.workDateTo)
  if (query.companyId) search.set('companyId', query.companyId)
  const qs = search.toString()
  const res = await fetchJSON<ApiItemResponse<BitacoraDashboardStats>>(
    `${BASE}/dashboard-stats${qs ? `?${qs}` : ''}`,
  )
  return res.data
}
