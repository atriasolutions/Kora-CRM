import { Compass } from 'lucide-react'

import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { WelcomeBirthdaysSection } from '@/components/welcome/WelcomeBirthdaysSection'
import { WelcomeHeroSection } from '@/components/welcome/WelcomeHeroSection'
import { WelcomeInsightsPanel } from '@/components/welcome/WelcomeInsightsPanel'
import { WelcomeModuleGrid } from '@/components/welcome/WelcomeModuleGrid'
import {
  WelcomePageBackdrop,
  WelcomeSectionLabel,
} from '@/components/welcome/WelcomePageBackdrop'
import { APP_NAME } from '@/config/brand'
import { useAuth } from '@/hooks/use-auth'
import { useMenuAccess } from '@/hooks/use-menu-access'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'
import { type NavItemDef } from '@/navigation'

function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Buenos días'
  if (hour >= 12 && hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function flattenNavItems(
  sections: ReturnType<typeof useMenuAccess>['filteredNavSections'],
): NavItemDef[] {
  return sections.flatMap((section) =>
    section.type === 'items' ? section.items : section.items,
  )
}

export function WelcomePage() {
  const { settings } = useOrganizationSettings()
  const { filteredNavSections, can } = useMenuAccess()
  const { session } = useAuth()

  const orgName =
    settings.tradeName.trim() || settings.legalName.trim() || APP_NAME
  const hasCustomLogo = Boolean(settings.logoUrl?.trim())
  const quickLinks = flattenNavItems(filteredNavSections)
  const showDashboard = can('dashboard', 'menu')
  const hour = new Date().getHours()
  const greeting = greetingForHour(hour)
  const displayName = session?.name?.trim() || 'equipo'
  const firstName = displayName.split(/\s+/)[0] ?? displayName
  const moduleCount = quickLinks.length

  return (
    <PageScrollArea className="relative bg-background">
      <WelcomePageBackdrop />

      <div className="relative mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:space-y-10 lg:py-10">
        <WelcomeHeroSection
          orgName={orgName}
          greeting={greeting}
          firstName={firstName}
          moduleCount={moduleCount}
          showDashboard={showDashboard}
          hasCustomLogo={hasCustomLogo}
          logoUrl={settings.logoUrl}
        />

        <WelcomeBirthdaysSection
          currentUserId={session?.userId}
          currentUserName={displayName}
        />

        <div className="grid gap-8 xl:grid-cols-[1fr_340px] xl:gap-10">
          <section className="min-w-0 space-y-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Compass aria-hidden className="size-5" />
              </span>
              <div>
                <WelcomeSectionLabel>Navegación</WelcomeSectionLabel>
                <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  Accesos rápidos
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Atajos a los módulos habilitados para tu perfil. Elige uno para
                  continuar donde lo dejaste.
                </p>
              </div>
            </div>

            <WelcomeModuleGrid items={quickLinks} showDashboard={showDashboard} />
          </section>

          <WelcomeInsightsPanel
            orgName={orgName}
            hasCustomLogo={hasCustomLogo}
            logoUrl={settings.logoUrl}
          />
        </div>
      </div>
    </PageScrollArea>
  )
}
