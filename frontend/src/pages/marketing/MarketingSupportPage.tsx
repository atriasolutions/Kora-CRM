import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { MarketingHero } from '@/components/marketing/MarketingHero'
import { MarketingFaqAccordion } from '@/components/marketing/MarketingFaqAccordion'
import { MarketingReveal } from '@/components/marketing/MarketingReveal'
import { SupportContactForm } from '@/components/marketing/SupportContactForm'
import {
  MarketingSection,
  MarketingSectionHeader,
} from '@/components/marketing/MarketingSection'
import { Button } from '@/components/ui/button'
import {
  MARKETING_SUPPORT_CHANNELS,
  MARKETING_SUPPORT_COMMITMENTS,
  MARKETING_SUPPORT_FAQ,
  MARKETING_SUPPORT_HERO,
  MARKETING_SUPPORT_SECURITY,
  MARKETING_SUPPORT_TOPICS,
} from '@/lib/marketing-content'
import { getLoginPath } from '@/lib/auth-routes'
import { useMarketingPageMeta } from '@/lib/use-marketing-page-meta'

function SupportChannelAction({
  action,
  actionLabel,
}: {
  action: string
  actionLabel: string
}) {
  if (action.startsWith('mailto:')) {
    return (
      <a
        href={action}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {actionLabel}
        <ArrowRight aria-hidden className="size-3.5" />
      </a>
    )
  }

  if (action.startsWith('#')) {
    return (
      <a
        href={action}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {actionLabel}
        <ArrowRight aria-hidden className="size-3.5" />
      </a>
    )
  }

  return (
    <Button asChild variant="link" className="h-auto p-0 text-primary">
      <Link to={action}>
        {actionLabel}
        <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </Button>
  )
}

export function MarketingSupportPage() {
  useMarketingPageMeta(
    'Soporte',
    'Contacta al equipo de Kora CRM. Soporte humano, respuesta ágil y ayuda con incidencias, accesos y uso de la plataforma.',
  )

  return (
    <>
      <MarketingHero compact title={MARKETING_SUPPORT_HERO.title} subtitle={MARKETING_SUPPORT_HERO.subtitle} />

      <MarketingSection>
        <MarketingSectionHeader
          eyebrow="Compromiso"
          title="Soporte que da tranquilidad"
          description="No dejamos a tu equipo solo. Resolvemos dudas, incidencias y temas de acceso con acompañamiento directo."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MARKETING_SUPPORT_COMMITMENTS.map((item, index) => {
            const Icon = item.icon
            return (
              <MarketingReveal key={item.title} delay={index * 60}>
                <div className="group h-full rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-md">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform group-hover:scale-110">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </MarketingReveal>
            )
          })}
        </div>
      </MarketingSection>

      <MarketingSection tone="muted">
        <MarketingSectionHeader
          eyebrow="Canales"
          title="¿Cómo podemos ayudarte?"
          description="Elige el canal que prefieras. Para incidencias, incluye el mayor detalle posible."
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {MARKETING_SUPPORT_CHANNELS.map((channel, index) => {
            const Icon = channel.icon
            return (
              <MarketingReveal key={channel.title} delay={index * 80}>
                <article className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
                  <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{channel.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {channel.description}
                  </p>
                  <div className="mt-4">
                    <SupportChannelAction
                      action={channel.action}
                      actionLabel={channel.actionLabel}
                    />
                  </div>
                </article>
              </MarketingReveal>
            )
          })}
        </div>
      </MarketingSection>

      <MarketingSection>
        <MarketingSectionHeader
          eyebrow="Temas frecuentes"
          title="En qué te ayudamos"
          description="Estos son los motivos más comunes de contacto. Si no encuentras el tuyo, escríbenos igual."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {MARKETING_SUPPORT_TOPICS.map((topic, index) => (
            <MarketingReveal key={topic.title} delay={index * 50}>
              <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-card to-muted/20 p-5 shadow-sm">
                <h3 className="font-semibold text-foreground">{topic.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {topic.description}
                </p>
              </div>
            </MarketingReveal>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection tone="muted" id="contacto-soporte">
        <div className="grid gap-10 lg:grid-cols-[1fr_min(28rem,100%)] lg:items-start lg:gap-14">
          <div>
            <MarketingSectionHeader
              eyebrow="Seguridad"
              title={MARKETING_SUPPORT_SECURITY.title}
              align="left"
              className="mb-6 sm:mb-8"
            />
            <MarketingReveal>
              <div className="space-y-4 rounded-2xl border border-primary/15 bg-card p-6 shadow-sm sm:p-8">
                {MARKETING_SUPPORT_SECURITY.paragraphs.map((p) => (
                  <p key={p.slice(0, 48)} className="text-sm leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))}
                <p className="pt-2 text-sm text-foreground">
                  ¿Problemas con tu cuenta?{' '}
                  <Link to={getLoginPath()} className="font-medium text-primary hover:underline">
                    Recupera acceso desde el login
                  </Link>
                  .
                </p>
              </div>
            </MarketingReveal>
          </div>
          <MarketingReveal delay={100}>
            <SupportContactForm />
          </MarketingReveal>
        </div>
      </MarketingSection>

      <MarketingSection>
        <MarketingSectionHeader
          title="Preguntas sobre soporte"
          description="Respuestas rápidas antes de escribirnos."
        />
        <MarketingFaqAccordion items={MARKETING_SUPPORT_FAQ} />
      </MarketingSection>
    </>
  )
}
