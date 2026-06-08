import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

import { env } from '../config/env.js'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

function deriveKey(): Buffer {
  return scryptSync(env.siiCredentialsEncryptionKey, 'kora-sii-salt', 32)
}

export function encryptSiiSecret(plaintext: string): string {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, deriveKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptSiiSecret(payload: string): string {
  const buf = Buffer.from(payload, 'base64')
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const data = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv(ALGO, deriveKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
