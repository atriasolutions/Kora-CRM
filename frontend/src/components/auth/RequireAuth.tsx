import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/use-auth'
import { getLoginPath } from '@/lib/auth-routes'

export function RequireAuth() {
  const { isAuthenticated, isReady } = useAuth()
  const location = useLocation()

  if (!isReady) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={getLoginPath()} state={{ from: location }} replace />
  }

  return <Outlet />
}
