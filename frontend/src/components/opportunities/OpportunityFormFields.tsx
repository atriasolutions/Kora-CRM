import {
  ContactFormDateInput,
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { OpportunityCustomerFields } from '@/components/opportunities/OpportunityCustomerFields'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { OpportunityStage } from '@/data/opportunities.mock'
import type { CompanyListItem } from '@/data/companies.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import {
  BUDGET_FIELD_HINT,
  BUYING_PROCESS_FIELD_HINT,
  BUYING_PROCESS_FIELD_PLACEHOLDER,
  COMPETITORS_FIELD_HINT,
  DECISION_MAKER_FIELD_HINT,
  DECISION_MAKER_FIELD_PLACEHOLDER,
  FORECAST_FIELD_HINT,
  FORECAST_FIELD_LABEL,
  FORECAST_OPTIONS,
  OPPORTUNITY_DESCRIPTION_FIELD_HINT,
  OPPORTUNITY_QUALIFICATION_SECTION_HINT,
  OPPORTUNITY_PRIORITY_OPTIONS,
  OPPORTUNITY_SOURCE_OPTIONS,
  OPPORTUNITY_STAGE_OPTIONS,
  OPPORTUNITY_TYPE_OPTIONS,
  type OpportunityFormValues,
} from '@/lib/opportunity-form'
import {
  OPPORTUNITY_AMOUNT_PENDING,
  probabilityLabelForStage,
} from '@/lib/opportunity-metadata'

type OpportunityFormFieldsProps = {
  values: OpportunityFormValues
  onChange: (patch: Partial<OpportunityFormValues>) => void
  idPrefix?: string
  disabled?: boolean
  presetCompany?: Pick<
    CompanyListItem,
    'id' | 'name' | 'logoUrl' | 'industry' | 'city'
  >
}

