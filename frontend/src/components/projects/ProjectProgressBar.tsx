import { cn } from '@/lib/utils'

type ProjectProgressBarProps = {
  progressNum: number
  className?: string
  size?: 'sm' | 'md'
}

export function ProjectProgressBar({
  progressNum,
  className,
  size = 'md',
}: ProjectProgressBarProps) {
  const pct = Math.min(100, Math.max(0, progressNum))
  return (
    <div
      className={cn(
        'overflow-hidden rounded-full bg-muted',
        size === 'sm' ? 'h-1.5' : 'h-2.5',
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-chart-2 to-chart-1 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
