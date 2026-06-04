/** Fragmentos SQL para resolver nombres de auditoría desde `crm_users` al leer. */
export const AUDIT_USER_JOINS = `
  LEFT JOIN crm_users creator ON creator.id = t.created_by_id AND creator.deleted_at IS NULL
  LEFT JOIN crm_users updater ON updater.id = t.updated_by_id AND updater.deleted_at IS NULL
`

export function auditNameColumns(tableAlias = 't'): string {
  return `
    ${tableAlias}.created_by_id,
    COALESCE(creator.name, ${tableAlias}.created_by_name) AS created_by_name,
    ${tableAlias}.updated_by_id,
    COALESCE(updater.name, ${tableAlias}.updated_by_name) AS updated_by_name
  `
}

export const ASSIGNEE_USER_JOIN = `
  LEFT JOIN crm_users assignee ON assignee.id = t.assignee_user_id AND assignee.deleted_at IS NULL
`

export function assigneeNameColumn(tableAlias = 't'): string {
  return `COALESCE(assignee.name, ${tableAlias}.assignee_name) AS assignee_name`
}

export const MANAGER_USER_JOIN = `
  LEFT JOIN crm_users manager ON manager.id = t.manager_user_id AND manager.deleted_at IS NULL
`

export function managerNameColumn(tableAlias = 't'): string {
  return `COALESCE(manager.name, ${tableAlias}.manager_name) AS manager_name`
}

export const OWNER_USER_JOIN = `
  LEFT JOIN crm_users owner_user ON owner_user.id = t.owner_user_id AND owner_user.deleted_at IS NULL
`

export function ownerNameColumn(tableAlias = 't'): string {
  return `COALESCE(owner_user.name, ${tableAlias}.owner_name) AS owner_name`
}
