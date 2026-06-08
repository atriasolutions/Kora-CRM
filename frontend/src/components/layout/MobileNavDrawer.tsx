import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SidebarPanel } from '@/components/layout/Sidebar'
import { useShellLayout } from '@/contexts/shell-layout'
import { useMenuAccess } from '@/hooks/use-menu-access'
import { cn } from '@/lib/utils'

export function MobileNavDrawer() {
  const { mobileNavOpen, setMobileNavOpen } = useShellLayout()
  const { filteredNavSections } = useMenuAccess()

  return (
    <DialogPrimitive.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn('fixed inset-0 z-50 bg-black/50 lg:hidden')}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 left-0 z-[51] flex h-full w-[min(19.5rem,calc(100vw-12px))] flex-col overflow-hidden border-r border-sidebar-border bg-sidebar pt-[env(safe-area-inset-top)] shadow-2xl outline-none lg:hidden',
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Navegación principal
          </DialogPrimitive.Title>
          <SidebarPanel
            sections={filteredNavSections}
            onNavigate={() => setMobileNavOpen(false)}
            headerTrailing={
              <DialogPrimitive.Close asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 border-sidebar-border/60 bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-white"
                  aria-label="Cerrar menú"
                >
                  <X aria-hidden className="size-4" />
                </Button>
              </DialogPrimitive.Close>
            }
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
