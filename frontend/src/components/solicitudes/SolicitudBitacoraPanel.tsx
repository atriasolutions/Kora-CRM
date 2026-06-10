import { ChevronRight, Clock, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { CreateBitacoraDialog } from '@/components/bitacora/CreateBitacoraDialog'
import { RelatedEntityList } from '@/components/shared/RelatedEntityList'
import { isApiEnabled } from '@/api/config'
import { listBitacoraForSolicitudApi } from '@/api/bitacora'
import type { SolicitudDetail } from '@/data/solicitudes.mock'
import type { BitacoraListItem } from '@/data/bitacora.mock'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBitacoraRegistry } from '@/hooks/use-bitacora-registry'
import { toast } from '@/lib/toast'
import {
  bitacoraInitialFromSolicitud,
  formatBitacoraHours,
  formatBitacoraWorkDate,
  type BitacoraFormValues,
} from '@/lib/bitacora-form'

type SolicitudBitacoraPanelProps = {
  solicitud: SolicitudDetail
  canViewBitacora: boolean
  canCreateBitacora: boolean
  onCountChange?: (count: number) => void
}

function bitacoraForSolicitudFromList(
  solicitudId: string,
  all: BitacoraListItem[],
): BitacoraListItem[] {
  return all.filter((b) => b.solicitudId === solicitudId)
}

export function SolicitudBitacoraPanel({
  solicitud,
  canViewBitacora,
  canCreateBitacora,
  onCountChange,
}: SolicitudBitacoraPanelProps) {
  const navigate = useNavigate()
  const { allBitacora, addBitacora } = useBitacoraRegistry()
  const [createOpen, setCreateOpen] = useState(false)
  const [apiEntries, setApiEntries] = useState<BitacoraListItem[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!canViewBitacora) {
      setApiEntries([])
      return
    }
    if (!isApiEnabled()) {
      setApiEntries(null)
      return
    }
    let cancelled = false
    setLoading(true)
    void listBitacoraForSolicitudApi(solicitud.id)
      .then((items) => {
        if (!cancelled) setApiEntries(items)
      })
      .catch(() => {
        if (!cancelled) setApiEntries([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [canViewBitacora, solicitud.id])

  const related = useMemo(() => {
    if (!canViewBitacora) return []
    if (isApiEnabled()) return apiEntries ?? []
    return bitacoraForSolicitudFromList(solicitud.id, allBitacora)
  }, [allBitacora, apiEntries, canViewBitacora, solicitud.id])

  const createInitial = useMemo(
    () =>
      bitacoraInitialFromSolicitud({
        id: solicitud.id,
        code: solicitud.code,
        title: solicitud.title,
        assignee: solicitud.assignee,
        assigneeUserId: solicitud.assigneeUserId,
      }),
    [solicitud],
  )

  useEffect(() => {
    onCountChange?.(related.length)
  }, [onCountChange, related.length])

  const totalHours = useMemo(
    () => related.reduce((sum, item) => sum + item.hours, 0),
    [related],
  )

  const handleCreate = async (values: BitacoraFormValues) => {
    const item = await addBitacora(values)
    if (isApiEnabled()) {
      setApiEntries((prev) => {
        const next = prev ?? []
        if (next.some((b) => b.id === item.id)) return next
        return [item, ...next]
      })
    }
    toast.success('Bitácora registrada correctamente.')
    navigate(`/bitacora/${item.id}`)
  }

  if (!canViewBitacora) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No tienes permiso para ver la bitácora de esta solicitud.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">Bitácora</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {related.length} registro{related.length === 1 ? '' : 's'} ·{' '}
              {formatBitacoraHours(totalHours)} h totales
            </p>
          </div>
          {canCreateBitacora ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              Nueva bitácora
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando bitácora…</p>
          ) : related.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Clock className="size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Aún no hay horas registradas para esta solicitud.
              </p>
              {canCreateBitacora ? (
                <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                  Registrar horas
                </Button>
              ) : null}
            </div>
          ) : (
            <RelatedEntityList
              items={related}
              searchPlaceholder="Buscar registros…"
              searchFilter={(item, q) =>
                item.description.toLowerCase().includes(q) ||
                item.assignedUserName.toLowerCase().includes(q) ||
                formatBitacoraWorkDate(item.workDate).toLowerCase().includes(q)
              }
              renderItem={(item) => (
                <li key={item.id}>
                  <Link
                    to={`/bitacora/${item.id}`}
                    className="group flex flex-col gap-3 rounded-lg border border-border px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted/60">
                        <Clock aria-hidden className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground group-hover:text-primary">
                          {formatBitacoraWorkDate(item.workDate)} ·{' '}
                          {formatBitacoraHours(item.hours)} h
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {item.assignedUserName}
                        </p>
                        {item.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:shrink-0">
                      <Badge variant={item.isBillable ? 'default' : 'secondary'}>
                        {item.isBillable ? 'Facturable' : 'No facturable'}
                      </Badge>
                      <ChevronRight
                        aria-hidden
                        className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </div>
                  </Link>
                </li>
              )}
            />
          )}
          {related.length > 0 ? (
            <div className="mt-4 text-right">
              <Button variant="link" size="sm" className="h-auto p-0" asChild>
                <Link to="/bitacora">Ver bitácora completa</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CreateBitacoraDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialValues={createInitial}
        lockSolicitud
        title="Nueva bitácora"
        description={`Registre horas para la solicitud ${solicitud.code}.`}
        onSubmit={handleCreate}
      />
    </>
  )
}
