import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

import { env } from '../config/env.js'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12

function encryptionKey(): Buffer {
  return scryptSync(env.totpEncryptionKey, 'kora-totp-v1', 32)
}

export function encryptTotpSecret(plain: string): string {
  const key = encryptionKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decryptTotpSecret(payload: string): string {
  const buf = Buffer.from(payload, 'base64')
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + 16)
  const data = buf.subarray(IV_LEN + 16)
  const key = encryptionKey()
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
