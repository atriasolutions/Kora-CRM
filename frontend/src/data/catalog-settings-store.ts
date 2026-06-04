import type { CatalogSettings } from '@/types/catalog-settings'

let catalogSnapshot: CatalogSettings | null = null

export function syncCatalogSettings(catalog: CatalogSettings) {
  catalogSnapshot = catalog
}

export function getCatalogSettingsSnapshot(): CatalogSettings | null {
  return catalogSnapshot
}
