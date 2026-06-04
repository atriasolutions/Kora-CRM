import { pool } from '../db/pool.js'
import { badRequest } from '../middleware/errors.js'
import type { GlobalSearchResponse, SearchResultItem } from '../types/search.js'

type SearchRow = {
  type: string
  id: string
  title: string
  subtitle: string | null
}

const ACTIVE_NOT_ARCHIVED = `deleted_at IS NULL AND archived_at IS NULL`
const ACTIVE_ONLY = `deleted_at IS NULL`

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
): Promise<SearchResultItem[]> {
  const result = await pool.query<SearchRow>(sql, [pattern, limit])
  return result.rows.map(mapRow)
}

export async function globalSearch(
  query: string,
  limitPerType = 5,
): Promise<GlobalSearchResponse> {
  const trimmed = query.trim()
  if (trimmed.length < 1) throw badRequest('Consulta de búsqueda vacía')

  const pattern = `%${trimmed}%`
  const limit = Math.min(Math.max(limitPerType, 1), 10)

  const batches = await Promise.all([
    searchTable(
      `SELECT 'contact' AS type, id, name AS title,
              coalesce(nullif(trim(company_name), ''), nullif(trim(email), ''), status::text) AS subtitle
       FROM crm_contacts
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (name ILIKE $1 OR email ILIKE $1 OR company_name ILIKE $1 OR phone ILIKE $1)
       ORDER BY name ASC
       LIMIT $2`,
      pattern,
      limit,
    ),
    searchTable(
      `SELECT 'company' AS type, id, name AS title,
              coalesce(nullif(trim(industry), ''), nullif(trim(city), ''), lifecycle::text) AS subtitle
       FROM crm_companies
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (name ILIKE $1 OR rut ILIKE $1 OR industry ILIKE $1 OR city ILIKE $1)
       ORDER BY name ASC
       LIMIT $2`,
      pattern,
      limit,
    ),
    searchTable(
      `SELECT 'opportunity' AS type, id, name AS title,
              coalesce(nullif(trim(company_name), ''), stage) AS subtitle
       FROM crm_opportunities
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (name ILIKE $1 OR company_name ILIKE $1 OR contact_name ILIKE $1)
       ORDER BY updated_at DESC
       LIMIT $2`,
      pattern,
      limit,
    ),
    searchTable(
      `SELECT 'quote' AS type, id,
              trim(code || ' — ' || title) AS title,
              coalesce(nullif(trim(company_name), ''), status) AS subtitle
       FROM crm_quotes
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (code ILIKE $1 OR title ILIKE $1 OR company_name ILIKE $1 OR opportunity_name ILIKE $1)
       ORDER BY updated_at DESC
       LIMIT $2`,
      pattern,
      limit,
    ),
    searchTable(
      `SELECT 'invoice' AS type, id, number AS title,
              coalesce(nullif(trim(client_name), ''), status::text) AS subtitle
       FROM crm_invoices
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (number ILIKE $1 OR client_name ILIKE $1 OR quote_code ILIKE $1 OR contact_name ILIKE $1)
       ORDER BY updated_at DESC
       LIMIT $2`,
      pattern,
      limit,
    ),
    searchTable(
      `SELECT 'activity' AS type, id, title,
              coalesce(nullif(trim(company_name), ''), type_label, status::text) AS subtitle
       FROM crm_activities
       WHERE ${ACTIVE_ONLY}
         AND (title ILIKE $1 OR company_name ILIKE $1 OR related_name ILIKE $1 OR type_label ILIKE $1)
       ORDER BY scheduled_at DESC NULLS LAST
       LIMIT $2`,
      pattern,
      limit,
    ),
    searchTable(
      `SELECT 'project' AS type, id, name AS title,
              coalesce(nullif(trim(client_name), ''), status) AS subtitle
       FROM crm_projects
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (name ILIKE $1 OR client_name ILIKE $1 OR opportunity_name ILIKE $1)
       ORDER BY updated_at DESC
       LIMIT $2`,
      pattern,
      limit,
    ),
    searchTable(
      `SELECT 'product' AS type, id, name AS title,
              coalesce(nullif(trim(sku), ''), nullif(trim(product_type), ''), status::text) AS subtitle
       FROM crm_products
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (name ILIKE $1 OR sku ILIKE $1 OR product_type ILIKE $1)
       ORDER BY name ASC
       LIMIT $2`,
      pattern,
      limit,
    ),
    searchTable(
      `SELECT 'purchase' AS type, id, reference AS title,
              coalesce(nullif(trim(supplier_name), ''), status::text) AS subtitle
       FROM crm_purchases
       WHERE ${ACTIVE_NOT_ARCHIVED}
         AND (reference ILIKE $1 OR supplier_name ILIKE $1 OR product_summary ILIKE $1)
       ORDER BY updated_at DESC
       LIMIT $2`,
      pattern,
      limit,
    ),
  ])

  return {
    query: trimmed,
    results: batches.flat(),
  }
}
