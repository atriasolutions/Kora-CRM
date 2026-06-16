import { createHash, randomBytes } from 'node:crypto'

const KEY_PREFIX = 'kora_live_'

export function generateIntegrationApiKey(): string {
  return `${KEY_PREFIX}${randomBytes(24).toString('base64url')}`
}

export function integrationApiKeyPrefix(rawKey: string): string {
  const trimmed = rawKey.trim()
  return trimmed.length <= 12 ? trimmed : trimmed.slice(0, 12)
}

export function hashIntegrationApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey.trim()).digest('hex')
}

export function isIntegrationApiKeyFormat(rawKey: string): boolean {
  return rawKey.trim().startsWith(KEY_PREFIX) && rawKey.trim().length >= 20
}
