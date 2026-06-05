import { Archive } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { CreateContactDialog } from '@/components/contacts/CreateContactDialog'
import { DuplicateContactDialog } from '@/components/contacts/DuplicateContactDialog'
import { EditContactDialog } from '@/components/contacts/EditContactDialog'
import { LogContactOutreachDialog } from '@/components/contacts/LogContactOutreachDialog'
import { ContactsKanbanView } from '@/components/contacts/ContactsKanbanView'
import {
  ContactsModuleHeader,
  type ContactsViewId,
} from '@/components/contacts/ContactsModuleHeader'
import { ContactsArchivedView } from '@/components/contacts/ContactsArchivedView'
import { ContactsSegmentsView } from '@/components/contacts/ContactsSegmentsView'
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
import { contactsListConfig } from '@/config/list-modules/contacts'
import type { ContactDetail } from '@/data/contact-detail.mock'
import { resolveContactListItem } from '@/data/contact-detail.mock'
import { resolveApiListRow } from '@/lib/resolve-list-row'
import { loadContactDetail } from '@/lib/entity-detail-loaders'
import type { ContactListItem } from '@/data/contacts.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { useContactsRegistry } from '@/hooks/use-contacts-registry'
import { useEmbeddedListToolbarSlot } from '@/hooks/use-embedded-list-toolbar-slot'
import { fetchContactsServerPage } from '@/lib/module-server-list'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { duplicateContactFormValues } from '@/lib/contact-create'
import type { CreateContactFormValues } from '@/lib/contact-create'
import {
  contactRowMatchesFilters,
  createDefaultContactFilters,
  type ContactFilters,
} from '@/lib/contact-filters'
import {
  contactMatchesListScope,
  sortContactsByRecentlyViewed,
  type ContactListScope,
} from '@/lib/contact-list-scope'
import { CONTACT_ARCHIVE_RETENTION_DAYS } from '@/lib/contact-archive'
import { loadRecentlyViewedContactIds } from '@/lib/contact-recently-viewed'
import { mergeOutreachIntoContact } from '@/lib/contact-outreach-storage'
import { mergeContactListAvatar } from '@/lib/entity-list-image-cache'

