import { useState } from 'react'

import type { WelcomeAssetSpec } from '@/lib/welcome-assets'
import { cn } from '@/lib/utils'

type WelcomeOptionalThumbnailProps = {
  asset: WelcomeAssetSpec
  className?: string
}

/** Miniatura solo si la imagen existe; no reserva espacio si falta el archivo. */
export function WelcomeOptionalThumbnail({
  asset,
  className,
}: WelcomeOptionalThumbnailProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <img
      src={asset.src}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      className={cn(
        'hidden size-full object-cover',
        loaded && 'block',
        className,
      )}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(false)}
    />
  )
}
