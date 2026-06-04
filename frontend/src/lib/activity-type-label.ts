import type { ContactActivityType } from '@/data/contact-detail.mock'

const TYPE_LABEL: Record<ContactActivityType, string> = {
  llamada: 'Llamada',
  email: 'Email',
  reunion: 'Reunión',
  nota: 'Nota',
  whatsapp: 'WhatsApp',
}

const DEFAULT_TITLES: Record<ContactActivityType, string> = {
  llamada: 'Llamada de seguimiento',
  email: 'Email enviado',
  reunion: 'Reunión',
  nota: 'Nota registrada',
  whatsapp: 'Mensaje de WhatsApp',
}

export function defaultActivityTitle(type: ContactActivityType): string {
  return DEFAULT_TITLES[type]
}

export function activityTypeLabel(type: ContactActivityType): string {
  return TYPE_LABEL[type]
}
