import { Building2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  identifyTenantsApi,
  logoutApi,
  switchTenantApi,
  type TenantMembershipOption,
} from '@/api/auth'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { saveAuthSession, clearAuthSession } from '@/lib/auth-session'
import { parseLoginErrorMessage } from '@/lib/login-errors'
import { toast } from '@/lib/toast'
import { redirectToTenantApp, redirectToTenantLogin } from '@/lib/tenant-session'

export function TenantSwitcher() {
  const { session } = useAuth()
  const [memberships, setMemberships] = useState<TenantMembershipOption[]>([])
  const [loading, setLoading] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const isPlatformOperator = Boolean(session?.isPlatformOperator)

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
      if (isPlatformOperator && session?.token) {
        const result = await switchTenantApi(membership.tenantId)
        saveAuthSession({
          userId: result.user.id,
          email: result.user.email,
          name: result.user.name,
          token: result.token,
          profileId: result.user.profileId,
          tenantId: result.tenantId,
          tenantSlug: membership.slug,
          isPlatformOperator: true,
        })
        redirectToTenantApp(membership.slug, window.location.pathname)
        return
      }

      if (session?.token) {
        try {
          await logoutApi()
        } catch {
          /* cerrar sesión local aunque falle el servidor */
        }
      }
      clearAuthSession()
      redirectToTenantLogin(membership.slug)
    } catch (err) {
      toast.error(parseLoginErrorMessage(err))
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
        {isPlatformOperator ? ' · Soporte plataforma' : ''}
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
