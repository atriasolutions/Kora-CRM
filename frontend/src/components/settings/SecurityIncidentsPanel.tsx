import { Loader2, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import {
  createSecurityIncidentApi,
  listSecurityIncidentsApi,
  updateSecurityIncidentApi,
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
  SECURITY_INCIDENT_SEVERITY_LABELS,
  SECURITY_INCIDENT_STATUS_LABELS,
  type CreateSecurityIncidentInput,
  type SecurityIncident,
  type SecurityIncidentSeverity,
} from '@/types/privacy'

const SEVERITY_OPTIONS = Object.entries(SECURITY_INCIDENT_SEVERITY_LABELS).map(
  ([value, label]) => ({ value, label }),
)

export function SecurityIncidentsPanel() {
  const { canEdit, canView } = useModulePermissions('configuracion')
  const [items, setItems] = useState<SecurityIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CreateSecurityIncidentInput>({
    title: '',
    description: '',
    severity: 'medio',
  })

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    try {
      setItems(await listSecurityIncidentsApi())
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudieron cargar los incidentes.'))
    } finally {
      setLoading(false)
    }
  }, [canView])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async () => {
    if (!form.title.trim() || form.description.trim().length < 10) {
      toast.warning('Título y descripción (mín. 10 caracteres) son obligatorios.')
      return
    }
    setSaving(true)
    try {
      const created = await createSecurityIncidentApi({
        title: form.title.trim(),
        description: form.description.trim(),
        severity: form.severity,
        dataCategories: form.dataCategories?.trim() || undefined,
        affectedCountEstimate: form.affectedCountEstimate,
        measuresTaken: form.measuresTaken?.trim() || undefined,
      })
      setItems((prev) => [created, ...prev])
      setCreateOpen(false)
      setForm({ title: '', description: '', severity: 'medio' })
      toast.success('Incidente registrado. Evalúa notificación a APDP y titulares (Art. 14 sexies).')
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudo registrar el incidente.'))
    } finally {
      setSaving(false)
    }
  }

  const markNotified = async (id: string) => {
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const updated = await updateSecurityIncidentApi(id, {
        status: 'notificado',
        notifiedApdpAt: now,
        notifiedSubjectsAt: now,
      })
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
      toast.success('Incidente marcado como notificado.')
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudo actualizar.'))
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
            <CardTitle className="text-base font-semibold">Incidentes de seguridad</CardTitle>
            <CardDescription className="space-y-1.5">
              <span className="block">
                <strong className="font-medium text-foreground/90">Qué es:</strong> Art. 14 sexies
                (otro artículo, no el 14 ter). Bitácora de brechas: acceso no autorizado, pérdida o
                filtración de datos personales.
              </span>
              <span className="block text-xs">
                Sirve para documentar hechos, medidas y si notificaste a la APDP / titulares. Marcar
                «notificado» en Kora no envía el aviso legal: debes hacerlo por los canales oficiales
                y dejar aquí la evidencia.
              </span>
            </CardDescription>
          </div>
          {canEdit ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden className="size-4" />
              Registrar incidente
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Cargando…
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Sin incidentes registrados. Utiliza este módulo ante cualquier acceso no autorizado,
              pérdida o filtración de datos personales.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((inc) => (
                <li
                  key={inc.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{inc.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(inc.createdAt).toLocaleString('es-CL')} ·{' '}
                        {SECURITY_INCIDENT_SEVERITY_LABELS[inc.severity]}
                      </p>
                    </div>
                    <Badge variant={inc.status === 'cerrado' ? 'secondary' : 'default'}>
                      {SECURITY_INCIDENT_STATUS_LABELS[inc.status]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{inc.description}</p>
                  {canEdit && inc.status !== 'notificado' && inc.status !== 'cerrado' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      disabled={saving}
                      onClick={() => void markNotified(inc.id)}
                    >
                      Marcar notificado (APDP / titulares)
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar incidente de seguridad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <ContactFormInput
              id="inc-title"
              label="Título"
              inputVariant="alphanumeric"
              value={form.title}
              onChange={(title) => setForm((f) => ({ ...f, title }))}
              required
            />
            <ContactFormSelect
              id="inc-severity"
              label="Severidad"
              value={form.severity ?? 'medio'}
              onChange={(v) =>
                setForm((f) => ({ ...f, severity: v as SecurityIncidentSeverity }))
              }
              options={SEVERITY_OPTIONS}
            />
            <ContactFormTextarea
              id="inc-desc"
              label="Descripción del incidente"
              value={form.description}
              onChange={(description) => setForm((f) => ({ ...f, description }))}
              rows={4}
            />
            <ContactFormInput
              id="inc-categories"
              label="Categorías de datos afectados"
              inputVariant="alphanumeric"
              value={form.dataCategories ?? ''}
              onChange={(dataCategories) => setForm((f) => ({ ...f, dataCategories }))}
            />
            <ContactFormTextarea
              id="inc-measures"
              label="Medidas adoptadas"
              value={form.measuresTaken ?? ''}
              onChange={(measuresTaken) => setForm((f) => ({ ...f, measuresTaken }))}
              rows={2}
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
    </>
  )
}
