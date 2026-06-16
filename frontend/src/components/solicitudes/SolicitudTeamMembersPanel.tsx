import { Plus, Trash2, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { ContactFormSelect } from '@/components/contacts/ContactFormField'
import { UserAssigneeAvatar } from '@/components/shared/UserAssigneeAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SolicitudDetail, SolicitudTeamMember } from '@/data/solicitudes.mock'
import { useAssigneeDirectory } from '@/hooks/use-assignee-directory'
import { usePrefetchUserAvatarsById } from '@/hooks/use-user-avatar-url'
import {
  collectSolicitudTeamMemberNames,
  dedupeSolicitudTeamMembers,
  isUserAlreadyOnSolicitudTeam,
  isUserOnSolicitudTeam,
  normalizeSolicitudTeamMembers,
} from '@/lib/solicitud-team-access'
import { toast } from '@/lib/toast'
import { getCurrentUser } from '@/lib/current-user'
import { cn } from '@/lib/utils'

type SolicitudTeamMembersPanelProps = {
  solicitud: SolicitudDetail
  canEdit?: boolean
  onTeamChange: (team: SolicitudTeamMember[]) => Promise<void>
}

function memberKey(member: SolicitudTeamMember): string {
  return member.userId ?? member.id ?? member.name
}

export function SolicitudTeamMembersPanel({
  solicitud,
  canEdit = false,
  onTeamChange,
}: SolicitudTeamMembersPanelProps) {
  const { allUsers, ensureLoaded } = useAssigneeDirectory(true)
  const [pending, setPending] = useState(false)
  const [pickUserId, setPickUserId] = useState('')

  const team = useMemo(
    () =>
      normalizeSolicitudTeamMembers(
        solicitud.team,
        solicitud.assignee,
        solicitud.assigneeUserId,
      ),
    [solicitud.team, solicitud.assignee, solicitud.assigneeUserId],
  )

  const teamAvatarUserIds = useMemo(() => {
    const ids = team.map((m) => m.userId?.trim()).filter(Boolean) as string[]
    const assigneeId = solicitud.assigneeUserId?.trim()
    if (assigneeId && !ids.includes(assigneeId)) ids.push(assigneeId)
    return ids
  }, [team, solicitud.assigneeUserId])

  usePrefetchUserAvatarsById(teamAvatarUserIds)

  const addableUsers = useMemo(() => {
    return allUsers.filter(
      (u) => !isUserAlreadyOnSolicitudTeam(solicitud.team, u, solicitud.assignee),
    )
  }, [allUsers, solicitud.team, solicitud.assignee])

  const addUserOptions = useMemo(() => {
    if (addableUsers.length === 0) {
      return [{ value: '', label: 'No hay más usuarios disponibles' }]
    }
    return [
      { value: '', label: 'Seleccionar usuario del CRM…' },
      ...addableUsers.map((u) => ({
        value: u.id,
        label: u.role?.trim() ? `${u.name} · ${u.role}` : u.name,
      })),
    ]
  }, [addableUsers])

  useEffect(() => {
    ensureLoaded()
  }, [ensureLoaded])

  const persistTeam = async (next: SolicitudTeamMember[]) => {
    setPending(true)
    try {
      await onTeamChange(next)
    } finally {
      setPending(false)
    }
  }

  const handleAdd = async () => {
    const user = allUsers.find((u) => u.id === pickUserId)
    if (!user) return
    if (isUserAlreadyOnSolicitudTeam(solicitud.team, user, solicitud.assignee)) {
      toast.error('Esa persona ya forma parte del equipo o es la responsable.')
      return
    }
    const next: SolicitudTeamMember = {
      id: `team-${user.id}`,
      name: user.name,
      userId: user.id,
      role: user.role?.trim() || 'Miembro del equipo',
    }
    const merged = dedupeSolicitudTeamMembers(
      [...(solicitud.team ?? []), next],
      solicitud.assignee,
    )
    await persistTeam(merged)
    setPickUserId('')
  }

  const handleRemove = async (member: SolicitudTeamMember) => {
    if (member.name.trim() === solicitud.assignee.trim()) return
    const filtered = (solicitud.team ?? []).filter((m) => memberKey(m) !== memberKey(member))
    await persistTeam(dedupeSolicitudTeamMembers(filtered, solicitud.assignee))
  }

  const accessHint = useMemo(() => {
    const names = collectSolicitudTeamMemberNames(solicitud)
    const me = getCurrentUser()
    const included = isUserOnSolicitudTeam(solicitud, me)
    return { names, included, me }
  }, [solicitud])

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Users aria-hidden className="size-4 text-primary" />
                Equipo de la solicitud
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Personas que pueden ver la solicitud en <strong>Mis solicitudes</strong> (más la
                responsable).
              </p>
            </div>
            {accessHint.included ? (
              <Badge variant="secondary" className="shrink-0 font-normal">
                Tienes acceso
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit ? (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 p-3 sm:flex-row sm:items-end">
              <ContactFormSelect
                id="solicitud-team-add-user"
                label="Agregar usuario"
                value={pickUserId}
                onChange={setPickUserId}
                options={addUserOptions}
                disabled={pending || addableUsers.length === 0}
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={!pickUserId || pending}
                onClick={() => void handleAdd()}
              >
                <Plus aria-hidden className="size-4" />
                Agregar
              </Button>
            </div>
          ) : null}

          {team.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay miembros en el equipo. {canEdit ? 'Agrega usuarios con el selector.' : ''}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {team.map((member) => {
                const isAssignee = member.name.trim() === solicitud.assignee.trim()
                const user = allUsers.find(
                  (u) =>
                    u.id === member.userId ||
                    u.name.trim().toLowerCase() === member.name.trim().toLowerCase(),
                )

                return (
                  <li
                    key={memberKey(member)}
                    className="flex flex-wrap items-center gap-3 px-3 py-3"
                  >
                    <UserAssigneeAvatar
                      name={member.name}
                      userId={member.userId ?? user?.id}
                      className="size-10 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{member.name}</p>
                        {isAssignee ? (
                          <Badge variant="secondary" className="font-normal">
                            Responsable
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {member.role?.trim() || user?.role || 'Miembro del equipo'}
                        {user?.email ? ` · ${user.email}` : ''}
                      </p>
                    </div>
                    {canEdit && !isAssignee ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn('shrink-0 text-muted-foreground hover:text-destructive')}
                        disabled={pending}
                        aria-label={`Quitar a ${member.name}`}
                        onClick={() => void handleRemove(member)}
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </Button>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
