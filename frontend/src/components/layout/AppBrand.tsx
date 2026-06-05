import { Link } from 'react-router-dom'

import { AppLogoImage } from '@/components/layout/AppLogoImage'
import { KoraLogoMark } from '@/components/layout/KoraLogoMark'
import { APP_NAME } from '@/config/brand'
import { APP_HOME_PATH } from '@/lib/app-routes'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'
import { cn } from '@/lib/utils'

type AppBrandProps = {
  className?: string
  /** Barra lateral completa vs. compacta en top bar móvil */
  variant?: 'sidebar' | 'compact'
}

export function AppBrand({ className, variant = 'sidebar' }: AppBrandProps) {
  const { settings } = useOrganizationSettings()
  const displayName =
    settings.tradeName.trim() || settings.legalName.trim() || APP_NAME
  const isCompact = variant === 'compact'
  const hasCustomLogo = Boolean(settings.logoUrl?.trim())

  if (!hasCustomLogo) {
    return (
      <Link
        to={APP_HOME_PATH}
        className={cn(
          'block min-w-0 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        aria-label={`${displayName}, ir al inicio`}
      >
        <KoraLogoMark
          size={isCompact ? 'sm' : 'md'}
          align="center"
          className={cn('w-full', isCompact ? '' : 'items-center')}
        />
      </Link>
    )
  }

  if (!isCompact) {
    return (
      <Link
        to={APP_HOME_PATH}
        className={cn(
          'flex min-w-0 flex-col items-center gap-1 rounded-lg py-0.5 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        aria-label={`${displayName}, ir al inicio`}
      >
        <div className="flex h-[5.25rem] w-full items-center justify-center px-1">
          <AppLogoImage
            logoUrl={settings.logoUrl}
            alt={displayName}
            className="max-h-full max-w-full"
          />
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={APP_HOME_PATH}
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      aria-label={`${displayName}, ir al inicio`}
    >
      <div className="flex h-10 shrink-0 items-center">
        <AppLogoImage
          logoUrl={settings.logoUrl}
          alt={displayName}
          className="max-h-10 max-w-[7.5rem]"
        />
      </div>
    </Link>
  )
}
