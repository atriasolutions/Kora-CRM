import type { Response } from 'express'

export function parseDataUrlImage(
  dataUrl: string,
): { contentType: string; buffer: Buffer } | null {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl.trim())
  if (!match) return null
  try {
    return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') }
  } catch {
    return null
  }
}

/** Sirve avatar/logo almacenado (data URL o redirect HTTP). */
export function sendStoredEntityImage(res: Response, stored: string | null | undefined): void {
  const trimmed = stored?.trim()
  if (!trimmed) {
    res.status(404).end()
    return
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    res.redirect(302, trimmed)
    return
  }
  if (trimmed.startsWith('data:')) {
    const parsed = parseDataUrlImage(trimmed)
    if (!parsed) {
      res.status(404).end()
      return
    }
    res.setHeader('Content-Type', parsed.contentType)
    res.setHeader('Cache-Control', 'private, max-age=604800')
    res.send(parsed.buffer)
    return
  }
  res.status(404).end()
}
