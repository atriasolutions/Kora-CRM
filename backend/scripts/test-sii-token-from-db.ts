/** Prueba token SOAP con el certificado ya guardado en Kora (DB). */
import { readFileSync } from 'node:fs'

import forge from 'node-forge'

import { authenticate } from '../src/lib/emisso-sii.js'
import { authenticateSii, extractCertMetadata } from '../src/lib/sii-soap-auth.js'
import { loadCertFromBase64 } from '../src/lib/emisso-sii.js'
import { runWithTenantAsync } from '../src/lib/tenant-context.js'
import {
  cleanupTempCert,
  getSiiCredentialForEnv,
} from '../src/services/sii-credential.service.js'
import { ATRIA_TENANT_ID } from '../src/types/tenant.js'

const env = (process.argv[2] ?? 'certification') as 'certification' | 'production'

async function main() {
  await runWithTenantAsync(
    { tenantId: ATRIA_TENANT_ID, tenantSlug: 'atriasolutions' },
    async () => {
      const cred = await getSiiCredentialForEnv(env)
      if (!cred) {
        console.log('No hay certificado guardado para', env)
        return
      }

      const certBase64 = readFileSync(cred.certPath).toString('base64')
      const meta = extractCertMetadata(certBase64, cred.certPassword)
      const certData = loadCertFromBase64(certBase64, cred.certPassword)
      const subject = certData.certificate.subject.attributes
        .map((a) => `${a.shortName ?? a.name}=${a.value}`)
        .join(', ')
      const issuer = certData.certificate.issuer.attributes
        .map((a) => `${a.shortName ?? a.name}=${a.value}`)
        .join(', ')
      console.log('Subject:', subject)
      console.log('Issuer:', issuer)
      console.log('Cert en DB:', JSON.stringify(meta, null, 2))

      console.log('Probando env:', env)
      try {
        console.log('\n--- sii-soap-auth (Kora upload test) ---')
        const r = await authenticateSii({
          certPath: cred.certPath,
          certPassword: cred.certPassword,
          env,
        })
        console.log('OK token length', r.token.length)
      } catch (e) {
        console.log('FALLO', e instanceof Error ? e.message : e)
      }

      try {
        console.log('\n--- emisso authenticate (emit flow) ---')
        const token = await authenticate({
          certPath: cred.certPath,
          certPassword: cred.certPassword,
          env,
        })
        console.log('OK token length', token.length)
      } catch (e) {
        console.log('FALLO', e instanceof Error ? e.message : e)
      } finally {
        cleanupTempCert(cred.certPath)
      }
    },
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
