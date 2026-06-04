import type { GeoCatalog, GeoRegion } from '../types/geo.js'

export function buildCommuneIndex(catalog: GeoCatalog): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>()
  for (const region of catalog.regions) {
    index.set(region.name, new Set(region.communes.map((c) => c.name)))
  }
  return index
}

export function getCommuneNamesForRegion(
  catalog: GeoCatalog,
  regionName: string,
): string[] {
  const region = catalog.regions.find((r) => r.name === regionName)
  if (!region) return []
  return [...region.communes.map((c) => c.name)].sort((a, b) =>
    a.localeCompare(b, 'es-CL', { sensitivity: 'base' }),
  )
}

export function isValidRegionCommunePair(
  catalog: GeoCatalog,
  regionName: string,
  communeName: string,
): boolean {
  const region = regionName.trim()
  const commune = communeName.trim()
  if (!region && !commune) return true
  if (!region || !commune) return false
  const communes = getCommuneNamesForRegion(catalog, region)
  return communes.includes(commune)
}

export function validateRegionCommuneInput(
  catalog: GeoCatalog,
  region?: string | null,
  commune?: string | null,
): string | null {
  const r = region?.trim() ?? ''
  const c = commune?.trim() ?? ''
  if (!r && !c) return null
  if (r && !c) return 'Selecciona una comuna para la región indicada.'
  if (!r && c) return 'Selecciona una región para la comuna indicada.'
  if (!isValidRegionCommunePair(catalog, r, c)) {
    return 'La comuna no corresponde a la región seleccionada.'
  }
  return null
}

export function regionNames(catalog: GeoCatalog): string[] {
  return catalog.regions.map((r) => r.name)
}

export function findRegion(catalog: GeoCatalog, regionName: string): GeoRegion | undefined {
  return catalog.regions.find((r) => r.name === regionName.trim())
}
