import { parseCaf } from '../lib/emisso-sii.js'

import { tenantQuery } from '../db/tenant-query.js'
import { encryptSiiSecret } from '../lib/sii-crypto.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import { badRequest, notFound } from '../middleware/errors.js'

export type FolioRangeDto = {
  id: string
  dteType: number
  rangeStart: number
  rangeEnd: number
  nextFolio: number
  remaining: number
  active: boolean
}

export async function uploadCaf(params: {
  dteType: number
  cafXml: string
  rangeStart?: number
  rangeEnd?: number
}): Promise<FolioRangeDto> {
  if (!params.cafXml.trim()) throw badRequest('Archivo CAF vacío.')

  let rangeStart: number
  let rangeEnd: number

  try {
    const parsed = await parseCaf(params.cafXml)
    rangeStart = parsed.rangoDesde
    rangeEnd = parsed.rangoHasta
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'CAF inválido'
    if (
      !msg.includes('Not implemented') &&
      params.rangeStart == null &&
      params.rangeEnd == null
    ) {
      throw badRequest(msg)
    }
    if (params.rangeStart == null || params.rangeEnd == null) {
      throw badRequest(
        'Indica rango inicial y final del CAF (el parser automático aún no está disponible).',
      )
    }
    rangeStart = params.rangeStart
    rangeEnd = params.rangeEnd
    if (rangeEnd < rangeStart) throw badRequest('Rango de folios inválido.')
  }
  const tenantId = getTenantIdOrDefault()
  const encrypted = encryptSiiSecret(params.cafXml)
  const result = await tenantQuery<{
    id: string
    dte_type: number
    range_start: string
    range_end: string
    next_folio: string
    active: boolean
  }>(
    `INSERT INTO sii.folio_ranges (
       tenant_id, dte_type, range_start, range_end, next_folio, caf_xml_encrypted, active
     ) VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING id, dte_type, range_start, range_end, next_folio, active`,
    [tenantId, params.dteType, rangeStart, rangeEnd, rangeStart, encrypted],
  )
  return mapFolioRange(result.rows[0]!)
}

export async function listFolioRanges(): Promise<FolioRangeDto[]> {
  const result = await tenantQuery<{
    id: string
    dte_type: number
    range_start: string
    range_end: string
    next_folio: string
    active: boolean
  }>(
    `SELECT id, dte_type, range_start, range_end, next_folio, active
     FROM sii.folio_ranges
     WHERE tenant_id = $1 AND active = true
     ORDER BY dte_type ASC, range_start ASC`,
    [getTenantIdOrDefault()],
  )
  return result.rows.map(mapFolioRange)
}

function mapFolioRange(row: {
  id: string
  dte_type: number
  range_start: string
  range_end: string
  next_folio: string
  active: boolean
}): FolioRangeDto {
  const rangeEnd = Number(row.range_end)
  const nextFolio = Number(row.next_folio)
  return {
    id: row.id,
    dteType: row.dte_type,
    rangeStart: Number(row.range_start),
    rangeEnd,
    nextFolio,
    remaining: Math.max(0, rangeEnd - nextFolio + 1),
    active: row.active,
  }
}

export async function getNextFolio(dteType: number): Promise<number> {
  const tenantId = getTenantIdOrDefault()
  const { pool } = await import('../db/pool.js')
  const { setTenantLocal } = await import('../db/tenant-query.js')
  const pgClient = await pool.connect()
  try {
    await pgClient.query('BEGIN')
    await setTenantLocal(pgClient)
    const locked = await pgClient.query<{
      id: string
      next_folio: string
      range_end: string
    }>(
      `SELECT id, next_folio, range_end
       FROM sii.folio_ranges
       WHERE tenant_id = $1 AND dte_type = $2 AND active = true
       ORDER BY next_folio ASC
       LIMIT 1
       FOR UPDATE`,
      [tenantId, dteType],
    )
    const row = locked.rows[0]
    if (!row) throw badRequest(`No hay folios CAF disponibles para tipo DTE ${dteType}.`)

    const folio = Number(row.next_folio)
    const rangeEnd = Number(row.range_end)
    if (folio > rangeEnd) {
      throw badRequest(`Sin folios disponibles para tipo DTE ${dteType}.`)
    }

    await pgClient.query(
      `UPDATE sii.folio_ranges SET next_folio = $1, updated_at = now() WHERE id = $2`,
      [folio + 1, row.id],
    )
    await pgClient.query('COMMIT')
    return folio
  } catch (err) {
    await pgClient.query('ROLLBACK')
    throw err
  } finally {
    pgClient.release()
  }
}

export async function deactivateFolioRange(id: string): Promise<void> {
  const result = await tenantQuery(
    `UPDATE sii.folio_ranges SET active = false, updated_at = now()
     WHERE id = $1 AND tenant_id = $2`,
    [id, getTenantIdOrDefault()],
  )
  if (!result.rowCount) throw notFound('Rango de folios no encontrado')
}
