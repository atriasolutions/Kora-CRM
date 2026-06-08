import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Contact,
  FileSpreadsheet,
  Layers,
  Receipt,
  ShoppingCart,
  Target,
  Truck,
  Warehouse,
} from 'lucide-react'

import { MarketingReveal } from '@/components/marketing/MarketingReveal'
import {
  MarketingSection,
  MarketingSectionHeader,
} from '@/components/marketing/MarketingSection'
import { MARKETING_FLOW_SECTION } from '@/lib/marketing-content'
import { cn } from '@/lib/utils'

type FlowConfig = {
  title: string
  description?: string
  steps: readonly string[]
}

type MarketingFlowSectionProps = {
  commercial: FlowConfig
  operations: FlowConfig
}

type FlowAccent = 'violet' | 'cyan'

const COMMERCIAL_ICONS: LucideIcon[] = [Contact, Target, FileSpreadsheet, Receipt]
const OPERATIONS_ICONS: LucideIcon[] = [Layers, ShoppingCart, Truck, Warehouse]

const accentStyles: Record<
  FlowAccent,
  {
    card: string
    rail: string
    node: string
    nodeRing: string
    icon: string
    badge: string
  }
> = {
  violet: {
    card: 'from-violet-500/[0.07] via-card to-card ring-violet-500/15 hover:ring-violet-500/30',
    rail: 'from-violet-500/50 via-violet-400/30 to-violet-500/10',
    node: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
    nodeRing: 'ring-violet-500/25 group-hover/step:ring-violet-500/45',
    icon: 'text-violet-600 dark:text-violet-300',
    badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-200',
  },
  cyan: {
    card: 'from-cyan-500/[0.07] via-card to-card ring-cyan-500/15 hover:ring-cyan-500/30',
    rail: 'from-cyan-500/50 via-cyan-400/30 to-cyan-500/10',
    node: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
    nodeRing: 'ring-cyan-500/25 group-hover/step:ring-cyan-500/45',
    icon: 'text-cyan-700 dark:text-cyan-300',
    badge: 'bg-cyan-500/10 text-cyan-800 dark:text-cyan-200',
  },
}

function FlowTrack({
  title,
  description,
  steps,
  icons,
  accent,
  phase,
}: {
  title: string
  description?: string
  steps: readonly string[]
  icons: LucideIcon[]
  accent: FlowAccent
  phase: '01' | '02'
}) {
  const styles = accentStyles[accent]

  return (
    <article
      className={cn(
        'marketing-flow-card group relative overflow-hidden rounded-[1.75rem_1.25rem_1.75rem_1rem] bg-gradient-to-br p-6 ring-1 transition-[box-shadow,ring-color] duration-300 sm:p-8',
        'hover:shadow-lg hover:shadow-primary/5',
        styles.card,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80',
          styles.rail,
        )}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -end-16 -top-16 size-40 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.08)_0%,transparent_68%)]"
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className={cn('inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]', styles.badge)}>
            Fase {phase}
          </p>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {title}
          </h3>
          {description ? (
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {/* Desktop: rail horizontal */}
      <ol className="relative mt-8 hidden sm:grid sm:grid-cols-4 sm:gap-3">
        <div
          className={cn(
            'pointer-events-none absolute inset-x-[12%] top-[1.375rem] h-0.5 rounded-full bg-gradient-to-r',
            styles.rail,
          )}
          aria-hidden
        />
        {steps.map((step, index) => {
          const Icon = icons[index] ?? Target
          return (
            <li key={step} className="group/step relative flex flex-col items-center text-center">
              <span
                className={cn(
                  'relative z-10 grid size-11 place-items-center rounded-2xl ring-2 transition-[ring-color,transform] duration-300 group-hover/step:-translate-y-0.5',
                  styles.node,
                  styles.nodeRing,
                )}
              >
                <Icon aria-hidden className={cn('size-5', styles.icon)} />
              </span>
              <span className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                Paso {index + 1}
              </span>
              <span className="mt-1 text-xs font-medium leading-snug text-foreground sm:text-sm">
                {step}
              </span>
            </li>
          )
        })}
      </ol>

      {/* Mobile: timeline vertical */}
      <ol className="relative mt-6 space-y-0 sm:hidden">
        {steps.map((step, index) => {
          const Icon = icons[index] ?? Target
          const isLast = index === steps.length - 1
          return (
            <li key={step} className="group/step relative flex gap-4 pb-5 last:pb-0">
              {!isLast ? (
                <span
                  className={cn(
                    'absolute start-[1.375rem] top-11 bottom-0 w-px bg-gradient-to-b',
                    styles.rail,
                  )}
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  'relative z-10 grid size-11 shrink-0 place-items-center rounded-2xl ring-2',
                  styles.node,
                  styles.nodeRing,
                )}
              >
                <Icon aria-hidden className={cn('size-5', styles.icon)} />
              </span>
              <div className="min-w-0 pt-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                  Paso {index + 1}
                </p>
                <p className="mt-0.5 text-sm font-medium text-foreground">{step}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </article>
  )
}

export function MarketingFlowSection({ commercial, operations }: MarketingFlowSectionProps) {
  const heading = MARKETING_FLOW_SECTION

  return (
    <MarketingSection tone="muted" className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(124,58,237,0.06),transparent_60%)]"
        aria-hidden
      />

      <MarketingSectionHeader
        eyebrow={heading.eyebrow}
        title={heading.title}
        description={heading.description}
      />

      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch lg:gap-4">
        <MarketingReveal>
          <FlowTrack
            title={commercial.title}
            description={commercial.description}
            steps={commercial.steps}
            icons={COMMERCIAL_ICONS}
            accent="violet"
            phase="01"
          />
        </MarketingReveal>

        <div
          className="hidden flex-col items-center justify-center gap-2 px-1 lg:flex"
          aria-hidden
        >
          <div className="h-full w-px min-h-[4rem] bg-gradient-to-b from-violet-500/30 via-border to-cyan-500/30" />
          <span className="whitespace-nowrap rounded-full border border-border/80 bg-card px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground shadow-sm">
            Mismo registro
          </span>
          <ArrowRight className="size-4 text-muted-foreground/70" />
          <div className="h-full w-px min-h-[4rem] bg-gradient-to-b from-cyan-500/30 via-border to-transparent" />
        </div>

        <MarketingReveal delay={100}>
          <FlowTrack
            title={operations.title}
            description={operations.description}
            steps={operations.steps}
            icons={OPERATIONS_ICONS}
            accent="cyan"
            phase="02"
          />
        </MarketingReveal>
      </div>
    </MarketingSection>
  )
}
