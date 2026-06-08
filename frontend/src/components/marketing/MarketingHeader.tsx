import { Menu, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { LoginAtriaCredit } from '@/components/auth/LoginAtriaCredit'
import { MarketingBrandBackdrop } from '@/components/marketing/MarketingBrandBackdrop'
import { KoraLogoMark } from '@/components/layout/KoraLogoMark'
import { Button } from '@/components/ui/button'
import { APP_HOME_PATH } from '@/lib/app-routes'
import { getLoginPath } from '@/lib/auth-routes'
import { useAuth } from '@/hooks/use-auth'
import { useMarketingScrollContainer } from '@/components/marketing/marketing-scroll-context'
import {
  MARKETING_NAV,
  MARKETING_TRIAL_PATH,
} from '@/lib/marketing-routes'
import { marketingTheme } from '@/lib/marketing-theme'
import { cn } from '@/lib/utils'

const HEADER_NAV = MARKETING_NAV.filter((item) => item.path !== MARKETING_TRIAL_PATH)

export function MarketingHeader() {
  const { isAuthenticated } = useAuth()
  const scrollRef = useMarketingScrollContainer()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const el = scrollRef?.current
    if (!el) return

    const onScroll = () => setScrolled(el.scrollTop > 12)
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [scrollRef])

  useEffect(() => {
    const el = scrollRef?.current
    if (!el) return
    const prev = el.style.overflow
    if (open) el.style.overflow = 'hidden'
    return () => {
      el.style.overflow = prev
    }
  }, [open, scrollRef])

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 w-full border-b transition-all duration-300',
          scrolled ? marketingTheme.headerScrolled : marketingTheme.header,
        )}
      >
        <div className="relative flex w-full items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
          <Link
            to="/"
            className="shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label="Kora CRM, inicio"
            onClick={() => setOpen(false)}
          >
            <KoraLogoMark variant="hero" size="sm" tone="light" align="start" />
          </Link>

          <nav
            className="absolute start-1/2 hidden -translate-x-1/2 items-center gap-0.5 lg:flex"
            aria-label="Principal"
          >
            {HEADER_NAV.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-white'
                      : 'text-white/65 hover:bg-white/8 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive ? (
                      <span
                        className={cn(
                          'absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full',
                          marketingTheme.navActiveBar,
                        )}
                        aria-hidden
                      />
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {isAuthenticated ? (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="rounded-xl text-white/80 hover:bg-white/10 hover:text-white"
              >
                <Link to={APP_HOME_PATH}>Ir al CRM</Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="rounded-xl text-white/80 hover:bg-white/10 hover:text-white"
              >
                <Link to={getLoginPath()}>Iniciar sesión</Link>
              </Button>
            )}
            <Button
              asChild
              size="sm"
              className={cn(
                'rounded-xl px-4 font-semibold text-white shadow-md shadow-violet-900/25',
                marketingTheme.accentGradient,
                marketingTheme.accentGradientHover,
              )}
            >
              <Link to={MARKETING_TRIAL_PATH}>
                <Sparkles aria-hidden className={cn('size-3.5', marketingTheme.sparkle)} />
                Demo gratis
              </Link>
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl text-white hover:bg-white/10 lg:hidden"
            aria-expanded={open}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </header>

      {open ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          'fixed inset-x-0 top-14 z-40 border-b border-white/10 bg-[#0f0818]/98 p-4 shadow-2xl backdrop-blur-xl transition-all duration-200 sm:top-16 lg:hidden',
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0',
        )}
      >
        <nav className="flex flex-col gap-1" aria-label="Menú móvil">
          {HEADER_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/10 text-white ring-1 ring-white/10'
                    : 'text-white/80 hover:bg-white/5',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
            {isAuthenticated ? (
              <Button asChild variant="outline" className="rounded-xl border-white/20 text-white">
                <Link to={APP_HOME_PATH} onClick={() => setOpen(false)}>
                  Ir al CRM
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="rounded-xl border-white/20 text-white">
                <Link to={getLoginPath()} onClick={() => setOpen(false)}>
                  Iniciar sesión
                </Link>
              </Button>
            )}
            <Button
              asChild
              className={cn('rounded-xl font-semibold text-white', marketingTheme.accentGradient)}
            >
              <Link to={MARKETING_TRIAL_PATH} onClick={() => setOpen(false)}>
                Demo gratis
              </Link>
            </Button>
          </div>
        </nav>
      </div>
    </>
  )
}

export function MarketingFooter() {
  return (
    <footer className="relative shrink-0 overflow-x-hidden border-t border-white/10 bg-gradient-to-br from-[#0f0818] via-[#15103a] to-[#0a2d45] pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-16 text-white">
      <MarketingBrandBackdrop variant="hero" className="opacity-60" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <KoraLogoMark variant="hero" size="sm" tone="light" align="start" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
            CRM comercial y operativo para equipos que venden y ejecutan en el mismo lugar.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-white/90">Sitio</p>
          <ul className="mt-4 space-y-2.5">
            {MARKETING_NAV.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className="text-sm text-white/55 transition-colors hover:text-cyan-300"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-white/90">Acceso</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/55">
            <li>
              <Link to={getLoginPath()} className="transition-colors hover:text-cyan-300">
                Iniciar sesión
              </Link>
            </li>
            <li>
              <Link to={MARKETING_TRIAL_PATH} className="transition-colors hover:text-cyan-300">
                Solicitar prueba gratis
              </Link>
            </li>
          </ul>
          <LoginAtriaCredit tone="light" className="mt-8" />
        </div>
      </div>
      <p className="relative mx-auto mt-12 max-w-6xl px-4 text-center text-xs text-white/40 sm:px-6 lg:px-8">
        © {new Date().getFullYear()} Kora CRM. Todos los derechos reservados.
      </p>
    </footer>
  )
}
