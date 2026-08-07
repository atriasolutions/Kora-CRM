import { Archive } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { BitacoraArchivedView } from '@/components/bitacora/BitacoraArchivedView'
import { BitacoraDashboardView } from '@/components/bitacora/BitacoraDashboardView'
import { BitacoraMonthlyQuotaDialog } from '@/components/bitacora/BitacoraMonthlyQuotaDialog'
import { CreateBitacoraDialog } from '@/components/bitacora/CreateBitacoraDialog'
import {
  BitacoraModuleHeader,
  type BitacoraViewId,
} from '@/components/bitacora/BitacoraModuleHeader'
import { ListPageLayout } from '@/components/list/ListPageLayout'
import { ModuleListPage, type ListSelectionAction } from '@/components/list/ModuleListPage'
import { useEmbeddedListToolbarSlot } from '@/hooks/use-embedded-list-toolbar-slot'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { bitacoraListConfig } from '@/config/list-modules/bitacora'
import type { BitacoraListItem } from '@/data/bitacora.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { useAuth } from '@/hooks/use-auth'
import { hasElevatedTenantScope } from '@/lib/access-profile-admin'
import { useBitacoraDashboard } from '@/hooks/use-bitacora-dashboard'
import { useBitacoraRegistry } from '@/hooks/use-bitacora-registry'
import { fetchBitacoraServerPage } from '@/lib/module-server-list'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { BITACORA_ARCHIVE_RETENTION_DAYS } from '@/lib/bitacora-archive'
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
  const { canEdit, canDelete } = useModulePermissions('bitacora')
  const {
    allBitacora,
    addBitacora,
    archiveBitacora,
    archiveBitacoraEntries,
    archivedBitacora,
    isArchived,
    reloadFromApi,
  } = useBitacoraRegistry()
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
  const [archiveTarget, setArchiveTarget] = useState<BitacoraListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false)
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

  const filtersOnServer = listScope !== 'recent' && isApiEnabled()

  const dashboardFilters = scopedFilters

  const dashboardResetKey = useMemo(
    () =>
      `${listRefreshKey}-${bitacoraDashboardResetKey(dashboardFilters, effectiveListScope)}`,
    [listRefreshKey, dashboardFilters, effectiveListScope],
  )

  const { stats, loading, fromApi } = useBitacoraDashboard({
    filters: dashboardFilters,
    listScope: effectiveListScope,
    recentIds,
    rows: allBitacora,
    resetKey: dashboardResetKey,
  })

  const canConfigureMonthlyQuota =
    isApiEnabled() && hasElevatedTenantScope(profile)
  const dashboardCompanyId = dashboardFilters.companyId.trim() || stats?.companyId
  const dashboardCompanyName =
    dashboardFilters.companyName.trim() || stats?.companyName || ''

  const rowPredicate = useMemo(
    () => (row: BitacoraListItem) =>
      bitacoraRowMatchesFilters(row, scopedFilters) &&
      !isArchived(row.id) &&
      (serverFiltersMineScope ||
        bitacoraMatchesListScope(row, listScope, recentIds)),
    [scopedFilters, isArchived, listScope, recentIds, serverFiltersMineScope],
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
    if (view === 'dashboard' || view === 'archivados' || listScope === 'recent') {
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

  const openArchiveBitacora = useCallback((row: BitacoraListItem) => {
    setArchiveTarget(row)
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const label = archiveTarget.solicitudTitle
    try {
      await archiveBitacora(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Registro «${label}» archivado.`)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo archivar el registro.'))
    }
  }, [archiveBitacora, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archiveBitacoraEntries(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(
        `${count} registro${count === 1 ? '' : 's'} archivado${count === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudieron archivar los registros.'))
    }
  }, [archiveBitacoraEntries, bulkArchiveIds])

  const listSelectionActions = useMemo<ListSelectionAction[]>(
    () =>
      canDelete
        ? [
            {
              label: 'Archivar',
              icon: Archive,
              variant: 'destructive',
              onClick: (ids) => setBulkArchiveIds(ids),
            },
          ]
        : [],
    [canDelete],
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
            archivedCount={archivedBitacora.length}
            toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
          />
        }
      >
        {view === 'dashboard' ? (
          <BitacoraDashboardView
            stats={stats}
            loading={loading}
            fromApi={fromApi}
            canConfigureMonthlyQuota={canConfigureMonthlyQuota && Boolean(dashboardCompanyId)}
            onConfigureMonthlyQuota={
              dashboardCompanyId ? () => setQuotaDialogOpen(true) : undefined
            }
          />
        ) : null}

        {view === 'lista' ? (
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
                      fetchBitacoraServerPage(params, false, serverListQuery),
                    resetKey: `${listRefreshKey}-${bitacoraFiltersResetKey(scopedFilters, listScope)}`,
                    filtersOnServer,
                  }
            }
            rowPredicate={rowPredicate}
            resolveRow={resolveListRow}
            onEditRow={
              canEdit
                ? (row) => navigate(`/bitacora/${row.id}`)
                : undefined
            }
            onArchiveRow={canDelete ? openArchiveBitacora : undefined}
            postFilterSort={postFilterSort}
            selectionActions={listSelectionActions}
            clearSelectionKey={listRefreshKey}
          />
        ) : null}

        {view === 'archivados' ? <BitacoraArchivedView query={query} /> : null}
      </ListPageLayout>

      <CreateBitacoraDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
      />

      <Dialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar registro</DialogTitle>
            <DialogDescription>
              {archiveTarget
                ? `«${archiveTarget.solicitudTitle}» irá a Archivados durante ${BITACORA_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma definitiva.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setArchiveTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleArchiveConfirm}>
              Archivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkArchiveIds !== null && bulkArchiveIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setBulkArchiveIds(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Archivar {bulkArchiveIds?.length ?? 0} registro
              {bulkArchiveIds && bulkArchiveIds.length === 1 ? '' : 's'}
            </DialogTitle>
            <DialogDescription>
              Los registros seleccionados irán a Archivados durante{' '}
              {BITACORA_ARCHIVE_RETENTION_DAYS} días. Podrás restaurarlos o eliminarlos desde la
              papelera antes de la eliminación definitiva.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setBulkArchiveIds(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleBulkArchiveConfirm}>
              Archivar selección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {dashboardCompanyId ? (
        <BitacoraMonthlyQuotaDialog
          open={quotaDialogOpen}
          onOpenChange={setQuotaDialogOpen}
          companyId={dashboardCompanyId}
          companyName={dashboardCompanyName || 'Cliente'}
          currentAssignedHours={stats?.monthlyQuota?.assignedHours ?? null}
          onSaved={() => setListRefreshKey((k) => k + 1)}
        />
      ) : null}
    </div>
  )
}
