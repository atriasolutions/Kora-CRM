import { pool } from '../db/pool.js'
import {
  buildChileGeoCatalog,
} from '../data/chile-geo-catalog.js'
import type { GeoCatalog, GeoCommune, GeoRegion } from '../types/geo.js'

type RegionRow = { id: string; name: string; sort_order: number }
type CommuneRow = { id: string; region_id: string; name: string; sort_order: number }

async function upsertRegion(
  client: { query: typeof pool.query },
  name: string,
  sortOrder: number,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO crm_geo_regions (name, sort_order)
     VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order
     RETURNING id`,
    [name, sortOrder],
  )
  return result.rows[0]!.id
}

async function upsertCommune(
  client: { query: typeof pool.query },
  regionId: string,
  communeName: string,
  sortOrder: number,
): Promise<void> {
  await client.query(
    `INSERT INTO crm_geo_communes (region_id, name, sort_order)
     VALUES ($1, $2, $3)
     ON CONFLICT (region_id, name) DO UPDATE SET sort_order = EXCLUDED.sort_order`,
    [regionId, communeName, sortOrder],
  )
}

async function removeOrphanCommunes(
  client: { query: typeof pool.query },
  regionId: string,
  validNames: string[],
): Promise<void> {
  if (validNames.length === 0) {
    await client.query('DELETE FROM crm_geo_communes WHERE region_id = $1', [regionId])
    return
  }
  const placeholders = validNames.map((_, i) => `$${i + 2}`).join(', ')
  await client.query(
    `DELETE FROM crm_geo_communes
     WHERE region_id = $1 AND name NOT IN (${placeholders})`,
    [regionId, ...validNames],
  )
}

export async function syncGeoCatalogFromSeed(): Promise<void> {
  const catalog = buildChileGeoCatalog()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (let regionOrder = 0; regionOrder < catalog.length; regionOrder++) {
      const region = catalog[regionOrder]!
      const regionId = await upsertRegion(client, region.name, regionOrder)
      for (let communeOrder = 0; communeOrder < region.communes.length; communeOrder++) {
        await upsertCommune(
          client,
          regionId,
          region.communes[communeOrder]!,
          communeOrder,
        )
      }
      await removeOrphanCommunes(client, regionId, region.communes)
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

let catalogSynced = false

export async function ensureGeoCatalogSeeded(): Promise<void> {
  if (catalogSynced) return
  await syncGeoCatalogFromSeed()
  catalogSynced = true
}

export async function getGeoCatalog(): Promise<GeoCatalog> {
  await ensureGeoCatalogSeeded()

  const regionsResult = await pool.query<RegionRow>(
    `SELECT id, name, sort_order FROM crm_geo_regions ORDER BY sort_order ASC, name ASC`,
  )
  const communesResult = await pool.query<CommuneRow>(
    `SELECT id, region_id, name, sort_order FROM crm_geo_communes ORDER BY name ASC`,
  )

  const communesByRegion = new Map<string, GeoCommune[]>()
  for (const row of communesResult.rows) {
    const list = communesByRegion.get(row.region_id) ?? []
    list.push({ id: row.id, name: row.name })
    communesByRegion.set(row.region_id, list)
  }

  const regions: GeoRegion[] = regionsResult.rows.map((row) => {
    const communes = (communesByRegion.get(row.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, 'es-CL', { sensitivity: 'base' }),
    )
    return {
      id: row.id,
      name: row.name,
      communes,
    }
  })

  return { regions }
}
