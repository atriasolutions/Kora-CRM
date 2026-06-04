import {
  ArrowDownToLine,
  Building2,
  Calendar,
  ChevronDown,
  Eye,
  Mail,
  MoreHorizontal,
  Package,
  Pencil,
  Phone,
  ShoppingCart,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PurchaseOrderPdfPreviewDialog } from '@/components/purchases/PurchaseOrderPdfPreviewDialog'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import { purchaseOrderTotals } from '@/lib/purchase-line-item'
import { isPurchaseOpenForStock } from '@/lib/purchase-journey'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'
import { purchaseJourneyStageVariant } from '@/lib/purchase-journey'

type PurchaseDetailHeaderProps = {
  purchase: PurchaseDetail
  onStartEdit?: () => void
  onRegisterActivity?: (presetType?: ContactActivityType) => void
  onStockReceipt?: () => void
  onArchive?: () => void
}

export function PurchaseDetailHeader({
  purchase,
  onStartEdit,
  onRegisterActivity,
  onStockReceipt,
  onArchive,
}: PurchaseDetailHeaderProps) {
  const { showEdit, showArchive } = useDetailHeaderPermissions('compras', {
    onStartEdit,
    onArchive,
  })

  const canStockReceipt = isPurchaseOpenForStock(purchase.status)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const orderTotals = purchaseOrderTotals(purchase.lineItems)
  const displayTitle =
    purchase.supplier.trim() || purchase.productSummary.trim() || 'Orden de compra'

  const metrics = [
    { label: 'Monto OC', value: purchase.amount },
    {
      label: 'Unidades solicitadas',
      value: String(orderTotals.quantityOrdered),
    },
    {
      label: 'Líneas',
      value: String(orderTotals.lineCount),
    },
    { label: 'Entrega estimada', value: purchase.expectedDelivery || '—' },
    { label: 'Responsable', value: purchase.owner },
  ]

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-br from-muted/40 via-card to-card p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-gradient-to-br from-primary/10 to-chart-5/10 sm:size-16">
                <ShoppingCart aria-hidden className="size-7 text-primary sm:size-8" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">
                    {displayTitle}
                  </h1>
                  <Badge variant={purchaseJourneyStageVariant(purchase.stage)}>
                    {purchase.stage}
                  </Badge>
                  {purchase.status !== 'Borrador' ? (
                    <Badge variant="outline">
                      <Package aria-hidden className="me-1 size-3" />
                      OC {purchase.status.toLowerCase()}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  Orden {purchase.orderDate} · {purchase.owner}
                  {purchase.productSummary && purchase.supplier
                    ? ` · ${purchase.productSummary}`
                    : null}
                </p>
                {purchase.supplierId ? (
                  <Link
                    to={`/empresas/${purchase.supplierId}`}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Building2 aria-hidden className="size-4" />
                    Ver proveedor
                  </Link>
                ) : null}
              </div>
            </div>

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
              {canStockReceipt && onStockReceipt ? (
                <Button
                  variant="default"
                  size="sm"
                  className="shadow-sm"
                  onClick={onStockReceipt}
                >
                  <ArrowDownToLine aria-hidden className="size-4" />
                  Ingresar a stock
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="border-border shadow-sm"
                onClick={() => setPdfPreviewOpen(true)}
              >
                <Eye aria-hidden className="size-4" />
                Ver PDF OC
              </Button>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="border-border shadow-sm">
                    <MoreHorizontal aria-hidden className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Duplicar orden</DropdownMenuItem>
                  {showArchive ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={onArchive}
                      >
                        Archivar
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {metrics.map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Mail aria-hidden className="size-4" />
              {purchase.supplierEmail}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone aria-hidden className="size-4" />
              {purchase.supplierPhone}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Package aria-hidden className="size-4" />
              {purchase.productSummary}
            </span>
          </div>
        </div>
      </section>

      <PurchaseOrderPdfPreviewDialog
        purchase={purchase}
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
      />
    </>
  )
}
