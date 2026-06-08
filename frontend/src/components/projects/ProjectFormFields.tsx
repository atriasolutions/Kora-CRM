import { CalendarClock, FolderKanban, Link2, Users } from 'lucide-react'

import {
  ContactFormDateInput,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { ContactFormSection } from '@/components/contacts/ContactFormSection'
import { ProjectCustomerFields } from '@/components/projects/ProjectCustomerFields'
import { ProjectRelationsFields } from '@/components/projects/ProjectRelationsFields'
import {
  PROJECT_HEALTH_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
} from '@/data/projects.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import { PROJECT_JOURNEY_STAGE_OPTIONS } from '@/lib/project-journey'
import type { ProjectFormValues } from '@/lib/project-form'
import { purchaseDisplayDateToInput } from '@/lib/purchase-dates'

type ProjectFormFieldsProps = {
  values: ProjectFormValues
  onChange: (patch: Partial<ProjectFormValues>) => void
  idPrefix?: string
  disabled?: boolean
  lockSolicitud?: boolean
}

export function ProjectFormFields({
  values,
  onChange,
  idPrefix = 'pr',
  disabled = false,
  lockSolicitud = false,
}: ProjectFormFieldsProps) {
  const patch = (partial: Partial<ProjectFormValues>) => onChange(partial)

  const startMax =
    values.deadline.trim() && values.deadline !== '—'
      ? purchaseDisplayDateToInput(values.deadline)
      : undefined
  const deadlineMin =
    values.startDate.trim() && values.startDate !== '—'
      ? purchaseDisplayDateToInput(values.startDate)
      : undefined

  return (
    <div className="space-y-5">
      <ContactFormSection
        title="Proyecto"
        description="Nombre y datos identificatorios"
        icon={FolderKanban}
      >
        <ContactFormInput
          id={`${idPrefix}-name`}
          label="Nombre del proyecto"
          inputVariant="alphanumeric"
          value={values.name}
          onChange={(name) => patch({ name })}
          disabled={disabled}
          placeholder="Ej. Implementación CRM 2026"
        />
      </ContactFormSection>

      <ContactFormSection
        title="Cliente"
        description="Define el tipo B2B/B2C o indica el cliente en texto libre"
        icon={Users}
      >
        <ProjectCustomerFields
          values={{
            customerKind: values.customerKind,
            companyId: values.companyId,
            company: values.company,
            contactId: values.contactId,
            contactName: values.contactName,
            client: values.client,
          }}
          onChange={(customerPatch) => patch(customerPatch)}
          disabled={disabled}
          idPrefix={`${idPrefix}-cust`}
        />
      </ContactFormSection>

      <ContactFormSection
        title="Origen comercial"
        description="Oportunidad con cotización o solicitud de origen"
        icon={Link2}
        className="border-dashed bg-muted/10"
      >
        <ProjectRelationsFields
          embedded
          values={values}
          onChange={patch}
          disabled={disabled}
          lockSolicitud={lockSolicitud}
          idPrefix={`${idPrefix}-rel`}
        />
      </ContactFormSection>

      <ContactFormSection
        title="Planificación"
        description="Fechas y presupuesto"
        icon={CalendarClock}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormInput
            id={`${idPrefix}-budget`}
            label="Presupuesto"
            inputVariant="amount"
            value={values.budget}
            onChange={(budget) => patch({ budget })}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormDateInput
            id={`${idPrefix}-start`}
            label="Inicio"
            value={values.startDate}
            onChange={(startDate) => patch({ startDate })}
            disabled={disabled}
            max={startMax}
          />
          <ContactFormDateInput
            id={`${idPrefix}-deadline`}
            label="Fecha de entrega"
            value={values.deadline}
            onChange={(deadline) => patch({ deadline })}
            disabled={disabled}
            min={deadlineMin}
          />
        </div>
      </ContactFormSection>

      <ContactFormSection
        title="Gestión"
        description="Etapa, salud, prioridad y responsable"
        icon={Users}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormSelect
            id={`${idPrefix}-journey`}
            label="Etapa (ruta del éxito)"
            value={values.journeyStage}
            onChange={(journeyStage) =>
              patch({ journeyStage: journeyStage as ProjectFormValues['journeyStage'] })
            }
            options={PROJECT_JOURNEY_STAGE_OPTIONS.map((s) => ({ value: s, label: s }))}
            disabled={disabled}
          />
          <ContactFormSelect
            id={`${idPrefix}-health`}
            label="Salud"
            value={values.health}
            onChange={(health) => patch({ health: health as ProjectFormValues['health'] })}
            options={PROJECT_HEALTH_OPTIONS.map((h) => ({ value: h, label: h }))}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormSelect
            id={`${idPrefix}-priority`}
            label="Prioridad"
            value={values.priority}
            onChange={(priority) =>
              patch({ priority: priority as ProjectFormValues['priority'] })
            }
            options={PROJECT_PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
            disabled={disabled}
          />
          <UserLookupField
            label="Gerente de proyecto"
            value={values.managerName}
            onChange={(managerName) => patch({ managerName })}
            disabled={disabled}
          />
        </div>
      </ContactFormSection>
    </div>
  )
}
