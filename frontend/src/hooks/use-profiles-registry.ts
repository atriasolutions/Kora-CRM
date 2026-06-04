import { useContext } from 'react'

import { ProfilesRegistryContext } from '@/contexts/profiles-registry-context'

export function useProfilesRegistry() {
  const ctx = useContext(ProfilesRegistryContext)
  if (!ctx) {
    throw new Error('useProfilesRegistry debe usarse dentro de ProfilesRegistryProvider')
  }
  return ctx
}
