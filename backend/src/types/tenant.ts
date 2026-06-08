/** Tenant de producción Atria Solutions (backfill migración multi-tenant). */
export const ATRIA_TENANT_ID = 'a0000001-0001-4001-8001-000000000001'

export type TenantStatus = 'active' | 'suspended' | 'provisioning' | 'deleted'
export type TenantKind = 'production' | 'trial' | 'internal'
export type MembershipStatus = 'active' | 'invited' | 'disabled'

export type TenantPublic = {
  id: string
  slug: string
  displayName: string
  logoUrl: string
  status: TenantStatus
  kind: TenantKind
}

export type TenantMembershipOption = {
  tenantId: string
  slug: string
  displayName: string
  logoUrl: string
  isDefault: boolean
}
