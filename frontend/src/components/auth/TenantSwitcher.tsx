import { Building2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { identifyTenantsApi, logoutApi, type TenantMembershipOption } from '@/api/auth'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { clearAuthSession } from '@/lib/auth-session'
import { redirectToTenantLogin } from '@/lib/tenant-session'

export function TenantSwitcher() {
  const { session } = useAuth()
  const [memberships, setMemberships] = useState<TenantMembershipOption[]>([])
  const [loading, setLoading] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.email) return
    let cancelled = false
    setLoading(true)
    void identifyTenantsApi(session.email)
      .then((list) => {
        if (!cancelled) setMemberships(list)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [session?.email])

  if (loading || memberships.length <= 1) return null

  const currentTenantId = session?.tenantId

  async function handleSwitch(membership: TenantMembershipOption) {
    if (membership.tenantId === currentTenantId) return
    setSwitchingId(membership.tenantId)
    try {
      if (session?.token) {
        try {
          await logoutApi()
        } catch {
          /* cerrar sesión local aunque falle el servidor */
        }
      }
      clearAuthSession()
      redirectToTenantLogin(membership.slug)
    } finally {
      setSwitchingId(null)
    }
  }

  const currentName =
    memberships.find((m) => m.tenantId === currentTenantId)?.displayName ?? 'Empresa'

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
        Empresa: {currentName}
      </DropdownMenuLabel>
      {memberships.map((m) => (
        <DropdownMenuItem
          key={m.tenantId}
          disabled={m.tenantId === currentTenantId || switchingId !== null}
          onSelect={(e) => {
            e.preventDefault()
            void handleSwitch(m)
          }}
        >
          {switchingId === m.tenantId ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Building2 aria-hidden className="size-4" />
          )}
          {m.displayName}
        </DropdownMenuItem>
      ))}
    </>
  )
}
