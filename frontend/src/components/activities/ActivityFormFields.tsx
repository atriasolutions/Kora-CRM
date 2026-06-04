import { ActivityRelatedLookupField } from '@/components/activities/ActivityRelatedLookupField'
import { ActivityReminderFields } from '@/components/activities/ActivityReminderFields'
import {
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import type { ActivityRelatedType } from '@/data/activities.mock'
import {
  ACTIVITY_PRIORITY_OPTIONS,
  ACTIVITY_STATUS_OPTIONS,
} from '@/data/activities.mock'
import type { CreateActivityFormValues } from '@/lib/activity-create'
import { ACTIVITY_TYPE_OPTIONS } from '@/lib/contact-activity'
import { UserLookupField } from '@/components/shared/UserLookupField'

const RELATED_OPTIONS: { value: ActivityRelatedType; label: string }[] = [
  { value: 'contacto', label: 'Contacto' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'oportunidad', label: 'Oportunidad' },
  { value: 'cotizacion', label: 'Cotización' },
  { value: 'compra', label: 'Compra' },
  { value: 'factura', label: 'Factura' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'producto', label: 'Producto' },
  { value: 'inventario', label: 'Inventario' },
]

type ActivityFormFieldsProps = {
  form: CreateActivityFormValues
  onChange: (patch: Partial<CreateActivityFormValues>) => void
  idPrefix?: string
  lockRelated?: boolean
  statusLabel?: string
}

export function ActivityFormFields({
  form,
  onChange,
  idPrefix = 'act-form',
  lockRelated = false,
  statusLabel = 'Estado inicial',
}: ActivityFormFieldsProps) {
  const patch = (partial: Partial<CreateActivityFormValues>) => {
    onChange(partial)
  }

  return (
    <div className="space-y-4">
      <ContactFormInput
        id={`${idPrefix}-title`}
        label="Título"
        inputVariant="alphanumeric"
        value={form.title}
        onChange={(title) => patch({ title })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <ContactFormSelect
          id={`${idPrefix}-type`}
          label="Tipo"
          value={form.type}
          onChange={(type) =>
            patch({ type: type as CreateActivityFormValues['type'] })
          }
          options={ACTIVITY_TYPE_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        <ContactFormSelect
          id={`${idPrefix}-related-type`}
          label="Vincular a"
          value={form.relatedType}
          disabled={lockRelated}
          onChange={(relatedType) =>
            patch({
              relatedType: relatedType as ActivityRelatedType,
              relatedId: '',
              relatedName: '',
              companyName: '',
            })
          }
          options={RELATED_OPTIONS}
        />
      </div>
      <ActivityRelatedLookupField
        relatedType={form.relatedType}
        relatedId={form.relatedId ?? ''}
        relatedName={form.relatedName}
        disabled={lockRelated}
        onChange={(selection) =>
          patch({
            relatedId: selection.relatedId,
            relatedName: selection.relatedName,
            companyName: selection.companyName,
          })
        }
      />
      <ContactFormField id={`${idPrefix}-scheduled`} label="Fecha y hora">
        <input
          id={`${idPrefix}-scheduled`}
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(e) => patch({ scheduledAt: e.target.value })}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </ContactFormField>
      <ContactFormInput
        id={`${idPrefix}-duration`}
        label="Duración estimada (min)"
        inputVariant="integer"
        value={form.durationMinutes}
        placeholder="30"
        onChange={(durationMinutes) => patch({ durationMinutes })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <UserLookupField
          label="Asignado a"
          value={form.assigneeName}
          onChange={(assigneeName) => patch({ assigneeName })}
        />
        <ContactFormSelect
          id={`${idPrefix}-priority`}
          label="Prioridad"
          value={form.priority}
          onChange={(priority) =>
            patch({ priority: priority as CreateActivityFormValues['priority'] })
          }
          options={ACTIVITY_PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
        />
      </div>
      <ContactFormSelect
        id={`${idPrefix}-status`}
        label={statusLabel}
        value={form.status}
        onChange={(status) =>
          patch({ status: status as CreateActivityFormValues['status'] })
        }
        options={ACTIVITY_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
      />
      <ActivityReminderFields
        values={{
          reminderPreset: form.reminderPreset,
          reminderCustomAt: form.reminderCustomAt,
        }}
        onChange={(reminderPatch) => patch(reminderPatch)}
        selectId={`${idPrefix}-reminder-preset`}
        customId={`${idPrefix}-reminder-custom`}
      />
    </div>
  )
}
