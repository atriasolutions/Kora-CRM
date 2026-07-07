import {
  Building2,
  Calendar,
  ChevronDown,
  Globe,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Target,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { OpportunityDetail } from '@/data/opportunity-detail.mock'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import type { OpportunityStage } from '@/data/opportunities.mock'
import {
  OPPORTUNITY_PRIORITY_OPTIONS,
  OPPORTUNITY_STAGE_OPTIONS,
  syncOpportunityStageMetrics,
  type OpportunityFormValues,
} from '@/lib/opportunity-form'
import { probabilityLabelForStage } from '@/lib/opportunity-metadata'
import { resolveOpportunityCustomerKind } from '@/lib/opportunity-customer'
import { opportunityStageVariant } from '@/lib/opportunity-journey'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'
import { cn } from '@/lib/utils'

type OpportunityDetailHeaderProps = {
  opportunity: OpportunityDetail
  isEditing?: boolean
  form?: OpportunityFormValues
  onFormChange?: (patch: Partial<OpportunityFormValues>) => void
  onStartEdit?: () => void
  onRegisterActivity?: (presetType?: ContactActivityType) => void
  onArchive?: () => void
}

export function OpportunityDetailHeader({
  opportunity,
  isEditing = false,
  form,
  onFormChange,
  onStartEdit,
  onRegisterActivity,
  onArchive,
}: OpportunityDetailHeaderProps) {
  const { showEdit, showArchive } = useDetailHeaderPermissions('oportunidades', {
    onStartEdit,
    onArchive,
  })

  const metrics = [
    { label: 'Monto', value: opportunity.amount },
    {
      label: 'Ponderado',
      value: syncOpportunityStageMetrics(opportunity).weightedAmount,
    },
    {
      label: 'Probabilidad',
      value: probabilityLabelForStage(opportunity.stage),
    },
    { label: 'Días en etapa', value: String(opportunity.daysInStage) },
    { label: 'Cotizaciones', value: String(opportunity.quoteCount) },
    { label: 'Actividades pend.', value: String(opportunity.pendingActivities) },
  ]

  const displayName = isEditing && form ? form.name : opportunity.name
  const displayStage = isEditing && form ? form.stage : opportunity.stage
  const displayCompany = isEditing && form ? form.company : opportunity.company
  const customerKind = resolveOpportunityCustomerKind(
    isEditing && form ? form : opportunity,
  )

  const patch = (partial: Partial<OpportunityFormValues>) => {
    onFormChange?.(partial)
  }

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm',
        isEditing ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border',
      )}
    >
      <div
        className={cn(
          'border-b border-border p-4 sm:p-5 lg:p-6',
          isEditing ? 'bg-primary/5' : 'bg-gradient-to-br from-muted/40 via-card to-card',
        )}
      >
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-gradient-to-br from-primary/10 to-chart-5/10 sm:size-16">
              <Target aria-hidden className="size-7 text-primary sm:size-8" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {isEditing && form ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ContactFormInput
                    id="opp-header-name"
                    label="Nombre"
                    value={form.name}
                    className="sm:col-span-2"
                    onChange={(name) => patch({ name })}
                  />
                  <ContactFormSelect
                    id="opp-header-stage"
                    label="Etapa"
                    value={form.stage}
                    onChange={(stage) => {
                      const nextStage = stage as OpportunityStage
                      patch(
                        syncOpportunityStageMetrics({
                          ...form,
                          stage: nextStage,
                        }),
                      )
                    }}
                    options={OPPORTUNITY_STAGE_OPTIONS.map((s) => ({
                      value: s,
                      label: s,
                    }))}
                  />
                  <ContactFormSelect
                    id="opp-header-priority"
                    label="Prioridad"
                    value={form.priority}
                    onChange={(priority) =>
                      patch({ priority: priority as OpportunityFormValues['priority'] })
                    }
                    options={OPPORTUNITY_PRIORITY_OPTIONS.map((p) => ({
                      value: p,
                      label: p,
                    }))}
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">
                      {displayName}
                    </h1>
                    <Badge variant={opportunityStageVariant(displayStage)}>{displayStage}</Badge>
                    <Badge
                      variant={
                        opportunity.outcome === 'Ganada'
                          ? 'customer'
                          : opportunity.outcome === 'Perdida'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {opportunity.outcome}
                    </Badge>
                    <Badge variant="outline">{opportunity.forecast}</Badge>
                    <Badge variant="outline">
                      {customerKind === 'empresa' ? 'B2B' : 'B2C'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {customerKind === 'empresa' && displayCompany
                      ? displayCompany
                      : opportunity.contactName}
                    {' · '}
                    {opportunity.type} · Cierre {opportunity.closeDate}
                  </p>
                  {opportunity.companyId ? (
                    <Link
                      to={`/empresas/${opportunity.companyId}`}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Building2 aria-hidden className="size-4" />
                      Ver empresa
                    </Link>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {!isEditing ? (
            <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-4 2xl:w-auto 2xl:shrink-0 2xl:border-t-0 2xl:pt-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-border shadow-sm">
                    <Calendar aria-hidden className="size-4" />
                    Actividad
                    <ChevronDown aria-hidden className="size-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onRegisterActivity?.('llamada')}>
                    Llamada
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRegisterActivity?.('email')}>
                    Email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRegisterActivity?.('reunion')}>
                    Reunión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {showEdit ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border shadow-sm"
                  onClick={onStartEdit}
                >
                  <Pencil aria-hidden className="size-4" />
                  Editar
                </Button>
              ) : null}
              {showArchive ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="border-border shadow-sm">
                      <MoreHorizontal aria-hidden className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={onArchive}
                    >
                      Archivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {!isEditing ? (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <UserRound aria-hidden className="size-4" />
              {opportunity.contactId ? (
                <Link
                  to={`/contactos/${opportunity.contactId}`}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {opportunity.contactName}
                </Link>
              ) : (
                opportunity.contactName
              )}
              {' · '}
              {opportunity.owner}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail aria-hidden className="size-4" />
              {opportunity.contactEmail}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone aria-hidden className="size-4" />
              {opportunity.contactPhone}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe aria-hidden className="size-4" />
              Origen: {opportunity.source}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  )
}
