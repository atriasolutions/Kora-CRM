import { Paperclip, X } from 'lucide-react'
import { useId, useRef } from 'react'

import { Button } from '@/components/ui/button'
import type { ContactEmailAttachment } from '@/data/contact-emails.mock'
import { cn } from '@/lib/utils'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_FILES = 5

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type EmailAttachmentsFieldProps = {
  attachments: ContactEmailAttachment[]
  onChange: (attachments: ContactEmailAttachment[]) => void
  disabled?: boolean
  error?: string | null
  onError?: (message: string | null) => void
}

export function EmailAttachmentsField({
  attachments,
  onChange,
  disabled = false,
  error,
  onError,
}: EmailAttachmentsFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return
    onError?.(null)

    const next = [...attachments]
    for (const file of Array.from(files)) {
      if (next.length >= MAX_FILES) {
        onError?.(`Máximo ${MAX_FILES} archivos por correo.`)
        break
      }
      if (file.size > MAX_FILE_BYTES) {
        onError?.(`«${file.name}» supera el límite de 10 MB.`)
        continue
      }
      next.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        size: file.size,
        mimeType: file.type || undefined,
      })
    }
    onChange(next)
    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id))
    onError?.(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-border"
          disabled={disabled || attachments.length >= MAX_FILES}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip aria-hidden className="size-4" />
          Adjuntar archivo
        </Button>
        <span className="text-xs text-muted-foreground">
          Hasta {MAX_FILES} archivos · 10 MB c/u (demo)
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {attachments.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {attachments.map((file) => (
            <li
              key={file.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs"
            >
              <Paperclip aria-hidden className="size-3.5 text-muted-foreground" />
              <span className="max-w-[180px] truncate font-medium">{file.name}</span>
              <span className="text-muted-foreground">
                ({formatAttachmentSize(file.size)})
              </span>
              <button
                type="button"
                disabled={disabled}
                className={cn(
                  'rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground',
                  disabled && 'pointer-events-none opacity-50',
                )}
                aria-label={`Quitar ${file.name}`}
                onClick={() => remove(file.id)}
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

type EmailAttachmentsListProps = {
  attachments: ContactEmailAttachment[]
  className?: string
}

export function EmailAttachmentsList({
  attachments,
  className,
}: EmailAttachmentsListProps) {
  if (attachments.length === 0) return null

  return (
    <ul className={cn('mt-3 space-y-1.5', className)}>
      {attachments.map((file) => (
        <li key={file.id}>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-foreground">
            <Paperclip aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="font-medium">{file.name}</span>
            <span className="text-muted-foreground">
              ({formatAttachmentSize(file.size)})
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
