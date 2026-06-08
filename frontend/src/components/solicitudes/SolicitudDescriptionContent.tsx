import { useCallback, useMemo, useState } from 'react'

import { EntityFilePreviewDialog } from '@/components/shared/EntityFilePreviewDialog'
import { sanitizeRichTextHtml } from '@/lib/rich-text-sanitize'
import {
  hydrateDescriptionHtml,
  isDescriptionHtml,
  plainTextFromDescription,
  resolveDescriptionImageFile,
  SOLICITUD_FILE_ID_ATTR,
  SOLICITUD_INLINE_IMAGE_CLICKABLE_CLASS,
} from '@/lib/solicitud-description-media'
import type { SolicitudFile } from '@/lib/solicitud-files'
import { cn } from '@/lib/utils'

import '@/components/shared/rich-text/rich-text.css'

type SolicitudDescriptionContentProps = {
  html: string
  files: SolicitudFile[]
  className?: string
  emptyLabel?: string
}

function normalizeDescriptionHtml(html: string): string {
  const trimmed = html.trim()
  if (!trimmed) return ''
  if (isDescriptionHtml(trimmed)) return trimmed
  const escaped = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<p>${escaped.replace(/\n/g, '<br>')}</p>`
}

export function SolicitudDescriptionContent({
  html,
  files,
  className,
  emptyLabel = 'Sin descripción.',
}: SolicitudDescriptionContentProps) {
  const [previewFile, setPreviewFile] = useState<SolicitudFile | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSession, setPreviewSession] = useState(0)

  const safe = useMemo(() => {
    const hydrated = hydrateDescriptionHtml(normalizeDescriptionHtml(html), files)
    return sanitizeRichTextHtml(hydrated)
  }, [html, files])

  const openPreview = useCallback((file: SolicitudFile) => {
    setPreviewFile(file)
    setPreviewSession((session) => session + 1)
    setPreviewOpen(true)
  }, [])

  const resolvePreviewTarget = useCallback(
    (target: EventTarget | null) => {
      if (!(target instanceof HTMLImageElement)) return undefined
      if (!target.classList.contains(SOLICITUD_INLINE_IMAGE_CLICKABLE_CLASS)) return undefined
      return resolveDescriptionImageFile(
        target.getAttribute(SOLICITUD_FILE_ID_ATTR),
        target.getAttribute('alt'),
        files,
      )
    },
    [files],
  )

  const handleContentClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const file = resolvePreviewTarget(event.target)
      if (!file) return
      event.preventDefault()
      openPreview(file)
    },
    [openPreview, resolvePreviewTarget],
  )

  const handleContentKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      const file = resolvePreviewTarget(event.target)
      if (!file) return
      event.preventDefault()
      openPreview(file)
    },
    [openPreview, resolvePreviewTarget],
  )

  if (!plainTextFromDescription(html) && !safe.includes('<img')) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <>
      <div
        className={cn('rich-text-content solicitud-description-content', className)}
        dangerouslySetInnerHTML={{ __html: safe }}
        onClick={handleContentClick}
        onKeyDown={handleContentKeyDown}
      />
      <EntityFilePreviewDialog
        key={previewSession}
        file={previewFile}
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open)
          if (!open) setPreviewFile(null)
        }}
      />
    </>
  )
}
