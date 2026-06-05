import {
  ArrowRight,
  CalendarCheck,
  Handshake,
  LayoutDashboard,
  Lightbulb,
  Rocket,
  Sparkles,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { AppLogoImage } from '@/components/layout/AppLogoImage'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { KoraLogoMark } from '@/components/layout/KoraLogoMark'
import { WelcomeImageSlot } from '@/components/welcome/WelcomeImageSlot'
import { WelcomeOptionalThumbnail } from '@/components/welcome/WelcomeOptionalThumbnail'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { APP_NAME } from '@/config/brand'
import { useMenuAccess } from '@/hooks/use-menu-access'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'
import { DASHBOARD_PATH } from '@/lib/app-routes'
import { getCurrentUser } from '@/lib/current-user'
import {
  WELCOME_ASSETS,
  WELCOME_MODULE_IMAGES,
} from '@/lib/welcome-assets'
import { type NavItemDef } from '@/navigation'
import { cn } from '@/lib/utils'

const WORKSPACE_TIPS = [
  {
    icon: CalendarCheck,
    title: 'Mantén el ritmo',
    text: 'Revisa tus tareas y fechas clave al iniciar la jornada.',
  },
  {
    icon: Handshake,
    title: 'Trabaja en equipo',
    text: 'Comparte avances y comentarios dentro de cada módulo.',
  },
  {
    icon: Lightbulb,
    title: 'Pide ayuda',
    text: 'Usa el icono de ayuda (?) en la barra superior cuando lo necesites.',
  },
] as const

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

function QuickAccessCard({ item }: { item: NavItemDef }) {
  const Icon = item.icon
  const moduleImage = WELCOME_MODULE_IMAGES[item.moduleId]

  return (
    <Link
      to={item.path}
      className={cn(
        'group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm',
        'transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      {moduleImage ? (
        <div className="pointer-events-none absolute inset-y-0 end-0 w-24 opacity-30 sm:w-28">
          <WelcomeOptionalThumbnail
            asset={moduleImage}
            className="opacity-80 group-hover:opacity-100"
          />
        </div>
      ) : null}
      <div className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-chart-5/15 text-primary ring-1 ring-primary/15">
        <Icon aria-hidden className="size-5" />
      </div>
      <div className="relative min-w-0 flex-1 pe-6">
        <p className="font-semibold text-foreground">{item.label}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Entrar al módulo de {item.label.toLowerCase()}
        </p>
      </div>
      <ArrowRight
        aria-hidden
        className="relative size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </Link>
  )
}

export function WelcomePage() {
  const { settings } = useOrganizationSettings()
  const { filteredNavSections, can } = useMenuAccess()
  const user = getCurrentUser()

  const orgName =
    settings.tradeName.trim() || settings.legalName.trim() || APP_NAME
  const hasCustomLogo = Boolean(settings.logoUrl?.trim())
  const quickLinks = flattenNavItems(filteredNavSections)
  const showDashboard = can('dashboard', 'menu')
  const hour = new Date().getHours()
  const greeting = greetingForHour(hour)
  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name
  const moduleCount = quickLinks.length

  return (
    <PageScrollArea className="relative bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(52vh,520px)] opacity-60"
        style={{
          backgroundImage: 'url(/welcome/welcome-bg-pattern.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/[0.07] to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:space-y-10 lg:py-10">
        {/* Hero */}
        <section
          className={cn(
            'relative overflow-hidden rounded-3xl border border-primary/20',
            'bg-card/80 shadow-xl shadow-primary/[0.06] backdrop-blur-sm',
          )}
        >
          <div
            className="pointer-events-none absolute -end-16 -top-16 size-56 rounded-full bg-chart-5/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 start-0 size-48 rounded-full bg-primary/15 blur-3xl"
            aria-hidden
          />

          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col justify-center gap-5 p-6 sm:p-8 lg:p-10">
              <Badge
                variant="secondary"
                className="w-fit border-primary/25 bg-primary/10 text-primary hover:bg-primary/10"
              >
                <Sparkles aria-hidden className="size-3.5" />
                Espacio de trabajo
              </Badge>

              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary/80">
                  {orgName}
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
                  {greeting},{' '}
                  <span className="bg-gradient-to-r from-primary to-chart-5 bg-clip-text text-transparent">
                    {firstName}
                  </span>
                </h1>
                <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Este es tu punto de partida en Kora. Accede a lo que tu perfil
                  permite y colabora con tu equipo sin distracciones.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {showDashboard ? (
                  <Button asChild className="rounded-full shadow-md shadow-primary/20">
                    <Link to={DASHBOARD_PATH}>
                      <LayoutDashboard aria-hidden className="size-4" />
                      Ver dashboard
                    </Link>
                  </Button>
                ) : null}
                {moduleCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <Users aria-hidden className="size-3.5 text-primary" />
                    {moduleCount} {moduleCount === 1 ? 'módulo disponible' : 'módulos disponibles'}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="relative min-h-[220px] border-t border-border/50 p-4 sm:p-6 lg:min-h-[340px] lg:border-t-0 lg:border-s lg:p-6">
              <WelcomeImageSlot
                asset={WELCOME_ASSETS.hero}
                priority
                className="size-full min-h-[200px] lg:min-h-[300px]"
                imageClassName="object-cover object-center"
              />
            </div>
          </div>
        </section>

        {/* Banner opcional ancho completo */}
        <WelcomeImageSlot
          asset={WELCOME_ASSETS.banner}
          showFileHint={false}
          className="hidden h-28 w-full sm:block lg:h-32"
          imageClassName="object-cover"
        />

        {/* Contenido principal: accesos + panel lateral */}
        <div className="grid gap-8 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Accesos rápidos
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Salta directo a los módulos habilitados para tu cuenta.
                </p>
              </div>
            </div>

            {quickLinks.length > 0 ? (
              <div
                className={cn(
                  'grid gap-3',
                  quickLinks.length === 1 ? 'max-w-xl' : 'sm:grid-cols-2',
                )}
              >
                {quickLinks.map((item) => (
                  <QuickAccessCard key={item.path} item={item} />
                ))}
              </div>
            ) : (
              <Card className="overflow-hidden border-dashed shadow-sm">
                <CardContent className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
                  <div className="space-y-2 text-center sm:text-start">
                    <p className="text-base font-semibold text-foreground">
                      Aún no tienes módulos asignados
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Tu perfil no incluye menús adicionales. Contacta al
                      administrador si necesitas acceso.
                    </p>
                  </div>
                  <WelcomeImageSlot
                    asset={WELCOME_ASSETS.side}
                    className="mx-auto aspect-[4/3] w-full max-w-[220px] sm:max-w-none"
                  />
                </CardContent>
              </Card>
            )}
          </section>

          <aside className="space-y-4">
            <Card className="overflow-hidden border-primary/15 bg-gradient-to-b from-card to-primary/[0.04] shadow-md">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <Rocket aria-hidden className="size-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Tu espacio en Kora</h3>
                </div>
                <ul className="space-y-3">
                  {WORKSPACE_TIPS.map((tip) => {
                    const TipIcon = tip.icon
                    return (
                      <li
                        key={tip.title}
                        className="flex gap-3 rounded-xl border border-border/50 bg-background/70 p-3"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <TipIcon aria-hidden className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{tip.title}</p>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {tip.text}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>

            <WelcomeImageSlot
              asset={WELCOME_ASSETS.side}
              className="aspect-[4/5] w-full shadow-md"
            />

            <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
              {hasCustomLogo ? (
                <AppLogoImage
                  logoUrl={settings.logoUrl}
                  alt={orgName}
                  className="max-h-16 max-w-[180px]"
                />
              ) : (
                <KoraLogoMark size="md" variant="framed" align="center" />
              )}
            </div>
          </aside>
        </div>

        <p className="pb-4 text-center text-xs text-muted-foreground">
          Pulsa el logo en la esquina superior izquierda para volver a esta pantalla.
        </p>
      </div>
    </PageScrollArea>
  )
}
