import { useState } from 'react'
import { Check, Plus, Trash2, X } from 'lucide-react'

import { ContactFormDateInput, ContactFormTextarea } from '@/components/contacts/ContactFormField'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WorkerDetail } from '@/data/workers.mock'
import {
  createVacationApi,
  deleteVacationApi,
  updateVacationApi,
} from '@/api/workers'
import { apiActionErrorMessage } from '@/api/errors'
import { formatPurchaseDisplayDate } from '@/lib/purchase-dates'
import { formatVacationDays } from '@/lib/worker-display'
import { toast } from '@/lib/toast'
import type { BadgeVariant } from '@/types/list-module'

function vacationVariant(status: string): BadgeVariant {
  switch (status) {
    case 'Aprobada':
      return 'customer'
    case 'Rechazada':
      return 'destructive'
    default:
      return 'muted'
  }
}

type WorkerVacationsPanelProps = {
  worker: WorkerDetail
  canEdit: boolean
  onChanged: () => void
}

export function WorkerVacationsPanel({ worker, canEdit, onChanged }: WorkerVacationsPanelProps) {
  const [startDate, setStartDate] = useState(() => formatPurchaseDisplayDate(new Date()))
  const [endDate, setEndDate] = useState(() => formatPurchaseDisplayDate(new Date()))
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const summary = worker.vacationSummary

  const handleCreate = async () => {
    if (!startDate.trim() || !endDate.trim()) {
      toast.error('Indica las fechas de la solicitud.')
      return
    }
    setBusy(true)
    try {
      await createVacationApi(worker.id, {
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        notes: notes.trim() || undefined,
      })
      setNotes('')
      toast.success('Solicitud de vacaciones creada.')
      onChanged()
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo crear la solicitud.'))
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (vacationId: string, status: 'Aprobada' | 'Rechazada') => {
    try {
      await updateVacationApi(worker.id, vacationId, { status })
      toast.success(`Solicitud ${status.toLowerCase()}.`)
      onChanged()
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo actualizar la solicitud.'))
    }
  }

  const handleDelete = async (vacationId: string) => {
    try {
      await deleteVacationApi(worker.id, vacationId)
      toast.success('Solicitud eliminada.')
      onChanged()
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo eliminar la solicitud.'))
    }
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Saldo de vacaciones</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryStat label="Acumulados" value={formatVacationDays(summary.accruedDays)} />
          <SummaryStat label="Usados" value={formatVacationDays(summary.usedDays)} />
          <SummaryStat label="Ajuste" value={formatVacationDays(summary.adjustmentDays)} />
          <SummaryStat
            label="Saldo disponible"
            value={formatVacationDays(summary.balanceDays)}
            highlight
          />
        </CardContent>
      </Card>

      {canEdit ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Nueva solicitud</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <ContactFormDateInput
                id="vac-start"
                label="Desde"
                value={startDate}
                onChange={setStartDate}
              />
              <ContactFormDateInput
                id="vac-end"
                label="Hasta"
                value={endDate}
                onChange={setEndDate}
              />
            </div>
            <ContactFormTextarea
              id="vac-notes"
              label="Notas (opcional)"
              value={notes}
              onChange={setNotes}
              rows={2}
            />
            <div className="flex justify-end">
              <Button type="button" size="sm" disabled={busy} onClick={handleCreate}>
                <Plus aria-hidden className="size-4" />
                Solicitar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          {worker.vacations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin solicitudes registradas.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {worker.vacations.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {v.startDate} → {v.endDate}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatVacationDays(v.days)}
                      {v.notes ? ` · ${v.notes}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={vacationVariant(v.status)}>{v.status}</Badge>
                    {canEdit && v.status === 'Pendiente' ? (
                      <>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 text-emerald-600"
                          aria-label="Aprobar"
                          onClick={() => setStatus(v.id, 'Aprobada')}
                        >
                          <Check aria-hidden className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive"
                          aria-label="Rechazar"
                          onClick={() => setStatus(v.id, 'Rechazada')}
                        >
                          <X aria-hidden className="size-4" />
                        </Button>
                      </>
                    ) : null}
                    {canEdit ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label="Eliminar"
                        onClick={() => handleDelete(v.id)}
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={highlight ? 'text-lg font-semibold text-primary' : 'text-lg font-semibold text-foreground'}>
        {value}
      </p>
    </div>
  )
}
