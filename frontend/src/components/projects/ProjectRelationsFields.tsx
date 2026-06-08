import { ClipboardList, Link2 } from 'lucide-react'

import { OpportunityLookupField } from '@/components/shared/OpportunityLookupField'
import { QuoteLookupField } from '@/components/shared/QuoteLookupField'
import { SolicitudLookupField } from '@/components/shared/SolicitudLookupField'
import { useQuotesRegistry } from '@/hooks/use-quotes-registry'
import {
  applyCommercialOriginChange,
  applySolicitudChange,
  inferCommercialOrigin,
  type ProjectCommercialOrigin,
} from '@/lib/project-commercial-origin'
import {
  applyProjectQuoteChange,
  applyProjectRelationsChange,
} from '@/lib/project-relations-form'
import type { ProjectFormValues } from '@/lib/project-form'
import { cn } from '@/lib/utils'

type ProjectRelationsFieldsProps = {
  values: Pick<
    ProjectFormValues,
    | 'commercialOrigin'
    | 'opportunityId'
    | 'opportunityName'
    | 'acceptedQuoteId'
    | 'acceptedQuoteCode'
    | 'solicitudId'
    | 'solicitudTitle'
    | 'solicitudCode'
  >
  onChange: (patch: Partial<ProjectFormValues>) => void
  idPrefix?: string
  disabled?: boolean
  embedded?: boolean
  lockSolicitud?: boolean
}

const originOptions: {
  id: ProjectCommercialOrigin
  label: string
  hint: string
  Icon: typeof Link2
}[] = [
  {
    id: 'none',
    label: 'Sin origen',
    hint: 'Proyecto interno u otro motivo',
    Icon: Link2,
  },
  {
    id: 'oportunidad',
    label: 'Oportunidad / Cotización',
    hint: 'Negocio ganado con cotización de referencia',
    Icon: Link2,
  },
  {
    id: 'solicitud',
    label: 'Solicitud',
    hint: 'Proyecto originado en una solicitud',
    Icon: ClipboardList,
  },
]

export function ProjectRelationsFields({
  values,
  onChange,
  idPrefix = 'pr-rel',
  disabled = false,
  embedded = false,
  lockSolicitud = false,
}: ProjectRelationsFieldsProps) {
  const { allQuotes } = useQuotesRegistry()
  const origin = inferCommercialOrigin(values)
  const hasOpportunity = origin === 'oportunidad' && Boolean(values.opportunityId?.trim())
  const relationsDisabled = disabled || lockSolicitud

  const setOrigin = (next: ProjectCommercialOrigin) => {
    if (relationsDisabled) return
    if (next === origin) return
    onChange(applyCommercialOriginChange(next))
  }

  const fields = (
    <div className="space-y-4">
      {!lockSolicitud ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {originOptions.map(({ id, label, hint, Icon }) => {
            const active = origin === id
            return (
              <button
                key={id}
                type="button"
                disabled={relationsDisabled}
                onClick={() => setOrigin(id)}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30',
                  relationsDisabled && 'opacity-60',
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Icon aria-hidden className="size-4 text-primary" />
                  {label}
                </span>
                <span className="text-[11px] leading-snug text-muted-foreground">{hint}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      {origin === 'oportunidad' ? (
        <>
          <OpportunityLookupField
            label="Oportunidad"
            value={values.opportunityId}
            opportunityName={values.opportunityName}
            disabled={disabled}
            hideHelper
            onChange={(opportunityId, opportunity) =>
              onChange({
                commercialOrigin: 'oportunidad',
                ...applyProjectRelationsChange(
                  values,
                  opportunityId,
                  opportunity,
                  allQuotes,
                ),
              })
            }
          />
          <p className="text-xs text-muted-foreground -mt-2">
            Opcional. Busca por nombre, empresa o contacto. Al vincular una oportunidad, el cliente
            B2B/B2C se completa automáticamente.
          </p>

          <QuoteLookupField
            label="Cotización de referencia"
            value={values.acceptedQuoteId}
            quoteCode={values.acceptedQuoteCode}
            disabled={disabled || !hasOpportunity}
            hideHelper
            opportunityId={hasOpportunity ? values.opportunityId : undefined}
            onChange={(quoteId, quote) =>
              onChange({
                commercialOrigin: 'oportunidad',
                ...applyProjectQuoteChange(quoteId, quote),
              })
            }
          />
          {!hasOpportunity ? (
            <p className="text-xs text-muted-foreground -mt-2">
              Selecciona primero una oportunidad para buscar cotizaciones vinculadas.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground -mt-2">
              Opcional. Cotización aceptada o en curso de la misma oportunidad; fija alcance y
              presupuesto de referencia.
            </p>
          )}
        </>
      ) : null}

      {origin === 'solicitud' || lockSolicitud ? (
        <>
          <SolicitudLookupField
            label="Solicitud de origen"
            value={values.solicitudId}
            solicitudTitle={values.solicitudTitle}
            solicitudCode={values.solicitudCode}
            disabled={relationsDisabled}
            hideHelper
            onChange={(solicitudId, solicitud) =>
              onChange(applySolicitudChange(solicitudId, solicitud))
            }
          />
          {lockSolicitud ? (
            <p className="text-xs text-muted-foreground -mt-2">
              La solicitud de origen está fijada desde el detalle de la solicitud.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground -mt-2">
              Busca por título o código. El proyecto quedará vinculado a esa solicitud.
            </p>
          )}
        </>
      ) : null}

      {origin === 'none' ? (
        <p className="text-xs text-muted-foreground">
          Puedes crear el proyecto sin origen comercial. Más adelante podrás vincular oportunidad o
          solicitud al editar.
        </p>
      ) : null}
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
          Elige si el proyecto proviene de una oportunidad con cotización o de una solicitud.
        </p>
      </div>
      {fields}
    </div>
  )
}
