import { ExternalLink, Loader2, PlusCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

import { apiActionErrorMessage } from '@/api/errors'
import { createTenantInstanceApi } from '@/api/tenant-quotas'
import { isApiEnabled } from '@/api/config'
import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { getPlatformDomain, tenantAppOrigin } from '@/lib/tenant-host'
import { toast } from '@/lib/toast'

const ATRIA_SLUG = 'atriasolutions'

function previewSlug(raw: string): string {
  return (
    raw
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 56) || '…'
  )
}

export function TenantCreateInstancePanel() {
  const { session } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [slugOverride, setSlugOverride] = useState('')
  const [creating, setCreating] = useState(false)
  const [lastCreatedUrl, setLastCreatedUrl] = useState<string | null>(null)

  const isAtriaHost =
    session?.tenantSlug === ATRIA_SLUG ||
    (typeof window !== 'undefined' &&
      window.location.hostname.split(':')[0]?.toLowerCase().startsWith(`${ATRIA_SLUG}.`))

  const resolvedSlug = useMemo(() => {
    const raw = slugOverride.trim() || displayName.trim()
    return raw ? previewSlug(raw) : ''
  }, [displayName, slugOverride])

  const loginPreview =
    resolvedSlug && resolvedSlug !== '…'
      ? tenantAppOrigin(resolvedSlug) + '/login'
      : null

  if (!isApiEnabled() || !session?.isPlatformOperator || !isAtriaHost) {
    return null
  }

  const handleCreate = async () => {
    const name = displayName.trim()
    if (!name) {
      toast.error('Indica el nombre de la nueva instancia.')
      return
    }
    setCreating(true)
    setLastCreatedUrl(null)
    try {
      const result = await createTenantInstanceApi({
        displayName: name,
        slug: slugOverride.trim() || undefined,
      })
      setLastCreatedUrl(result.loginUrl)
      toast.success(`Instancia «${result.displayName}» creada.`)
      setDisplayName('')
      setSlugOverride('')
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo crear la instancia.'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card className="border-primary/30 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PlusCircle aria-hidden className="size-4 text-primary" />
          Crear instancia vacía
        </CardTitle>
        <CardDescription>
          Nueva instancia en blanco en{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{getPlatformDomain()}</code>.
          Incluye perfiles Administrador e Invitado, bodega y configuración base. Sin usuarios ni
          datos CRM. El superadmin queda con acceso automático.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ContactFormInput
          id="tenant-create-display-name"
          label="Nombre de la instancia"
          value={displayName}
          onChange={setDisplayName}
          placeholder="Ej. Cliente Demo SpA"
          disabled={creating}
        />
        <ContactFormInput
          id="tenant-create-slug"
          label="Identificador (subdominio)"
          value={slugOverride}
          onChange={setSlugOverride}
          placeholder={resolvedSlug && resolvedSlug !== '…' ? resolvedSlug : 'Se genera del nombre'}
          disabled={creating}
        />
        {loginPreview ? (
          <p className="text-sm text-muted-foreground">
            URL:{' '}
            <a
              href={loginPreview}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {loginPreview}
            </a>
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={creating || !displayName.trim()} onClick={() => void handleCreate()}>
            {creating ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Creando…
              </>
            ) : (
              'Crear instancia'
            )}
          </Button>
        </div>
        {lastCreatedUrl ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">Instancia lista</p>
            <a
              href={lastCreatedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
            >
              Abrir login de la nueva instancia
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
