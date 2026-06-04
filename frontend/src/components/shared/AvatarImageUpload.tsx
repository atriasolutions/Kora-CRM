import { Camera, ImagePlus, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { toast } from '@/lib/toast'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { initialsFromLabel, readAvatarImageFileAsDataUrl } from '@/lib/image-upload'
import { cn } from '@/lib/utils'

type AvatarImageUploadProps = {
  value: string
  onChange: (url: string) => void
  fallbackLabel: string
  shape?: 'circle' | 'rounded'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  uploadLabel?: string
  className?: string
}

const sizeClass = {
  sm: 'size-16',
  md: 'size-20',
  lg: 'size-24',
} as const

export function AvatarImageUpload({
  value,
  onChange,
  fallbackLabel,
  shape = 'circle',
  size = 'md',
  disabled = false,
  uploadLabel = 'Subir imagen',
  className,
}: AvatarImageUploadProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const pickFile = () => {
    if (disabled || loading) return
    inputRef.current?.click()
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    setLoading(true)
    try {
      const dataUrl = await readAvatarImageFileAsDataUrl(file)
      onChange(dataUrl)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo subir la imagen.')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <Avatar
            className={cn(
              sizeClass[size],
              'border-2 border-border shadow-sm',
              shape === 'rounded' && 'rounded-xl',
            )}
          >
            <AvatarImage src={value || undefined} alt={fallbackLabel} />
            <AvatarFallback
              className={cn('text-sm font-medium', shape === 'rounded' && 'rounded-xl')}
            >
              {initialsFromLabel(fallbackLabel)}
            </AvatarFallback>
          </Avatar>
          {!disabled ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute -bottom-1 -end-1 size-8 rounded-full border border-border shadow-sm"
              aria-label={uploadLabel}
              disabled={loading}
              onClick={pickFile}
            >
              <Camera aria-hidden className="size-4" />
            </Button>
          ) : null}
        </div>

        {!disabled ? (
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border"
                disabled={loading}
                onClick={pickFile}
              >
                <ImagePlus aria-hidden className="size-4" />
                {loading ? 'Subiendo…' : uploadLabel}
              </Button>
              {value ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={() => onChange('')}
                >
                  <X aria-hidden className="size-4" />
                  Quitar
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP o GIF · máx. 2 MB · recorte centrado automático
            </p>
          </div>
        ) : null}
      </div>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={disabled || loading}
        onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
