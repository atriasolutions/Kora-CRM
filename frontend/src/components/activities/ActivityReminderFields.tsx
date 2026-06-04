import {
  ContactFormDateTimeInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import {
  ACTIVITY_REMINDER_PRESET_OPTIONS,
  type ActivityReminderFormFields,
  type ActivityReminderPreset,
} from '@/lib/activity-reminder'
import { cn } from '@/lib/utils'

type ActivityReminderFieldsProps = {
  values: ActivityReminderFormFields
  onChange: (patch: Partial<ActivityReminderFormFields>) => void
  selectId?: string
  customId?: string
  className?: string
}

export function ActivityReminderFields({
  values,
  onChange,
  selectId = 'activity-reminder-preset',
  customId = 'activity-reminder-custom',
  className,
}: ActivityReminderFieldsProps) {
  const showCustom = values.reminderPreset === 'custom'

  return (
    <div className={cn('space-y-3', className)}>
      <ContactFormSelect
        id={selectId}
        label="Recordar"
        value={values.reminderPreset}
        options={ACTIVITY_REMINDER_PRESET_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
        }))}
        onChange={(preset) =>
          onChange({ reminderPreset: preset as ActivityReminderPreset })
        }
      />
      {showCustom ? (
        <ContactFormDateTimeInput
          id={customId}
          label="Fecha y hora del recordatorio"
          value={values.reminderCustomAt}
          onChange={(reminderCustomAt) => onChange({ reminderCustomAt })}
        />
      ) : null}
    </div>
  )
}
