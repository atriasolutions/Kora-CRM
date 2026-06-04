import { Building2, UserRound } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { SaleCustomerValues } from '@/lib/sale-customer'
import { cn } from '@/lib/utils'

type QuoteCustomerSummaryProps = {
  values: SaleCustomerValues
  className?: string
}

export function QuoteCustomerSummary({ values, className }: QuoteCustomerSummaryProps) {
  const isB2B = values.customerKind === 'empresa'
  const Icon = isB2B ? Building2 : UserRound

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/20 px-3 py-3 text-sm',
        className,
      )}
    >
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Cliente (desde la oportunidad)
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1 font-normal">
          <Icon aria-hidden className="size-3.5" />
          {isB2B ? 'B2B — Empresa' : 'B2C — Persona'}
        </Badge>
      </div>
      <ul className="mt-2 space-y-1 text-foreground">
        {isB2B && (values.companyName ?? '').trim() ? (
          <li>
            <span className="text-muted-foreground">Empresa: </span>
            <span className="font-medium">{values.companyName}</span>
          </li>
        ) : null}
        {(values.contactName ?? '').trim() ? (
          <li>
            <span className="text-muted-foreground">
              {isB2B ? 'Contacto en la empresa: ' : 'Contacto: '}
            </span>
            <span className="font-medium">{values.contactName}</span>
          </li>
        ) : null}
        {!(values.companyName ?? '').trim() && !(values.contactName ?? '').trim() ? (
          <li className="text-muted-foreground">Sin datos de cliente en la oportunidad.</li>
        ) : null}
      </ul>
    </div>
  )
}
