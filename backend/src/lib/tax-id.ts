/** Normalización de RUT/DNI para búsqueda de duplicados (alineado con el frontend). */

export function normalizeRutKey(rut: string): string {
  return rut.replace(/[^\dkK]/gi, '').toUpperCase()
}

export function normalizeDniKey(dni: string): string {
  return dni.trim().replace(/\s+/g, ' ').toUpperCase()
}

export type StoredTaxIdKind = 'rut' | 'dni'

export function inferStoredTaxIdKind(value: string): StoredTaxIdKind {
  const trimmed = value.trim()
  if (!trimmed) return 'rut'

  const clean = normalizeRutKey(trimmed)
  if (clean.length >= 8 && /^\d+[0-9K]$/.test(clean)) {
    return 'rut'
  }
  if (/[A-Za-z]/.test(trimmed.replace(/[.\-\s]/g, ''))) {
    return 'dni'
  }
  return 'rut'
}

export function normalizeStoredTaxIdKey(value: string, kind: StoredTaxIdKind): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return kind === 'rut' ? normalizeRutKey(trimmed) : normalizeDniKey(trimmed)
}

/** Expresión SQL: clave RUT normalizada desde la columna `rut`. */
export const SQL_NORMALIZED_RUT = `upper(regexp_replace(rut, '[^0-9K]', '', 'gi'))`

/** Expresión SQL: clave DNI normalizada desde la columna `rut`. */
export const SQL_NORMALIZED_DNI = `upper(trim(regexp_replace(rut, '\\s+', ' ', 'g')))`
