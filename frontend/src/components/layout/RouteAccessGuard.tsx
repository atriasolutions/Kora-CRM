import { Outlet, useLocation } from 'react-router-dom'

import { AccessDeniedPage } from '@/pages/AccessDeniedPage'
import { useMenuAccess } from '@/hooks/use-menu-access'

export function RouteAccessGuard() {
  const { pathname } = useLocation()
  const { canAccessPath } = useMenuAccess()

  if (!canAccessPath(pathname)) {
    return <AccessDeniedPage />
  }

  return <Outlet />
}
