import type { LucideIcon } from 'lucide-react'
import { BookOpen, HelpCircle } from 'lucide-react'

import type { MenuModuleId } from '@/lib/menu-modules'
import { navSections } from '@/navigation'

export function navIconForModule(moduleId: string): LucideIcon {
  for (const section of navSections) {
    const items = section.type === 'items' ? section.items : section.items
    const match = items.find((i) => i.moduleId === moduleId)
    if (match) return match.icon
  }
  return HelpCircle
}

export function navLabelForModule(moduleId: MenuModuleId | string): string {
  for (const section of navSections) {
    const items = section.type === 'items' ? section.items : section.items
    const match = items.find((i) => i.moduleId === moduleId)
    if (match) return match.label
  }
  return 'General'
}

export function helpViewLabel(view: 'dashboard' | 'list' | 'detail'): string {
  if (view === 'dashboard') return 'Inicio'
  if (view === 'detail') return 'Ficha'
  return 'Listado'
}

export { BookOpen }
