import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type {
  WorkerDetail,
  WorkerListItem,
  WorkerPayrollListItem,
  WorkerVacationRequest,
} from '@/data/workers.mock'

const BASE = `${API_V1}/workers`

export type WorkerApiBody = {
  number?: string
  fullName?: string
  taxId?: string
  email?: string
  phone?: string
  address?: string
  avatarUrl?: string
  jobTitle?: string
  businessUnit?: string
  jobFunctions?: string
  status?: string
  contractType?: string
  workHours?: number
  startDate?: string
  endDate?: string | null
  baseSalaryNum?: number
  gratificationNum?: number
  afpName?: string
  afpRate?: number
  healthInstitution?: string
  healthPlan?: string
  afcRate?: number
  vacationAdjustmentDays?: number
  paydayDay?: number
  ownerName?: string
}

function normalizeDetail(data: Partial<WorkerDetail>): WorkerDetail {
  return {
    ...(data as WorkerDetail),
    vacationSummary: data.vacationSummary ?? {
      accruedDays: 0,
      usedDays: 0,
      adjustmentDays: 0,
      balanceDays: 0,
    },
    vacations: data.vacations ?? [],
    payrolls: data.payrolls ?? [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    files: data.files ?? [],
  }
}

export async function listWorkersApi(archived: boolean): Promise<WorkerListItem[]> {
  return fetchAllPages<WorkerListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
}

export async function getWorkerApi(id: string): Promise<WorkerDetail> {
  const res = await fetchJSON<ApiItemResponse<WorkerDetail>>(`${BASE}/${id}`)
  return normalizeDetail(res.data)
}

export async function createWorkerApi(body: WorkerApiBody): Promise<WorkerDetail> {
  const res = await fetchJSON<ApiItemResponse<WorkerDetail>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizeDetail(res.data)
}

export async function updateWorkerApi(
  id: string,
  body: Partial<WorkerApiBody>,
): Promise<WorkerDetail> {
  const res = await fetchJSON<ApiItemResponse<WorkerDetail>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizeDetail(res.data)
}

export async function archiveWorkerApi(id: string): Promise<WorkerListItem> {
  const res = await fetchJSON<ApiItemResponse<WorkerListItem>>(`${BASE}/${id}/archive`, {
    method: 'POST',
  })
  return res.data
}

export async function restoreWorkerApi(id: string): Promise<WorkerListItem> {
  const res = await fetchJSON<ApiItemResponse<WorkerListItem>>(`${BASE}/${id}/restore`, {
    method: 'POST',
  })
  return res.data
}

export async function permanentlyDeleteWorkerApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}

// ── Vacaciones ────────────────────────────────────────────────────────────────
export async function createVacationApi(
  workerId: string,
  body: { startDate: string; endDate: string; days?: number; status?: string; notes?: string },
): Promise<WorkerVacationRequest> {
  const res = await fetchJSON<ApiItemResponse<WorkerVacationRequest>>(
    `${BASE}/${workerId}/vacations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function updateVacationApi(
  workerId: string,
  vacationId: string,
  body: { status?: string; notes?: string },
): Promise<WorkerVacationRequest> {
  const res = await fetchJSON<ApiItemResponse<WorkerVacationRequest>>(
    `${BASE}/${workerId}/vacations/${vacationId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function deleteVacationApi(workerId: string, vacationId: string): Promise<void> {
  await fetchJSON(`${BASE}/${workerId}/vacations/${vacationId}`, { method: 'DELETE' })
}

// ── Liquidaciones ─────────────────────────────────────────────────────────────
export type PayrollApiBody = {
  periodYear?: number
  periodMonth?: number
  daysWorked?: number
  daysLicense?: number
  daysAbsence?: number
  daysVacation?: number
  ufValueCents?: number
  incomeTaxCents?: number
  extraTaxableCents?: number
  nonTaxableCents?: number
  paid?: boolean
}

export async function createPayrollApi(
  workerId: string,
  body: PayrollApiBody,
): Promise<WorkerPayrollListItem> {
  const res = await fetchJSON<ApiItemResponse<WorkerPayrollListItem>>(
    `${BASE}/${workerId}/payrolls`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function markPayrollPaidApi(
  workerId: string,
  payrollId: string,
  paid: boolean,
): Promise<WorkerPayrollListItem> {
  const res = await fetchJSON<ApiItemResponse<WorkerPayrollListItem>>(
    `${BASE}/${workerId}/payrolls/${payrollId}/pay`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid }),
    },
  )
  return res.data
}

export async function deletePayrollApi(workerId: string, payrollId: string): Promise<void> {
  await fetchJSON(`${BASE}/${workerId}/payrolls/${payrollId}`, { method: 'DELETE' })
}

export function payrollPdfUrl(workerId: string, payrollId: string): string {
  return `${BASE}/${workerId}/payrolls/${payrollId}/pdf`
}
