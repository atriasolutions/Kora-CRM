import {
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  LayoutList,
  MapPin,
  StickyNote,
  Target,
  Users,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { CompanyContactsPanel } from '@/components/companies/CompanyContactsPanel'
import { CompanyDetailHeader } from '@/components/companies/CompanyDetailHeader'
import { CompanyFilesPanel } from '@/components/companies/CompanyFilesPanel'
import { CompanyLocationsPanel } from '@/components/companies/CompanyLocationsPanel'
import { CompanyOpportunitiesPanel } from '@/components/companies/CompanyOpportunitiesPanel'
import { CompanyDetailSidebar } from '@/components/companies/CompanyDetailSidebar'
import { EditCompanyDialog } from '@/components/companies/EditCompanyDialog'
import { ContactActivitiesPanel } from '@/components/contacts/ContactActivitiesPanel'
import { RegisterActivityDialog } from '@/components/contacts/RegisterActivityDialog'
import { EntityNotesPanel } from '@/components/shared/EntityNotesPanel'
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
import type { CompanyDetail } from '@/data/company-detail.mock'
import { useEntityNotes } from '@/hooks/use-entity-notes'
import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
import { persistCompanyFiles } from '@/lib/company-files'
import { loadCompanyDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { useCompaniesRegistry } from '@/hooks/use-companies-registry'
import { useContactsRegistry } from '@/hooks/use-contacts-registry'
import { useOpportunitiesRegistry } from '@/hooks/use-opportunities-registry'
import { useActivitiesRegistry } from '@/hooks/use-activities-registry'
import { buildCompanyDetailMetrics } from '@/lib/company-detail-metrics'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { lastContactLabelFromActivity } from '@/lib/contact-activity'
import { COMPANY_ARCHIVE_RETENTION_DAYS } from '@/lib/company-archive'
import {
  parseCompanyDetailTab,
  type CompanyDetailTab,
} from '@/lib/company-routes'
import { apiActionErrorMessage } from '@/api/errors'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { toast } from '@/lib/toast'

const tabs: { id: CompanyDetailTab; label: string; Icon: typeof LayoutList }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'actividad', label: 'Actividad', Icon: Zap },
  { id: 'ubicacion', label: 'Ubicación', Icon: MapPin },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
  { id: 'oportunidades', label: 'Oportunidades', Icon: Target },
  { id: 'contactos', label: 'Contactos', Icon: Users },
  { id: 'archivos', label: 'Archivos', Icon: FolderOpen },
]

