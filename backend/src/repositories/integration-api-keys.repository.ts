import { platformQuery } from '../db/tenant-query.js'
import {
  hashIntegrationApiKey,
  integrationApiKeyPrefix,
} from '../lib/integration-api-key.js'
import { badRequest } from '../middleware/errors.js'

export type IntegrationApiKeyRow = {
  id: string
  tenant_id: string
  tenant_slug: string
  name: string
  key_prefix: string
  default_assignee_email: string | null
  lead_source: string
  active: boolean
}

export type ResolvedIntegrationApiKey = {
  id: string
  tenantId: string
  tenantSlug: string
  name: string
  defaultAssigneeEmail: string | null
  leadSource: string
}

export async function resolveIntegrationApiKey(
  rawKey: string,
): Promise<ResolvedIntegrationApiKey | null> {
  const trimmed = rawKey.trim()
  if (!trimmed) return null

  const keyHash = hashIntegrationApiKey(trimmed)
  const result = await platformQuery<IntegrationApiKeyRow>(
    `SELECT k.id, k.tenant_id, t.slug AS tenant_slug, k.name, k.key_prefix,
            k.default_assignee_email, k.lead_source, k.active
     FROM crm_tenant_integration_api_keys k
     INNER JOIN crm_tenants t ON t.id = k.tenant_id AND t.status <> 'deleted'
     WHERE k.key_hash = $1 AND k.active = true
     LIMIT 1`,
    [keyHash],
  )
  const row = result.rows[0]
  if (!row) return null

  await platformQuery(
    `UPDATE crm_tenant_integration_api_keys
     SET last_used_at = now()
     WHERE id = $1`,
    [row.id],
  )

  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantSlug: row.tenant_slug,
    name: row.name,
    defaultAssigneeEmail: row.default_assignee_email?.trim() || null,
    leadSource: row.lead_source?.trim() || 'Integración externa',
  }
}

export async function createIntegrationApiKey(params: {
  tenantId: string
  rawKey: string
  name?: string
  defaultAssigneeEmail?: string | null
  leadSource?: string
}): Promise<{ id: string; keyPrefix: string }> {
  const rawKey = params.rawKey.trim()
  if (!rawKey) throw badRequest('La API key no puede estar vacía.')

  const result = await platformQuery<{ id: string }>(
    `INSERT INTO crm_tenant_integration_api_keys (
       tenant_id, name, key_prefix, key_hash, default_assignee_email, lead_source
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      params.tenantId,
      params.name?.trim() || 'Integración leads',
      integrationApiKeyPrefix(rawKey),
      hashIntegrationApiKey(rawKey),
      params.defaultAssigneeEmail?.trim().toLowerCase() || null,
      params.leadSource?.trim() || 'Integración externa',
    ],
  )
  const id = result.rows[0]?.id
  if (!id) throw badRequest('No se pudo crear la API key.')
  return { id, keyPrefix: integrationApiKeyPrefix(rawKey) }
}
