import { Check } from 'lucide-react'
import { useMemo } from 'react'

import { AssigneeAvatarStack } from '@/components/shared/AssigneeAvatarStack'
import { UserAssigneeAvatar } from '@/components/shared/UserAssigneeAvatar'
import { ContactFormField } from '@/components/contacts/ContactFormField'
import { usePrefetchUserAvatars } from '@/hooks/use-user-avatar-url'
import { useUsersRegistry } from '@/hooks/use-users-registry'
import {
  assigneePickerOptions,
  toggleAssignee,
} from '@/lib/project-work-assignees'
import { cn } from '@/lib/utils'

type WorkboardAssigneesFieldProps = {
  id: string
  assignees: string[]
  onChange: (assignees: string[]) => void
}

export function WorkboardAssigneesField({
  id,
  assignees,
  onChange,
}: WorkboardAssigneesFieldProps) {
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

  return (
    <ContactFormField id={id} label="Responsables">
      <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex items-center gap-3">
          <AssigneeAvatarStack assignees={list} size="md" />
          <p className="text-xs text-muted-foreground">
            {list.length === 0
              ? 'Sin asignar — selecciona una o más personas.'
              : list.length === 1
                ? '1 responsable'
                : `${list.length} responsables`}
          </p>
        </div>
        <ul className="max-h-48 space-y-1 overflow-y-auto" role="listbox" aria-labelledby={id}>
          {options.map((name) => {
            const selected = list.includes(name)
            return (
              <li key={name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted',
                    selected && 'bg-muted/80',
                  )}
                  onClick={() => onChange(toggleAssignee(list, name))}
                >
                  <UserAssigneeAvatar
                    name={name}
                    className="size-7 border border-border"
                    fallbackClassName="text-[10px]"
                  />
                  <span className={cn('min-w-0 flex-1', selected && 'font-medium')}>
                    {name}
                  </span>
                  {selected ? (
                    <Check aria-hidden className="size-4 shrink-0 text-primary" />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </ContactFormField>
  )
}
