import { getTenantIdOrDefault } from './tenant-context.js'

/** Añade `tenant_id = $n` a condiciones dinámicas de listados. */
export function pushTenantCondition(
  conditions: string[],
  values: unknown[],
  idx: number,
  tableAlias?: string,
): number {
  const col = tableAlias ? `${tableAlias}.tenant_id` : 'tenant_id'
  conditions.push(`${col} = $${idx}`)
  values.push(getTenantIdOrDefault())
  return idx + 1
}

/** Fragmento WHERE tenant para consultas simples por id. */
export function tenantWhereParam(idx: number, tableAlias?: string): string {
  const col = tableAlias ? `${tableAlias}.tenant_id` : 'tenant_id'
  return `${col} = $${idx}`
}
