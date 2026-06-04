import {
  ContactFormField,
  ContactFormInput,
} from '@/components/contacts/ContactFormField'
import { QUOTE_TERMS_PLACEHOLDER } from '@/lib/quote-defaults'

export type QuoteCommercialTermsValues = {
  paymentTerms: string
  deliveryTerms: string
  terms: string
}

type QuoteCommercialTermsFieldsProps = {
  values: QuoteCommercialTermsValues
  onChange: (patch: Partial<QuoteCommercialTermsValues>) => void
  idPrefix?: string
}

export function QuoteCommercialTermsFields({
  values,
  onChange,
  idPrefix = 'quote-terms',
}: QuoteCommercialTermsFieldsProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/15 p-4">
      <p className="text-sm font-semibold text-foreground">Condiciones comerciales</p>
      <p className="text-xs text-muted-foreground">
        Se guardan en la cotización y aparecen en el PDF si las completas.
      </p>
      <ContactFormInput
        id={`${idPrefix}-payment`}
        label="Condiciones de pago"
        value={values.paymentTerms}
        onChange={(paymentTerms) => onChange({ paymentTerms })}
      />
      <ContactFormInput
        id={`${idPrefix}-delivery`}
        label="Plazo de entrega"
        value={values.deliveryTerms}
        onChange={(deliveryTerms) => onChange({ deliveryTerms })}
      />
      <ContactFormField id={`${idPrefix}-terms`} label="Términos y condiciones (opcional)">
        <textarea
          id={`${idPrefix}-terms`}
          rows={3}
          value={values.terms}
          placeholder={QUOTE_TERMS_PLACEHOLDER}
          onChange={(e) => onChange({ terms: e.target.value })}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </ContactFormField>
    </div>
  )
}
