import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { EntityFileRecord } from '@/lib/entity-files'
import {
  getEntityFileImageUrl,
  getEntityFilePreviewUrl,
  isDemoEntityFilePreview,
  isImageEntityFile,
} from '@/lib/entity-files'

type EntityFilePreviewDialogProps = {
  file: EntityFileRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EntityFilePreviewDialog({
  file,
  open,
  onOpenChange,
}: EntityFilePreviewDialogProps) {
  const pdfUrl = file ? getEntityFilePreviewUrl(file) : null
  const imageUrl = file ? getEntityFileImageUrl(file) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="truncate pe-8">{file?.name}</DialogTitle>
          <DialogDescription>
            {file && isDemoEntityFilePreview(file)
              ? 'Vista previa de demostración.'
              : file && isImageEntityFile(file)
                ? 'Imagen adjunta. Clic fuera o Esc para cerrar.'
                : 'Vista previa del documento.'}
          </DialogDescription>
        </DialogHeader>
        {imageUrl ? (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted/30 p-4">
            <img
              src={imageUrl}
              alt={file?.name ?? 'Vista previa'}
              className="max-h-[min(80vh,900px)] max-w-full rounded-md border border-border bg-white object-contain shadow-sm"
            />
          </div>
        ) : pdfUrl ? (
          <div className="min-h-0 flex-1 overflow-hidden bg-muted/30 p-4">
            <iframe
              title={file ? `Vista previa: ${file.name}` : 'Vista previa PDF'}
              src={pdfUrl}
              className="h-[min(75vh,720px)] w-full rounded-md border border-border bg-white"
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
