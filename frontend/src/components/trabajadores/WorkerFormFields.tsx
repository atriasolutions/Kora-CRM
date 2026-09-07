import {
  ContactFormAmountInput,
  ContactFormDateInput,
  ContactFormInput,
  ContactFormSelect,
  ContactFormTextarea,
} from '@/components/contacts/ContactFormField'
import { UserLookupField } from '@/components/shared/UserLookupField'
import {
  WORKER_CONTRACT_TYPE_OPTIONS,
  WORKER_STATUS_OPTIONS,
} from '@/data/workers.mock'
import type { WorkerFormValues } from '@/lib/worker-form'

type WorkerFormFieldsProps = {
  form: WorkerFormValues
  patch: (partial: Partial<WorkerFormValues>) => void
}

export function WorkerFormFields({ form, patch }: WorkerFormFieldsProps) {
  return (
    <div className="grid gap-3 py-2">
      <ContactFormInput
        id="worker-full-name"
        label="Nombre completo"
        value={form.fullName}
        onChange={(fullName) => patch({ fullName })}
        placeholder="Ej. Camila Fuentes"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ContactFormInput
          id="worker-tax-id"
          label="RUT"
          value={form.taxId}
          onChange={(taxId) => patch({ taxId })}
          placeholder="12.345.678-9"
        />
        <ContactFormInput
          id="worker-email"
          label="Email"
          inputVariant="email"
          value={form.email}
          onChange={(email) => patch({ email })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ContactFormInput
          id="worker-phone"
          label="Teléfono"
          inputVariant="phone"
          value={form.phone}
          onChange={(phone) => patch({ phone })}
        />
        <ContactFormInput
          id="worker-address"
          label="Dirección"
          value={form.address}
          onChange={(address) => patch({ address })}
        />
      </div>
      <ContactFormInput
        id="worker-avatar"
        label="Foto (URL, opcional)"
        value={form.avatarUrl}
        onChange={(avatarUrl) => patch({ avatarUrl })}
        placeholder="https://…"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <ContactFormInput
          id="worker-job-title"
          label="Cargo"
          value={form.jobTitle}
          onChange={(jobTitle) => patch({ jobTitle })}
        />
        <ContactFormInput
          id="worker-business-unit"
          label="Unidad de negocio"
          value={form.businessUnit}
          onChange={(businessUnit) => patch({ businessUnit })}
        />
      </div>
      <ContactFormTextarea
        id="worker-functions"
        label="Funciones"
        value={form.jobFunctions}
        onChange={(jobFunctions) => patch({ jobFunctions })}
        rows={2}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <ContactFormSelect
          id="worker-status"
          label="Estado"
          value={form.status}
          onChange={(status) => patch({ status })}
          options={WORKER_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
        />
        <ContactFormSelect
          id="worker-contract"
          label="Tipo de contrato"
          value={form.contractType}
          onChange={(contractType) => patch({ contractType })}
          options={WORKER_CONTRACT_TYPE_OPTIONS.map((c) => ({ value: c, label: c }))}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <ContactFormInput
          id="worker-hours"
          label="Jornada (hrs)"
          inputVariant="integer"
          value={form.workHours}
          onChange={(workHours) => patch({ workHours })}
        />
        <ContactFormDateInput
          id="worker-start"
          label="Fecha ingreso"
          value={form.startDate}
          onChange={(startDate) => patch({ startDate })}
        />
        <ContactFormDateInput
          id="worker-end"
          label="Fecha término"
          value={form.endDate}
          onChange={(endDate) => patch({ endDate })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ContactFormAmountInput
          id="worker-base-salary"
          label="Sueldo base (CLP)"
          value={form.baseSalary}
          onChange={(baseSalary) => patch({ baseSalary })}
        />
        <ContactFormAmountInput
          id="worker-gratification"
          label="Gratificación (CLP, opcional)"
          value={form.gratification}
          onChange={(gratification) => patch({ gratification })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ContactFormInput
          id="worker-afp-name"
          label="AFP"
          value={form.afpName}
          onChange={(afpName) => patch({ afpName })}
        />
        <ContactFormInput
          id="worker-afp-rate"
          label="Tasa AFP (%)"
          value={form.afpRate}
          onChange={(afpRate) => patch({ afpRate })}
          placeholder="11.44"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ContactFormInput
          id="worker-health-institution"
          label="Salud (Isapre/Fonasa)"
          value={form.healthInstitution}
          onChange={(healthInstitution) => patch({ healthInstitution })}
        />
        <ContactFormInput
          id="worker-health-plan"
          label="Plan de salud"
          value={form.healthPlan}
          onChange={(healthPlan) => patch({ healthPlan })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <ContactFormInput
          id="worker-afc-rate"
          label="Tasa AFC (%)"
          value={form.afcRate}
          onChange={(afcRate) => patch({ afcRate })}
          placeholder="0.6"
        />
        <ContactFormInput
          id="worker-vac-adjust"
          label="Ajuste vacaciones (días)"
          value={form.vacationAdjustmentDays}
          onChange={(vacationAdjustmentDays) => patch({ vacationAdjustmentDays })}
        />
        <ContactFormInput
          id="worker-payday"
          label="Día de pago (1-28)"
          inputVariant="integer"
          value={form.paydayDay}
          onChange={(paydayDay) => patch({ paydayDay })}
        />
      </div>

      <UserLookupField
        label="Responsable"
        value={form.ownerName}
        onChange={(ownerName) => patch({ ownerName })}
      />
    </div>
  )
}
