import { Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { updateUserApi } from '@/api/users'
import { InviteUserDialog } from '@/components/users/InviteUserDialog'
import { BulkEditDialog } from '@/components/list/BulkEditDialog'
import { ListPageLayout } from '@/components/list/ListPageLayout'
import { ModuleListPage, type ListSelectionAction } from '@/components/list/ModuleListPage'
import { UsersModuleHeader } from '@/components/users/UsersModuleHeader'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { usersListConfig } from '@/config/list-modules/users'
import type { UserListItem } from '@/data/users.mock'
import { usePrefetchUserAvatarsById } from '@/hooks/use-user-avatar-url'
import { useUsersRegistry } from '@/hooks/use-users-registry'
import { useEmbeddedListToolbarSlot } from '@/hooks/use-embedded-list-toolbar-slot'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { fetchUsersServerPage } from '@/lib/module-server-list'
import type { UserFormValues } from '@/lib/user-form'
import {
  createDefaultUserFilters,
  userFiltersToServerQuery,
  userRowMatchesFilters,
  USER_STATUS_OPTIONS,
  type UserFilters,
} from '@/lib/user-filters'
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
  const { canEdit } = useModulePermissions('usuarios')
  const { allUsers, addUser, reloadFromApi } = useUsersRegistry()
  usePrefetchUserAvatarsById(allUsers.map((u) => u.id))
  const [listScope, setListScope] = useState<UserListScope>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<UserFilters>(() => createDefaultUserFilters())
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [bulkEditIds, setBulkEditIds] = useState<string[] | null>(null)
  const [bulkEditSaving, setBulkEditSaving] = useState(false)

  const recentIds = useMemo(
    () => loadUserRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const serverListQuery = useMemo(() => userFiltersToServerQuery(filters), [filters])

  // «Mi perfil» se resuelve por id en cliente; filtros de estado/fecha van al servidor en «all».
  const filtersOnServer = listScope === 'all' && isApiEnabled()

  const rowPredicate = useMemo(
    () => (row: UserListItem) =>
      userRowMatchesFilters(row, filters) && userMatchesListScope(row, listScope, recentIds),
    [filters, listScope, recentIds],
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

  const handleBulkEdit = useCallback(
    async (patch: Record<string, string>) => {
      if (!bulkEditIds?.length) return
      setBulkEditSaving(true)
      let ok = 0
      let fail = 0
      try {
        for (const id of bulkEditIds) {
          try {
            await updateUserApi(id, {
              status: patch.status,
            })
            ok += 1
          } catch {
            fail += 1
          }
        }
        setBulkEditIds(null)
        setListRefreshKey((k) => k + 1)
        void reloadFromApi().catch(() => {})
        if (fail === 0) {
          toast.success(`${ok} usuario${ok === 1 ? '' : 's'} actualizado${ok === 1 ? '' : 's'}.`)
        } else {
          toast.warning(`${ok} actualizados, ${fail} con error.`)
        }
      } finally {
        setBulkEditSaving(false)
      }
    },
    [bulkEditIds, reloadFromApi],
  )

  const listSelectionActions = useMemo<ListSelectionAction[]>(() => {
    if (!canEdit) return []
    return [
      {
        label: 'Editar',
        icon: Pencil,
        onClick: (ids) => setBulkEditIds(ids),
      },
    ]
  }, [canEdit])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ListPageLayout
        header={
          <UsersModuleHeader
            query={query}
            onQueryChange={setQuery}
            onInvite={() => setInviteOpen(true)}
            filters={filters}
            onFiltersChange={setFilters}
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
                  fetchPage: (params) => fetchUsersServerPage(params, serverListQuery),
                  resetKey: `${listRefreshKey}-${listScope}-${JSON.stringify(serverListQuery)}`,
                  filtersOnServer,
                }
          }
          rowPredicate={rowPredicate}
          resolveRow={resolveListRow}
          postFilterSort={postFilterSort}
          selectionActions={listSelectionActions}
          clearSelectionKey={listRefreshKey}
        />
      </ListPageLayout>

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={handleInvite}
      />

      <BulkEditDialog
        open={bulkEditIds !== null && bulkEditIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setBulkEditIds(null)
        }}
        selectedCount={bulkEditIds?.length ?? 0}
        saving={bulkEditSaving}
        title="Editar usuarios seleccionados"
        fields={[
          {
            key: 'status',
            label: 'Estado',
            options: USER_STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
        ]}
        onSubmit={handleBulkEdit}
      />
    </div>
  )
}
