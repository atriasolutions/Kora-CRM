import { useMemo } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { buildGrantCeiling } from '@/lib/profile-permission-grants'

export function useProfilePermissionGrants() {
  const { session, profile } = useAuth()
  const isPlatformOperator = Boolean(session?.isPlatformOperator)

  const ceiling = useMemo(
    () => buildGrantCeiling(profile, isPlatformOperator),
    [profile, isPlatformOperator],
  )

  return {
    isPlatformOperator,
    isUnrestricted: ceiling === null,
    ceiling,
  }
}
