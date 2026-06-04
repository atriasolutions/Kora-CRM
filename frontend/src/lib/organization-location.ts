import type { OrganizationSettings } from '@/types/organization-settings'

/** Línea de ubicación para PDFs y vistas (comuna, región o ciudad). */
export function formatOrganizationLocation(org: OrganizationSettings): string {
  const commune = org.commune?.trim()
  const region = org.region?.trim()
  const city = org.city?.trim()
  if (commune && region) return `${commune}, ${region}`
  if (commune) return commune
  if (region) return region
  return city
}
