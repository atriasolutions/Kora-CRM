import { z } from 'zod'

/** Campos comunes de orden y rango de fecha para listados paginados. */
export const listSortAndDateQueryFields = {
  sortBy: z.string().trim().max(64).optional(),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
  dateFrom: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateFrom debe ser yyyy-mm-dd')
    .optional(),
  dateTo: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateTo debe ser yyyy-mm-dd')
    .optional(),
  /** Responsable = usuario actual (nombre). */
  mine: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
} as const

export type ListSortDir = 'asc' | 'desc'

/**
 * Whitelist de columnas SQL. `sortBy` del cliente debe coincidir con las keys.
 * Valores = expresión SQL segura (solo identificadores o expresiones fijas del repo).
 */
export function resolveOrderByClause(
  sortBy: string | undefined,
  sortDir: ListSortDir | undefined,
  columnMap: Record<string, string>,
  defaultClause = 'updated_at DESC',
): string {
  const col = sortBy?.trim() ? columnMap[sortBy.trim()] : undefined
  if (!col) return defaultClause
  const dir = sortDir === 'asc' ? 'ASC' : 'DESC'
  return `${col} ${dir} NULLS LAST`
}

/** Lista separada por comas → array (status, categoría, etc.). */
export function parseCommaSeparatedList(value?: string | null): string[] {
  if (!value?.trim()) return []
  return [
    ...new Set(
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ]
}

/**
 * Filtro multi-valor con lógica OR: `column IN (...)`.
 * Usa `column::text` para funcionar con enums PostgreSQL y varchar.
 */
export function pushInListCondition(
  conditions: string[],
  values: unknown[],
  idx: number,
  columnSql: string,
  raw?: string | null,
): number {
  const items = parseCommaSeparatedList(raw)
  if (items.length === 0) return idx
  if (items.length === 1) {
    conditions.push(`${columnSql}::text = $${idx++}`)
    values.push(items[0])
    return idx
  }
  conditions.push(`${columnSql}::text = ANY($${idx++}::text[])`)
  values.push(items)
  return idx
}

/** Añade condición de rango sobre una columna DATE / timestamp. */
export function pushDateRangeCondition(
  conditions: string[],
  values: unknown[],
  idx: number,
  columnSql: string,
  dateFrom?: string,
  dateTo?: string,
): number {
  let next = idx
  if (dateFrom?.trim()) {
    conditions.push(`${columnSql} >= $${next++}::date`)
    values.push(dateFrom.trim())
  }
  if (dateTo?.trim()) {
    conditions.push(`${columnSql} < ($${next++}::date + interval '1 day')`)
    values.push(dateTo.trim())
  }
  return next
}
