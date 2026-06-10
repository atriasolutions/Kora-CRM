import { platformQuery } from '../db/tenant-query.js'
import { maxGuestUsersForTenant } from '../lib/default-tenant-profiles.js'
import {
  countGuestProfileUsers,
  countSeatsUsed,
  getTenantQuotasRow,
  getUsageCacheRow,
  mapQuotasRow,
  sumTenantFilesBytes,
  upsertUsageCache,
} from '../repositories/tenant-quotas.repository.js'
import {
  ENTITY_FILE_TYPE_TO_MODULE,
  MODULE_LABELS_ES,
} from '../lib/tenant-quota-modules.js'
import type {
  QuotaLevel,
  TenantQuotasDto,
  TenantUsageDto,
  TenantUsageModuleBreakdown,
} from '../types/tenant-quota.js'

const CACHE_TTL_MS = 5 * 60 * 1000

type ModuleQuery = { module: string; sql: string }

const RECORD_MODULE_QUERIES: ModuleQuery[] = [
  {
    module: 'contactos',
    sql: `SELECT coalesce(sum(
      octet_length(coalesce(name,'')) + octet_length(coalesce(email,'')) +
      octet_length(coalesce(phone,'')) + octet_length(coalesce(mobile_phone,'')) +
      octet_length(coalesce(role,'')) + octet_length(coalesce(company_name,'')) +
      octet_length(coalesce(notes,'')) + octet_length(coalesce(address,''))
    ), 0)::text AS bytes FROM crm_contacts WHERE tenant_id = $1 AND deleted_at IS NULL`,
  },
  {
    module: 'empresas',
    sql: `SELECT coalesce(sum(
      octet_length(coalesce(name,'')) + octet_length(coalesce(industry,'')) +
      octet_length(coalesce(website,'')) + octet_length(coalesce(phone,'')) +
      octet_length(coalesce(email,'')) + octet_length(coalesce(address,'')) +
      octet_length(coalesce(city,'')) + octet_length(coalesce(notes,''))
    ), 0)::text AS bytes FROM crm_companies WHERE tenant_id = $1 AND deleted_at IS NULL`,
  },
  {
    module: 'oportunidades',
    sql: `SELECT coalesce(sum(
      octet_length(coalesce(name,'')) + octet_length(coalesce(description,'')) +
      octet_length(coalesce(company_name,'')) + octet_length(coalesce(owner_name,'')) +
      octet_length(coalesce(stage,''))
    ), 0)::text AS bytes FROM crm_opportunities WHERE tenant_id = $1 AND deleted_at IS NULL`,
  },
  {
    module: 'cotizaciones',
    sql: `SELECT coalesce(sum(
      octet_length(coalesce(code,'')) + octet_length(coalesce(title,'')) +
      octet_length(coalesce(company_name,'')) + octet_length(coalesce(owner_name,'')) +
      octet_length(coalesce(terms,'')) + octet_length(coalesce(notes,''))
    ), 0)::text AS bytes FROM crm_quotes WHERE tenant_id = $1 AND deleted_at IS NULL`,
  },
  {
    module: 'cotizaciones',
    sql: `SELECT coalesce(sum(
      octet_length(coalesce(description,'')) + octet_length(coalesce(sku,''))
    ), 0)::text AS bytes
     FROM crm_quote_line_items li
     INNER JOIN crm_quotes q ON q.id = li.quote_id AND q.tenant_id = $1 AND q.deleted_at IS NULL`,
  },
  {
    module: 'proyectos',
    sql: `SELECT coalesce(sum(
      octet_length(coalesce(name,'')) + octet_length(coalesce(client_name,'')) +
      octet_length(coalesce(manager_name,'')) + octet_length(coalesce(work_plan_json::text,''))
    ), 0)::text AS bytes FROM crm_projects WHERE tenant_id = $1 AND deleted_at IS NULL`,
  },
  {
    module: 'solicitudes',
    sql: `SELECT coalesce(sum(
      octet_length(coalesce(code,'')) + octet_length(coalesce(title,'')) +
      octet_length(coalesce(description,'')) + octet_length(coalesce(assignee_name,''))
    ), 0)::text AS bytes FROM crm_solicitudes WHERE tenant_id = $1 AND deleted_at IS NULL`,
  },
  {
    module: 'actividades',
    sql: `SELECT coalesce(sum(
      octet_length(coalesce(title,'')) + octet_length(coalesce(description,'')) +
      octet_length(coalesce(related_name,'')) + octet_length(coalesce(company_name,'')) +
      octet_length(coalesce(assignee_name,''))
    ), 0)::text AS bytes FROM crm_activities WHERE tenant_id = $1 AND deleted_at IS NULL`,
  },
  {
    module: 'facturacion',
    sql: `SELECT coalesce(sum(
      octet_length(coalesce(number,'')) + octet_length(coalesce(client_name,'')) +
      octet_length(coalesce(notes,''))
    ), 0)::text AS bytes FROM crm_invoices WHERE tenant_id = $1 AND deleted_at IS NULL`,
  },
  {
    module: 'facturacion',
    sql: `SELECT coalesce(sum(octet_length(coalesce(description,''))) , 0)::text AS bytes
     FROM crm_invoice_line_items li
     INNER JOIN crm_invoices i ON i.id = li.invoice_id AND i.tenant_id = $1 AND i.deleted_at IS NULL`,
  },
  {
    module: 'compras',
    sql: `SELECT coalesce(sum(
      octet_length(coalesce(code,'')) + octet_length(coalesce(supplier_name,'')) +
      octet_length(coalesce(notes,''))
    ), 0)::text AS bytes FROM crm_purchases WHERE tenant_id = $1 AND deleted_at IS NULL`,
  },
  {
    module: 'compras',
    sql: `SELECT coalesce(sum(octet_length(coalesce(description,''))) , 0)::text AS bytes
     FROM crm_purchase_line_items li
     INNER JOIN crm_purchases p ON p.id = li.purchase_id AND p.tenant_id = $1 AND p.deleted_at IS NULL`,
  },
  {
    module: 'productos',
    sql: `SELECT coalesce(sum(
      octet_length(coalesce(name,'')) + octet_length(coalesce(sku,'')) +
      octet_length(coalesce(description,'')) + octet_length(coalesce(notes,''))
    ), 0)::text AS bytes FROM crm_products WHERE tenant_id = $1 AND deleted_at IS NULL`,
  },
  {
    module: 'ingresos',
    sql: `SELECT coalesce(sum(
      octet_length(coalesce(code,'')) + octet_length(coalesce(supplier_name,'')) +
      octet_length(coalesce(notes,''))
    ), 0)::text AS bytes FROM crm_stock_receipts WHERE tenant_id = $1 AND deleted_at IS NULL`,
  },
  {
    module: 'inventario',
    sql: `SELECT coalesce(sum(octet_length(coalesce(notes,''))) , 0)::text AS bytes
     FROM crm_stock_movements WHERE tenant_id = $1`,
  },
  {
    module: 'notas',
    sql: `SELECT coalesce(sum(octet_length(coalesce(body,''))) , 0)::text AS bytes
     FROM crm_entity_notes WHERE tenant_id = $1`,
  },
  {
    module: 'usuarios',
    sql: `SELECT coalesce(sum(
      octet_length(coalesce(u.name,'')) + octet_length(coalesce(u.email,'')) +
      octet_length(coalesce(m.display_name,'')) + octet_length(coalesce(m.bio,''))
    ), 0)::text AS bytes
     FROM crm_tenant_memberships m
     INNER JOIN crm_users u ON u.id = m.user_id AND u.deleted_at IS NULL
     WHERE m.tenant_id = $1`,
  },
]

