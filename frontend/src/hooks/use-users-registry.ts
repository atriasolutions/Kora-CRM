import { useContext } from 'react'

import { UsersRegistryContext } from '@/contexts/users-registry-context'

export function useUsersRegistry() {
  const ctx = useContext(UsersRegistryContext)
  if (!ctx) {
    throw new Error('useUsersRegistry debe usarse dentro de UsersRegistryProvider')
  }
  return ctx
}
