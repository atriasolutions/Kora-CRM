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
import { useAuth } from '@/hooks/use-auth'
import {
  dispatchActivitiesUpdated,
  dispatchInventoryUpdated,
} from '@/lib/realtime-events'
import { syncWebPushIfGranted } from '@/lib/web-push'
import { toast } from '@/lib/toast'

const LOCAL_NOTIFICATIONS_KEY = 'kora-crm-local-notifications'
const NOTIFICATIONS_POLL_MS = 10_000

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

function normalizeWsNotification(raw: unknown): NotificationItem | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id : ''
  if (!id) return null
  const type = row.type
  if (typeof type !== 'string') return null
  return {
    id,
    type: type as NotificationType,
    title: typeof row.title === 'string' ? row.title : '',
    message: typeof row.message === 'string' ? row.message : '',
    href: typeof row.href === 'string' ? row.href : undefined,
    entityType:
      typeof row.entityType === 'string'
        ? row.entityType
        : typeof row.entity_type === 'string'
          ? row.entity_type
          : undefined,
    entityId:
      typeof row.entityId === 'string'
        ? row.entityId
        : typeof row.entity_id === 'string'
          ? row.entity_id
          : undefined,
    createdAt:
      typeof row.createdAt === 'string'
        ? row.createdAt
        : typeof row.created_at === 'string'
          ? row.created_at
          : new Date().toISOString(),
    readAt:
      typeof row.readAt === 'string'
        ? row.readAt
        : typeof row.read_at === 'string'
          ? row.read_at
          : undefined,
  }
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
  const { session } = useAuth()
  const authToken = session?.token
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

  const applyIncomingNotification = useCallback((data: NotificationItem) => {
    setItems((prev) => {
      const next = [data, ...prev.filter((n) => n.id !== data.id)].slice(0, 100)
      setUnreadCount(next.filter((n) => !n.readAt).length)
      persistLocalNotificationsRef.current(next)
      return next
    })
  }, [])

  const applyIncomingNotificationRef = useRef(applyIncomingNotification)
  applyIncomingNotificationRef.current = applyIncomingNotification

  useEffect(() => {
    if (!useApi || !authToken) return

    void loadInitial().catch(() => {
      // sin toast: solo afecta UI si no hay backend
    })
    void syncWebPushIfGranted()
  }, [useApi, authToken, loadInitial])

  const loadInitialRef = useRef(loadInitial)
  loadInitialRef.current = loadInitial

  useEffect(() => {
    if (!useApi || !authToken) return

    const poll = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void loadInitialRef.current().catch(() => {
        // sin toast
      })
    }, NOTIFICATIONS_POLL_MS)

    return () => window.clearInterval(poll)
  }, [useApi, authToken])

  useEffect(() => {
    if (!useApi || !authToken) return

    let cancelled = false
    let reconnectTimer: number | null = null
    let reconnectAttempt = 0
    let ws: WebSocket | null = null

    const handleWsMessage = (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(String(ev.data)) as {
          type: string
          data?: unknown
        }
        if (msg.type === 'activities:updated') {
          dispatchActivitiesUpdated()
          return
        }
        if (msg.type === 'inventory:updated') {
          dispatchInventoryUpdated()
          return
        }
        if (msg.type !== 'notification') return
        const data = normalizeWsNotification(msg.data)
        if (!data) return
        applyIncomingNotificationRef.current(data)
      } catch {
        // ignore
      }
    }

    const scheduleReconnect = (authFailed: boolean) => {
      if (cancelled || authFailed) return
      const delay = Math.min(1000 * 2 ** reconnectAttempt, 30_000)
      reconnectAttempt += 1
      reconnectTimer = window.setTimeout(connect, delay)
    }

    const connect = () => {
      if (cancelled) return
      const current = wsRef.current
      if (
        current &&
        (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)
      ) {
        return
      }

      ws = new WebSocket(notificationsWebSocketUrl(authToken))
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttempt = 0
        void loadInitialRef.current().catch(() => {
          // recuperar notificaciones perdidas mientras el socket estaba caído
        })
      }

      ws.onmessage = handleWsMessage

      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null
        scheduleReconnect(event.code === 4401)
      }

      ws.onerror = () => {
        ws?.close()
      }
    }

    const refreshOnFocus = () => {
      if (document.visibilityState === 'hidden') return
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        reconnectAttempt = 0
        connect()
      }
      void loadInitialRef.current().catch(() => {
        // sin toast
      })
    }

    connect()
    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnFocus)

    return () => {
      cancelled = true
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnFocus)
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer)
      if (ws) {
        ws.onclose = null
        ws.onerror = null
        ws.onmessage = null
        try {
          ws.close()
        } catch {
          // ignore
        }
      }
      if (wsRef.current === ws) wsRef.current = null
    }
  }, [useApi, authToken])

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

