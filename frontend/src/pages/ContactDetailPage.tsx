import {
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  LayoutList,
  StickyNote,
  Target,
  Zap,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { EntityNotesPanel } from '@/components/shared/EntityNotesPanel'
import { ContactActivitiesPanel } from '@/components/contacts/ContactActivitiesPanel'
import { ContactFilesPanel } from '@/components/contacts/ContactFilesPanel'
import { ContactDetailHeader } from '@/components/contacts/ContactDetailHeader'
import { ContactDetailProfile } from '@/components/contacts/ContactDetailProfile'
import { CreateContactDialog } from '@/components/contacts/CreateContactDialog'
import { EditContactDialog } from '@/components/contacts/EditContactDialog'
import { RegisterActivityDialog } from '@/components/contacts/RegisterActivityDialog'
import { LogContactOutreachDialog } from '@/components/contacts/LogContactOutreachDialog'
import { ContactOpportunitiesPanel } from '@/components/contacts/ContactOpportunitiesPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
import type { ContactDetail } from '@/data/contact-detail.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import { loadContactDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { lastContactLabelFromActivity } from '@/lib/contact-activity'
import {
  duplicateContactDetailFormValues,
  type CreateContactFormValues,
} from '@/lib/contact-create'
import { apiActionErrorMessage } from '@/api/errors'
import { useContactsRegistry } from '@/hooks/use-contacts-registry'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  parseContactDetailTab,
  type ContactDetailTab,
} from '@/lib/contact-routes'
import { persistContactFiles } from '@/lib/contact-files'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useEntityNotes } from '@/hooks/use-entity-notes'

const tabs: { id: ContactDetailTab; label: string; Icon: typeof LayoutList }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'actividad', label: 'Actividad', Icon: Zap },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
  { id: 'oportunidades', label: 'Oportunidades', Icon: Target },
  { id: 'archivos', label: 'Archivos', Icon: FolderOpen },
]

