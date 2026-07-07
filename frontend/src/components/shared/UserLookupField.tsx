import { ChevronDown, Search, UserRound, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { ContactFormField } from '@/components/contacts/ContactFormField'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { UserListItem } from '@/data/users.mock'
import { isApiEnabled } from '@/api/config'
import { useUserAvatarById } from '@/hooks/use-user-avatar-url'
import { useUsersRegistry } from '@/hooks/use-users-registry'
import { findUserByName, searchUsers } from '@/lib/user-lookup'
import { getUserDetailPath } from '@/lib/user-routes'
import { cn } from '@/lib/utils'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

type UserLookupFieldProps = {
  label?: string
  /** Nombre del usuario (campo denormalizado en formularios). */
  value: string
  onChange: (name: string, user?: UserListItem) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  helperText?: string
  activeOnly?: boolean
  userFilter?: (user: UserListItem) => boolean
}

function SelectedUserAvatar({
  user,
  displayName,
}: {
  user?: UserListItem
  displayName: string
}) {
  const resolvedUrl = useUserAvatarById(
    user?.id ?? '',
    displayName,
    user?.avatarUrl,
  )
  return (
    <Avatar className="size-8 shrink-0 border border-border">
      <AvatarImage src={resolvedUrl} alt="" />
      <AvatarFallback className="text-xs">{initials(displayName)}</AvatarFallback>
    </Avatar>
  )
}

export function UserLookupField({
  label = 'Responsable',
  value,
  onChange,
  disabled = false,
  className,
  placeholder = 'Buscar usuario del CRM…',
  helperText = 'Selecciona un usuario activo del equipo.',
  activeOnly = true,
  userFilter,
}: UserLookupFieldProps) {
  const generatedId = useId()
  const inputId = `crm-user-lookup-${generatedId.replace(/:/g, '')}`
  const inputName = `crm-user-lookup-field-${generatedId.replace(/:/g, '')}`
  const { allUsers, reloadFromApi, usersDirectoryLoaded } = useUsersRegistry()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [blockAutofill, setBlockAutofill] = useState(true)

  useEffect(() => {
    if (!isApiEnabled() || allUsers.length > 0) return
    void reloadFromApi().catch(() => {})
  }, [allUsers.length, reloadFromApi])

  const selectedUser = useMemo(
    () => findUserByName(allUsers, value),
    [allUsers, value],
  )

  const displayName = value.trim()

  const results = useMemo(
    () =>
      searchUsers(allUsers, query, {
        limit: 12,
        activeOnly,
        userFilter,
      }),
    [allUsers, query, activeOnly, userFilter],
  )

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const selectUser = (user: UserListItem) => {
    onChange(user.name, user)
    setQuery('')
    setOpen(false)
  }

  const clearSelection = () => {
    onChange('')
    setQuery('')
    setBlockAutofill(true)
    setOpen(true)
  }

  const showSearchInput = !displayName || open

  return (
    <ContactFormField label={label} id={inputId} className={cn('w-full min-w-0', className)}>
      <div ref={containerRef} className="relative w-full min-w-0">
        <input
          type="text"
          tabIndex={-1}
          aria-hidden
          autoComplete="off"
          className="pointer-events-none absolute size-0 opacity-0"
          defaultValue=""
        />
        {displayName && !open ? (
          <div
            className={cn(
              'flex w-full min-w-0 items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5 shadow-sm',
              disabled && 'opacity-60',
            )}
          >
            <SelectedUserAvatar user={selectedUser} displayName={displayName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {selectedUser
                  ? [
                      selectedUser.guestCompanyName?.trim(),
                      selectedUser.role,
                      selectedUser.email,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : 'Usuario no encontrado en el directorio'}
              </p>
            </div>
            {!disabled ? (
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Cambiar usuario"
                  onClick={() => {
                    setQuery(displayName)
                    setBlockAutofill(true)
                    setOpen(true)
                  }}
                >
                  <ChevronDown aria-hidden className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  aria-label="Quitar usuario"
                  onClick={clearSelection}
                >
                  <X aria-hidden className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="relative w-full min-w-0">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id={inputId}
              name={inputName}
              type="search"
              value={query}
              disabled={disabled}
              readOnly={blockAutofill && !disabled}
              placeholder={placeholder}
              className="h-9 bg-background ps-8 shadow-sm"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore
              data-form-type="other"
              role="combobox"
              aria-expanded={open}
              aria-controls={`${inputId}-listbox`}
              aria-autocomplete="list"
              onFocus={() => {
                setBlockAutofill(false)
                setOpen(true)
              }}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
            />
          </div>
        )}

        {open && !disabled ? (
          <ul
            id={`${inputId}-listbox`}
            role="listbox"
            className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
          >
            {!usersDirectoryLoaded ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                Cargando usuarios…
              </li>
            ) : null}
            {usersDirectoryLoaded && allUsers.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                No hay usuarios activos disponibles
              </li>
            ) : null}
            {allUsers.length > 0 && results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
            ) : null}
            {results.map((user) => (
              <li key={user.id} role="option">
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-muted',
                    user.name.trim().toLowerCase() === displayName.toLowerCase() &&
                      'bg-muted/80',
                  )}
                  onClick={() => selectUser(user)}
                >
                  <UserRound
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{user.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.role} · {user.email}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {selectedUser && !disabled ? (
        <p className="text-xs text-muted-foreground">
          <Link
            to={getUserDetailPath(selectedUser.id)}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Ver ficha de {selectedUser.name}
          </Link>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </ContactFormField>
  )
}
