import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { LoginBackground } from '@/components/auth/LoginBackground'
import { ContactFormInput, ContactFormSelect } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { APP_NAME } from '@/config/brand'
import {
  activateAccountApi,
  listSecurityQuestionsApi,
  verifyTokenApi,
  type SecurityQuestionOption,
} from '@/api/auth-public'
import { apiActionErrorMessage } from '@/api/errors'
import { toast } from '@/lib/toast'

export function ActivateAccountPage() {
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() ?? ''

  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [questions, setQuestions] = useState<SecurityQuestionOption[]>([])
  const [questionId, setQuestionId] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) {
        setLoading(false)
        setError('Falta el enlace de activación en la URL.')
        return
      }
      try {
        const [check, qs] = await Promise.all([
          verifyTokenApi(token, 'account_setup'),
          listSecurityQuestionsApi(),
        ])
        if (cancelled) return
        if (!check.valid) {
          setError('El enlace no es válido o ya expiró. Pide al administrador que reenvíe la invitación.')
          return
        }
        setValid(true)
        setUserName(check.name)
        setEmail(check.email)
        setQuestions(qs)
        if (qs[0]) setQuestionId(qs[0].id)
      } catch (e) {
        if (!cancelled) {
          setError(apiActionErrorMessage(e, 'No se pudo validar el enlace.'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== password2) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (!questionId || !securityAnswer.trim()) {
      setError('Elige una pregunta de seguridad y escribe tu respuesta.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await activateAccountApi({
        token,
        password,
        questionId,
        securityAnswer: securityAnswer.trim(),
      })
      setDone(true)
      toast.success('Cuenta activada. Ya puedes iniciar sesión.')
    } catch (err) {
      setError(apiActionErrorMessage(err, 'No se pudo activar la cuenta.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-4">
      <LoginBackground />
      <Card className="relative z-10 w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Activar cuenta — {APP_NAME}</CardTitle>
          <CardDescription>
            {valid
              ? `Hola ${userName}, configura tu acceso para ${email}.`
              : 'Completa la activación de tu usuario.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
            </div>
          ) : done ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 aria-hidden className="mx-auto size-12 text-emerald-600" />
              <p className="text-sm text-muted-foreground">
                Tu cuenta quedó activa. Usa tu correo y la contraseña que definiste.
              </p>
              <Button asChild className="w-full">
                <Link to="/login">Ir a iniciar sesión</Link>
              </Button>
            </div>
          ) : valid ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <ContactFormInput
                id="act-password"
                label="Nueva contraseña"
                type="password"
                value={password}
                onChange={setPassword}
              />
              <ContactFormInput
                id="act-password2"
                label="Confirmar contraseña"
                type="password"
                value={password2}
                onChange={setPassword2}
              />
              <ContactFormSelect
                id="act-question"
                label="Pregunta de seguridad"
                value={questionId}
                onChange={setQuestionId}
                options={questions.map((q) => ({ value: q.id, label: q.prompt }))}
              />
              <ContactFormInput
                id="act-answer"
                label="Respuesta"
                value={securityAnswer}
                onChange={setSecurityAnswer}
              />
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                    Activando…
                  </>
                ) : (
                  'Activar cuenta'
                )}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <AlertCircle aria-hidden className="size-10 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" asChild>
                <Link to="/login">Volver al login</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
