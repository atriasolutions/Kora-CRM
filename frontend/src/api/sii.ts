import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse, ApiListResponse } from '@/api/types'

const BASE = `${API_V1}/sii`

export type SiiIntegrationStatus = {
  invoicingMode: 'manual' | 'sii'
  configured: boolean
  credentialsCount: number
  folioRangesCount: number
  folioTypesAvailable: number[]
  folioTypesMissing: number[]
  lastRcvSyncAt: string | null
  readyToEmit: boolean
  missing: string[]
}

export type SiiCredential = {
  id: string
  env: 'certification' | 'production'
  label: string | null
  certRut: string | null
  certExpiresAt: string | null
  hasPortalCredentials: boolean
  createdAt: string
  updatedAt: string
}

export type FolioRange = {
  id: string
  dteType: number
  rangeStart: number
  rangeEnd: number
  nextFolio: number
  remaining: number
  active: boolean
}

export type RcvInvoice = {
  id: string
  issueType: 'issued' | 'received'
  periodYear: number
  periodMonth: number
  dteType: number | null
  folio: number | null
  issuerRut: string | null
  issuerName: string | null
  receiverRut: string | null
  receiverName: string | null
  issueDate: string | null
  netAmount: number | null
  taxAmount: number | null
  totalAmount: number | null
  syncedAt: string
}

export type EmitSiiResult = {
  invoiceId: string
  folio: number
  trackId: string | null
  dteStatus: string
  siiNumber: string
}

export async function getSiiStatusApi(): Promise<SiiIntegrationStatus> {
  const res = await fetchJSON<ApiItemResponse<SiiIntegrationStatus>>(`${BASE}/status`)
  return res.data
}

export async function listSiiCredentialsApi(): Promise<SiiCredential[]> {
  const res = await fetchJSON<ApiListResponse<SiiCredential>>(`${BASE}/credentials`)
  return res.data
}

export type SiiCredentialUploadResult = {
  credential: SiiCredential
  tokenTest: {
    ok: boolean
    error?: string
    certRut?: string | null
    certExpiresAt?: string | null
  }
}

export async function uploadSiiCredentialApi(form: FormData): Promise<SiiCredentialUploadResult> {
  const res = await fetchJSON<ApiItemResponse<SiiCredentialUploadResult>>(`${BASE}/credentials`, {
    method: 'POST',
    body: form,
  })
  return res.data
}

export async function deleteSiiCredentialApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/credentials/${id}`, { method: 'DELETE' })
}

export async function listFolioRangesApi(): Promise<FolioRange[]> {
  const res = await fetchJSON<ApiListResponse<FolioRange>>(`${BASE}/folios`)
  return res.data
}

export async function uploadCafApi(body: {
  dteType: number
  cafXml: string
  rangeStart?: number
  rangeEnd?: number
}): Promise<FolioRange> {
  const res = await fetchJSON<ApiItemResponse<FolioRange>>(`${BASE}/folios/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function syncRcvApi(body: {
  period: string
  type: 'issued' | 'received'
}): Promise<{ synced: number }> {
  const res = await fetchJSON<ApiItemResponse<{ synced: number }>>(`${BASE}/rcv/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function listRcvApi(params: {
  period?: string
  type?: 'issued' | 'received'
}): Promise<RcvInvoice[]> {
  const qs = new URLSearchParams()
  if (params.period) qs.set('period', params.period)
  if (params.type) qs.set('type', params.type)
  const res = await fetchJSON<ApiListResponse<RcvInvoice>>(
    `${BASE}/rcv?${qs.toString()}`,
  )
  return res.data
}

export async function emitInvoiceToSiiApi(
  invoiceId: string,
  env: 'certification' | 'production' = 'certification',
): Promise<EmitSiiResult> {
  const res = await fetchJSON<ApiItemResponse<EmitSiiResult>>(
    `${API_V1}/invoices/${invoiceId}/emit-sii`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ env }),
    },
  )
  return res.data
}

export async function getInvoiceDteStatusApi(
  invoiceId: string,
): Promise<{ dteStatus: string; trackId: string | null }> {
  const res = await fetchJSON<
    ApiItemResponse<{ dteStatus: string; trackId: string | null }>
  >(`${BASE}/invoices/${invoiceId}/dte-status`)
  return res.data
}
