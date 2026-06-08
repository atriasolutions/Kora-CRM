import { pool } from '../db/pool.js'
import { setTenantLocal, tenantQuery } from '../db/tenant-query.js'
import { tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  buildTableConfigStorage,
  dbReportType,
  mapReportFolderRow,
  mapReportRow,
  type ReportFolderRow,
  type ReportRow,
} from '../mappers/report.mapper.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type {
  ReportFolder,
  ReportFolderInput,
  ReportItem,
  ReportItemInput,
  ReportsTreeData,
} from '../types/report.js'
const FOLDER_COLUMNS = `id, name, parent_id, sort_order`
const REPORT_COLUMNS = `
  id, folder_id, name, report_type, author_name, schedule, description,
  template_id, table_config, last_run_at, updated_at
`

export async function getReportsTree(): Promise<ReportsTreeData> {
  const foldersResult = await tenantQuery<ReportFolderRow>(
    `SELECT ${FOLDER_COLUMNS}
     FROM crm_report_folders
     WHERE ${tenantWhereParam(1)}
     ORDER BY sort_order ASC, name ASC`,
    [getTenantIdOrDefault()],
  )
  const reportsResult = await tenantQuery<ReportRow>(
    `SELECT ${REPORT_COLUMNS}
     FROM crm_reports
     WHERE ${tenantWhereParam(1)}
     ORDER BY name ASC`,
    [getTenantIdOrDefault()],
  )
  return {
    folders: foldersResult.rows.map(mapReportFolderRow),
    reports: reportsResult.rows.map(mapReportRow),
  }
}

