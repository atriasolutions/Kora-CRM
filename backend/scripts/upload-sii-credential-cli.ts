/**
 * Simula la subida de certificado SII desde Kora (upsertSiiCredential).
 * Uso en servidor:
 *   npx tsx scripts/upload-sii-credential-cli.ts /ruta/cert.pfx 'password' certification [78314528-6] ['portalPass']
 */
import { readFileSync } from 'node:fs'

import { runWithTenantAsync } from '../src/lib/tenant-context.js'
import { upsertSiiCredential } from '../src/services/sii-credential.service.js'
import { ATRIA_TENANT_ID } from '../src/types/tenant.js'

const certPath = process.argv[2]
const certPassword = process.argv[3]
const env = (process.argv[4] ?? 'certification') as 'certification' | 'production'
const portalRut = process.argv[5]
const portalPassword = process.argv[6]

if (!certPath || !certPassword) {
  console.error(
    'Uso: npx tsx scripts/upload-sii-credential-cli.ts <cert.pfx> <certPassword> [env] [portalRut] [portalPassword]',
  )
  process.exit(1)
}

async function main() {
  const certBase64 = readFileSync(certPath).toString('base64')

  const result = await runWithTenantAsync(
    { tenantId: ATRIA_TENANT_ID, tenantSlug: 'atriasolutions' },
    () =>
      upsertSiiCredential({
        env,
        certBase64,
        certPassword,
        portalRut,
        portalPassword,
        consent: true,
        actor: { userId: '00000000-0000-4000-8000-000000000001', email: 'cli@kora.local' },
      }),
  )

  console.log(JSON.stringify(result, null, 2))
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
