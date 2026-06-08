import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { FeatureCard } from '@/components/marketing/FeatureCard'
import { MarketingReveal } from '@/components/marketing/MarketingReveal'
import type { MarketingFeatureGroup } from '@/lib/marketing-content'
import { marketingTheme } from '@/lib/marketing-theme'
import { cn } from '@/lib/utils'

type MarketingFeatureExplorerProps = {
  groups: MarketingFeatureGroup[]
}

export function MarketingFeatureExplorer({ groups }: MarketingFeatureExplorerProps) {
  const [activeId, setActiveId] = useState(groups[0]?.id ?? '')
  const activeGroup = groups.find((g) => g.id === activeId) ?? groups[0]

  if (!activeGroup) return null

  return (
    <div className="space-y-8">
      <div
        className="flex flex-wrap justify-center gap-2 rounded-2xl border border-border/60 bg-muted/30 p-2 sm:gap-3"
        role="tablist"
        aria-label="Categorías de funcionalidades"
      >
        {groups.map((group) => {
          const active = group.id === activeId
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveId(group.id)}
              className={cn(
                'rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300',
                active
                  ? cn('text-white shadow-md shadow-violet-900/30', marketingTheme.accentGradient)
                  : 'text-muted-foreground hover:bg-card hover:text-foreground',
              )}
            >
              {group.title}
            </button>
          )
        })}
      </div>

      <MarketingReveal key={activeGroup.id}>
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-primary/[0.03] p-6 sm:p-8">
          <h3 className="text-2xl font-semibold tracking-tight text-foreground">
            {activeGroup.title}
          </h3>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {activeGroup.description}
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {activeGroup.items.map((item, index) => (
              <div
                key={item.title}
                className="marketing-tab-item"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <FeatureCard
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                  highlights={item.highlights}
                />
              </div>
            ))}
          </div>
        </div>
      </MarketingReveal>
    </div>
  )
}
