import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { getLoginPath } from '@/lib/auth-routes'
import { isCentralAppHost } from '@/lib/tenant-host'

/** Marketing público solo en koracrm.cl / www. Subdominios de tenant → login del CRM. */
export function CentralMarketingOnly({ children }: { children: ReactNode }) {
  if (!isCentralAppHost()) {
    return <Navigate to={getLoginPath()} replace />
  }
  return children
}
