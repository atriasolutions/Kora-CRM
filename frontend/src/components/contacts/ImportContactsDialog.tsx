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
import { parseContactsCsv, type CreateContactFormValues } from '@/lib/contact-create'
import { cn } from '@/lib/utils'

type ImportContactsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (rows: CreateContactFormValues[]) => void
}

export function ImportContactsDialog({
  open,
  onOpenChange,
  onImport,
}: ImportContactsDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewCount, setPreviewCount] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [skipped, setSkipped] = useState(0)
  const [parsedRows, setParsedRows] = useState<ReturnType<typeof parseContactsCsv>['rows']>(
    [],
  )
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
    const result = parseContactsCsv(text)
    setFileName(file.name)
    setParsedRows(result.rows)
    setPreviewCount(result.rows.length)
    setErrors(result.errors.slice(0, 5))
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
          <DialogTitle>Importar contactos</DialogTitle>
          <DialogDescription>
            Sube un CSV con columnas: nombre, rut, email, empresa, teléfono, cargo, estado
            (y opcionales: móvil, dirección, región, comuna, linkedin, origen). La empresa debe existir
            en el catálogo.
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
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload aria-hidden className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {fileName ? fileName : 'Arrastra un CSV o haz clic para elegir'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              También acepta filas sin cabecera: nombre, email, empresa…
            </p>
          </div>
        </button>

        {previewCount > 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <FileSpreadsheet aria-hidden className="size-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">
                {previewCount} contacto{previewCount === 1 ? '' : 's'} listo
                {previewCount === 1 ? '' : 's'} para importar
              </p>
              {skipped > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {skipped} fila{skipped === 1 ? '' : 's'} omitida{skipped === 1 ? '' : 's'} por datos inválidos
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {errors.length > 0 ? (
          <ul className="max-h-24 space-y-1 overflow-y-auto text-xs text-destructive">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
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
