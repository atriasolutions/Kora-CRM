/**
 * Filtro de rango de fecha reutilizable en listas (misma semántica que bitácora).
 * dateFrom/dateTo en yyyy-mm-dd para la API.
 */
export type {
  BitacoraDateFilter as ListDateFilter,
  BitacoraDateFilterOption as ListDateFilterOption,
} from '@/lib/bitacora-date-filter'

export {
  createDefaultBitacoraDateFilter as createDefaultListDateFilter,
  bitacoraDateFilterId as listDateFilterId,
  labelForBitacoraDateFilter as labelForListDateFilter,
  resolveBitacoraDateBounds as resolveListDateBounds,
  isBitacoraDateFilterActive as isListDateFilterActive,
  bitacoraDateToCompact as listDateToCompact,
  compactToBitacoraDate as compactToListDate,
  buildBitacoraDateFilterOptions as buildListDateFilterOptions,
  bitacoraRowMatchesDateFilter as listRowMatchesDateFilter,
} from '@/lib/bitacora-date-filter'

import { resolveBitacoraDateBounds } from '@/lib/bitacora-date-filter'
import type { BitacoraDateFilter } from '@/lib/bitacora-date-filter'

/** Params listos para query string de listados. */
export function listDateFilterToServerQuery(
  filter: BitacoraDateFilter,
): { dateFrom?: string; dateTo?: string } {
  const bounds = resolveBitacoraDateBounds(filter)
  const query: { dateFrom?: string; dateTo?: string } = {}
  if (bounds.from) query.dateFrom = bounds.from
  if (bounds.to) query.dateTo = bounds.to
  return query
}
