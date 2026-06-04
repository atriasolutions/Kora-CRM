export type ProjectTeamMemberDto = {
  id: string
  name: string
  role: string
}

export type ProjectListItem = {
  id: string
  name: string
  client: string
  customerKind?: 'empresa' | 'contacto'
  companyId?: string
  contactId?: string
  contactName?: string
  opportunityId?: string
  acceptedQuoteId?: string
  progress: string
  progressNum: number
  deadline: string
  manager: string
  journeyStage: string
  status: string
  priority: string
  health: string
  budget: string
  startDate: string
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type ProjectDetail = ProjectListItem & {
  opportunityName?: string
  acceptedQuoteCode?: string
  team: ProjectTeamMemberDto[]
}

export type ProjectTeamMemberInput = {
  userId?: string | null
  userName?: string
  roleLabel?: string
}

export type CreateProjectInput = {
  name: string
  client?: string
  customerKind?: string | null
  contactId?: string | null
  companyId?: string | null
  opportunityId?: string | null
  acceptedQuoteId?: string | null
  progress?: string
  progressPct?: number
  progressNum?: number
  deadline?: string
  managerName?: string
  journeyStage?: string
  status?: string
  priority?: string
  health?: string
  budget?: string
  budgetCents?: number
  startDate?: string
  team?: ProjectTeamMemberInput[]
}

export type UpdateProjectInput = Partial<CreateProjectInput>
