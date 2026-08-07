import { Archive, Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { updateCompanyApi } from '@/api/companies'
import { CompaniesArchivedView } from '@/components/companies/CompaniesArchivedView'
import { CompaniesKanbanView } from '@/components/companies/CompaniesKanbanView'
import {
  CompaniesModuleHeader,
  type CompaniesViewId,
} from '@/components/companies/CompaniesModuleHeader'
import { CompaniesSegmentsView } from '@/components/companies/CompaniesSegmentsView'
import { CreateCompanyDialog } from '@/components/companies/CreateCompanyDialog'
import { DuplicateCompanyDialog } from '@/components/companies/DuplicateCompanyDialog'
import { EditCompanyDialog } from '@/components/companies/EditCompanyDialog'
import { BulkEditDialog } from '@/components/list/BulkEditDialog'
import { ListPageLayout } from '@/components/list/ListPageLayout'
import { ModuleListPage, type ListSelectionAction } from '@/components/list/ModuleListPage'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { companiesListConfig } from '@/config/list-modules/companies'
import type { CompanyDetail } from '@/data/company-detail.mock'
import { resolveCompanyListItem } from '@/data/company-detail.mock'
import { resolveApiListRow } from '@/lib/resolve-list-row'
import { mergeCompanyListImage } from '@/lib/entity-list-image-cache'
import { loadCompanyDetail } from '@/lib/entity-detail-loaders'
import type { CompanyListItem } from '@/data/companies.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { useCompaniesRegistry } from '@/hooks/use-companies-registry'
import { useEmbeddedListToolbarSlot } from '@/hooks/use-embedded-list-toolbar-slot'
import { fetchCompaniesServerPage } from '@/lib/module-server-list'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  COMPANY_LIFECYCLE_OPTIONS,
  COMPANY_OPERATIONAL_OPTIONS,
  companyFiltersToServerQuery,
  companyRowMatchesFilters,
  createDefaultCompanyFilters,
  type CompanyFilters,
} from '@/lib/company-filters'
import {
  duplicateCompanyFormValues,
  type CreateCompanyFormValues,
} from '@/lib/company-create'
import { COMPANY_ARCHIVE_RETENTION_DAYS } from '@/lib/company-archive'
import { getCurrentUser } from '@/lib/current-user'
import {
  companyMatchesListScope,
  loadCompanyRecentIds,
  sortCompaniesByRecentlyViewed,
  type CompanyListScope,
} from '@/lib/company-list-scope'

