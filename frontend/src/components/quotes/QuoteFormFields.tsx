import {
  ContactFormDateInput,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { OpportunityLookupField } from '@/components/shared/OpportunityLookupField'
import { QuoteCustomerSummary } from '@/components/quotes/QuoteCustomerSummary'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import { WarehouseDestinationFields } from '@/components/shared/WarehouseDestinationFields'
import { QUOTE_STATUS_OPTIONS, type QuoteFormValues } from '@/lib/quote-form'

export type QuoteFormFieldsModel = QuoteFormValues & {
  opportunityId?: string
}

type QuoteFormFieldsProps = {
  form: QuoteFormFieldsModel
  onChange: (patch: Partial<QuoteFormFieldsModel>) => void
  /** Oportunidad fija (p. ej. creada desde detalle de oportunidad). */
  readOnlyOpportunity?: boolean
  /** Cliente derivado de la oportunidad; sin selector B2B/B2C manual. */
  linkToOpportunity?: boolean
  onOpportunityChange?: (
    opportunityId: string,
    opportunity?: OpportunityListItem,
  ) => void
}

export function QuoteFormFields({
  form,
  onChange,
  readOnlyOpportunity = false,
  linkToOpportunity = true,
  onOpportunityChange,
}: QuoteFormFieldsProps) {
  const hasOpportunity = Boolean(form.opportunityId?.trim())

  return (
    <div className="space-y-4">
      {linkToOpportunity ? (
        <>
          <OpportunityLookupField
            label="Oportunidad"
            value={form.opportunityId ?? ''}
            opportunityName={form.opportunityName}
            disabled={readOnlyOpportunity}
            onChange={(opportunityId, opportunity) => {
              if (onOpportunityChange) {
                onOpportunityChange(opportunityId, opportunity)
              } else {
                onChange({
                  opportunityId,
                  opportunityName: opportunity?.name ?? '',
                })
              }
            }}
          />
          {hasOpportunity ? (
            <QuoteCustomerSummary
              values={{
                customerKind: form.customerKind,
                contactId: form.contactId,
                contactName: form.contactName,
                companyId: form.companyId,
                companyName: form.companyName,
              }}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              Selecciona una oportunidad para cargar el cliente (B2B o B2C) y los datos comerciales.
            </p>
          )}
        </>
      ) : null}

      <ContactFormSelect
        id="quote-status"
        label="Estado"
        value={form.status}
        options={QUOTE_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
        onChange={(status) => onChange({ status: status as QuoteFormValues['status'] })}
      />
      <ContactFormInput
        id="quote-title"
        label="Título"
        inputVariant="alphanumeric"
        value={form.title}
        onChange={(title) => onChange({ title })}
      />
      <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
        <h3 className="text-sm font-semibold text-foreground">Logística y entrega</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <WarehouseDestinationFields
            warehouseFieldId="quote-warehouse"
            addressFieldId="quote-delivery-address"
            warehouseId={form.destinationWarehouseId}
            warehouseName={form.destinationWarehouse}
            deliveryAddress={form.deliveryAddress}
            readOnlyDeliveryAddress
            onChange={(patch) =>
              onChange({
                destinationWarehouseId: patch.warehouseId,
                destinationWarehouse: patch.warehouse,
                deliveryAddress: patch.deliveryAddress,
              })
            }
          />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <ContactFormDateInput
          id="quote-valid"
          label="Válida hasta"
          value={form.validUntil}
          onChange={(validUntil) => onChange({ validUntil })}
        />
        <UserLookupField
          label="Responsable"
          value={form.ownerName}
          onChange={(ownerName) => onChange({ ownerName })}
        />
      </div>
    </div>
  )
}
