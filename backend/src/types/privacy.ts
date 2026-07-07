export type PrivacyRequestType =
  | 'acceso'
  | 'rectificacion'
  | 'supresion'
  | 'oposicion'
  | 'portabilidad'
  | 'bloqueo'

export type PrivacyRequestStatus =
  | 'pendiente'
  | 'en_proceso'
  | 'completada'
  | 'rechazada'
  | 'prorrogada'

export type ContactLegalBasis =
  | 'consentimiento'
  | 'contrato'
  | 'interes_legitimo'
  | 'obligacion_legal'
  | 'interes_vital'
  | 'datos_economicos'

export type PrivacyRequest = {
  id: string
  requestCode: string
  requestType: PrivacyRequestType
  status: PrivacyRequestStatus
  subjectName: string
  subjectEmail: string
  subjectRut?: string
  contactId?: string
  channel: string
  description?: string
  responseNotes?: string
  rejectionReason?: string
  dueAt: string
  extendedDueAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  createdById?: string
  createdByName?: string
  handledById?: string
  handledByName?: string
  daysRemaining: number
  isOverdue: boolean
}

export type CreatePrivacyRequestInput = {
  requestType: PrivacyRequestType
  subjectName: string
  subjectEmail: string
  subjectRut?: string
  contactId?: string
  channel?: string
  description?: string
}

export type UpdatePrivacyRequestInput = {
  status?: PrivacyRequestStatus
  responseNotes?: string
  rejectionReason?: string
  handledById?: string
  handledByName?: string
  extendDeadline?: boolean
}

export type SecurityIncidentSeverity = 'bajo' | 'medio' | 'alto' | 'critico'

export type SecurityIncidentStatus =
  | 'abierto'
  | 'en_investigacion'
  | 'notificado'
  | 'cerrado'

export type SecurityIncident = {
  id: string
  title: string
  description: string
  severity: SecurityIncidentSeverity
  status: SecurityIncidentStatus
  dataCategories?: string
  affectedCountEstimate?: number
  notifiedApdpAt?: string
  notifiedSubjectsAt?: string
  measuresTaken?: string
  createdAt: string
  updatedAt: string
  createdById?: string
  createdByName?: string
}

export type CreateSecurityIncidentInput = {
  title: string
  description: string
  severity?: SecurityIncidentSeverity
  dataCategories?: string
  affectedCountEstimate?: number
  measuresTaken?: string
}

export type UpdateSecurityIncidentInput = Partial<
  Omit<CreateSecurityIncidentInput, 'severity'>
> & {
  severity?: SecurityIncidentSeverity
  status?: SecurityIncidentStatus
  notifiedApdpAt?: string | null
  notifiedSubjectsAt?: string | null
}

export type TenantPrivacyNotice = {
  controllerLegalName: string
  controllerTradeName: string
  privacyPolicyUrl: string
  privacyContactEmail: string
  dpoName?: string
  privacyPolicyVersion: string
  dataRetentionDays: number
  platformPrivacyUrl: string
}

export type ContactPortabilityExport = {
  exportedAt: string
  format: 'json'
  schemaVersion: '1.0'
  dataSubject: {
    contactId: string
    name: string
    email: string
    rut?: string
  }
  personalData: Record<string, unknown>
  relatedRecords: {
    notes: unknown[]
    activities: unknown[]
    opportunities: unknown[]
  }
}
