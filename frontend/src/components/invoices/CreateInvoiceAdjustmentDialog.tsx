import { useEffect, useMemo, useState } from 'react'

import {
  ContactFormTextarea,
} from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { InvoiceDetail } from '@/data/invoice-detail.mock'
import type { CreateInvoiceAdjustmentBody } from '@/api/invoices'
import {
  previewDteBreakdown,
} from '@/lib/invoice-dte'
import { recalcInvoiceLine } from '@/lib/invoice-line-item'

type AdjustmentKind = 'credit_note' | 'debit_note'

type CreateInvoiceAdjustmentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: AdjustmentKind
  invoice: InvoiceDetail
  onSubmit: (body: CreateInvoiceAdjustmentBody) => Promise<void>
}

type PartialLineState = {
  id: string
  description: string
  maxQuantity: number
  quantity: number
  selected: boolean
}

export function CreateInvoiceAdjustmentDialog({
  open,
  onOpenChange,
  kind,
  invoice,
  onSubmit,
}: CreateInvoiceAdjustmentDialogProps) {
  const [mode, setMode] = useState<'full' | 'partial'>('partial')
  const [referenceReason, setReferenceReason] = useState('')
  const [partialLines, setPartialLines] = useState<PartialLineState[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setMode('partial')
      setReferenceReason('')
      setPartialLines(
        invoice.lineItems.map((line) => ({
          id: line.id,
          description: line.description,
          maxQuantity: line.quantity,
          quantity: line.quantity,
          selected: true,
        })),
      )
    })
  }, [open, invoice.lineItems])

  const previewLines = useMemo(() => {
    if (mode === 'full') return invoice.lineItems
    const selected = partialLines.filter((line) => line.selected)
    return invoice.lineItems
      .filter((line) => selected.some((row) => row.id === line.id))
      .map((line) => {
        const state = selected.find((row) => row.id === line.id)!
        return recalcInvoiceLine({ ...line, quantity: state.quantity })
      })
  }, [mode, invoice.lineItems, partialLines])

  const totals = useMemo(
    () =>
      previewDteBreakdown(previewLines, {
        globalDiscountPercent: invoice.globalDiscount ?? invoice.discountPercent,
      }),
    [previewLines, invoice.globalDiscount, invoice.discountPercent],
  )

  const previewDte = kind === 'credit_note' ? 'DTE 61' : 'DTE 56'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!referenceReason.trim()) return
    const body: CreateInvoiceAdjustmentBody = {
      mode,
      referenceReason: referenceReason.trim(),
      referenceCode: mode === 'full' && kind === 'credit_note' ? 1 : 3,
    }
    if (mode === 'partial') {
      body.lineItems = partialLines
        .filter((line) => line.selected)
        .map((line) => ({ id: line.id, quantity: line.quantity }))
    }
    setSubmitting(true)
    try {
      await onSubmit(body)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  const title = kind === 'credit_note' ? 'Nota de crédito' : 'Nota de débito'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Documento de ajuste sobre la factura {invoice.number}
            {invoice.siiNumber ? ` (folio SII ${invoice.siiNumber})` : ''}.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === 'partial' ? 'default' : 'outline'}
              onClick={() => setMode('partial')}
            >
              Ajuste parcial
            </Button>
            {kind === 'credit_note' ? (
              <Button
                type="button"
                size="sm"
                variant={mode === 'full' ? 'default' : 'outline'}
                onClick={() => setMode('full')}
              >
                Anulación total
              </Button>
            ) : null}
          </div>

          {mode === 'partial' ? (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Líneas a incluir</p>
              {partialLines.map((line) => (
                <div key={line.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={line.selected}
                      onChange={(event) =>
                        setPartialLines((rows) =>
                          rows.map((row) =>
                            row.id === line.id
                              ? { ...row, selected: event.target.checked }
                              : row,
                          ),
                        )
                      }
                    />
                    <span className="truncate">{line.description}</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={line.maxQuantity}
                    value={line.quantity}
                    disabled={!line.selected}
                    className="h-8 w-20"
                    onChange={(event) => {
                      const quantity = Number.parseInt(event.target.value, 10)
                      setPartialLines((rows) =>
                        rows.map((row) =>
                          row.id === line.id
                            ? {
                                ...row,
                                quantity: Number.isFinite(quantity)
                                  ? Math.min(line.maxQuantity, Math.max(1, quantity))
                                  : row.quantity,
                              }
                            : row,
                        ),
                      )
                    }}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <ContactFormTextarea
            id="adjustment-reason"
            label="Motivo del ajuste"
            value={referenceReason}
            onChange={setReferenceReason}
            rows={3}
          />

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Tipo DTE: </span>
              <span className="font-medium">{previewDte}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Neto afecto: </span>
              {totals.taxableSubtotal}
            </p>
            {totals.exemptSubtotal !== '$0' ? (
              <p>
                <span className="text-muted-foreground">Neto exento: </span>
                {totals.exemptSubtotal}
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">IVA: </span>
              {totals.taxAmount}
            </p>
            <p>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-semibold">{totals.amount}</span>
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !referenceReason.trim()}>
              {submitting ? 'Creando…' : `Crear ${title.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
