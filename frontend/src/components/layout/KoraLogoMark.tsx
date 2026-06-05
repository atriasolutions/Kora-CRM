import { APP_NAME, APP_NAME_SHORT } from '@/config/brand'
import { KORA_DEFAULT_LOGO_URL } from '@/lib/organization-logo'
import { cn } from '@/lib/utils'

type KoraLogoMarkProps = {
  className?: string
  /** Más grande en panel izquierdo del login */
  size?: 'sm' | 'md' | 'lg'
  /** Centrado (móvil) vs alineado al inicio (escritorio) */
  align?: 'start' | 'center'
  /**
   * hero — login / landing: logo con halo de marca y wordmark.
   * framed — sidebar: logo compacto con marco suave.
   */
  variant?: 'hero' | 'framed'
  /** Contraste del wordmark en variant hero */
  tone?: 'light' | 'dark'
}

const logoSizes = {
  sm: 'size-9',
  md: 'size-14 sm:size-16',
  lg: 'size-[4.5rem] sm:size-20',
} as const

const framedSizes = {
  sm: 'h-8 w-auto max-w-[5.5rem]',
  md: 'h-12 w-auto max-w-[180px]',
  lg: 'h-14 w-auto max-w-[200px]',
} as const

/**
 * Logo Kora (`logo_kora_limpio.png`).
 */
export function KoraLogoMark({
  className,
  size = 'lg',
  align = 'start',
  variant = 'framed',
  tone = 'dark',
}: KoraLogoMarkProps) {
  if (variant === 'hero') {
    const showWordmark = size !== 'sm'
    const onDark = tone === 'light'

    return (
      <div
        className={cn(
          'flex flex-col',
          align === 'center' ? 'items-center text-center' : 'items-start',
          className,
        )}
      >
        <div
          className={cn(
            'relative flex items-center gap-4 sm:gap-5',
            align === 'center' && 'flex-col sm:flex-row sm:items-center',
          )}
        >
          <div className="relative shrink-0">
            <div
              className={cn(
                'pointer-events-none absolute -inset-5 rounded-full opacity-90 blur-2xl',
                onDark
                  ? 'bg-gradient-to-br from-violet-400/40 via-fuchsia-400/25 to-cyan-400/35'
                  : 'bg-gradient-to-br from-violet-500/35 via-primary/30 to-cyan-400/35',
              )}
              aria-hidden
            />
            <img
              src={KORA_DEFAULT_LOGO_URL}
              alt={APP_NAME}
              className={cn(
                'relative object-contain drop-shadow-[0_16px_40px_rgba(0,0,0,0.35)]',
                size === 'lg' ? 'size-[5.5rem] sm:size-24' : logoSizes[size],
              )}
            />
          </div>

          {showWordmark ? (
            <div
              className={cn(
                'min-w-0',
                align === 'center' && 'mt-2 sm:mt-0 sm:text-left',
              )}
            >
              <p
                className={cn(
                  'text-[10px] font-bold uppercase tracking-[0.24em] sm:text-[11px]',
                  onDark ? 'text-white/50' : 'text-primary/70',
                )}
              >
                CRM
              </p>
              <p
                className={cn(
                  'font-bold tracking-tight',
                  onDark
                    ? 'bg-gradient-to-r from-white via-violet-100 to-cyan-200 bg-clip-text text-3xl text-transparent sm:text-[2.35rem] sm:leading-none'
                    : cn(
                        'bg-gradient-to-r from-violet-600 via-primary to-cyan-600 bg-clip-text text-transparent',
                        size === 'lg'
                          ? 'text-3xl sm:text-[2rem] sm:leading-none'
                          : 'text-2xl leading-none',
                      ),
                )}
              >
                {APP_NAME_SHORT}
              </p>
            </div>
          ) : null}
        </div>
        <p className="sr-only">{APP_NAME}</p>
      </div>
    )
  }

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
          'inline-flex items-center justify-center rounded-xl border border-border/50 bg-card/80 px-3 py-2 shadow-sm shadow-primary/5 backdrop-blur-sm',
          size === 'sm' && 'rounded-lg px-2 py-1.5',
        )}
      >
        <img
          src={KORA_DEFAULT_LOGO_URL}
          alt={APP_NAME}
          className={cn('object-contain', framedSizes[size])}
        />
      </div>
      <p className="sr-only">{APP_NAME}</p>
    </div>
  )
}
