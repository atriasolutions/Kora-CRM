import { ChevronRight, ClipboardCheck, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { CreatePruebaSolicitudDialog } from '@/components/pruebas-solicitud/CreatePruebaSolicitudDialog'
import { RelatedEntityList } from '@/components/shared/RelatedEntityList'
import { isApiEnabled } from '@/api/config'
import { listPruebasForSolicitudApi } from '@/api/pruebas-solicitud'
import type { SolicitudDetail } from '@/data/solicitudes.mock'
import type { PruebaSolicitudListItem } from '@/data/pruebas-solicitud.mock'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePruebasSolicitudRegistry } from '@/hooks/use-pruebas-solicitud-registry'
import { useAuth } from '@/hooks/use-auth'
import { canGuestCreatePrueba } from '@/lib/prueba-solicitud-guest-access'
import { formatPruebaClientProgress } from '@/lib/prueba-solicitud-form'
import type { PruebaSolicitudFormValues } from '@/lib/prueba-solicitud-form'
import { formatChileDateLabel } from '@/lib/chile-timezone'
import { toast } from '@/lib/toast'
import { apiActionErrorMessage } from '@/api/errors'

type SolicitudPruebasPanelProps = {
  solicitud: SolicitudDetail
  canView: boolean
  canCreate: boolean
  onCountChange?: (count: number) => void
}

export function SolicitudPruebasPanel({
  solicitud,
  canView,
  canCreate,
  onCountChange,
}: SolicitudPruebasPanelProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { allPruebas, addPrueba } = usePruebasSolicitudRegistry()
  const [createOpen, setCreateOpen] = useState(false)
  const [apiItems, setApiItems] = useState<PruebaSolicitudListItem[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!canView) {
      setApiItems([])
      return
    }
    if (!isApiEnabled()) {
      setApiItems(null)
      return
    }
    let cancelled = false
    setLoading(true)
    void listPruebasForSolicitudApi(solicitud.id)
      .then((items) => {
        if (!cancelled) setApiItems(items)
      })
      .catch(() => {
        if (!cancelled) setApiItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [canView, solicitud.id])

  const related = useMemo(() => {
    if (!canView) return []
    if (isApiEnabled()) return apiItems ?? []
    return allPruebas.filter((p) => p.solicitudId === solicitud.id)
  }, [allPruebas, apiItems, canView, solicitud.id])

  useEffect(() => {
    onCountChange?.(related.length)
  }, [related.length, onCountChange])

  const showCreate = canCreate && canGuestCreatePrueba(profile)

  const handleCreate = async (values: PruebaSolicitudFormValues) => {
    try {
      const created = await addPrueba({
        solicitudId: values.solicitudId,
        description: values.description.trim() || undefined,
        executedAt: values.executedAt || undefined,
      })
      toast.success('Prueba creada.')
      navigate(`/pruebas-solicitud/${created.id}`)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo crear la prueba.'))
      throw error
    }
  }

  if (!canView) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No tienes permiso para ver pruebas de solicitud.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="size-4" />
            Pruebas de solicitud
          </CardTitle>
          {showCreate ? (
            <Button type="button" size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Nueva prueba
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando pruebas…</p>
          ) : related.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay pruebas documentadas para esta solicitud.
            </p>
          ) : (
            <RelatedEntityList
              items={related}
              searchPlaceholder="Buscar pruebas…"
              searchFilter={(item, q) =>
                item.code.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q)
              }
              renderItem={(item) => (
                <li key={item.id}>
                  <Link
                    to={`/pruebas-solicitud/${item.id}`}
                    className="group flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground group-hover:text-primary">
                        {item.code}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.description || 'Sin descripción'} ·{' '}
                        {item.executedAt ? formatChileDateLabel(item.executedAt) : '—'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.caseCount} caso{item.caseCount === 1 ? '' : 's'} ·{' '}
                        {formatPruebaClientProgress(item.clientOkCount, item.caseCount)} OK cliente
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              )}
            />
          )}
        </CardContent>
      </Card>

      <CreatePruebaSolicitudDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        initialValues={{
          solicitudId: solicitud.id,
          solicitudCode: solicitud.code,
          solicitudTitle: solicitud.title,
          description: solicitud.title,
        }}
      />
    </>
  )
}