async function queryModuleBytes(tenantId: string, query: ModuleQuery): Promise<number> {
  try {
    const result = await platformQuery<{ bytes: string }>(query.sql, [tenantId])
    return Number.parseInt(result.rows[0]?.bytes ?? '0', 10)
  } catch {
    return 0
  }
}

async function computeRecordsByModule(tenantId: string): Promise<TenantUsageModuleBreakdown> {
  const byModule: TenantUsageModuleBreakdown = {}
  for (const query of RECORD_MODULE_QUERIES) {
    const bytes = await queryModuleBytes(tenantId, query)
    byModule[query.module] = (byModule[query.module] ?? 0) + bytes
  }
  return byModule
}

async function computeFilesByModule(tenantId: string): Promise<TenantUsageModuleBreakdown> {
  const result = await platformQuery<{ entity_type: string; total: string }>(
    `SELECT entity_type,
            coalesce(sum(coalesce(size_bytes, octet_length(storage_key))), 0)::text AS total
     FROM crm_entity_files
     WHERE tenant_id = $1
     GROUP BY entity_type`,
    [tenantId],
  )
  const byModule: TenantUsageModuleBreakdown = {}
  for (const row of result.rows) {
    const module = ENTITY_FILE_TYPE_TO_MODULE[row.entity_type] ?? row.entity_type
    const bytes = Number.parseInt(row.total ?? '0', 10)
    byModule[module] = (byModule[module] ?? 0) + bytes
  }
  return byModule
}

