import {
  Calendar,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'

import type { ContactActivityType } from '@/data/contact-detail.mock'

export const activityTypeIcons: Record<ContactActivityType, LucideIcon> = {
  llamada: Phone,
  email: Mail,
  reunion: Calendar,
  nota: StickyNote,
  whatsapp: MessageCircle,
}

export const activityTypeColors: Record<
  ContactActivityType,
  { color: string; bg: string }
> = {
  llamada: {
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-100 dark:bg-emerald-950',
  },
  email: {
    color: 'text-sky-700 dark:text-sky-300',
    bg: 'bg-sky-100 dark:bg-sky-950',
  },
  reunion: {
    color: 'text-violet-700 dark:text-violet-300',
    bg: 'bg-violet-100 dark:bg-violet-950',
  },
  nota: {
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-100 dark:bg-amber-950',
  },
  whatsapp: {
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-100 dark:bg-green-950',
  },
}
