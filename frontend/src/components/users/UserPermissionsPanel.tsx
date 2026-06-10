import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserDetail } from '@/data/user-detail.mock'
import { useProfilesRegistry } from '@/hooks/use-profiles-registry'
import {
  PERMISSION_ACTION_LABELS,
  type PermissionAction,
} from '@/lib/menu-modules'
import {
  isAdminAccessProfile,
  isSystemAccessProfile,
  ADMIN_PROFILE_LOCKED_MESSAGE,
  SYSTEM_PROFILE_ACCESS_MESSAGE,
} from '@/lib/access-profile-admin'
import { getProfileDetailPath } from '@/lib/profile-routes'
import { cn } from '@/lib/utils'

const ACTIONS: PermissionAction[] = ['menu', 'view', 'create', 'edit', 'delete']

type UserPermissionsPanelProps = {
  user: UserDetail
}

export function UserPermissionsPanel({ user }: UserPermissionsPanelProps) {
  const { findById } = useProfilesRegistry()
  const profile = findById(user.profileId)

  if (!profile) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Perfil de acceso no encontrado.
        </CardContent>
      </Card>
    )
  }

  const enabledCount = (action: PermissionAction) =>
    profile.permissions.filter((p) => p.flags[action]).length

  const isUnrestrictedSystemProfile = isSystemAccessProfile(profile)

  if (isUnrestrictedSystemProfile) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <Shield aria-hidden className="size-5 text-muted-foreground" />
            Perfil de acceso
            <Badge variant="secondary" className="font-normal">
              {profile.name}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{SYSTEM_PROFILE_ACCESS_MESSAGE}</p>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Shield aria-hidden className="size-5 text-muted-foreground" />
          Perfil de acceso
          <Badge variant="secondary" className="font-normal">
            {profile.name}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isAdminAccessProfile(profile)
            ? ADMIN_PROFILE_LOCKED_MESSAGE
            : `${profile.description || 'Sin descripción.'} Los permisos se gestionan en el módulo Perfiles.`}
        </p>
        <Button variant="outline" size="sm" className="mt-2 w-fit" asChild>
          <Link to={getProfileDetailPath(profile.id)}>Editar perfil</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Módulo</th>
                {ACTIONS.map((action) => (
                  <th key={action} className="px-3 py-3 text-center font-medium">
                    {PERMISSION_ACTION_LABELS[action]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profile.permissions
                .filter((p) => p.flags.menu || p.flags.view)
                .map((perm) => (
                  <tr
                    key={perm.moduleId}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {perm.label}
                    </td>
                    {ACTIONS.map((action) => (
                      <td key={action} className="px-3 py-3 text-center">
                        <span
                          className={cn(
                            'inline-flex size-2 rounded-full',
                            perm.flags[action]
                              ? 'bg-primary'
                              : 'bg-muted-foreground/30',
                          )}
                          title={
                            perm.flags[action] ? 'Permitido' : 'No permitido'
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
          Menús visibles: {enabledCount('menu')} · Con visualización:{' '}
          {enabledCount('view')} · Creación: {enabledCount('create')} · Edición:{' '}
          {enabledCount('edit')} · Eliminación: {enabledCount('delete')}
        </p>
      </CardContent>
    </Card>
  )
}
