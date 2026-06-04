import { getCurrentUser } from '@/lib/current-user'

export type ListScope = 'mine' | 'all' | 'recent'

export type ListScopeOption = {
  id: ListScope
  label: string
  description: string
}

export function createListScopeOptions(config: {
  mineLabel: string
  allLabel: string
  recentLabel?: string
  mineDescription?: string
}): ListScopeOption[] {
  const recentLabel = config.recentLabel ?? 'Vistos recientemente'
  const mineDescription =
    config.mineDescription ?? `Donde ${getCurrentUser().name} es responsable`

  return [
    {
      id: 'mine',
      label: config.mineLabel,
      description: mineDescription,
    },
    {
      id: 'all',
      label: config.allLabel,
      description: 'Registros activos del módulo',
    },
    {
      id: 'recent',
      label: recentLabel,
      description: 'Fichas abiertas en esta sesión o anteriores',
    },
  ]
}

export function matchesListScope<T extends { id: string }>(
  row: T,
  scope: ListScope,
  getOwnerName: (row: T) => string,
  recentIds: string[],
): boolean {
  switch (scope) {
    case 'all':
      return true
    case 'mine':
      return getOwnerName(row) === getCurrentUser().name
    case 'recent':
      return recentIds.includes(row.id)
    default:
      return true
  }
}

export function sortByRecentlyViewed<T extends { id: string }>(
  rows: T[],
  recentIds: string[],
): T[] {
  const order = new Map(recentIds.map((id, index) => [id, index]))
  return [...rows].sort((a, b) => {
    const ai = order.get(a.id) ?? Number.MAX_SAFE_INTEGER
    const bi = order.get(b.id) ?? Number.MAX_SAFE_INTEGER
    return ai - bi
  })
}
