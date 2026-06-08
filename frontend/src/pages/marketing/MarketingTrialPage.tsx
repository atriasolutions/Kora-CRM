import { Check } from 'lucide-react'

import { MarketingHero } from '@/components/marketing/MarketingHero'
import { MarketingReveal } from '@/components/marketing/MarketingReveal'
import { TrialLeadForm } from '@/components/marketing/TrialLeadForm'
import { MarketingSection } from '@/components/marketing/MarketingSection'
import { MARKETING_TRIAL_BENEFITS, MARKETING_TRIAL_STEPS } from '@/lib/marketing-content'
import { useMarketingPageMeta } from '@/lib/use-marketing-page-meta'

export function MarketingTrialPage() {
  useMarketingPageMeta(
    'Demo gratuita',
    'Solicita una demo de Kora CRM. Te mostramos cómo capturar leads, ordenar documentos y gestionar proyectos en un solo lugar.',
  )

  return (
    <>
      <MarketingHero
        compact
        badge="Demo gratuita"
        title="Agenda tu demo con un escenario real"
        subtitle="Cuéntanos tu empresa y el problema principal — leads perdidos, documentos desordenados o proyectos sin trazabilidad. Te contactamos en menos de 24 horas hábiles."
      />

      <MarketingSection tone="muted">
        <div className="grid gap-10 lg:grid-cols-[1fr_min(36rem,100%)] lg:items-start lg:gap-14">
          <div className="space-y-8">
            <MarketingReveal>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Qué esperar
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  Demo orientada a gerencia
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  No es un tour técnico. Te mostramos cómo resolver captación de leads, documentos
                  comerciales y proyectos — con el flujo de una empresa como la tuya.
                </p>
              </div>
            </MarketingReveal>

            <ol className="space-y-4">
              {MARKETING_TRIAL_STEPS.map((step, index) => (
                <MarketingReveal key={step.step} delay={index * 70}>
                  <li className="flex gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-primary/25 hover:shadow-md">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                      {step.step}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{step.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                </MarketingReveal>
              ))}
            </ol>

            <MarketingReveal delay={300}>
              <ul className="space-y-3 rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
                {MARKETING_TRIAL_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm text-foreground">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </MarketingReveal>
          </div>

          <MarketingReveal delay={120}>
            <TrialLeadForm />
          </MarketingReveal>
        </div>
      </MarketingSection>
    </>
  )
}
