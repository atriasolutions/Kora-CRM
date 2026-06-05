import { useEffect } from 'react'

import { isApiEnabled } from '@/api/config'
import { useUsersRegistry } from '@/hooks/use-users-registry'

/**
 * Carga usuarios asignables (/users/assignees) cuando el registro global no hizo bootstrap.
 */
export function useAssigneeDirectory(enabled = true) {
  const { allUsers, reloadFromApi, usersDirectoryLoaded } = useUsersRegistry()

  useEffect(() => {
    if (!enabled) return
    if (!isApiEnabled() || allUsers.length > 0) return
    void reloadFromApi().catch(() => {})
  }, [enabled, allUsers.length, reloadFromApi])

  const ensureLoaded = () => {
    if (!isApiEnabled()) return
    void reloadFromApi().catch(() => {})
  }

  return { allUsers, usersDirectoryLoaded, ensureLoaded }
}
