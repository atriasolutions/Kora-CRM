/** Dígitos E.164 sin «+» para wa.me / web.whatsapp.com */
export function normalizePhoneForWhatsApp(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null

  if (digits.startsWith('56')) {
    return digits.length >= 10 ? digits : null
  }

  if (digits.length === 9 && digits.startsWith('9')) {
    return `56${digits}`
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return digits
  }

  return null
}

/** Cliente móvil (app) vs escritorio (WhatsApp Web). */
export function isMobileWhatsAppClient(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPod|IEMobile|Opera Mini|Mobile/i.test(
    navigator.userAgent,
  )
}

export function getWhatsAppHref(
  phone: string,
  options?: { text?: string },
): string | null {
  const normalized = normalizePhoneForWhatsApp(phone)
  if (!normalized) return null

  const text = options?.text?.trim()
  const textQuery = text ? `?text=${encodeURIComponent(text)}` : ''

  if (isMobileWhatsAppClient()) {
    return `https://wa.me/${normalized}${textQuery}`
  }

  const webText = text ? `&text=${encodeURIComponent(text)}` : ''
  return `https://web.whatsapp.com/send?phone=${normalized}${webText}`
}

export function openWhatsAppChat(phone: string, text?: string): void {
  const href = getWhatsAppHref(phone, { text })
  if (!href) return
  window.open(href, '_blank', 'noopener,noreferrer')
}
