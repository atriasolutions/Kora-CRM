import { cn } from '@/lib/utils'

type MarketingBrandBackdropProps = {
  variant?: 'hero' | 'subtle'
  className?: string
}

/** Fondos decorativos violeta/cyan (misma familia que LoginPage). */
export function MarketingBrandBackdrop({
  variant = 'hero',
  className,
}: MarketingBrandBackdropProps) {
  if (variant === 'subtle') {
    return (
      <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_0%,rgba(124,58,237,0.1),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_0%_100%,rgba(6,182,212,0.08),transparent_50%)]" />
        <div className="absolute -end-[12%] -top-[18%] size-[min(420px,50vw)] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.08)_0%,transparent_68%)]" />
        <div className="absolute -bottom-[15%] -start-[8%] size-[min(360px,40vw)] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.08)_0%,transparent_68%)]" />
      </div>
    )
  }

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_20%_0%,rgba(147,51,234,0.28),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_100%,rgba(6,182,212,0.2),transparent_50%)]" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
    </div>
  )
}
