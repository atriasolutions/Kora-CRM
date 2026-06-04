import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  formatSiiInvoiceNumberDisplay,
  normalizeSiiInvoiceNumber,
  validateSiiInvoiceNumber,
} from '@/lib/invoice-sii'

type InvoiceEmitSiiDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceNumber: string
  initialSiiNumber?: string
  onConfirm: (siiNumber: string) => void
}

export function InvoiceEmitSiiDialog({
  open,
  onOpenChange,
  invoiceNumber,
  initialSiiNumber = '',
  onConfirm,
}: InvoiceEmitSiiDialogProps) {
  const [folio, setFolio] = useState(initialSiiNumber)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setFolio(initialSiiNumber)
    })
  }, [open, initialSiiNumber])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateSiiInvoiceNumber(folio)
    if (validation) {
      toast.warning(validation)
      return
    }
    onConfirm(normalizeSiiInvoiceNumber(folio))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Folio SII — Emitir factura</DialogTitle>
            <DialogDescription>
              Para pasar «{invoiceNumber}» a <strong>Emitida</strong> en la ruta del éxito, ingresa
              el folio del documento tributario electrónico registrado en el SII.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <ContactFormInput
              id="invoice-sii-folio"
              label="Folio SII (DTE)"
              value={folio}
              placeholder="Ej. 12.345.678"
              autoFocus
              onChange={(value) => {
                setFolio(value)
              }}
            />
            {folio.trim() ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Folio: {formatSiiInvoiceNumberDisplay(folio)}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Confirmar emisión</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
