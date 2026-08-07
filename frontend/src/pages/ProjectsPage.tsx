import { Archive, Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { updateProjectApi } from '@/api/projects'
import { ProjectsArchivedView } from '@/components/projects/ProjectsArchivedView'
import { ProjectsKanbanView } from '@/components/projects/ProjectsKanbanView'
import {
  ProjectsModuleHeader,
  type ProjectsViewId,
} from '@/components/projects/ProjectsModuleHeader'
import { ProjectsSegmentsView } from '@/components/projects/ProjectsSegmentsView'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import { DuplicateProjectDialog } from '@/components/projects/DuplicateProjectDialog'
import { EditProjectDialog } from '@/components/projects/EditProjectDialog'
import { BulkEditDialog } from '@/components/list/BulkEditDialog'
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
import { projectsListConfig } from '@/config/list-modules/projects'
import type { ProjectDetail } from '@/data/project-detail.mock'
import { loadProjectDetail } from '@/lib/entity-detail-loaders'
import type { ProjectListItem } from '@/data/projects.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { useProjectsRegistry } from '@/hooks/use-projects-registry'
import { fetchProjectsServerPage } from '@/lib/module-server-list'
import { useAuth } from '@/hooks/use-auth'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  duplicateProjectFormValues,
  type CreateProjectFormValues,
} from '@/lib/project-create'
import {
  createDefaultProjectFilters,
  PROJECT_JOURNEY_STAGE_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  projectFiltersToServerQuery,
  projectRowMatchesFilters,
  type ProjectFilters,
} from '@/lib/project-filters'
import { PROJECT_ARCHIVE_RETENTION_DAYS } from '@/lib/project-archive'
import { getCurrentUser } from '@/lib/current-user'
import {
  defaultProjectListScope,
  loadProjectRecentIds,
  normalizeProjectListScope,
  projectMatchesListScope,
  sortProjectsByRecentlyViewed,
  type ProjectListScope,
} from '@/lib/project-list-scope'

