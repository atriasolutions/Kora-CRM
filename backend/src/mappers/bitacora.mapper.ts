import type { BitacoraDetail, BitacoraListItem } from '../types/bitacora.js'
import { toIsoString } from '../utils/format.js'

function toDateOnlyString(value: Date | string | null | undefined): string {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  return new Date(value).toISOString().slice(0, 10)
}

export type BitacoraRow = {
  id: string
  solicitud_id: string
  solicitud_code: string
  solicitud_title: string
  work_date: Date | string
  hours: string | number
  description: string
  is_billable: boolean
  non_billable_reason: string | null
  assigned_user_id: string | null
  assigned_user_name: string
  company_id: string | null
  company_name: string | null
  created_at: Date
  created_by_id: string | null
  created_by_name: string | null
  updated_at: Date
  updated_by_id: string | null
  updated_by_name: string | null
}

export function mapBitacoraRow(row: BitacoraRow): BitacoraListItem {
  return {
    id: row.id,
    solicitudId: row.solicitud_id,
    solicitudCode: row.solicitud_code,
    solicitudTitle: row.solicitud_title,
    workDate: toDateOnlyString(row.work_date),
    hours: Number(row.hours),
    description: row.description ?? '',
    isBillable: row.is_billable,
    nonBillableReason: row.non_billable_reason,
    assignedUserId: row.assigned_user_id ?? '',
    assignedUserName: row.assigned_user_name ?? '',
    companyId: row.company_id ?? undefined,
    companyName: row.company_name?.trim() || undefined,
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name ?? '',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name ?? '',
  }
}

export function mapBitacoraDetail(row: BitacoraRow): BitacoraDetail {
  return mapBitacoraRow(row)
}
