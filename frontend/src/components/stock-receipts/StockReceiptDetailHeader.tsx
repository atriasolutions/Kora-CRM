import {
  ArrowDownToLine,
  Archive,
  CheckCircle2,
  Pencil,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RegisterActivityHeaderButton } from '@/components/shared/RegisterActivityHeaderButton'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import type { StockReceiptDetail } from '@/data/stock-receipt-detail.mock'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'

type StockReceiptDetailHeaderProps = {
  receipt: StockReceiptDetail
  confirming?: boolean
  onStartEdit?: () => void
  onRegisterActivity?: (presetType?: ContactActivityType) => void
  onConfirm?: () => void
  onArchive?: () => void
}

export function StockReceiptDetailHeader({
  receipt,
  confirming = false,
  onStartEdit,
  onRegisterActivity,
  onConfirm,
  onArchive,
}: StockReceiptDetailHeaderProps) {
  const { showEdit, showArchive } = useDetailHeaderPermissions('ingresos', {
    onStartEdit,
    onArchive,
  })

  const isDraft = receipt.status === 'Borrador'

  const metrics = [
    { label: 'Bodega', value: receipt.warehouse },
    { label: 'Responsable', value: receipt.owner },
    { label: 'Líneas', value: String(receipt.lineItems.length) },
    {
      label: 'Referencia',
      value: receipt.externalReference || '—',
    },
    ...(receipt.confirmedAt
      ? [{ label: 'Confirmado', value: receipt.confirmedAt }]
      : []),
  ]

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-br from-muted/40 via-card to-card p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-gradient-to-br from-primary/10 to-chart-5/10 sm:size-16">
              <ArrowDownToLine aria-hidden className="size-7 text-primary sm:size-8" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">
                  {receipt.number}
                </h1>
                <Badge variant={isDraft ? 'secondary' : 'default'}>{receipt.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {receipt.externalReference} · {receipt.owner}
              </p>
              {receipt.purchaseId ? (
                <p className="text-sm">
                  Orden de compra:{' '}
                  <Link
                    to={`/compras/${receipt.purchaseId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {receipt.purchaseReference ?? receipt.purchaseId}
                  </Link>
                </p>
              ) : null}
              {receipt.supplier ? (
                <p className="text-sm text-muted-foreground">Proveedor: {receipt.supplier}</p>
              ) : null}
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-4 2xl:w-auto 2xl:shrink-0 2xl:border-t-0 2xl:pt-0">
            <RegisterActivityHeaderButton onRegister={onRegisterActivity} />
            {showEdit ? (
              <Button
                type="button"
                variant="outline"
                onClick={onStartEdit}
                disabled={!isDraft}
                title={
                  isDraft
                    ? 'Editar datos y líneas del ingreso'
                    : 'Solo ingresos en borrador pueden editarse'
                }
              >
                <Pencil aria-hidden className="size-4" />
                Editar
              </Button>
            ) : null}
            {isDraft && onConfirm ? (
              <Button
                type="button"
                disabled={confirming}
                onClick={onConfirm}
              >
                <CheckCircle2 aria-hidden className="size-4" />
                {confirming ? 'Procesando…' : 'Realizar ingreso de stock'}
              </Button>
            ) : null}
            {showArchive && onArchive ? (
              <Button type="button" variant="outline" onClick={onArchive}>
                <Archive aria-hidden className="size-4" />
                Archivar
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-border bg-muted/20 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label} className="bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="mt-0.5 text-sm font-medium tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