export function OpportunityFormFields({
  values,
  onChange,
  idPrefix = 'opp',
  disabled = false,
  presetCompany,
}: OpportunityFormFieldsProps) {
  const patch = (partial: Partial<OpportunityFormValues>) => onChange(partial)

  const amountDisplay =
    values.amount.trim() && values.amount !== OPPORTUNITY_AMOUNT_PENDING
      ? values.amount
      : OPPORTUNITY_AMOUNT_PENDING

  return (
    <div className="space-y-4">
      <OpportunityCustomerFields
        values={{
          customerKind: values.customerKind,
          companyId: values.companyId,
          company: values.company,
          contactId: values.contactId,
          contactName: values.contactName,
          contactEmail: values.contactEmail,
          contactPhone: values.contactPhone,
        }}
        onChange={(customerPatch) => patch(customerPatch)}
        disabled={disabled}
        showContactChannels
        presetCompany={presetCompany}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-sm font-medium leading-none">Monto</p>
          <p className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium tabular-nums">
            {amountDisplay}
          </p>
          <p className="text-xs text-muted-foreground">
            Total con IVA de la cotización de referencia (sincronizar desde la pestaña
            Cotizaciones).
          </p>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium leading-none">Probabilidad</p>
          <p className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium tabular-nums">
            {probabilityLabelForStage(values.stage)}
          </p>
          <p className="text-xs text-muted-foreground">
            Se calcula automáticamente según la etapa del pipeline.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ContactFormSelect
          id={`${idPrefix}-stage`}
          label="Etapa"
          value={values.stage}
          onChange={(stage) => {
            const nextStage = stage as OpportunityStage
            patch({
              stage: nextStage,
              probability: probabilityLabelForStage(nextStage),
            })
          }}
          options={OPPORTUNITY_STAGE_OPTIONS.map((s) => ({ value: s, label: s }))}
          disabled={disabled}
        />
        <div className="hidden sm:block" aria-hidden />
      </div>

      <ContactFormDateInput
        id={`${idPrefix}-close`}
        label="Cierre estimado"
        value={values.closeDate}
        onChange={(closeDate) => patch({ closeDate })}
        disabled={disabled}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ContactFormSelect
          id={`${idPrefix}-type`}
          label="Tipo de negocio"
          value={values.type}
          onChange={(type) => patch({ type: type as OpportunityFormValues['type'] })}
          options={OPPORTUNITY_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
          disabled={disabled}
        />
        <ContactFormSelect
          id={`${idPrefix}-priority`}
          label="Prioridad"
          value={values.priority}
          onChange={(priority) =>
            patch({ priority: priority as OpportunityFormValues['priority'] })
          }
          options={OPPORTUNITY_PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <ContactFormSelect
            id={`${idPrefix}-forecast`}
            label={FORECAST_FIELD_LABEL}
            value={values.forecast}
            onChange={(forecast) =>
              patch({ forecast: forecast as OpportunityFormValues['forecast'] })
            }
            options={FORECAST_OPTIONS.map((f) => ({ value: f, label: f }))}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">{FORECAST_FIELD_HINT}</p>
        </div>
        <UserLookupField
          label="Responsable"
          value={values.ownerName}
          onChange={(ownerName) => patch({ ownerName })}
          disabled={disabled}
        />
      </div>

      <ContactFormSelect
        id={`${idPrefix}-source`}
        label="Origen"
        value={values.source}
        onChange={(source) => patch({ source })}
        options={OPPORTUNITY_SOURCE_OPTIONS.map((s) => ({ value: s, label: s }))}
        disabled={disabled}
      />

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Calificación y cierre</CardTitle>
          <p className="text-xs font-normal text-muted-foreground">
            {OPPORTUNITY_QUALIFICATION_SECTION_HINT}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <ContactFormInput
              id={`${idPrefix}-decision`}
              label="Decisor (quien autoriza la compra)"
              inputVariant="alphanumeric"
              value={values.decisionMaker}
              onChange={(decisionMaker) => patch({ decisionMaker })}
              placeholder={DECISION_MAKER_FIELD_PLACEHOLDER}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">{DECISION_MAKER_FIELD_HINT}</p>
          </div>
          <div className="space-y-1.5">
            <ContactFormInput
              id={`${idPrefix}-competitors`}
              label="Competencia"
              inputVariant="alphanumeric"
              value={values.competitors}
              onChange={(competitors) => patch({ competitors })}
              placeholder="Ej. Proveedor X, solución interna"
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">{COMPETITORS_FIELD_HINT}</p>
          </div>
          <div className="space-y-1.5">
            <ContactFormInput
              id={`${idPrefix}-budget`}
              label="Presupuesto cliente"
              inputVariant="amount"
              value={values.budget}
              onChange={(budget) => patch({ budget })}
              placeholder="Ej. $5.000.000 – $8.000.000"
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">{BUDGET_FIELD_HINT}</p>
          </div>
          <div className="space-y-1.5">
            <ContactFormInput
              id={`${idPrefix}-process`}
              label="Proceso de compra del cliente"
              inputVariant="alphanumeric"
              value={values.buyingProcess}
              onChange={(buyingProcess) => patch({ buyingProcess })}
              placeholder={BUYING_PROCESS_FIELD_PLACEHOLDER}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">{BUYING_PROCESS_FIELD_HINT}</p>
          </div>
          {values.stage === 'Cerrada' ? (
            <ContactFormInput
              id={`${idPrefix}-loss`}
              label="Motivo pérdida (si aplica)"
              inputVariant="alphanumeric"
              value={values.lossReason}
              onChange={(lossReason) => patch({ lossReason })}
              placeholder="Dejar vacío si fue ganada"
              disabled={disabled}
            />
          ) : null}
          <div className="space-y-1.5">
            <ContactFormField id={`${idPrefix}-desc`} label="Descripción">
              <textarea
                id={`${idPrefix}-desc`}
                rows={4}
                value={values.description}
                disabled={disabled}
                placeholder="Necesidad, alcance, objeciones, próximos pasos…"
                onChange={(e) => patch({ description: e.target.value })}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              />
            </ContactFormField>
            <p className="text-xs text-muted-foreground">
              {OPPORTUNITY_DESCRIPTION_FIELD_HINT}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
