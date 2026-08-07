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
        <CardTitle className="text-base font-semibold">
          Datos de contacto y política (Art. 14 ter, letras a–c e i)
        </CardTitle>
        <CardDescription className="space-y-1.5">
          <span className="block">
            Aquí guardas lo mínimo operativo que Kora necesita conocer de <em>tu</em> organización
            como responsable: canal ARSOPB, enlace a tu política pública y referencia de retención.
          </span>
          <span className="block text-xs">
            No sustituye redactar ni publicar la política completa en tu sitio web (letras d–l y
            detalle de a–b).
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset disabled={readOnly || saving} className="space-y-4 border-0 p-0 m-0 min-w-0">
          <ContactFormInput
            id="privacy-contact-email"
            label="Correo de privacidad / ARSOPB (obligatorio en la práctica)"
            inputVariant="email"
            value={draft.privacyContactEmail}
            onChange={(privacyContactEmail) => patch({ privacyContactEmail })}
            placeholder="privacidad@tuempresa.cl"
          />
          <p className="text-xs text-muted-foreground -mt-2">
            <strong className="font-medium text-foreground/90">Para qué:</strong> Art. 14 ter letra
            c — medio fácil de acceso para que un titular te notifique acceso, rectificación,
            supresión, oposición, portabilidad o bloqueo. Debe ser un buzón que alguien de tu
            empresa revise. Publícalo también en tu web.
          </p>
          <ContactFormInput
            id="privacy-dpo"
            label="Delegado / encargado de prevención (opcional)"
            inputVariant="alphanumeric"
            value={draft.dpoName}
            onChange={(dpoName) => patch({ dpoName })}
            placeholder="Nombre del DPO o encargado interno"
          />
          <p className="text-xs text-muted-foreground -mt-2">
            <strong className="font-medium text-foreground/90">Para qué:</strong> Art. 14 ter letra
            b — si designaste a alguien interno o externo para privacidad, identifícalo. Si no
            tienes DPO formal, puedes dejar el nombre del responsable interno o vacío.
          </p>
          <ContactFormInput
            id="privacy-policy-url"
            label="URL de tu política de privacidad (recomendada)"
            inputVariant="alphanumeric"
            value={draft.privacyPolicyUrl}
            onChange={(privacyPolicyUrl) => patch({ privacyPolicyUrl })}
            placeholder="https://tuempresa.cl/privacidad"
          />
          <p className="text-xs text-muted-foreground -mt-2">
            <strong className="font-medium text-foreground/90">Para qué:</strong> Art. 14 ter letra
            a — enlace a la política <em>de tu empresa</em> (no la de Kora). Si está vacío, en la
            plataforma se puede seguir mostrando la política del software (
            {PLATFORM_PRIVACY_POLICY_PATH}), que no describe cómo tú tratas a tus clientes.
          </p>
          <ContactFormInput
            id="privacy-policy-version"
            label="Versión de esa política"
            inputVariant="alphanumeric"
            value={draft.privacyPolicyVersion}
            onChange={(privacyPolicyVersion) => patch({ privacyPolicyVersion })}
            placeholder="1.0"
          />
          <p className="text-xs text-muted-foreground -mt-2">
            <strong className="font-medium text-foreground/90">Para qué:</strong> Art. 14 ter letra
            a — la ley pide fecha y versión. Cuando actualices el documento en tu web, sube aquí el
            número (p. ej. 1.1) para dejar rastro interno.
          </p>
          <ContactFormInput
            id="privacy-retention-days"
            label="Retención máxima de datos (días) — referencia interna"
            inputVariant="integer"
            value={String(draft.dataRetentionDays)}
            onChange={(v) => patch({ dataRetentionDays: Number(v) || 2555 })}
          />
          <p className="text-xs text-muted-foreground -mt-2">
            <strong className="font-medium text-foreground/90">Para qué:</strong> Art. 14 ter letra
            i — plazo de conservación. Valor por defecto 2555 (~7 años) por usos comerciales /
            tributarios habituales en Chile; ajústalo a tu política real. Hoy es referencia
            documental: no borra automáticamente contactos ni archivos en Kora.
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
