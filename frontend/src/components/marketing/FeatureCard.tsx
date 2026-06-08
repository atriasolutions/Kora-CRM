import type { LucideIcon } from 'lucide-react'

import { marketingTheme } from '@/lib/marketing-theme'
import { cn } from '@/lib/utils'

type FeatureCardProps = {
  icon: LucideIcon
  title: string
  description: string
  highlights?: readonly string[]
  className?: string
  dark?: boolean
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  highlights,
  className,
  dark = false,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        'marketing-card-organic group relative overflow-hidden border p-5 transition-all duration-300 sm:p-6',
        dark
          ? 'border-white/10 bg-white/5 hover:border-primary/40 hover:bg-white/[0.07]'
          : 'border-border/70 bg-card shadow-sm hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -end-px -top-px size-16 bg-gradient-to-bl from-primary/20 to-transparent opacity-60"
        style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -end-8 -top-8 size-32 rounded-full bg-primary/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden
      />
      <span
        className={cn(
          'relative mb-4 grid size-11 place-items-center rounded-xl ring-1 ring-primary/15 transition-transform duration-300 group-hover:scale-110',
          dark
            ? cn('text-white', marketingTheme.iconSurface, 'ring-white/10')
            : 'bg-gradient-to-br from-violet-500/15 to-cyan-500/15 text-primary',
        )}
      >
        <Icon aria-hidden className="size-5" />
      </span>
      <h3
        className={cn(
          'relative text-base font-semibold sm:text-lg',
          dark ? 'text-white' : 'text-foreground',
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          'relative mt-2 text-sm leading-relaxed',
          dark ? 'text-white/65' : 'text-muted-foreground',
        )}
      >
        {description}
      </p>
      {highlights && highlights.length > 0 ? (
        <ul className="relative mt-4 space-y-1.5 border-t border-border/50 pt-4">
          {highlights.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
            >
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
