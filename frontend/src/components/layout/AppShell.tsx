import { HelpSheet } from '@/components/help/HelpSheet'
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer'
import { RouteAccessGuard } from '@/components/layout/RouteAccessGuard'
import { RightPanel } from '@/components/layout/RightPanel'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { HelpOverlayProvider } from '@/contexts/help-context-provider'
import { TooltipProvider } from '@/components/ui/tooltip'

export function AppShell() {
  return (
    <HelpOverlayProvider>
    <TooltipProvider delayDuration={300}>
      <HelpSheet />
      <MobileNavDrawer />
      <div className="flex h-svh max-h-svh min-h-0 overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:pl-56">
          <TopBar />
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <RouteAccessGuard />
            </main>
            <RightPanel />
          </div>
        </div>
      </div>
    </TooltipProvider>
    </HelpOverlayProvider>
  )
}
