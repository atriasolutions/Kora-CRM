import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ScreenshotFrameProps = {
  children: ReactNode
  className?: string
  caption?: string
}

export function ScreenshotFrame({ children, className, caption }: ScreenshotFrameProps) {
  return (
    <figure className={cn('group flex flex-col gap-3', className)}>
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xl shadow-primary/10',
          'ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-1',
        )}
      >
        <div
          className="flex items-center gap-1.5 border-b border-border/60 bg-muted/80 px-3 py-2"
          aria-hidden
        >
          <span className="size-2.5 rounded-full bg-red-400/90" />
          <span className="size-2.5 rounded-full bg-amber-400/90" />
          <span className="size-2.5 rounded-full bg-emerald-400/90" />
          <span className="ms-2 h-1.5 flex-1 max-w-[8rem] rounded-full bg-border/80" />
        </div>
        <div className="bg-[#eef1f6]">{children}</div>
      </div>
      {caption ? (
        <figcaption className="text-center text-sm leading-relaxed text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}
