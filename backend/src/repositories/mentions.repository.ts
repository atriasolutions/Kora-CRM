import { tenantQuery } from '../db/tenant-query.js'
import { TENANT_USER_DISPLAY_NAME_SQL } from '../lib/tenant-user-display-name-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import { USER_DIRECTORY_VISIBLE_CONDITION_U } from '../lib/user-directory.js'
import type { MentionKind, MentionSearchItem } from '../types/mentions.js'

const ACTIVE_NOT_ARCHIVED = `deleted_at IS NULL AND archived_at IS NULL`
const ACTIVE_ONLY = `deleted_at IS NULL`

function compositeId(kind: MentionKind, recordId: string): string {
  return `${kind}:${recordId}`
}

function hrefFor(kind: MentionKind, recordId: string): string {
  switch (kind) {
    case 'user':
      return `/usuarios/${recordId}`
    case 'contact':
      return `/contactos/${recordId}`
    case 'company':
      return `/empresas/${recordId}`
    case 'opportunity':
      return `/oportunidades/${recordId}`
    case 'quote':
      return `/cotizaciones/${recordId}`
    case 'project':
      return `/proyectos/${recordId}`
    case 'product':
      return `/productos/${recordId}`
    case 'invoice':
      return `/facturacion/${recordId}`
    case 'activity':
      return `/actividades/${recordId}`
    case 'solicitud':
      return `/solicitudes/${recordId}`
    default:
      return ''
  }
}

type Row = {
  kind: MentionKind
  record_id: string
  label: string
  subtitle: string | null
}

function mapRow(row: Row): MentionSearchItem {
  return {
    id: compositeId(row.kind, row.record_id),
    kind: row.kind,
    recordId: row.record_id,
    label: row.label,
    subtitle: row.subtitle?.trim() || undefined,
    href: hrefFor(row.kind, row.record_id),
  }
}

async function searchKind(
  sql: string,
  pattern: string | null,
  limit: number,
  extraParams: unknown[] = [],
): Promise<MentionSearchItem[]> {
  const params = pattern ? [pattern, limit, ...extraParams] : [limit, ...extraParams]
  const result = await tenantQuery<Row>(sql, params)
  return result.rows.map(mapRow)
}

const USER_MENTION_MEMBERSHIP_JOIN = `
  INNER JOIN crm_tenant_memberships mem
    ON mem.user_id = u.id AND mem.tenant_id = $TENANT$::uuid
   AND mem.status = 'active'`

function userMentionSearchSql(pattern: string | null, tenantParam: string): string {
  const membershipJoin = USER_MENTION_MEMBERSHIP_JOIN.replace('$TENANT$', tenantParam)
  const nameExpr = TENANT_USER_DISPLAY_NAME_SQL
  const roleExpr = `COALESCE(NULLIF(trim(mem.role), ''), u.role)`
  const baseFrom = `
    FROM crm_users u
    ${membershipJoin}
    WHERE u.deleted_at IS NULL AND u.status = 'Activo' AND ${USER_DIRECTORY_VISIBLE_CONDITION_U}`

  if (pattern) {
    return `SELECT 'user'::text AS kind, u.id::text AS record_id, ${nameExpr} AS label,
                  coalesce(nullif(trim(u.email), ''), ${roleExpr}, u.status::text) AS subtitle
           ${baseFrom}
             AND (${nameExpr} ILIKE $1 OR u.email ILIKE $1 OR ${roleExpr} ILIKE $1)
           ORDER BY label ASC LIMIT $2`
  }
  return `SELECT 'user'::text AS kind, u.id::text AS record_id, ${nameExpr} AS label,
                coalesce(nullif(trim(u.email), ''), ${roleExpr}) AS subtitle
         ${baseFrom}
         ORDER BY label ASC LIMIT $1`
}

const KIND_ORDER: MentionKind[] = [
  'user',
  'contact',
  'company',
  'opportunity',
  'quote',
  'project',
  'product',
  'invoice',
  'activity',
  'solicitud',
]

