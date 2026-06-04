export type ActivityListItem = {
  id: string
  title: string
  type: string
  typeLabel: string
  relatedType: string
  relatedId: string
  relatedName: string
  companyName: string
  due: string
  assignee: string
  status: string
  priority: string
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
  reminder?: string
  scheduledAt?: string
  reminderAt?: string
}

export type ActivityDetail = ActivityListItem & {
  description?: string
  durationMinutes?: number
  location?: string
  outcome?: string
  tags?: string[]
  completedAt?: string
}

export type CreateActivityInput = {
  title: string
  type: string
  relatedType: string
  relatedId: string
  relatedName?: string
  companyName?: string
  scheduledAt?: string
  dueAt?: string
  assigneeName?: string
  status?: string
  priority?: string
  reminderAt?: string
  reminder?: string
}

export type UpdateActivityInput = Partial<CreateActivityInput>
