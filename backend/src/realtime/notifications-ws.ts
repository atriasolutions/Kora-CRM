import type { IncomingMessage } from 'node:http'
import { WebSocketServer } from 'ws'

import * as authRepo from '../repositories/auth.repository.js'
import type { Notification } from '../types/notification.js'

type WsClient = {
  readyState: number
  send: (data: string) => void
  ping: () => void
  close: (code?: number, reason?: string) => void
  on: (event: 'close', listener: () => void) => void
}

const clientsByUserId = new Map<string, Set<WsClient>>()

function addClient(userId: string, ws: WsClient) {
  const set = clientsByUserId.get(userId) ?? new Set<WsClient>()
  set.add(ws)
  clientsByUserId.set(userId, set)
}

function removeClient(userId: string, ws: WsClient) {
  const set = clientsByUserId.get(userId)
  if (!set) return
  set.delete(ws)
  if (set.size === 0) clientsByUserId.delete(userId)
}

function parseTokenFromRequest(req: IncomingMessage): string | null {
  const url = req.url ?? ''
  const idx = url.indexOf('?')
  if (idx < 0) return null
  const query = new URLSearchParams(url.slice(idx + 1))
  return query.get('token')
}

export function attachNotificationsWS(httpServer: import('node:http').Server) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
  })

  wss.on('connection', async (ws: WsClient, req: IncomingMessage) => {
    let userId: string | null = null
    let pingTimer: ReturnType<typeof setInterval> | null = null

    try {
      const token = parseTokenFromRequest(req)
      if (!token) {
        ws.close(4401, 'Missing token')
        return
      }
      const session = await authRepo.resolveSessionUser(token)
      if (!session) {
        ws.close(4401, 'Invalid session')
        return
      }
      userId = session.user.id
      addClient(userId, ws)

      pingTimer = setInterval(() => {
        if (ws.readyState === 1) {
          try {
            ws.ping()
          } catch {
            // ignore
          }
        }
      }, 25_000)

      ws.on('close', () => {
        if (pingTimer) clearInterval(pingTimer)
        if (userId) removeClient(userId, ws)
      })
    } catch {
      if (pingTimer) clearInterval(pingTimer)
      ws.close()
    }
  })
}

export function broadcastNotification(userId: string, notification: Notification) {
  broadcastToUser(userId, { type: 'notification', data: notification })
}

export function broadcastToUser(userId: string, message: Record<string, unknown>) {
  const set = clientsByUserId.get(userId)
  if (!set || set.size === 0) {
    console.warn(`[ws] sin clientes conectados para userId=${userId}`)
    return
  }
  const payload = JSON.stringify(message)
  for (const ws of set) {
    try {
      ws.send(payload)
    } catch {
      // ignore
    }
  }
}

export function countConnectedClients(userId?: string): number {
  if (userId) return clientsByUserId.get(userId)?.size ?? 0
  let total = 0
  for (const set of clientsByUserId.values()) total += set.size
  return total
}

