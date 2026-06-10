import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { BitacoraDashboardView } from '@/components/bitacora/BitacoraDashboardView'
import { CreateBitacoraDialog } from '@/components/bitacora/CreateBitacoraDialog'
import {
  BitacoraModuleHeader,
  type BitacoraViewId,
} from '@/components/bitacora/BitacoraModuleHeader'
import { ListPageLayout } from '@/components/list/ListPageLayout'
import { ModuleListPage } from '@/components/list/ModuleListPage'
import { useEmbeddedListToolbarSlot } from '@/hooks/use-embedded-list-toolbar-slot'
import { bitacoraListConfig } from '@/config/list-modules/bitacora'
import type { BitacoraListItem } from '@/data/bitacora.mock'
import { isApiEnabled } from '@/api/config'
import { useAuth } from '@/hooks/use-auth'
import { useBitacoraDashboard } from '@/hooks/use-bitacora-dashboard'
import { useBitacoraRegistry } from '@/hooks/use-bitacora-registry'
import { fetchBitacoraServerPage } from '@/lib/module-server-list'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { bitacoraDashboardResetKey } from '@/lib/bitacora-dashboard'
import {
  bitacoraFiltersResetKey,
  bitacoraFiltersToServerQuery,
  bitacoraRowMatchesFilters,
  createDefaultBitacoraFilters,
  type BitacoraFilters,
} from '@/lib/bitacora-filters'
import {
  bitacoraFiltersForGuest,
  guestCompanyFromAuthUser,
} from '@/lib/bitacora-guest-scope'
import {
  bitacoraMatchesListScope,
  defaultBitacoraListScope,
  loadBitacoraRecentIds,
  normalizeBitacoraListScope,
  sortBitacoraByRecentlyViewed,
  type BitacoraListScope,
} from '@/lib/bitacora-list-scope'

export function BitacoraPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, membership } = useAuth()
  const guestCompany = useMemo(
    () => guestCompanyFromAuthUser(membership),
    [membership],
  )
  const { canEdit } = useModulePermissions('bitacora')
  const { allBitacora, addBitacora, reloadFromApi } = useBitacoraRegistry()
  const [view, setView] = useState<BitacoraViewId>('lista')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<BitacoraFilters>(() =>
    createDefaultBitacoraFilters(),
  )
  const [listScope, setListScope] = useState<BitacoraListScope>(() =>
    defaultBitacoraListScope(profile),
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()

  const recentIds = useMemo(
    () => loadBitacoraRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const effectiveListScope =
    view === 'dashboard' && listScope === 'recent' ? 'all' : listScope

  const serverFiltersMineScope =
    isApiEnabled() && effectiveListScope === 'mine'

  const scopedFilters = useMemo(
    () => bitacoraFiltersForGuest(filters, profile, guestCompany),
    [filters, profile, guestCompany],
  )

  const serverListQuery = useMemo(
    () => bitacoraFiltersToServerQuery(scopedFilters, effectiveListScope === 'mine'),
    [scopedFilters, effectiveListScope],
  )

  const dashboardFilters = scopedFilters

  const dashboardResetKey = useMemo(
    () =>
      `${listRefreshKey}-${bitacoraDashboardResetKey(dashboardFilters, effectiveListScope)}`,
    [listRefreshKey, dashboardFilters, effectiveListScope],
  )

  const { stats, loading, error, fromApi } = useBitacoraDashboard({
    filters: dashboardFilters,
    listScope: effectiveListScope,
    recentIds,
    rows: allBitacora,
    resetKey: dashboardResetKey,
  })

  const rowPredicate = useMemo(
    () => (row: BitacoraListItem) =>
      bitacoraRowMatchesFilters(row, scopedFilters) &&
      (serverFiltersMineScope ||
        bitacoraMatchesListScope(row, listScope, recentIds)),
    [scopedFilters, listScope, recentIds, serverFiltersMineScope],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: BitacoraListItem[]) => sortBitacoraByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/bitacora') {
      setListRefreshKey((k) => k + 1)
    }
  }, [location.pathname, location.key])

  useEffect(() => {
    setListScope((current) => normalizeBitacoraListScope(current, profile))
  }, [profile])

  const handleListScopeChange = useCallback(
    (scope: BitacoraListScope) => {
      setListScope(normalizeBitacoraListScope(scope, profile))
    },
    [profile],
  )

  useEffect(() => {
    if (!isApiEnabled()) return
    if (view === 'dashboard' || listScope === 'recent') {
      void reloadFromApi().catch(() => {})
    }
  }, [view, listScope, reloadFromApi])

  const resolveListRow = useCallback((row: BitacoraListItem) => row, [])

  const handleCreateSubmit = useCallback(
    async (values: import('@/lib/bitacora-form').BitacoraFormValues) => {
      const item = await addBitacora(values)
      toast.success('Bitácora registrada correctamente.')
      navigate(`/bitacora/${item.id}`)
    },
    [addBitacora, navigate],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ListPageLayout
        header={
          <BitacoraModuleHeader
            view={view}
            onViewChange={setView}
            query={query}
            onQueryChange={setQuery}
            onCreateNew={() => setCreateOpen(true)}
            filters={filters}
            onFiltersChange={setFilters}
            guestCompany={guestCompany}
            listScope={listScope}
            onListScopeChange={handleListScopeChange}
            toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
          />
        }
      >
        {view === 'dashboard' ? (
          <BitacoraDashboardView
            stats={stats}
            loading={loading}
            error={error}
            fromApi={fromApi}
          />
        ) : (
          <ModuleListPage
            config={bitacoraListConfig}
            embedded
            toolbarHost={toolbarHost}
            searchQuery={query}
            extraSeeds={
              isApiEnabled() && listScope !== 'recent' ? [] : allBitacora
            }
            serverList={
              listScope === 'recent'
                ? undefined
                : {
                    fetchPage: (params) =>
                      fetchBitacoraServerPage(params, serverListQuery),
                    resetKey: `${listRefreshKey}-${bitacoraFiltersResetKey(scopedFilters, listScope)}`,
                  }
            }
            rowPredicate={rowPredicate}
            resolveRow={resolveListRow}
            onEditRow={
              canEdit
                ? (row) => navigate(`/bitacora/${row.id}`)
                : undefined
            }
            postFilterSort={postFilterSort}
            clearSelectionKey={listRefreshKey}
          />
        )}
      </ListPageLayout>

      <CreateBitacoraDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
      />
    </div>
  )
}
