export type SolicitudStatus =
  | 'Nuevo'
  | 'En Proceso'
  | 'Detenido por cliente'
  | 'Detenido Internamente'
  | 'En espera de Cliente'
  | 'Entregado a Cliente'
  | 'Planificación'
  | 'Cerrado'

export type SolicitudPriority = 'Baja' | 'Media' | 'Alta' | 'Urgente'

export type SolicitudTeamMemberDto = {
  id: string
  name: string
  role: string
  userId?: string
}

export type SolicitudListTeamMember = {
  id: string
  name: string
  userId?: string
  role?: string
}

export type SolicitudListItem = {
  id: string
  code: string
  title: string
  description: string
  status: SolicitudStatus
  priority: SolicitudPriority
  assignee: string
  assigneeUserId?: string
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
  teamMembers?: SolicitudListTeamMember[]
  companyId?: string
  companyName?: string
  documentationUrl?: string
  gitBranchUrl?: string
}

export type SolicitudDetail = SolicitudListItem & {
  team: SolicitudTeamMemberDto[]
}

export type SolicitudTeamMemberInput = {
  userId?: string | null
  userName?: string
  roleLabel?: string
}

export type CreateSolicitudInput = {
  title: string
  description?: string
  status?: SolicitudStatus
  priority?: SolicitudPriority
  assigneeName?: string
  assigneeUserId?: string | null
  /** Usuario invitado en cuyo nombre se registra la solicitud (solo equipo interno). */
  requesterUserId?: string | null
  team?: SolicitudTeamMemberInput[]
  documentationUrl?: string
  gitBranchUrl?: string
}

export type UpdateSolicitudInput = Partial<CreateSolicitudInput>
