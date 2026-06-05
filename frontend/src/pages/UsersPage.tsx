import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { InviteUserDialog } from '@/components/users/InviteUserDialog'
import { ListPageLayout } from '@/components/list/ListPageLayout'
import { ModuleListPage } from '@/components/list/ModuleListPage'
import { UsersModuleHeader } from '@/components/users/UsersModuleHeader'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { usersListConfig } from '@/config/list-modules/users'
import type { UserListItem } from '@/data/users.mock'
import { usePrefetchUserAvatarsById } from '@/hooks/use-user-avatar-url'
import { useUsersRegistry } from '@/hooks/use-users-registry'
import { useEmbeddedListToolbarSlot } from '@/hooks/use-embedded-list-toolbar-slot'
import { fetchUsersServerPage } from '@/lib/module-server-list'
import type { UserFormValues } from '@/lib/user-form'
import { getUserDetailPath } from '@/lib/user-routes'
import {
  loadUserRecentIds,
  sortUsersByRecentlyViewed,
  userMatchesListScope,
  type UserListScope,
} from '@/lib/user-list-scope'

export function UsersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { allUsers, addUser, reloadFromApi } = useUsersRegistry()
  usePrefetchUserAvatarsById(allUsers.map((u) => u.id))
  const [listScope, setListScope] = useState<UserListScope>('all')
  const [query, setQuery] = useState('')
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const [inviteOpen, setInviteOpen] = useState(false)

  const recentIds = useMemo(
    () => loadUserRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const rowPredicate = useMemo(
    () => (row: UserListItem) => userMatchesListScope(row, listScope, recentIds),
    [listScope, recentIds],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: UserListItem[]) => sortUsersByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/usuarios') {
      setListRefreshKey((k) => k + 1)
    }
  }, [location.pathname, location.key])

  useEffect(() => {
    if (!isApiEnabled()) return
    if (listScope === 'recent') {
      void reloadFromApi().catch(() => {})
    }
  }, [listScope, reloadFromApi])

  const resolveListRow = useCallback((row: UserListItem) => row, [])

  const handleInvite = useCallback(
    async (values: UserFormValues) => {
      try {
        const item = await addUser(values)
        toast.success(`Usuario «${item.name}» invitado correctamente.`)
        navigate(getUserDetailPath(item.id))
      } catch (error) {
        toast.error(
          apiActionErrorMessage(error, 'No se pudo crear el usuario.'),
        )
        throw error
      }
    },
    [addUser, navigate],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ListPageLayout
        header={
          <UsersModuleHeader
            query={query}
            onQueryChange={setQuery}
            onInvite={() => setInviteOpen(true)}
            listScope={listScope}
            onListScopeChange={setListScope}
            toolbarEnd={toolbarSlot}
          />
        }
      >
        <ModuleListPage
          config={usersListConfig}
          embedded
          toolbarHost={toolbarHost}
          searchQuery={query}
          extraSeeds={listScope === 'recent' ? allUsers : []}
          serverList={
            listScope === 'recent'
              ? undefined
              : {
                  fetchPage: fetchUsersServerPage,
                  resetKey: `${listRefreshKey}-${listScope}`,
                }
          }
          rowPredicate={rowPredicate}
          resolveRow={resolveListRow}
          postFilterSort={postFilterSort}
          clearSelectionKey={listRefreshKey}
        />
      </ListPageLayout>

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={handleInvite}
      />
    </div>
  )
}
