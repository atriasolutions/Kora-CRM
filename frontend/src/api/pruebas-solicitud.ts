import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type {
  PruebaCaso,
  PruebaSolicitudDetail,
  PruebaSolicitudListItem,
} from '@/data/pruebas-solicitud.mock'
import { serializeDescriptionHtml } from '@/lib/solicitud-description-media'

const BASE = `${API_V1}/pruebas-solicitud`

export type PruebaCasoApiBody = {
  id?: string
  shortDescription?: string
  inputData?: string
  steps?: string
  expectedResult?: string
  obtainedResult?: string
  executorOk?: boolean | null
  executorNotes?: string
  evidenceHtml?: string
  clientOk?: boolean | null
  clientNotes?: string
}

export type CreatePruebaSolicitudApiBody = {
  solicitudId: string
  description?: string
  executedAt?: string
  cases?: PruebaCasoApiBody[]
}

export type UpdatePruebaSolicitudApiBody = {
  description?: string
  executedAt?: string | null
}

function casoToApiBody(caso: PruebaCaso): PruebaCasoApiBody {
  return {
    id: caso.id.startsWith('caso-temp-') ? undefined : caso.id,
    shortDescription: caso.shortDescription,
    inputData: caso.inputData,
    steps: caso.steps,
    expectedResult: caso.expectedResult,
    obtainedResult: caso.obtainedResult,
    executorOk: caso.executorOk,
    executorNotes: caso.executorNotes,
    evidenceHtml: serializeDescriptionHtml(caso.evidenceHtml) || undefined,
    clientOk: caso.clientOk,
    clientNotes: caso.clientNotes,
  }
}

export async function listPruebasSolicitudApi(
  archived = false,
  solicitudId?: string,
): Promise<PruebaSolicitudListItem[]> {
  return fetchAllPages<PruebaSolicitudListItem>(BASE, {
    archived: archived ? 'true' : 'false',
    ...(solicitudId ? { solicitudId } : {}),
  })
}

export async function getPruebaSolicitudApi(id: string): Promise<PruebaSolicitudDetail> {
  const res = await fetchJSON<ApiItemResponse<PruebaSolicitudDetail>>(`${BASE}/${id}`)
  return res.data
}

export async function createPruebaSolicitudApi(
  body: CreatePruebaSolicitudApiBody,
): Promise<PruebaSolicitudDetail> {
  const res = await fetchJSON<ApiItemResponse<PruebaSolicitudDetail>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updatePruebaSolicitudApi(
  id: string,
  body: UpdatePruebaSolicitudApiBody,
): Promise<PruebaSolicitudDetail> {
  const res = await fetchJSON<ApiItemResponse<PruebaSolicitudDetail>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updatePruebaCasosApi(
  id: string,
  cases: PruebaCaso[],
): Promise<PruebaSolicitudDetail> {
  const res = await fetchJSON<ApiItemResponse<PruebaSolicitudDetail>>(`${BASE}/${id}/casos`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cases: cases.map(casoToApiBody) }),
  })
  return res.data
}

export async function clientReviewPruebaCasoApi(
  pruebaId: string,
  casoId: string,
  body: { clientOk: boolean; clientNotes?: string },
): Promise<PruebaSolicitudDetail> {
  const res = await fetchJSON<ApiItemResponse<PruebaSolicitudDetail>>(
    `${BASE}/${pruebaId}/casos/${casoId}/client-review`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function archivePruebaSolicitudApi(id: string): Promise<PruebaSolicitudDetail> {
  const res = await fetchJSON<ApiItemResponse<PruebaSolicitudDetail>>(`${BASE}/${id}/archive`, {
    method: 'POST',
  })
  return res.data
}

export async function restorePruebaSolicitudApi(id: string): Promise<PruebaSolicitudDetail> {
  const res = await fetchJSON<ApiItemResponse<PruebaSolicitudDetail>>(`${BASE}/${id}/restore`, {
    method: 'POST',
  })
  return res.data
}

export async function permanentlyDeletePruebaSolicitudApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}

export function listPruebasForSolicitudApi(solicitudId: string) {
  return listPruebasSolicitudApi(false, solicitudId)
}
