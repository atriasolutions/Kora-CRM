import { createContext } from 'react'

import type { OrganizationSettings } from '@/types/organization-settings'

export type OrganizationSettingsContextValue = {
  settings: OrganizationSettings
  isLoading: boolean
  updateSettings: (patch: Partial<OrganizationSettings>) => void
  saveSettings: (patch: Partial<OrganizationSettings>) => Promise<void>
  resetSettings: () => void
}

export const OrganizationSettingsContext =
  createContext<OrganizationSettingsContextValue | null>(null)
