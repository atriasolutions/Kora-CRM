import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'

import { quoteLineItemsLocked } from '@/api/quotes'
import { QuoteFormFields } from '@/components/quotes/QuoteFormFields'
import { QuoteCommercialTermsFields } from '@/components/quotes/QuoteCommercialTermsFields'
import { QuoteLineItemsEditor } from '@/components/quotes/QuoteLineItemsEditor'
import { QuoteLineItemsPanel } from '@/components/quotes/QuoteLineItemsPanel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { QuoteDetail, QuoteLineItem } from '@/data/quote-detail.mock'
import {
  applyFormValuesToQuote,
  quoteDetailToFormValues,
  type QuoteFormValues,
} from '@/lib/quote-form'
import { useProductsRegistry } from '@/hooks/use-products-registry'
import { computeQuoteTotals } from '@/lib/quote-line-item'

type EditQuoteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: QuoteDetail
  onSave: (updated: QuoteDetail) => void
}

export function EditQuoteDialog({ open, onOpenChange, quote, onSave }: EditQuoteDialogProps) {
  const [form, setForm] = useState<QuoteFormValues>(() => quoteDetailToFormValues(quote))
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>(() => quote.lineItems)
  const [saving, setSaving] = useState(false)
  const { reloadFromApi: reloadProducts } = useProductsRegistry()

  const linesLocked = quoteLineItemsLocked(quote.status)
  const totals = useMemo(
    () => computeQuoteTotals(linesLocked ? quote.lineItems : lineItems),
    [lineItems, linesLocked, quote.lineItems],
  )

  useEffect(() => {
    if (!open) return
    void reloadProducts().catch(() => {})
    queueMicrotask(() => {
      setForm(quoteDetailToFormValues(quote))
      setLineItems(quote.lineItems)
      setSaving(false)
    })
  }, [open, quote, reloadProducts])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.warning('El título es obligatorio.')
      return
    }
    if (lineItems.length === 0) {
      toast.warning('Agrega al menos una línea a la cotización.')
      return
    }
    setSaving(true)
    const itemsToSave = linesLocked ? quote.lineItems : lineItems
    onSave(applyFormValuesToQuote(quote, form, itemsToSave))
    onOpenChange(false)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar cotización</DialogTitle>
          <DialogDescription>
            Actualiza los datos y líneas de «{quote.title}». Los cambios se reflejan en el
            listado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <QuoteFormFields
            form={form}
            readOnlyOpportunity
            linkToOpportunity
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          />

          {linesLocked ? (
            <div className="space-y-2">
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                Esta cotización está <strong>Aceptada</strong>. Las líneas no se pueden modificar
                (hay stock reservado). Puedes editar título, fechas y datos comerciales; para
                cambiar líneas, mueve la cotización a otro estado primero.
              </p>
              <QuoteLineItemsPanel lineItems={quote.lineItems} showAvailability />
            </div>
          ) : (
            <QuoteLineItemsEditor lineItems={lineItems} onChange={setLineItems} />
          )}

          <QuoteCommercialTermsFields
            idPrefix="edit-qt"
            values={{
              paymentTerms: form.paymentTerms,
              deliveryTerms: form.deliveryTerms,
              terms: form.terms,
            }}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          />

          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Total cotización (IVA incl.)</span>
              <span className="text-lg font-bold tabular-nums text-primary">
                {totals.amount}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-4 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
