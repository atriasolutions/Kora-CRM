import { useEffect } from 'react'

import {
  ContactFormField,
  ContactFormCheckbox,
  ContactFormTextarea,
} from '@/components/contacts/ContactFormField'
import { SolicitudLookupField } from '@/components/shared/SolicitudLookupField'
import { UserLookupField } from '@/components/shared/UserLookupField'
import { Input } from '@/components/ui/input'
import { useUsersRegistry } from '@/hooks/use-users-registry'
import { isBitacoraUserId, type BitacoraFormValues } from '@/lib/bitacora-form'
import { findUserByName } from '@/lib/user-lookup'

type BitacoraFormFieldsProps = {
  form: BitacoraFormValues
  onChange: (partial: Partial<BitacoraFormValues>) => void
  idPrefix?: string
  lockSolicitud?: boolean
  disabled?: boolean
}

export function BitacoraFormFields({
  form,
  onChange,
  idPrefix = 'bitacora',
  lockSolicitud = false,
  disabled = false,
}: BitacoraFormFieldsProps) {
  const { allUsers } = useUsersRegistry()

  useEffect(() => {
    const name = form.assignedUserName.trim()
    if (!name || isBitacoraUserId(form.assignedUserId)) return
    const user = findUserByName(allUsers, name)
    if (user?.id) {
      onChange({ assignedUserId: user.id })
    }
  }, [allUsers, form.assignedUserId, form.assignedUserName, onChange])

  return (
    <div className="space-y-4">
      <SolicitudLookupField
        value={form.solicitudId}
        solicitudTitle={form.solicitudTitle}
        solicitudCode={form.solicitudCode}
        disabled={disabled || lockSolicitud}
        onChange={(solicitudId, solicitud) => {
          onChange({
            solicitudId,
            solicitudCode: solicitud?.code ?? form.solicitudCode,
            solicitudTitle: solicitud?.title ?? form.solicitudTitle,
          })
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ContactFormField label="Fecha" htmlFor={`${idPrefix}-work-date`}>
          <Input
            id={`${idPrefix}-work-date`}
            type="date"
            value={form.workDate}
            disabled={disabled}
            onChange={(e) => onChange({ workDate: e.target.value })}
          />
        </ContactFormField>

        <ContactFormField label="Horas" htmlFor={`${idPrefix}-hours`}>
          <Input
            id={`${idPrefix}-hours`}
            type="number"
            min={0.5}
            step={0.5}
            value={Number.isFinite(form.hours) ? form.hours : ''}
            disabled={disabled}
            onChange={(e) => onChange({ hours: Number.parseFloat(e.target.value) || 0 })}
          />
          <p className="text-xs text-muted-foreground">
            Mínimo 0,5 · múltiplos de 0,5 (ej. 1, 5,5, 10)
          </p>
        </ContactFormField>
      </div>

      <ContactFormCheckbox
        id={`${idPrefix}-billable`}
        label="Horas facturables"
        checked={form.isBillable}
        disabled={disabled}
        onChange={(checked) =>
          onChange({
            isBillable: checked,
            nonBillableReason: checked ? '' : form.nonBillableReason,
          })
        }
      />

      {!form.isBillable ? (
        <ContactFormTextarea
          id={`${idPrefix}-reason`}
          label="Motivo (no facturable)"
          value={form.nonBillableReason}
          disabled={disabled}
          onChange={(value) => onChange({ nonBillableReason: value })}
          placeholder="Indique por qué estas horas no se facturan…"
          rows={3}
        />
      ) : null}

      <UserLookupField
        label="Usuario asignado"
        value={form.assignedUserName}
        disabled={disabled}
        onChange={(name, user) =>
          onChange({
            assignedUserName: name,
            assignedUserId: user?.id ?? form.assignedUserId,
          })
        }
      />

      <ContactFormTextarea
        id={`${idPrefix}-description`}
        label="Descripción"
        value={form.description}
        disabled={disabled}
        onChange={(value) => onChange({ description: value })}
        placeholder="Detalle del trabajo realizado…"
        rows={4}
      />
    </div>
  )
}
