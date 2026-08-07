import { AlertCircle, CheckCircle2, CircleDashed, ExternalLink } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PLATFORM_PRIVACY_POLICY_PATH } from '@/lib/platform-legal'

type ChecklistItem = {
  letter: string
  title: string
  detail: string
  status: 'covered' | 'partial' | 'outside'
  how: string
}

const ART_14_TER: ChecklistItem[] = [
  {
    letter: 'a',
    title: 'Política de tratamiento + fecha/versión',
    detail:
      'Debes publicar en tu sitio (o medio equivalente) la política que adopte tu organización, con fecha y versión.',
    status: 'partial',
    how: 'En Kora: URL y versión abajo. El texto completo de la política lo redactas tú y lo publicas en tu web.',
  },
  {
    letter: 'b',
    title: 'Quién es el responsable',
    detail:
      'Individualización del responsable de datos, representante legal y encargado de prevención (si existe).',
    status: 'partial',
    how: 'En Kora: nombre del DPO/encargado. Razón social y representante van en tu política pública y datos de empresa.',
  },
  {
    letter: 'c',
    title: 'Canal para notificar solicitudes',
    detail:
      'Correo, formulario o medio equivalente de fácil acceso para que los titulares te contacten.',
    status: 'covered',
    how: 'En Kora: correo de privacidad / ARSOPB. Debe figurar también en tu sitio web público.',
  },
  {
    letter: 'd',
    title: 'Qué datos tratas y para qué',
    detail:
      'Categorías de datos, universo de titulares, destinatarios, finalidades y base de legitimidad.',
    status: 'outside',
    how: 'No se completa en este formulario: va en la política pública de tu empresa (PDF o página /privacidad).',
  },
  {
    letter: 'e',
    title: 'Medidas de seguridad',
    detail: 'Política y medidas de seguridad adoptadas para proteger las bases de datos.',
    status: 'outside',
    how: 'Descríbelo en tu política. Kora aporta controles técnicos de plataforma; tú documentas lo organizacional.',
  },
  {
    letter: 'f–g',
    title: 'Derechos ARSOPB y recurso ante la Agencia',
    detail:
      'Informar el derecho a acceso, rectificación, supresión, oposición y portabilidad, y a recurrir a la APDP.',
    status: 'partial',
    how: 'Debes informarlo en tu política. El registro interno de solicitudes está en la sección «Solicitudes ARSOPB».',
  },
  {
    letter: 'h',
    title: 'Transferencias internacionales',
    detail: 'Si envías datos a otro país u organización, y si hay nivel adecuado o garantías.',
    status: 'outside',
    how: 'Inclúyelo en tu política si aplica (p. ej. proveedores en el extranjero).',
  },
  {
    letter: 'i',
    title: 'Plazo de conservación',
    detail: 'Por cuánto tiempo conservarás los datos personales.',
    status: 'partial',
    how: 'En Kora: días de retención (referencia interna). Debes repetirlo de forma clara en tu política pública.',
  },
  {
    letter: 'j–l',
    title: 'Fuente de datos, retiro de consentimiento y decisiones automatizadas',
    detail:
      'Origen de los datos; derecho a retirar consentimiento; si hay perfiles o decisiones automatizadas.',
    status: 'outside',
    how: 'Solo en tu política pública (y en formularios de captación si usas consentimiento).',
  },
]

function StatusIcon({ status }: { status: ChecklistItem['status'] }) {
  if (status === 'covered') {
    return <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />
  }
  if (status === 'partial') {
    return <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-600" />
  }
  return <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
}

function statusLabel(status: ChecklistItem['status']) {
  if (status === 'covered') return 'Cubierto en Kora (dato)'
  if (status === 'partial') return 'Parcial en Kora'
  return 'Fuera de este panel'
}

/**
 * Guía educativa Art. 14 ter — no constituye asesoría legal ni certificación de cumplimiento.
 */
export function PrivacyLawGuideCard() {
  return (
    <Card className="shadow-sm border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/50">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          ¿Qué pide la Ley 21.719, Art. 14 ter?
        </CardTitle>
        <CardDescription className="text-foreground/80 space-y-2">
          <p>
            El artículo exige <strong>transparencia pública</strong>: tu organización (como
            responsable del tratamiento) debe mantener a disposición del público —en tu sitio web u
            otro medio equivalente— una lista concreta de información (letras a–l). No es un trámite
            interno oculto: es lo que ve un cliente, trabajador o prospecto cuando busca tu política
            de privacidad.
          </p>
          <p>
            <strong>Kora no “cumple la ley por ti”</strong> al guardar estos campos. Es una herramienta
            de apoyo: guarda el canal de contacto, versión/URL de política, bitácora de solicitudes
            (accountability) e incidentes (Art. 14 sexies). La política completa y su publicación en
            tu web siguen siendo responsabilidad de tu empresa.
          </p>
          <p className="text-xs text-muted-foreground">
            Vigencia plena del régimen: desde diciembre 2026 (según calendario de la ley). Los
            estándares detallados por tamaño de empresa los fijará la Agencia (APDP). Esto no es
            asesoría legal.
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-background p-3 text-sm space-y-2">
          <p className="font-medium">Qué hacer en la práctica (recomendación habitual)</p>
          <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
            <li>
              Redacta y publica en <strong className="text-foreground">tu dominio</strong> una
              política de privacidad que cubra las letras a–l del Art. 14 ter (no basta con la de
              Kora/plataforma: esa habla del software, no de cómo tu empresa trata contactos y
              clientes).
            </li>
            <li>
              Pega aquí la <strong className="text-foreground">URL</strong> y la{' '}
              <strong className="text-foreground">versión</strong>, y define un{' '}
              <strong className="text-foreground">correo real</strong> que atiendas para ARSOPB.
            </li>
            <li>
              Cuando alguien pida acceso, borrado, etc.,{' '}
              <strong className="text-foreground">regístralo en Solicitudes ARSOPB</strong> y
              responde en ≤ 30 días corridos (evidencia interna).
            </li>
            <li>
              Ante una filtración o acceso indebido, usa{' '}
              <strong className="text-foreground">Incidentes</strong> (Art. 14 sexies) y evalúa
              notificación a la APDP y a los titulares.
            </li>
          </ol>
          <p className="text-xs text-muted-foreground pt-1">
            Política de plataforma (encargado del software):{' '}
            <a
              href={PLATFORM_PRIVACY_POLICY_PATH}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
            >
              {PLATFORM_PRIVACY_POLICY_PATH}
              <ExternalLink aria-hidden className="size-3" />
            </a>
            . Complementa, no reemplaza, la tuya.
          </p>
        </div>

        <ul className="space-y-3">
          {ART_14_TER.map((item) => (
            <li
              key={item.letter}
              className="flex gap-3 rounded-md border border-border/70 bg-background/80 px-3 py-2.5 text-sm"
            >
              <StatusIcon status={item.status} />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-medium text-foreground">
                    ({item.letter}) {item.title}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">{item.detail}</p>
                <p className="text-xs leading-relaxed text-foreground/90">{item.how}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
