/** Normaliza a formato `tel:+…` para abrir el marcador del dispositivo. */
export function getTelHref(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === '—') return null

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null

  if (trimmed.startsWith('+')) {
    return `tel:+${digits}`
  }

  if (digits.startsWith('56') && digits.length >= 10) {
    return `tel:+${digits}`
  }

  if (digits.length === 9 && digits.startsWith('9')) {
    return `tel:+56${digits}`
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return `tel:+${digits}`
  }

  return null
}

export function openPhoneCall(raw: string): void {
  const href = getTelHref(raw)
  if (!href) return
  window.location.assign(href)
}
