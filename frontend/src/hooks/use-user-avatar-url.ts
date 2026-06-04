import { useEffect, useState } from 'react'

import { useUsersRegistry } from '@/hooks/use-users-registry'
import {
  getCachedUserAvatarById,
  getCachedUserAvatarUrl,
  hasCachedUserAvatarById,
  prefetchUserAvatars,
  prefetchUserAvatarsById,
  resolveUserAvatarById,
  resolveUserAvatarByName,
} from '@/lib/user-avatar-resolve'

export function useUserAvatarUrl(displayName: string): string | undefined {
  const { allUsers } = useUsersRegistry()
  const trimmed = displayName.trim()
  const [url, setUrl] = useState<string | undefined>(() =>
    trimmed ? getCachedUserAvatarUrl(trimmed) : undefined,
  )

  useEffect(() => {
    if (!trimmed) {
      setUrl(undefined)
      return
    }
    const cached = getCachedUserAvatarUrl(trimmed)
    if (cached !== undefined) {
      setUrl(cached)
      return
    }
    let cancelled = false
    void resolveUserAvatarByName(trimmed, allUsers).then((resolved) => {
      if (!cancelled) setUrl(resolved)
    })
    return () => {
      cancelled = true
    }
  }, [trimmed, allUsers])

  return url
}

export function useUserAvatarById(
  userId: string,
  displayName: string,
  fallbackUrl?: string,
): string | undefined {
  const trimmedId = userId.trim()
  const direct = fallbackUrl?.trim()
  const [url, setUrl] = useState<string | undefined>(() => {
    if (direct && !direct.startsWith('data:')) return direct
    if (direct?.startsWith('data:') && trimmedId) {
      return getCachedUserAvatarById(trimmedId) ?? getCachedUserAvatarUrl(displayName)
    }
    return trimmedId
      ? getCachedUserAvatarById(trimmedId) ?? getCachedUserAvatarUrl(displayName)
      : undefined
  })

  useEffect(() => {
    if (direct && !direct.startsWith('data:')) {
      setUrl(direct)
      return
    }
    if (!trimmedId) {
      setUrl(undefined)
      return
    }
    if (hasCachedUserAvatarById(trimmedId)) {
      setUrl(getCachedUserAvatarById(trimmedId))
      return
    }
    let cancelled = false
    void resolveUserAvatarById(trimmedId, displayName).then((resolved) => {
      if (!cancelled) setUrl(resolved)
    })
    return () => {
      cancelled = true
    }
  }, [trimmedId, displayName, direct])

  return url
}

export function usePrefetchUserAvatars(names: string[]): void {
  const { allUsers } = useUsersRegistry()
  const key = names.map((n) => n.trim()).filter(Boolean).join('\0')

  useEffect(() => {
    if (!key) return
    prefetchUserAvatars(key.split('\0'), allUsers)
  }, [key, allUsers])
}

export function usePrefetchUserAvatarsById(userIds: string[]): void {
  const key = userIds.map((id) => id.trim()).filter(Boolean).join('\0')

  useEffect(() => {
    if (!key) return
    prefetchUserAvatarsById(key.split('\0'))
  }, [key])
}
