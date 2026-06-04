import { getChileGeoCatalogApi } from '@/api/geo'
import { CHILE_REGIONS, getCommunesForRegion as fallbackCommunes } from '@/lib/chile-locations'
import type { GeoCatalog } from '@/types/geo'

let cachedCatalog: GeoCatalog | null = null
let loadPromise: Promise<GeoCatalog> | null = null

function fallbackCatalog(): GeoCatalog {
  return {
    regions: CHILE_REGIONS.map((name, i) => ({
      id: `fallback-${i}`,
      name,
      communes: fallbackCommunes(name).map((c, j) => ({
        id: `fallback-${i}-${j}`,
        name: c,
      })),
    })),
  }
}

export function getGeoCatalogSync(): GeoCatalog | null {
  return cachedCatalog
}

export async function loadGeoCatalog(): Promise<GeoCatalog> {
  if (cachedCatalog) return cachedCatalog
  if (!loadPromise) {
    loadPromise = getChileGeoCatalogApi()
      .then((catalog) => {
        cachedCatalog = catalog
        return catalog
      })
      .catch((err) => {
        console.warn('Catálogo geo desde API no disponible; usando fallback local.', err)
        cachedCatalog = fallbackCatalog()
        return cachedCatalog
      })
      .finally(() => {
        loadPromise = null
      })
  }
  return loadPromise
}

export function getRegionNames(catalog: GeoCatalog): string[] {
  return catalog.regions.map((r) => r.name)
}

export function getCommuneNames(catalog: GeoCatalog, regionName: string): string[] {
  const region = catalog.regions.find((r) => r.name === regionName)
  if (!region) return []
  return [...region.communes.map((c) => c.name)].sort((a, b) =>
    a.localeCompare(b, 'es-CL', { sensitivity: 'base' }),
  )
}
