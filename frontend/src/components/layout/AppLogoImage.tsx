import { resolveOrganizationLogoUrl } from '@/lib/organization-logo'
import { cn } from '@/lib/utils'

type AppLogoImageProps = {
  logoUrl?: string | null
  alt: string
  className?: string
}

export function AppLogoImage({ logoUrl, alt, className }: AppLogoImageProps) {
  return (
    <img
      src={resolveOrganizationLogoUrl(logoUrl)}
      alt={alt}
      className={cn('object-contain', className)}
    />
  )
}
