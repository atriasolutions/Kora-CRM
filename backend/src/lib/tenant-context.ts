import { AsyncLocalStorage } from 'node:async_hooks'

import { ATRIA_TENANT_ID } from '../types/tenant.js'

export type TenantStore = {
  tenantId: string
  tenantSlug?: string
}

const storage = new AsyncLocalStorage<TenantStore>()

export function runWithTenant<T>(store: TenantStore, fn: () => T): T {
  return storage.run(store, fn)
}

export function runWithTenantAsync<T>(
  store: TenantStore,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(store, fn)
}

export function getTenantStore(): TenantStore | undefined {
  return storage.getStore()
}

export function requireTenantId(): string {
  const id = storage.getStore()?.tenantId
  if (id) return id
  throw new Error('Contexto de tenant no disponible')
}

export function getTenantIdOrNull(): string | null {
  return storage.getStore()?.tenantId ?? null
}

/** Desarrollo / transición: tenant Atria cuando aún no hay sesión con tenant. */
export function getTenantIdOrDefault(): string {
  return storage.getStore()?.tenantId ?? ATRIA_TENANT_ID
}
