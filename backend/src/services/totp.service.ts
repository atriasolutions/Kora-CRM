import { createHash, randomBytes } from 'node:crypto'

import { generateSecret, generateURI, verify } from 'otplib'
import QRCode from 'qrcode'

import { env } from '../config/env.js'
import { decryptTotpSecret, encryptTotpSecret } from './totp-crypto.service.js'

export function generateTotpSecret(): string {
  return generateSecret()
}

export function buildOtpAuthUri(email: string, secret: string): string {
  return generateURI({
    issuer: env.totpIssuer,
    label: email.trim(),
    secret,
  })
}

export async function qrDataUrlForOtpAuth(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 })
}

export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  const normalized = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(normalized)) return false
  const result = await verify({ secret, token: normalized })
  return result.valid
}

export function encryptSecretForStorage(secret: string): string {
  return encryptTotpSecret(secret)
}

export function decryptSecretFromStorage(encrypted: string): string {
  return decryptTotpSecret(encrypted)
}

export function hashBackupCode(plain: string): string {
  const norm = plain.replace(/\s/g, '').toUpperCase()
  return createHash('sha256').update(norm).digest('hex')
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const part = randomBytes(4).toString('hex').toUpperCase()
    codes.push(`${part.slice(0, 4)}-${part.slice(4, 8)}`)
  }
  return codes
}

export function verifyBackupCodeHash(plain: string, hash: string): boolean {
  return hashBackupCode(plain) === hash
}
