import type { Request } from 'express'

/** IP del cliente (respeta proxy inverso si está configurado). */
export function getClientIp(req: Request): string | undefined {
  const forwarded = req.header('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = req.header('x-real-ip')?.trim()
  if (realIp) return realIp
  const ip = req.socket.remoteAddress?.trim()
  return ip || undefined
}

/** Resume el user-agent como «Chrome · macOS». */
export function parseUserAgentDevice(userAgent: string | undefined): string {
  const ua = userAgent?.trim() || ''
  if (!ua) return 'Dispositivo desconocido'

  let browser = 'Navegador'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome'
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'

  let os = 'Desconocido'
  if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS'
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/Linux/i.test(ua)) os = 'Linux'

  return `${browser} · ${os}`
}

/** Etiqueta legible para la IP (sin geolocalización externa). */
export function formatLocationFromIp(ip: string | undefined): string {
  if (!ip?.trim()) return 'Ubicación desconocida'
  const normalized = ip.replace(/^::ffff:/, '').trim()
  if (normalized === '127.0.0.1' || normalized === '::1') return 'Equipo local'
  if (
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(normalized) ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd')
  ) {
    return 'Red local'
  }
  return normalized
}

/** Valor seguro para columna PostgreSQL `INET` (null si no es válida). */
export function toInetOrNull(ip: string | undefined): string | null {
  if (!ip?.trim()) return null
  const normalized = ip.replace(/^::ffff:/, '').trim()
  if (!/^[\da-fA-F.:]+$/.test(normalized)) return null
  return normalized
}
