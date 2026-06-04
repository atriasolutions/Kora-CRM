import type { ReactNode } from 'react'

import { AppBrand } from '@/components/layout/AppBrand'
import { useMenuAccess } from '@/hooks/use-menu-access'
import { type NavItemDef, type NavSectionDef } from '@/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { NavLink } from 'react-router-dom'

function Logo({ headerTrailing }: { headerTrailing?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-3 py-3">
      <AppBrand className="min-w-0 flex-1" />
      {headerTrailing ?? null}
    </div>
  )
}

function SectionItems({
  items,
  onNavigate,
}: {
  items: NavItemDef[]
  onNavigate?: () => void
}) {
  return (
    <nav className="space-y-0.5 px-2">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive &&
                  'bg-sidebar-accent font-semibold text-sidebar-accent-foreground',
              )
            }
          >
            <Icon aria-hidden className="size-[18px] shrink-0 opacity-80" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function renderSection(sec: NavSectionDef, onNavigate?: () => void) {
  if (sec.type === 'items') {
    return (
      <div key="__main" className="space-y-1">
        <SectionItems items={sec.items} onNavigate={onNavigate} />
      </div>
    )
  }
  return (
    <div key={sec.heading} className="mt-8 space-y-2">
      <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {sec.heading}
      </p>
      <SectionItems items={sec.items} onNavigate={onNavigate} />
    </div>
  )
}

export function SidebarPanel({
  onNavigate,
  headerTrailing,
  sections,
}: {
  onNavigate?: () => void
  headerTrailing?: ReactNode
  sections: NavSectionDef[]
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-sidebar">
      <Logo headerTrailing={headerTrailing} />
      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="pb-4 pt-1">
            {sections.map((section) => renderSection(section, onNavigate))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { filteredNavSections } = useMenuAccess()
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden h-svh w-56 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar lg:flex">
      <SidebarPanel sections={filteredNavSections} />
    </aside>
  )
}
