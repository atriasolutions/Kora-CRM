import { Download, Loader2, ShieldBan, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import {
  blockContactTreatmentApi,
  exportContactPortabilityApi,
  unblockContactTreatmentApi,
} from '@/api/privacy'
import { apiActionErrorMessage } from '@/api/errors'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ContactDetail } from '@/data/contact-detail.mock'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { toast } from '@/lib/toast'
import {
  CONTACT_LEGAL_BASIS_LABELS,
  type ContactLegalBasis,
} from '@/types/privacy'

type ContactPrivacyPanelProps = {
  contact: ContactDetail
  onContactUpdated?: () => void
}

export function ContactPrivacyPanel({ contact, onContactUpdated }: ContactPrivacyPanelProps) {
  const { canEdit, canView } = useModulePermissions('contactos')
  const [exporting, setExporting] = useState(false)
  const [blocking, setBlocking] = useState(false)

  if (!canView) return null

  const isBlocked = Boolean(contact.treatmentBlockedAt)

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await exportContactPortabilityApi(contact.id)
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `portabilidad-${contact.id.slice(0, 8)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('Exportación de portabilidad descargada.')
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudo exportar los datos.'))
    } finally {
      setExporting(false)
    }
  }

  const handleBlockToggle = async () => {
    if (!canEdit) return
    setBlocking(true)
    try {
      if (isBlocked) {
        await unblockContactTreatmentApi(contact.id)
        toast.success('Tratamiento desbloqueado.')
      } else {
        await blockContactTreatmentApi(contact.id)
        toast.success('Tratamiento bloqueado temporalmente.')
      }
      onContactUpdated?.()
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudo actualizar el bloqueo.'))
    } finally {
      setBlocking(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck aria-hidden className="size-4 text-primary" />
          Protección de datos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          {contact.treatmentOpposition ? (
            <Badge variant="outline">Oposición al tratamiento</Badge>
          ) : null}
          {isBlocked ? <Badge variant="destructive">Tratamiento bloqueado</Badge> : null}
          {contact.marketingConsent === true ? (
            <Badge variant="secondary">Consentimiento marketing</Badge>
          ) : contact.marketingConsent === false ? (
            <Badge variant="outline">Sin consentimiento marketing</Badge>
          ) : null}
        </div>

        {contact.legalBasis ? (
          <p className="text-muted-foreground">
            Base legal:{' '}
            <span className="font-medium text-foreground">
              {CONTACT_LEGAL_BASIS_LABELS[contact.legalBasis as ContactLegalBasis]}
            </span>
          </p>
        ) : null}

        {contact.marketingConsentAt ? (
          <p className="text-xs text-muted-foreground">
            Consentimiento marketing registrado:{' '}
            {new Date(contact.marketingConsentAt).toLocaleString('es-CL')}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={() => void handleExport()}
          >
            {exporting ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Download aria-hidden className="size-4" />
            )}
            Exportar portabilidad (JSON)
          </Button>
          {canEdit ? (
            <Button
              type="button"
              variant={isBlocked ? 'secondary' : 'outline'}
              size="sm"
              disabled={blocking}
              onClick={() => void handleBlockToggle()}
            >
              {blocking ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <ShieldBan aria-hidden className="size-4" />
              )}
              {isBlocked ? 'Desbloquear tratamiento' : 'Bloquear tratamiento'}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
