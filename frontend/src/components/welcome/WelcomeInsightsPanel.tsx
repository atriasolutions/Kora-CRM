import type { LucideIcon } from 'lucide-react'
import { CalendarCheck, Handshake, Lightbulb, Zap } from 'lucide-react'

import { AppLogoImage } from '@/components/layout/AppLogoImage'
import { KoraLogoMark } from '@/components/layout/KoraLogoMark'
import { WelcomeSectionLabel } from '@/components/welcome/WelcomePageBackdrop'
import { cn } from '@/lib/utils'

const WORKSPACE_TIPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: CalendarCheck,
    title: 'Ritmo diario',
    text: 'Revisa tareas y vencimientos al iniciar la jornada.',
  },
  {
    icon: Handshake,
    title: 'Colaboración',
    text: 'Comenta y comparte avances dentro de cada registro.',
  },
  {
    icon: Lightbulb,
    title: 'Ayuda contextual',
    text: 'Usa el icono ? en la barra superior cuando lo necesites.',
  },
]

type WelcomeInsightsPanelProps = {
  orgName: string
  hasCustomLogo: boolean
  logoUrl?: string
}

export function WelcomeInsightsPanel({
  orgName,
  hasCustomLogo,
  logoUrl,
}: WelcomeInsightsPanelProps) {
  return (
    <aside className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/60 bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Zap aria-hidden className="size-4" />
            </span>
            <div>
              <WelcomeSectionLabel>Consejos</WelcomeSectionLabel>
              <h3 className="text-sm font-semibold text-foreground">Empieza con buen pie</h3>
            </div>
          </div>
        </div>
        <ul className="divide-y divide-border/50 p-2">
          {WORKSPACE_TIPS.map((tip, index) => {
            const TipIcon = tip.icon
            return (
              <li
                key={tip.title}
                className={cn('flex gap-3 rounded-xl p-3', index === 0 && 'pt-2')}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted/60 text-primary">
                  <TipIcon aria-hidden className="size-4" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-medium text-foreground">{tip.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {tip.text}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-[1.35rem] border border-border/60 bg-card px-6 py-8 text-center shadow-sm">
        {hasCustomLogo ? (
          <AppLogoImage
            logoUrl={logoUrl}
            alt={orgName}
            className="max-h-14 max-w-[200px] object-contain"
          />
        ) : (
          <KoraLogoMark size="md" variant="framed" align="center" />
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Pulsa el logo arriba a la izquierda para volver a esta pantalla.
        </p>
      </div>
    </aside>
  )
}
