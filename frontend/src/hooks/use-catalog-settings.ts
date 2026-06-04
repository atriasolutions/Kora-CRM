import { useContext } from 'react'

import { CatalogSettingsContext } from '@/contexts/catalog-settings-context'

export function useCatalogSettings() {
  const ctx = useContext(CatalogSettingsContext)
  if (!ctx) {
    throw new Error('useCatalogSettings debe usarse dentro de CatalogSettingsProvider')
  }
  return ctx
}
