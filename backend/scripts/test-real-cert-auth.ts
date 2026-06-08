import { readFileSync } from 'node:fs'

import { authenticateSii, extractCertMetadata } from '../src/lib/sii-soap-auth.js'
import { loadCertFromBase64 } from '../src/lib/emisso-sii.js'

const certPath = process.argv[2]
const certPassword = process.argv[3]
const env = (process.argv[4] ?? 'certification') as 'certification' | 'production'

if (!certPath || !certPassword) {
  console.error('Uso: npx tsx scripts/test-real-cert-auth.ts <ruta.pfx> <password> [certification|production]')
  process.exit(1)
}

async function main() {
  const certBase64 = readFileSync(certPath).toString('base64')
  console.log('--- Metadatos certificado ---')
  try {
    loadCertFromBase64(certBase64, certPassword)
    console.log('PKCS12: OK (contraseña aceptada, clave privada legible)')
  } catch (e) {
    console.log('PKCS12: FALLO', e instanceof Error ? e.message : e)
    process.exit(1)
  }

  const meta = extractCertMetadata(certBase64, certPassword)
  console.log('RUT extraído del cert:', meta.certRut)
  console.log('Vence:', meta.certExpiresAt?.toISOString().slice(0, 10))

  const certData = loadCertFromBase64(certBase64, certPassword)
  const subj = certData.certificate.subject.attributes
    .map((a) => `${a.shortName ?? a.name}=${a.value}`)
    .join(', ')
  const issuer = certData.certificate.issuer.attributes
    .map((a) => `${a.shortName ?? a.name}=${a.value}`)
    .join(', ')
  console.log('Subject cert:', subj)
  console.log('Issuer cert:', issuer)

  console.log(`\n--- SOAP token (${env}) ---`)
  try {
    const result = await authenticateSii({ certPath, certPassword, env })
    console.log('TOKEN: OK')
    console.log('Longitud token:', result.token.length)
    console.log('Expira aprox:', result.expiresAt.toISOString())
  } catch (e) {
    console.log('TOKEN: FALLO')
    console.log(e instanceof Error ? e.message : e)
  }

  console.log('\n--- Notas formato ---')
  console.log('RUT portal: no se usa en SOAP; acepta 78314528-6, 78.314.528-6 o sin puntos.')
  console.log('Clave con #: se envía tal cual en FormData; no afecta la prueba de token SOAP.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
