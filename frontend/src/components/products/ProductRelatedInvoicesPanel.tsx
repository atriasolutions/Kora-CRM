import { ChevronRight, FileText } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { RelatedEntityList } from '@/components/shared/RelatedEntityList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProductDetail } from '@/data/product-detail.mock'
import type { InvoiceListItem } from '@/data/invoices.mock'
import { invoiceStatusVariant } from '@/lib/invoice-display'
import { invoicesForProduct } from '@/lib/product-relations'

type ProductRelatedInvoicesPanelProps = {
  product: ProductDetail
  onCountChange?: (count: number) => void
}

function searchInvoice(inv: InvoiceListItem, q: string): boolean {
  return (
    inv.number.toLowerCase().includes(q) ||
    inv.client.toLowerCase().includes(q) ||
    inv.status.toLowerCase().includes(q) ||
    inv.issueDate.toLowerCase().includes(q)
  )
}

export function ProductRelatedInvoicesPanel({
  product,
  onCountChange,
}: ProductRelatedInvoicesPanelProps) {
  const related = useMemo(() => invoicesForProduct(product), [product])

  useEffect(() => {
    onCountChange?.(related.length)
  }, [onCountChange, related.length])

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <FileText aria-hidden className="size-4 text-primary" />
          Facturas
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/facturacion">Ver módulo facturación</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <RelatedEntityList
          items={related}
          searchPlaceholder="Buscar facturas…"
          searchFilter={(inv, q) => searchInvoice(inv, q)}
          emptyMessage={`No hay facturas con líneas que incluyan ${product.name}.`}
          renderItem={(inv) => (
            <li key={inv.id}>
              <Link
                to={`/facturacion/${inv.id}`}
                className="group flex flex-col gap-2 rounded-md border border-border px-3 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium text-foreground group-hover:text-primary">
                    {inv.number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inv.client} · Emisión {inv.issueDate}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <Badge variant={invoiceStatusVariant(inv.status)}>{inv.status}</Badge>
                  <span className="font-semibold tabular-nums">{inv.amount}</span>
                  <ChevronRight
                    aria-hidden
                    className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
              </Link>
            </li>
          )}
        />
      </CardContent>
    </Card>
  )
}
