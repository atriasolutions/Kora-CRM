/**
 * Sincroniza RCV del mes anterior para tenants en modo SII.
 * Cron sugerido: 0 4 * * * cd /var/www/kora-crm/backend && npm run job:sync-sii-rcv
 */
import 'dotenv/config'

import { platformQuery } from '../db/tenant-query.js'
import { runWithTenantAsync } from '../lib/tenant-context.js'
import { syncRcvInvoices } from '../services/sii-rcv.service.js'

async function main(): Promise<void> {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const period = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`

  const tenants = await platformQuery<{ tenant_id: string; slug: string }>(
    `SELECT os.tenant_id, t.slug
     FROM crm_organization_settings os
     JOIN crm_tenants t ON t.id = os.tenant_id
     WHERE os.invoicing_mode = 'sii' AND t.status = 'active'`,
  )

  for (const row of tenants.rows) {
    await runWithTenantAsync({ tenantId: row.tenant_id, tenantSlug: row.slug }, async () => {
      for (const type of ['issued', 'received'] as const) {
        try {
          const result = await syncRcvInvoices({ period, type })
          console.log(`[sii-rcv] ${row.slug} ${period} ${type}: ${result.synced}`)
        } catch (err) {
          console.error(`[sii-rcv] ${row.slug} ${type} failed:`, err)
        }
      }
    })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
