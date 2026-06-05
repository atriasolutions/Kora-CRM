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

/** Muestra un avatar por responsable, superpuestos horizontalmente. */
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

  return (
    <div
      className={cn('flex items-center', className)}
      title={list.join(', ')}
      aria-label={`Responsables: ${list.join(', ')}`}
    >
      {list.map((name, index) => (
        <PersonAvatar
          key={`${name}-${index}`}
          name={name}
          size={size}
          className={index > 0 ? '-ms-2.5' : undefined}
        />
      ))}
    </div>
  )
}
