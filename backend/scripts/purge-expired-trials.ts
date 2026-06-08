#!/usr/bin/env node
/**
 * Job: purga tenants trial vencidos.
 * Cron sugerido: 0 3 * * * cd /var/www/kora-crm/backend && node dist/scripts/purge-expired-trials.js
 */
import 'dotenv/config'

import { purgeExpiredTrialTenants } from '../services/tenant-lifecycle.service.js'

async function main() {
  const count = await purgeExpiredTrialTenants()
  console.log(`Purged ${count} expired trial tenant(s).`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
