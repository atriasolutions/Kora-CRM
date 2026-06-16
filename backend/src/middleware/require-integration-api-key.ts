import type { NextFunction, Request, Response, RequestHandler } from 'express'

import { isIntegrationApiKeyFormat } from '../lib/integration-api-key.js'
import { resolveIntegrationApiKey } from '../repositories/integration-api-keys.repository.js'
import type { ResolvedIntegrationApiKey } from '../repositories/integration-api-keys.repository.js'
import { unauthorized } from './errors.js'

export type RequestWithIntegrationAuth = Request & {
  integrationApiKey?: ResolvedIntegrationApiKey
}

export function readIntegrationApiKeyHeader(req: Request): string | null {
  const auth = req.header('authorization')?.trim()
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  const headerKey = req.header('x-api-key')?.trim()
  if (headerKey) return headerKey
  return null
}

export function readIntegrationApiKey(
  req: Request,
  options?: { allowQuery?: boolean },
): string | null {
  const fromHeader = readIntegrationApiKeyHeader(req)
  if (fromHeader) return fromHeader

  if (options?.allowQuery) {
    const raw = req.query.api_key
    const queryKey = Array.isArray(raw) ? raw[0] : raw
    if (typeof queryKey === 'string' && queryKey.trim()) return queryKey.trim()
  }

  return null
}

async function resolveIntegrationAuth(
  req: Request,
  options?: { allowQuery?: boolean },
): Promise<void> {
  const rawKey = readIntegrationApiKey(req, options)
  if (!rawKey) {
    throw unauthorized(
      options?.allowQuery
        ? 'API key requerida. Usa Authorization: Bearer <key>, X-API-Key o ?api_key=<key>.'
        : 'API key requerida. Usa Authorization: Bearer <key> o X-API-Key.',
    )
  }
  if (!isIntegrationApiKeyFormat(rawKey)) {
    throw unauthorized('Formato de API key inválido.')
  }
  const resolved = await resolveIntegrationApiKey(rawKey)
  if (!resolved) {
    throw unauthorized('API key inválida o inactiva.')
  }
  ;(req as RequestWithIntegrationAuth).integrationApiKey = resolved
}

export function getIntegrationApiKeyFromRequest(
  req: Request,
): ResolvedIntegrationApiKey {
  const apiKey = (req as RequestWithIntegrationAuth).integrationApiKey
  if (!apiKey?.tenantId) {
    throw unauthorized(
      'API key requerida o no resuelta. Usa Authorization: Bearer <key> o X-API-Key.',
    )
  }
  return apiKey
}

/** Middleware Express compatible (factory). Usar: requireIntegrationApiKey() */
export function requireIntegrationApiKey(options?: {
  allowQuery?: boolean
}): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    resolveIntegrationAuth(req, options)
      .then(() => next())
      .catch(next)
  }
}
