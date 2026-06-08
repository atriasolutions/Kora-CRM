type DocumentTotalsBreakdownProps = {
  subtotal: string
  discountPercent?: string
  discountAmount?: string
  taxLabel: string
  taxAmount: string
  total: string
  totalLabel?: string
}

export function DocumentTotalsBreakdown({
  subtotal,
  discountPercent,
  discountAmount,
  taxLabel,
  taxAmount,
  total,
  totalLabel = 'Total',
}: DocumentTotalsBreakdownProps) {
  const showDiscount =
    discountAmount &&
    discountAmount !== '$0' &&
    discountAmount !== '−$0' &&
    discountAmount !== '-$0'

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Subtotal líneas</span>
        <span className="font-medium tabular-nums">{subtotal}</span>
      </div>
      {showDiscount ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">
            Descuento global{discountPercent ? ` (${discountPercent})` : ''}
          </span>
          <span className="font-medium tabular-nums text-destructive">{discountAmount}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">{taxLabel}</span>
        <span className="font-medium tabular-nums">{taxAmount}</span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="font-semibold text-foreground">{totalLabel}</span>
        <span className="text-lg font-bold tabular-nums text-primary">{total}</span>
      </div>
    </div>
  )
}