export function ContactDetailPage() {
  const navigate = useNavigate()
  const { contactId } = useParams<{ contactId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { canEdit: canEditContact, canDelete: canDeleteContact } =
    useModulePermissions('contactos')
  const { addContact, archiveContact, isArchived, updateContactFromDetail } =
    useContactsRegistry()
  const tab: ContactDetailTab = parseContactDetailTab(searchParams) ?? 'detalle'
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: contactId,
    load: loadContactDetail,
    isArchived,
    onLoaded: (id, record) => {
      setContact(record)
      recordEntityView('contactos', id)
    },
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [outreachDialogOpen, setOutreachDialogOpen] = useState(false)
  const [activityPresetType, setActivityPresetType] =
    useState<ContactActivityType>('llamada')
  const [opportunityCount, setOpportunityCount] = useState(0)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const selectTab = useCallback(
    (next: ContactDetailTab) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next === 'detalle') {
            params.delete('tab')
          } else {
            params.set('tab', next)
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const handleContactSaved = useCallback(
    async (updated: ContactDetail) => {
      try {
        const saved = await updateContactFromDetail(updated)
        setContact(saved)
        toast.success(`Contacto «${saved.name}» actualizado correctamente.`)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'No se pudo guardar el contacto.',
        )
      }
    },
    [updateContactFromDetail],
  )

  const openRegisterActivity = useCallback(
    (presetType: ContactActivityType = 'llamada') => {
      setActivityPresetType(presetType)
      setActivityDialogOpen(true)
    },
    [],
  )

  const { onAddNote: handleNoteAdded, onDeleteNote: handleNoteDeleted } = useEntityNotes({
    scope: 'contacto',
    entityId: contactId,
    setRecord: setContact,
  })

  const handleFilesChange = useCallback(
    async (files: ContactDetail['files']) => {
      if (!contact) return
      setContact((prev) => (prev ? { ...prev, files } : prev))
      try {
        const saved = await persistContactFiles(contact.id, contact.name, files)
        setContact((prev) => (prev ? { ...prev, files: saved } : prev))
      } catch (error) {
        toast.error(
          apiActionErrorMessage(error, 'No se pudieron guardar los archivos.'),
        )
      }
    },
    [contact],
  )

  const handleDuplicateSubmit = useCallback(
    async (values: CreateContactFormValues) => {
      const item = await addContact(values)
      toast.success(`Contacto «${item.name}» creado correctamente.`)
      navigate(`/contactos/${item.id}`)
    },
    [addContact, navigate],
  )

  const handleArchiveConfirm = useCallback(async () => {
    if (!contactId) return
    try {
      await archiveContact(contactId)
      setArchiveOpen(false)
      navigate('/contactos')
      toast.success('Contacto archivado.')
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar el contacto.'),
      )
    }
  }, [archiveContact, contactId, navigate])

  const handleActivitySaved = useCallback((activity: ContactActivity) => {
    setContact((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        activities: [activity, ...prev.activities],
        lastContactLabel: lastContactLabelFromActivity(activity),
      }
    })
    selectTab('actividad')
  }, [selectTab])

  const handleOutreachSaved = useCallback(
    ({ contact: updated, activity }: { contact: ContactListItem; activity: ContactActivity }) => {
      setContact((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          ...updated,
          activities: [activity, ...prev.activities],
        }
      })
      selectTab('actividad')
    },
    [selectTab],
  )

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="contactos"
        reason={reason}
        detail={unavailableDetail}
        recordId={contactId}
      onRetry={reload}
      />
    )
  }

  if (!contact) {
    return <RecordDetailLoading />
  }

  return (
    <PageScrollArea className="space-y-4 p-3 pb-8 sm:space-y-5 sm:p-4 sm:pb-10 lg:p-6">
      <nav aria-label="Miga de pan" className="flex flex-wrap items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link to="/contactos">
            <ArrowLeft aria-hidden className="size-4" />
            Contactos
          </Link>
        </Button>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="truncate font-medium text-foreground">{contact.name}</span>
      </nav>

      <ContactDetailHeader
        contact={contact}
        onStartEdit={
          canEditContact ? () => setEditDialogOpen(true) : undefined
        }
        onRegisterActivity={openRegisterActivity}
        onLogOutreach={() => setOutreachDialogOpen(true)}
        onDuplicate={() => setDuplicateOpen(true)}
        onArchive={
          canDeleteContact ? () => setArchiveOpen(true) : undefined
        }
      />

      {canEditContact ? (
        <EditContactDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          contact={contact}
          onSave={handleContactSaved}
        />
      ) : null}

      <CreateContactDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        title="Duplicar contacto"
        description="Revisa los datos copiados y guarda el nuevo registro."
        initialValues={duplicateContactDetailFormValues(contact)}
        onSubmit={handleDuplicateSubmit}
      />

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar contacto</DialogTitle>
            <DialogDescription>
              «{contact.name}» dejará de mostrarse en listados y búsquedas activas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setArchiveOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleArchiveConfirm}>
              Archivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RegisterActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        contactId={contact.id}
        contactName={contact.name}
        companyName={contact.companyDetail.name}
        defaultAuthor={contact.owner.name}
        presetType={activityPresetType}
        onSaved={handleActivitySaved}
      />

      <LogContactOutreachDialog
        open={outreachDialogOpen}
        onOpenChange={setOutreachDialogOpen}
        contact={contact}
        onSaved={({ contact: updated, activity }) =>
          handleOutreachSaved({ contact: updated, activity })
        }
      />

      <div className="min-w-0 space-y-4">
          <div
            className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Secciones del contacto"
          >
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => selectTab(id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:gap-2 sm:px-4 sm:py-2.5',
                  tab === id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon aria-hidden className="size-4 opacity-70" />
                {label}
                {id === 'oportunidades' && opportunityCount > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {opportunityCount}
                  </Badge>
                ) : null}
                {id === 'archivos' && contact.files.length > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {contact.files.length}
                  </Badge>
                ) : null}
              </button>
            ))}
          </div>

          {tab === 'detalle' ? (
            <div className="space-y-4">
              <ContactDetailProfile contact={contact} />
              {contact.subtitle?.trim() || contact.initialNote?.trim() ? (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">
                      {contact.initialNote?.trim() ? 'Nota inicial' : 'Resumen'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {contact.subtitle?.trim() ? (
                      <p className="text-sm font-medium text-foreground">
                        {contact.subtitle}
                      </p>
                    ) : null}
                    {contact.initialNote?.trim() ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {contact.initialNote}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}

          {tab === 'actividad' ? (
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-semibold">Actividades</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border"
                  onClick={() => openRegisterActivity()}
                >
                  Registrar actividad
                </Button>
              </CardHeader>
              <CardContent>
                <ContactActivitiesPanel
                  activities={contact.activities}
                  onRegister={() => openRegisterActivity()}
                />
              </CardContent>
            </Card>
          ) : null}

          {tab === 'notas' ? (
            <EntityNotesPanel
              notes={contact.notes}
              authorName={contact.owner.name}
              onAddNote={handleNoteAdded}
              onDeleteNote={handleNoteDeleted}
            />
          ) : null}

          {tab === 'oportunidades' ? (
            <ContactOpportunitiesPanel
              contact={contact}
              onCountChange={setOpportunityCount}
            />
          ) : null}

          {tab === 'archivos' ? (
            <ContactFilesPanel
              authorName={contact.owner.name}
              files={contact.files}
              onFilesChange={handleFilesChange}
            />
          ) : null}
      </div>
    </PageScrollArea>
  )
}
