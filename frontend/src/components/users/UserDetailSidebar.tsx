import { Globe, Languages, Shield, UserRound } from 'lucide-react'

import { ContactFormSection } from '@/components/contacts/ContactFormSection'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserDetail } from '@/data/user-detail.mock'
import { userRoleLabel, userStatusVariant } from '@/lib/user-display'

function ProfileRow({ label, value }: { label: string; value: string }) {
  const display = value.trim() || '—'
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-end text-sm font-medium text-foreground">
        {display}
      </span>
    </div>
  )
}

type UserDetailSidebarProps = {
  user: UserDetail
}

export function UserDetailSidebar({ user }: UserDetailSidebarProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <ContactFormSection title="Perfil" icon={UserRound} className="bg-card">
        <ProfileRow label="Nombre" value={user.name} />
        <ProfileRow label="Correo" value={user.email} />
        <ProfileRow label="Teléfono" value={user.phone} />
        <ProfileRow label="Cargo" value={user.jobTitle} />
        <ProfileRow label="Departamento" value={user.department} />
        <div className="pt-1">
          <p className="text-xs text-muted-foreground">Biografía</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {user.bio.trim() || '—'}
          </p>
        </div>
      </ContactFormSection>

      <ContactFormSection title="Preferencias" icon={Globe} className="bg-card">
        <ProfileRow label="Zona horaria" value={user.timezone} />
        <ProfileRow label="Idioma" value={user.language} />
        <ProfileRow label="Último acceso" value={user.lastLogin} />
        <ProfileRow label="Miembro desde" value={user.memberSince} />
      </ContactFormSection>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Shield aria-hidden className="size-4 text-muted-foreground" />
            Acceso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Rol</span>
            <Badge variant="secondary">{userRoleLabel(user.role)}</Badge>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Estado</span>
            <Badge variant={userStatusVariant(user.status)}>{user.status}</Badge>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">2FA</span>
            <span className="text-sm font-medium">
              {user.twoFactorEnabled
                ? user.twoFactorConfigured
                  ? 'Activo (app vinculada)'
                  : 'Requerido (pendiente app)'
                : 'Desactivado'}
            </span>
          </div>
          <div className="border-t border-border/60 pt-2">
            <p className="text-xs text-muted-foreground">Equipos</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.teams.length > 0 ? (
                user.teams.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm lg:col-span-2 xl:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Languages aria-hidden className="size-4 text-muted-foreground" />
            Sesiones recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user.recentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {user.status === 'Invitado'
                ? 'Sin sesiones registradas. El usuario aún no ha iniciado sesión.'
                : 'Sin sesiones registradas todavía.'}
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {user.recentSessions.map((s) => (
                <li
                  key={`${s.device}-${s.when}`}
                  className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.device}</p>
                    <p className="text-xs text-muted-foreground">{s.location}</p>
                  </div>
                  <span className="text-xs text-muted-foreground sm:text-sm">
                    {s.when}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
