import { FileSpreadsheet, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { parseStockReceiptsCsv } from '@/lib/stock-receipt-import'
import type { StockReceiptFormValues } from '@/lib/stock-receipt-form'
import { cn } from '@/lib/utils'

type ImportStockReceiptsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingNumbers: string[]
  onImport: (values: StockReceiptFormValues) => void
}

export function ImportStockReceiptsDialog({
  open,
  onOpenChange,
  existingNumbers,
  onImport,
}: ImportStockReceiptsDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [skipped, setSkipped] = useState(0)
  const [parsed, setParsed] = useState<StockReceiptFormValues | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setFileName(null)
      setErrors([])
      setSkipped(0)
      setParsed(null)
      setImporting(false)
    })
  }, [open])

  const handleFile = async (file: File) => {
    const text = await file.text()
    const result = parseStockReceiptsCsv(text, { existingNumbers })
    setFileName(file.name)
    setParsed(result.values)
    setErrors(result.errors)
    setSkipped(result.skipped)
  }

  const lineCount = parsed?.lineItems.filter((l) => l.sku.trim()).length ?? 0

  const handleImport = () => {
    if (!parsed) return
    setImporting(true)
    onImport(parsed)
    onOpenChange(false)
    setImporting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar ingreso desde CSV</DialogTitle>
          <DialogDescription>
            Columnas: sku, cantidad (obligatorias); bodega, referencia_externa, proveedor, notas
            (opcionales). Se crea un ingreso en Borrador para revisar y confirmar.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = ''
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border',
            'bg-muted/20 px-6 py-10 text-center transition-colors hover:border-primary/40 hover:bg-muted/40',
          )}
        >
          <Upload aria-hidden className="size-6 text-primary" />
          <p className="text-sm font-medium">
            {fileName ? fileName : 'Seleccionar archivo CSV'}
          </p>
        </button>

        {lineCount > 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <FileSpreadsheet aria-hidden className="size-5 text-primary" />
            <p>
              <span className="font-medium">{lineCount} línea(s)</span> listas en ingreso{' '}
              {parsed?.number}
            </p>
          </div>
        ) : null}

        {errors.length > 0 ? (
          <ul className="max-h-24 space-y-1 overflow-y-auto text-xs text-destructive">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        ) : null}

        {skipped > 0 ? (
          <p className="text-xs text-muted-foreground">
            {skipped} fila(s) omitida(s).
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={!parsed || importing} onClick={handleImport}>
            {importing ? 'Importando…' : 'Crear ingreso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
