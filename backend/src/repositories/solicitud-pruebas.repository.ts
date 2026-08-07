import { pool } from '../db/pool.js'
import { setTenantLocal, tenantQuery, withTenantClient } from '../db/tenant-query.js'
import { chileDateString } from '../lib/currency-conversion.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapPruebaDetail,
  mapPruebaRow,
  toExecutedAtInput,
  type PruebaCasoRow,
  type PruebaRow,
} from '../mappers/solicitud-prueba.mapper.js'
import { badRequest, forbidden, notFound } from '../middleware/errors.js'
import {
  assertSolicitudTeamAccess,
  getSolicitudById,
} from '../repositories/solicitudes.repository.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'
import type { AuditActor } from '../types/audit.js'
import type {
  ClientReviewPruebaCasoInput,
  CreatePruebaSolicitudInput,
  PruebaCasoInput,
  PruebaSolicitudDetail,
  PruebaSolicitudListItem,
  UpdatePruebaCasosInput,
  UpdatePruebaSolicitudInput,
} from '../types/solicitud-prueba.js'
import { parseDateInput } from '../utils/format.js'
import { paginationOffset } from '../utils/pagination.js'
import {
  pushDateRangeCondition,
  resolveOrderByClause,
} from '../lib/list-query.js'

const PRUEBA_ROW_COLUMNS = `
  id, code, solicitud_id, solicitud_code, solicitud_title,
  description, executed_at,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

const PRUEBA_SELECT_COLUMNS = `
  p.id, p.code, p.solicitud_id, p.solicitud_code, p.solicitud_title,
  p.description, p.executed_at,
  p.created_at, p.created_by_id, p.created_by_name,
  p.updated_at, p.updated_by_id, p.updated_by_name
`

const CASO_COLUMNS = `
  id, prueba_id, code, sort_order,
  short_description, input_data, steps, expected_result, obtained_result,
  executor_ok, executor_notes, executor_ok_at,
  evidence_html, client_ok, client_notes, client_ok_at
`

export type ListPruebasSolicitudParams = {
  page: number
  pageSize: number
  q?: string
  solicitudId?: string
  companyId?: string
  archivedOnly?: boolean
  memberAccess?: { userId: string; userName: string }
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

const PRUEBA_SORT_COLUMNS: Record<string, string> = {
  code: 'p.code',
  title: 'p.title',
  updatedAt: 'p.updated_at',
  createdAt: 'p.created_at',
}

async function nextPruebaCode(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `PRU-${year}-`
  const result = await tenantQuery<{ code: string }>(
    `SELECT code FROM crm_solicitud_pruebas
     WHERE code LIKE $1 AND ${tenantWhereParam(2)}
     ORDER BY code DESC
     LIMIT 1`,
    [`${prefix}%`, getTenantIdOrDefault()],
  )
  const last = result.rows[0]?.code
  let seq = 1
  if (last?.startsWith(prefix)) {
    const n = Number.parseInt(last.slice(prefix.length), 10)
    if (!Number.isNaN(n)) seq = n + 1
  }
  return `${prefix}${String(seq).padStart(4, '0')}`
}

function buildCaseCode(pruebaCode: string, index: number): string {
  return `${pruebaCode}-CP-${String(index + 1).padStart(2, '0')}`
}

async function loadPruebaCases(pruebaId: string): Promise<PruebaCasoRow[]> {
  const result = await tenantQuery<PruebaCasoRow>(
    `SELECT ${CASO_COLUMNS}
     FROM crm_solicitud_prueba_casos
     WHERE prueba_id = $1
     ORDER BY sort_order ASC, code ASC`,
    [pruebaId],
  )
  return result.rows
}

async function assertPruebaTeamAccessBySolicitudId(
  solicitudId: string,
  actor: AuditActor,
): Promise<void> {
  const solicitud = await getSolicitudById(solicitudId)
  assertSolicitudTeamAccess(
    solicitud.assignee,
    solicitud.team,
    actor,
    { userId: solicitud.createdById, userName: solicitud.createdByName },
    solicitud.assigneeUserId ?? null,
  )
}

async function getPruebaRowById(id: string): Promise<PruebaRow> {
  const result = await tenantQuery<PruebaRow>(
    `SELECT ${PRUEBA_SELECT_COLUMNS},
      (SELECT count(*)::int FROM crm_solicitud_prueba_casos c WHERE c.prueba_id = p.id) AS case_count,
      (SELECT count(*)::int FROM crm_solicitud_prueba_casos c WHERE c.prueba_id = p.id AND c.client_ok = true) AS client_ok_count
     FROM crm_solicitud_pruebas p
     WHERE p.id = $1 AND p.deleted_at IS NULL AND ${tenantWhereParam(2, 'p')}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Prueba no encontrada')
  return row
}

