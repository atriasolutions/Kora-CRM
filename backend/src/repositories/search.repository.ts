import { pool } from '../db/pool.js'
import { allowedSearchEntityTypes } from '../lib/global-search-access.js'
import { badRequest } from '../middleware/errors.js'
import type { AccessProfile } from '../types/access-profile.js'
import type { GlobalSearchResponse, SearchEntityType, SearchResultItem } from '../types/search.js'

type SearchRow = {
  type: string
  id: string
  title: string
  subtitle: string | null
}

export type GlobalSearchAccess = {
  profile: AccessProfile | null | undefined
  memberAccess?: { userId: string; userName: string }
}

const ACTIVE_NOT_ARCHIVED = `deleted_at IS NULL AND archived_at IS NULL`
const ACTIVE_ONLY = `deleted_at IS NULL`

const SEARCH_SQL: Record<SearchEntityType, string> = {
  contact: `SELECT 'contact' AS type, id, name AS title,
              coalesce(nullif(trim(company_name), ''), nullif(trim(email), ''), status::text) AS subtitle
       FROM crm_contacts
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (name ILIKE $1 OR email ILIKE $1 OR company_name ILIKE $1 OR phone ILIKE $1)
       ORDER BY name ASC
       LIMIT $2`,
  company: `SELECT 'company' AS type, id, name AS title,
              coalesce(nullif(trim(industry), ''), nullif(trim(city), ''), lifecycle::text) AS subtitle
       FROM crm_companies
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (name ILIKE $1 OR rut ILIKE $1 OR industry ILIKE $1 OR city ILIKE $1)
       ORDER BY name ASC
       LIMIT $2`,
  opportunity: `SELECT 'opportunity' AS type, id, name AS title,
              coalesce(nullif(trim(company_name), ''), stage) AS subtitle
       FROM crm_opportunities
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (name ILIKE $1 OR company_name ILIKE $1 OR contact_name ILIKE $1)
       ORDER BY updated_at DESC
       LIMIT $2`,
  quote: `SELECT 'quote' AS type, id,
              trim(code || ' — ' || title) AS title,
              coalesce(nullif(trim(company_name), ''), status) AS subtitle
       FROM crm_quotes
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (code ILIKE $1 OR title ILIKE $1 OR company_name ILIKE $1 OR opportunity_name ILIKE $1)
       ORDER BY updated_at DESC
       LIMIT $2`,
  invoice: `SELECT 'invoice' AS type, id, number AS title,
              coalesce(nullif(trim(client_name), ''), status::text) AS subtitle
       FROM crm_invoices
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (number ILIKE $1 OR client_name ILIKE $1 OR quote_code ILIKE $1 OR contact_name ILIKE $1)
       ORDER BY updated_at DESC
       LIMIT $2`,
  activity: `SELECT 'activity' AS type, id, title,
              coalesce(nullif(trim(company_name), ''), type_label, status::text) AS subtitle
       FROM crm_activities
       WHERE ${ACTIVE_ONLY}
         AND (title ILIKE $1 OR company_name ILIKE $1 OR related_name ILIKE $1 OR type_label ILIKE $1)
       ORDER BY scheduled_at DESC NULLS LAST
       LIMIT $2`,
  project: `SELECT 'project' AS type, id, name AS title,
              coalesce(nullif(trim(client_name), ''), status) AS subtitle
       FROM crm_projects
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (name ILIKE $1 OR client_name ILIKE $1 OR opportunity_name ILIKE $1)
       ORDER BY updated_at DESC
       LIMIT $2`,
  product: `SELECT 'product' AS type, id, name AS title,
              coalesce(nullif(trim(sku), ''), nullif(trim(product_type), ''), status::text) AS subtitle
       FROM crm_products
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (name ILIKE $1 OR sku ILIKE $1 OR product_type ILIKE $1)
       ORDER BY name ASC
       LIMIT $2`,
  purchase: `SELECT 'purchase' AS type, id, reference AS title,
              coalesce(nullif(trim(supplier_name), ''), status::text) AS subtitle
       FROM crm_purchases
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (reference ILIKE $1 OR supplier_name ILIKE $1 OR product_summary ILIKE $1)
       ORDER BY updated_at DESC
       LIMIT $2`,
}

function mapRow(row: SearchRow): SearchResultItem {
  return {
    type: row.type as SearchResultItem['type'],
    id: row.id,
    title: row.title,
    subtitle: row.subtitle?.trim() || '—',
  }
}

async function searchTable(
  sql: string,
  pattern: string,
  limit: number,
  extraValues: unknown[] = [],
): Promise<SearchResultItem[]> {
  const values = [pattern, limit, ...extraValues]
  const result = await pool.query<SearchRow>(sql, values)
  return result.rows.map(mapRow)
}

async function searchProjects(
  pattern: string,
  limit: number,
  memberAccess?: { userId: string; userName: string },
): Promise<SearchResultItem[]> {
  if (!memberAccess) {
    return searchTable(SEARCH_SQL.project, pattern, limit)
  }

  const sql = `SELECT 'project' AS type, id, name AS title,
              coalesce(nullif(trim(client_name), ''), status) AS subtitle
       FROM crm_projects
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (name ILIKE $1 OR client_name ILIKE $1 OR opportunity_name ILIKE $1)
         AND (
           lower(trim(manager_name)) = lower($3)
           OR EXISTS (
             SELECT 1 FROM crm_project_team_members tm
             WHERE tm.project_id = crm_projects.id
             AND (
               tm.user_id = $4::uuid
               OR lower(trim(tm.user_name)) = lower($3)
             )
           )
         )
       ORDER BY updated_at DESC
       LIMIT $2`

  return searchTable(sql, pattern, limit, [
    memberAccess.userName.trim(),
    memberAccess.userId,
  ])
}

async function searchEntityType(
  type: SearchEntityType,
  pattern: string,
  limit: number,
  access: GlobalSearchAccess,
): Promise<SearchResultItem[]> {
  if (type === 'project') {
    return searchProjects(pattern, limit, access.memberAccess)
  }
  return searchTable(SEARCH_SQL[type], pattern, limit)
}

export async function globalSearch(
  query: string,
  limitPerType = 5,
  access: GlobalSearchAccess = { profile: null },
): Promise<GlobalSearchResponse> {
  const trimmed = query.trim()
  if (trimmed.length < 1) throw badRequest('Consulta de búsqueda vacía')

  const pattern = `%${trimmed}%`
  const limit = Math.min(Math.max(limitPerType, 1), 10)
  const allowedTypes = allowedSearchEntityTypes(access.profile)

  if (allowedTypes.length === 0) {
    return { query: trimmed, results: [] }
  }

  const batches = await Promise.all(
    allowedTypes.map((type) => searchEntityType(type, pattern, limit, access)),
  )

  return {
    query: trimmed,
    results: batches.flat(),
  }
}
