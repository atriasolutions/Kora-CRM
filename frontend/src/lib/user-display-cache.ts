export type CachedUserDisplay = {
  id: string
  name: string
  email?: string
}

const usersById = new Map<string, CachedUserDisplay>()

export function registerUsersInDisplayCache(users: CachedUserDisplay[]): void {
  for (const user of users) {
    if (!user.id?.trim()) continue
    usersById.set(user.id, {
      id: user.id,
      name: user.name.trim(),
      email: user.email?.trim() || undefined,
    })
  }
}

export function registerUserInDisplayCache(user: CachedUserDisplay): void {
  registerUsersInDisplayCache([user])
}

export function getUserFromDisplayCache(
  userId: string,
): CachedUserDisplay | undefined {
  return usersById.get(userId)
}

export function findUserInDisplayCacheByName(
  name: string,
): CachedUserDisplay | undefined {
  const key = name.trim().toLowerCase()
  if (!key) return undefined
  for (const user of usersById.values()) {
    if (user.name.toLowerCase() === key) return user
  }
  return undefined
}

export function resolveUserNameFromCache(
  userId: string,
  fallback?: string,
): string {
  const cached = usersById.get(userId)
  if (cached?.name) return cached.name
  return fallback?.trim() || userId
}

export function clearUserDisplayCache(): void {
  usersById.clear()
}
