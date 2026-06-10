import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'

const BASE = `${API_V1}/tenant`

export type QuotaLevel = 'ok' | 'warning' | 'blocked'

export type TenantQuotasDto = {
  maxActiveUsers: number | null
  maxRecordsBytes: number | null
  maxFilesBytes: number | null
  gracePercent: number
}

export type TenantUsageDto = {
  quotas: TenantQuotasDto
  seatsUsed: number
  guestUsersUsed: number
  maxGuestUsers: number | null
  recordsBytes: number
  filesBytes: number
  recordsByModule: Record<string, number>
  filesByModule: Record<string, number>
  seatsLevel: QuotaLevel
  guestUsersLevel: QuotaLevel
  recordsLevel: QuotaLevel
  filesLevel: QuotaLevel
  computedAt: string
}

export type UpdateTenantQuotasBody = {
  maxActiveUsers?: number | null
  maxRecordsGb?: number | null
  maxFilesGb?: number | null
  gracePercent?: number
}

export type TenantAdminMetaDto = {
  id: string
  slug: string
  displayName: string
  kind: 'production' | 'trial' | 'internal'
  isProtected: boolean
}

export type TenantDestructiveResultDto = {
  slug: string
  displayName: string
  requiresReLogin?: boolean
}

export type CreateTenantInstanceBody = {
  displayName: string
  slug?: string
}

export type CreateTenantInstanceResultDto = {
  tenantId: string
  slug: string
  displayName: string
  loginUrl: string
}

export async function createTenantInstanceApi(
  body: CreateTenantInstanceBody,
): Promise<CreateTenantInstanceResultDto> {
  const res = await fetchJSON<{ data: CreateTenantInstanceResultDto }>(`${BASE}/instances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function getTenantUsageApi(refresh = false): Promise<TenantUsageDto> {
  const qs = refresh ? '?refresh=1' : ''
  const res = await fetchJSON<{ data: TenantUsageDto }>(`${BASE}/usage${qs}`)
  return res.data
}

export async function getTenantQuotasApi(): Promise<TenantQuotasDto> {
  const res = await fetchJSON<{ data: TenantQuotasDto }>(`${BASE}/quotas`)
  return res.data
}

export async function updateTenantQuotasApi(
  body: UpdateTenantQuotasBody,
): Promise<TenantQuotasDto> {
  const res = await fetchJSON<{ data: TenantQuotasDto }>(`${BASE}/quotas`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function getTenantAdminMetaApi(): Promise<TenantAdminMetaDto> {
  const res = await fetchJSON<{ data: TenantAdminMetaDto }>(`${BASE}/admin-meta`)
  return res.data
}

export async function truncateTenantRecordsApi(
  confirmSlug: string,
): Promise<TenantDestructiveResultDto> {
  const res = await fetchJSON<{ data: TenantDestructiveResultDto }>(`${BASE}/truncate-records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmSlug }),
  })
  return res.data
}

export async function destroyTenantApi(
  confirmSlug: string,
): Promise<TenantDestructiveResultDto> {
  const res = await fetchJSON<{ data: TenantDestructiveResultDto }>(`${BASE}/destroy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmSlug }),
  })
  return res.data
}

export const MODULE_LABELS: Record<string, string> = {
  contactos: 'Contactos',
  empresas: 'Empresas',
  oportunidades: 'Oportunidades',
  cotizaciones: 'Cotizaciones',
  proyectos: 'Proyectos',
  solicitudes: 'Solicitudes',
  actividades: 'Actividades',
  facturacion: 'Facturación',
  compras: 'Compras',
  productos: 'Productos',
  inventario: 'Inventario',
  ingresos: 'Ingresos',
  notas: 'Notas',
  usuarios: 'Usuarios',
}

export function bytesToGbLabel(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(2)
}

/** Etiqueta legible: MB/KB cuando el uso es muy inferior a 1 GB. */
export function formatStorageBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024
  const mb = 1024 * 1024
  const kb = 1024
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`
  if (bytes >= mb) return `${(bytes / mb).toFixed(2)} MB`
  if (bytes >= kb) return `${(bytes / kb).toFixed(0)} KB`
  return `${bytes} B`
}

/** Porcentaje del límite contratado (0 si no hay límite). */
export function percentOfLimit(usedBytes: number, limitBytes: number | null): number | null {
  if (limitBytes == null || limitBytes <= 0) return null
  return Math.min(100, (usedBytes / limitBytes) * 100)
}

export function formatPercentOfLimit(usedBytes: number, limitBytes: number | null): string {
  const pct = percentOfLimit(usedBytes, limitBytes)
  if (pct == null) return '—'
  if (pct > 0 && pct < 0.1) return '<0,1%'
  return `${pct.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`
}

export function quotaLevelLabel(level: QuotaLevel): string {
  switch (level) {
    case 'warning':
      return 'Advertencia'
    case 'blocked':
      return 'Bloqueado'
    default:
      return 'Normal'
  }
}