export async function searchMentions(
  query: string,
  limit = 12,
): Promise<MentionSearchItem[]> {
  const trimmed = query.trim()
  const pattern = trimmed ? `%${trimmed}%` : null
  const perKind = trimmed ? limit : 2
  const tenantId = getTenantIdOrDefault()
  const userTenantParam = pattern ? '$3' : '$2'

  const batches = await Promise.all([
    searchKind(
      userMentionSearchSql(pattern, userTenantParam),
      pattern,
      perKind,
      [tenantId],
    ),
    searchKind(
      pattern
        ? `SELECT 'contact'::text AS kind, id::text AS record_id, name AS label,
                  coalesce(nullif(trim(company_name), ''), nullif(trim(email), '')) AS subtitle
           FROM crm_contacts
           WHERE ${ACTIVE_NOT_ARCHIVED}
             AND (name ILIKE $1 OR email ILIKE $1 OR company_name ILIKE $1)
           ORDER BY name ASC LIMIT $2`
        : `SELECT 'contact'::text AS kind, id::text AS record_id, name AS label,
                  coalesce(nullif(trim(company_name), ''), nullif(trim(email), '')) AS subtitle
           FROM crm_contacts
           WHERE ${ACTIVE_NOT_ARCHIVED}
           ORDER BY updated_at DESC LIMIT $1`,
      pattern,
      perKind,
    ),
    searchKind(
      pattern
        ? `SELECT 'company'::text AS kind, id::text AS record_id, name AS label,
                  coalesce(nullif(trim(industry), ''), nullif(trim(city), '')) AS subtitle
           FROM crm_companies
           WHERE ${ACTIVE_NOT_ARCHIVED}
             AND (name ILIKE $1 OR industry ILIKE $1 OR city ILIKE $1)
           ORDER BY name ASC LIMIT $2`
        : `SELECT 'company'::text AS kind, id::text AS record_id, name AS label,
                  coalesce(nullif(trim(industry), ''), nullif(trim(city), '')) AS subtitle
           FROM crm_companies
           WHERE ${ACTIVE_NOT_ARCHIVED}
           ORDER BY updated_at DESC LIMIT $1`,
      pattern,
      perKind,
    ),
    searchKind(
      pattern
        ? `SELECT 'opportunity'::text AS kind, id::text AS record_id, name AS label,
                  coalesce(nullif(trim(company_name), ''), stage) AS subtitle
           FROM crm_opportunities
           WHERE ${ACTIVE_NOT_ARCHIVED}
             AND (name ILIKE $1 OR company_name ILIKE $1)
           ORDER BY updated_at DESC LIMIT $2`
        : `SELECT 'opportunity'::text AS kind, id::text AS record_id, name AS label,
                  coalesce(nullif(trim(company_name), ''), stage) AS subtitle
           FROM crm_opportunities
           WHERE ${ACTIVE_NOT_ARCHIVED}
           ORDER BY updated_at DESC LIMIT $1`,
      pattern,
      perKind,
    ),
    searchKind(
      pattern
        ? `SELECT 'quote'::text AS kind, id::text AS record_id, code AS label,
                  coalesce(nullif(trim(title), ''), nullif(trim(company_name), '')) AS subtitle
           FROM crm_quotes
           WHERE ${ACTIVE_NOT_ARCHIVED}
             AND (code ILIKE $1 OR title ILIKE $1 OR company_name ILIKE $1)
           ORDER BY updated_at DESC LIMIT $2`
        : `SELECT 'quote'::text AS kind, id::text AS record_id, code AS label,
                  coalesce(nullif(trim(title), ''), nullif(trim(company_name), '')) AS subtitle
           FROM crm_quotes
           WHERE ${ACTIVE_NOT_ARCHIVED}
           ORDER BY updated_at DESC LIMIT $1`,
      pattern,
      perKind,
    ),
    searchKind(
      pattern
        ? `SELECT 'project'::text AS kind, id::text AS record_id, name AS label,
                  coalesce(nullif(trim(client_name), ''), status) AS subtitle
           FROM crm_projects
           WHERE ${ACTIVE_NOT_ARCHIVED}
             AND (name ILIKE $1 OR client_name ILIKE $1)
           ORDER BY updated_at DESC LIMIT $2`
        : `SELECT 'project'::text AS kind, id::text AS record_id, name AS label,
                  coalesce(nullif(trim(client_name), ''), status) AS subtitle
           FROM crm_projects
           WHERE ${ACTIVE_NOT_ARCHIVED}
           ORDER BY updated_at DESC LIMIT $1`,
      pattern,
      perKind,
    ),
    searchKind(
      pattern
        ? `SELECT 'product'::text AS kind, id::text AS record_id, name AS label,
                  coalesce(nullif(trim(sku), ''), nullif(trim(product_type), '')) AS subtitle
           FROM crm_products
           WHERE ${ACTIVE_NOT_ARCHIVED}
             AND (name ILIKE $1 OR sku ILIKE $1)
           ORDER BY name ASC LIMIT $2`
        : `SELECT 'product'::text AS kind, id::text AS record_id, name AS label,
                  coalesce(nullif(trim(sku), ''), nullif(trim(product_type), '')) AS subtitle
           FROM crm_products
           WHERE ${ACTIVE_NOT_ARCHIVED}
           ORDER BY updated_at DESC LIMIT $1`,
      pattern,
      perKind,
    ),
    searchKind(
      pattern
        ? `SELECT 'invoice'::text AS kind, id::text AS record_id, number AS label,
                  coalesce(nullif(trim(client_name), ''), status::text) AS subtitle
           FROM crm_invoices
           WHERE ${ACTIVE_NOT_ARCHIVED}
             AND (number ILIKE $1 OR client_name ILIKE $1)
           ORDER BY updated_at DESC LIMIT $2`
        : `SELECT 'invoice'::text AS kind, id::text AS record_id, number AS label,
                  coalesce(nullif(trim(client_name), ''), status::text) AS subtitle
           FROM crm_invoices
           WHERE ${ACTIVE_NOT_ARCHIVED}
           ORDER BY updated_at DESC LIMIT $1`,
      pattern,
      perKind,
    ),
    searchKind(
      pattern
        ? `SELECT 'activity'::text AS kind, id::text AS record_id, title AS label,
                  coalesce(nullif(trim(related_name), ''), type_label, status::text) AS subtitle
           FROM crm_activities
           WHERE ${ACTIVE_ONLY}
             AND (title ILIKE $1 OR related_name ILIKE $1 OR company_name ILIKE $1)
           ORDER BY scheduled_at DESC NULLS LAST LIMIT $2`
        : `SELECT 'activity'::text AS kind, id::text AS record_id, title AS label,
                  coalesce(nullif(trim(related_name), ''), type_label) AS subtitle
           FROM crm_activities
           WHERE ${ACTIVE_ONLY}
           ORDER BY scheduled_at DESC NULLS LAST LIMIT $1`,
      pattern,
      perKind,
    ),
    searchKind(
      pattern
        ? `SELECT 'solicitud'::text AS kind, id::text AS record_id, code AS label,
                  coalesce(nullif(trim(title), ''), status::text) AS subtitle
           FROM crm_solicitudes
           WHERE ${ACTIVE_NOT_ARCHIVED}
             AND (code ILIKE $1 OR title ILIKE $1)
           ORDER BY updated_at DESC LIMIT $2`
        : `SELECT 'solicitud'::text AS kind, id::text AS record_id, code AS label,
                  coalesce(nullif(trim(title), ''), status::text) AS subtitle
           FROM crm_solicitudes
           WHERE ${ACTIVE_NOT_ARCHIVED}
           ORDER BY updated_at DESC LIMIT $1`,
      pattern,
      perKind,
    ),
  ])

  const flat = batches.flat()
  if (trimmed) {
    const q = trimmed.toLowerCase()
    return flat
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(q) ? 0 : 1
        const bStarts = b.label.toLowerCase().startsWith(q) ? 0 : 1
        if (aStarts !== bStarts) return aStarts - bStarts
        const aKind = KIND_ORDER.indexOf(a.kind)
        const bKind = KIND_ORDER.indexOf(b.kind)
        if (aKind !== bKind) return aKind - bKind
        return a.label.localeCompare(b.label, 'es')
      })
      .slice(0, limit)
  }

  const picked: MentionSearchItem[] = []
  for (const kind of KIND_ORDER) {
    picked.push(...flat.filter((m) => m.kind === kind).slice(0, perKind))
  }
  return picked.slice(0, limit)
}

export async function getUserNamesByIds(
  userIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))]
  if (unique.length === 0) return new Map()

  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<{ id: string; name: string }>(
    `SELECT u.id::text, ${TENANT_USER_DISPLAY_NAME_SQL} AS name
     FROM crm_users u
     INNER JOIN crm_tenant_memberships mem
       ON mem.user_id = u.id AND mem.tenant_id = $2::uuid
     WHERE u.id = ANY($1::uuid[]) AND u.deleted_at IS NULL`,
    [unique, tenantId],
  )
  return new Map(result.rows.map((row) => [row.id, row.name]))
}
