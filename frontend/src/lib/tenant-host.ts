import { apiBaseURL } from '@/api/client'

const PLATFORM_DOMAIN = import.meta.env.VITE_PLATFORM_DOMAIN ?? 'koracrm.cl'

export type TenantBranding = {
  id: string
  slug: string
  displayName: string
  logoUrl: string
}

export function getPlatformDomain(): string {
  return PLATFORM_DOMAIN.trim().toLowerCase()
}

export function resolveTenantSlugFromHostname(hostname: string): string | null {
  const host = hostname.split(':')[0]?.trim().toLowerCase() ?? ''
  const domain = getPlatformDomain()
  if (!host || host === domain || host === `www.${domain}`) return null
  if (!host.endsWith(`.${domain}`)) return null
  const sub = host.slice(0, -(domain.length + 1))
  if (!sub || sub.includes('.')) return null
  return sub
}

export function isCentralAppHost(hostname: string = window.location.hostname): boolean {
  return resolveTenantSlugFromHostname(hostname) === null
}

export function tenantAppOrigin(slug: string): string {
  if (typeof window === 'undefined') return `https://${slug}.${getPlatformDomain()}`
  const protocol = window.location.protocol
  return `${protocol}//${slug}.${getPlatformDomain()}`
}

export function centralLoginUrl(): string {
  const domain = getPlatformDomain()
  if (typeof window === 'undefined') return `https://${domain}/login`
  return `${window.location.protocol}//${domain}/login`
}

export function apiBaseForCurrentHost(): string {
  return apiBaseURL()
}
