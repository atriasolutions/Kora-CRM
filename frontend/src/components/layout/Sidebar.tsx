import type { ReactNode } from 'react'

import { AppBrand } from '@/components/layout/AppBrand'
import { useMenuAccess } from '@/hooks/use-menu-access'
import { type NavItemDef, type NavSectionDef } from '@/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { NavLink } from 'react-router-dom'

function Logo({ headerTrailing }: { headerTrailing?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-sidebar-border/80 bg-gradient-to-r from-primary/[0.07] via-sidebar to-sidebar px-3 py-3.5">
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
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all',
                'hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground hover:shadow-sm',
                isActive &&
                  'bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm ring-1 ring-primary/15',
                isActive &&
                  'before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-primary',
              )
            }
          >
            <Icon
              aria-hidden
              className={cn(
                'size-[18px] shrink-0 transition-opacity',
                'opacity-75 group-hover:opacity-100',
              )}
            />
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
    <div key={sec.heading} className="mt-7 space-y-2 first:mt-4">
      <p className="px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-primary/65">
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
    <div className="flex h-full min-h-0 w-full flex-col bg-gradient-to-b from-sidebar via-sidebar to-secondary/25">
      <Logo headerTrailing={headerTrailing} />
      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="pb-5 pt-2">
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
    <aside className="fixed inset-y-0 left-0 z-40 hidden h-svh w-56 flex-col overflow-hidden border-r border-sidebar-border/90 bg-sidebar shadow-[4px_0_28px_-16px_rgba(15,23,42,0.14)] lg:flex">
      <SidebarPanel sections={filteredNavSections} />
    </aside>
  )
}
