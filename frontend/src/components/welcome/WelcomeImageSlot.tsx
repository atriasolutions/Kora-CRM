import { ImageIcon } from 'lucide-react'
import { useState } from 'react'

import type { WelcomeAssetSpec } from '@/lib/welcome-assets'
import { cn } from '@/lib/utils'

type WelcomeImageSlotProps = {
  asset: WelcomeAssetSpec
  className?: string
  imageClassName?: string
  /** Muestra nombre de archivo sugerido cuando falta la imagen. */
  showFileHint?: boolean
  priority?: boolean
}

export function WelcomeImageSlot({
  asset,
  className,
  imageClassName,
  showFileHint = true,
  priority = false,
}: WelcomeImageSlotProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    if (!showFileHint) {
      return (
        <div
          className={cn(
            'bg-gradient-to-r from-primary/10 via-chart-5/10 to-primary/5',
            className,
          )}
          aria-hidden
        />
      )
    }

    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/25',
          'bg-gradient-to-br from-primary/[0.06] via-background to-chart-5/[0.08] p-6 text-center',
          className,
        )}
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <ImageIcon aria-hidden className="size-7" />
        </span>
        {showFileHint ? (
          <>
            <p className="text-sm font-medium text-foreground">Espacio para imagen</p>
            <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
              Agrega{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                public/welcome/{asset.recommendedFile}
              </code>
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              {asset.recommendedSize} · {asset.suggestion}
            </p>
          </>
        ) : (
          <span className="sr-only">{asset.alt}</span>
        )}
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl', className)}>
      <img
        src={asset.src}
        alt={asset.alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={cn('size-full object-cover', imageClassName)}
        onError={() => setFailed(true)}
      />
    </div>
  )
}
