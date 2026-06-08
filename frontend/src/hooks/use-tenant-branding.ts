import { useEffect, useState } from 'react'

import { fetchTenantByHostApi } from '@/api/auth'
import { resolveOrganizationLogoUrl } from '@/lib/organization-logo'
import {
  isCentralAppHost,
  resolveTenantSlugFromHostname,
  type TenantBranding,
} from '@/lib/tenant-host'

export function useTenantBranding() {
  const [tenant, setTenant] = useState<TenantBranding | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void fetchTenantByHostApi(window.location.host)
      .then((data) => {
        if (!cancelled) setTenant(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const slug = resolveTenantSlugFromHostname(window.location.hostname)
  const isCentral = isCentralAppHost()

  return {
    tenant,
    loading,
    slug,
    isCentral,
    logoUrl: tenant?.logoUrl ? resolveOrganizationLogoUrl(tenant.logoUrl) : '',
    displayName: tenant?.displayName ?? (slug ? slug : 'Kora CRM'),
  }
}
