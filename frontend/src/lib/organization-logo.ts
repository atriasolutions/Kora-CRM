import type { OrganizationSettings } from '@/types/organization-settings'

/** Logo Kora por defecto (cuando la empresa no tiene logo en configuración). */
export const KORA_DEFAULT_LOGO_URL = '/logo_kora_limpio.png'

export function resolveOrganizationLogoUrl(logoUrl?: string | null): string {
  const trimmed = logoUrl?.trim()
  return trimmed || KORA_DEFAULT_LOGO_URL
}

export function organizationSettingsWithLogo(
  settings: OrganizationSettings,
): OrganizationSettings {
  return {
    ...settings,
    logoUrl: resolveOrganizationLogoUrl(settings.logoUrl),
  }
}
