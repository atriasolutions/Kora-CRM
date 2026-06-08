import { memo } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardContent } from '@/components/ui/card'
import { WelcomeImageSlot } from '@/components/welcome/WelcomeImageSlot'
import { DASHBOARD_PATH } from '@/lib/app-routes'
import { WELCOME_ASSETS } from '@/lib/welcome-assets'
import { type NavItemDef } from '@/navigation'
import { cn } from '@/lib/utils'

type WelcomeModuleGridProps = {
  items: NavItemDef[]
  showDashboard: boolean
}

const ModuleTile = memo(function ModuleTile({
  item,
  featured = false,
}: {
  item: NavItemDef
  featured?: boolean
}) {
  const Icon = item.icon

  return (
    <Link
      to={item.path}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden',
        'rounded-[1.35rem] border border-border/70 bg-card p-5 shadow-sm',
        'transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        featured && 'sm:col-span-2 sm:min-h-[148px]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'grid shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary',
            featured ? 'size-14' : 'size-12',
          )}
        >
          <Icon aria-hidden className={featured ? 'size-6' : 'size-5'} />
        </span>
        <ArrowUpRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary"
        />
      </div>

      <div className="mt-8 space-y-1">
        <p className={cn('font-semibold text-foreground', featured && 'text-lg')}>
          {item.label}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Abrir módulo de {item.label.toLowerCase()}
        </p>
      </div>
    </Link>
  )
})

export function WelcomeModuleGrid({ items, showDashboard }: WelcomeModuleGridProps) {
  if (items.length === 0) {
    return (
      <Card className="overflow-hidden border-dashed border-border/80 bg-card shadow-sm">
        <CardContent className="grid gap-8 p-6 sm:grid-cols-[1fr_220px] sm:items-center sm:p-10">
          <div className="space-y-3 text-center sm:text-start">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              Sin módulos asignados
            </h3>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Tu perfil aún no incluye accesos al menú. Contacta al administrador
              de la organización si necesitas permisos adicionales.
            </p>
          </div>
          <WelcomeImageSlot
            asset={WELCOME_ASSETS.side}
            className="mx-auto aspect-square w-full max-w-[200px] rounded-[1.25rem]"
          />
        </CardContent>
      </Card>
    )
  }

  const featuredIndex = items.findIndex((i) => i.path === DASHBOARD_PATH)
  const ordered =
    featuredIndex > 0
      ? [
          items[featuredIndex],
          ...items.slice(0, featuredIndex),
          ...items.slice(featuredIndex + 1),
        ]
      : items

  return (
    <div
      className={cn(
        'grid gap-3 sm:gap-4',
        ordered.length === 1 && 'max-w-md',
        ordered.length >= 2 && 'sm:grid-cols-2',
        ordered.length >= 5 && 'xl:grid-cols-3',
      )}
    >
      {ordered.map((item, index) => (
        <ModuleTile
          key={item.path}
          item={item}
          featured={index === 0 && (showDashboard || ordered.length >= 3)}
        />
      ))}
    </div>
  )
}
