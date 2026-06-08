import { ARCHIVE_RETENTION_INTERVAL } from '../constants/archive-retention.js'
import { env } from '../config/env.js'
import { pool } from '../db/pool.js'
import * as activitiesRepo from '../repositories/activities.repository.js'
import * as companiesRepo from '../repositories/companies.repository.js'
import * as contactsRepo from '../repositories/contacts.repository.js'
import * as invoicesRepo from '../repositories/invoices.repository.js'
import * as opportunitiesRepo from '../repositories/opportunities.repository.js'
import * as productsRepo from '../repositories/products.repository.js'
import * as projectsRepo from '../repositories/projects.repository.js'
import * as purchasesRepo from '../repositories/purchases.repository.js'
import * as quotesRepo from '../repositories/quotes.repository.js'
import * as solicitudesRepo from '../repositories/solicitudes.repository.js'
import * as stockReceiptsRepo from '../repositories/stock-receipts.repository.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import type { AuditActor } from '../types/audit.js'

const SYSTEM_ACTOR: AuditActor = {
  userId: env.demoUserId,
  userName: 'Sistema Kora',
  tenantId: getTenantIdOrDefault(),
}

export type ArchivePurgeEntityResult = {
  entity: string
  purged: number
  failed: number
}

export type ArchivePurgeRunResult = {
  ranAt: string
  entities: ArchivePurgeEntityResult[]
  totalPurged: number
  totalFailed: number
}

async function listExpiredIds(
  sql: string,
  usesArchivedAt = true,
): Promise<string[]> {
  const cutoffClause = usesArchivedAt
    ? `archived_at IS NOT NULL AND archived_at <= now() - interval '${ARCHIVE_RETENTION_INTERVAL}'`
    : `deleted_at IS NOT NULL AND deleted_at <= now() - interval '${ARCHIVE_RETENTION_INTERVAL}'`

  const result = await pool.query<{ id: string }>(
    sql.replace('__CUTOFF__', cutoffClause),
  )
  return result.rows.map((row) => row.id)
}

async function purgeIds(
  entity: string,
  ids: string[],
  deleteFn: (id: string) => Promise<void>,
): Promise<ArchivePurgeEntityResult> {
  let purged = 0
  let failed = 0
  for (const id of ids) {
    try {
      await deleteFn(id)
      purged += 1
    } catch (error) {
      failed += 1
      console.error(`[archive-purge] ${entity} ${id}:`, error)
    }
  }
  return { entity, purged, failed }
}

/** Elimina registros archivados ≥ 30 días (notas y archivos incluidos vía repositorios). */
export async function purgeExpiredArchivedRecords(): Promise<ArchivePurgeRunResult> {
  const ranAt = new Date().toISOString()

  const batches: Array<{ entity: string; ids: string[]; deleteFn: (id: string) => Promise<void> }> =
    [
      {
        entity: 'empresa',
        ids: await listExpiredIds(
          `SELECT id FROM crm_companies WHERE deleted_at IS NULL AND __CUTOFF__`,
        ),
        deleteFn: (id) => companiesRepo.softDeleteCompany(id, SYSTEM_ACTOR),
      },
      {
        entity: 'contacto',
        ids: await listExpiredIds(
          `SELECT id FROM crm_contacts WHERE deleted_at IS NULL AND __CUTOFF__`,
        ),
        deleteFn: (id) => contactsRepo.softDeleteContact(id, SYSTEM_ACTOR),
      },
      {
        entity: 'oportunidad',
        ids: await listExpiredIds(
          `SELECT id FROM crm_opportunities WHERE deleted_at IS NULL AND __CUTOFF__`,
        ),
        deleteFn: (id) => opportunitiesRepo.softDeleteOpportunity(id, SYSTEM_ACTOR),
      },
      {
        entity: 'cotizacion',
        ids: await listExpiredIds(
          `SELECT id FROM crm_quotes WHERE deleted_at IS NULL AND __CUTOFF__`,
        ),
        deleteFn: (id) => quotesRepo.softDeleteQuote(id, SYSTEM_ACTOR),
      },
      {
        entity: 'producto',
        ids: await listExpiredIds(
          `SELECT id FROM crm_products WHERE deleted_at IS NULL AND __CUTOFF__`,
        ),
        deleteFn: (id) => productsRepo.permanentlyDeleteProduct(id),
      },
      {
        entity: 'proyecto',
        ids: await listExpiredIds(
          `SELECT id FROM crm_projects WHERE deleted_at IS NULL AND __CUTOFF__`,
        ),
        deleteFn: (id) => projectsRepo.permanentlyDeleteProject(id),
      },
      {
        entity: 'factura',
        ids: await listExpiredIds(
          `SELECT id FROM crm_invoices WHERE deleted_at IS NULL AND __CUTOFF__`,
        ),
        deleteFn: (id) => invoicesRepo.permanentlyDeleteInvoice(id, SYSTEM_ACTOR),
      },
      {
        entity: 'compra',
        ids: await listExpiredIds(
          `SELECT id FROM crm_purchases WHERE deleted_at IS NULL AND __CUTOFF__`,
        ),
        deleteFn: (id) => purchasesRepo.permanentlyDeletePurchase(id),
      },
      {
        entity: 'solicitud',
        ids: await listExpiredIds(
          `SELECT id FROM crm_solicitudes WHERE deleted_at IS NULL AND __CUTOFF__`,
        ),
        deleteFn: (id) => solicitudesRepo.permanentlyDeleteSolicitud(id),
      },
      {
        entity: 'actividad',
        ids: await listExpiredIds(
          `SELECT id FROM crm_activities WHERE __CUTOFF__`,
          false,
        ),
        deleteFn: (id) => activitiesRepo.permanentlyDeleteActivity(id),
      },
      {
        entity: 'recepcion',
        ids: await listExpiredIds(
          `SELECT id FROM crm_stock_receipts WHERE __CUTOFF__`,
          false,
        ),
        deleteFn: (id) => stockReceiptsRepo.permanentlyDeleteStockReceipt(id, SYSTEM_ACTOR),
      },
    ]

  const entities: ArchivePurgeEntityResult[] = []
  for (const batch of batches) {
    if (batch.ids.length === 0) continue
    entities.push(await purgeIds(batch.entity, batch.ids, batch.deleteFn))
  }

  const totalPurged = entities.reduce((sum, row) => sum + row.purged, 0)
  const totalFailed = entities.reduce((sum, row) => sum + row.failed, 0)

  if (totalPurged > 0 || totalFailed > 0) {
    console.log(
      `[archive-purge] Finalizado: ${totalPurged} eliminado(s), ${totalFailed} error(es).`,
      entities
        .filter((row) => row.purged > 0 || row.failed > 0)
        .map((row) => `${row.entity}=${row.purged}/${row.failed}`)
        .join(', '),
    )
  }

  return { ranAt, entities, totalPurged, totalFailed }
}
