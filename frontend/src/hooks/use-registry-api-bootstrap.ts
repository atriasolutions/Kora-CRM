import { useEffect, useMemo, useRef } from 'react'

import { isApiEnabled } from '@/api/config'
import { useAuth } from '@/hooks/use-auth'
import { canModule, getProfilePermissionMap } from '@/lib/access-control'
import type { MenuModuleId, PermissionAction } from '@/lib/menu-modules'

export type RegistryBootstrapOptions = {
  /** false desactiva la carga automática (p. ej. catálogo bajo demanda). */
  enabled?: boolean
  /** Solo carga si el perfil de sesión tiene permiso en este módulo. */
  moduleId?: MenuModuleId
  action?: PermissionAction
}

function sessionAllowsBootstrap(
  moduleId: MenuModuleId | undefined,
  action: PermissionAction,
  profile: ReturnType<typeof useAuth>['profile'],
  isAuthenticated: boolean,
  isReady: boolean,
): boolean {
  if (!isApiEnabled()) return true
  if (!isReady || !isAuthenticated) return false
  if (!moduleId) return true
  if (!profile) return false
  return canModule(getProfilePermissionMap(profile), moduleId, action)
}

/**
 * Carga inicial de un registry solo con sesión validada y permiso del módulo.
 * No hace la petición si el usuario no tiene acceso (evita 403 en consola al abrir el dashboard).
 */
export function useRegistryApiBootstrap(
  load: () => Promise<void>,
  options?: RegistryBootstrapOptions,
): void {
  const { isAuthenticated, isReady, profile } = useAuth()
  const useApi = isApiEnabled()
  const moduleId = options?.moduleId
  const action = options?.action ?? 'view'

  const allowed = useMemo(
    () => sessionAllowsBootstrap(moduleId, action, profile, isAuthenticated, isReady),
    [moduleId, action, profile, isAuthenticated, isReady],
  )

  const enabled = options?.enabled !== false && allowed

  const loadRef = useRef(load)
  loadRef.current = load

  const didRunRef = useRef(false)

  useEffect(() => {
    if (!useApi || !enabled) return
    if (didRunRef.current) return
    didRunRef.current = true

    let cancelled = false
    void loadRef.current().catch((err) => {
      if (cancelled) return
      console.error('[registry bootstrap]', err)
    })

    return () => {
      cancelled = true
    }
  }, [useApi, enabled])

  useEffect(() => {
    if (!allowed) {
      didRunRef.current = false
    }
  }, [allowed])
}

/** Indica si la sesión actual puede cargar datos de un módulo vía API. */
export function useSessionCanModule(
  moduleId: MenuModuleId,
  action: PermissionAction = 'view',
): boolean {
  const { profile, isAuthenticated, isReady } = useAuth()
  return useMemo(
    () => sessionAllowsBootstrap(moduleId, action, profile, isAuthenticated, isReady),
    [moduleId, action, profile, isAuthenticated, isReady],
  )
}
