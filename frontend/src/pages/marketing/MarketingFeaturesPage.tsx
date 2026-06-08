import { MarketingHero } from '@/components/marketing/MarketingHero'
import { CtaBand } from '@/components/marketing/CtaBand'
import { MarketingFeatureExplorer } from '@/components/marketing/MarketingFeatureExplorer'
import { MarketingReveal } from '@/components/marketing/MarketingReveal'
import {
  MarketingSection,
  MarketingSectionHeader,
} from '@/components/marketing/MarketingSection'
import { MARKETING_FEATURE_GROUPS } from '@/lib/marketing-content'
import { MARKETING_TRIAL_PATH } from '@/lib/marketing-routes'
import { useMarketingPageMeta } from '@/lib/use-marketing-page-meta'

export function MarketingFeaturesPage() {
  useMarketingPageMeta(
    'Funcionalidades',
    'Pipeline, cotizaciones, proyectos, inventario y reportes — módulos conectados para empresas en crecimiento.',
  )

  return (
    <>
      <MarketingHero
        compact
        badge="Funcionalidades"
        title="Todo lo que necesitas para vender y ejecutar"
        subtitle="Cada módulo responde a un problema concreto: leads, documentos, proyectos o visibilidad gerencial. Explora por área y descubre qué incluye Kora."
      />

      <MarketingSection>
        <MarketingSectionHeader
          eyebrow="Módulos"
          title="Comercial, operaciones y plataforma"
          description="Selecciona un área para ver capacidades concretas — sin jerga técnica innecesaria."
        />
        <MarketingReveal>
          <MarketingFeatureExplorer groups={MARKETING_FEATURE_GROUPS} />
        </MarketingReveal>
      </MarketingSection>

      <MarketingSection tone="muted">
        <CtaBand
          title="¿Quieres ver tu flujo en Kora?"
          description="Agenda una demo y te mostramos pipeline, cotizaciones y proyectos con un escenario parecido al tuyo."
          primaryLabel="Agendar demo gratuita"
          primaryTo={MARKETING_TRIAL_PATH}
        />
      </MarketingSection>
    </>
  )
}
