import { env } from '../config/env.js'

/** Orígenes permitidos: apex, www y subdominios del tenant. */
export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true
  const allowed = env.corsOrigin.trim()
  if (allowed && origin === allowed) return true
  try {
    const url = new URL(origin)
    const host = url.hostname.toLowerCase()
    const platform = env.platformDomain
    if (host === platform || host === `www.${platform}`) return true
    if (host.endsWith(`.${platform}`)) return true
    if (host === 'localhost' || host === '127.0.0.1') return true
  } catch {
    return false
  }
  return false
}
