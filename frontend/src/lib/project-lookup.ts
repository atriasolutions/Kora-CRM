import type { ProjectListItem } from '@/data/projects.mock'

export function findProjectById(
  projects: ProjectListItem[],
  id: string,
): ProjectListItem | undefined {
  const trimmed = id.trim()
  if (!trimmed) return undefined
  return projects.find((p) => p.id === trimmed)
}

export function searchProjects(
  projects: ProjectListItem[],
  query: string,
  limit = 12,
): ProjectListItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return projects.slice(0, limit)
  return projects
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.manager.toLowerCase().includes(q),
    )
    .slice(0, limit)
}