export async function getReportById(id: string): Promise<ReportItem> {
  const result = await tenantQuery<ReportRow>(
    `SELECT ${REPORT_COLUMNS} FROM crm_reports WHERE id = $1 AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Reporte no encontrado')
  return mapReportRow(row)
}

async function folderExists(id: string): Promise<boolean> {
  const result = await tenantQuery<{ id: string }>(
    `SELECT id FROM crm_report_folders WHERE id = $1 AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  return Boolean(result.rows[0])
}

async function folderHasChildren(folderId: string): Promise<boolean> {
  const subfolders = await tenantQuery<{ count: string }>(
    `SELECT count(*)::text AS count FROM crm_report_folders WHERE parent_id = $1`,
    [folderId],
  )
  const reports = await tenantQuery<{ count: string }>(
    `SELECT count(*)::text AS count FROM crm_reports WHERE folder_id = $1`,
    [folderId],
  )
  const sub = Number.parseInt(subfolders.rows[0]?.count ?? '0', 10)
  const rep = Number.parseInt(reports.rows[0]?.count ?? '0', 10)
  return sub > 0 || rep > 0
}

export async function createReportFolder(
  input: ReportFolderInput,
): Promise<ReportFolder> {
  if (!input.name.trim()) throw badRequest('El nombre de la carpeta es obligatorio')
  if (input.parentId && !(await folderExists(input.parentId))) {
    throw badRequest('La carpeta padre no existe')
  }

  const sortResult = await tenantQuery<{ max: number | null }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS max
     FROM crm_report_folders
     WHERE parent_id IS NOT DISTINCT FROM $1`,
    [input.parentId],
  )
  const sortOrder = sortResult.rows[0]?.max ?? 0

  const result = await tenantQuery<ReportFolderRow>(
    `INSERT INTO crm_report_folders (name, parent_id, sort_order, tenant_id)
     VALUES ($1, $2, $3, $4)
     RETURNING ${FOLDER_COLUMNS}`,
    [input.name.trim(), input.parentId, sortOrder, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw badRequest('No se pudo crear la carpeta')
  return mapReportFolderRow(row)
}

export async function updateReportFolder(
  id: string,
  name: string,
): Promise<ReportFolder> {
  if (!name.trim()) throw badRequest('El nombre de la carpeta es obligatorio')
  const result = await tenantQuery<ReportFolderRow>(
    `UPDATE crm_report_folders
     SET name = $2
     WHERE id = $1
     RETURNING ${FOLDER_COLUMNS}`,
    [id, name.trim()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Carpeta no encontrada')
  return mapReportFolderRow(row)
}

export async function deleteReportFolder(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await folderExists(id))) {
    return { ok: false, error: 'Carpeta no encontrada.' }
  }
  if (await folderHasChildren(id)) {
    return {
      ok: false,
      error: 'La carpeta no está vacía. Elimina o mueve su contenido primero.',
    }
  }
  await tenantQuery(`DELETE FROM crm_report_folders WHERE id = $1`, [id])
  return { ok: true }
}

export async function createReport(
  input: ReportItemInput,
  actor: AuditActor,
): Promise<ReportItem> {
  if (!input.name.trim()) throw badRequest('El nombre del reporte es obligatorio')
  if (!(await folderExists(input.folderId))) {
    throw badRequest('La carpeta no existe')
  }

  const templateId = input.templateId ?? 'tabla-dinamica'
  const tableConfig = buildTableConfigStorage({
    reportType: input.reportType,
    templateId,
    tableConfig: input.tableConfig,
  })

  const result = await tenantQuery<ReportRow>(
    `INSERT INTO crm_reports (
      folder_id, name, report_type, author_name, schedule, description,
      template_id, table_config, author_user_id, tenant_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING ${REPORT_COLUMNS}`,
    [
      input.folderId,
      input.name.trim(),
      dbReportType(templateId),
      input.author?.trim() || actor.userName,
      input.schedule,
      input.description?.trim() ?? '',
      templateId,
      tableConfig ? JSON.stringify(tableConfig) : null,
      actor.userId,
      getTenantIdOrDefault(),
    ],
  )
  const row = result.rows[0]
  if (!row) throw badRequest('No se pudo crear el reporte')
  return mapReportRow(row)
}

export async function updateReport(
  id: string,
  input: Partial<ReportItemInput>,
  _actor: AuditActor,
): Promise<ReportItem> {
  const existing = await getReportById(id)
  const templateId = input.templateId ?? existing.templateId ?? 'tabla-dinamica'
  const reportType = input.reportType ?? existing.reportType
  const tableConfig = buildTableConfigStorage({
    reportType,
    templateId,
    tableConfig: input.tableConfig ?? existing.tableConfig,
  })

  const result = await tenantQuery<ReportRow>(
    `UPDATE crm_reports SET
      folder_id = COALESCE($2, folder_id),
      name = COALESCE($3, name),
      report_type = COALESCE($4, report_type),
      author_name = COALESCE($5, author_name),
      schedule = COALESCE($6, schedule),
      description = COALESCE($7, description),
      template_id = COALESCE($8, template_id),
      table_config = COALESCE($9, table_config),
      updated_at = now()
    WHERE id = $1
    RETURNING ${REPORT_COLUMNS}`,
    [
      id,
      input.folderId ?? null,
      input.name?.trim() || null,
      input.templateId !== undefined ? dbReportType(templateId) : null,
      input.author?.trim() || null,
      input.schedule ?? null,
      input.description !== undefined ? input.description.trim() : null,
      input.templateId ?? null,
      input.tableConfig !== undefined || input.templateId !== undefined
        ? JSON.stringify(tableConfig)
        : null,
    ],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Reporte no encontrado')
  return mapReportRow(row)
}

export async function updateReportTableConfig(
  id: string,
  tableConfig: NonNullable<ReportItemInput['tableConfig']>,
  _actor: AuditActor,
): Promise<ReportItem> {
  const existing = await getReportById(id)
  const storage = buildTableConfigStorage({
    reportType: existing.reportType,
    templateId: 'tabla-dinamica',
    tableConfig,
  })

  const result = await tenantQuery<ReportRow>(
    `UPDATE crm_reports SET
      template_id = 'tabla-dinamica',
      report_type = 'table',
      table_config = $2,
      updated_at = now()
    WHERE id = $1
    RETURNING ${REPORT_COLUMNS}`,
    [id, JSON.stringify(storage)],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Reporte no encontrado')
  return mapReportRow(row)
}

export async function deleteReport(id: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)
    await client.query(`DELETE FROM crm_report_runs WHERE report_id = $1`, [id])
    const result = await client.query(`DELETE FROM crm_reports WHERE id = $1`, [id])
    if ((result.rowCount ?? 0) === 0) {
      throw notFound('Reporte no encontrado')
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function recordReportRun(
  id: string,
  actor: AuditActor,
): Promise<ReportItem> {
  const now = new Date()
  await tenantQuery(
    `INSERT INTO crm_report_runs (report_id, run_at, result_meta)
     VALUES ($1, $2, $3)`,
    [id, now, JSON.stringify({ triggeredBy: actor.userName })],
  )

  const result = await tenantQuery<ReportRow>(
    `UPDATE crm_reports
     SET last_run_at = $2, updated_at = now()
     WHERE id = $1
     RETURNING ${REPORT_COLUMNS}`,
    [id, now],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Reporte no encontrado')
  return mapReportRow(row)
}
