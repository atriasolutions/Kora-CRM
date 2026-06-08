import * as orgSettingsRepo from '../repositories/organization-settings.repository.js'
import { listFolioRanges } from './sii-folio.service.js'
import { listSiiCredentials } from './sii-credential.service.js'
import { tenantQuery } from '../db/tenant-query.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'

export type SiiIntegrationStatus = {
  invoicingMode: 'manual' | 'sii'
  configured: boolean
  credentialsCount: number
  folioRangesCount: number
  lastRcvSyncAt: string | null
  readyToEmit: boolean
  missing: string[]
}

export async function getSiiIntegrationStatus(): Promise<SiiIntegrationStatus> {
  const org = await orgSettingsRepo.getOrganizationSettings()
  const credentials = await listSiiCredentials()
  const folios = org.invoicingMode === 'sii' ? await listFolioRanges() : []

  const settingsRow = await tenantQuery<{ last_rcv_sync_at: Date | null }>(
    `SELECT last_rcv_sync_at FROM sii.settings WHERE tenant_id = $1`,
    [getTenantIdOrDefault()],
  )

  const missing: string[] = []
  if (org.invoicingMode === 'sii') {
    if (!org.rut.trim()) missing.push('RUT emisor')
    if (!org.legalName.trim()) missing.push('Razón social')
    if (!org.giro.trim()) missing.push('Giro')
    if (!org.commune.trim()) missing.push('Comuna')
    if (org.economicActivityCode == null) missing.push('Actividad económica')
    if (credentials.length === 0) missing.push('Certificado digital')
    if (folios.length === 0) missing.push('CAF / folios')
  }

  return {
    invoicingMode: org.invoicingMode,
    configured: org.invoicingMode === 'manual' || missing.length === 0,
    credentialsCount: credentials.length,
    folioRangesCount: folios.length,
    lastRcvSyncAt: settingsRow.rows[0]?.last_rcv_sync_at?.toISOString() ?? null,
    readyToEmit:
      org.invoicingMode === 'sii' &&
      credentials.length > 0 &&
      folios.some((f) => f.remaining > 0) &&
      missing.filter((m) => m !== 'CAF / folios').length === 0,
    missing,
  }
}
