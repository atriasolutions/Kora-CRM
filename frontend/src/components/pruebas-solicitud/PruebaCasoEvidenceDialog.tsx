import { useEffect, useState } from 'react'

import { SolicitudDescriptionContent } from '@/components/solicitudes/SolicitudDescriptionContent'
import { SolicitudDescriptionEditor } from '@/components/solicitudes/SolicitudDescriptionEditor'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PruebaCaso } from '@/data/pruebas-solicitud.mock'
import { listEntityFiles } from '@/lib/entity-files-storage'
import {
  hydrateDescriptionHtml,
  persistSolicitudDescriptionMedia,
} from '@/lib/solicitud-description-media'
import type { PruebaCasoFile } from '@/lib/prueba-caso-files'
import { persistPruebaCasoFiles } from '@/lib/prueba-caso-files'
import { displayPruebaCaseNumber } from '@/lib/prueba-caso-display'
import { apiActionErrorMessage } from '@/api/errors'
import { toast } from '@/lib/toast'

type PruebaCasoEvidenceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  caso: PruebaCaso
  authorName: string
  readOnly?: boolean
  onSave: (html: string) => void
}

export function PruebaCasoEvidenceDialog({
  open,
  onOpenChange,
  caso,
  authorName,
  readOnly = false,
  onSave,
}: PruebaCasoEvidenceDialogProps) {
  const [html, setHtml] = useState(caso.evidenceHtml)
  const [files, setFiles] = useState<PruebaCasoFile[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setHtml(caso.evidenceHtml)
    let cancelled = false
    setLoading(true)
    void listEntityFiles('prueba_caso', caso.id)
      .then((loaded) => {
        if (!cancelled) {
          setFiles(loaded)
          setHtml(hydrateDescriptionHtml(caso.evidenceHtml, loaded))
        }
      })
      .catch(() => {
        if (!cancelled) setFiles([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, caso.id, caso.evidenceHtml])

  const handleSave = async () => {
    if (readOnly || caso.id.startsWith('caso-temp-')) {
      onSave(html)
      onOpenChange(false)
      return
    }
    setSaving(true)
    try {
      const result = await persistSolicitudDescriptionMedia(
        caso.id,
        caso.code,
        html,
        files,
        persistPruebaCasoFiles,
      )
      onSave(result.description)
      onOpenChange(false)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudieron guardar las evidencias.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,52rem)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="space-y-1 border-b border-border px-4 py-4 text-start sm:px-6">
          <DialogTitle className="text-base sm:text-lg">
            Evidencias — {displayPruebaCaseNumber(caso.code)}
          </DialogTitle>
          <DialogDescription>
            Documenta capturas, resultados y observaciones del caso de prueba.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando evidencias…</p>
          ) : readOnly ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3 sm:p-4">
              <SolicitudDescriptionContent html={html} files={files} />
            </div>
          ) : (
            <SolicitudDescriptionEditor
              initialHtml={html}
              initialFiles={files}
              authorName={authorName}
              onChange={setHtml}
              onFilesChange={setFiles}
              placeholder="Describe las evidencias del caso. Puedes combinar texto e imágenes."
              imagesHint="Imágenes adjuntas al caso"
              className="[&_.tiptap]:min-h-[160px] sm:[&_.tiptap]:min-h-[220px]"
            />
          )}
        </div>

        {!readOnly ? (
          <DialogFooter className="gap-2 border-t border-border px-4 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
              {saving ? 'Guardando…' : 'Guardar evidencias'}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
