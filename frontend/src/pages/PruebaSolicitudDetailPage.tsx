import { ArrowLeft, ChevronRight, ClipboardList, Save } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { PruebaCasosTable } from '@/components/pruebas-solicitud/PruebaCasosTable'
import { ContactFormField } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import {
  clientReviewPruebaCasoApi,
  updatePruebaCasosApi,
  updatePruebaSolicitudApi,
} from '@/api/pruebas-solicitud'
import { apiActionErrorMessage } from '@/api/errors'
import type { PruebaCaso, PruebaSolicitudDetail } from '@/data/pruebas-solicitud.mock'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useAuth } from '@/hooks/use-auth'
import {
  canGuestCreatePrueba,
  isGuestPruebaEditor,
} from '@/lib/prueba-solicitud-guest-access'
import { formatPruebaClientProgress } from '@/lib/prueba-solicitud-form'
import { formatChileDateLabel } from '@/lib/chile-timezone'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { loadPruebaSolicitudDetail } from '@/lib/entity-detail-loaders'
import { toast } from '@/lib/toast'
import {
  clonePruebaCasoEvidenceMedia,
  duplicatePruebaCasoDraft,
} from '@/lib/prueba-caso-duplicate'
import { casoHasEvidence, displayPruebaCaseNumber } from '@/lib/prueba-caso-display'
import { persistPruebaCasoFiles } from '@/lib/prueba-caso-files'
import { listEntityFiles } from '@/lib/entity-files-storage'
import {
  hydrateDescriptionHtml,
  persistSolicitudDescriptionMedia,
  serializeDescriptionHtml,
  hasUnresolvedDescriptionFileIds,
} from '@/lib/solicitud-description-media'

