import { AlertTriangle, Loader2, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import {
  createPrivacyRequestApi,
  listPrivacyRequestsApi,
  updatePrivacyRequestApi,
} from '@/api/privacy'
import { apiActionErrorMessage } from '@/api/errors'
import {
  ContactFormInput,
  ContactFormSelect,
  ContactFormTextarea,
} from '@/components/contacts/ContactFormField'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { toast } from '@/lib/toast'
import {
  PRIVACY_REQUEST_STATUS_LABELS,
  PRIVACY_REQUEST_TYPE_LABELS,
  type CreatePrivacyRequestInput,
  type PrivacyRequest,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
} from '@/types/privacy'

const REQUEST_TYPES = Object.entries(PRIVACY_REQUEST_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const STATUS_OPTIONS = Object.entries(PRIVACY_REQUEST_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

function statusVariant(
  status: PrivacyRequestStatus,
  isOverdue: boolean,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (isOverdue && status !== 'completada' && status !== 'rechazada') return 'destructive'
  if (status === 'completada') return 'secondary'
  if (status === 'rechazada') return 'outline'
  return 'default'
}

export function PrivacyRequestsPanel() {
  const { canEdit, canView } = useModulePermissions('configuracion')
  const [items, setItems] = useState<PrivacyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<PrivacyRequest | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CreatePrivacyRequestInput>({
    requestType: 'acceso',
    subjectName: '',
    subjectEmail: '',
    channel: 'interno',
  })

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    try {
      setItems(await listPrivacyRequestsApi())
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudieron cargar las solicitudes.'))
    } finally {
      setLoading(false)
    }
  }, [canView])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async () => {
    if (!form.subjectName.trim() || !form.subjectEmail.trim()) {
      toast.warning('Nombre y correo del titular son obligatorios.')
      return
    }
    setSaving(true)
    try {
      const created = await createPrivacyRequestApi({
        ...form,
        subjectName: form.subjectName.trim(),
        subjectEmail: form.subjectEmail.trim(),
        subjectRut: form.subjectRut?.trim() || undefined,
        description: form.description?.trim() || undefined,
      })
      setItems((prev) => [created, ...prev])
      setCreateOpen(false)
      setForm({ requestType: 'acceso', subjectName: '', subjectEmail: '', channel: 'interno' })
      toast.success(`Solicitud ${created.requestCode} registrada. Plazo: 30 días corridos.`)
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudo crear la solicitud.'))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (
    id: string,
    status: PrivacyRequestStatus,
    extra?: { extendDeadline?: boolean; responseNotes?: string; rejectionReason?: string },
  ) => {
    setSaving(true)
    try {
      const updated = await updatePrivacyRequestApi(id, { status, ...extra })
      setItems((prev) => prev.map((r) => (r.id === id ? updated : r)))
      setDetail(updated)
      toast.success('Solicitud actualizada.')
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudo actualizar la solicitud.'))
    } finally {
      setSaving(false)
    }
  }

  if (!canView) return null

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">Solicitudes ARSOPB</CardTitle>
            <CardDescription className="space-y-1.5">
              <span className="block">
                <strong className="font-medium text-foreground/90">Qué es:</strong> bitácora interna
                cuando alguien pide acceso, rectificación, supresión, oposición, portabilidad o
                bloqueo de sus datos. No es el Art. 14 ter (transparencia pública); es evidencia de
                que respondiste a tiempo (accountability).
              </span>
              <span className="block text-xs">
                Plazo habitual de respuesta: 30 días corridos. Registrar aquí no borra ni exporta
                datos automáticamente: debes ejecutar la acción en el CRM (o fuera) y dejar
                constancia del resultado.
              </span>
            </CardDescription>
          </div>
          {canEdit ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden className="size-4" />
              Nueva solicitud
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Cargando solicitudes…
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Vacío por ahora. Cuando un cliente, empleado u otro titular te escriba pidiendo ver,
              corregir o borrar sus datos, créalo aquí el mismo día: así no se te pasa el plazo de
              30 días y dejas evidencia de que gestionaste el derecho.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Código</th>
                    <th className="py-2 pr-3 font-medium">Tipo</th>
                    <th className="py-2 pr-3 font-medium">Titular</th>
                    <th className="py-2 pr-3 font-medium">Estado</th>
                    <th className="py-2 pr-3 font-medium">Plazo</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-3 pr-3 font-mono text-xs">{row.requestCode}</td>
                      <td className="py-3 pr-3">{PRIVACY_REQUEST_TYPE_LABELS[row.requestType]}</td>
                      <td className="py-3 pr-3">
                        <div className="font-medium">{row.subjectName}</div>
                        <div className="text-xs text-muted-foreground">{row.subjectEmail}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant={statusVariant(row.status, row.isOverdue)}>
                          {PRIVACY_REQUEST_STATUS_LABELS[row.status]}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3">
                        {row.status === 'completada' || row.status === 'rechazada' ? (
                          '—'
                        ) : row.isOverdue ? (
                          <span className="flex items-center gap-1 text-destructive">
                            <AlertTriangle aria-hidden className="size-3.5" />
                            Vencida ({Math.abs(row.daysRemaining)} d)
                          </span>
                        ) : (
                          `${row.daysRemaining} días`
                        )}
                      </td>
                      <td className="py-3 text-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetail(row)}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar solicitud ARSOPB</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <ContactFormSelect
              id="pr-type"
              label="Tipo de derecho"
              value={form.requestType}
              onChange={(v) => setForm((f) => ({ ...f, requestType: v as PrivacyRequestType }))}
              options={REQUEST_TYPES}
            />
            <ContactFormInput
              id="pr-name"
              label="Nombre del titular"
              inputVariant="alphanumeric"
              value={form.subjectName}
              onChange={(subjectName) => setForm((f) => ({ ...f, subjectName }))}
              required
            />
            <ContactFormInput
              id="pr-email"
              label="Correo del titular"
              inputVariant="email"
              value={form.subjectEmail}
              onChange={(subjectEmail) => setForm((f) => ({ ...f, subjectEmail }))}
              required
            />
            <ContactFormInput
              id="pr-rut"
              label="RUT (opcional)"
              inputVariant="alphanumeric"
              value={form.subjectRut ?? ''}
              onChange={(subjectRut) => setForm((f) => ({ ...f, subjectRut }))}
            />
            <ContactFormTextarea
              id="pr-desc"
              label="Descripción"
              value={form.description ?? ''}
              onChange={(description) => setForm((f) => ({ ...f, description }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleCreate()}>
              {saving ? 'Guardando…' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle>Solicitud {detail.requestCode}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Tipo:</span>{' '}
                  {PRIVACY_REQUEST_TYPE_LABELS[detail.requestType]}
                </p>
                <p>
                  <span className="text-muted-foreground">Titular:</span> {detail.subjectName} (
                  {detail.subjectEmail})
                </p>
                {detail.description ? (
                  <p className="rounded-md bg-muted/40 p-3">{detail.description}</p>
                ) : null}
                {canEdit ? (
                  <ContactFormSelect
                    id="pr-status"
                    label="Estado"
                    value={detail.status}
                    onChange={(status) =>
                      void handleUpdateStatus(detail.id, status as PrivacyRequestStatus)
                    }
                    options={STATUS_OPTIONS}
                    disabled={saving}
                  />
                ) : null}
                {canEdit && detail.status !== 'completada' && detail.status !== 'rechazada' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving || Boolean(detail.extendedDueAt)}
                    onClick={() =>
                      void handleUpdateStatus(detail.id, 'prorrogada', { extendDeadline: true })
                    }
                  >
                    Prorrogar 30 días (una vez)
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
