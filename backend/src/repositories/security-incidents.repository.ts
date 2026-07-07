import { tenantQuery } from '../db/tenant-query.js'
import { tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import { notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreateSecurityIncidentInput,
  SecurityIncident,
  SecurityIncidentStatus,
  UpdateSecurityIncidentInput,
} from '../types/privacy.js'
import { toIsoString } from '../utils/format.js'

type SecurityIncidentRow = {
  id: string
  title: string
  description: string
  severity: SecurityIncident['severity']
  status: SecurityIncidentStatus
  data_categories: string | null
  affected_count_estimate: number | null
  notified_apdp_at: Date | null
  notified_subjects_at: Date | null
  measures_taken: string | null
  created_at: Date
  updated_at: Date
  created_by_id: string | null
  created_by_name: string | null
}

function mapRow(row: SecurityIncidentRow): SecurityIncident {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    dataCategories: row.data_categories ?? undefined,
    affectedCountEstimate: row.affected_count_estimate ?? undefined,
    notifiedApdpAt: row.notified_apdp_at ? toIsoString(row.notified_apdp_at) : undefined,
    notifiedSubjectsAt: row.notified_subjects_at
      ? toIsoString(row.notified_subjects_at)
      : undefined,
    measuresTaken: row.measures_taken ?? undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    createdById: row.created_by_id ?? undefined,
    createdByName: row.created_by_name ?? undefined,
  }
}

const SELECT = `id, title, description, severity, status, data_categories,
  affected_count_estimate, notified_apdp_at, notified_subjects_at, measures_taken,
  created_at, updated_at, created_by_id, created_by_name`

export async function listSecurityIncidents(): Promise<SecurityIncident[]> {
  const result = await tenantQuery<SecurityIncidentRow>(
    `SELECT ${SELECT}
     FROM crm_security_incidents
     WHERE ${tenantWhereParam(1)}
     ORDER BY created_at DESC`,
    [getTenantIdOrDefault()],
  )
  return result.rows.map(mapRow)
}

export async function getSecurityIncidentById(id: string): Promise<SecurityIncident> {
  const result = await tenantQuery<SecurityIncidentRow>(
    `SELECT ${SELECT}
     FROM crm_security_incidents
     WHERE id = $1 AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Incidente de seguridad no encontrado')
  return mapRow(row)
}

export async function createSecurityIncident(
  input: CreateSecurityIncidentInput,
  actor: AuditActor,
): Promise<SecurityIncident> {
  const result = await tenantQuery<SecurityIncidentRow>(
    `INSERT INTO crm_security_incidents (
      tenant_id, title, description, severity, status,
      data_categories, affected_count_estimate, measures_taken,
      created_by_id, created_by_name
    ) VALUES ($1, $2, $3, $4, 'abierto', $5, $6, $7, $8, $9)
    RETURNING ${SELECT}`,
    [
      getTenantIdOrDefault(),
      input.title.trim(),
      input.description.trim(),
      input.severity ?? 'medio',
      input.dataCategories?.trim() || null,
      input.affectedCountEstimate ?? null,
      input.measuresTaken?.trim() || null,
      actor.userId,
      actor.userName,
    ],
  )
  return mapRow(result.rows[0]!)
}

export async function updateSecurityIncident(
  id: string,
  input: UpdateSecurityIncidentInput,
): Promise<SecurityIncident> {
  await getSecurityIncidentById(id)

  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  const fields: [keyof UpdateSecurityIncidentInput, string][] = [
    ['title', 'title'],
    ['description', 'description'],
    ['severity', 'severity'],
    ['status', 'status'],
    ['dataCategories', 'data_categories'],
    ['affectedCountEstimate', 'affected_count_estimate'],
    ['measuresTaken', 'measures_taken'],
    ['notifiedApdpAt', 'notified_apdp_at'],
    ['notifiedSubjectsAt', 'notified_subjects_at'],
  ]

  for (const [key, col] of fields) {
    if (input[key] !== undefined) {
      sets.push(`${col} = $${idx++}`)
      const val = input[key]
      if (key === 'notifiedApdpAt' || key === 'notifiedSubjectsAt') {
        values.push(val ? new Date(val as string) : null)
      } else if (typeof val === 'string') {
        values.push(val.trim() || null)
      } else {
        values.push(val)
      }
    }
  }

  if (sets.length === 0) return getSecurityIncidentById(id)

  sets.push('updated_at = now()')
  values.push(id, getTenantIdOrDefault())

  const result = await tenantQuery<SecurityIncidentRow>(
    `UPDATE crm_security_incidents SET ${sets.join(', ')}
     WHERE id = $${idx} AND ${tenantWhereParam(idx + 1)}
     RETURNING ${SELECT}`,
    values,
  )
  return mapRow(result.rows[0]!)
}
