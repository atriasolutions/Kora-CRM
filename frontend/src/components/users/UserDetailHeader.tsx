import { Mail, MoreHorizontal, Pencil, Phone, Shield, Trash2 } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UserDetail } from '@/data/user-detail.mock'
import { CURRENT_USER } from '@/lib/current-user'
import { isGuestUserDetail, userRoleLabel, userStatusVariant } from '@/lib/user-display'
import { initialsFromLabel } from '@/lib/image-upload'
import { getTelHref } from '@/lib/phone'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'
import { useModulePermissions } from '@/hooks/use-module-permissions'

type UserDetailHeaderProps = {
  user: UserDetail
  onStartEdit?: () => void
  onResendInvite?: () => void
  onDeactivate?: () => void
  onDelete?: () => void
}

export function UserDetailHeader({
  user,
  onStartEdit,
  onResendInvite,
  onDeactivate,
  onDelete,
}: UserDetailHeaderProps) {
  const { showEdit } = useDetailHeaderPermissions('usuarios', { onStartEdit })
  const { canEdit, canDelete } = useModulePermissions('usuarios')
  const showResendInvite = canEdit && Boolean(onResendInvite)
  const showDeactivate = canDelete && Boolean(onDeactivate)
  const showDelete = Boolean(onDelete)

  const isSelf = user.id === CURRENT_USER.id
  const metrics = [
    { label: 'Último acceso', value: user.lastLogin },
    isGuestUserDetail(user)
      ? {
          label: 'Cliente de la empresa',
          value: user.guestCompanyName?.trim() || '—',
        }
      : { label: 'Departamento', value: user.department },
    { label: 'Miembro desde', value: user.memberSince },
    {
      label: '2FA',
      value: user.twoFactorEnabled ? 'Activado' : 'Desactivado',
    },
  ]

  const telHref = getTelHref(user.phone) ?? undefined

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <Avatar className="size-14 shrink-0 rounded-xl border-2 border-border shadow-sm sm:size-16">
            <AvatarImage
              src={user.avatarUrl}
              alt={user.name}
              className="rounded-xl"
            />
            <AvatarFallback className="rounded-xl text-lg">
              {initialsFromLabel(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">
                {user.name}
              </h1>
              {isSelf ? (
                <Badge variant="secondary">Tú</Badge>
              ) : null}
              <Badge variant="secondary">{userRoleLabel(user.role)}</Badge>
              <Badge variant={userStatusVariant(user.status)}>{user.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {user.jobTitle} · {user.department}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <a
                href={`mailto:${user.email}`}
                className="inline-flex items-center gap-1.5 text-foreground underline-offset-2 hover:text-primary hover:underline"
              >
                <Mail aria-hidden className="size-4 text-muted-foreground" />
                {user.email}
              </a>
              {(user.phone ?? '').trim() ? (
                <a
                  href={telHref}
                  className="inline-flex items-center gap-1.5 text-foreground underline-offset-2 hover:text-primary hover:underline"
                >
                  <Phone aria-hidden className="size-4 text-muted-foreground" />
                  {user.phone}
                </a>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {(user.teams ?? []).map((team) => (
                <Badge key={team} variant="outline">
                  {team}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-4 2xl:w-auto 2xl:shrink-0 2xl:border-t-0 2xl:pt-0">
          {showEdit ? (
            <Button type="button" size="sm" variant="outline" onClick={onStartEdit}>
              <Pencil aria-hidden className="size-4" />
              Editar
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="icon" variant="outline" aria-label="Más acciones">
                <MoreHorizontal aria-hidden className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {(user.status === 'Invitado' || user.status === 'Por verificar') &&
              showResendInvite ? (
                <DropdownMenuItem onClick={onResendInvite}>
                  Reenviar invitación
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem disabled={isSelf}>
                <Shield aria-hidden className="size-4" />
                Restablecer permisos
              </DropdownMenuItem>
              {showDeactivate ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={isSelf || user.status === 'Inactivo'}
                    onClick={onDeactivate}
                  >
                    Desactivar usuario
                  </DropdownMenuItem>
                </>
              ) : null}
              {showDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={isSelf}
                    onClick={onDelete}
                  >
                    <Trash2 aria-hidden className="size-4" />
                    Eliminar usuario
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{m.label}</dt>
            <dd className="mt-0.5 truncate text-sm font-medium text-foreground">
              {m.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
