import { getRegiones } from 'chilean-territorial-divisions'

/** Catálogo Chile (regiones → comunas). Fuente: chilean-territorial-divisions (346 comunas). */
export type ChileGeoRegionSeed = {
  name: string
  communes: string[]
}

/** Orden fijo de regiones (norte → sur). */
export const CHILE_REGION_ORDER = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana de Santiago',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes',
] as const

const PACKAGE_TO_APP_REGION: Record<string, (typeof CHILE_REGION_ORDER)[number]> = {
  'Arica y Parinacota': 'Arica y Parinacota',
  Tarapacá: 'Tarapacá',
  Antofagasta: 'Antofagasta',
  Atacama: 'Atacama',
  Coquimbo: 'Coquimbo',
  Valparaíso: 'Valparaíso',
  'Región Metropolitana de Santiago': 'Metropolitana de Santiago',
  "Región del Libertador Gral. Bernardo O'Higgins": "O'Higgins",
  'Región del Maule': 'Maule',
  'Región de Ñuble': 'Ñuble',
  'Región del Biobío': 'Biobío',
  'Región de la Araucanía': 'La Araucanía',
  'Región de los Ríos': 'Los Ríos',
  'Región de los Lagos': 'Los Lagos',
  'Región Aisén del Gral. Carlos Ibañez del Campo': 'Aysén',
  'Región de Magallanes y de la Antártica Chilena': 'Magallanes',
}

/** Correcciones ortográficas puntuales respecto al paquete fuente. */
const COMMUNE_NAME_CORRECTIONS: Record<string, string> = {
  Coihaique: 'Coyhaique',
  Aisén: 'Aysén',
}

export function sortCommunesEs(names: readonly string[]): string[] {
  return [...names].sort((a, b) => a.localeCompare(b, 'es-CL', { sensitivity: 'base' }))
}

function normalizeCommuneName(name: string): string {
  return COMMUNE_NAME_CORRECTIONS[name] ?? name
}

export function buildChileGeoCatalog(): ChileGeoRegionSeed[] {
  const byAppName = new Map<string, Set<string>>()

  for (const region of getRegiones()) {
    const appName = PACKAGE_TO_APP_REGION[region.region]
    if (!appName) continue
    const set = byAppName.get(appName) ?? new Set<string>()
    for (const provincia of region.provincias) {
      for (const comuna of provincia.comunas) {
        set.add(normalizeCommuneName(comuna.name))
      }
    }
    byAppName.set(appName, set)
  }

  return CHILE_REGION_ORDER.map((name) => ({
    name,
    communes: sortCommunesEs([...(byAppName.get(name) ?? [])]),
  }))
}

/** Catálogo estático en memoria (comunas ordenadas alfabéticamente). */
export const CHILE_GEO_CATALOG: ChileGeoRegionSeed[] = buildChileGeoCatalog()
