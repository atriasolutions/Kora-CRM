import {
  CheckCircle2,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import type { EffectiveHelpTopic } from '@/help/help-topics'
import { cn } from '@/lib/utils'

type HelpTopicBodyProps = {
  topic: EffectiveHelpTopic
  compact?: boolean
}

type HelpSectionProps = {
  title: string
  icon: LucideIcon
  iconClassName?: string
  children: ReactNode
  compact?: boolean
}

function HelpSection({
  title,
  icon: Icon,
  iconClassName,
  children,
  compact,
}: HelpSectionProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm',
        compact ? 'text-sm' : '',
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-3.5 py-2.5">
        <span
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-lg',
            iconClassName ?? 'bg-primary/10 text-primary',
          )}
        >
          <Icon aria-hidden className="size-3.5" />
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
      </div>
      <div className="px-3.5 py-3">{children}</div>
    </section>
  )
}

function HelpBulletList({ items, variant }: { items: string[]; variant?: 'check' }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
          {variant === 'check' ? (
            <CheckCircle2
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-primary/80"
            />
          ) : (
            <span
              aria-hidden
              className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/50"
            />
          )}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function HelpTopicBody({ topic, compact = false }: HelpTopicBodyProps) {
  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-primary/20',
          'bg-gradient-to-br from-primary/12 via-primary/5 to-chart-5/10',
          'px-4 py-4 shadow-sm',
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -end-8 -top-8 size-24 rounded-full bg-primary/15 blur-2xl"
        />
        <div className="relative flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-background/80 text-primary shadow-sm backdrop-blur-sm">
            <Sparkles aria-hidden className="size-5" />
          </span>
          <p className="text-sm leading-relaxed text-foreground/90">{topic.summary}</p>
        </div>
      </div>

      {topic.actions.length > 0 ? (
        <HelpSection
          title="Qué puedes hacer"
          icon={Zap}
          iconClassName="bg-amber-500/15 text-amber-700 dark:text-amber-400"
          compact={compact}
        >
          <HelpBulletList items={topic.actions} variant="check" />
        </HelpSection>
      ) : null}

      {topic.concepts && topic.concepts.length > 0 ? (
        <HelpSection
          title="Conceptos"
          icon={Lightbulb}
          iconClassName="bg-violet-500/15 text-violet-700 dark:text-violet-400"
          compact={compact}
        >
          <HelpBulletList items={topic.concepts} />
        </HelpSection>
      ) : null}

      <HelpSection
        title="Permisos"
        icon={ShieldCheck}
        iconClassName="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        compact={compact}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {topic.permissionsNote}
        </p>
        {topic.yourAccessLine ? (
          <div
            className={cn(
              'mt-3 flex gap-2.5 rounded-lg border border-primary/20',
              'bg-gradient-to-r from-primary/8 to-transparent px-3 py-2.5',
            )}
          >
            <ShieldCheck
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
            <p className="text-sm font-medium leading-snug text-foreground">
              {topic.yourAccessLine}
            </p>
          </div>
        ) : null}
      </HelpSection>

      {topic.tips && topic.tips.length > 0 ? (
        <HelpSection
          title="Consejos"
          icon={Sparkles}
          iconClassName="bg-sky-500/15 text-sky-700 dark:text-sky-400"
          compact={compact}
        >
          <HelpBulletList items={topic.tips} variant="check" />
        </HelpSection>
      ) : null}
    </div>
  )
}
