import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { apiActionErrorMessage } from '@/api/errors'
import { UserLookupField } from '@/components/shared/UserLookupField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'
import { organizationSolicitudesSettingsFrom } from '@/lib/organization-settings'
import type { OrganizationSettings } from '@/types/organization-settings'

export function SolicitudesSettingsPanel() {
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
    setSaving(true)
    try {
      await saveSettings(organizationSolicitudesSettingsFrom(draft))
      toast.success('Responsable predeterminado de solicitudes guardado.')
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo guardar la configuración de solicitudes.'),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Solicitudes</CardTitle>
        <CardDescription>
          Usuario asignado por defecto al crear una nueva solicitud. Puedes cambiarlo en cada
          registro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset disabled={readOnly || saving} className="space-y-4 border-0 p-0 m-0 min-w-0">
          <UserLookupField
            label="Responsable predeterminado"
            value={draft.defaultSolicitudAssigneeName}
            onChange={(name, user) =>
              patch({
                defaultSolicitudAssigneeName: name,
                defaultSolicitudAssigneeUserId: user?.id ?? null,
              })
            }
            helperText="Se aplicará al abrir el formulario de nueva solicitud."
          />
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
