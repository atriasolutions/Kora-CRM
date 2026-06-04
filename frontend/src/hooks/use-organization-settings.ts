import { useContext } from 'react'

import { OrganizationSettingsContext } from '@/contexts/organization-settings-context'

export function useOrganizationSettings() {
  const ctx = useContext(OrganizationSettingsContext)
  if (!ctx) {
    throw new Error(
      'useOrganizationSettings debe usarse dentro de OrganizationSettingsProvider',
    )
  }
  return ctx
}