function buildListWhere(params: ListPruebasSolicitudParams): {
  where: string
  values: unknown[]
} {
  const conditions = [params.archivedOnly ? 'p.archived_at IS NOT NULL' : 'p.archived_at IS NULL']
  conditions.push('p.deleted_at IS NULL')
  const values: unknown[] = []
  let idx = 1

  idx = pushTenantCondition(conditions, values, idx, 'p')

  if (params.solicitudId) {
    conditions.push(`p.solicitud_id = $${idx++}`)
    values.push(params.solicitudId)
  }

  if (params.companyId) {
    conditions.push(`EXISTS (
      SELECT 1 FROM crm_solicitudes s
      WHERE s.id = p.solicitud_id
        AND s.deleted_at IS NULL
        AND s.company_id = $${idx++}::uuid
    )`)
    values.push(params.companyId)
  }

  const q = params.q?.trim()
  if (q) {
    conditions.push(`(
      p.code ILIKE $${idx}
      OR p.description ILIKE $${idx}
      OR p.solicitud_code ILIKE $${idx}
      OR p.solicitud_title ILIKE $${idx}
    )`)
    values.push(`%${q}%`)
    idx++
  }

  if (params.memberAccess) {
    const userName = params.memberAccess.userName.trim()
    const userId = params.memberAccess.userId
    const nameIdx = idx++
    const idIdx = idx++
    conditions.push(
      `EXISTS (
        SELECT 1 FROM crm_solicitudes s
        WHERE s.id = p.solicitud_id
        AND s.deleted_at IS NULL
        AND (
          s.created_by_id = $${idIdx}::uuid
          OR lower(trim(s.assignee_name)) = lower($${nameIdx})
          OR EXISTS (
            SELECT 1 FROM crm_solicitud_team_members tm
            WHERE tm.solicitud_id = s.id
            AND (
              tm.user_id = $${idIdx}::uuid
              OR lower(trim(tm.user_name)) = lower($${nameIdx})
            )
          )
        )
      )`,
    )
    values.push(userName, userId)
  }

  idx = pushDateRangeCondition(
    conditions,
    values,
    idx,
    'p.updated_at',
    params.dateFrom,
    params.dateTo,
  )

  return { where: `WHERE ${conditions.join(' AND ')}`, values }
}

export async function listPruebasSolicitud(
  params: ListPruebasSolicitudParams,
): Promise<{ items: PruebaSolicitudListItem[]; total: number }> {
  const { where, values } = buildListWhere(params)
  const orderBy = resolveOrderByClause(
    params.sortBy,
    params.sortDir,
    PRUEBA_SORT_COLUMNS,
    'p.updated_at DESC',
  )

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM crm_solicitud_pruebas p
       ${where}`,
      values,
    )
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]
    const limitIdx = values.length + 1
    const offsetIdx = values.length + 2

    const result = await client.query<PruebaRow>(
      `SELECT ${PRUEBA_SELECT_COLUMNS},
        s.company_id, s.company_name,
        (SELECT count(*)::int FROM crm_solicitud_prueba_casos c WHERE c.prueba_id = p.id) AS case_count,
        (SELECT count(*)::int FROM crm_solicitud_prueba_casos c WHERE c.prueba_id = p.id AND c.client_ok = true) AS client_ok_count
       FROM crm_solicitud_pruebas p
       LEFT JOIN crm_solicitudes s ON s.id = p.solicitud_id AND s.deleted_at IS NULL
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listValues,
    )

    return {
      items: result.rows.map(mapPruebaRow),
      total,
    }
  })
}

export async function getPruebaSolicitudById(id: string): Promise<PruebaSolicitudDetail> {
  const row = await getPruebaRowById(id)
  const cases = await loadPruebaCases(id)
  return mapPruebaDetail(row, cases)
}

