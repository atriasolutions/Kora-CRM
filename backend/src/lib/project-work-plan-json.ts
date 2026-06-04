export type ProjectWorkPlanJson = {
  groups: {
    id: string
    name: string
    accent?: string
    collapsed?: boolean
    order: number
  }[]
  items: {
    id: string
    groupId: string
    parentId?: string | null
    name: string
    description?: string
    assignees?: string[]
    status?: string
    estimatedHours?: number
    actualHours?: number
    estimatedStart?: string
    estimatedEnd?: string
    actualStart?: string
    actualEnd?: string
    comment?: string
    order: number
  }[]
}

const EMPTY: ProjectWorkPlanJson = { groups: [], items: [] }

export function normalizeWorkPlanJson(raw: unknown): ProjectWorkPlanJson {
  if (!raw || typeof raw !== 'object') return { ...EMPTY }
  const o = raw as Record<string, unknown>
  const groups = Array.isArray(o.groups)
    ? o.groups
        .filter((g) => g && typeof g === 'object')
        .map((g) => {
          const row = g as Record<string, unknown>
          return {
            id: String(row.id ?? ''),
            name: String(row.name ?? 'Grupo'),
            accent: row.accent != null ? String(row.accent) : 'chart-1',
            collapsed: Boolean(row.collapsed),
            order: Number(row.order) || 0,
          }
        })
        .filter((g) => g.id)
    : []
  const items = Array.isArray(o.items)
    ? o.items
        .filter((i) => i && typeof i === 'object')
        .map((i) => {
          const row = i as Record<string, unknown>
          return {
            id: String(row.id ?? ''),
            groupId: String(row.groupId ?? ''),
            parentId:
              row.parentId == null || row.parentId === ''
                ? null
                : String(row.parentId),
            name: String(row.name ?? 'Actividad'),
            description: String(row.description ?? ''),
            assignees: Array.isArray(row.assignees)
              ? row.assignees.map((a) => String(a)).filter(Boolean)
              : [],
            status: String(row.status ?? 'pendiente'),
            estimatedHours: Number(row.estimatedHours) || 0,
            actualHours: Number(row.actualHours) || 0,
            estimatedStart: String(row.estimatedStart ?? ''),
            estimatedEnd: String(row.estimatedEnd ?? ''),
            actualStart: String(row.actualStart ?? ''),
            actualEnd: String(row.actualEnd ?? ''),
            comment: String(row.comment ?? ''),
            order: Number(row.order) || 0,
          }
        })
        .filter((i) => i.id && i.groupId)
    : []
  return { groups, items }
}
