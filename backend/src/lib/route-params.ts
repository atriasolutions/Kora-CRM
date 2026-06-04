import type { Request } from 'express'

/** Normaliza parámetros de ruta (Express 5 puede tiparlos como string | string[]). */
export function routeParam(
  req: Request,
  name = 'id',
): string {
  const raw = req.params[name]
  if (Array.isArray(raw)) return raw[0] ?? ''
  return raw ?? ''
}
