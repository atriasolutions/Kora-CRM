import type { ProjectListItem } from '@/data/projects.mock'

let registryUserProjects: ProjectListItem[] = []

export function syncRegistryProjects(items: ProjectListItem[]) {
  registryUserProjects = items
}

export function getRegistryProjectById(id: string): ProjectListItem | undefined {
  return registryUserProjects.find((p) => p.id === id)
}

export function getAllKnownProjects(): ProjectListItem[] {
  return registryUserProjects
}
