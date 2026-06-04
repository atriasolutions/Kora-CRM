import { FileSpreadsheet, Link2, Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { CreateQuoteDialog } from '@/components/quotes/CreateQuoteDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { OpportunityDetail } from '@/data/opportunity-detail.mock'
import {
  quoteFormValuesFromOpportunity,
  type CreateQuoteFormValues,
} from '@/lib/quote-create'
import type { OpportunityQuoteSummary } from '@/lib/quote-relations'
import { quoteStatusVariant } from '@/lib/quote-display'

type OpportunityQuotesPanelProps = {
  quotes: OpportunityQuoteSummary[]
  opportunity: OpportunityDetail
  primaryQuoteId?: string
  onCreateQuote: (values: CreateQuoteFormValues) => void
  onSyncQuote?: (quoteId: string) => Promise<void>
  syncLoadingQuoteId?: string | null
}

export function OpportunityQuotesPanel({
  quotes,
  opportunity,
  primaryQuoteId,
  onCreateQuote,
  onSyncQuote,
  syncLoadingQuoteId = null,
}: OpportunityQuotesPanelProps) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">Cotizaciones</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Sincroniza una cotización para actualizar el monto (con IVA) y las líneas de la
            oportunidad.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="shadow-sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus aria-hidden className="size-4" />
          Nueva cotización
        </Button>
      </CardHeader>
      <CardContent>
        {quotes.length === 0 ? (
          <div className="py-8 text-center">
            <FileSpreadsheet
              aria-hidden
              className="mx-auto mb-3 size-10 text-muted-foreground"
            />
            <p className="text-sm font-medium text-foreground">
              Sin cotizaciones vinculadas
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Crea una cotización asociada a {opportunity.name}.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 border-border"
              onClick={() => setCreateOpen(true)}
            >
              <Plus aria-hidden className="size-4" />
              Crear cotización
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {quotes.map((q) => {
              const isPrimary = primaryQuoteId === q.id
              const syncing = syncLoadingQuoteId === q.id
              return (
                <li key={q.id} className="px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      to={`/cotizaciones/${q.id}`}
                      className="min-w-0 flex-1 transition-colors hover:text-primary"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-medium">{q.code}</p>
                        {isPrimary ? (
                          <Badge variant="secondary" className="text-xs">
                            Referencia
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{q.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Válida hasta {q.validUntil}
                      </p>
                    </Link>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      <Badge variant={quoteStatusVariant(q.status)}>{q.status}</Badge>
                      <span className="font-semibold tabular-nums">{q.amount}</span>
                      {onSyncQuote ? (
                        <Button
                          type="button"
                          variant={isPrimary ? 'secondary' : 'outline'}
                          size="sm"
                          className="border-border"
                          disabled={syncing}
                          onClick={() => void onSyncQuote(q.id)}
                        >
                          {syncing ? (
                            <Loader2 aria-hidden className="size-4 animate-spin" />
                          ) : (
                            <Link2 aria-hidden className="size-4" />
                          )}
                          {syncing ? 'Sincronizando…' : 'Sincronizar'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <CreateQuoteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nueva cotización"
        description={`Vinculada a la oportunidad «${opportunity.name}».`}
        initialValues={quoteFormValuesFromOpportunity(opportunity)}
        onSubmit={(values) => {
          onCreateQuote(values)
          setCreateOpen(false)
        }}
      />
    </Card>
  )
}
