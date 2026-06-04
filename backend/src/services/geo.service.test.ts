import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { CHILE_GEO_CATALOG } from '../data/chile-geo-catalog.js'
import type { GeoCatalog } from '../types/geo.js'
import {
  getCommuneNamesForRegion,
  isValidRegionCommunePair,
  validateRegionCommuneInput,
} from './geo.service.js'

function catalogFromSeed(): GeoCatalog {
  return {
    regions: CHILE_GEO_CATALOG.map((r, i) => ({
      id: `region-${i}`,
      name: r.name,
      communes: r.communes.map((name, j) => ({ id: `commune-${i}-${j}`, name })),
    })),
  }
}

describe('geo.service', () => {
  const catalog = catalogFromSeed()

  it('expone 16 regiones en el catálogo estático', () => {
    assert.equal(catalog.regions.length, 16)
  })

  it('devuelve comunas de Metropolitana', () => {
    const communes = getCommuneNamesForRegion(catalog, 'Metropolitana de Santiago')
    assert.ok(communes.includes('Santiago'))
    assert.ok(communes.includes('Providencia'))
    assert.ok(communes.includes('Isla de Maipo'))
    assert.equal(communes.length, 52)
  })

  it('ordena comunas alfabéticamente', () => {
    const communes = getCommuneNamesForRegion(catalog, 'Metropolitana de Santiago')
    const sorted = [...communes].sort((a, b) =>
      a.localeCompare(b, 'es-CL', { sensitivity: 'base' }),
    )
    assert.deepEqual(communes, sorted)
    assert.equal(communes[0], 'Alhué')
  })

  it('incluye las 346 comunas del país', () => {
    const total = CHILE_GEO_CATALOG.reduce((n, r) => n + r.communes.length, 0)
    assert.equal(total, 346)
  })

  it('valida par región/comuna correcto', () => {
    assert.equal(
      isValidRegionCommunePair(catalog, 'Valparaíso', 'Viña del Mar'),
      true,
    )
  })

  it('rechaza comuna que no pertenece a la región', () => {
    assert.equal(
      isValidRegionCommunePair(catalog, 'Valparaíso', 'Santiago'),
      false,
    )
  })

  it('permite región y comuna vacías', () => {
    assert.equal(validateRegionCommuneInput(catalog, '', ''), null)
  })

  it('exige comuna si hay región', () => {
    assert.match(
      validateRegionCommuneInput(catalog, 'Maule', '') ?? '',
      /comuna/i,
    )
  })

  it('exige región si hay comuna', () => {
    assert.match(
      validateRegionCommuneInput(catalog, '', 'Talca') ?? '',
      /región/i,
    )
  })
})