export function CompanyDetailPage() {
  const navigate = useNavigate()
  const { companyId } = useParams<{ companyId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { canEdit, canDelete } = useModulePermissions('empresas')
  const { archiveCompany, isArchived, updateCompanyFromDetail } = useCompaniesRegistry()
  const { allOpportunities } = useOpportunitiesRegistry()
  const { allContacts, reloadFromApi: reloadContacts } = useContactsRegistry()
  const { allActivities } = useActivitiesRegistry()
  const tab: CompanyDetailTab = parseCompanyDetailTab(searchParams) ?? 'detalle'
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: companyId,
    load: loadCompanyDetail,
    isArchived,
    onLoaded: (id, record) => {
      setCompany(record)
      recordEntityView('empresas', id)
    },
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [activityPresetType, setActivityPresetType] =
    useState<ContactActivityType>('llamada')
  const [opportunityCount, setOpportunityCount] = useState(0)
  const [contactCount, setContactCount] = useState(0)

  useEffect(() => {
    void reloadContacts().catch(() => {})
  }, [reloadContacts])

  const selectTab = useCallback(
    (next: CompanyDetailTab) => {
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

  const handleCompanySaved = useCallback(
    async (updated: CompanyDetail) => {
      try {
        const saved = await updateCompanyFromDetail(updated)
        setCompany(saved)
        toast.success(`Empresa «${saved.name}» actualizada correctamente.`)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'No se pudo guardar la empresa.',
        )
      }
    },
    [updateCompanyFromDetail],
  )

  const handleLocationsChange = useCallback(
    async (updated: CompanyDetail) => {
      try {
        await updateCompanyFromDetail(updated)
        setCompany(updated)
        toast.success('Ubicaciones actualizadas.')
      } catch {
        toast.error('No se pudieron guardar las ubicaciones.')
      }
    },
    [updateCompanyFromDetail],
  )

  const openRegisterActivity = useCallback(
    (presetType: ContactActivityType = 'llamada') => {
      setActivityPresetType(presetType)
      setActivityDialogOpen(true)
    },
    [],
  )

  const handleActivitySaved = useCallback((activity: ContactActivity) => {
    setCompany((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        activities: [activity, ...prev.activities],
        lastActivity: lastContactLabelFromActivity(activity),
      }
    })
    selectTab('actividad')
  }, [selectTab])

  const { onAddNote: handleNoteAdded, onDeleteNote: handleNoteDeleted } = useEntityNotes({
    scope: 'empresa',
    entityId: companyId,
    setRecord: setCompany,
    onAdded: () => selectTab('notas'),
    onAfterChange: (next) => {
      void updateCompanyFromDetail(next)
    },
  })

  const handleFilesChange = useCallback(
    async (files: CompanyDetail['files']) => {
      if (!company) return
      setCompany((prev) => (prev ? { ...prev, files } : prev))
      try {
        const saved = await persistCompanyFiles(company.id, company.name, files)
        setCompany((prev) => (prev ? { ...prev, files: saved } : prev))
      } catch (error) {
        toast.error(
          apiActionErrorMessage(error, 'No se pudieron guardar los archivos.'),
        )
      }
    },
    [company],
  )

  const handleArchiveConfirm = useCallback(async () => {
    if (!companyId) return
    try {
      await archiveCompany(companyId)
      setArchiveOpen(false)
      navigate('/empresas')
      toast.success('Empresa archivada.')
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar la empresa.'),
      )
    }
  }, [archiveCompany, companyId, navigate])

  const headerMetrics = useMemo(() => {
    if (!company) return []
    return buildCompanyDetailMetrics({
      company,
      opportunities: allOpportunities,
      contacts: allContacts,
      registryActivities: allActivities,
    })
  }, [company, allOpportunities, allContacts, allActivities])

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="empresas"
        reason={reason}
        detail={unavailableDetail}
        recordId={companyId}
      onRetry={reload}
      />
    )
  }

  if (!company) {
    return <RecordDetailLoading />
  }

  const authorName = company.ownerDetail?.name ?? company.owner

  return (
    <PageScrollArea className="space-y-4 p-3 pb-8 sm:space-y-5 sm:p-4 sm:pb-10 lg:p-6">
      <nav aria-label="Miga de pan" className="flex flex-wrap items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link to="/empresas">
            <ArrowLeft aria-hidden className="size-4" />
            Empresas
          </Link>
        </Button>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="truncate font-medium text-foreground">{company.name}</span>
      </nav>

      <CompanyDetailHeader
        company={company}
        metrics={headerMetrics}
        onStartEdit={canEdit ? () => setEditDialogOpen(true) : undefined}
        onRegisterActivity={openRegisterActivity}
        onArchive={canDelete ? () => setArchiveOpen(true) : undefined}
      />

      {canEdit ? (
        <EditCompanyDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          company={company}
          onSave={handleCompanySaved}
        />
      ) : null}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar empresa</DialogTitle>
            <DialogDescription>
              «{company.name}» irá a Archivados (papelera) durante{' '}
              {COMPANY_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma
              definitiva si no la restauras.
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
        relatedType="empresa"
        contactId={company.id}
        contactName={company.name}
        companyName={company.name}
        defaultAuthor={authorName}
        presetType={activityPresetType}
        onSaved={handleActivitySaved}
      />

      <div className="min-w-0 space-y-4">
          <div
            className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Secciones de la empresa"
          >
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => selectTab(id)}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors data-[selected]:bg-card data-[selected]:text-foreground data-[selected]:shadow-sm text-muted-foreground hover:text-foreground"
                data-selected={tab === id ? '' : undefined}
              >
                <Icon aria-hidden className="size-4 opacity-70" />
                {label}
                {id === 'ubicacion' && company.branches.length > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {company.branches.length}
                  </Badge>
                ) : null}
                {id === 'oportunidades' && opportunityCount > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {opportunityCount}
                  </Badge>
                ) : null}
                {id === 'contactos' && contactCount > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {contactCount}
                  </Badge>
                ) : null}
                {id === 'archivos' && company.files.length > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {company.files.length}
                  </Badge>
                ) : null}
              </button>
            ))}
          </div>

          {tab === 'detalle' ? (
            <div className="space-y-4">
              <CompanyDetailSidebar company={company} />
              {company.description?.trim() ? (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Descripción</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {company.description}
                    </p>
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
                  activities={company.activities}
                  entityKind="empresa"
                  onRegister={() => openRegisterActivity()}
                />
              </CardContent>
            </Card>
          ) : null}

          {tab === 'ubicacion' ? (
            <CompanyLocationsPanel
              company={company}
              onCompanyChange={handleLocationsChange}
            />
          ) : null}

          {tab === 'notas' ? (
            <EntityNotesPanel
              notes={company.notes}
              authorName={authorName}
              onAddNote={handleNoteAdded}
              onDeleteNote={handleNoteDeleted}
            />
          ) : null}

          {tab === 'oportunidades' ? (
            <CompanyOpportunitiesPanel
              company={company}
              onCountChange={setOpportunityCount}
            />
          ) : null}

          {tab === 'contactos' ? (
            <CompanyContactsPanel company={company} onCountChange={setContactCount} />
          ) : null}

          {tab === 'archivos' ? (
            <CompanyFilesPanel
              authorName={authorName}
              files={company.files}
              onFilesChange={handleFilesChange}
            />
          ) : null}
      </div>
    </PageScrollArea>
  )
}
