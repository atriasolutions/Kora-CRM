import { OpportunityLookupField } from '@/components/shared/OpportunityLookupField'
import { QuoteLookupField } from '@/components/shared/QuoteLookupField'
import { useQuotesRegistry } from '@/hooks/use-quotes-registry'
import {
  applyProjectQuoteChange,
  applyProjectRelationsChange,
} from '@/lib/project-relations-form'
import type { ProjectFormValues } from '@/lib/project-form'

type ProjectRelationsFieldsProps = {
  values: Pick<
    ProjectFormValues,
    | 'opportunityId'
    | 'opportunityName'
    | 'acceptedQuoteId'
    | 'acceptedQuoteCode'
  >
  onChange: (patch: Partial<ProjectFormValues>) => void
  idPrefix?: string
  disabled?: boolean
  /** Sin caja ni título (cuando va dentro de ProjectFormFields). */
  embedded?: boolean
}

export function ProjectRelationsFields({
  values,
  onChange,
  idPrefix = 'pr-rel',
  disabled = false,
  embedded = false,
}: ProjectRelationsFieldsProps) {
  const { allQuotes } = useQuotesRegistry()
  const hasOpportunity = Boolean(values.opportunityId?.trim())

  const fields = (
    <div className="space-y-4">
      <OpportunityLookupField
        label="Oportunidad"
        value={values.opportunityId}
        opportunityName={values.opportunityName}
        disabled={disabled}
        hideHelper
        onChange={(opportunityId, opportunity) =>
          onChange(
            applyProjectRelationsChange(
              values,
              opportunityId,
              opportunity,
              allQuotes,
            ),
          )
        }
      />
      <p className="text-xs text-muted-foreground -mt-2">
        Opcional. Busca por nombre, empresa o contacto. Al vincular una oportunidad, el cliente B2B/B2C
        se completa automáticamente.
      </p>

      <QuoteLookupField
        label="Cotización de referencia"
        value={values.acceptedQuoteId}
        quoteCode={values.acceptedQuoteCode}
        disabled={disabled || !hasOpportunity}
        hideHelper
        opportunityId={hasOpportunity ? values.opportunityId : undefined}
        onChange={(quoteId, quote) => onChange(applyProjectQuoteChange(quoteId, quote))}
      />
      {!hasOpportunity ? (
        <p className="text-xs text-muted-foreground -mt-2">
          Selecciona primero una oportunidad para buscar cotizaciones vinculadas.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground -mt-2">
          Opcional. Cotización aceptada o en curso de la misma oportunidad; fija alcance y presupuesto
          de referencia.
        </p>
      )}
    </div>
  )

  if (embedded) {
    return fields
  }

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Origen comercial</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Vincula la oportunidad ganada y, si aplica, la cotización que define alcance y presupuesto.
        </p>
      </div>
      {fields}
    </div>
  )
}