export function PruebaSolicitudDetailPage() {
  const navigate = useNavigate()
  const { pruebaId } = useParams<{ pruebaId: string }>()
  const { profile } = useAuth()
  const { canEdit } = useModulePermissions('pruebas_solicitud')
  const isGuest = isGuestPruebaEditor(profile)
  const [detail, setDetail] = useState<PruebaSolicitudDetail | null>(null)
  const [cases, setCases] = useState<PruebaCaso[]>([])
  const [description, setDescription] = useState('')
  const [executedAt, setExecutedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [caseActionBusy, setCaseActionBusy] = useState(false)

  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: pruebaId,
    load: loadPruebaSolicitudDetail,
    onLoaded: (id, data) => {
      setDetail(data)
      setCases(data.cases)
      setDescription(data.description)
      setExecutedAt(data.executedAt?.slice(0, 10) ?? '')
      recordEntityView('pruebas_solicitud', id)
    },
  })

  const prepareCasesForApi = useCallback((nextCases: PruebaCaso[]) => {
    return nextCases.map((caso) => {
      const evidenceHtml = serializeDescriptionHtml(caso.evidenceHtml)
      if (hasUnresolvedDescriptionFileIds(evidenceHtml)) {
        throw new Error(
          `El caso ${caso.code} tiene imágenes sin guardar. Abre «Gestionar evidencias» y pulsa «Guardar evidencias».`,
        )
      }
      return { ...caso, evidenceHtml }
    })
  }, [])

  const persistCases = useCallback(
    async (nextCases: PruebaCaso[]) => {
      if (!detail || !canEdit || isGuest) return
      try {
        const preparedCases = prepareCasesForApi(nextCases)
        const saved = await updatePruebaCasosApi(detail.id, preparedCases)
        setDetail(saved)
        setCases(saved.cases)
        return saved
      } catch (error) {
        toast.error(apiActionErrorMessage(error, 'No se pudo guardar el caso.'))
        throw error
      }
    },
    [detail, canEdit, isGuest, prepareCasesForApi],
  )

  const handlePersistCase = useCallback(
    async (nextCases: PruebaCaso[]) => {
      await persistCases(nextCases)
      toast.success('Caso guardado.')
    },
    [persistCases],
  )

  const handleDuplicateCase = useCallback(
    async (index: number) => {
      if (!detail || !canEdit || isGuest) return
      const source = cases[index]
      if (!source) return

      setCaseActionBusy(true)
      try {
        const draft = duplicatePruebaCasoDraft(source, cases.length, detail.code)
        const nextCases = [...cases, draft]
        const saved = await persistCases(nextCases)
        if (!saved) return

        const newCaso = saved.cases[saved.cases.length - 1]
        if (!newCaso || !casoHasEvidence(source.evidenceHtml)) {
          toast.success('Caso duplicado.')
          return
        }

        if (source.id.startsWith('caso-temp-')) {
          const withEvidence = saved.cases.map((caso) =>
            caso.id === newCaso.id ? { ...caso, evidenceHtml: source.evidenceHtml } : caso,
          )
          await persistCases(withEvidence)
          toast.success('Caso duplicado.')
          return
        }

        const sourceFiles = await listEntityFiles('prueba_caso', source.id)
        const { html, files } = clonePruebaCasoEvidenceMedia(source.evidenceHtml, sourceFiles)

        if (!html.trim() && !files.length) {
          toast.success('Caso duplicado.')
          return
        }

        const result = await persistSolicitudDescriptionMedia(
          newCaso.id,
          newCaso.code,
          hydrateDescriptionHtml(html, files),
          files,
          persistPruebaCasoFiles,
        )

        const withEvidence = saved.cases.map((caso) =>
          caso.id === newCaso.id ? { ...caso, evidenceHtml: result.description } : caso,
        )
        await persistCases(withEvidence)
        toast.success('Caso duplicado con evidencias.')
      } catch (error) {
        toast.error(apiActionErrorMessage(error, 'No se pudo duplicar el caso.'))
      } finally {
        setCaseActionBusy(false)
      }
    },
    [detail, canEdit, isGuest, cases, persistCases],
  )

  const handleDeleteCase = useCallback(
    async (index: number) => {
      if (!detail || !canEdit || isGuest) return
      const caso = cases[index]
      if (!caso) return

      setCaseActionBusy(true)
      try {
        const nextCases = cases.filter((_, i) => i !== index)
        await persistCases(nextCases)
        toast.success(`${displayPruebaCaseNumber(caso.code)} eliminado.`)
      } catch (error) {
        toast.error(apiActionErrorMessage(error, 'No se pudo eliminar el caso.'))
      } finally {
        setCaseActionBusy(false)
      }
    },
    [detail, canEdit, isGuest, cases, persistCases],
  )

  const handleSave = async () => {
    if (!detail || !canEdit) return
    setSaving(true)
    try {
      if (!isGuest) {
        await updatePruebaSolicitudApi(detail.id, {
          description,
          executedAt: executedAt || null,
        })
        const preparedCases = prepareCasesForApi(cases)
        const saved = await updatePruebaCasosApi(detail.id, preparedCases)
        setDetail(saved)
        setCases(saved.cases)
        toast.success('Prueba guardada.')
      }
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo guardar la prueba.'))
    } finally {
      setSaving(false)
    }
  }

  const handleClientReview = async (
    casoId: string,
    patch: { clientOk: boolean; clientNotes: string },
  ) => {
    if (!detail) return
    try {
      const saved = await clientReviewPruebaCasoApi(detail.id, casoId, patch)
      setDetail(saved)
      setCases(saved.cases)
      toast.success('Revisión del cliente guardada.')
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo guardar la revisión.'))
    }
  }

  if (loadState === 'loading') return <RecordDetailLoading />
  if (loadState === 'unavailable' || !detail) {
    return (
      <RecordUnavailableView
        reason={reason}
        detail={unavailableDetail}
        moduleKey="pruebas_solicitud"
        onRetry={reload}
      />
    )
  }

  const executorOkCount = cases.filter((c) => c.executorOk === true).length

  return (
    <PageScrollArea className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={() => navigate('/pruebas-solicitud')}>
          <ArrowLeft className="size-4" />
          Pruebas
        </Button>
        <ChevronRight className="size-4" />
        <span className="font-medium text-foreground">{detail.code}</span>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">{detail.code}</CardTitle>
            <p className="text-sm text-muted-foreground">
              <Link to={`/solicitudes/${detail.solicitudId}`} className="text-primary hover:underline">
                {detail.solicitudCode} · {detail.solicitudTitle}
              </Link>
            </p>
          </div>
          {!isGuest && canEdit ? (
            <Button type="button" onClick={() => void handleSave()} disabled={saving} className="gap-2">
              <Save className="size-4" />
              Guardar
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Casos</p>
            <p className="text-lg font-semibold">{cases.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">OK ejecutor</p>
            <p className="text-lg font-semibold">{executorOkCount}/{cases.length || 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">OK cliente</p>
            <p className="text-lg font-semibold">
              {formatPruebaClientProgress(detail.clientOkCount, detail.caseCount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ejecución</p>
            <p className="text-lg font-semibold">
              {detail.executedAt ? formatChileDateLabel(detail.executedAt) : '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      {!isGuest && canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cabecera</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <ContactFormField label="Descripción" className="md:col-span-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </ContactFormField>
            <ContactFormField label="Fecha ejecución">
              <input
                type="date"
                value={executedAt}
                onChange={(e) => setExecutedAt(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </ContactFormField>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Descripción</p>
            <p className="mt-1 text-sm">{detail.description || '—'}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4" />
            Casos de prueba
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PruebaCasosTable
            pruebaCode={detail.code}
            cases={cases}
            onChange={setCases}
            onPersist={!isGuest && canEdit ? handlePersistCase : undefined}
            onDuplicateCase={!isGuest && canEdit ? handleDuplicateCase : undefined}
            onDeleteCase={!isGuest && canEdit ? handleDeleteCase : undefined}
            caseActionsBusy={caseActionBusy}
            onClientReview={handleClientReview}
            readOnly={!canEdit}
            canAdd={!isGuest && canEdit && canGuestCreatePrueba(profile)}
          />
        </CardContent>
      </Card>
    </PageScrollArea>
  )
}
