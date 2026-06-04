import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { LoginBackground } from '@/components/auth/LoginBackground'
import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { APP_NAME } from '@/config/brand'
import { resetPasswordApi, verifyTokenApi } from '@/api/auth-public'
import { apiActionErrorMessage } from '@/api/errors'
import { toast } from '@/lib/toast'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() ?? ''

  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
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
        setError('Enlace inválido.')
        return
      }
      try {
        const check = await verifyTokenApi(token, 'password_reset')
        if (cancelled) return
        if (!check.valid) {
          setError('El enlace no es válido o ya expiró. Solicita uno nuevo.')
          return
        }
        setValid(true)
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
    setError(null)
    setSubmitting(true)
    try {
      await resetPasswordApi({ token, password })
      setDone(true)
      toast.success('Contraseña actualizada.')
    } catch (err) {
      setError(apiActionErrorMessage(err, 'No se pudo restablecer la contraseña.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-4">
      <LoginBackground />
      <Card className="relative z-10 w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Nueva contraseña — {APP_NAME}</CardTitle>
          <CardDescription>Elige una contraseña segura para tu cuenta.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
            </div>
          ) : done ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 aria-hidden className="mx-auto size-12 text-emerald-600" />
              <Button asChild className="w-full">
                <Link to="/login">Iniciar sesión</Link>
              </Button>
            </div>
          ) : valid ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <ContactFormInput
                id="reset-password"
                label="Nueva contraseña"
                type="password"
                value={password}
                onChange={setPassword}
              />
              <ContactFormInput
                id="reset-password2"
                label="Confirmar contraseña"
                type="password"
                value={password2}
                onChange={setPassword2}
              />
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Guardando…' : 'Guardar contraseña'}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <AlertCircle aria-hidden className="size-10 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" asChild>
                <Link to="/olvide-contraseña">Solicitar nuevo enlace</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
