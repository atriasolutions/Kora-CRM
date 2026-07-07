import {
  AlertTriangle,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  Target,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { OpportunityDetail } from '@/data/opportunity-detail.mock'
import type { OpportunityOutcome } from '@/data/opportunities.mock'
import { resolveOpportunityCustomerKind } from '@/lib/opportunity-customer'
import { syncOpportunityStageMetrics } from '@/lib/opportunity-form'
import { probabilityLabelForStage } from '@/lib/opportunity-metadata'

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail
  label: string
  value: string
}) {
  return (
    <div className="flex gap-3">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

type OpportunityDetailSidebarProps = {
  opportunity: OpportunityDetail
}

export function OpportunityDetailSidebar({ opportunity }: OpportunityDetailSidebarProps) {
  const outcomeLabel: OpportunityOutcome = opportunity.outcome
  const metrics = syncOpportunityStageMetrics(opportunity)

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Target aria-hidden className="size-4 text-primary" />
            Resumen comercial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow icon={DollarSign} label="Monto / Ponderado" value={`${metrics.amount} · ${metrics.weightedAmount}`} />
          <InfoRow icon={TrendingUp} label="Probabilidad" value={probabilityLabelForStage(opportunity.stage)} />
          <InfoRow icon={Calendar} label="Cierre estimado" value={opportunity.closeDate} />
          <InfoRow icon={UserRound} label="Responsable" value={opportunity.owner} />
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{opportunity.type}</Badge>
            <Badge variant="secondary">{opportunity.forecast}</Badge>
            <Badge
              variant={
                outcomeLabel === 'Ganada'
                  ? 'customer'
                  : outcomeLabel === 'Perdida'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {outcomeLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Cliente y origen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {resolveOpportunityCustomerKind(opportunity) === 'empresa'
                ? 'B2B — Empresa'
                : 'B2C — Persona'}
            </Badge>
          </div>
          {resolveOpportunityCustomerKind(opportunity) === 'empresa' && opportunity.company ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Empresa: </span>
              {opportunity.companyId ? (
                <Link
                  to={`/empresas/${opportunity.companyId}`}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {opportunity.company}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{opportunity.company}</span>
              )}
            </p>
          ) : null}
          <div className="flex gap-3">
            <UserRound aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Contacto</p>
              {opportunity.contactId ? (
                <Link
                  to={`/contactos/${opportunity.contactId}`}
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  {opportunity.contactName}
                </Link>
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {opportunity.contactName}
                </p>
              )}
            </div>
          </div>
          <InfoRow icon={Mail} label="Email" value={opportunity.contactEmail} />
          <InfoRow icon={Phone} label="Teléfono" value={opportunity.contactPhone} />
          <InfoRow icon={Target} label="Origen" value={opportunity.source} />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Calificación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Decisor (autoriza la compra): </span>
            <span className="font-medium">{opportunity.decisionMaker || '—'}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Competencia: </span>
            <span className="font-medium">{opportunity.competitors}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Presupuesto: </span>
            <span className="font-medium">{opportunity.budget}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Proceso de compra del cliente: </span>
            <span className="font-medium">{opportunity.buyingProcess || '—'}</span>
          </p>
          {opportunity.lossReason ? (
            <p className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="font-medium">Motivo pérdida: </span>
                {opportunity.lossReason}
              </span>
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            En etapa desde {opportunity.stageEnteredAt}
          </p>
        </CardContent>
      </Card>

    </div>
  )
}
