import { useEffect, useState } from 'react'

import { apiBaseURL } from '@/api/client'
import { loadAuthSession } from '@/lib/auth-session'

const blobCache = new Map<string, string>()

const API_ENTITY_IMAGE =
  /^\/api\/v1\/(?:contacts|companies|users)\/[^/]+\/(?:avatar|logo)(?:\?.*)?$/

export function isApiEntityImageUrl(url: string | undefined | null): boolean {
  const trimmed = url?.trim()
  if (!trimmed) return false
  if (API_ENTITY_IMAGE.test(trimmed)) return true
  try {
    const parsed = new URL(trimmed, 'http://local')
    return API_ENTITY_IMAGE.test(parsed.pathname)
  } catch {
    return false
  }
}

function resolveFetchUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = apiBaseURL()
  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}

export async function fetchAuthenticatedImageBlobUrl(
  url: string,
): Promise<string | undefined> {
  const cached = blobCache.get(url)
  if (cached) return cached

  const session = loadAuthSession()
  if (!session?.token) return undefined

  const res = await fetch(resolveFetchUrl(url), {
    headers: {
      Authorization: `Bearer ${session.token}`,
      'x-auth-token': session.token,
    },
  })
  if (!res.ok) return undefined

  const blob = await res.blob()
  if (!blob.size) return undefined

  const objectUrl = URL.createObjectURL(blob)
  blobCache.set(url, objectUrl)
  return objectUrl
}

export function useAuthenticatedImageSrc(
  url: string | undefined | null,
): string | undefined {
  const [resolved, setResolved] = useState<string | undefined>(() => {
    if (!url?.trim()) return undefined
    if (!isApiEntityImageUrl(url)) return url
    return blobCache.get(url)
  })

  useEffect(() => {
    if (!url?.trim()) {
      setResolved(undefined)
      return
    }
    if (!isApiEntityImageUrl(url)) {
      setResolved(url)
      return
    }

    const cached = blobCache.get(url)
    if (cached) {
      setResolved(cached)
      return
    }

    let cancelled = false
    void fetchAuthenticatedImageBlobUrl(url).then((blobUrl) => {
      if (!cancelled) setResolved(blobUrl)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  return resolved
}
