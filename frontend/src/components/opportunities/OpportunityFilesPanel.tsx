import {
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
  Image,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react'
import { useCallback, useId, useRef, useState } from 'react'

import { toast } from '@/lib/toast'

import { formatAttachmentSize } from '@/components/contacts/EmailAttachmentsField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { OpportunityFile } from '@/lib/opportunity-files'
import {
  canPreviewOpportunityFile,
  opportunityFileFromUpload,
  fileIconKind,
  getOpportunityFilePreviewUrl,
  isDemoOpportunityFilePreview,
  validateOpportunityFilesForUpload,
} from '@/lib/opportunity-files'
import { cn } from '@/lib/utils'

type OpportunityFilesPanelProps = {
  authorName: string
  files: OpportunityFile[]
  disabled?: boolean
  onFilesChange: (files: OpportunityFile[]) => void
}

function FileTypeIcon({
  kind,
  className,
}: {
  kind: ReturnType<typeof fileIconKind>
  className?: string
}) {
  const props = { 'aria-hidden': true as const, className: cn('size-5', className) }
  switch (kind) {
    case 'pdf':
      return <FileText {...props} className={cn(props.className, 'text-red-600')} />
    case 'image':
      return <Image {...props} className={cn(props.className, 'text-sky-600')} />
    case 'sheet':
      return (
        <FileSpreadsheet
          {...props}
          className={cn(props.className, 'text-emerald-600')}
        />
      )
    case 'doc':
      return <FileType {...props} className={cn(props.className, 'text-blue-600')} />
    default:
      return <FileText {...props} className={cn(props.className, 'text-muted-foreground')} />
  }
}

export function OpportunityFilesPanel({
  authorName,
  files,
  disabled = false,
  onFilesChange,
}: OpportunityFilesPanelProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewFile, setPreviewFile] = useState<OpportunityFile | null>(null)

  const previewUrl = previewFile ? getOpportunityFilePreviewUrl(previewFile) : null

  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length || disabled) return

      const incoming = Array.from(fileList)
      const validation = validateOpportunityFilesForUpload(files, incoming)
      if (validation) {
        toast.warning(validation)
        return
      }

      setUploading(true)
      try {
        const uploaded: OpportunityFile[] = []
        for (const file of incoming) {
          uploaded.push(await opportunityFileFromUpload(file, authorName))
        }
        onFilesChange([...uploaded, ...files])
      } catch {
        toast.error('No se pudo leer uno o más archivos.')
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [authorName, disabled, files, onFilesChange],
  )

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id))
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled || uploading) return
    void addFiles(e.dataTransfer.files)
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Archivos</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-border shadow-sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Upload aria-hidden className="size-4" />
          )}
          Subir archivo
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => void addFiles(e.target.files)}
        />

        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (!disabled && !uploading) inputRef.current?.click()
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            if (!disabled) setDragOver(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setDragOver(false)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => {
            if (!disabled && !uploading) inputRef.current?.click()
          }}
          className={cn(
            'flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/20 hover:bg-muted/40',
            (disabled || uploading) && 'pointer-events-none opacity-60',
          )}
        >
          <Upload
            aria-hidden
            className="mb-2 size-8 text-muted-foreground"
          />
          <p className="text-sm font-medium text-foreground">
            Arrastra archivos aquí o haz clic para seleccionar
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, imágenes, Office · hasta 10 MB por archivo
          </p>
        </div>

        {files.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Aún no hay archivos asociados a esta oportunidad.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {files.map((file) => {
              const kind = fileIconKind(file.mimeType, file.name)
              const canDownload = Boolean(file.dataUrl)
              const canPreview = canPreviewOpportunityFile(file)

              return (
                <li
                  key={file.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <button
                    type="button"
                    disabled={!canPreview}
                    onClick={() => canPreview && setPreviewFile(file)}
                    className={cn(
                      'flex min-w-0 flex-1 items-start gap-3 rounded-lg text-start transition-colors',
                      canPreview
                        ? 'cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                        : 'cursor-default',
                    )}
                  >
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted/50">
                      <FileTypeIcon kind={kind} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatAttachmentSize(file.size)}
                        {file.mimeType ? ` · ${file.mimeType.split('/').pop()}` : ''}
                        {canPreview ? ' · Clic para previsualizar' : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {file.uploadedAt} · {file.uploadedBy}
                      </p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1 sm:ms-2">
                    {canPreview ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-border"
                        onClick={() => setPreviewFile(file)}
                      >
                        Ver PDF
                      </Button>
                    ) : null}
                    {canDownload ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a href={file.dataUrl} download={file.name}>
                          <Download aria-hidden className="size-4" />
                          Descargar
                        </a>
                      </Button>
                    ) : !canPreview ? (
                      <span className="px-2 text-xs text-muted-foreground">
                        Sin vista previa
                      </span>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 text-muted-foreground hover:text-destructive"
                      disabled={disabled}
                      aria-label={`Eliminar ${file.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(file.id)
                        if (previewFile?.id === file.id) setPreviewFile(null)
                      }}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={previewFile !== null && previewUrl !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null)
        }}
      >
        <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="truncate pe-8">{previewFile?.name}</DialogTitle>
            <DialogDescription>
              {previewFile && isDemoOpportunityFilePreview(previewFile)
                ? 'Vista previa de demostración. Los archivos que subas mostrarán el PDF real.'
                : 'Vista previa del documento PDF.'}
            </DialogDescription>
          </DialogHeader>
          {previewUrl ? (
            <div className="min-h-0 flex-1 overflow-hidden bg-muted/30 p-4">
              <iframe
                title={previewFile ? `Vista previa: ${previewFile.name}` : 'Vista previa PDF'}
                src={previewUrl}
                className="h-[min(75vh,720px)] w-full rounded-md border border-border bg-white"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
