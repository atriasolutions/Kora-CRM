import { NavLink } from 'react-router-dom'

import { MarketingHero } from '@/components/marketing/MarketingHero'
import { MarketingReveal } from '@/components/marketing/MarketingReveal'
import {
  MarketingSection,
} from '@/components/marketing/MarketingSection'
import {
  PLATFORM_LEGAL,
  PLATFORM_PRIVACY_POLICY_PATH,
  PLATFORM_SUBPROCESSORS_PATH,
  PLATFORM_TERMS_PATH,
} from '@/lib/platform-legal'
import { cn } from '@/lib/utils'

const LEGAL_NAV = [
  { path: PLATFORM_PRIVACY_POLICY_PATH, label: 'Privacidad' },
  { path: PLATFORM_TERMS_PATH, label: 'Términos de uso' },
  { path: PLATFORM_SUBPROCESSORS_PATH, label: 'Subprocesadores' },
] as const

type LegalPageLayoutProps = {
  title: string
  version: string
  effectiveDate: string
  children: React.ReactNode
}

export function LegalPageLayout({
  title,
  version,
  effectiveDate,
  children,
}: LegalPageLayoutProps) {
  return (
    <>
      <MarketingHero
        compact
        badge="Documento legal"
        title={title}
        subtitle={`Versión ${version} · vigente desde ${effectiveDate}`}
      />

      <MarketingSection tone="muted" className="!py-8 sm:!py-10">
        <nav
          className="flex flex-wrap items-center justify-center gap-2"
          aria-label="Documentos legales"
        >
          {LEGAL_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                    : 'border-border/70 bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </MarketingSection>

      <MarketingSection>
        <MarketingReveal>
          <div className="legal-document mx-auto max-w-3xl">
            {children}

            <footer className="mt-14 space-y-3 border-t border-border/80 pt-8">
              <p className="text-sm text-muted-foreground">
                Consultas sobre privacidad y protección de datos:{' '}
                <a
                  href={`mailto:${PLATFORM_LEGAL.controllerEmail}`}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {PLATFORM_LEGAL.controllerEmail}
                </a>
              </p>
              <p className="text-xs text-muted-foreground">
                {PLATFORM_LEGAL.controllerLegalName} · {PLATFORM_LEGAL.controllerTradeName}
              </p>
            </footer>
          </div>
        </MarketingReveal>
      </MarketingSection>
    </>
  )
}
