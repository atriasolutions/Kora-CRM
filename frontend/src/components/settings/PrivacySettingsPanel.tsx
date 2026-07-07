import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { apiActionErrorMessage } from '@/api/errors'
import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'
import { organizationPrivacySettingsFrom } from '@/lib/organization-settings'
import { PLATFORM_PRIVACY_POLICY_PATH } from '@/lib/platform-legal'
import type { OrganizationSettings } from '@/types/organization-settings'

export function PrivacySettingsPanel() {
  const { canEdit } = useModulePermissions('configuracion')
  const { settings, isLoading, saveSettings } = useOrganizationSettings()
  const [draft, setDraft] = useState<OrganizationSettings>(settings)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const patch = useCallback((partial: Partial<OrganizationSettings>) => {
    setDraft((prev) => ({ ...prev, ...partial }))
  }, [])

  const readOnly = !canEdit || isLoading

  const handleSave = async () => {
    if (!canEdit) return
    const email = draft.privacyContactEmail.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.warning('El correo de privacidad no es válido.')
      return
    }
    const url = draft.privacyPolicyUrl.trim()
    if (url && !/^https?:\/\//i.test(url)) {
      toast.warning('La URL de política debe comenzar con http:// o https://')
      return
    }
    setSaving(true)
    try {
      await saveSettings(organizationPrivacySettingsFrom(draft))
      toast.success('Configuración de privacidad guardada.')
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo guardar la configuración.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Política y contacto de privacidad</CardTitle>
        <CardDescription>
          Datos del responsable del tratamiento para tu organización (Ley 21.719, Art. 14 ter).
          Los titulares podrán ejercer derechos ARSOPB mediante el canal indicado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset disabled={readOnly || saving} className="space-y-4 border-0 p-0 m-0 min-w-0">
          <ContactFormInput
            id="privacy-contact-email"
            label="Correo de privacidad / ARSOPB"
            inputVariant="email"
            value={draft.privacyContactEmail}
            onChange={(privacyContactEmail) => patch({ privacyContactEmail })}
            placeholder="privacidad@tuempresa.cl"
          />
          <p className="text-xs text-muted-foreground -mt-2">
            Canal para solicitudes de acceso, rectificación, supresión, oposición, portabilidad y
            bloqueo.
          </p>
          <ContactFormInput
            id="privacy-dpo"
            label="Delegado de protección de datos (opcional)"
            inputVariant="alphanumeric"
            value={draft.dpoName}
            onChange={(dpoName) => patch({ dpoName })}
            placeholder="Nombre del DPO o encargado interno"
          />
          <ContactFormInput
            id="privacy-policy-url"
            label="URL de política de privacidad (opcional)"
            inputVariant="alphanumeric"
            value={draft.privacyPolicyUrl}
            onChange={(privacyPolicyUrl) => patch({ privacyPolicyUrl })}
            placeholder="https://tuempresa.cl/privacidad"
          />
          <p className="text-xs text-muted-foreground -mt-2">
            Si no indicas URL, se referencia la política de plataforma ({PLATFORM_PRIVACY_POLICY_PATH}
            ).
          </p>
          <ContactFormInput
            id="privacy-policy-version"
            label="Versión de política"
            inputVariant="alphanumeric"
            value={draft.privacyPolicyVersion}
            onChange={(privacyPolicyVersion) => patch({ privacyPolicyVersion })}
            placeholder="1.0"
          />
          <ContactFormInput
            id="privacy-retention-days"
            label="Retención máxima de datos (días)"
            inputVariant="integer"
            value={String(draft.dataRetentionDays)}
            onChange={(v) => patch({ dataRetentionDays: Number(v) || 2555 })}
          />
          <p className="text-xs text-muted-foreground -mt-2">
            Referencia para políticas internas. Por defecto 2555 días (~7 años) para datos
            comerciales.
          </p>
        </fieldset>
        {canEdit ? (
          <div className="flex justify-end border-t border-border pt-4">
            <Button type="button" disabled={readOnly || saving} onClick={() => void handleSave()}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
