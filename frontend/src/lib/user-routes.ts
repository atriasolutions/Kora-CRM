export type UserDetailTab = 'detalle' | 'permisos' | 'notas'

const VALID_TABS = new Set<UserDetailTab>(['detalle', 'permisos', 'notas'])

export function getUserDetailPath(userId: string): string {
  return `/usuarios/${userId}`
}

export function parseUserDetailTab(
  params: URLSearchParams,
): UserDetailTab | undefined {
  const raw = params.get('tab')
  if (!raw) return undefined
  return VALID_TABS.has(raw as UserDetailTab) ? (raw as UserDetailTab) : undefined
}
