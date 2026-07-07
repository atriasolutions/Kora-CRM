import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { submitSupportRequestApi, type SupportRequestBody } from '@/api/marketing'
import { apiActionErrorMessage } from '@/api/errors'
import {
  ContactFormField,
  ContactFormInput,
  ContactFormTextarea,
} from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PrivacyConsentField } from '@/components/legal/PrivacyConsentField'
import {
  MARKETING_SUPPORT_COPY,
  MARKETING_SUPPORT_TOPICS_FORM,
} from '@/lib/marketing-content'
import { PLATFORM_LEGAL } from '@/lib/platform-legal'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type SupportContactFormProps = {
  onSuccess?: () => void
  className?: string
}

type FormState = {
  name: string
  email: string
  company: string
  topic: SupportRequestBody['topic']
  message: string
  privacyConsentAccepted: boolean
}

const emptyForm = (): FormState => ({
  name: '',
  email: '',
  company: '',
  topic: 'technical',
  message: '',
  privacyConsentAccepted: false,
})

export function SupportContactForm({ onSuccess, className }: SupportContactFormProps) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const patch = (partial: Partial<FormState>) => setForm((prev) => ({ ...prev, ...partial }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.warning('Indica tu nombre.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.warning('Indica un correo electrónico válido.')
      return
    }
    if (form.message.trim().length < 10) {
      toast.warning('Describe tu consulta con al menos 10 caracteres.')
      return
    }
    if (!form.privacyConsentAccepted) {
      toast.warning('Debes aceptar la política de tratamiento de datos personales.')
      return
    }

    setSaving(true)
    try {
      await submitSupportRequestApi({
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim() || undefined,
        topic: form.topic,
        message: form.message.trim(),
        privacyConsentAccepted: true as const,
        privacyPolicyVersion: PLATFORM_LEGAL.privacyVersion,
      })
      setSubmitted(true)
      setForm(emptyForm())
      toast.success('Consulta enviada correctamente.')
      onSuccess?.()
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudo enviar la consulta.'))
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <Card className={cn('border-primary/20 shadow-lg', className)}>
        <CardHeader>
          <CardTitle className="text-xl">{MARKETING_SUPPORT_COPY.successTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {MARKETING_SUPPORT_COPY.successMessage}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-6 rounded-xl"
            onClick={() => setSubmitted(false)}
          >
            Enviar otra consulta
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden border-primary/20 shadow-xl shadow-primary/5', className)}>
      <div className="bg-gradient-to-br from-primary/8 via-card to-chart-5/8 px-6 py-8 sm:px-8">
        <CardHeader className="space-y-2 p-0">
          <CardTitle className="text-xl sm:text-2xl">{MARKETING_SUPPORT_COPY.formTitle}</CardTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {MARKETING_SUPPORT_COPY.formSubtitle}
          </p>
        </CardHeader>
        <CardContent className="p-0 pt-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <ContactFormInput
              id="support-name"
              label="Nombre completo"
              inputVariant="alphanumeric"
              value={form.name}
              onChange={(name) => patch({ name })}
              required
            />
            <ContactFormInput
              id="support-email"
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={(email) => patch({ email })}
              required
            />
            <ContactFormInput
              id="support-company"
              label="Empresa (opcional)"
              inputVariant="alphanumeric"
              value={form.company}
              onChange={(company) => patch({ company })}
            />
            <ContactFormField id="support-topic" label="Motivo de la consulta">
              <select
                id="support-topic"
                value={form.topic}
                onChange={(e) =>
                  patch({ topic: e.target.value as SupportRequestBody['topic'] })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {MARKETING_SUPPORT_TOPICS_FORM.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </ContactFormField>
            <ContactFormTextarea
              id="support-message"
              label="Describe tu consulta"
              value={form.message}
              onChange={(message) => patch({ message })}
              rows={5}
              placeholder="Cuéntanos qué ocurre, qué módulo usabas y qué esperabas que pasara…"
              required
            />
            <PrivacyConsentField
              id="support-privacy-consent"
              checked={form.privacyConsentAccepted}
              onChange={(privacyConsentAccepted) => patch({ privacyConsentAccepted })}
              disabled={saving}
            />
            <Button
              type="submit"
              size="lg"
              className="min-h-12 w-full rounded-xl"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                'Enviar consulta'
              )}
            </Button>
          </form>
        </CardContent>
      </div>
    </Card>
  )
}
