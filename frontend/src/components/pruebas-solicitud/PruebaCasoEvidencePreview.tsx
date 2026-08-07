import { useEffect, useState } from 'react'

import { SolicitudDescriptionContent } from '@/components/solicitudes/SolicitudDescriptionContent'
import type { PruebaCaso } from '@/data/pruebas-solicitud.mock'
import { listEntityFiles } from '@/lib/entity-files-storage'
import type { PruebaCasoFile } from '@/lib/prueba-caso-files'
import { hydrateDescriptionHtml, hasUnresolvedDescriptionFileIds } from '@/lib/solicitud-description-media'
import { casoHasEvidence } from '@/lib/prueba-caso-display'
import { cn } from '@/lib/utils'

type PruebaCasoEvidencePreviewProps = {
  caso: PruebaCaso
  className?: string
  compact?: boolean
}

export function PruebaCasoEvidencePreview({
  caso,
  className,
  compact = false,
}: PruebaCasoEvidencePreviewProps) {
  const [files, setFiles] = useState<PruebaCasoFile[]>([])
  const [loading, setLoading] = useState(false)
  const hasContent = casoHasEvidence(caso.evidenceHtml)
  const hasBrokenRefs = hasUnresolvedDescriptionFileIds(caso.evidenceHtml)

  useEffect(() => {
    if (!hasContent) {
      setFiles([])
      return
    }
    if (caso.id.startsWith('caso-temp-')) {
      setFiles([])
      return
    }
    let cancelled = false
    setLoading(true)
    void listEntityFiles('prueba_caso', caso.id)
      .then((loaded) => {
        if (!cancelled) setFiles(loaded)
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
  }, [caso.id, caso.evidenceHtml, hasContent])

  if (hasBrokenRefs) {
    return (
      <div className={cn('space-y-2', className)}>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Las imágenes de este caso no se guardaron correctamente. Abre «Gestionar evidencias»,
          vuelve a subir las capturas y pulsa «Guardar evidencias».
        </p>
      </div>
    )
  }

  if (!hasContent) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        Sin evidencias registradas.
      </p>
    )
  }

  if (loading) {
    return <p className={cn('text-sm text-muted-foreground', className)}>Cargando evidencias…</p>
  }

  const html = hydrateDescriptionHtml(caso.evidenceHtml, files)

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-muted/20',
        compact ? 'max-h-32' : 'max-h-64',
        className,
      )}
    >
      <div className={cn('overflow-y-auto p-3 sm:p-4', compact ? 'max-h-32' : 'max-h-64')}>
        <SolicitudDescriptionContent html={html} files={files} emptyLabel="Sin evidencias." />
      </div>
    </div>
  )
}
