import { isApiEnabled } from '@/api/config'

/** En modo API la fila del listado ya viene completa desde PostgreSQL. */
export function resolveApiListRow<T extends { id: string }>(
  row: T,
  resolve?: (id: string, base?: T) => T,
): T {
  if (isApiEnabled()) return row
  if (!resolve) return row
  return resolve(row.id, row)
}
