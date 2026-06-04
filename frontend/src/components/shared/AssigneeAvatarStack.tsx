import { UserPlus } from 'lucide-react'

import { UserAssigneeAvatar } from '@/components/shared/UserAssigneeAvatar'
import { usePrefetchUserAvatars } from '@/hooks/use-user-avatar-url'
import { cn } from '@/lib/utils'

type AssigneeAvatarStackProps = {
  assignees: string[]
  /** Tamaño del avatar en la pila */
  size?: 'sm' | 'md'
  className?: string
  /** Muestra icono vacío cuando no hay responsables */
  showEmpty?: boolean
}

const sizeClass = {
  sm: 'size-7 text-[10px]',
  md: 'size-8 text-[11px]',
} as const

function PersonAvatar({
  name,
  size,
  className,
}: {
  name: string
  size: 'sm' | 'md'
  className?: string
}) {
  return (
    <UserAssigneeAvatar
      name={name}
      className={cn(
        sizeClass[size],
        'shrink-0 border-2 border-background bg-background shadow-sm',
        className,
      )}
      fallbackClassName={size === 'sm' ? 'text-[10px]' : 'text-[11px]'}
    />
  )
}

/** Agrupa avatares al estilo Monday: 0 vacío, 1–2 visibles, 3+ con contador +N. */
export function AssigneeAvatarStack({
  assignees,
  size = 'sm',
  className,
  showEmpty = true,
}: AssigneeAvatarStackProps) {
  const list = assignees.map((s) => s.trim()).filter(Boolean)
  usePrefetchUserAvatars(list)

  if (list.length === 0) {
    if (!showEmpty) return null
    return (
      <span
        className={cn(
          'grid place-items-center rounded-full border border-dashed border-muted-foreground/50 bg-muted/30 text-muted-foreground',
          sizeClass[size],
          className,
        )}
        aria-hidden
      >
        <UserPlus className="size-3.5" />
      </span>
    )
  }

  if (list.length === 1) {
    return (
      <div className={cn('flex justify-center', className)} title={list[0]}>
        <PersonAvatar name={list[0]!} size={size} />
      </div>
    )
  }

  if (list.length === 2) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        title={list.join(', ')}
      >
        <PersonAvatar name={list[0]!} size={size} />
        <PersonAvatar name={list[1]!} size={size} className="-ms-2.5" />
      </div>
    )
  }

  const overflow = list.length - 1
  return (
    <div
      className={cn('flex items-center justify-center', className)}
      title={list.join(', ')}
    >
      <PersonAvatar name={list[0]!} size={size} />
      <span
        className={cn(
          '-ms-2.5 flex shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted font-semibold text-foreground',
          sizeClass[size],
          size === 'sm' ? 'text-[10px]' : 'text-[11px]',
        )}
        aria-label={`y ${overflow} más`}
      >
        +{overflow}
      </span>
    </div>
  )
}
