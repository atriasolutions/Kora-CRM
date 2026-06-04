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
import {
  parseProductsCsv,
  type CreateProductFormValues,
} from '@/lib/product-create'
import { cn } from '@/lib/utils'

type ImportProductsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (rows: CreateProductFormValues[]) => void
}

export function ImportProductsDialog({
  open,
  onOpenChange,
  onImport,
}: ImportProductsDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewCount, setPreviewCount] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [, setSkipped] = useState(0)
  const [parsedRows, setParsedRows] = useState<CreateProductFormValues[]>([])
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setFileName(null)
      setPreviewCount(0)
      setErrors([])
      setSkipped(0)
      setParsedRows([])
      setImporting(false)
    })
  }, [open])

  const handleFile = async (file: File) => {
    const text = await file.text()
    const result = parseProductsCsv(text)
    setFileName(file.name)
    setParsedRows(result.rows)
    setPreviewCount(result.rows.length)
    setErrors(result.errors)
    setSkipped(result.skipped)
  }

  const handleImport = () => {
    if (parsedRows.length === 0) return
    setImporting(true)
    onImport(parsedRows)
    onOpenChange(false)
    setImporting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar productos</DialogTitle>
          <DialogDescription>
            Columnas: nombre, sku, categoria, tipo, unidad, precio, costo, stock_inicial,
            responsable (opcionales según plantilla).
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
            'bg-muted/20 px-6 py-10 text-center hover:border-primary/40',
          )}
        >
          <Upload aria-hidden className="size-6 text-primary" />
          <p className="text-sm font-medium">
            {fileName ? fileName : 'Seleccionar CSV'}
          </p>
        </button>

        {previewCount > 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <FileSpreadsheet aria-hidden className="size-5 text-primary" />
            <p className="font-medium">
              {previewCount} producto{previewCount === 1 ? '' : 's'} listo
              {previewCount === 1 ? '' : 's'}
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={previewCount === 0 || importing}
            onClick={handleImport}
          >
            {importing ? 'Importando…' : `Importar ${previewCount || ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
