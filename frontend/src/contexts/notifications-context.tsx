import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import {
  clearAllNotificationsApi,
  listNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '@/api/notifications'
import { apiBaseURL } from '@/api/client'
import type { NotificationItem, NotificationType } from '@/types/notification'
import { isApiEnabled } from '@/api/config'
import { loadAuthSession } from '@/lib/auth-session'
import {
  dispatchActivitiesUpdated,
  dispatchInventoryUpdated,
} from '@/lib/realtime-events'
import { toast } from '@/lib/toast'

const LOCAL_NOTIFICATIONS_KEY = 'kora-crm-local-notifications'

function notificationsWebSocketUrl(token: string): string {
  const apiBase = apiBaseURL()
  if (apiBase) {
    try {
      const url = new URL(apiBase)
      const proto = url.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${proto}//${url.host}/ws?token=${encodeURIComponent(token)}`
    } catch {
      // fallback al host actual
    }
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws?token=${encodeURIComponent(token)}`
}

type NotificationsContextValue = {
  unreadCount: number
  items: NotificationItem[]
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  clearAll: () => Promise<void>
  addLocalNotification: (input: {
    type: NotificationType
    title: string
    message: string
    href?: string
    entityType?: string
    entityId?: string
    sourceKey?: string
  }) => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const useApi = isApiEnabled()
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const loadLocalNotifications = useCallback((): NotificationItem[] => {
    try {
      const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as NotificationItem[]
      return Array.isArray(parsed) ? parsed.slice(0, 100) : []
    } catch {
      return []
    }
  }, [])

  const persistLocalNotifications = useCallback((next: NotificationItem[]) => {
    try {
      const localOnly = next.filter((n) => n.id.startsWith('local-')).slice(0, 100)
      localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(localOnly))
    } catch {
      // quota
    }
  }, [])

  const persistLocalNotificationsRef = useRef(persistLocalNotifications)
  persistLocalNotificationsRef.current = persistLocalNotifications

  const mergeNotifications = useCallback((remote: NotificationItem[]) => {
    const local = loadLocalNotifications()
    const merged = [...remote, ...local]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100)
    setItems(merged)
    setUnreadCount(merged.filter((n) => !n.readAt).length)
  }, [loadLocalNotifications])

  const addLocalNotification = useCallback(
    (input: {
      type: NotificationType
      title: string
      message: string
      href?: string
      entityType?: string
      entityId?: string
      sourceKey?: string
    }) => {
      const now = new Date().toISOString()
      const stableId = input.sourceKey ? `local-${input.sourceKey}` : null
      const next: NotificationItem = {
        id: stableId ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: input.type,
        title: input.title,
        message: input.message,
        href: input.href,
        entityType: input.entityType,
        entityId: input.entityId,
        createdAt: now,
      }
      setItems((prev) => {
        const existingIdx = prev.findIndex((n) => n.id === next.id)
        const updated =
          existingIdx >= 0
            ? prev
            : [next, ...prev].slice(0, 100)
        setUnreadCount(updated.filter((n) => !n.readAt).length)
        persistLocalNotifications(updated)
        return updated
      })
    },
    [persistLocalNotifications],
  )

  const markRead = useCallback(async (id: string) => {
    if (id.startsWith('local-')) {
      setItems((prev) =>
        {
          const next = prev.map((n) =>
            n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n,
          )
          setUnreadCount(next.filter((n) => !n.readAt).length)
          persistLocalNotifications(next)
          return next
        },
      )
      return
    }
    try {
      await markNotificationReadApi(id)
      setItems((prev) =>
        {
          const next = prev.map((n) =>
            n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n,
          )
          setUnreadCount(next.filter((n) => !n.readAt).length)
          persistLocalNotifications(next)
          return next
        },
      )
    } catch {
      toast.error('No se pudo actualizar la notificación.')
    }
  }, [persistLocalNotifications])

  const markAllRead = useCallback(async () => {
    const hasRemoteUnread = items.some((n) => !n.readAt && !n.id.startsWith('local-'))
    try {
      if (useApi && hasRemoteUnread) {
        await markAllNotificationsReadApi()
      }
      const now = new Date().toISOString()
      setItems((prev) => {
        const next = prev.map((n) => ({ ...n, readAt: n.readAt ?? now }))
        persistLocalNotifications(next)
        return next
      })
      setUnreadCount(0)
    } catch {
      toast.error('No se pudo actualizar la bandeja de notificaciones.')
    }
  }, [items, useApi, persistLocalNotifications])

  const clearAll = useCallback(async () => {
    const hasRemote = items.some((n) => !n.id.startsWith('local-'))
    try {
      if (useApi && hasRemote) {
        await clearAllNotificationsApi()
      }
      setItems([])
      setUnreadCount(0)
      try {
        localStorage.removeItem(LOCAL_NOTIFICATIONS_KEY)
      } catch {
        // ignore
      }
    } catch {
      toast.error('No se pudieron limpiar las notificaciones.')
    }
  }, [items, useApi])

  const loadInitial = useCallback(async () => {
    const res = await listNotificationsApi({ unreadOnly: false, limit: 50 })
    mergeNotifications(res.items)
  }, [mergeNotifications])

  useEffect(() => {
    if (!useApi) return

    void loadInitial().catch(() => {
      // sin toast: solo afecta UI si no hay backend
    })
  }, [useApi, loadInitial])

  useEffect(() => {
    if (!useApi) return

    const session = loadAuthSession()
    const token = session?.token
    if (!token) return

    let cancelled = false
    let ws: WebSocket | null = null

    const timer = window.setTimeout(() => {
      if (cancelled) return
      if (wsRef.current?.readyState === WebSocket.OPEN) return

      ws = new WebSocket(notificationsWebSocketUrl(token))
      wsRef.current = ws

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as {
            type: string
            data?: NotificationItem
          }
          if (msg.type === 'activities:updated') {
            dispatchActivitiesUpdated()
            return
          }
          if (msg.type === 'inventory:updated') {
            dispatchInventoryUpdated()
            return
          }
          if (msg.type !== 'notification' || !msg.data) return
          const data = msg.data
          setItems((prev) => {
            const next = [data, ...prev.filter((n) => n.id !== data.id)].slice(0, 100)
            setUnreadCount(next.filter((n) => !n.readAt).length)
            persistLocalNotificationsRef.current(next)
            return next
          })
        } catch {
          // ignore
        }
      }

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null
      }
      ws.onerror = () => {
        // ignore
      }
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (ws) {
        ws.onclose = null
        ws.onerror = null
        try {
          ws.close()
        } catch {
          // ignore
        }
      }
      if (wsRef.current === ws) wsRef.current = null
    }
  }, [useApi])

  const value = useMemo<NotificationsContextValue>(
    () => ({ unreadCount, items, markRead, markAllRead, clearAll, addLocalNotification }),
    [unreadCount, items, markRead, markAllRead, clearAll, addLocalNotification],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications debe usarse dentro de NotificationsProvider')
  return ctx
}

