import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { submitTrialLeadApi } from '@/api/marketing'
import { apiActionErrorMessage } from '@/api/errors'
import { CompanyTaxIdentifierFields } from '@/components/companies/CompanyTaxIdentifierFields'
import {
  ContactFormInput,
  ContactFormTextarea,
} from '@/components/contacts/ContactFormField'
import { RegionCommuneFields } from '@/components/shared/RegionCommuneFields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getRutValidationMessage } from '@/lib/contact-rut'
import { MARKETING_TRIAL_COPY } from '@/lib/marketing-content'
import type { TaxIdentifierType } from '@/lib/tax-identifier'
import { toast } from '@/lib/toast'

type TrialLeadFormProps = {
  onSuccess?: () => void
}

type FormState = {
  name: string
  company: string
  identifierType: TaxIdentifierType
  rut: string
  employees: string
  address: string
  region: string
  commune: string
  email: string
  phone: string
  message: string
}

const emptyForm = (): FormState => ({
  name: '',
  company: '',
  identifierType: 'RUT',
  rut: '',
  employees: '',
  address: '',
  region: '',
  commune: '',
  email: '',
  phone: '',
  message: '',
})

export function TrialLeadForm({ onSuccess }: TrialLeadFormProps) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<{
    loginUrl?: string
    trialDays?: number
    demoPending?: boolean
  } | null>(null)
  const [showValidation, setShowValidation] = useState(false)

  const patch = (partial: Partial<FormState>) => setForm((prev) => ({ ...prev, ...partial }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setShowValidation(true)

    if (!form.name.trim()) {
      toast.warning('Indica el nombre del contacto.')
      return
    }
    if (!form.company.trim()) {
      toast.warning('Indica el nombre de la empresa.')
      return
    }
    const rutError = getRutValidationMessage(form.rut, { required: true, range: 'company' })
    if (rutError) {
      toast.warning(rutError)
      return
    }
    if (!form.employees.trim()) {
      toast.warning('Indica la cantidad de empleados.')
      return
    }
    if (!form.address.trim()) {
      toast.warning('Indica la dirección.')
      return
    }
    if (!form.region.trim() || !form.commune.trim()) {
      toast.warning('Selecciona región y comuna.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.warning('Indica un correo electrónico válido.')
      return
    }
    if (!form.phone.trim()) {
      toast.warning('Indica un teléfono de contacto.')
      return
    }

    setSaving(true)
    try {
      const result = await submitTrialLeadApi({
        name: form.name.trim(),
        company: form.company.trim(),
        rut: form.rut.trim(),
        employees: form.employees.trim(),
        address: form.address.trim(),
        region: form.region.trim(),
        commune: form.commune.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim() || undefined,
      })

      if (result.trial?.provisioned && result.trial.loginUrl) {
        setSubmissionResult({
          loginUrl: result.trial.loginUrl,
          trialDays: result.trial.trialDays,
        })
        toast.success('Tu demo está lista. Revisa tu correo para activar el acceso.')
      } else if (result.trial?.error) {
        setSubmissionResult({ demoPending: true })
        toast.warning(
          'Recibimos tu solicitud, pero no pudimos crear la demo automática. Te contactaremos pronto.',
        )
      } else {
        setSubmissionResult(null)
        toast.success('Solicitud enviada correctamente.')
      }

      setSubmitted(true)
      setForm(emptyForm())
      setShowValidation(false)
      onSuccess?.()
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudo enviar la solicitud.'))
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    const demoReady = Boolean(submissionResult?.loginUrl)
    return (
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">
            {demoReady ? '¡Tu demo está lista!' : MARKETING_TRIAL_COPY.successTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {demoReady ? (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Enviamos un correo con el enlace de acceso. También puedes entrar directamente:
              </p>
              <Button asChild size="lg" className="w-full rounded-xl">
                <a href={submissionResult!.loginUrl} target="_blank" rel="noopener noreferrer">
                  Abrir mi demo
                </a>
              </Button>
              {submissionResult?.trialDays ? (
                <p className="text-xs text-muted-foreground">
                  Vigencia de prueba: {submissionResult.trialDays} días.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {submissionResult?.demoPending
                ? 'Registramos tu solicitud. Nuestro equipo te contactará en menos de 24 horas hábiles para activar tu demo.'
                : MARKETING_TRIAL_COPY.successMessage}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={() => {
              setSubmitted(false)
              setSubmissionResult(null)
            }}
          >
            Enviar otra solicitud
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-primary/20 shadow-xl shadow-primary/5">
      <div className="bg-gradient-to-br from-primary/8 via-card to-chart-5/8 px-6 py-8 sm:px-8">
        <CardHeader className="space-y-2 p-0">
          <CardTitle className="text-xl sm:text-2xl">{MARKETING_TRIAL_COPY.title}</CardTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {MARKETING_TRIAL_COPY.subtitle}
          </p>
        </CardHeader>
        <CardContent className="p-0 pt-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <ContactFormInput
              id="trial-name"
              label="Nombre del contacto"
              inputVariant="alphanumeric"
              value={form.name}
              onChange={(name) => patch({ name })}
              required
            />
            <ContactFormInput
              id="trial-company"
              label="Nombre de la empresa"
              inputVariant="alphanumeric"
              value={form.company}
              onChange={(company) => patch({ company })}
              required
            />
            <CompanyTaxIdentifierFields
              idPrefix="trial"
              identifierType={form.identifierType}
              value={form.rut}
              onIdentifierTypeChange={(identifierType) => patch({ identifierType })}
              onValueChange={(rut) => patch({ rut })}
              forceShowError={showValidation}
            />
            <ContactFormInput
              id="trial-employees"
              label="Cantidad de empleados"
              inputVariant="integer"
              value={form.employees}
              onChange={(employees) => patch({ employees })}
              placeholder="Ej. 25"
              required
            />
            <ContactFormInput
              id="trial-address"
              label="Dirección"
              inputVariant="alphanumeric"
              value={form.address}
              onChange={(address) => patch({ address })}
              required
            />
            <RegionCommuneFields
              regionId="trial-region"
              communeId="trial-commune"
              region={form.region}
              commune={form.commune}
              onRegionChange={(region) => patch({ region })}
              onCommuneChange={(commune) => patch({ commune })}
              onPatch={(geo) => patch(geo)}
              layout="stacked"
            />
            <ContactFormInput
              id="trial-email"
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={(email) => patch({ email })}
              required
            />
            <ContactFormInput
              id="trial-phone"
              label="Teléfono"
              inputVariant="phone"
              value={form.phone}
              onChange={(phone) => patch({ phone })}
              required
            />
            <ContactFormTextarea
              id="trial-message"
              label="Comentarios (opcional)"
              value={form.message}
              onChange={(message) => patch({ message })}
              rows={3}
              placeholder="¿Qué procesos quieres ordenar con Kora CRM?"
            />
            <Button type="submit" size="lg" className="min-h-12 w-full rounded-xl" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                'Solicitar demo gratis'
              )}
            </Button>
          </form>
        </CardContent>
      </div>
    </Card>
  )
}
