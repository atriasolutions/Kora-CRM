import { Plus, Trash2, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { ContactFormSelect } from '@/components/contacts/ContactFormField'
import { UserAssigneeAvatar } from '@/components/shared/UserAssigneeAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProjectDetail, ProjectTeamMember } from '@/data/project-detail.mock'
import { useAssigneeDirectory } from '@/hooks/use-assignee-directory'
import {
  collectProjectTeamMemberNames,
  dedupeProjectTeamMembers,
  isUserAlreadyOnProjectTeam,
  isUserOnProjectTeam,
  normalizeProjectTeamMembers,
} from '@/lib/project-team-access'
import { toast } from '@/lib/toast'
import { getCurrentUser } from '@/lib/current-user'
import { cn } from '@/lib/utils'

type ProjectTeamMembersPanelProps = {
  project: ProjectDetail
  canEdit?: boolean
  onTeamChange: (team: ProjectTeamMember[]) => Promise<void>
}

function memberKey(member: ProjectTeamMember): string {
  return member.userId ?? member.id ?? member.name
}

export function ProjectTeamMembersPanel({
  project,
  canEdit = false,
  onTeamChange,
}: ProjectTeamMembersPanelProps) {
  const { allUsers, ensureLoaded } = useAssigneeDirectory(canEdit)
  const [pending, setPending] = useState(false)
  const [pickUserId, setPickUserId] = useState('')

  const team = useMemo(
    () => normalizeProjectTeamMembers(project.team, project.manager),
    [project.team, project.manager],
  )

  const addableUsers = useMemo(() => {
    return allUsers.filter(
      (u) => !isUserAlreadyOnProjectTeam(project.team, u, project.manager),
    )
  }, [allUsers, project.team, project.manager])

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
    if (canEdit) ensureLoaded()
  }, [canEdit, ensureLoaded])

  const persistTeam = async (next: ProjectTeamMember[]) => {
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
    if (isUserAlreadyOnProjectTeam(project.team, user, project.manager)) {
      toast.error('Esa persona ya forma parte del equipo o es el gerente del proyecto.')
      return
    }
    const next: ProjectTeamMember = {
      id: `team-${user.id}`,
      name: user.name,
      userId: user.id,
      role: user.role?.trim() || 'Miembro del proyecto',
    }
    const merged = dedupeProjectTeamMembers(
      [...(project.team ?? []), next],
      project.manager,
    )
    await persistTeam(merged)
    setPickUserId('')
  }

  const handleRemove = async (member: ProjectTeamMember) => {
    if (member.name.trim() === project.manager.trim()) return
    const filtered = (project.team ?? []).filter((m) => memberKey(m) !== memberKey(member))
    await persistTeam(dedupeProjectTeamMembers(filtered, project.manager))
  }

  const accessHint = useMemo(() => {
    const names = collectProjectTeamMemberNames(project)
    const me = getCurrentUser()
    const included = isUserOnProjectTeam(project, me)
    return { names, included, me }
  }, [project])

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Users aria-hidden className="size-4 text-primary" />
                Equipo del proyecto
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Personas que pueden ver el proyecto en <strong>Mis proyectos</strong> (más el
                gerente). No implica estar asignadas a actividades: quien sea responsable en el
                plan se agrega aquí automáticamente.
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
                id="project-team-add-user"
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
                const isManager = member.name.trim() === project.manager.trim()
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
                    <UserAssigneeAvatar name={member.name} className="size-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{member.name}</p>
                        {isManager ? (
                          <Badge variant="secondary" className="font-normal">
                            Gerente
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {member.role?.trim() || user?.role || 'Miembro del proyecto'}
                        {user?.email ? ` · ${user.email}` : ''}
                      </p>
                    </div>
                    {canEdit && !isManager ? (
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
