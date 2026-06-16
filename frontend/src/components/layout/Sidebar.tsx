import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { AppBrand } from '@/components/layout/AppBrand'
import { useMenuAccess } from '@/hooks/use-menu-access'
import {
  navSectionHasActiveItem,
  type NavItemDef,
  type NavSectionDef,
} from '@/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

function Logo({ headerTrailing }: { headerTrailing?: ReactNode }) {
  return (
    <div className="shell-sidebar-header flex shrink-0 items-center justify-between gap-2 px-2.5 py-2">
      <div className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white px-2 py-1 shadow-sm shadow-black/15">
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
    <nav className="space-y-0 px-1.5 pb-0.5">
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
                'shell-nav-link group relative flex items-center gap-2 rounded-lg px-2 py-[7px] text-[13px] font-medium leading-snug',
                isActive && 'shell-nav-link-active font-semibold',
              )
            }
          >
            <span className="shell-nav-icon grid size-6 shrink-0 place-items-center rounded-md">
              <Icon aria-hidden className="size-3.5" />
            </span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function NavAccordionGroup({
  section,
  onNavigate,
}: {
  section: Extract<NavSectionDef, { type: 'group' }>
  onNavigate?: () => void
}) {
  const { pathname } = useLocation()
  const hasActive = navSectionHasActiveItem(section, pathname)
  const [open, setOpen] = useState(section.defaultOpen ?? hasActive)

  useEffect(() => {
    if (hasActive) setOpen(true)
  }, [hasActive])

  const panelId = `nav-group-${section.heading.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className="mt-1 first:mt-0">
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-[10px] font-bold uppercase leading-snug tracking-[0.12em]',
          'text-sidebar-primary/75 transition-colors hover:bg-white/5 hover:text-sidebar-primary',
          hasActive && 'text-sidebar-primary',
        )}
      >
        <ChevronDown
          aria-hidden
          className={cn(
            'size-3 shrink-0 transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90',
          )}
        />
        <span className="truncate">{section.heading}</span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-trigger`}
        className={cn('grid transition-[grid-template-rows] duration-200 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      >
        <div className="overflow-hidden">
          <SectionItems items={section.items} onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  )
}

function renderSection(sec: NavSectionDef, onNavigate?: () => void) {
  if (sec.type === 'items') {
    return (
      <div key="__main">
        <SectionItems items={sec.items} onNavigate={onNavigate} />
      </div>
    )
  }
  return (
    <NavAccordionGroup
      key={sec.heading}
      section={sec}
      onNavigate={onNavigate}
    />
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
          <div className="pb-1.5 pt-1">
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
