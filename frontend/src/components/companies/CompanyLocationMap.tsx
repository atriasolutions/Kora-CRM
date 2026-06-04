import { ExternalLink, MapPin } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  formatAddressLine,
  googleMapsEmbedFromCoords,
  googleMapsExternalUrl,
} from '@/lib/company-location'
import { cn } from '@/lib/utils'

type CompanyLocationMapProps = {
  title: string
  street: string
  city: string
  region: string
  country: string
  postalCode?: string
  lat: number
  lng: number
  className?: string
  compact?: boolean
}

export function CompanyLocationMap({
  title,
  street,
  city,
  region,
  country,
  postalCode,
  lat,
  lng,
  className,
  compact = false,
}: CompanyLocationMapProps) {
  const addressLine = formatAddressLine({ street, city, region, country, postalCode })
  const embedUrl = googleMapsEmbedFromCoords(lat, lng, compact ? 14 : 15)
  const externalUrl = googleMapsExternalUrl(lat, lng, `${title} — ${addressLine}`)

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-sm', className)}>
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin aria-hidden className="size-4 text-primary" />
            {title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{addressLine}</p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 border-border shadow-sm" asChild>
          <a href={externalUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden className="size-4" />
            Abrir en Google Maps
          </a>
        </Button>
      </div>
      <div className={cn('relative w-full bg-muted/30', compact ? 'h-[220px]' : 'h-[320px]')}>
        <iframe
          title={`Mapa: ${title}`}
          src={embedUrl}
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  )
}
