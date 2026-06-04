import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { LoginBackground } from '@/components/auth/LoginBackground'
import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { APP_NAME } from '@/config/brand'
import { forgotPasswordApi } from '@/api/auth-public'
import { apiActionErrorMessage } from '@/api/errors'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await forgotPasswordApi(email.trim())
      setSent(true)
    } catch (err) {
      setError(apiActionErrorMessage(err, 'No se pudo procesar la solicitud.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-4">
      <LoginBackground />
      <Card className="relative z-10 w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>¿Olvidaste tu contraseña?</CardTitle>
          <CardDescription>
            Te enviaremos un enlace a tu correo si existe una cuenta activa en {APP_NAME}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <Mail aria-hidden className="mx-auto size-10 text-primary" />
              <p className="text-sm text-muted-foreground">
                Si el correo está registrado, recibirás instrucciones en los próximos minutos.
                Revisa también la carpeta de spam.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link to="/login">Volver al login</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <ContactFormInput
                id="forgot-email"
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={setEmail}
              />
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  'Enviar enlace'
                )}
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link to="/login">
                  <ArrowLeft aria-hidden className="size-4" />
                  Volver al login
                </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
