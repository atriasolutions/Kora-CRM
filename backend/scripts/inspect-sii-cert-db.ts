import { query } from '../src/db/query.js'
import { decryptSiiSecret } from '../src/lib/sii-crypto.js'
import { loadCertFromBase64 } from '../src/lib/emisso-sii.js'

async function main() {
  const row = (
    await query<{
      cert_base64: string
      cert_password_encrypted: string
      cert_rut: string | null
      cert_expires_at: Date | string | null
      updated_at: Date
    }>(
      `SELECT cert_base64, cert_password_encrypted, cert_rut, cert_expires_at, updated_at
       FROM sii.credentials
       WHERE tenant_id = $1 AND env = $2`,
      ['a0000001-0001-4001-8001-000000000001', 'certification'],
    )
  ).rows[0]

  if (!row) {
    console.log('Sin certificado certification')
    return
  }

  const pass = decryptSiiSecret(row.cert_password_encrypted)
  const certData = loadCertFromBase64(row.cert_base64, pass)
  const issuer = certData.certificate.issuer.attributes
    .map((a) => `${a.shortName ?? a.name}=${a.value}`)
    .join(', ')
  const subject = certData.certificate.subject.attributes
    .map((a) => `${a.shortName ?? a.name}=${a.value}`)
    .join(', ')

  console.log(
    JSON.stringify(
      {
        dbCertRut: row.cert_rut,
        updatedAt: row.updated_at,
        expiresAt: row.cert_expires_at,
        subject,
        issuer,
      },
      null,
      2,
    ),
  )
}

main().catch(console.error)
