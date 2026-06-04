export type EmailComposeOptions = {
  subject?: string
  body?: string
}

/** Valida y normaliza una dirección para `mailto:`. */
export function normalizeEmailAddress(raw: string): string | null {
  const value = raw.trim()
  if (!value || value === '—') return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null
  return value
}

/** Enlace `mailto:` para abrir el cliente de correo del equipo (Outlook, Mail, etc.). */
export function getEmailHref(
  raw: string,
  options?: EmailComposeOptions,
): string | null {
  const to = normalizeEmailAddress(raw)
  if (!to) return null

  const params = new URLSearchParams()
  const subject = options?.subject?.trim()
  const body = options?.body?.trim()
  if (subject) params.set('subject', subject)
  if (body) params.set('body', body)

  const query = params.toString()
  return query ? `mailto:${to}?${query}` : `mailto:${to}`
}

export function openEmailClient(raw: string, options?: EmailComposeOptions): void {
  const href = getEmailHref(raw, options)
  if (!href) return
  window.location.assign(href)
}
