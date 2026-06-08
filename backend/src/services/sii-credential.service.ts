import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

import { authenticateSii, extractCertMetadata } from '../lib/sii-soap-auth.js'
import { loadCertFromBase64 } from '../lib/emisso-sii.js'

import { tenantQuery } from '../db/tenant-query.js'
import { decryptSiiSecret, encryptSiiSecret } from '../lib/sii-crypto.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'

export type SiiEnv = 'certification' | 'production'

export type SiiCredentialPublic = {
  id: string
  env: SiiEnv
  label: string | null
  certRut: string | null
  certExpiresAt: string | null
  hasPortalCredentials: boolean
  createdAt: string
  updatedAt: string
}

export type SiiCredentialUploadResult = {
  credential: SiiCredentialPublic
  tokenTest: {
    ok: boolean
    error?: string
    certRut?: string | null
    certExpiresAt?: string | null
  }
}

type CredentialRow = {
  id: string
  tenant_id: string
  env: SiiEnv
  label: string | null
  cert_base64: string
  cert_password_encrypted: string
  cert_rut: string | null
  cert_expires_at: Date | string | null
  portal_rut: string | null
  portal_password_encrypted: string | null
  created_at: Date
  updated_at: Date
}

function mapCredential(row: CredentialRow): SiiCredentialPublic {
  return {
    id: row.id,
    env: row.env,
    label: row.label,
    certRut: row.cert_rut,
    certExpiresAt: row.cert_expires_at
      ? new Date(row.cert_expires_at).toISOString()
      : null,
    hasPortalCredentials: Boolean(row.portal_rut && row.portal_password_encrypted),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function listSiiCredentials(): Promise<SiiCredentialPublic[]> {
  const result = await tenantQuery<CredentialRow>(
    `SELECT id, tenant_id, env, label, cert_base64, cert_password_encrypted,
            cert_rut, cert_expires_at, portal_rut, portal_password_encrypted,
            created_at, updated_at
     FROM sii.credentials
     WHERE tenant_id = $1
     ORDER BY env ASC, created_at DESC`,
    [getTenantIdOrDefault()],
  )
  return result.rows.map(mapCredential)
}

function parseSiiEstado(message: string): string | null {
  return message.match(/\(estado (\d+)\)/)?.[1] ?? null
}

function isSoftSiiTokenFailure(message: string): boolean {
  const estado = parseSiiEstado(message)
  // 10: SII no pudo crear token (RUT no registrado, permisos, cert no habilitado en portal)
  return estado === '10'
}

export async function upsertSiiCredential(params: {
  env: SiiEnv
  label?: string
  certBase64: string
  certPassword: string
  portalRut?: string
  portalPassword?: string
  consent: boolean
  actor: AuditActor
}): Promise<SiiCredentialUploadResult> {
  if (!params.consent) {
    throw badRequest('Debes aceptar la delegación de credenciales tributarias.')
  }
  if (!params.certBase64.trim()) throw badRequest('Certificado .p12 requerido.')
  if (!params.certPassword.trim()) throw badRequest('Contraseña del certificado requerida.')

  const tenantId = getTenantIdOrDefault()
  const certPath = join(tmpdir(), `kora-sii-${randomUUID()}.p12`)
  let certMeta: { certRut: string | null; certExpiresAt: Date | null } = {
    certRut: null,
    certExpiresAt: null,
  }
  let tokenTest: SiiCredentialUploadResult['tokenTest'] = { ok: true }

  try {
    writeFileSync(certPath, Buffer.from(params.certBase64, 'base64'))
    loadCertFromBase64(params.certBase64, params.certPassword)
    certMeta = extractCertMetadata(params.certBase64, params.certPassword)

    try {
      await authenticateSii({
        certPath,
        certPassword: params.certPassword,
        env: params.env,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al obtener token SII'
      if (isSoftSiiTokenFailure(msg)) {
        tokenTest = {
          ok: false,
          error: msg,
          certRut: certMeta.certRut,
          certExpiresAt: certMeta.certExpiresAt?.toISOString() ?? null,
        }
      } else {
        throw badRequest(`No se pudo validar el certificado: ${msg}`)
      }
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) throw err
    const msg = err instanceof Error ? err.message : 'Certificado inválido'
    throw badRequest(`No se pudo validar el certificado: ${msg}`)
  } finally {
    try {
      unlinkSync(certPath)
    } catch {
      /* ignore */
    }
  }

  await tenantQuery(
    `INSERT INTO sii.settings (tenant_id, consent_at, consent_user_id, updated_at)
     VALUES ($1, now(), $2, now())
     ON CONFLICT (tenant_id) DO UPDATE SET
       consent_at = now(),
       consent_user_id = EXCLUDED.consent_user_id,
       updated_at = now()`,
    [tenantId, params.actor.userId],
  )

  const encryptedPassword = encryptSiiSecret(params.certPassword)
  const encryptedPortal =
    params.portalPassword?.trim()
      ? encryptSiiSecret(params.portalPassword.trim())
      : null

  const result = await tenantQuery<CredentialRow>(
    `INSERT INTO sii.credentials (
       tenant_id, env, label, cert_base64, cert_password_encrypted,
       cert_rut, cert_expires_at, portal_rut, portal_password_encrypted, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     ON CONFLICT (tenant_id, env) DO UPDATE SET
       label = EXCLUDED.label,
       cert_base64 = EXCLUDED.cert_base64,
       cert_password_encrypted = EXCLUDED.cert_password_encrypted,
       cert_rut = EXCLUDED.cert_rut,
       cert_expires_at = EXCLUDED.cert_expires_at,
       portal_rut = EXCLUDED.portal_rut,
       portal_password_encrypted = EXCLUDED.portal_password_encrypted,
       updated_at = now()
     RETURNING id, tenant_id, env, label, cert_base64, cert_password_encrypted,
               cert_rut, cert_expires_at, portal_rut, portal_password_encrypted,
               created_at, updated_at`,
    [
      tenantId,
      params.env,
      params.label?.trim() || null,
      params.certBase64,
      encryptedPassword,
      certMeta.certRut,
      certMeta.certExpiresAt,
      params.portalRut?.trim() || null,
      encryptedPortal,
    ],
  )
  return {
    credential: mapCredential(result.rows[0]!),
    tokenTest,
  }
}

export async function deleteSiiCredential(id: string): Promise<void> {
  const result = await tenantQuery(
    `DELETE FROM sii.credentials WHERE id = $1 AND tenant_id = $2`,
    [id, getTenantIdOrDefault()],
  )
  if (!result.rowCount) throw notFound('Credencial SII no encontrada')
}

export async function getSiiCredentialForEnv(
  env: SiiEnv,
): Promise<{ certPath: string; certPassword: string; portalRut?: string; portalPassword?: string } | null> {
  const row = await tenantQuery<CredentialRow>(
    `SELECT id, tenant_id, env, label, cert_base64, cert_password_encrypted,
            cert_rut, cert_expires_at, portal_rut, portal_password_encrypted,
            created_at, updated_at
     FROM sii.credentials
     WHERE tenant_id = $1 AND env = $2
     LIMIT 1`,
    [getTenantIdOrDefault(), env],
  )
  const cred = row.rows[0]
  if (!cred) return null

  const certPath = join(tmpdir(), `kora-sii-${cred.id}.p12`)
  writeFileSync(certPath, Buffer.from(cred.cert_base64, 'base64'))
  const certPassword = decryptSiiSecret(cred.cert_password_encrypted)
  const portalPassword = cred.portal_password_encrypted
    ? decryptSiiSecret(cred.portal_password_encrypted)
    : undefined

  return {
    certPath,
    certPassword,
    portalRut: cred.portal_rut ?? undefined,
    portalPassword,
  }
}

export function cleanupTempCert(certPath: string): void {
  try {
    unlinkSync(certPath)
  } catch {
    /* ignore */
  }
}
