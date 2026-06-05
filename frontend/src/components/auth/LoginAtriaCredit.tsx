import { ExternalLink } from 'lucide-react'

import { cn } from '@/lib/utils'

const ATRIA_URL = 'https://www.atriasolutions.cl'

type LoginAtriaCreditProps = {
  className?: string
  /** Texto claro sobre fondos oscuros */
  tone?: 'light' | 'muted'
}

export function LoginAtriaCredit({ className, tone = 'muted' }: LoginAtriaCreditProps) {
  const isLight = tone === 'light'

  return (
    <p
      className={cn(
        'text-xs leading-relaxed',
        isLight ? 'text-white/55' : 'text-muted-foreground',
        className,
      )}
    >
      Creado por{' '}
      <a
        href={ATRIA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-1 font-semibold underline-offset-2 transition-colors hover:underline',
          isLight
            ? 'text-white/90 hover:text-white'
            : 'text-foreground/80 hover:text-primary',
        )}
      >
        Atria Solutions SpA
        <ExternalLink aria-hidden className="size-3 opacity-70" />
      </a>
    </p>
  )
}
