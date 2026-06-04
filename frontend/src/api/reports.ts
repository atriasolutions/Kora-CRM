import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse } from '@/api/types'
import type {
  ReportFolderInput,
  ReportItemInput,
} from '@/contexts/reports-tree-context'
import type {
  ReportFolder,
  ReportItem,
  ReportsTreeData,
} from '@/types/reports-tree'
import type { ReportTableConfig } from '@/types/report-table'
import type { ReportTableRunResult } from '@/types/report-table'

const BASE = `${API_V1}/reports`

export async function getReportsTreeApi(): Promise<ReportsTreeData> {
  const res = await fetchJSON<ApiItemResponse<ReportsTreeData>>(`${BASE}/tree`)
  return res.data
}

export async function getReportApi(id: string): Promise<ReportItem> {
  const res = await fetchJSON<ApiItemResponse<ReportItem>>(`${BASE}/${id}`)
  return res.data
}

export async function createReportFolderApi(
  input: ReportFolderInput,
): Promise<ReportFolder> {
  const res = await fetchJSON<ApiItemResponse<ReportFolder>>(`${BASE}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return res.data
}

export async function updateReportFolderApi(
  id: string,
  name: string,
): Promise<ReportFolder> {
  const res = await fetchJSON<ApiItemResponse<ReportFolder>>(`${BASE}/folders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return res.data
}

export async function deleteReportFolderApi(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await fetchJSON(`${BASE}/folders/${id}`, { method: 'DELETE' })
    return { ok: true }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'No se pudo eliminar la carpeta.'
    return { ok: false, error: message }
  }
}

export async function createReportApi(input: ReportItemInput): Promise<ReportItem> {
  const res = await fetchJSON<ApiItemResponse<ReportItem>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return res.data
}

export async function updateReportApi(
  id: string,
  input: Partial<ReportItemInput>,
): Promise<ReportItem> {
  const res = await fetchJSON<ApiItemResponse<ReportItem>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return res.data
}

export async function updateReportTableConfigApi(
  id: string,
  tableConfig: ReportTableConfig,
): Promise<ReportItem> {
  const res = await fetchJSON<ApiItemResponse<ReportItem>>(
    `${BASE}/${id}/table-config`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableConfig }),
    },
  )
  return res.data
}

export async function deleteReportApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}

export async function recordReportRunApi(
  id: string,
): Promise<{ report: ReportItem; lastRun: string }> {
  const res = await fetchJSON<
    ApiItemResponse<{ report: ReportItem; lastRun: string }>
  >(`${BASE}/${id}/run`, { method: 'POST' })
  return res.data
}

export async function executeReportTableApi(
  tableConfig: ReportTableConfig,
): Promise<ReportTableRunResult & { filterError?: string }> {
  const res = await fetchJSON<
    ApiItemResponse<ReportTableRunResult & { filterError?: string }>
  >(`${BASE}/execute-table`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableConfig }),
  })
  return res.data
}
