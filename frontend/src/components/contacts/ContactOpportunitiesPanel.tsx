import { ChevronRight, Plus, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { CreateOpportunityDialog } from '@/components/opportunities/CreateOpportunityDialog'
import { RelatedEntityList } from '@/components/shared/RelatedEntityList'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ContactDetail } from '@/data/contact-detail.mock'
import { useOpportunitiesRegistry } from '@/hooks/use-opportunities-registry'
import {
  createOpportunityInitialFromContact,
  opportunitiesForContact,
} from '@/lib/contact-opportunities'
import type { CreateOpportunityFormValues } from '@/lib/opportunity-create'
import { opportunityStageVariant } from '@/lib/opportunity-journey'

type ContactOpportunitiesPanelProps = {
  contact: ContactDetail
  disabled?: boolean
  onCountChange?: (count: number) => void
}

export function ContactOpportunitiesPanel({
  contact,
  disabled = false,
  onCountChange,
}: ContactOpportunitiesPanelProps) {
  const navigate = useNavigate()
  const { allOpportunities, addOpportunity } = useOpportunitiesRegistry()
  const [createOpen, setCreateOpen] = useState(false)

  const related = useMemo(
    () =>
      opportunitiesForContact(allOpportunities, {
        id: contact.id,
        name: contact.name,
        company: contact.company,
        companyId: contact.companyId,
      }),
    [allOpportunities, contact.company, contact.companyId, contact.id, contact.name],
  )

  const createInitial = useMemo(
    () =>
      createOpportunityInitialFromContact({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        company: contact.company,
        companyId: contact.companyId,
        source: contact.source,
        owner: contact.owner,
      }),
    [
      contact.company,
      contact.companyId,
      contact.email,
      contact.id,
      contact.name,
      contact.owner,
      contact.source,
    ],
  )

  useEffect(() => {
    onCountChange?.(related.length)
  }, [onCountChange, related.length])

  const handleCreate = async (values: CreateOpportunityFormValues) => {
    const item = await addOpportunity(values)
    navigate(`/oportunidades/${item.id}`)
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">Oportunidades</CardTitle>
          <Button
            type="button"
            size="sm"
            className="shadow-sm"
            disabled={disabled}
            onClick={() => setCreateOpen(true)}
          >
            <Plus aria-hidden className="size-4" />
            Nueva oportunidad
          </Button>
        </CardHeader>
        <CardContent>
          {related.length === 0 ? (
            <div className="py-8 text-center">
              <Target
                aria-hidden
                className="mx-auto mb-3 size-10 text-muted-foreground"
              />
              <p className="text-sm font-medium text-foreground">
                Sin oportunidades vinculadas
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Crea una oportunidad con {contact.name}
                {contact.company ? ` y ${contact.company}` : ''} ya asociados.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 border-border"
                disabled={disabled}
                onClick={() => setCreateOpen(true)}
              >
                <Plus aria-hidden className="size-4" />
                Crear oportunidad
              </Button>
            </div>
          ) : (
            <RelatedEntityList
              items={related}
              searchPlaceholder="Buscar oportunidades…"
              searchFilter={(opp: OpportunityListItem, q) =>
                opp.name.toLowerCase().includes(q) ||
                opp.company.toLowerCase().includes(q) ||
                opp.stage.toLowerCase().includes(q) ||
                opp.amount.toLowerCase().includes(q)
              }
              renderItem={(opp) => (
                <li key={opp.id}>
                  <Link
                    to={`/oportunidades/${opp.id}`}
                    className="group flex flex-col gap-3 rounded-lg border border-border px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted/60">
                        <Target aria-hidden className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground group-hover:text-primary">
                          {opp.name}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {opp.company}
                          {opp.contactName && opp.contactName !== '—'
                            ? ` · ${opp.contactName}`
                            : ''}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Cierre estimado · {opp.closeDate} · {opp.probability}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:shrink-0">
                      <Badge variant={opportunityStageVariant(opp.stage)}>
                        {opp.stage}
                      </Badge>
                      <span className="text-base font-semibold tabular-nums text-foreground">
                        {opp.amount}
                      </span>
                      <ChevronRight
                        aria-hidden
                        className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </div>
                  </Link>
                </li>
              )}
            />
          )}
        </CardContent>
      </Card>

      <CreateOpportunityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nueva oportunidad"
        description={`Se vinculará a ${contact.name}${contact.company ? ` (${contact.company})` : ''}.`}
        initialValues={createInitial}
        onSubmit={handleCreate}
      />
    </>
  )
}
