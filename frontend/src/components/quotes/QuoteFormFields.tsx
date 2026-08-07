import {
  ContactFormDateInput,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { OpportunityLookupField } from '@/components/shared/OpportunityLookupField'
import { QuoteCurrencySection } from '@/components/quotes/QuoteCurrencySection'
import { QuoteCustomerSummary } from '@/components/quotes/QuoteCustomerSummary'
import { QuoteInternalInventorySection } from '@/components/quotes/QuoteInternalInventorySection'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import { QUOTE_STATUS_OPTIONS, type QuoteFormValues } from '@/lib/quote-form'
import type { ProductCurrency } from '@/lib/currency'

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
      <QuoteCurrencySection
        issueDate={form.issueDate}
        quoteCurrency={form.quoteCurrency}
        onIssueDateChange={(issueDate) => onChange({ issueDate })}
        onQuoteCurrencyChange={(quoteCurrency: ProductCurrency) => onChange({ quoteCurrency })}
      />
      <QuoteInternalInventorySection
        warehouseFieldId="quote-warehouse"
        addressFieldId="quote-delivery-address"
        warehouseId={form.destinationWarehouseId}
        warehouseName={form.destinationWarehouse}
        deliveryAddress={form.deliveryAddress}
        onChange={(patch) =>
          onChange({
            destinationWarehouseId: patch.warehouseId,
            destinationWarehouse: patch.warehouse,
            deliveryAddress: patch.deliveryAddress,
          })
        }
      />

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