export function CompaniesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { canEdit, canDelete } = useModulePermissions('empresas')
  const {
    allCompanies,
    addCompany,
    updateCompanyFromDetail,
    archiveCompany,
    archiveCompanies,
    archivedCompanies,
    isArchived,
    reloadFromApi,
  } = useCompaniesRegistry()

  const [view, setView] = useState<CompaniesViewId>('lista')
  const [listScope, setListScope] = useState<CompanyListScope>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<CompanyFilters>(() =>
    createDefaultCompanyFilters(),
  )
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()

  const recentIds = useMemo(
    () => loadCompanyRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const serverListQuery = useMemo(
    () =>
      companyFiltersToServerQuery(filters, {
        mine: listScope === 'mine',
        ownerName: getCurrentUser().name,
      }),
    [filters, listScope],
  )

  const filtersOnServer = listScope !== 'recent' && isApiEnabled()

  const rowPredicate = useMemo(
    () => (row: CompanyListItem) =>
      companyRowMatchesFilters(row, filters) &&
      !isArchived(row.id) &&
      companyMatchesListScope(row, listScope, recentIds),
    [filters, isArchived, listScope, recentIds],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: CompanyListItem[]) => sortCompaniesByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/empresas') {
      setListRefreshKey((k) => k + 1)
    }
  }, [location.pathname, location.key])

  useEffect(() => {
    if (!isApiEnabled()) return
    if (view !== 'lista' || listScope === 'recent') {
      void reloadFromApi().catch(() => {})
    }
  }, [view, listScope, reloadFromApi])

  const [createOpen, setCreateOpen] = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [createInitial, setCreateInitial] = useState<Partial<CreateCompanyFormValues>>()
  const [createTitle, setCreateTitle] = useState('Nueva empresa')
  const [editOpen, setEditOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<CompanyDetail | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<CompanyListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)
  const [bulkEditIds, setBulkEditIds] = useState<string[] | null>(null)
  const [bulkEditSaving, setBulkEditSaving] = useState(false)

  const handleCreateSubmit = useCallback(
    async (values: CreateCompanyFormValues) => {
      const item = await addCompany(values)
      toast.success(`Empresa «${item.name}» creada correctamente.`)
      navigate(`/empresas/${item.id}`)
    },
    [addCompany, navigate],
  )

  const handleDuplicateSelect = useCallback((source: CompanyListItem) => {
    setCreateInitial(duplicateCompanyFormValues(source))
    setCreateTitle('Duplicar empresa')
    setCreateOpen(true)
  }, [])

  const resolveListRow = useCallback(
    (row: CompanyListItem) => {
      const merged = mergeCompanyListImage(row)
      return resolveApiListRow(merged, resolveCompanyListItem)
    },
    // listRefreshKey fuerza relectura del listado tras cambios en detalle
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listRefreshKey],
  )

  const openEditCompany = useCallback((row: CompanyListItem) => {
    loadCompanyDetail(row.id).then(setEditingCompany)
    setEditOpen(true)
  }, [])

  const handleEditSaved = useCallback(
    (updated: CompanyDetail) => {
      updateCompanyFromDetail(updated)
      setListRefreshKey((k) => k + 1)
      toast.success(`Empresa «${updated.name}» actualizada correctamente.`)
    },
    [updateCompanyFromDetail],
  )

  const openArchiveCompany = useCallback((row: CompanyListItem) => {
    setArchiveTarget(row)
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const name = archiveTarget.name
    try {
      await archiveCompany(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Empresa «${name}» archivada.`)
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar la empresa.'),
      )
    }
  }, [archiveCompany, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archiveCompanies(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(
        `${count} empresa${count === 1 ? '' : 's'} archivada${count === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudieron archivar las empresas.'),
      )
    }
  }, [archiveCompanies, bulkArchiveIds])

  const handleBulkEdit = useCallback(
    async (patch: Record<string, string>) => {
      if (!bulkEditIds?.length) return
      setBulkEditSaving(true)
      let ok = 0
      let fail = 0
      try {
        for (const id of bulkEditIds) {
          try {
            await updateCompanyApi(id, {
              lifecycle: patch.lifecycle,
              operationalStatus: patch.operationalStatus,
              ownerName: patch.ownerName,
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
          toast.success(`${ok} empresa${ok === 1 ? '' : 's'} actualizada${ok === 1 ? '' : 's'}.`)
        } else {
          toast.warning(`${ok} actualizadas, ${fail} con error.`)
        }
      } finally {
        setBulkEditSaving(false)
      }
    },
    [bulkEditIds, reloadFromApi],
  )

  const listSelectionActions = useMemo<ListSelectionAction[]>(() => {
    const actions: ListSelectionAction[] = []
    if (canEdit) {
      actions.push({
        label: 'Editar',
        icon: Pencil,
        onClick: (ids) => setBulkEditIds(ids),
      })
    }
    if (canDelete) {
      actions.push({
        label: 'Archivar',
        icon: Archive,
        variant: 'destructive',
        onClick: (ids) => setBulkArchiveIds(ids),
      })
    }
    return actions
  }, [canDelete, canEdit])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ListPageLayout
        header={
          <CompaniesModuleHeader
        view={view}
        onViewChange={setView}
        query={query}
        onQueryChange={setQuery}
        onCreateNew={() => {
          setCreateInitial(undefined)
          setCreateTitle('Nueva empresa')
          setCreateOpen(true)
        }}
        onDuplicate={() => setDuplicateOpen(true)}
        filters={filters}
        onFiltersChange={setFilters}
        listScope={listScope}
        onListScopeChange={setListScope}
        archivedCount={archivedCompanies.length}
        toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
      />
        }
      >
            

      {view === 'lista' ? (
        <ModuleListPage
          config={companiesListConfig}
          embedded
          toolbarHost={toolbarHost}
          searchQuery={query}
          extraSeeds={listScope === 'recent' ? allCompanies : []}
          serverList={
            listScope === 'recent'
              ? undefined
              : {
                  fetchPage: (params) =>
                    fetchCompaniesServerPage(params, false, serverListQuery),
                  resetKey: `${listRefreshKey}-${listScope}-${JSON.stringify(serverListQuery)}`,
                  filtersOnServer,
                }
          }
          rowPredicate={rowPredicate}
          resolveRow={resolveListRow}
          onEditRow={canEdit ? openEditCompany : undefined}
          onArchiveRow={canDelete ? openArchiveCompany : undefined}
          postFilterSort={postFilterSort}
          selectionActions={listSelectionActions}
          clearSelectionKey={listRefreshKey}
        />
      ) : null}

      {view === 'kanban' ? (
        <CompaniesKanbanView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
          onEditCompany={canEdit ? openEditCompany : undefined}
          onArchiveCompany={canDelete ? openArchiveCompany : undefined}
        />
      ) : null}

      {view === 'segmentos' ? (
        <CompaniesSegmentsView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'archivados' ? (
        <CompaniesArchivedView query={query} />
      ) : null}

      </ListPageLayout>
      <CreateCompanyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={createTitle}
        description={
          createTitle === 'Duplicar empresa'
            ? 'Revisa los datos copiados y guarda el nuevo registro.'
            : undefined
        }
        initialValues={createInitial}
        onSubmit={handleCreateSubmit}
      />

      <DuplicateCompanyDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        companies={allCompanies}
        onSelectDuplicate={handleDuplicateSelect}
      />

      {canEdit && editingCompany ? (
        <EditCompanyDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingCompany(null)
          }}
          company={editingCompany}
          onSave={handleEditSaved}
        />
      ) : null}

      <Dialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar empresa</DialogTitle>
            <DialogDescription>
              {archiveTarget
                ? `«${archiveTarget.name}» irá a Archivados (papelera) durante ${COMPANY_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma definitiva.`
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
              Archivar {bulkArchiveIds?.length ?? 0} empresa
              {bulkArchiveIds && bulkArchiveIds.length === 1 ? '' : 's'}
            </DialogTitle>
            <DialogDescription>
              Las empresas seleccionadas irán a Archivados durante{' '}
              {COMPANY_ARCHIVE_RETENTION_DAYS} días. Podrás restaurarlas o eliminarlas
              desde la papelera antes de la eliminación definitiva.
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

      <BulkEditDialog
        open={bulkEditIds !== null && bulkEditIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setBulkEditIds(null)
        }}
        selectedCount={bulkEditIds?.length ?? 0}
        saving={bulkEditSaving}
        title="Editar empresas seleccionadas"
        fields={[
          {
            key: 'lifecycle',
            label: 'Ciclo de vida',
            options: COMPANY_LIFECYCLE_OPTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            key: 'operationalStatus',
            label: 'Estado operacional',
            options: COMPANY_OPERATIONAL_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            })),
          },
          {
            key: 'ownerName',
            label: 'Responsable',
            placeholder: 'Nombre del responsable',
          },
        ]}
        onSubmit={handleBulkEdit}
      />
    </div>
  )
}
