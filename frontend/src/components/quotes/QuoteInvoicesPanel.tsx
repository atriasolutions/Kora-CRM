import { FileText, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { QuoteDetail } from '@/data/quote-detail.mock'
import { invoiceStatusVariant } from '@/lib/invoice-display'
import { canInvoiceFromQuote } from '@/lib/invoice-create'
import type { QuoteInvoiceSummary } from '@/lib/invoice-relations'

type QuoteInvoicesPanelProps = {
  invoices: QuoteInvoiceSummary[]
  quote: QuoteDetail
  onOpenCreate: () => void
}

export function QuoteInvoicesPanel({
  invoices,
  quote,
  onOpenCreate,
}: QuoteInvoicesPanelProps) {
  const canCreate = canInvoiceFromQuote(quote)

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <FileText aria-hidden className="size-4 text-primary" />
          Facturas vinculadas
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="shadow-sm"
            disabled={!canCreate}
            title={
              canCreate
                ? 'Crear factura desde esta cotización'
                : 'La cotización debe estar en estado Aceptada para facturar'
            }
            onClick={onOpenCreate}
          >
            <Plus aria-hidden className="size-4" />
            Generar factura
          </Button>
          <Button variant="outline" size="sm" className="border-border" asChild>
            <Link to="/facturacion">Ver módulo facturación</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!canCreate ? (
          <p className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100">
            Solo puedes generar facturas cuando la cotización está en estado{' '}
            <strong>Aceptada</strong>. Estado actual: {quote.status}.
          </p>
        ) : null}
        {invoices.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {canCreate
              ? 'Aún no hay facturas para esta cotización. Genera la primera con el botón superior.'
              : 'No hay facturas vinculadas a esta cotización.'}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  to={`/facturacion/${inv.id}`}
                  className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-mono text-sm font-medium">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">
                      Emisión {inv.issueDate} · Vence {inv.dueDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={invoiceStatusVariant(inv.status)}>{inv.status}</Badge>
                    <span className="font-semibold tabular-nums">{inv.amount}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Cotización {quote.code}. Una cotización aceptada puede generar una o más facturas
          (anticipo, saldo, etc.).
        </p>
      </CardContent>
    </Card>
  )
}
