export type RecordAudit = {
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type AuditActor = {
  userId: string
  userName: string
}
