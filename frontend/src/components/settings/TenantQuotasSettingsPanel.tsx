import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { apiActionErrorMessage } from '@/api/errors'
import {
  bytesToGbLabel,
  getTenantQuotasApi,
  getTenantUsageApi,
  updateTenantQuotasApi,
  type TenantQuotasDto,
  type TenantUsageDto,
} from '@/api/tenant-quotas'
import { isApiEnabled } from '@/api/config'
import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { TenantCreateInstancePanel } from '@/components/settings/TenantCreateInstancePanel'
import { TenantDangerZonePanel } from '@/components/settings/TenantDangerZonePanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/lib/toast'

function gbFromBytes(bytes: number | null): string {
  if (bytes == null) return ''
  return (bytes / (1024 * 1024 * 1024)).toFixed(2)
}

export function TenantQuotasSettingsPanel() {
  const [quotas, setQuotas] = useState<TenantQuotasDto | null>(null)
  const [usage, setUsage] = useState<TenantUsageDto | null>(null)
  const [maxUsers, setMaxUsers] = useState('')
  const [maxRecordsGb, setMaxRecordsGb] = useState('')
  const [maxFilesGb, setMaxFilesGb] = useState('')
  const [gracePercent, setGracePercent] = useState('10')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!isApiEnabled()) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [q, u] = await Promise.all([getTenantQuotasApi(), getTenantUsageApi()])
      setQuotas(q)
      setUsage(u)
      setMaxUsers(q.maxActiveUsers != null ? String(q.maxActiveUsers) : '')
      setMaxRecordsGb(gbFromBytes(q.maxRecordsBytes))
      setMaxFilesGb(gbFromBytes(q.maxFilesBytes))
      setGracePercent(String(q.gracePercent ?? 10))
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudieron cargar las cuotas.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        maxActiveUsers: maxUsers.trim() ? Number.parseInt(maxUsers, 10) : null,
        maxRecordsGb: maxRecordsGb.trim() ? Number.parseFloat(maxRecordsGb) : null,
        maxFilesGb: maxFilesGb.trim() ? Number.parseFloat(maxFilesGb) : null,
        gracePercent: gracePercent.trim() ? Number.parseFloat(gracePercent) : 10,
      }
      const updated = await updateTenantQuotasApi(body)
      setQuotas(updated)
      toast.success('Límites de instancia guardados.')
      const u = await getTenantUsageApi(true)
      setUsage(u)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudieron guardar los límites.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        Cargando cuotas…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Límites de la instancia</CardTitle>
          <CardDescription>
            Solo visible para soporte de plataforma. Deja un campo vacío para no aplicar límite
            en esa dimensión.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ContactFormInput
            id="quota-max-users"
            label="Máx. usuarios internos (Activo + Por verificar)"
            inputVariant="integer"
            value={maxUsers}
            onChange={setMaxUsers}
            placeholder="Ej. 10"
          />
          <p className="text-xs text-muted-foreground sm:col-span-2 -mt-2">
            El cupo de usuarios con perfil Invitado se calcula automáticamente como 10× este valor
            {maxUsers.trim() ? ` (máx. ${Number.parseInt(maxUsers, 10) * 10} Invitados).` : '.'}
          </p>
          <ContactFormInput
            id="quota-grace"
            label="Tolerancia (%) registros y archivos"
            inputVariant="integer"
            value={gracePercent}
            onChange={setGracePercent}
            placeholder="10"
          />
          <ContactFormInput
            id="quota-records-gb"
            label="Almacenamiento registros (GB)"
            value={maxRecordsGb}
            onChange={setMaxRecordsGb}
            placeholder="Ej. 5"
          />
          <ContactFormInput
            id="quota-files-gb"
            label="Almacenamiento archivos (GB)"
            value={maxFilesGb}
            onChange={setMaxFilesGb}
            placeholder="Ej. 10"
          />
          <div className="sm:col-span-2 flex justify-end">
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                'Guardar límites'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {usage && quotas ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
          Uso actual: {usage.seatsUsed}
          {quotas.maxActiveUsers != null ? ` / ${quotas.maxActiveUsers}` : ''} internos · Invitados{' '}
          {usage.guestUsersUsed}
          {usage.maxGuestUsers != null ? ` / ${usage.maxGuestUsers}` : ''} · Registros{' '}
          {bytesToGbLabel(usage.recordsBytes)} GB
          {quotas.maxRecordsBytes != null
            ? ` / ${bytesToGbLabel(quotas.maxRecordsBytes)} GB`
            : ''}{' '}
          · Archivos {bytesToGbLabel(usage.filesBytes)} GB
          {quotas.maxFilesBytes != null ? ` / ${bytesToGbLabel(quotas.maxFilesBytes)} GB` : ''}
        </div>
      ) : null}

      <TenantCreateInstancePanel />

      <TenantDangerZonePanel />
    </div>
  )
}
