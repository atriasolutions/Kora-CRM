import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type ContactFormSectionProps = {
  title: string
  description?: string
  icon?: LucideIcon
  className?: string
  children: React.ReactNode
}

export function ContactFormSection({
  title,
  description,
  icon: Icon,
  className,
  children,
}: ContactFormSectionProps) {
  return (
    <section
      className={cn(
        'rounded-lg border border-border bg-muted/15 p-4 space-y-4',
        className,
      )}
    >
      <div className="space-y-0.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {Icon ? <Icon aria-hidden className="size-4 text-primary" /> : null}
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
