import { useContext } from 'react'

import { AccessControlContext } from '@/contexts/access-control-context'

export function useMenuAccess() {
  const ctx = useContext(AccessControlContext)
  if (!ctx) {
    throw new Error('useMenuAccess debe usarse dentro de AccessControlProvider')
  }
  return ctx
}
