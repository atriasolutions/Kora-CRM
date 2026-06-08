import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type MarketingSectionProps = {
  children: ReactNode
  className?: string
  id?: string
  tone?: 'light' | 'dark' | 'muted'
}

const toneClass = {
  light: 'bg-transparent text-foreground',
  dark: 'bg-gradient-to-br from-[#0f0818] via-[#15103a] to-[#0a2d45] text-white',
  muted: 'bg-violet-500/[0.04] text-foreground',
} as const

export function MarketingSection({
  children,
  className,
  id,
  tone = 'light',
}: MarketingSectionProps) {
  return (
    <section id={id} className={cn('py-16 sm:py-20 lg:py-24', toneClass[tone], className)}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 marketing-section-content">
        {children}
      </div>
    </section>
  )
}

type MarketingSectionHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  dark?: boolean
  className?: string
}

export function MarketingSectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
  dark = false,
  className,
}: MarketingSectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-10 sm:mb-12',
        align === 'center' && 'mx-auto max-w-2xl text-center',
        align === 'left' && 'max-w-2xl text-left',
        className,
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            'mb-2 text-xs font-semibold uppercase tracking-widest',
            dark ? 'text-primary-foreground/70' : 'text-primary',
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          'text-3xl font-semibold tracking-tight sm:text-4xl',
          dark ? 'marketing-heading-gradient' : 'text-foreground',
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            'mt-3 text-base leading-relaxed sm:text-lg',
            dark ? 'text-white/70' : 'text-muted-foreground',
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}
