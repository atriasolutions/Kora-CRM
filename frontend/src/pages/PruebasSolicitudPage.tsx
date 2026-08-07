import { Archive } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { CreatePruebaSolicitudDialog } from '@/components/pruebas-solicitud/CreatePruebaSolicitudDialog'
import { PruebasSolicitudArchivedView } from '@/components/pruebas-solicitud/PruebasSolicitudArchivedView'
import { PruebasSolicitudModuleHeader } from '@/components/pruebas-solicitud/PruebasSolicitudModuleHeader'
import { PruebasSolicitudSegmentsView } from '@/components/pruebas-solicitud/PruebasSolicitudSegmentsView'
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
import { pruebasSolicitudListConfig } from '@/config/list-modules/pruebas-solicitud'
import type { PruebaSolicitudListItem } from '@/data/pruebas-solicitud.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { usePruebasSolicitudRegistry } from '@/hooks/use-pruebas-solicitud-registry'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useAuth } from '@/hooks/use-auth'
import { canGuestCreatePrueba } from '@/lib/prueba-solicitud-guest-access'
import type { PruebaSolicitudFormValues } from '@/lib/prueba-solicitud-form'
import { PRUEBA_SOLICITUD_ARCHIVE_RETENTION_DAYS } from '@/lib/prueba-solicitud-archive'
import {
  createDefaultPruebaSolicitudFilters,
  pruebaSolicitudFiltersResetKey,
  pruebaSolicitudFiltersToServerQuery,
  pruebaSolicitudRowMatchesFilters,
  type PruebaSolicitudFilters,
} from '@/lib/prueba-solicitud-filters'
import { fetchPruebasSolicitudServerPage } from '@/lib/module-server-list'
import type { PruebasModuleViewId } from '@/lib/module-list-views'
import { toast } from '@/lib/toast'

export function PruebasSolicitudPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const { canCreate, canEdit, canDelete } = useModulePermissions('pruebas_solicitud')
  const {
    addPrueba,
    archivePrueba,
    archivePruebas,
    archivedPruebas,
    isArchived,
    reloadFromApi,
  } = usePruebasSolicitudRegistry()
  const [view, setView] = useState<PruebasModuleViewId>('lista')
  const [createOpen, setCreateOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<PruebaSolicitudFilters>(() =>
    createDefaultPruebaSolicitudFilters(),
  )
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const [archiveTarget, setArchiveTarget] = useState<PruebaSolicitudListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()

  const showCreate = canCreate && canGuestCreatePrueba(profile)

  const serverListQuery = useMemo(
    () => pruebaSolicitudFiltersToServerQuery(filters),
    [filters],
  )

  const filtersOnServer = isApiEnabled()

  const rowPredicate = useMemo(
    () => (row: PruebaSolicitudListItem) =>
      pruebaSolicitudRowMatchesFilters(row, filters) && !isArchived(row.id),
    [filters, isArchived],
  )

  useEffect(() => {
    if (location.pathname === '/pruebas-solicitud') {
      setListRefreshKey((k) => k + 1)
    }
  }, [location.pathname, location.key])

  useEffect(() => {
    if (!isApiEnabled()) return
    if (view === 'segmentos' || view === 'archivados') {
      void reloadFromApi().catch(() => {})
    }
  }, [view, reloadFromApi])

  const handleCreate = async (values: PruebaSolicitudFormValues) => {
    try {
      const created = await addPrueba({
        solicitudId: values.solicitudId,
        description: values.description.trim() || undefined,
        executedAt: values.executedAt || undefined,
      })
      toast.success('Prueba creada.')
      setListRefreshKey((k) => k + 1)
      navigate(`/pruebas-solicitud/${created.id}`)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo crear la prueba.'))
      throw error
    }
  }

  const openArchivePrueba = useCallback((row: PruebaSolicitudListItem) => {
    setArchiveTarget(row)
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const label = archiveTarget.code
    try {
      await archivePrueba(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Prueba «${label}» archivada.`)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo archivar la prueba.'))
    }
  }, [archivePrueba, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archivePruebas(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(
        `${count} prueba${count === 1 ? '' : 's'} archivada${count === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudieron archivar las pruebas.'))
    }
  }, [archivePruebas, bulkArchiveIds])

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

  const fetchActivePage = useCallback(
    (params: {
      page: number
      pageSize: number
      query: string
      sortBy?: string
      sortDir?: 'asc' | 'desc'
    }) => fetchPruebasSolicitudServerPage(params, false, serverListQuery),
    [serverListQuery],
  )

  const serverResetKey = `${listRefreshKey}-${pruebaSolicitudFiltersResetKey(filters)}`

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ListPageLayout
        header={
          <PruebasSolicitudModuleHeader
            view={view}
            onViewChange={setView}
            query={query}
            onQueryChange={setQuery}
            filters={filters}
            onFiltersChange={setFilters}
            onCreateNew={showCreate ? () => setCreateOpen(true) : undefined}
            archivedCount={archivedPruebas.length}
            toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
          />
        }
      >
        {view === 'lista' ? (
          <ModuleListPage
            config={pruebasSolicitudListConfig}
            embedded
            toolbarHost={toolbarHost}
            searchQuery={query}
            serverList={
              isApiEnabled()
                ? {
                    fetchPage: fetchActivePage,
                    resetKey: serverResetKey,
                    filtersOnServer,
                  }
                : undefined
            }
            rowPredicate={rowPredicate}
            onEditRow={canEdit ? (row) => navigate(`/pruebas-solicitud/${row.id}`) : undefined}
            onArchiveRow={canDelete ? openArchivePrueba : undefined}
            selectionActions={listSelectionActions}
            clearSelectionKey={listRefreshKey}
          />
        ) : null}

        {view === 'segmentos' ? (
          <PruebasSolicitudSegmentsView query={query} filters={filters} />
        ) : null}

        {view === 'archivados' ? <PruebasSolicitudArchivedView query={query} /> : null}
      </ListPageLayout>

      <CreatePruebaSolicitudDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      <Dialog open={archiveTarget != null} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar prueba</DialogTitle>
            <DialogDescription>
              «{archiveTarget?.code}» irá a Archivados durante{' '}
              {PRUEBA_SOLICITUD_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma
              definitiva si no la restauras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setArchiveTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleArchiveConfirm()}>
              Archivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkArchiveIds != null} onOpenChange={(open) => !open && setBulkArchiveIds(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar pruebas seleccionadas</DialogTitle>
            <DialogDescription>
              Se archivarán {bulkArchiveIds?.length ?? 0} prueba
              {(bulkArchiveIds?.length ?? 0) === 1 ? '' : 's'} en la papelera de reciclaje.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setBulkArchiveIds(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleBulkArchiveConfirm()}
            >
              Archivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
