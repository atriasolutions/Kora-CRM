import * as orgSettingsRepo from '../repositories/organization-settings.repository.js'
import { listFolioRanges } from './sii-folio.service.js'
import { listSiiCredentials } from './sii-credential.service.js'
import { tenantQuery } from '../db/tenant-query.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'

const REQUIRED_DTE_TYPES = [33, 34, 56, 61] as const

export type SiiIntegrationStatus = {
  invoicingMode: 'manual' | 'sii'
  configured: boolean
  credentialsCount: number
  folioRangesCount: number
  folioTypesAvailable: number[]
  folioTypesMissing: number[]
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

  const folioTypesAvailable = [
    ...new Set(
      folios.filter((folio) => folio.remaining > 0).map((folio) => folio.dteType),
    ),
  ].sort((a, b) => a - b)

  const folioTypesMissing = REQUIRED_DTE_TYPES.filter(
    (type) => !folioTypesAvailable.includes(type),
  )

  const coreMissing: string[] = []
  if (org.invoicingMode === 'sii') {
    if (!org.rut.trim()) coreMissing.push('RUT emisor')
    if (!org.legalName.trim()) coreMissing.push('Razón social')
    if (!org.giro.trim()) coreMissing.push('Giro')
    if (!org.commune.trim()) coreMissing.push('Comuna')
    if (org.economicActivityCode == null) coreMissing.push('Actividad económica')
    if (credentials.length === 0) coreMissing.push('Certificado digital')
    if (folioTypesAvailable.length === 0) coreMissing.push('CAF / folios')
  }

  const cafWarnings = folioTypesMissing.map((type) => `CAF tipo ${type}`)

  return {
    invoicingMode: org.invoicingMode,
    configured: org.invoicingMode === 'manual' || coreMissing.length === 0,
    credentialsCount: credentials.length,
    folioRangesCount: folios.length,
    folioTypesAvailable,
    folioTypesMissing: [...folioTypesMissing],
    lastRcvSyncAt: settingsRow.rows[0]?.last_rcv_sync_at?.toISOString() ?? null,
    readyToEmit:
      org.invoicingMode === 'sii' &&
      coreMissing.length === 0 &&
      folioTypesAvailable.includes(33),
    missing: [...coreMissing, ...cafWarnings],
  }
}
