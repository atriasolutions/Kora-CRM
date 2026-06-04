import { FileSpreadsheet } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { OpportunityQuoteSummary } from '@/lib/quote-relations'
import { quoteStatusVariant } from '@/lib/quote-display'
import { cn } from '@/lib/utils'

export type OpportunityCardData = {
  id: string
  name: string
  stage: string
  amount: string
  closeDate: string
  quotes?: OpportunityQuoteSummary[]
}

type OpportunityWithQuotesCardProps = {
  opportunity: OpportunityCardData
  className?: string
}

export function OpportunityWithQuotesCard({
  opportunity,
  className,
}: OpportunityWithQuotesCardProps) {
  const quotes = opportunity.quotes ?? []

  return (
    <Card className={cn('shadow-sm', className)}>
      <CardContent className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{opportunity.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cierre estimado · {opportunity.closeDate}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {quotes.length === 0
                ? 'Sin cotizaciones'
                : `${quotes.length} cotización${quotes.length === 1 ? '' : 'es'}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <Badge variant="proposal">{opportunity.stage}</Badge>
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {opportunity.amount}
            </span>
          </div>
        </div>

        {quotes.length > 0 ? (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-muted/20">
            {quotes.map((quote) => (
              <li key={quote.id}>
                <Link
                  to={`/cotizaciones/${quote.id}`}
                  className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                <div className="flex min-w-0 items-start gap-2">
                  <FileSpreadsheet
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-primary"
                  />
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium text-foreground">
                      {quote.code}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{quote.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Válida hasta · {quote.validUntil}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:shrink-0">
                  <Badge variant={quoteStatusVariant(quote.status)}>{quote.status}</Badge>
                  <span className="text-sm font-semibold tabular-nums">{quote.amount}</span>
                </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-3 text-xs">
          <Link
            to="/cotizaciones"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Ver todas las cotizaciones
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
