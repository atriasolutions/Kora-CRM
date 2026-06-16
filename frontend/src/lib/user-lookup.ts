import type { UserListItem } from '@/data/users.mock'
import { getCurrentUser } from '@/lib/current-user'

/** Nombre del usuario conectado como responsable por defecto al crear registros. */
export function getDefaultOwnerName(): string {
  return getCurrentUser().name
}

export function findUserById(
  users: UserListItem[],
  userId: string,
): UserListItem | undefined {
  const id = userId.trim()
  if (!id) return undefined
  return users.find((u) => u.id === id)
}

export function findUserByName(
  users: UserListItem[],
  name: string,
): UserListItem | undefined {
  const key = name.trim().toLowerCase()
  if (!key) return undefined
  return users.find((u) => u.name.trim().toLowerCase() === key)
}

export function searchUsers(
  users: UserListItem[],
  query: string,
  options?: {
    limit?: number
    activeOnly?: boolean
    userFilter?: (user: UserListItem) => boolean
  },
): UserListItem[] {
  const limit = options?.limit ?? 12
  const activeOnly = options?.activeOnly !== false
  let pool = activeOnly ? users.filter((u) => u.status === 'Activo') : users
  if (options?.userFilter) {
    pool = pool.filter(options.userFilter)
  }
  const q = query.trim().toLowerCase()
  if (q) {
    pool = pool.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    )
  }
  return [...pool]
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .slice(0, limit)
}

export function assignableUserNames(users: UserListItem[]): string[] {
  return users
    .filter((u) => u.status === 'Activo')
    .map((u) => u.name.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'))
}