async function resolveSolicitudSnapshot(solicitudId: string): Promise<{
  code: string
  title: string
}> {
  const result = await tenantQuery<{ code: string; title: string }>(
    `SELECT code, title FROM crm_solicitudes
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [solicitudId, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw badRequest('Solicitud no encontrada')
  return { code: row.code, title: row.title }
}

function normalizeCasoInput(
  input: PruebaCasoInput,
  pruebaCode: string,
  index: number,
): {
  shortDescription: string
  inputData: string
  steps: string
  expectedResult: string
  obtainedResult: string
  executorOk: boolean | null
  executorNotes: string
  executorOkAt: Date | null
  evidenceHtml: string
  clientOk: boolean | null
  clientNotes: string
  clientOkAt: Date | null
  code: string
} {
  const executorOk = input.executorOk ?? null
  const clientOk = input.clientOk ?? null
  return {
    code: buildCaseCode(pruebaCode, index),
    shortDescription: input.shortDescription?.trim() ?? '',
    inputData: input.inputData?.trim() ?? '',
    steps: input.steps?.trim() ?? '',
    expectedResult: input.expectedResult?.trim() ?? '',
    obtainedResult: input.obtainedResult?.trim() ?? '',
    executorOk,
    executorNotes: input.executorNotes?.trim() ?? '',
    executorOkAt: executorOk === true ? new Date() : null,
    evidenceHtml: input.evidenceHtml?.trim() ?? '',
    clientOk,
    clientNotes: input.clientNotes?.trim() ?? '',
    clientOkAt: clientOk === true ? new Date() : null,
  }
}

async function insertPruebaCases(
  client: { query: typeof pool.query },
  pruebaId: string,
  pruebaCode: string,
  cases: PruebaCasoInput[],
): Promise<void> {
  for (let i = 0; i < cases.length; i++) {
    const caso = normalizeCasoInput(cases[i], pruebaCode, i)
    await client.query(
      `INSERT INTO crm_solicitud_prueba_casos (
        prueba_id, code, sort_order,
        short_description, input_data, steps, expected_result, obtained_result,
        executor_ok, executor_notes, executor_ok_at,
        evidence_html, client_ok, client_notes, client_ok_at
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6, $7, $8,
        $9, $10, $11,
        $12, $13, $14, $15
      )`,
      [
        pruebaId,
        caso.code,
        i,
        caso.shortDescription,
        caso.inputData,
        caso.steps,
        caso.expectedResult,
        caso.obtainedResult,
        caso.executorOk,
        caso.executorNotes,
        caso.executorOkAt,
        caso.evidenceHtml,
        caso.clientOk,
        caso.clientNotes,
        caso.clientOkAt,
      ],
    )
  }
}

export async function createPruebaSolicitud(
  input: CreatePruebaSolicitudInput,
  actor: AuditActor,
): Promise<PruebaSolicitudDetail> {
  await assertPruebaTeamAccessBySolicitudId(input.solicitudId, actor)
  const snap = await resolveSolicitudSnapshot(input.solicitudId)
  const code = await nextPruebaCode()
  const executedAt =
    parseDateInput(input.executedAt ?? '') ?? chileDateString()
  const tenantId = getTenantIdOrDefault()

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)
    const result = await client.query<PruebaRow>(
      `INSERT INTO crm_solicitud_pruebas (
        code, solicitud_id, solicitud_code, solicitud_title,
        description, executed_at,
        created_by_id, created_by_name, updated_by_id, updated_by_name, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING ${PRUEBA_ROW_COLUMNS}`,
      [
        code,
        input.solicitudId,
        snap.code,
        snap.title,
        input.description?.trim() ?? '',
        executedAt,
        actor.userId,
        actor.userName,
        actor.userId,
        actor.userName,
        tenantId,
      ],
    )
    const row = result.rows[0]
    if (!row) throw badRequest('No se pudo crear la prueba')
    if (input.cases?.length) {
      await insertPruebaCases(client, row.id, code, input.cases)
    }
    await client.query('COMMIT')
    return getPruebaSolicitudById(row.id)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function updatePruebaSolicitud(
  id: string,
  input: UpdatePruebaSolicitudInput,
  actor: AuditActor,
): Promise<PruebaSolicitudDetail> {
  const existing = await getPruebaRowById(id)
  await assertPruebaTeamAccessBySolicitudId(existing.solicitud_id, actor)

  const executedAt =
    input.executedAt !== undefined
      ? toExecutedAtInput(input.executedAt)
      : existing.executed_at
        ? parseDateInput(String(existing.executed_at))
        : null

  await tenantQuery(
    `UPDATE crm_solicitud_pruebas SET
      description = COALESCE($2, description),
      executed_at = $3,
      updated_by_id = $4,
      updated_by_name = $5,
      updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(6)}`,
    [
      id,
      input.description !== undefined ? input.description.trim() : null,
      executedAt,
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )
  return getPruebaSolicitudById(id)
}

export async function updatePruebaCasos(
  id: string,
  input: UpdatePruebaCasosInput,
  actor: AuditActor,
): Promise<PruebaSolicitudDetail> {
  const existing = await getPruebaRowById(id)
  await assertPruebaTeamAccessBySolicitudId(existing.solicitud_id, actor)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    const currentCases = await client.query<{ id: string }>(
      `SELECT id FROM crm_solicitud_prueba_casos WHERE prueba_id = $1`,
      [id],
    )
    const incomingIds = new Set(
      input.cases.map((c) => c.id?.trim()).filter((v): v is string => Boolean(v)),
    )
    for (const old of currentCases.rows) {
      if (!incomingIds.has(old.id)) {
        await purgeEntityNotesAndFiles('prueba_caso', old.id, client)
        await client.query(`DELETE FROM crm_solicitud_prueba_casos WHERE id = $1`, [old.id])
      }
    }

    for (let i = 0; i < input.cases.length; i++) {
      const raw = input.cases[i]
      const caso = normalizeCasoInput(raw, existing.code, i)
      const casoId = raw.id?.trim()

      if (casoId && incomingIds.has(casoId)) {
        await client.query(
          `UPDATE crm_solicitud_prueba_casos SET
            code = $3, sort_order = $4,
            short_description = $5, input_data = $6, steps = $7,
            expected_result = $8, obtained_result = $9,
            executor_ok = $10, executor_notes = $11,
            executor_ok_at = CASE WHEN $10 = true THEN COALESCE(executor_ok_at, now()) ELSE NULL END,
            evidence_html = $12,
            client_ok = $13, client_notes = $14,
            client_ok_at = CASE WHEN $13 = true THEN COALESCE(client_ok_at, now()) ELSE NULL END,
            updated_at = now()
           WHERE id = $1 AND prueba_id = $2`,
          [
            casoId,
            id,
            caso.code,
            i,
            caso.shortDescription,
            caso.inputData,
            caso.steps,
            caso.expectedResult,
            caso.obtainedResult,
            caso.executorOk,
            caso.executorNotes,
            caso.evidenceHtml,
            caso.clientOk,
            caso.clientNotes,
          ],
        )
      } else {
        await client.query(
          `INSERT INTO crm_solicitud_prueba_casos (
            prueba_id, code, sort_order,
            short_description, input_data, steps, expected_result, obtained_result,
            executor_ok, executor_notes, executor_ok_at,
            evidence_html, client_ok, client_notes, client_ok_at
          ) VALUES (
            $1, $2, $3,
            $4, $5, $6, $7, $8,
            $9, $10, $11,
            $12, $13, $14, $15
          )`,
          [
            id,
            caso.code,
            i,
            caso.shortDescription,
            caso.inputData,
            caso.steps,
            caso.expectedResult,
            caso.obtainedResult,
            caso.executorOk,
            caso.executorNotes,
            caso.executorOkAt,
            caso.evidenceHtml,
            caso.clientOk,
            caso.clientNotes,
            caso.clientOkAt,
          ],
        )
      }
    }

    await client.query(
      `UPDATE crm_solicitud_pruebas SET
        updated_by_id = $2, updated_by_name = $3, updated_at = now()
       WHERE id = $1`,
      [id, actor.userId, actor.userName],
    )

    await client.query('COMMIT')
    return getPruebaSolicitudById(id)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function clientReviewPruebaCaso(
  pruebaId: string,
  casoId: string,
  input: ClientReviewPruebaCasoInput,
  actor: AuditActor,
): Promise<PruebaSolicitudDetail> {
  const existing = await getPruebaRowById(pruebaId)
  await assertPruebaTeamAccessBySolicitudId(existing.solicitud_id, actor)

  const casoResult = await tenantQuery<{ id: string }>(
    `SELECT id FROM crm_solicitud_prueba_casos
     WHERE id = $1 AND prueba_id = $2`,
    [casoId, pruebaId],
  )
  if (!casoResult.rows[0]) throw notFound('Caso de prueba no encontrado')

  const clientOkAt = input.clientOk ? new Date() : null

  await tenantQuery(
    `UPDATE crm_solicitud_prueba_casos SET
      client_ok = $3,
      client_notes = $4,
      client_ok_at = $5,
      updated_at = now()
     WHERE id = $1 AND prueba_id = $2`,
    [casoId, pruebaId, input.clientOk, input.clientNotes?.trim() ?? '', clientOkAt],
  )

  await tenantQuery(
    `UPDATE crm_solicitud_pruebas SET
      updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1`,
    [pruebaId, actor.userId, actor.userName],
  )

  return getPruebaSolicitudById(pruebaId)
}

export async function archivePruebaSolicitud(
  id: string,
  actor: AuditActor,
): Promise<PruebaSolicitudDetail> {
  const existing = await getPruebaRowById(id)
  await assertPruebaTeamAccessBySolicitudId(existing.solicitud_id, actor)

  await tenantQuery(
    `UPDATE crm_solicitud_pruebas SET
      archived_at = now(),
      updated_by_id = $2,
      updated_by_name = $3,
      updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  return getPruebaSolicitudById(id)
}

export async function restorePruebaSolicitud(
  id: string,
  actor: AuditActor,
): Promise<PruebaSolicitudDetail> {
  const row = await tenantQuery<PruebaRow>(
    `SELECT ${PRUEBA_SELECT_COLUMNS}
     FROM crm_solicitud_pruebas p
     WHERE p.id = $1 AND p.deleted_at IS NULL AND p.archived_at IS NOT NULL AND ${tenantWhereParam(2, 'p')}`,
    [id, getTenantIdOrDefault()],
  )
  const existing = row.rows[0]
  if (!existing) throw notFound('Prueba archivada no encontrada')
  await assertPruebaTeamAccessBySolicitudId(existing.solicitud_id, actor)

  await tenantQuery(
    `UPDATE crm_solicitud_pruebas SET
      archived_at = NULL,
      updated_by_id = $2,
      updated_by_name = $3,
      updated_at = now()
     WHERE id = $1`,
    [id, actor.userId, actor.userName],
  )
  return getPruebaSolicitudById(id)
}

export async function deletePruebaSolicitudPermanent(
  id: string,
  actor: AuditActor,
): Promise<void> {
  const row = await tenantQuery<PruebaRow>(
    `SELECT ${PRUEBA_SELECT_COLUMNS}
     FROM crm_solicitud_pruebas p
     WHERE p.id = $1 AND p.archived_at IS NOT NULL AND ${tenantWhereParam(2, 'p')}`,
    [id, getTenantIdOrDefault()],
  )
  const existing = row.rows[0]
  if (!existing) throw notFound('La prueba debe estar archivada para eliminarla')
  await assertPruebaTeamAccessBySolicitudId(existing.solicitud_id, actor)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)
    const cases = await client.query<{ id: string }>(
      `SELECT id FROM crm_solicitud_prueba_casos WHERE prueba_id = $1`,
      [id],
    )
    for (const caso of cases.rows) {
      await purgeEntityNotesAndFiles('prueba_caso', caso.id, client)
    }
    await client.query(`DELETE FROM crm_solicitud_prueba_casos WHERE prueba_id = $1`, [id])
    await client.query(
      `UPDATE crm_solicitud_pruebas SET deleted_at = now() WHERE id = $1`,
      [id],
    )
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function assertPruebaSolicitudAccess(
  id: string,
  actor: AuditActor,
): Promise<PruebaSolicitudDetail> {
  const detail = await getPruebaSolicitudById(id)
  try {
    await assertPruebaTeamAccessBySolicitudId(detail.solicitudId, actor)
  } catch {
    throw forbidden('No tienes acceso a esta prueba de solicitud.')
  }
  return detail
}
