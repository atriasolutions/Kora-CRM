import type { Request } from 'express'

export function readAuthToken(req: Request): string | undefined {
  const bearer = req.header('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (bearer) return bearer
  return req.header('x-auth-token')?.trim() || undefined
}
