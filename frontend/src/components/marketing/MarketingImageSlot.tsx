import { ImageIcon } from 'lucide-react'
import { useState } from 'react'

import type { MarketingAssetSpec } from '@/lib/marketing-assets'
import { cn } from '@/lib/utils'

type MarketingImageSlotProps = {
  asset: MarketingAssetSpec
  className?: string
  imageClassName?: string
  showFileHint?: boolean
  priority?: boolean
  framed?: boolean
  variant?: 'light' | 'dark'
  /** Pantallazos de producto: `contain` en caja fija; `natural` = ancho completo sin bandas. */
  fit?: 'cover' | 'contain' | 'natural'
}

export function MarketingImageSlot({
  asset,
  className,
  imageClassName,
  showFileHint = true,
  priority = false,
  framed = false,
  variant = 'light',
  fit = 'cover',
}: MarketingImageSlotProps) {
  const [failed, setFailed] = useState(false)
  const isDark = variant === 'dark'

  if (failed) {
    if (!showFileHint) {
      return (
        <div
          className={cn(
            'bg-gradient-to-br from-primary/15 via-chart-5/10 to-transparent',
            framed && 'rounded-2xl',
            className,
          )}
          aria-hidden
        />
      )
    }

    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 overflow-hidden p-6 text-center',
          isDark
            ? 'border border-dashed border-white/20 bg-gradient-to-br from-primary/15 via-slate-900/50 to-chart-5/15'
            : 'border border-dashed border-primary/20 bg-gradient-to-br from-primary/8 via-muted/50 to-chart-5/8',
          framed ? 'rounded-2xl' : 'rounded-xl',
          className,
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 20%, hsl(var(--primary) / 0.25) 0%, transparent 55%)',
          }}
          aria-hidden
        />
        <span
          className={cn(
            'relative grid size-12 place-items-center rounded-xl',
            isDark ? 'bg-primary/25 text-white' : 'bg-primary/12 text-primary',
          )}
        >
          <ImageIcon aria-hidden className="size-6" />
        </span>
        <p
          className={cn(
            'relative text-sm font-medium',
            isDark ? 'text-white/90' : 'text-foreground',
          )}
        >
          Vista previa del producto
        </p>
        {showFileHint ? (
          <p
            className={cn(
              'relative max-w-[18rem] text-xs leading-relaxed',
              isDark ? 'text-white/55' : 'text-muted-foreground',
            )}
          >
            Pantallazo:{' '}
            <code
              className={cn(
                'rounded px-1.5 py-0.5 font-mono text-[11px]',
                isDark ? 'bg-white/10 text-white/75' : 'bg-primary/10 text-primary',
              )}
            >
              {asset.recommendedFile}
            </code>
          </p>
        ) : null}
      </div>
    )
  }

  if (fit === 'natural') {
    return (
      <img
        src={asset.src}
        alt={asset.alt}
        width={1600}
        height={869}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={cn('block h-auto w-full', imageClassName, className)}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div
      className={cn(
        'overflow-hidden',
        framed && 'rounded-2xl',
        fit === 'contain' && 'bg-[#eef1f6]',
        className,
      )}
    >
      <img
        src={asset.src}
        alt={asset.alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={cn(
          fit === 'contain' ? 'size-full object-contain object-top' : 'size-full object-cover',
          imageClassName,
        )}
        onError={() => setFailed(true)}
      />
    </div>
  )
}
