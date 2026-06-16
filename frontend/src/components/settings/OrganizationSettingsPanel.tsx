import { RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { AvatarImageUpload } from '@/components/shared/AvatarImageUpload'
import { RegionCommuneFields } from '@/components/shared/RegionCommuneFields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'
import {
  defaultOrganizationSettings,
  organizationIssuerSettingsFrom,
  validateOrganizationIssuerSettings,
} from '@/lib/organization-settings'
import {
  KORA_DEFAULT_LOGO_URL,
  resolveOrganizationLogoUrl,
} from '@/lib/organization-logo'
import type { OrganizationSettings } from '@/types/organization-settings'

export function OrganizationSettingsPanel() {
  const { canEdit } = useModulePermissions('configuracion')
  const { settings, isLoading, saveSettings, resetSettings } = useOrganizationSettings()
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
    const issuerDraft = organizationIssuerSettingsFrom(draft)
    const validation = validateOrganizationIssuerSettings(issuerDraft)
    if (validation) {
      toast.warning(validation)
      return
    }
    setSaving(true)
    try {
      await saveSettings(issuerDraft)
      toast.success(
        'Datos de empresa guardados. Se aplican en cotizaciones y órdenes de compra (PDF).',
      )
    } catch (err) {
      console.error(err)
      toast.error('No se pudieron guardar los datos de la empresa.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const defaults = defaultOrganizationSettings()
    resetSettings()
    setDraft(defaults)
    toast.success('Empresa restaurada a los valores predeterminados.')
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Empresa emisora</CardTitle>
          <CardDescription>
            Razón social, logo y contacto que aparecen en cotizaciones y órdenes de compra. El logo
            debe ser PNG o JPG para el PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <fieldset disabled={readOnly} className="space-y-6 border-0 p-0 m-0 min-w-0">
          <AvatarImageUpload
            value={resolveOrganizationLogoUrl(draft.logoUrl)}
            onChange={(logoUrl) =>
              patch({
                logoUrl:
                  !logoUrl.trim() || logoUrl === KORA_DEFAULT_LOGO_URL ? '' : logoUrl,
              })
            }
            fallbackLabel={draft.tradeName || draft.legalName}
            shape="rounded"
            size="lg"
            uploadLabel="Subir logo"
          />
          {!draft.logoUrl.trim() ? (
            <p className="text-xs text-muted-foreground">
              Sin logo personalizado se usa el logo de Kora en la app y en los PDF.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <ContactFormInput
              id="org-legal"
              label="Razón social"
              value={draft.legalName}
              onChange={(legalName) => patch({ legalName })}
            />
            <ContactFormInput
              id="org-trade"
              label="Nombre comercial"
              value={draft.tradeName}
              onChange={(tradeName) => patch({ tradeName })}
            />
            <ContactFormInput
              id="org-tagline"
              label="Lema / subtítulo"
              value={draft.tagline}
              onChange={(tagline) => patch({ tagline })}
              className="sm:col-span-2"
            />
            <ContactFormInput
              id="org-rut"
              label="RUT"
              value={draft.rut}
              onChange={(rut) => patch({ rut })}
            />
            <ContactFormInput
              id="org-giro"
              label="Giro"
              value={draft.giro}
              onChange={(giro) => patch({ giro })}
            />
            <ContactFormInput
              id="org-address"
              label="Dirección"
              value={draft.address}
              onChange={(address) => patch({ address })}
              className="sm:col-span-2"
            />
            <RegionCommuneFields
              regionId="org-region"
              communeId="org-commune"
              region={draft.region}
              commune={draft.commune}
              onPatch={({ region, commune }) =>
                patch({
                  region,
                  commune,
                  city: commune || draft.city,
                })
              }
              onRegionChange={(region) => patch({ region })}
              onCommuneChange={(commune) =>
                patch({ commune, city: commune || draft.city })
              }
              className="sm:col-span-2"
            />
            <ContactFormInput
              id="org-city"
              label="Ciudad (referencia)"
              value={draft.city}
              onChange={(city) => patch({ city })}
              placeholder="Se actualiza al elegir comuna"
            />
            <ContactFormInput
              id="org-phone"
              label="Teléfono"
              value={draft.phone}
              onChange={(phone) => patch({ phone })}
            />
            <ContactFormInput
              id="org-email"
              label="Email"
              type="email"
              value={draft.email}
              onChange={(email) => patch({ email })}
            />
          </div>
          </fieldset>

          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleSave} disabled={saving || isLoading}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-border"
                onClick={handleReset}
                disabled={isLoading}
              >
                <RotateCcw aria-hidden className="size-4" />
                Restaurar valores predeterminados
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
