import { tenantQuery } from '../db/tenant-query.js'
import { tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreatePrivacyRequestInput,
  PrivacyRequest,
  PrivacyRequestStatus,
  UpdatePrivacyRequestInput,
} from '../types/privacy.js'
import { toIsoString } from '../utils/format.js'

const RESPONSE_DAYS = 30

type PrivacyRequestRow = {
  id: string
  request_code: string
  request_type: PrivacyRequest['requestType']
  status: PrivacyRequestStatus
  subject_name: string
  subject_email: string
  subject_rut: string | null
  contact_id: string | null
  channel: string
  description: string | null
  response_notes: string | null
  rejection_reason: string | null
  due_at: Date
  extended_due_at: Date | null
  completed_at: Date | null
  created_at: Date
  updated_at: Date
  created_by_id: string | null
  created_by_name: string | null
  handled_by_id: string | null
  handled_by_name: string | null
}

function daysRemaining(dueAt: Date, status: PrivacyRequestStatus): number {
  if (status === 'completada' || status === 'rechazada') return 0
  const ms = dueAt.getTime() - Date.now()
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

function mapRow(row: PrivacyRequestRow): PrivacyRequest {
  const due = row.extended_due_at ?? row.due_at
  const remaining = daysRemaining(due, row.status)
  return {
    id: row.id,
    requestCode: row.request_code,
    requestType: row.request_type,
    status: row.status,
    subjectName: row.subject_name,
    subjectEmail: row.subject_email,
    subjectRut: row.subject_rut ?? undefined,
    contactId: row.contact_id ?? undefined,
    channel: row.channel,
    description: row.description ?? undefined,
    responseNotes: row.response_notes ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    dueAt: toIsoString(row.due_at),
    extendedDueAt: row.extended_due_at ? toIsoString(row.extended_due_at) : undefined,
    completedAt: row.completed_at ? toIsoString(row.completed_at) : undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    createdById: row.created_by_id ?? undefined,
    createdByName: row.created_by_name ?? undefined,
    handledById: row.handled_by_id ?? undefined,
    handledByName: row.handled_by_name ?? undefined,
    daysRemaining: remaining,
    isOverdue: remaining < 0 && row.status !== 'completada' && row.status !== 'rechazada',
  }
}

async function nextRequestCode(): Promise<string> {
  const result = await tenantQuery<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM crm_privacy_requests
     WHERE ${tenantWhereParam(1)}`,
    [getTenantIdOrDefault()],
  )
  const n = Number.parseInt(result.rows[0]?.count ?? '0', 10) + 1
  const year = new Date().getFullYear()
  return `ARS-${year}-${String(n).padStart(5, '0')}`
}

export async function listPrivacyRequests(): Promise<PrivacyRequest[]> {
  const result = await tenantQuery<PrivacyRequestRow>(
    `SELECT id, request_code, request_type, status, subject_name, subject_email,
            subject_rut, contact_id, channel, description, response_notes, rejection_reason,
            due_at, extended_due_at, completed_at, created_at, updated_at,
            created_by_id, created_by_name, handled_by_id, handled_by_name
     FROM crm_privacy_requests
     WHERE ${tenantWhereParam(1)}
     ORDER BY
       CASE status
         WHEN 'pendiente' THEN 0
         WHEN 'en_proceso' THEN 1
         WHEN 'prorrogada' THEN 2
         ELSE 3
       END,
       due_at ASC`,
    [getTenantIdOrDefault()],
  )
  return result.rows.map(mapRow)
}

export async function getPrivacyRequestById(id: string): Promise<PrivacyRequest> {
  const result = await tenantQuery<PrivacyRequestRow>(
    `SELECT id, request_code, request_type, status, subject_name, subject_email,
            subject_rut, contact_id, channel, description, response_notes, rejection_reason,
            due_at, extended_due_at, completed_at, created_at, updated_at,
            created_by_id, created_by_name, handled_by_id, handled_by_name
     FROM crm_privacy_requests
     WHERE id = $1 AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Solicitud de privacidad no encontrada')
  return mapRow(row)
}

export async function createPrivacyRequest(
  input: CreatePrivacyRequestInput,
  actor: AuditActor,
): Promise<PrivacyRequest> {
  const code = await nextRequestCode()
  const dueAt = new Date()
  dueAt.setDate(dueAt.getDate() + RESPONSE_DAYS)

  const result = await tenantQuery<PrivacyRequestRow>(
    `INSERT INTO crm_privacy_requests (
      tenant_id, request_code, request_type, status,
      subject_name, subject_email, subject_rut, contact_id,
      channel, description, due_at,
      created_by_id, created_by_name, handled_by_id, handled_by_name
    ) VALUES (
      $1, $2, $3, 'pendiente',
      $4, $5, $6, $7,
      $8, $9, $10,
      $11, $12, $11, $12
    )
    RETURNING id, request_code, request_type, status, subject_name, subject_email,
              subject_rut, contact_id, channel, description, response_notes, rejection_reason,
              due_at, extended_due_at, completed_at, created_at, updated_at,
              created_by_id, created_by_name, handled_by_id, handled_by_name`,
    [
      getTenantIdOrDefault(),
      code,
      input.requestType,
      input.subjectName.trim(),
      input.subjectEmail.trim().toLowerCase(),
      input.subjectRut?.trim() || null,
      input.contactId || null,
      input.channel?.trim() || 'interno',
      input.description?.trim() || null,
      dueAt,
      actor.userId,
      actor.userName,
    ],
  )
  return mapRow(result.rows[0]!)
}

export async function updatePrivacyRequest(
  id: string,
  input: UpdatePrivacyRequestInput,
  actor: AuditActor,
): Promise<PrivacyRequest> {
  const existing = await getPrivacyRequestById(id)

  if (input.status === 'rechazada' && !input.rejectionReason?.trim()) {
    throw badRequest('Indica el motivo del rechazo de la solicitud.')
  }

  let extendedDueAt = existing.extendedDueAt
    ? new Date(existing.extendedDueAt)
    : null
  let status = input.status ?? existing.status

  if (input.extendDeadline) {
    if (existing.extendedDueAt) {
      throw badRequest('Esta solicitud ya utilizó la prórroga de 30 días.')
    }
    const base = new Date(existing.dueAt)
    base.setDate(base.getDate() + RESPONSE_DAYS)
    extendedDueAt = base
    status = 'prorrogada'
  }

  const completedAt =
    input.status === 'completada' || input.status === 'rechazada'
      ? new Date()
      : existing.completedAt
        ? new Date(existing.completedAt)
        : null

  const result = await tenantQuery<PrivacyRequestRow>(
    `UPDATE crm_privacy_requests SET
      status = $3,
      response_notes = COALESCE($4, response_notes),
      rejection_reason = COALESCE($5, rejection_reason),
      extended_due_at = $6,
      completed_at = $7,
      handled_by_id = $8,
      handled_by_name = $9,
      updated_at = now()
     WHERE id = $1 AND ${tenantWhereParam(2)}
     RETURNING id, request_code, request_type, status, subject_name, subject_email,
               subject_rut, contact_id, channel, description, response_notes, rejection_reason,
               due_at, extended_due_at, completed_at, created_at, updated_at,
               created_by_id, created_by_name, handled_by_id, handled_by_name`,
    [
      id,
      getTenantIdOrDefault(),
      status,
      input.responseNotes?.trim() || null,
      input.rejectionReason?.trim() || null,
      extendedDueAt,
      completedAt,
      actor.userId,
      actor.userName,
    ],
  )
  return mapRow(result.rows[0]!)
}
