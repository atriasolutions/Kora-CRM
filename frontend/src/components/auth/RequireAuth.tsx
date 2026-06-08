import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/use-auth'
import { getLoginPath, resolveLoginRedirectUrl } from '@/lib/auth-routes'
import { clearAuthSession } from '@/lib/auth-session'
import { isCentralAppHost } from '@/lib/tenant-host'
import {
  isSessionOnWrongTenantHost,
  redirectToTenantApp,
  shouldRedirectAuthenticatedToTenantSubdomain,
} from '@/lib/tenant-session'

export function RequireAuth() {
  const { isAuthenticated, isReady, session } = useAuth()
  const location = useLocation()
  const redirectToCentralLogin = isReady && !isAuthenticated && !isCentralAppHost()
  const wrongTenantHost = isReady && isAuthenticated && isSessionOnWrongTenantHost(session)
  const redirectToTenantSubdomain =
    isReady &&
    isAuthenticated &&
    shouldRedirectAuthenticatedToTenantSubdomain(session)

  useEffect(() => {
    if (redirectToCentralLogin) {
      window.location.replace(resolveLoginRedirectUrl())
    }
  }, [redirectToCentralLogin])

  useEffect(() => {
    if (wrongTenantHost) {
      clearAuthSession()
      window.location.replace(getLoginPath())
    }
  }, [wrongTenantHost])

  useEffect(() => {
    if (!redirectToTenantSubdomain || !session?.tenantSlug) return
    const path = `${location.pathname}${location.search}` || '/inicio'
    redirectToTenantApp(session.tenantSlug, path)
  }, [redirectToTenantSubdomain, session?.tenantSlug, location.pathname, location.search])

  if (!isReady) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    )
  }

  if (redirectToCentralLogin || wrongTenantHost || redirectToTenantSubdomain) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Redirigiendo…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={getLoginPath()} state={{ from: location }} replace />
  }

  return <Outlet />
}
