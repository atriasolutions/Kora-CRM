/** Nombre visible del usuario en el tenant (con fallback opcional). */
export function tenantUserDisplayNameSql(fallbackExpr?: string): string {
  const base = `COALESCE(
  NULLIF(trim(mem.display_name), ''),
  NULLIF(trim(u.name), '')`
  if (fallbackExpr) {
    return `${base},
  ${fallbackExpr})`
  }
  return `${base})`
}

export const TENANT_USER_DISPLAY_NAME_SQL = tenantUserDisplayNameSql()

/** Joins para resolver nombre por instancia a partir de un `user_id`. */
export function tenantUserMembershipJoins(
  userIdExpr: string,
  tenantParamIdx: number,
  userAlias = 'u',
  memAlias = 'mem',
): string {
  return `
    LEFT JOIN crm_users ${userAlias}
      ON ${userAlias}.id = ${userIdExpr} AND ${userAlias}.deleted_at IS NULL
    LEFT JOIN crm_tenant_memberships ${memAlias}
      ON ${memAlias}.user_id = ${userAlias}.id AND ${memAlias}.tenant_id = $${tenantParamIdx}::uuid`
}

/** Alias de equipo (`tm.user_name` como fallback). */
export const TEAM_MEMBER_USER_NAME_SQL = tenantUserDisplayNameSql('tm.user_name')

export function teamMemberUserJoins(tenantParamIdx: number, tableAlias = 'tm'): string {
  return tenantUserMembershipJoins(`${tableAlias}.user_id`, tenantParamIdx)
}