export function ProjectsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const { canEdit, canDelete } = useModulePermissions('proyectos')
  const {
    allProjects,
    addProject,
    updateProjectFromDetail,
    archiveProject,
    archiveProjects,
    archivedProjects,
    isArchived,
    reloadFromApi,
  } = useProjectsRegistry()

  const [view, setView] = useState<ProjectsViewId>('lista')
  const [listScope, setListScope] = useState<ProjectListScope>(() =>
    defaultProjectListScope(profile),
  )
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ProjectFilters>(() =>
    createDefaultProjectFilters(),
  )
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()

  const recentIds = useMemo(
    () => loadProjectRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const serverListQuery = useMemo(
    () =>
      projectFiltersToServerQuery(filters, {
        mine: listScope === 'mine',
        ownerName: getCurrentUser().name,
      }),
    [filters, listScope],
  )

  const filtersOnServer = listScope !== 'recent' && isApiEnabled()

  /** Con API, «Mis proyectos» ya viene filtrado en el servidor; no re-filtrar sin teamMembers. */
  const serverFiltersMineScope =
    isApiEnabled() && listScope === 'mine' && view === 'lista'

  const rowPredicate = useMemo(
    () => (row: ProjectListItem) =>
      projectRowMatchesFilters(row, filters) &&
      !isArchived(row.id) &&
      (serverFiltersMineScope ||
        projectMatchesListScope(row, listScope, recentIds)),
    [filters, isArchived, listScope, recentIds, serverFiltersMineScope],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: ProjectListItem[]) => sortProjectsByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/proyectos') {
      setListRefreshKey((k) => k + 1)
    }
  }, [location.pathname, location.key])

  useEffect(() => {
    setListScope((current) => normalizeProjectListScope(current, profile))
  }, [profile])

  const handleListScopeChange = useCallback(
    (scope: ProjectListScope) => {
      setListScope(normalizeProjectListScope(scope, profile))
    },
    [profile],
  )

  useEffect(() => {
    if (!isApiEnabled()) return
    if (view !== 'lista' || listScope === 'recent') {
      void reloadFromApi().catch(() => {})
    }
  }, [view, listScope, reloadFromApi])

  const [createOpen, setCreateOpen] = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [createInitial, setCreateInitial] = useState<Partial<CreateProjectFormValues>>()
  const [createTitle, setCreateTitle] = useState('Nuevo proyecto')
  const [editOpen, setEditOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectDetail | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ProjectListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)
  const [bulkEditIds, setBulkEditIds] = useState<string[] | null>(null)
  const [bulkEditSaving, setBulkEditSaving] = useState(false)

  const handleCreateSubmit = useCallback(
    async (values: CreateProjectFormValues) => {
      try {
        const item = await addProject(values)
        toast.success(`Proyecto «${item.name}» creado correctamente.`)
        navigate(`/proyectos/${item.id}`)
      } catch {
        toast.error('No se pudo crear el proyecto.')
      }
    },
    [addProject, navigate],
  )

  const handleDuplicateSelect = useCallback((source: ProjectListItem) => {
    setCreateInitial(duplicateProjectFormValues(source))
    setCreateTitle('Duplicar proyecto')
    setCreateOpen(true)
  }, [])

  const resolveListRow = useCallback((row: ProjectListItem) => row, [])

  const openEditProject = useCallback(async (row: ProjectListItem) => {
    try {
      setEditingProject(await loadProjectDetail(row.id))
      setEditOpen(true)
    } catch {
      toast.error('No se pudo cargar el proyecto.')
    }
  }, [])

  const handleEditSaved = useCallback(
    async (updated: ProjectDetail) => {
      try {
        await updateProjectFromDetail(updated)
        setListRefreshKey((k) => k + 1)
        toast.success(`Proyecto «${updated.name}» actualizado correctamente.`)
      } catch {
        toast.error('No se pudo actualizar el proyecto.')
      }
    },
    [updateProjectFromDetail],
  )

  const openArchiveProject = useCallback((row: ProjectListItem) => {
    setArchiveTarget(row)
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const name = archiveTarget.name
    try {
      await archiveProject(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Proyecto «${name}» archivado.`)
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar el proyecto.'),
      )
    }
  }, [archiveProject, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archiveProjects(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(
        `${count} proyecto${count === 1 ? '' : 's'} archivado${count === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudieron archivar los proyectos.'),
      )
    }
  }, [archiveProjects, bulkArchiveIds])

  const handleBulkEdit = useCallback(
    async (patch: Record<string, string>) => {
      if (!bulkEditIds?.length) return
      setBulkEditSaving(true)
      let ok = 0
      let fail = 0
      try {
        for (const id of bulkEditIds) {
          try {
            await updateProjectApi(id, {
              status: patch.status,
              journeyStage: patch.journeyStage,
              priority: patch.priority,
              managerName: patch.managerName,
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
          toast.success(`${ok} proyecto${ok === 1 ? '' : 's'} actualizado${ok === 1 ? '' : 's'}.`)
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
          <ProjectsModuleHeader
        view={view}
        onViewChange={setView}
        query={query}
        onQueryChange={setQuery}
        onCreateNew={() => {
          setCreateInitial(undefined)
          setCreateTitle('Nuevo proyecto')
          setCreateOpen(true)
        }}
        onDuplicate={() => setDuplicateOpen(true)}
        filters={filters}
        onFiltersChange={setFilters}
        listScope={listScope}
        onListScopeChange={handleListScopeChange}
        archivedCount={archivedProjects.length}
        toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
      />
        }
      >
            

      {view === 'lista' ? (
        <ModuleListPage
          config={projectsListConfig}
          embedded
          toolbarHost={toolbarHost}
          searchQuery={query}
          extraSeeds={listScope === 'recent' ? allProjects : []}
          serverList={
            listScope === 'recent'
              ? undefined
              : {
                  fetchPage: (params) =>
                    fetchProjectsServerPage(params, false, serverListQuery),
                  resetKey: `${listRefreshKey}-${listScope}-${JSON.stringify(serverListQuery)}`,
                  filtersOnServer,
                }
          }
          rowPredicate={rowPredicate}
          resolveRow={resolveListRow}
          onEditRow={canEdit ? openEditProject : undefined}
          onArchiveRow={canDelete ? openArchiveProject : undefined}
          postFilterSort={postFilterSort}
          selectionActions={listSelectionActions}
          clearSelectionKey={listRefreshKey}
        />
      ) : null}

      {view === 'kanban' ? (
        <ProjectsKanbanView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'segmentos' ? (
        <ProjectsSegmentsView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'archivados' ? (
        <ProjectsArchivedView query={query} />
      ) : null}

      </ListPageLayout>
      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={createTitle}
        description={
          createTitle === 'Duplicar proyecto'
            ? 'Revisa los datos copiados y guarda el nuevo registro.'
            : undefined
        }
        initialValues={createInitial}
        onSubmit={handleCreateSubmit}
      />

      <DuplicateProjectDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        projects={allProjects}
        onSelectDuplicate={handleDuplicateSelect}
      />

      {canEdit && editingProject ? (
        <EditProjectDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingProject(null)
          }}
          project={editingProject}
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
            <DialogTitle>Archivar proyecto</DialogTitle>
            <DialogDescription>
              {archiveTarget
                ? `«${archiveTarget.name}» irá a Archivados (papelera) durante ${PROJECT_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma definitiva.`
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
              Archivar {bulkArchiveIds?.length ?? 0} proyecto
              {bulkArchiveIds && bulkArchiveIds.length === 1 ? '' : 'es'}
            </DialogTitle>
            <DialogDescription>
              Las proyectos seleccionadas irán a Archivados durante{' '}
              {PROJECT_ARCHIVE_RETENTION_DAYS} días. Podrás restaurarlas o eliminarlas desde la
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

      <BulkEditDialog
        open={bulkEditIds !== null && bulkEditIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setBulkEditIds(null)
        }}
        selectedCount={bulkEditIds?.length ?? 0}
        saving={bulkEditSaving}
        title="Editar proyectos seleccionados"
        fields={[
          {
            key: 'status',
            label: 'Estado',
            options: PROJECT_STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            key: 'journeyStage',
            label: 'Ruta del éxito',
            options: PROJECT_JOURNEY_STAGE_OPTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            key: 'priority',
            label: 'Prioridad',
            options: PROJECT_PRIORITY_OPTIONS.map((p) => ({ value: p, label: p })),
          },
          {
            key: 'managerName',
            label: 'Gerente',
            placeholder: 'Nombre del gerente',
          },
        ]}
        onSubmit={handleBulkEdit}
      />
    </div>
  )
}
