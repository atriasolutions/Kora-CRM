import type { ReactNode } from 'react'

import { AppBrand } from '@/components/layout/AppBrand'
import { useMenuAccess } from '@/hooks/use-menu-access'
import { type NavItemDef, type NavSectionDef } from '@/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { NavLink } from 'react-router-dom'

function Logo({ headerTrailing }: { headerTrailing?: ReactNode }) {
  return (
    <div className="shell-sidebar-header flex shrink-0 items-center justify-between gap-2 px-3 py-2.5">
      <div className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white px-2 py-1.5 shadow-sm shadow-black/15">
        <AppBrand
          className="min-w-0 [&>a>div]:border-0 [&>a>div]:bg-transparent [&>a>div]:p-0 [&>a>div]:shadow-none"
          variant="sidebar"
        />
      </div>
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
                'shell-nav-link group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium leading-none',
                isActive && 'shell-nav-link-active font-semibold',
              )
            }
          >
            <span className="shell-nav-icon grid size-7 shrink-0 place-items-center rounded-md">
              <Icon aria-hidden className="size-4" />
            </span>
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
    <div key={sec.heading} className="mt-4 space-y-1 first:mt-1">
      <p className="px-3 pb-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-primary/75">
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
    <div className="shell-sidebar flex h-full min-h-0 w-full flex-col">
      <Logo headerTrailing={headerTrailing} />
      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="pb-2 pt-1.5">
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
    <aside className="fixed inset-y-0 left-0 z-40 hidden h-svh w-56 flex-col overflow-hidden border-r border-sidebar-border shadow-[6px_0_32px_-12px_rgba(15,23,42,0.45)] lg:flex">
      <SidebarPanel sections={filteredNavSections} />
    </aside>
  )
}