export function resolveQuotaLevel(
  usage: number,
  limit: number | null,
  gracePercent: number,
  options?: { strictAtLimit?: boolean },
): QuotaLevel {
  if (limit == null || limit <= 0) return 'ok'
  if (options?.strictAtLimit) {
    if (usage >= limit) return 'blocked'
    return 'ok'
  }
  const hardLimit = limit * (1 + gracePercent / 100)
  if (usage > hardLimit) return 'blocked'
  if (usage > limit) return 'warning'
  return 'ok'
}

export async function refreshTenantUsage(tenantId: string): Promise<{
  seatsUsed: number
  recordsBytes: number
  filesBytes: number
  recordsByModule: TenantUsageModuleBreakdown
  filesByModule: TenantUsageModuleBreakdown
}> {
  const [seatsUsed, recordsByModule, filesByModule] = await Promise.all([
    countSeatsUsed(tenantId),
    computeRecordsByModule(tenantId),
    computeFilesByModule(tenantId),
  ])
  const recordsBytes = Object.values(recordsByModule).reduce((a, b) => a + b, 0)
  const filesBytes = Object.values(filesByModule).reduce((a, b) => a + b, 0)

  await upsertUsageCache(tenantId, {
    seatsUsed,
    recordsBytes,
    filesBytes,
    recordsByModule,
    filesByModule,
  })

  return { seatsUsed, recordsBytes, filesBytes, recordsByModule, filesByModule }
}

async function resolveGuestUsersUsage(
  tenantId: string,
  quotas: TenantQuotasDto,
): Promise<{
  guestUsersUsed: number
  maxGuestUsers: number | null
  guestUsersLevel: QuotaLevel
}> {
  const [guestUsersUsed, maxGuestUsers] = await Promise.all([
    countGuestProfileUsers(tenantId),
    Promise.resolve(maxGuestUsersForTenant(quotas.maxActiveUsers)),
  ])
  return {
    guestUsersUsed,
    maxGuestUsers,
    guestUsersLevel: resolveQuotaLevel(guestUsersUsed, maxGuestUsers, 0, {
      strictAtLimit: true,
    }),
  }
}