export function ContactsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { canEdit: canEditContacts, canDelete: canDeleteContacts } =
    useModulePermissions('contactos')
  const {
    allContacts,
    addContact,
    updateContactFromDetail,
    archiveContact,
    archiveContacts,
    archivedContacts,
    isArchived,
    reloadFromApi,
  } = useContactsRegistry()

  const [view, setView] = useState<ContactsViewId>('lista')
  const [listScope, setListScope] = useState<ContactListScope>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ContactFilters>(() =>
    createDefaultContactFilters(),
  )
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()

  const recentIds = useMemo(
    () => loadRecentlyViewedContactIds(),
    [listRefreshKey, location.key, listScope],
  )

  const rowPredicate = useMemo(
    () => (row: ContactListItem) =>
      contactRowMatchesFilters(row, filters) &&
      !isArchived(row.id) &&
      contactMatchesListScope(row, listScope, recentIds),
    [filters, isArchived, listScope, recentIds],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: ContactListItem[]) => sortContactsByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/contactos') {
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
  const [createInitial, setCreateInitial] = useState<Partial<CreateContactFormValues>>()
  const [createTitle, setCreateTitle] = useState('Nuevo contacto')
  const [editOpen, setEditOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactDetail | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ContactListItem | null>(null)
  const [outreachTarget, setOutreachTarget] = useState<ContactListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)

  const openCreateNew = useCallback(() => {
    setCreateInitial(undefined)
    setCreateTitle('Nuevo contacto')
    setCreateOpen(true)
  }, [])

  const openDuplicate = useCallback(() => {
    setDuplicateOpen(true)
  }, [])

  const handleCreateSubmit = useCallback(
    async (values: CreateContactFormValues) => {
      const item = await addContact(values)
      toast.success(`Contacto «${item.name}» creado correctamente.`)
      navigate(`/contactos/${item.id}`)
    },
    [addContact, navigate],
  )

  const handleDuplicateSelect = useCallback((source: ContactListItem) => {
    setCreateInitial(duplicateContactFormValues(source))
    setCreateTitle('Duplicar contacto')
    setCreateOpen(true)
  }, [])

  const resolveListRow = useCallback(
    (row: ContactListItem) =>
      mergeOutreachIntoContact(
        mergeContactListAvatar(resolveApiListRow(row, resolveContactListItem)),
      ),
    // listRefreshKey fuerza relectura del listado tras cambios en detalle
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listRefreshKey],
  )

  const openLogOutreach = useCallback((row: ContactListItem) => {
    setOutreachTarget(row)
  }, [])

  const openEditContact = useCallback((row: ContactListItem) => {
    loadContactDetail(row.id).then(setEditingContact)
    setEditOpen(true)
  }, [])

  const handleEditSaved = useCallback(
    (updated: ContactDetail) => {
      updateContactFromDetail(updated)
      setListRefreshKey((k) => k + 1)
      toast.success(`Contacto «${updated.name}» actualizado correctamente.`)
    },
    [updateContactFromDetail],
  )

  const openArchiveContact = useCallback((row: ContactListItem) => {
    setArchiveTarget(row)
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const name = archiveTarget.name
    try {
      await archiveContact(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Contacto «${name}» archivado.`)
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar el contacto.'),
      )
    }
  }, [archiveContact, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archiveContacts(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(
        `${count} contacto${count === 1 ? '' : 's'} archivado${count === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudieron archivar los contactos.'),
      )
    }
  }, [archiveContacts, bulkArchiveIds])

  const listSelectionActions = useMemo<ListSelectionAction[]>(
    () =>
      canDeleteContacts
        ? [
            {
              label: 'Archivar',
              icon: Archive,
              variant: 'destructive',
              onClick: (ids) => setBulkArchiveIds(ids),
            },
          ]
        : [],
    [canDeleteContacts],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ListPageLayout
        header={
          <ContactsModuleHeader
            view={view}
            onViewChange={setView}
            query={query}
            onQueryChange={setQuery}
            onCreateNew={openCreateNew}
            onDuplicate={openDuplicate}
            filters={filters}
            onFiltersChange={setFilters}
            listScope={listScope}
            onListScopeChange={setListScope}
            archivedCount={archivedContacts.length}
            toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
          />
        }
      >
        {view === 'lista' ? (
        <ModuleListPage
          config={contactsListConfig}
          embedded
          toolbarHost={toolbarHost}
          searchQuery={query}
          extraSeeds={listScope === 'recent' ? allContacts : []}
          serverList={
            listScope === 'recent'
              ? undefined
              : {
                  fetchPage: (params) => fetchContactsServerPage(params, false),
                  resetKey: `${listRefreshKey}-${listScope}-${filters.statuses.join(',')}-${filters.outreach}`,
                }
          }
          rowPredicate={rowPredicate}
          resolveRow={resolveListRow}
          onEditRow={canEditContacts ? openEditContact : undefined}
          onArchiveRow={canDeleteContacts ? openArchiveContact : undefined}
          onLogOutreachRow={openLogOutreach}
          postFilterSort={postFilterSort}
          selectionActions={listSelectionActions}
          clearSelectionKey={listRefreshKey}
        />
      ) : null}

        {view === 'kanban' ? (
          <ContactsKanbanView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
          onEditContact={canEditContacts ? openEditContact : undefined}
          onArchiveContact={canDeleteContacts ? openArchiveContact : undefined}
          />
        ) : null}

        {view === 'segmentos' ? (
          <ContactsSegmentsView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
          />
        ) : null}

        {view === 'archivados' ? (
          <ContactsArchivedView query={query} />
        ) : null}
      </ListPageLayout>

      <CreateContactDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={createTitle}
        description={
          createTitle === 'Duplicar contacto'
            ? 'Revisa los datos copiados y guarda el nuevo registro.'
            : undefined
        }
        initialValues={createInitial}
        onSubmit={handleCreateSubmit}
      />

      <DuplicateContactDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        contacts={allContacts}
        onSelectDuplicate={handleDuplicateSelect}
      />

      {canEditContacts && editingContact ? (
        <EditContactDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingContact(null)
          }}
          contact={editingContact}
          onSave={handleEditSaved}
        />
      ) : null}

      <LogContactOutreachDialog
        open={outreachTarget !== null}
        onOpenChange={(open) => {
          if (!open) setOutreachTarget(null)
        }}
        contact={outreachTarget}
        onSaved={() => setListRefreshKey((k) => k + 1)}
      />

      <Dialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar contacto</DialogTitle>
            <DialogDescription>
              {archiveTarget
                ? `«${archiveTarget.name}» irá a Archivados (papelera) durante ${CONTACT_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma definitiva.`
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
              Archivar {bulkArchiveIds?.length ?? 0} contacto
              {bulkArchiveIds && bulkArchiveIds.length === 1 ? '' : 's'}
            </DialogTitle>
            <DialogDescription>
              Los contactos seleccionados irán a Archivados durante{' '}
              {CONTACT_ARCHIVE_RETENTION_DAYS} días. Podrás restaurarlos o eliminarlos
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
    </div>
  )
}
