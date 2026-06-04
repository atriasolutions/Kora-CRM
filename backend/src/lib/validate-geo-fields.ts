import { badRequest } from '../middleware/errors.js'
import * as geoRepo from '../repositories/geo.repository.js'
import { validateRegionCommuneInput } from '../services/geo.service.js'

/** Valida par región/comuna contra el catálogo en BD (si se envían valores). */
export async function assertValidRegionCommune(
  region?: string | null,
  commune?: string | null,
): Promise<void> {
  const r = region?.trim() ?? ''
  const c = commune?.trim() ?? ''
  if (!r && !c) return
  const catalog = await geoRepo.getGeoCatalog()
  const message = validateRegionCommuneInput(catalog, r, c)
  if (message) throw badRequest(message)
}
