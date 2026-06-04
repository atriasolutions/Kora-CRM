import type { OrganizationSettings } from '@/types/organization-settings'

let organizationSnapshot: OrganizationSettings | null = null

export function syncOrganizationSettings(settings: OrganizationSettings) {
  organizationSnapshot = settings
}

export function getOrganizationSettingsSnapshot(): OrganizationSettings | null {
  return organizationSnapshot
}
