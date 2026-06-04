import { ArrowLeft, Shield, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { ProfilePermissionsEditor } from '@/components/profiles/ProfilePermissionsEditor'
import {
  ContactFormInput,
  ContactFormTextarea,
} from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useProfilesRegistry } from '@/hooks/use-profiles-registry'
import { useMenuAccess } from '@/hooks/use-menu-access'
import { isSystemAccessProfile } from '@/lib/access-profile-admin'
import { normalizeProfilePermissions } from '@/lib/menu-modules'
import { getProfilesListPath } from '@/lib/profile-routes'
import { toast } from '@/lib/toast'
import type { AccessProfile } from '@/types/access-profile'

export function ProfileDetailPage() {
  const { profileId } = useParams<{ profileId: string }>()
  const navigate = useNavigate()
  const { findById, updateProfile, removeProfile } = useProfilesRegistry()
  const { can } = useMenuAccess()
  const canEdit = can('perfiles', 'edit')
  const canDelete = can('perfiles', 'delete')

  const [profile, setProfile] = useState<AccessProfile | null>(null)
  const [lookupDone, setLookupDone] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<AccessProfile['permissions']>([])

  useEffect(() => {
    queueMicrotask(() => {
      if (!profileId) {
        setProfile(null)
        setLookupDone(true)
        return
      }
      const found = findById(profileId)
      setProfile(found ?? null)
      if (found) {
        setName(found.name)
        setDescription(found.description)
        setPermissions(normalizeProfilePermissions(found.permissions))
      }
      setLookupDone(true)
    })
  }, [profileId, findById])

  useEffect(() => {
    if (!lookupDone || !profile || !isSystemAccessProfile(profile)) return
    navigate(getProfilesListPath(), { replace: true })
  }, [lookupDone, profile, navigate])

  const handleSave = useCallback(async () => {
    if (!profile || !canEdit) return
    if (!name.trim()) {
      toast.warning('Indica un nombre para el perfil.')
      return
    }
    const updated: AccessProfile = {
      ...profile,
      name: name.trim(),
      description: description.trim(),
      permissions: normalizeProfilePermissions(permissions),
    }
    await updateProfile(updated)
    setProfile(updated)
    toast.success(`Perfil «${updated.name}» guardado.`)
  }, [profile, canEdit, name, description, permissions, updateProfile])

  const handleDelete = useCallback(async () => {
    if (!profile || !canDelete) return
    if (!window.confirm(`¿Eliminar el perfil «${profile.name}»?`)) return
    const ok = await removeProfile(profile.id)
    if (ok) {
      toast.success('Perfil eliminado.')
      navigate(getProfilesListPath())
    } else {
      toast.error('No se pudo eliminar el perfil.')
    }
  }, [profile, canDelete, removeProfile, navigate])

  if (!lookupDone) {
    return null
  }

  if (!profile || isSystemAccessProfile(profile)) {
    return (
      <RecordUnavailableView
        module="perfiles"
        reason={profileId ? 'not_found' : 'invalid_id'}
        recordId={profileId}
        listPath={getProfilesListPath()}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" className="-ml-2 mb-2" asChild>
              <Link to={getProfilesListPath()}>
                <ArrowLeft aria-hidden className="size-4" />
                Perfiles
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Shield aria-hidden className="size-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">{profile.name}</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.userCount} usuario{profile.userCount === 1 ? '' : 's'} · Actualizado{' '}
              {profile.updatedAt}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button type="button" onClick={handleSave}>
                Guardar cambios
              </Button>
            )}
            {canDelete && (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                <Trash2 aria-hidden className="size-4" />
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </header>

      <PageScrollArea className="flex-1">
        <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Datos del perfil</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <ContactFormInput
                id="detail-profile-name"
                label="Nombre"
                inputVariant="alphanumeric"
                value={name}
                onChange={setName}
                disabled={!canEdit}
              />
              <ContactFormTextarea
                id="detail-profile-desc"
                label="Descripción"
                value={description}
                onChange={setDescription}
                rows={2}
                className="sm:col-span-2"
                disabled={!canEdit}
              />
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Permisos por menú</CardTitle>
              <p className="text-sm text-muted-foreground">
                Marca si el menú es visible en la barra lateral y qué acciones permite en
                cada módulo.
              </p>
            </CardHeader>
            <CardContent>
              <ProfilePermissionsEditor
                permissions={permissions}
                onChange={setPermissions}
                disabled={!canEdit}
              />
            </CardContent>
          </Card>
        </div>
      </PageScrollArea>
    </div>
  )
}
