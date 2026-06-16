#!/usr/bin/env npx tsx
/**
 * Genera una API key de integración de leads para un tenant.
 *
 * Uso:
 *   npx tsx scripts/create-integration-api-key.ts comercializadora-k-s cris.morenol@duocuc.cl
 *
 * La clave completa se imprime UNA sola vez en consola; guárdala en el sistema externo.
 */
import 'dotenv/config'

import { pool } from '../src/db/pool.js'
import { generateIntegrationApiKey } from '../src/lib/integration-api-key.js'
import { createIntegrationApiKey } from '../src/repositories/integration-api-keys.repository.js'
import { getTenantBySlug } from '../src/repositories/tenants.repository.js'

async function main() {
  const slug = (process.argv[2] ?? '').trim().toLowerCase()
  const assigneeEmail = (process.argv[3] ?? '').trim().toLowerCase() || null
  const name = (process.argv[4] ?? 'Integración leads').trim()

  if (!slug) {
    console.error(
      'Uso: npx tsx scripts/create-integration-api-key.ts <tenant-slug> [assignee-email] [nombre-clave]',
    )
    process.exit(1)
  }

  const tenant = await getTenantBySlug(slug)
  if (!tenant) {
    console.error(`Tenant no encontrado: ${slug}`)
    process.exit(1)
  }

  const rawKey = generateIntegrationApiKey()
  const created = await createIntegrationApiKey({
    tenantId: tenant.id,
    rawKey,
    name,
    defaultAssigneeEmail: assigneeEmail,
    leadSource: 'Integración externa',
  })

  console.log('')
  console.log('API key creada correctamente')
  console.log('---------------------------')
  console.log(`Tenant:           ${tenant.displayName} (${tenant.slug})`)
  console.log(`Tenant ID:        ${tenant.id}`)
  console.log(`Nombre clave:     ${name}`)
  console.log(`Prefijo:          ${created.keyPrefix}`)
  if (assigneeEmail) {
    console.log(`Assignee default: ${assigneeEmail}`)
  }
  console.log('')
  console.log('GUARDA ESTA CLAVE (no se volverá a mostrar):')
  console.log(rawKey)
  console.log('')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
  })
