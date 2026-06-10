export type QuotaKind = 'records' | 'files' | 'seats'

export type QuotaLevel = 'ok' | 'warning' | 'blocked'

export type TenantQuotasDto = {
  maxActiveUsers: number | null
  maxRecordsBytes: number | null
  maxFilesBytes: number | null
  gracePercent: number
}

export type TenantUsageModuleBreakdown = Record<string, number>

export type TenantUsageDto = {
  quotas: TenantQuotasDto
  seatsUsed: number
  /** Usuarios con perfil Invitado (excluye operadores de plataforma). */
  guestUsersUsed: number
  /** Máx. usuarios Invitado = maxActiveUsers × 10 cuando hay cupo de usuarios activos. */
  maxGuestUsers: number | null
  recordsBytes: number
  filesBytes: number
  recordsByModule: TenantUsageModuleBreakdown
  filesByModule: TenantUsageModuleBreakdown
  seatsLevel: QuotaLevel
  guestUsersLevel: QuotaLevel
  recordsLevel: QuotaLevel
  filesLevel: QuotaLevel
  computedAt: string
}

export type UpdateTenantQuotasInput = {
  maxActiveUsers?: number | null
  maxRecordsGb?: number | null
  maxFilesGb?: number | null
  gracePercent?: number
}
