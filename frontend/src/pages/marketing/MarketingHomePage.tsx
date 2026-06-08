import { MarketingCompareSection } from '@/components/marketing/MarketingCompareSection'
import { MarketingFlowSection } from '@/components/marketing/MarketingFlowSection'
import { MarketingHero } from '@/components/marketing/MarketingHero'
import { MarketingPainSection } from '@/components/marketing/MarketingPainSection'
import { CtaBand } from '@/components/marketing/CtaBand'
import { FeatureCard } from '@/components/marketing/FeatureCard'
import {
  MarketingSection,
  MarketingSectionHeader,
} from '@/components/marketing/MarketingSection'
import { MarketingReveal } from '@/components/marketing/MarketingReveal'
import { MarketingTestimonials, MarketingUseCases } from '@/components/marketing/MarketingTestimonials'
import { ScreenshotShowcase } from '@/components/marketing/ScreenshotShowcase'
import { MARKETING_HOME_SCREENSHOT_KEYS } from '@/lib/marketing-assets'
import {
  MARKETING_HOME_OUTCOMES,
  MARKETING_PAIN_POINTS,
  MARKETING_PRODUCT_FLOWS,
  MARKETING_TESTIMONIALS,
  MARKETING_USE_CASES,
} from '@/lib/marketing-content'
import { MARKETING_TRIAL_PATH } from '@/lib/marketing-routes'
import { useMarketingPageMeta } from '@/lib/use-marketing-page-meta'
import { useAuth } from '@/hooks/use-auth'

export function MarketingHomePage() {
  const { isAuthenticated } = useAuth()
  useMarketingPageMeta(
    'CRM para empresas en crecimiento',
    'Captura leads, ordena cotizaciones y gestiona proyectos en un solo lugar. Kora CRM conecta ventas y operaciones para gerentes que necesitan visibilidad.',
  )

  return (
    <>
      <MarketingHero
        title="Captura leads, cierra ventas y ejecuta proyectos — en un solo lugar"
        subtitle="Para gerentes de empresas en crecimiento que hoy reparten leads en el correo, documentos en carpetas y proyectos en planillas. Kora CRM unifica comercial y operaciones."
        showAuthCta={isAuthenticated}
        showStats
      />

      <MarketingPainSection
        title="Si tu empresa crece, estos problemas te frenan"
        description="No es falta de esfuerzo del equipo. Es falta de un sistema que conecte ventas, documentos y ejecución."
        items={MARKETING_PAIN_POINTS}
      />

      <MarketingCompareSection />

      <MarketingSection>
        <MarketingSectionHeader
          eyebrow="Para quién es"
          title="Diseñado para quienes deciden y necesitan visibilidad"
          description="Gerentes comerciales, de operaciones y directorio — con perfiles de acceso distintos sobre la misma plataforma."
        />
        <MarketingUseCases items={MARKETING_USE_CASES} />
      </MarketingSection>

      <MarketingFlowSection
        commercial={MARKETING_PRODUCT_FLOWS.commercial}
        operations={MARKETING_PRODUCT_FLOWS.operations}
      />

      <MarketingSection>
        <MarketingSectionHeader
          eyebrow="Qué resuelve"
          title="Cuatro resultados que busca la gerencia"
          description="Menos herramientas sueltas. Más control sobre leads, documentos, proyectos y números del negocio."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {MARKETING_HOME_OUTCOMES.map((item, index) => (
            <MarketingReveal key={item.title} delay={index * 50}>
              <FeatureCard
                icon={item.icon}
                title={item.title}
                description={item.description}
                highlights={item.highlights}
              />
            </MarketingReveal>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection tone="muted">
        <MarketingSectionHeader
          eyebrow="Producto"
          title="Capturas reales del CRM en acción"
          description="Dashboard para gerencia, contactos comerciales, Gantt de proyectos, reportes y control de usuarios — todo en la misma plataforma."
        />
        <ScreenshotShowcase keys={MARKETING_HOME_SCREENSHOT_KEYS} />
      </MarketingSection>

      <MarketingSection tone="muted">
        <MarketingSectionHeader
          eyebrow="Experiencias"
          title="Gerentes que ya ordenaron su operación"
          description="Equipos en crecimiento que dejaron planillas y herramientas sueltas atrás."
        />
        <MarketingTestimonials items={MARKETING_TESTIMONIALS} />
      </MarketingSection>

      <MarketingSection>
        <CtaBand
          title="¿Listo para dejar de perder leads y documentos?"
          description="Agenda una demo gratuita. Te mostramos Kora con un escenario parecido al de tu empresa — en menos de 30 minutos."
          primaryLabel="Agendar demo gratuita"
          primaryTo={MARKETING_TRIAL_PATH}
        />
      </MarketingSection>
    </>
  )
}
