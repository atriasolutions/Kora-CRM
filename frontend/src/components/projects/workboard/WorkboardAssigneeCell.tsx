import { Check, UserX } from 'lucide-react'
import { useMemo } from 'react'

import { AssigneeAvatarStack } from '@/components/shared/AssigneeAvatarStack'
import { UserAssigneeAvatar } from '@/components/shared/UserAssigneeAvatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePrefetchUserAvatars } from '@/hooks/use-user-avatar-url'
import { useUsersRegistry } from '@/hooks/use-users-registry'
import {
  assigneePickerOptions,
  toggleAssignee,
} from '@/lib/project-work-assignees'
import { cn } from '@/lib/utils'

type WorkboardAssigneeCellProps = {
  assignees: string[]
  readOnly?: boolean
  onChange: (assignees: string[]) => void
}

export function WorkboardAssigneeCell({
  assignees,
  readOnly = false,
  onChange,
}: WorkboardAssigneeCellProps) {
  const { allUsers } = useUsersRegistry()
  const teamNames = useMemo(() => allUsers.map((u) => u.name), [allUsers])
  const list = useMemo(
    () => assignees.map((s) => s.trim()).filter(Boolean),
    [assignees],
  )
  const options = useMemo(
    () => assigneePickerOptions(list, teamNames),
    [list, teamNames],
  )
  usePrefetchUserAvatars([...list, ...options])

  if (readOnly) {
    return list.length > 0 ? (
      <AssigneeAvatarStack assignees={list} />
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    )
  }

  const label =
    list.length === 0
      ? 'Asignar responsables'
      : list.length === 1
        ? `Responsable: ${list[0]}`
        : `${list.length} responsables`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex min-h-8 w-full items-center justify-center rounded-md p-0.5',
            'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          aria-label={label}
        >
          <AssigneeAvatarStack assignees={list} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Responsables
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="gap-2"
          onSelect={(e) => {
            e.preventDefault()
            onChange([])
          }}
        >
          <UserX aria-hidden className="size-4 text-muted-foreground" />
          Sin responsables
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {options.map((name) => {
          const selected = list.includes(name)
          return (
            <DropdownMenuItem
              key={name}
              className="gap-2"
              onSelect={(e) => {
                e.preventDefault()
                onChange(toggleAssignee(list, name))
              }}
            >
              <UserAssigneeAvatar
                name={name}
                className="size-6 border border-border"
                fallbackClassName="text-[9px]"
              />
              <span className={cn('min-w-0 flex-1 truncate', selected && 'font-semibold')}>
                {name}
              </span>
              {selected ? (
                <Check aria-hidden className="size-4 shrink-0 text-primary" />
              ) : (
                <span className="size-4 shrink-0" aria-hidden />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
