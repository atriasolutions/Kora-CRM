import { MarketingHero } from '@/components/marketing/MarketingHero'
import { CtaBand } from '@/components/marketing/CtaBand'
import { MarketingCompareSection } from '@/components/marketing/MarketingCompareSection'
import { MarketingFaqAccordion } from '@/components/marketing/MarketingFaqAccordion'
import { PricingSinglePlan } from '@/components/marketing/PricingSinglePlan'
import {
  MarketingSection,
  MarketingSectionHeader,
} from '@/components/marketing/MarketingSection'
import { MARKETING_FAQ } from '@/lib/marketing-content'
import { MARKETING_TRIAL_PATH } from '@/lib/marketing-routes'
import { useMarketingPageMeta } from '@/lib/use-marketing-page-meta'

export function MarketingPricingPage() {
  useMarketingPageMeta(
    'Planes',
    'Plan único de Kora CRM: ventas, documentos, proyectos e inventario. Precio según tu equipo.',
  )

  return (
    <>
      <MarketingHero
        compact
        badge="Planes"
        title="Un plan claro para empresas en crecimiento"
        subtitle="Sin sorpresas ni módulos escondidos. Comercial y operaciones en la misma plataforma, con precio según usuarios y acompañamiento en la implementación."
      />

      <MarketingSection>
        <PricingSinglePlan />
      </MarketingSection>

      <MarketingCompareSection />

      <MarketingSection tone="muted">
        <MarketingSectionHeader
          title="Preguntas que hacen los gerentes antes de decidir"
          description="Leads, documentos, implementación y permisos — respondidas de forma directa."
        />
        <MarketingFaqAccordion items={MARKETING_FAQ} />
      </MarketingSection>

      <MarketingSection>
        <CtaBand
          title="Solicita tu propuesta personalizada"
          description="Cuéntanos el tamaño de tu equipo y te enviamos una propuesta sin compromiso."
          primaryLabel="Agendar demo gratuita"
          primaryTo={MARKETING_TRIAL_PATH}
        />
      </MarketingSection>
    </>
  )
}
