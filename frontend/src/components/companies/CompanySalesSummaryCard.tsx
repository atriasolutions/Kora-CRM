import { CircleDollarSign, FileSpreadsheet, FileText, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isApiEnabled } from '@/api/config'
import { listInvoicesForCompanyApi } from '@/api/invoices'
import { listOpportunitiesForCompanyApi } from '@/api/opportunities'
import { listQuotesForCompanyApi } from '@/api/quotes'
import type { CompanyDetail } from '@/data/company-detail.mock'
import type { InvoiceListItem } from '@/data/invoices.mock'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import type { QuoteListItem } from '@/data/quotes.mock'
import { buildCompanySalesSummary } from '@/lib/company-sales-summary'
import { cn } from '@/lib/utils'

type CompanySalesSummaryCardProps = {
  company: CompanyDetail
  /** Fallback en modo demo cuando el registry local ya tiene datos cargados. */
  opportunities?: OpportunityListItem[]
  quotes?: QuoteListItem[]
  invoices?: InvoiceListItem[]
  className?: string
}

type SummaryItem = {
  label: string
  value: string
  hint?: string
  icon: typeof Target
}

type CompanySalesData = {
  opportunities: OpportunityListItem[]
  quotes: QuoteListItem[]
  invoices: InvoiceListItem[]
}

export function CompanySalesSummaryCard({
  company,
  opportunities = [],
  quotes = [],
  invoices = [],
  className,
}: CompanySalesSummaryCardProps) {
  const useApi = isApiEnabled()
  const [loaded, setLoaded] = useState<CompanySalesData | null>(null)
  const [loading, setLoading] = useState(useApi)

  useEffect(() => {
    if (!useApi) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const [relatedOpportunities, relatedQuotes, relatedInvoices] = await Promise.all([
          listOpportunitiesForCompanyApi(company.id),
          listQuotesForCompanyApi(company.id),
          listInvoicesForCompanyApi(company.id),
        ])
        if (!cancelled) {
          setLoaded({
            opportunities: relatedOpportunities,
            quotes: relatedQuotes,
            invoices: relatedInvoices,
          })
        }
      } catch {
        if (!cancelled) {
          setLoaded({ opportunities: [], quotes: [], invoices: [] })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [company.id, useApi])

  const data = useMemo((): CompanySalesData => {
    if (loaded) return loaded
    return { opportunities, quotes, invoices }
  }, [loaded, opportunities, quotes, invoices])

  const summary = useMemo(
    () =>
      buildCompanySalesSummary({
        company: { id: company.id, name: company.name },
        opportunities: data.opportunities,
        quotes: data.quotes,
        invoices: data.invoices,
      }),
    [company.id, company.name, data],
  )

  const items: SummaryItem[] = [
    {
      label: 'Oportunidades',
      value: loading ? '…' : String(summary.opportunityCount),
      icon: Target,
    },
    {
      label: 'Cotizaciones',
      value: loading ? '…' : String(summary.quoteCount),
      icon: FileSpreadsheet,
    },
    {
      label: 'Facturas',
      value: loading ? '…' : String(summary.invoiceCount),
      icon: FileText,
    },
    {
      label: 'Monto facturado',
      value: loading ? '…' : summary.invoicedPaidAmount,
      hint: 'Facturas en estado Pagada',
      icon: CircleDollarSign,
    },
  ]

  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Resumen comercial</CardTitle>
        <CardDescription>
          Totales calculados desde oportunidades, cotizaciones y facturas vinculadas a esta
          empresa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map(({ label, value, hint, icon: Icon }) => (
            <div
              key={label}
              className="rounded-lg border border-border bg-muted/20 px-3 py-3"
            >
              <div className="flex items-start gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-background text-muted-foreground shadow-sm">
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums leading-tight">
                    {value}
                  </p>
                  {hint ? (
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      {hint}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