export async function getTenantUsage(
  tenantId: string,
  options?: { forceRefresh?: boolean },
): Promise<TenantUsageDto> {
  const quotas = mapQuotasRow(await getTenantQuotasRow(tenantId))
  const cached = await getUsageCacheRow(tenantId)
  const stale =
    !cached ||
    options?.forceRefresh ||
    Date.now() - new Date(cached.computed_at).getTime() > CACHE_TTL_MS

  let seatsUsed: number
  let recordsBytes: number
  let filesBytes: number
  let recordsByModule: TenantUsageModuleBreakdown
  let filesByModule: TenantUsageModuleBreakdown
  let computedAt: string

  if (stale) {
    const fresh = await refreshTenantUsage(tenantId)
    seatsUsed = fresh.seatsUsed
    recordsBytes = fresh.recordsBytes
    filesBytes = fresh.filesBytes
    recordsByModule = fresh.recordsByModule
    filesByModule = fresh.filesByModule
    computedAt = new Date().toISOString()
  } else {
    recordsBytes = Number(cached.records_bytes)
    filesBytes = Number(cached.files_bytes)
    recordsByModule = cached.records_by_module ?? {}
    filesByModule = cached.files_by_module ?? {}
    computedAt = new Date(cached.computed_at).toISOString()
    // Cupo de usuarios: siempre en vivo (barato). La caché puede quedar desactualizada.
    seatsUsed = await countSeatsUsed(tenantId)
    if (Number(cached.seats_used) !== seatsUsed) {
      await upsertUsageCache(tenantId, {
        seatsUsed,
        recordsBytes,
        filesBytes,
        recordsByModule,
        filesByModule,
      })
    }
  }

  const guestUsage = await resolveGuestUsersUsage(tenantId, quotas)

  return {
    quotas,
    seatsUsed,
    guestUsersUsed: guestUsage.guestUsersUsed,
    maxGuestUsers: guestUsage.maxGuestUsers,
    recordsBytes,
    filesBytes,
    recordsByModule,
    filesByModule,
    seatsLevel: resolveQuotaLevel(
      seatsUsed,
      quotas.maxActiveUsers,
      0,
      { strictAtLimit: true },
    ),
    guestUsersLevel: guestUsage.guestUsersLevel,
    recordsLevel: resolveQuotaLevel(
      recordsBytes,
      quotas.maxRecordsBytes,
      quotas.gracePercent,
    ),
    filesLevel: resolveQuotaLevel(
      filesBytes,
      quotas.maxFilesBytes,
      quotas.gracePercent,
    ),
    computedAt,
  }
}

/** Uso rápido de archivos del tenant (enforcement). */
export async function getTenantFilesBytesTotal(tenantId: string): Promise<number> {
  return sumTenantFilesBytes(tenantId)
}

export function formatModuleLabel(moduleId: string): string {
  return MODULE_LABELS_ES[moduleId] ?? moduleId
}

export function buildUsageDtoFromQuotas(
  quotas: TenantQuotasDto,
  usage: Awaited<ReturnType<typeof refreshTenantUsage>>,
  guestUsersUsed: number,
): TenantUsageDto {
  const maxGuestUsers = maxGuestUsersForTenant(quotas.maxActiveUsers)
  return {
    quotas,
    seatsUsed: usage.seatsUsed,
    guestUsersUsed,
    maxGuestUsers,
    recordsBytes: usage.recordsBytes,
    filesBytes: usage.filesBytes,
    recordsByModule: usage.recordsByModule,
    filesByModule: usage.filesByModule,
    seatsLevel: resolveQuotaLevel(usage.seatsUsed, quotas.maxActiveUsers, 0, {
      strictAtLimit: true,
    }),
    guestUsersLevel: resolveQuotaLevel(guestUsersUsed, maxGuestUsers, 0, {
      strictAtLimit: true,
    }),
    recordsLevel: resolveQuotaLevel(
      usage.recordsBytes,
      quotas.maxRecordsBytes,
      quotas.gracePercent,
    ),
    filesLevel: resolveQuotaLevel(
      usage.filesBytes,
      quotas.maxFilesBytes,
      quotas.gracePercent,
    ),
    computedAt: new Date().toISOString(),
  }
}
