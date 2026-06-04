import { APP_NAME } from '@/config/brand'
import { KORA_DEFAULT_LOGO_URL } from '@/lib/organization-logo'
import { cn } from '@/lib/utils'

type KoraLogoMarkProps = {
  className?: string
  /** Más grande en panel izquierdo del login */
  size?: 'sm' | 'md' | 'lg'
  /** Centrado (móvil) vs alineado al inicio (escritorio) */
  align?: 'start' | 'center'
}

const sizeClasses = {
  sm: 'h-8 w-auto max-w-[5.5rem]',
  md: 'h-14 w-auto max-w-[200px] sm:h-16 sm:max-w-[220px]',
  lg: 'h-[4.25rem] w-auto max-w-[220px] sm:h-24 sm:max-w-[260px]',
} as const

const framePadding = {
  sm: 'rounded-lg px-2.5 py-1.5',
  md: 'rounded-2xl px-5 py-3.5',
  lg: 'rounded-2xl px-6 py-4',
} as const

/**
 * Logo Kora con marco blanco: el PNG trae fondo blanco y así se integra bien
 * sobre fondos con gradiente o color.
 */
export function KoraLogoMark({
  className,
  size = 'lg',
  align = 'start',
}: KoraLogoMarkProps) {
  return (
    <div
      className={cn(
        'flex flex-col',
        align === 'center' ? 'items-center' : 'items-start',
        className,
      )}
    >
      <div
        className={cn(
          'inline-flex items-center justify-center bg-white shadow-sm ring-1 ring-border/60',
          'dark:bg-card dark:ring-border',
          framePadding[size],
        )}
      >
        <img
          src={KORA_DEFAULT_LOGO_URL}
          alt={APP_NAME}
          className={cn('object-contain', sizeClasses[size])}
        />
      </div>
      <p className="sr-only">{APP_NAME}</p>
    </div>
  )
}
