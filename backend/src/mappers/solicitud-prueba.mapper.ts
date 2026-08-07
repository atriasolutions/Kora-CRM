import type {
  PruebaCasoDto,
  PruebaSolicitudDetail,
  PruebaSolicitudListItem,
} from '../types/solicitud-prueba.js'
import { toIsoString } from '../utils/format.js'

function toDateOnlyString(value: Date | string | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`
  }
  return new Date(value).toISOString().slice(0, 10)
}

export type PruebaRow = {
  id: string
  code: string
  solicitud_id: string
  solicitud_code: string
  solicitud_title: string
  description: string
  executed_at: Date | string | null
  created_at: Date
  created_by_id: string | null
  created_by_name: string | null
  updated_at: Date
  updated_by_id: string | null
  updated_by_name: string | null
  case_count?: string | number
  client_ok_count?: string | number
  company_id?: string | null
  company_name?: string | null
}

export type PruebaCasoRow = {
  id: string
  prueba_id: string
  code: string
  sort_order: number
  short_description: string
  input_data: string
  steps: string
  expected_result: string
  obtained_result: string
  executor_ok: boolean | null
  executor_notes: string
  executor_ok_at: Date | null
  evidence_html: string
  client_ok: boolean | null
  client_notes: string
  client_ok_at: Date | null
}

export function mapPruebaCasoRow(row: PruebaCasoRow): PruebaCasoDto {
  return {
    id: row.id,
    code: row.code,
    sortOrder: row.sort_order,
    shortDescription: row.short_description ?? '',
    inputData: row.input_data ?? '',
    steps: row.steps ?? '',
    expectedResult: row.expected_result ?? '',
    obtainedResult: row.obtained_result ?? '',
    executorOk: row.executor_ok,
    executorNotes: row.executor_notes ?? '',
    executorOkAt: row.executor_ok_at ? toIsoString(row.executor_ok_at) : null,
    evidenceHtml: row.evidence_html ?? '',
    clientOk: row.client_ok,
    clientNotes: row.client_notes ?? '',
    clientOkAt: row.client_ok_at ? toIsoString(row.client_ok_at) : null,
  }
}

export function mapPruebaRow(row: PruebaRow): PruebaSolicitudListItem {
  return {
    id: row.id,
    code: row.code,
    solicitudId: row.solicitud_id,
    solicitudCode: row.solicitud_code,
    solicitudTitle: row.solicitud_title,
    description: row.description ?? '',
    executedAt: toDateOnlyString(row.executed_at) || '',
    caseCount: Number(row.case_count ?? 0),
    clientOkCount: Number(row.client_ok_count ?? 0),
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name ?? '',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name ?? '',
    companyId: row.company_id ?? undefined,
    companyName: row.company_name?.trim() || undefined,
  }
}

export function mapPruebaDetail(row: PruebaRow, cases: PruebaCasoRow[]): PruebaSolicitudDetail {
  return {
    ...mapPruebaRow(row),
    cases: cases.map(mapPruebaCasoRow),
  }
}

export function toExecutedAtInput(value: string | null | undefined): string | null {
  if (value === null) return null
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  return null
}
