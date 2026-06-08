import { cn } from '@/lib/utils'

type MarketingAmbientMotionProps = {
  className?: string
}

/**
 * Capa decorativa ligera: gradientes radiales estáticos (sin filter: blur).
 * El movimiento queda en el hero; evita duplicar orbes animados en todo el layout.
 */
export function MarketingAmbientMotion({ className }: MarketingAmbientMotionProps) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      <div className="marketing-ambient-orb absolute -start-[12%] top-[6%] size-[min(380px,50vw)] rounded-[45%_55%_60%_40%/50%_45%_55%_50%] bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.22)_0%,transparent_68%)]" />
      <div className="marketing-ambient-orb absolute -end-[10%] top-[38%] size-[min(340px,44vw)] rounded-[55%_45%_40%_60%/45%_55%_45%_55%] bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.14)_0%,transparent_68%)]" />
    </div>
  )
}

type MarketingSectionWaveProps = {
  position?: 'top' | 'bottom'
  flip?: boolean
  className?: string
}

export function MarketingSectionWave({
  position = 'bottom',
  flip = false,
  className,
}: MarketingSectionWaveProps) {
  return (
    <div
      className={cn(
        'pointer-events-none relative h-12 w-full overflow-hidden sm:h-16',
        position === 'top' ? '-mt-px' : '-mb-px',
        flip && 'rotate-180',
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full text-violet-500/[0.06]"
      >
        <path
          fill="currentColor"
          d="M0,24 C240,48 480,0 720,24 C960,48 1200,0 1440,24 L1440,48 L0,48 Z"
        />
      </svg>
    </div>
  )
}
