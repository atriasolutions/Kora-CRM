import { getUserApi } from '@/api/users'
import { isApiEnabled } from '@/api/config'
import type { UserListItem } from '@/data/users.mock'

const cache = new Map<string, string | undefined>()
const inflight = new Map<string, Promise<string | undefined>>()

function cacheKeyName(name: string): string {
  return `name:${name.trim()}`
}

function cacheKeyId(id: string): string {
  return `id:${id}`
}

function storeAvatar(
  userId: string,
  displayName: string | undefined,
  url: string | undefined,
): void {
  cache.set(cacheKeyId(userId), url)
  const name = displayName?.trim()
  if (name) cache.set(cacheKeyName(name), url)
}

export function getCachedUserAvatarUrl(name: string): string | undefined {
  const key = name.trim()
  if (!key) return undefined
  return cache.get(cacheKeyName(key))
}

export function getCachedUserAvatarById(userId: string): string | undefined {
  if (!userId) return undefined
  return cache.get(cacheKeyId(userId))
}

export function hasCachedUserAvatarById(userId: string): boolean {
  if (!userId) return false
  return cache.has(cacheKeyId(userId))
}

function findUserByDisplayName(
  name: string,
  users: UserListItem[],
): UserListItem | undefined {
  const key = name.trim()
  if (!key) return undefined
  return users.find((u) => u.name.trim() === key)
}

export async function resolveUserAvatarById(
  userId: string,
  displayName?: string,
): Promise<string | undefined> {
  if (!userId) return undefined
  const idCache = cacheKeyId(userId)
  if (cache.has(idCache)) return cache.get(idCache)

  const pending = inflight.get(idCache)
  if (pending) return pending

  const promise = (async () => {
    if (!isApiEnabled()) {
      cache.set(idCache, undefined)
      return undefined
    }
    try {
      const detail = await getUserApi(userId)
      const url = detail.avatarUrl?.trim() || undefined
      storeAvatar(userId, displayName ?? detail.name, url)
      return url
    } catch {
      storeAvatar(userId, displayName, undefined)
      return undefined
    } finally {
      inflight.delete(idCache)
    }
  })()

  inflight.set(idCache, promise)
  return promise
}

export async function resolveUserAvatarByName(
  name: string,
  users: UserListItem[],
): Promise<string | undefined> {
  const key = name.trim()
  if (!key) return undefined
  const nameCache = cacheKeyName(key)
  if (cache.has(nameCache)) return cache.get(nameCache)

  const user = findUserByDisplayName(key, users)
  if (!user) {
    cache.set(nameCache, undefined)
    return undefined
  }

  const idCache = cacheKeyId(user.id)
  if (cache.has(idCache)) {
    const url = cache.get(idCache)
    if (nameCache !== idCache) cache.set(nameCache, url)
    return url
  }

  const fromList = user.avatarUrl?.trim()
  if (fromList && !fromList.startsWith('data:')) {
    storeAvatar(user.id, key, fromList)
    return fromList
  }

  return resolveUserAvatarById(user.id, key)
}

export function prefetchUserAvatars(
  names: Iterable<string>,
  users: UserListItem[],
): void {
  for (const name of names) {
    const key = name.trim()
    if (!key) continue
    const nameCache = cacheKeyName(key)
    if (cache.has(nameCache) || inflight.has(nameCache)) continue
    void resolveUserAvatarByName(key, users)
  }
}

export function prefetchUserAvatarsById(userIds: Iterable<string>): void {
  for (const id of userIds) {
    if (!id) continue
    const idCache = cacheKeyId(id)
    if (cache.has(idCache) || inflight.has(idCache)) continue
    void resolveUserAvatarById(id)
  }
}

export function invalidateUserAvatarCache(
  displayName?: string,
  userId?: string,
): void {
  if (!displayName && !userId) {
    cache.clear()
    inflight.clear()
    return
  }
  if (userId) {
    cache.delete(cacheKeyId(userId))
    inflight.delete(cacheKeyId(userId))
  }
  if (displayName?.trim()) {
    const nameCache = cacheKeyName(displayName)
    cache.delete(nameCache)
    inflight.delete(nameCache)
  }
}
