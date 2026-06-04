import { createHash, randomBytes } from 'node:crypto'

export function createVerificationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashVerificationToken(token)
  return { token, tokenHash }
}

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex')
}

export function normalizeSecurityAnswer(answer: string): string {
  return answer
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}
