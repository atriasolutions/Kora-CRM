import { ClipboardList } from 'lucide-react'

import { SolicitudDescriptionEditor } from '@/components/solicitudes/SolicitudDescriptionEditor'
import {
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { ContactFormSection } from '@/components/contacts/ContactFormSection'
import {
  SOLICITUD_PRIORITY_OPTIONS,
  SOLICITUD_STATUS_OPTIONS,
} from '@/data/solicitudes.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import type { SolicitudFile } from '@/lib/solicitud-files'
import type { SolicitudFormValues } from '@/lib/solicitud-form'

type SolicitudFormFieldsProps = {
  values: SolicitudFormValues
  onChange: (patch: Partial<SolicitudFormValues>) => void
  descriptionFiles: SolicitudFile[]
  onDescriptionFilesChange: (files: SolicitudFile[]) => void
  descriptionAuthorName: string
  editorKey: string
  idPrefix?: string
  disabled?: boolean
}

export function SolicitudFormFields({
  values,
  onChange,
  descriptionFiles,
  onDescriptionFilesChange,
  descriptionAuthorName,
  editorKey,
  idPrefix = 'sol',
  disabled = false,
}: SolicitudFormFieldsProps) {
  const patch = (partial: Partial<SolicitudFormValues>) => onChange(partial)

  return (
    <div className="space-y-5">
      <ContactFormSection
        title="Solicitud"
        description="Título, descripción y clasificación"
        icon={ClipboardList}
      >
        <ContactFormInput
          id={`${idPrefix}-title`}
          label="Título"
          inputVariant="alphanumeric"
          value={values.title}
          onChange={(title) => patch({ title })}
          disabled={disabled}
          placeholder="Ej. Integración con sistema externo"
        />
        <ContactFormField label="Descripción" id={`${idPrefix}-description`}>
          <SolicitudDescriptionEditor
            key={editorKey}
            initialHtml={values.description}
            initialFiles={descriptionFiles}
            authorName={descriptionAuthorName}
            onChange={(description) => patch({ description })}
            onFilesChange={onDescriptionFilesChange}
            disabled={disabled}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Inserta imágenes con el botón, pegando o arrastrando. Se guardan en Archivos. Clic en
            miniatura para ampliar.
          </p>
        </ContactFormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormSelect
            id={`${idPrefix}-status`}
            label="Estado"
            value={values.status}
            onChange={(status) =>
              patch({ status: status as SolicitudFormValues['status'] })
            }
            options={SOLICITUD_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            disabled={disabled}
          />
          <ContactFormSelect
            id={`${idPrefix}-priority`}
            label="Prioridad"
            value={values.priority}
            onChange={(priority) =>
              patch({ priority: priority as SolicitudFormValues['priority'] })
            }
            options={SOLICITUD_PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
            disabled={disabled}
          />
        </div>
        <UserLookupField
          label="Responsable"
          value={values.assigneeName}
          onChange={(assigneeName, user) =>
            patch({
              assigneeName,
              assigneeUserId: user?.id ?? '',
            })
          }
          disabled={disabled}
          helperText="Persona a cargo de la solicitud. Aparece en Mis solicitudes."
        />
      </ContactFormSection>
    </div>
  )
}
